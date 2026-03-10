import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto, UpdateFlowDto, FlowGraph } from '@iot-platform/shared';

@Injectable()
export class FlowsService {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.createExampleFlows();
  }

  async findAll() {
    return this.prisma.flow.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.flow.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async findEnabledFlows() {
    return this.prisma.flow.findMany({
      where: { enabled: true },
    });
  }

  async create(dto: CreateFlowDto) {
    // Validate flow graph
    this.validateFlowGraph(dto.graph);

    return this.prisma.flow.create({
      data: {
        name: dto.name,
        enabled: false,
        graphJson: dto.graph as any,
      },
    });
  }

  async update(id: string, dto: UpdateFlowDto) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Flow ${id} not found`);
    }

    if (dto.graph) {
      this.validateFlowGraph(dto.graph);
    }

    return this.prisma.flow.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.graph && { graphJson: dto.graph as any }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
  }

  async setEnabled(id: string, enabled: boolean) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Flow ${id} not found`);
    }

    return this.prisma.flow.update({
      where: { id },
      data: { enabled },
    });
  }

  async getFlowRuns(flowId: string, limit = 50) {
    return this.prisma.flowRun.findMany({
      where: { flowId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async delete(id: string) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Flow ${id} not found`);
    }

    return this.prisma.flow.delete({
      where: { id },
    });
  }

  private validateFlowGraph(graph: FlowGraph) {
    const { nodes, edges } = graph;

    if (!nodes || nodes.length === 0) {
      throw new Error('Flow must have at least one node');
    }

    // Must have exactly one trigger node
    const triggerNodes = nodes.filter((n) => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      throw new Error('Flow must have at least one trigger node');
    }

    // Must have at least one action node
    const actionNodes = nodes.filter((n) => n.type === 'action');
    if (actionNodes.length === 0) {
      throw new Error('Flow must have at least one action node');
    }

    // Check for cycles (simplified check)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (hasCycle(node.id)) {
        throw new Error('Flow contains cycles');
      }
    }

    // Validate that all nodes are reachable from a trigger
    const reachable = new Set<string>();
    const visit = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);
      const outgoing = edges.filter((e) => e.source === nodeId);
      outgoing.forEach((e) => visit(e.target));
    };

    triggerNodes.forEach((t) => visit(t.id));

    const unreachable = nodes.filter((n) => !reachable.has(n.id));
    if (unreachable.length > 0) {
      throw new Error(`Nodes unreachable from trigger: ${unreachable.map((n) => n.id).join(', ')}`);
    }

    return true;
  }

  private async createExampleFlows() {
    // 1. Auto-Light: When occupied, turn on light; when vacant, turn off light
    const occupancyFlowName = 'Auto-Light Control';
    const existingOccupancy = await this.prisma.flow.findFirst({ where: { name: occupancyFlowName } });
    
    if (!existingOccupancy) {
      await this.prisma.flow.create({
        data: {
          name: occupancyFlowName,
          enabled: true,
          graphJson: {
            nodes: [
              {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 100, y: 100 },
                data: {
                  deviceId: 'sim-occupancy-001',
                  eventName: 'occupied',
                }
              },
              {
                id: 'condition-1',
                type: 'condition',
                position: { x: 300, y: 100 },
                data: {
                  rule: { "==": [{ "var": "trigger.payload.occupied" }, true] }
                }
              },
              {
                id: 'action-on',
                type: 'action',
                position: { x: 500, y: 50 },
                data: {
                  deviceId: 'sim-light-001',
                  actionName: 'turnOn',
                  params: {}
                }
              },
              {
                id: 'action-off',
                type: 'action',
                position: { x: 500, y: 150 },
                data: {
                  deviceId: 'sim-light-001',
                  actionName: 'turnOff',
                  params: {}
                }
              }
            ],
            edges: [
              { id: 'e1', source: 'trigger-1', target: 'condition-1' },
              { id: 'e2', source: 'condition-1', target: 'action-on', label: 'true' },
              { id: 'e3', source: 'condition-1', target: 'action-off', label: 'false' }
            ]
          } as any
        }
      });
    }

    // 2. High Temp Alert: If temp > 28, turn on AC to cool
    const tempFlowName = 'High Temp Cooling';
    const existingTemp = await this.prisma.flow.findFirst({ where: { name: tempFlowName } });

    if (!existingTemp) {
      await this.prisma.flow.create({
        data: {
          name: tempFlowName,
          enabled: true,
          graphJson: {
            nodes: [
              {
                id: 'trigger-temp',
                type: 'trigger',
                position: { x: 100, y: 300 },
                data: {
                  // Let's use the Living Room Sensor we have: sim-sensor-temp-001
                  deviceId: 'sim-sensor-temp-001',
                  eventName: 'temperature', // We need to ensure sensor emits this event
                }
              },
              {
                id: 'condition-high-temp',
                type: 'condition',
                position: { x: 300, y: 300 },
                data: {
                  rule: { ">": [{ "var": "trigger.payload.temperature" }, 28] }
                }
              },
              {
                id: 'action-cool',
                type: 'action',
                position: { x: 500, y: 300 },
                data: {
                  deviceId: 'sim-hvac-001',
                  actionName: 'setMode',
                  params: { mode: 'cool' }
                }
              }
            ],
            edges: [
              { id: 'e4', source: 'trigger-temp', target: 'condition-high-temp' },
              { id: 'e5', source: 'condition-high-temp', target: 'action-cool', label: 'true' }
            ]
          } as any
        }
      });
    }

    // 3. After-Hours Energy Saver: Lock Door -> Turn Off AC
    const energySaverFlowName = 'After-Hours Energy Saver';
    const existingEnergySaver = await this.prisma.flow.findFirst({ where: { name: energySaverFlowName } });

    if (!existingEnergySaver) {
      await this.prisma.flow.create({
        data: {
          name: energySaverFlowName,
          enabled: true,
          graphJson: {
            nodes: [
              {
                id: 'trigger-lock',
                type: 'trigger',
                position: { x: 100, y: 100 },
                data: {
                  deviceId: 'sim-lock-001',
                  eventName: 'locked',
                }
              },
              {
                id: 'action-off-ac',
                type: 'action',
                position: { x: 400, y: 100 },
                data: {
                  deviceId: 'sim-hvac-001',
                  actionName: 'setMode',
                  params: { mode: 'off' }
                }
              }
            ],
            edges: [
              { id: 'e1', source: 'trigger-lock', target: 'action-off-ac' }
            ]
          } as any
        }
      });
    }

    // 4. Comfortable Study Environment: Occupied -> Set AC to 24C & Mid Fan
    const studyEnvFlowName = 'Comfortable Study Environment';
    const existingStudyEnv = await this.prisma.flow.findFirst({ where: { name: studyEnvFlowName } });

    if (!existingStudyEnv) {
      await this.prisma.flow.create({
        data: {
          name: studyEnvFlowName,
          enabled: true,
          graphJson: {
            nodes: [
              {
                id: 'trigger-occupied',
                type: 'trigger',
                position: { x: 100, y: 100 },
                data: {
                  deviceId: 'sim-occupancy-001',
                  eventName: 'occupied',
                }
              },
              {
                id: 'condition-is-occupied',
                type: 'condition',
                position: { x: 300, y: 100 },
                data: {
                  rule: { "==": [{ "var": "trigger.payload.occupied" }, true] }
                }
              },
              {
                id: 'action-set-temp',
                type: 'action',
                position: { x: 500, y: 50 },
                data: {
                  deviceId: 'sim-hvac-001',
                  actionName: 'setTargetTemp',
                  params: { temp: 24 }
                }
              },
              {
                id: 'action-set-fan',
                type: 'action',
                position: { x: 500, y: 150 },
                data: {
                  deviceId: 'sim-hvac-001',
                  actionName: 'setFanSpeed',
                  params: { speed: 'mid' }
                }
              },
              {
                id: 'action-ac-on',
                type: 'action',
                position: { x: 700, y: 100 }, // Ensure it's on (e.g., cool mode)
                data: {
                  deviceId: 'sim-hvac-001',
                  actionName: 'setMode',
                  params: { mode: 'cool' }
                }
              }
            ],
            edges: [
              { id: 'e1', source: 'trigger-occupied', target: 'condition-is-occupied' },
              { id: 'e2', source: 'condition-is-occupied', target: 'action-set-temp', label: 'true' },
              { id: 'e3', source: 'condition-is-occupied', target: 'action-set-fan', label: 'true' },
              { id: 'e4', source: 'condition-is-occupied', target: 'action-ac-on', label: 'true' }
            ]
          } as any
        }
      });
    }
  }
}
