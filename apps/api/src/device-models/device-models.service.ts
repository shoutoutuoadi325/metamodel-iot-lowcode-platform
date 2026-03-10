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
    await this.createHvacModel();
    await this.createOccupancyModel();
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

  async exportAsHass(id: string): Promise<{ content: string; filename: string }> {
    const model = await this.findOne(id);
    if (!model) {
      throw new NotFoundException(`Device model ${id} not found`);
    }

    const schema = model.schemaJson as any;
    const content = this.generateHassYaml(schema);
    const filename = `${schema.modelId.replace(/\./g, '_')}_hass.yaml`;
    return { content, filename };
  }

  async exportAsKubeEdge(id: string): Promise<{ content: string; filename: string }> {
    const model = await this.findOne(id);
    if (!model) {
      throw new NotFoundException(`Device model ${id} not found`);
    }

    const schema = model.schemaJson as any;
    const content = this.generateKubeEdgeYaml(schema);
    const filename = `${schema.modelId.replace(/\./g, '_')}_kubeedge.yaml`;
    return { content, filename };
  }

  private safeYamlStr(s: string): string {
    // Escape double-quotes and backslashes for safe YAML double-quoted string inclusion
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private getHassEntityType(semanticType: string): string {
    switch (semanticType) {
      case 'light':
        return 'light';
      case 'hvac':
        return 'climate';
      case 'switch':
        return 'switch';
      case 'occupancy':
        return 'binary_sensor';
      default:
        return 'sensor';
    }
  }

  private generateHassYaml(schema: any): string {
    const lines: string[] = [];
    const semanticType = schema.semantic?.type || 'sensor';
    const modelId: string = schema.modelId;
    const name: string = schema.name;
    const hassType = this.getHassEntityType(semanticType);
    const D = '{{DEVICE_ID}}';

    lines.push(`# Home Assistant MQTT Configuration`);
    lines.push(`# Model: ${name} (${modelId} v${schema.version})`);
    lines.push(`# Generated by IoT Low-Code Platform`);
    lines.push(`# Replace ${D} with your actual device ID`);
    lines.push(``);
    lines.push(`mqtt:`);
    lines.push(`  ${hassType}:`);
    lines.push(`    - name: "${name}"`);
    lines.push(`      unique_id: "${modelId.replace(/\./g, '_')}"`);
    lines.push(`      availability:`);
    lines.push(`        - topic: "iot/v1/devices/${D}/presence"`);
    lines.push(`          payload_available: "online"`);
    lines.push(`          payload_not_available: "offline"`);
    lines.push(`      availability_mode: latest`);

    if (hassType === 'light') {
      const brightnessProp = schema.properties?.find((p: any) => p.name === 'brightness');
      lines.push(`      state_topic: "iot/v1/devices/${D}/state"`);
      lines.push(`      state_value_template: "{{ 'ON' if value_json.on else 'OFF' }}"`);
      lines.push(`      command_topic: "iot/v1/devices/${D}/cmd"`);
      lines.push(`      payload_on: '{"action":"turnOn","params":{}}'`);
      lines.push(`      payload_off: '{"action":"turnOff","params":{}}'`);
      if (brightnessProp) {
        lines.push(`      brightness_state_topic: "iot/v1/devices/${D}/state"`);
        lines.push(`      brightness_value_template: "{{ value_json.brightness }}"`);
        lines.push(`      brightness_command_topic: "iot/v1/devices/${D}/cmd"`);
        lines.push(`      brightness_command_template: '{"action":"setBrightness","params":{"brightness":{{ value }}}}'`);
        lines.push(`      brightness_scale: 100`);
      }
    } else if (hassType === 'climate') {
      const modeProp = schema.properties?.find((p: any) => p.name === 'mode');
      const modes: string[] = modeProp?.enum || ['off', 'cool', 'heat'];
      lines.push(`      current_temperature_topic: "iot/v1/devices/${D}/state"`);
      lines.push(`      current_temperature_template: "{{ value_json.currentTemp }}"`);
      lines.push(`      temperature_state_topic: "iot/v1/devices/${D}/state"`);
      lines.push(`      temperature_state_template: "{{ value_json.targetTemp }}"`);
      lines.push(`      temperature_command_topic: "iot/v1/devices/${D}/cmd"`);
      lines.push(`      temperature_command_template: '{"action":"setTargetTemp","params":{"temp":{{ value }}}}'`);
      lines.push(`      mode_state_topic: "iot/v1/devices/${D}/state"`);
      lines.push(`      mode_state_template: "{{ value_json.mode }}"`);
      lines.push(`      mode_command_topic: "iot/v1/devices/${D}/cmd"`);
      lines.push(`      mode_command_template: '{"action":"setMode","params":{"mode":"{{ value }}"}}'`);
      lines.push(`      modes:`);
      modes.forEach((m) => lines.push(`        - "${m}"`));
    } else if (hassType === 'binary_sensor') {
      const firstProp = schema.properties?.[0];
      lines.push(`      state_topic: "iot/v1/devices/${D}/state"`);
      if (firstProp) {
        const safeName = this.safeYamlStr(firstProp.name);
        lines.push(`      value_template: "{{ 'ON' if value_json.${safeName} else 'OFF' }}"`);
      }
    } else {
      const firstProp = schema.properties?.[0];
      lines.push(`      state_topic: "iot/v1/devices/${D}/state"`);
      if (firstProp) {
        const safeName = this.safeYamlStr(firstProp.name);
        lines.push(`      value_template: "{{ value_json.${safeName} }}"`);
      }
      if (hassType === 'switch') {
        lines.push(`      command_topic: "iot/v1/devices/${D}/cmd"`);
      }
    }

    lines.push(`      device:`);
    lines.push(`        identifiers:`);
    lines.push(`          - "${D}"`);
    lines.push(`        name: "${name}"`);
    lines.push(`        model: "${modelId}"`);
    lines.push(`        manufacturer: "IoT Low-Code Platform"`);

    if (schema.events?.length > 0) {
      lines.push(``);
      lines.push(`  # Event sensors`);
      lines.push(`  sensor:`);
      schema.events.forEach((event: any) => {
        lines.push(`    - name: "${name} ${event.name}"`);
        lines.push(`      unique_id: "${modelId.replace(/\./g, '_')}_${event.name}"`);
        lines.push(`      state_topic: "iot/v1/devices/${D}/event"`);
        lines.push(`      value_template: "{{ value_json.eventName }}"`);
        lines.push(`      device:`);
        lines.push(`        identifiers:`);
        lines.push(`          - "${D}"`);
      });
    }

    return lines.join('\n');
  }

  private generateKubeEdgeYaml(schema: any): string {
    const lines: string[] = [];
    const modelId: string = schema.modelId;
    const kubeEdgeName = modelId.replace(/\./g, '-');

    lines.push(`# KubeEdge DeviceModel`);
    lines.push(`# Model: ${schema.name} (${modelId} v${schema.version})`);
    lines.push(`# Generated by IoT Low-Code Platform`);
    lines.push(``);
    lines.push(`apiVersion: devices.kubeedge.io/v1alpha2`);
    lines.push(`kind: DeviceModel`);
    lines.push(`metadata:`);
    lines.push(`  name: ${kubeEdgeName}`);
    lines.push(`  namespace: default`);
    lines.push(`  labels:`);
    lines.push(`    platform: iot-lowcode`);
    if (schema.semantic?.type) {
      lines.push(`    device-type: ${schema.semantic.type}`);
    }
    lines.push(`spec:`);
    lines.push(`  properties:`);

    schema.properties?.forEach((prop: any) => {
      lines.push(`    - name: ${prop.name}`);
      if (prop.description) {
        lines.push(`      description: "${prop.description}"`);
      }
      const accessMode = prop.writable ? 'ReadWrite' : 'ReadOnly';
      lines.push(`      type:`);
      if (prop.type === 'boolean') {
        lines.push(`        boolean:`);
        lines.push(`          accessMode: ${accessMode}`);
      } else if (prop.type === 'number') {
        lines.push(`        int:`);
        lines.push(`          accessMode: ${accessMode}`);
        if (prop.min !== undefined) lines.push(`          minimum: ${prop.min}`);
        if (prop.max !== undefined) lines.push(`          maximum: ${prop.max}`);
        if (prop.unit) lines.push(`          unit: "${prop.unit}"`);
      } else {
        lines.push(`        string:`);
        lines.push(`          accessMode: ${accessMode}`);
      }
    });

    lines.push(``);
    lines.push(`---`);
    lines.push(`# KubeEdge Device Instance Template`);
    lines.push(`# Replace {{DEVICE_ID}} and {{EDGE_NODE_NAME}} with actual values`);
    lines.push(``);
    lines.push(`apiVersion: devices.kubeedge.io/v1alpha2`);
    lines.push(`kind: Device`);
    lines.push(`metadata:`);
    lines.push(`  name: "{{DEVICE_ID}}"`);
    lines.push(`  namespace: default`);
    lines.push(`  labels:`);
    lines.push(`    description: "${schema.name}"`);
    lines.push(`    model: ${kubeEdgeName}`);
    lines.push(`spec:`);
    lines.push(`  deviceModelRef:`);
    lines.push(`    name: ${kubeEdgeName}`);
    lines.push(`  protocol:`);
    lines.push(`    customizedProtocol:`);
    lines.push(`      protocolName: mqtt`);
    lines.push(`      configData:`);
    lines.push(`        brokerUrl: "tcp://{{BROKER_IP}}:1883"`);
    lines.push(`        stateTopic: "iot/v1/devices/{{DEVICE_ID}}/state"`);
    lines.push(`        commandTopic: "iot/v1/devices/{{DEVICE_ID}}/cmd"`);
    lines.push(`  nodeSelector:`);
    lines.push(`    nodeSelectorTerms:`);
    lines.push(`      - matchExpressions:`);
    lines.push(`          - key: kubernetes.io/hostname`);
    lines.push(`            operator: In`);
    lines.push(`            values:`);
    lines.push(`              - "{{EDGE_NODE_NAME}}"`);
    lines.push(`  propertyVisitors:`);

    schema.properties?.forEach((prop: any) => {
      const safeName = this.safeYamlStr(prop.name);
      lines.push(`    - propertyName: ${safeName}`);
      lines.push(`      customizedProtocol:`);
      lines.push(`        configData:`);
      lines.push(`          stateTopic: "iot/v1/devices/{{DEVICE_ID}}/state"`);
      lines.push(`          jsonPropertyName: "${safeName}"`);
    });

    return lines.join('\n');
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

  private async createHvacModel() {
    const modelId = 'model.sim.hvac.v1';
    
    const existing = await this.findByModelId(modelId);
    if (existing) {
      return;
    }

    const hvacSchema: DeviceModelSchema = {
      modelId,
      version: '1.0.0',
      name: 'Simulated HVAC',
      description: 'A simulated HVAC device with mode and temperature control',
      semantic: {
        type: 'hvac',
        category: 'actuator',
        tags: ['smart-home', 'climate'],
      },
      properties: [
        {
          name: 'mode',
          type: 'string',
          writable: true,
          readable: true,
          enum: ['off', 'cool', 'heat'],
          description: 'Operating mode',
        },
        {
          name: 'targetTemp',
          type: 'number',
          writable: true,
          readable: true,
          min: 16,
          max: 30,
          unit: '°C',
          description: 'Target temperature',
        },
        {
          name: 'currentTemp',
          type: 'number',
          writable: false,
          readable: true,
          unit: '°C',
          description: 'Current temperature',
        },
        {
          name: 'fanSpeed',
          type: 'string',
          writable: true,
          readable: true,
          enum: ['low', 'mid', 'high'],
          description: 'Fan speed',
        },
      ],
      actions: [
        {
          name: 'setMode',
          description: 'Set HVAC mode',
          parameters: [
            {
              name: 'mode',
              type: 'string',
              required: true,
              enum: ['off', 'cool', 'heat'],
              description: 'Mode (off, cool, heat)',
            },
          ],
        },
        {
          name: 'setTargetTemp',
          description: 'Set target temperature',
          parameters: [
            {
              name: 'temp',
              type: 'number',
              required: true,
              min: 16,
              max: 30,
              description: 'Target temperature (16-30)',
            },
          ],
        },
        {
          name: 'setFanSpeed',
          description: 'Set fan speed',
          parameters: [
            {
              name: 'speed',
              type: 'string',
              required: true,
              enum: ['low', 'mid', 'high'],
              description: 'Fan speed (low, mid, high)',
            },
          ],
        },
      ],
      events: [],
    };

    await this.prisma.deviceModel.create({
      data: {
        modelId,
        version: '1.0.0',
        name: 'Simulated HVAC',
        schemaJson: hvacSchema as any,
      },
    });

    console.log(`✅ Created example device model: ${modelId}`);
  }

  private async createOccupancyModel() {
    const modelId = 'model.sim.sensor.occupancy.v1';
    
    const existing = await this.findByModelId(modelId);
    if (existing) {
      return;
    }

    const occupancySchema: DeviceModelSchema = {
      modelId,
      version: '1.0.0',
      name: 'Simulated Occupancy Sensor',
      description: 'A simulated occupancy sensor',
      semantic: {
        type: 'occupancy',
        category: 'sensor',
        tags: ['smart-home', 'security'],
      },
      properties: [
        {
          name: 'occupied',
          type: 'boolean',
          writable: false,
          readable: true,
          description: 'Occupancy state (true=occupied, false=vacant)',
        },
      ],
      actions: [
        {
          name: 'setOccupancy',
          description: 'Simulate occupancy state',
          parameters: [
            {
              name: 'occupied',
              type: 'boolean',
              required: true,
              description: 'Occupancy state',
            },
          ],
        },
      ],
      events: [],
    };

    await this.prisma.deviceModel.create({
      data: {
        modelId,
        version: '1.0.0',
        name: 'Simulated Occupancy Sensor',
        schemaJson: occupancySchema as any,
      },
    });

    console.log(`✅ Created example device model: ${modelId}`);
  }
}
