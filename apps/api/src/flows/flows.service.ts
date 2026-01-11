import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowDto, UpdateFlowDto, FlowGraph } from '@iot-platform/shared';

@Injectable()
export class FlowsService {
  constructor(private prisma: PrismaService) {}

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
}
