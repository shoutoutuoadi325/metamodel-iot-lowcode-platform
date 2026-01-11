import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  MQTT_TOPICS,
  parseTopic,
  DevicePresence,
  DeviceDescription,
  DeviceCommand,
  DeviceResponse,
  DeviceState,
  DeviceEvent,
} from '@iot-platform/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MqttGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttGatewayService.name);
  private client: MqttClient;
  private responseHandlers = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private eventEmitter: EventEmitter2;

  constructor(
    private prisma: PrismaService,
  ) {
    this.eventEmitter = new EventEmitter2();
  }

  async onModuleInit() {
    const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
    
    this.logger.log(`Connecting to MQTT broker: ${mqttUrl}`);
    
    this.client = connect(mqttUrl, {
      clientId: `iot-platform-api-${uuidv4()}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('Reconnecting to MQTT broker...');
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.logger.log('Disconnected from MQTT broker');
    }
  }

  private subscribeToTopics() {
    const topics = [
      MQTT_TOPICS.allPresence(),
      MQTT_TOPICS.allDesc(),
      MQTT_TOPICS.allState(),
      MQTT_TOPICS.allEvent(),
      MQTT_TOPICS.allResp(),
    ];

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
        } else {
          this.logger.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, payload: Buffer) {
    try {
      const parsed = parseTopic(topic);
      if (!parsed.type || !parsed.deviceId) {
        return;
      }

      const data = JSON.parse(payload.toString());

      switch (parsed.type) {
        case 'presence':
          await this.handlePresence(parsed.deviceId, data as DevicePresence);
          break;
        case 'desc':
          await this.handleDescription(parsed.deviceId, data as DeviceDescription);
          break;
        case 'state':
          await this.handleState(parsed.deviceId, parsed.subPath!, data);
          break;
        case 'event':
          await this.handleEvent(parsed.deviceId, parsed.subPath!, data);
          break;
        case 'resp':
          this.handleResponse(parsed.subPath!, data as DeviceResponse);
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling message on ${topic}: ${error.message}`);
    }
  }

  private async handlePresence(deviceId: string, presence: DevicePresence) {
    this.logger.log(`Device ${deviceId} presence: ${presence.online ? 'online' : 'offline'}`);

    await this.prisma.device.upsert({
      where: { deviceId },
      update: {
        online: presence.online,
        lastSeen: new Date(presence.ts),
      },
      create: {
        deviceId,
        name: deviceId,
        modelId: 'unknown',
        online: presence.online,
        lastSeen: new Date(presence.ts),
      },
    });

    // Emit event for WebSocket
    this.eventEmitter.emit('device:presence', { deviceId, online: presence.online, ts: presence.ts });
  }

  private async handleDescription(deviceId: string, desc: DeviceDescription) {
    this.logger.log(`Device ${deviceId} description received`);

    await this.prisma.device.upsert({
      where: { deviceId },
      update: {
        name: desc.name,
        modelId: desc.modelId,
        descJson: desc as any,
      },
      create: {
        deviceId,
        name: desc.name,
        modelId: desc.modelId,
        online: true,
        descJson: desc as any,
      },
    });
  }

  private async handleState(deviceId: string, propertyName: string, value: any) {
    const ts = new Date();
    
    // Log state change
    await this.prisma.deviceStateLog.create({
      data: {
        deviceId,
        key: propertyName,
        valueJson: value,
        ts,
      },
    });

    // Emit event for WebSocket
    this.eventEmitter.emit('device:state', {
      deviceId,
      key: propertyName,
      value,
      ts: ts.getTime(),
    });
  }

  private async handleEvent(deviceId: string, eventName: string, payload: any) {
    const ts = new Date();
    
    this.logger.log(`Device ${deviceId} event: ${eventName}`);

    // Log event
    await this.prisma.deviceEventLog.create({
      data: {
        deviceId,
        eventName,
        payloadJson: payload,
        ts,
      },
    });

    // Emit event for orchestrator and WebSocket
    const deviceEvent: DeviceEvent = {
      deviceId,
      eventName,
      payload,
      ts: ts.getTime(),
    };
    
    this.eventEmitter.emit('device:event', deviceEvent);
  }

  private handleResponse(requestId: string, response: DeviceResponse) {
    const handler = this.responseHandlers.get(requestId);
    
    if (handler) {
      clearTimeout(handler.timeout);
      this.responseHandlers.delete(requestId);
      
      if (response.ok) {
        handler.resolve(response.result);
      } else {
        handler.reject(new Error(response.error || 'Command failed'));
      }
    }
  }

  /**
   * Publish a command to a device and wait for response
   */
  async publishCommand(deviceId: string, actionName: string, params: Record<string, any>): Promise<any> {
    const requestId = uuidv4();
    const command: DeviceCommand = {
      requestId,
      actionName,
      params,
      ts: Date.now(),
    };

    const topic = MQTT_TOPICS.cmd(deviceId, actionName);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error('Command timeout'));
      }, 5000);

      this.responseHandlers.set(requestId, { resolve, reject, timeout });

      this.client.publish(topic, JSON.stringify(command), { qos: 1 }, (err) => {
        if (err) {
          clearTimeout(timeout);
          this.responseHandlers.delete(requestId);
          reject(err);
        }
      });
    });
  }

  /**
   * Publish a message to any topic
   */
  publish(topic: string, payload: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(payload), options || {}, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get event emitter for subscribing to device events
   */
  getEventEmitter(): EventEmitter2 {
    return this.eventEmitter;
  }
}
