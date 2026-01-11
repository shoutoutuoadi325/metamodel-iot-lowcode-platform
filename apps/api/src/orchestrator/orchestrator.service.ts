import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { FlowsService } from '../flows/flows.service';
import { MqttGatewayService } from '../mqtt/mqtt-gateway.service';
import { DeviceEvent, FlowGraph, FlowNode } from '@iot-platform/shared';
import * as jsonLogic from 'json-logic-js';

interface FlowExecutionContext {
  flowId: string;
  flowRunId: string;
  event: DeviceEvent;
  variables: Record<string, any>;
  logs: Array<{
    timestamp: number;
    nodeId: string;
    message: string;
    level: 'info' | 'warn' | 'error';
    data?: any;
  }>;
}

@Injectable()
export class OrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(OrchestratorService.name);
  private enabledFlows: Map<string, any> = new Map();

  constructor(
    private prisma: PrismaService,
    private flowsService: FlowsService,
    private mqttGateway: MqttGatewayService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.loadEnabledFlows();
    this.logger.log('Orchestrator initialized');
  }

  async loadEnabledFlows() {
    const flows = await this.flowsService.findEnabledFlows();
    this.enabledFlows.clear();
    
    flows.forEach((flow) => {
      this.enabledFlows.set(flow.id, {
        id: flow.id,
        name: flow.name,
        graph: flow.graphJson,
      });
    });

    this.logger.log(`Loaded ${flows.length} enabled flows`);
  }

  @OnEvent('device:event')
  async handleDeviceEvent(event: DeviceEvent) {
    this.logger.log(`Handling device event: ${event.deviceId}/${event.eventName}`);

    // Find matching flows
    for (const [flowId, flow] of this.enabledFlows.entries()) {
      const graph = flow.graph as FlowGraph;
      const triggerNodes = graph.nodes.filter((n) => n.type === 'trigger');

      for (const triggerNode of triggerNodes) {
        if (this.matchesTrigger(triggerNode, event)) {
          this.logger.log(`Flow ${flowId} triggered by event ${event.eventName}`);
          await this.executeFlow(flowId, flow, event);
        }
      }
    }
  }

  private matchesTrigger(triggerNode: FlowNode, event: DeviceEvent): boolean {
    const config = triggerNode.data;
    
    // Check if device matches (if specified)
    if (config.deviceId && config.deviceId !== event.deviceId) {
      return false;
    }

    // Check if event name matches
    if (config.eventName && config.eventName !== event.eventName) {
      return false;
    }

    return true;
  }

  private async executeFlow(flowId: string, flow: any, triggerEvent: DeviceEvent) {
    const flowRun = await this.prisma.flowRun.create({
      data: {
        flowId,
        status: 'running',
        logsJson: [],
        startedAt: new Date(),
      },
    });

    const context: FlowExecutionContext = {
      flowId,
      flowRunId: flowRun.id,
      event: triggerEvent,
      variables: {
        trigger: {
          deviceId: triggerEvent.deviceId,
          eventName: triggerEvent.eventName,
          payload: triggerEvent.payload,
        },
      },
      logs: [],
    };

    this.eventEmitter.emit('flow:started', { flowId, flowRunId: flowRun.id });

    try {
      const graph = flow.graph as FlowGraph;
      const triggerNodes = graph.nodes.filter((n) => n.type === 'trigger' && this.matchesTrigger(n, triggerEvent));

      for (const triggerNode of triggerNodes) {
        await this.executeNode(triggerNode, graph, context);
      }

      await this.prisma.flowRun.update({
        where: { id: flowRun.id },
        data: {
          status: 'completed',
          logsJson: context.logs as any,
          endedAt: new Date(),
        },
      });

      this.eventEmitter.emit('flow:completed', { flowId, flowRunId: flowRun.id });
      this.logger.log(`Flow ${flowId} completed successfully`);
    } catch (error) {
      this.logger.error(`Flow ${flowId} failed: ${error.message}`);
      
      context.logs.push({
        timestamp: Date.now(),
        nodeId: 'system',
        message: `Flow execution failed: ${error.message}`,
        level: 'error',
      });

      await this.prisma.flowRun.update({
        where: { id: flowRun.id },
        data: {
          status: 'failed',
          logsJson: context.logs as any,
          endedAt: new Date(),
        },
      });

      this.eventEmitter.emit('flow:failed', { flowId, flowRunId: flowRun.id, error: error.message });
    }
  }

  private async executeNode(node: FlowNode, graph: FlowGraph, context: FlowExecutionContext): Promise<void> {
    context.logs.push({
      timestamp: Date.now(),
      nodeId: node.id,
      message: `Executing ${node.type} node`,
      level: 'info',
      data: node.data,
    });

    switch (node.type) {
      case 'trigger':
        // Trigger nodes don't execute, just pass through
        break;

      case 'condition':
        await this.executeConditionNode(node, graph, context);
        return; // Condition handles its own next nodes

      case 'action':
        await this.executeActionNode(node, context);
        break;

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    // Find next nodes
    const nextEdges = graph.edges.filter((e) => e.source === node.id);
    for (const edge of nextEdges) {
      const nextNode = graph.nodes.find((n) => n.id === edge.target);
      if (nextNode) {
        await this.executeNode(nextNode, graph, context);
      }
    }
  }

  private async executeConditionNode(node: FlowNode, graph: FlowGraph, context: FlowExecutionContext): Promise<void> {
    const config = node.data;
    const rule = config.rule || {};

    try {
      // Evaluate condition using JSONLogic
      const result = jsonLogic.apply(rule, context.variables);
      
      context.logs.push({
        timestamp: Date.now(),
        nodeId: node.id,
        message: `Condition evaluated to ${result}`,
        level: 'info',
        data: { rule, variables: context.variables, result },
      });

      // Find next edge based on result
      const nextEdges = graph.edges.filter((e) => e.source === node.id);
      const nextEdge = nextEdges.find((e) => {
        const label = e.label || e.data?.label;
        if (result) {
          return label === 'true' || label === 'yes';
        } else {
          return label === 'false' || label === 'no';
        }
      });

      if (nextEdge) {
        const nextNode = graph.nodes.find((n) => n.id === nextEdge.target);
        if (nextNode) {
          await this.executeNode(nextNode, graph, context);
        }
      }
    } catch (error) {
      context.logs.push({
        timestamp: Date.now(),
        nodeId: node.id,
        message: `Condition evaluation error: ${error.message}`,
        level: 'error',
      });
      throw error;
    }
  }

  private async executeActionNode(node: FlowNode, context: FlowExecutionContext): Promise<void> {
    const config = node.data;
    const { deviceId, actionName, params = {} } = config;

    if (!deviceId || !actionName) {
      throw new Error('Action node missing deviceId or actionName');
    }

    try {
      const result = await this.mqttGateway.publishCommand(deviceId, actionName, params);
      
      context.logs.push({
        timestamp: Date.now(),
        nodeId: node.id,
        message: `Action ${actionName} executed successfully`,
        level: 'info',
        data: { deviceId, actionName, params, result },
      });
    } catch (error) {
      context.logs.push({
        timestamp: Date.now(),
        nodeId: node.id,
        message: `Action execution failed: ${error.message}`,
        level: 'error',
      });
      throw error;
    }
  }

  async reloadFlows() {
    await this.loadEnabledFlows();
  }
}
