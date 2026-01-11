import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { DeviceModelSchema, CreateDeviceModelDto, UpdateDeviceModelDto } from '@iot-platform/shared';

// JSON Schema for DeviceModel validation
const DEVICE_MODEL_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['modelId', 'version', 'name', 'properties', 'actions', 'events'],
  properties: {
    modelId: { type: 'string' },
    version: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    semantic: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        category: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
    properties: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'type', 'writable', 'readable'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['number', 'string', 'boolean', 'object'] },
          writable: { type: 'boolean' },
          readable: { type: 'boolean' },
          unit: { type: 'string' },
          min: { type: 'number' },
          max: { type: 'number' },
          enum: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
        },
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'parameters'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          parameters: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'type'],
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['number', 'string', 'boolean', 'object'] },
                required: { type: 'boolean' },
                min: { type: 'number' },
                max: { type: 'number' },
                enum: { type: 'array', items: { type: 'string' } },
                description: { type: 'string' },
              },
            },
          },
        },
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          payloadSchema: { type: 'object' },
        },
      },
    },
  },
};

@Injectable()
export class DeviceModelsService implements OnModuleInit {
  private ajv: Ajv;
  private validateSchema: ValidateFunction;

  constructor(private prisma: PrismaService) {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.validateSchema = this.ajv.compile(DEVICE_MODEL_SCHEMA);
  }

  async onModuleInit() {
    // Create example device model if it doesn't exist
    await this.createExampleModel();
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

  async findByModelId(modelId: string) {
    return this.prisma.deviceModel.findUnique({
      where: { modelId },
    });
  }

  async create(dto: CreateDeviceModelDto) {
    // Validate schema
    const valid = this.validateSchema(dto.schema);
    if (!valid) {
      throw new Error(`Schema validation failed: ${JSON.stringify(this.validateSchema.errors)}`);
    }

    // Check if modelId already exists
    const existing = await this.findByModelId(dto.modelId);
    if (existing) {
      throw new Error(`Device model with modelId ${dto.modelId} already exists`);
    }

    return this.prisma.deviceModel.create({
      data: {
        modelId: dto.modelId,
        version: dto.version,
        name: dto.name,
        schemaJson: dto.schema as any,
      },
    });
  }

  async update(id: string, dto: UpdateDeviceModelDto) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Device model ${id} not found`);
    }

    if (dto.schema) {
      const valid = this.validateSchema(dto.schema);
      if (!valid) {
        throw new Error(`Schema validation failed: ${JSON.stringify(this.validateSchema.errors)}`);
      }
    }

    return this.prisma.deviceModel.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.schema && { schemaJson: dto.schema as any }),
      },
    });
  }

  async delete(id: string) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Device model ${id} not found`);
    }

    return this.prisma.deviceModel.delete({
      where: { id },
    });
  }

  private async createExampleModel() {
    const modelId = 'model.sim.light.v1';
    
    const existing = await this.findByModelId(modelId);
    if (existing) {
      return;
    }

    const exampleSchema: DeviceModelSchema = {
      modelId,
      version: '1.0.0',
      name: 'Simulated Smart Light',
      description: 'A simulated smart light device with brightness control',
      semantic: {
        type: 'light',
        category: 'actuator',
        tags: ['smart-home', 'lighting'],
      },
      properties: [
        {
          name: 'on',
          type: 'boolean',
          writable: true,
          readable: true,
          description: 'Power state of the light',
        },
        {
          name: 'brightness',
          type: 'number',
          writable: true,
          readable: true,
          min: 0,
          max: 100,
          unit: '%',
          description: 'Brightness level (0-100%)',
        },
      ],
      actions: [
        {
          name: 'turnOn',
          description: 'Turn on the light',
          parameters: [],
        },
        {
          name: 'turnOff',
          description: 'Turn off the light',
          parameters: [],
        },
        {
          name: 'setBrightness',
          description: 'Set brightness level',
          parameters: [
            {
              name: 'brightness',
              type: 'number',
              required: true,
              min: 0,
              max: 100,
              description: 'Brightness level (0-100)',
            },
          ],
        },
      ],
      events: [
        {
          name: 'overheat',
          description: 'Triggered when device temperature is too high',
          payloadSchema: {
            temperature: 'number',
          },
        },
      ],
    };

    await this.prisma.deviceModel.create({
      data: {
        modelId,
        version: '1.0.0',
        name: 'Simulated Smart Light',
        schemaJson: exampleSchema as any,
      },
    });

    console.log(`✅ Created example device model: ${modelId}`);
  }
}
