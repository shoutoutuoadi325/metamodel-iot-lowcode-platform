import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    });
  }

  async create(data: { name: string; graphJson: any }) {
    return this.prisma.flow.create({
      data: {
        name: data.name,
        enabled: false,
        graphJson: data.graphJson,
      },
    });
  }

  async update(id: string, data: { name?: string; graphJson?: any }) {
    return this.prisma.flow.update({
      where: { id },
      data: {
        name: data.name,
        graphJson: data.graphJson,
      },
    });
  }

  async enable(id: string) {
    return this.prisma.flow.update({
      where: { id },
      data: { enabled: true },
    });
  }

  async disable(id: string) {
    return this.prisma.flow.update({
      where: { id },
      data: { enabled: false },
    });
  }

  async getRuns(flowId: string) {
    return this.prisma.flowRun.findMany({
      where: { flowId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
  }
}
