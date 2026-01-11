import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private mqtt: MqttService,
  ) {}

  async findAll() {
    return this.prisma.device.findMany({
      include: {
        model: true,
      },
      orderBy: {
        lastSeen: 'desc',
      },
    });
  }

  async findOne(deviceId: string) {
    return this.prisma.device.findUnique({
      where: { deviceId },
      include: {
        model: true,
      },
    });
  }

  async executeAction(deviceId: string, actionName: string, params: Record<string, any>) {
    const device = await this.findOne(deviceId);
    if (!device) {
      throw new HttpException('Device not found', HttpStatus.NOT_FOUND);
    }

    if (!device.online) {
      throw new HttpException('Device is offline', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await this.mqtt.sendCommand(deviceId, actionName, params);
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Command failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
