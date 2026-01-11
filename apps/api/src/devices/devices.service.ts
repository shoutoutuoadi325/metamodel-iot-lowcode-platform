import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MqttGatewayService } from '../mqtt/mqtt-gateway.service';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private mqttGateway: MqttGatewayService,
  ) {}

  async findAll() {
    return this.prisma.device.findMany({
      orderBy: { lastSeen: 'desc' },
    });
  }

  async findOne(deviceId: string) {
    return this.prisma.device.findUnique({
      where: { deviceId },
    });
  }

  async executeAction(deviceId: string, actionName: string, params: Record<string, any>) {
    const device = await this.findOne(deviceId);
    
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (!device.online) {
      throw new Error(`Device ${deviceId} is offline`);
    }

    return this.mqttGateway.publishCommand(deviceId, actionName, params);
  }

  async getStateHistory(deviceId: string, limit = 100) {
    return this.prisma.deviceStateLog.findMany({
      where: { deviceId },
      orderBy: { ts: 'desc' },
      take: limit,
    });
  }

  async getEventHistory(deviceId: string, limit = 100) {
    return this.prisma.deviceEventLog.findMany({
      where: { deviceId },
      orderBy: { ts: 'desc' },
      take: limit,
    });
  }
}
