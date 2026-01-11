import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Ajv from 'ajv';
import { PrismaService } from '../prisma/prisma.service';
import { SimLightModelV1 } from '@iot-platform/shared';

const ajv = new Ajv();

// Device Model Schema for validation
const deviceModelSchema = {
  type: 'object',
  required: ['id', 'version', 'name', 'capabilities'],
  properties: {
    id: { type: 'string' },
    version: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    capabilities: {
      type: 'object',
      properties: {
        properties: { type: 'object' },
        actions: { type: 'object' },
        events: { type: 'object' },
      },
    },
    metadata: { type: 'object' },
  },
};

const validateDeviceModel = ajv.compile(deviceModelSchema);

@Injectable()
export class DeviceModelsService {
  constructor(private prisma: PrismaService) {
    // Initialize with default model
    this.initializeDefaultModel();
  }

  private async initializeDefaultModel() {
    try {
      const existing = await this.prisma.deviceModel.findUnique({
        where: { modelId: SimLightModelV1.id },
      });

      if (!existing) {
        await this.prisma.deviceModel.create({
          data: {
            modelId: SimLightModelV1.id,
            version: SimLightModelV1.version,
            name: SimLightModelV1.name,
            schemaJson: SimLightModelV1 as any,
          },
        });
        console.log('✅ Default device model initialized:', SimLightModelV1.id);
      }
    } catch (error) {
      console.error('Failed to initialize default model:', error);
    }
  }

  async findAll() {
    return this.prisma.deviceModel.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.deviceModel.findUnique({
      where: { id },
    });
  }

  async create(modelData: any) {
    // Validate schema
    if (!validateDeviceModel(modelData)) {
      throw new HttpException(
        `Validation failed: ${JSON.stringify(validateDeviceModel.errors)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.deviceModel.create({
      data: {
        modelId: modelData.id,
        version: modelData.version,
        name: modelData.name,
        schemaJson: modelData,
      },
    });
  }

  async update(id: string, modelData: any) {
    // Validate schema
    if (!validateDeviceModel(modelData)) {
      throw new HttpException(
        `Validation failed: ${JSON.stringify(validateDeviceModel.errors)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.deviceModel.update({
      where: { id },
      data: {
        modelId: modelData.id,
        version: modelData.version,
        name: modelData.name,
        schemaJson: modelData,
      },
    });
  }
}
