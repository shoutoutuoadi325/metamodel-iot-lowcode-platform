import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildTopic,
  MQTT_SUBSCRIPTIONS,
  PresenceMessage,
  DeviceDescription,
  StateMessage,
  EventMessage,
  CommandMessage,
  ResponseMessage,
} from '@iot-platform/shared';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private pendingCommands = new Map<string, {
    resolve: (value: ResponseMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
    console.log(`🔌 Connecting to MQTT broker: ${mqttUrl}`);

    this.client = mqtt.connect(mqttUrl, {
      clientId: `iot-platform-api-${Date.now()}`,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.client.on('connect', () => {
      console.log('✅ MQTT Connected');
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT Error:', error);
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT Reconnecting...');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private subscribeToTopics() {
    const subscriptions = [
      MQTT_SUBSCRIPTIONS.ALL_PRESENCE,
      MQTT_SUBSCRIPTIONS.ALL_DESC,
      MQTT_SUBSCRIPTIONS.ALL_STATE,
      MQTT_SUBSCRIPTIONS.ALL_EVENT,
    ];

    subscriptions.forEach(topic => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`📡 Subscribed to ${topic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, payload: Buffer) {
    try {
      const message = JSON.parse(payload.toString());
      
      // Parse topic to determine type
      const parts = topic.split('/');
      const deviceId = parts[3];
      const messageType = parts[4];

      switch (messageType) {
        case 'presence':
          await this.handlePresence(message as PresenceMessage);
          break;
        case 'desc':
          await this.handleDescription(message as DeviceDescription);
          break;
        case 'state':
          await this.handleState(deviceId, parts[5], message);
          break;
        case 'event':
          await this.handleEvent(deviceId, parts[5], message);
          break;
        case 'resp':
          this.handleResponse(parts[5], message as ResponseMessage);
          break;
      }
    } catch (error) {
      console.error(`Error handling message on ${topic}:`, error);
    }
  }

  private async handlePresence(message: PresenceMessage) {
    console.log(`📍 Presence: ${message.deviceId} - ${message.online ? 'ONLINE' : 'OFFLINE'}`);
    
    await this.prisma.device.upsert({
      where: { deviceId: message.deviceId },
      update: {
        online: message.online,
        lastSeen: new Date(message.ts),
      },
      create: {
        deviceId: message.deviceId,
        name: message.deviceId,
        modelId: 'unknown',
        online: message.online,
        lastSeen: new Date(message.ts),
      },
    });
  }

  private async handleDescription(desc: DeviceDescription) {
    console.log(`📝 Description: ${desc.deviceId} - ${desc.name}`);
    
    await this.prisma.device.upsert({
      where: { deviceId: desc.deviceId },
      update: {
        name: desc.name,
        modelId: desc.modelId,
        descJson: desc as any,
      },
      create: {
        deviceId: desc.deviceId,
        name: desc.name,
        modelId: desc.modelId,
        descJson: desc as any,
        online: true,
      },
    });
  }

  private async handleState(deviceId: string, propertyName: string, value: any) {
    console.log(`📊 State: ${deviceId}.${propertyName} = ${JSON.stringify(value)}`);
    
    await this.prisma.deviceStateLog.create({
      data: {
        deviceId,
        key: propertyName,
        valueJson: value,
        ts: new Date(),
      },
    });
  }

  private async handleEvent(deviceId: string, eventName: string, payload: any) {
    console.log(`🔔 Event: ${deviceId}.${eventName}`);
    
    await this.prisma.deviceEventLog.create({
      data: {
        deviceId,
        eventName,
        payloadJson: payload || {},
        ts: new Date(),
      },
    });
  }

  private handleResponse(requestId: string, response: ResponseMessage) {
    const pending = this.pendingCommands.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(response);
      this.pendingCommands.delete(requestId);
    }
  }

  async sendCommand(
    deviceId: string,
    actionName: string,
    params?: Record<string, any>,
  ): Promise<ResponseMessage> {
    const requestId = uuidv4();
    const cmdTopic = buildTopic.cmd(deviceId, actionName);
    const respTopic = buildTopic.resp(deviceId, requestId);

    // Subscribe to response topic
    await new Promise<void>((resolve, reject) => {
      this.client.subscribe(respTopic, { qos: 1 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Send command
    const command: CommandMessage = {
      requestId,
      actionName,
      params,
      ts: Date.now(),
    };

    this.client.publish(cmdTopic, JSON.stringify(command), { qos: 1 });

    // Wait for response with timeout
    return new Promise<ResponseMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(requestId);
        this.client.unsubscribe(respTopic);
        reject(new Error('Command timeout (5s)'));
      }, 5000);

      this.pendingCommands.set(requestId, { resolve, reject, timeout });
    }).finally(() => {
      this.client.unsubscribe(respTopic);
    });
  }

  publish(topic: string, payload: any, options?: mqtt.IClientPublishOptions) {
    this.client.publish(topic, JSON.stringify(payload), options || { qos: 1 });
  }
}
