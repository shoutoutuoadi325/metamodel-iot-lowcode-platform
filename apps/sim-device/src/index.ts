#!/usr/bin/env node

import { connect, MqttClient } from 'mqtt';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  MQTT_TOPICS,
  DevicePresence,
  DeviceDescription,
  DeviceCommand,
  DeviceResponse,
  parseTopic,
} from '@iot-platform/shared';

interface DeviceState {
  on: boolean;
  brightness: number;
  temperature?: number;
}

class SimulatedDevice {
  private client: MqttClient;
  private state: DeviceState = {
    on: false,
    brightness: 0,
    temperature: 25,
  };

  constructor(
    private deviceId: string,
    private modelId: string,
    private name: string,
    private mqttUrl: string,
  ) {}

  async start() {
    console.log(`🔌 Starting simulated device: ${this.name} (${this.deviceId})`);
    console.log(`📡 Connecting to MQTT broker: ${this.mqttUrl}`);

    // Last Will - automatically sent when device disconnects
    const presenceOffline: DevicePresence = {
      deviceId: this.deviceId,
      online: false,
      ts: Date.now(),
    };

    this.client = connect(this.mqttUrl, {
      clientId: this.deviceId,
      clean: false,
      will: {
        topic: MQTT_TOPICS.presence(this.deviceId),
        payload: JSON.stringify(presenceOffline),
        qos: 1,
        retain: true,
      },
    });

    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      this.onConnect();
    });

    this.client.on('error', (error) => {
      console.error(`❌ MQTT error: ${error.message}`);
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  private onConnect() {
    // Publish online presence (retained)
    this.publishPresence(true);

    // Publish device description (retained)
    this.publishDescription();

    // Subscribe to commands
    const cmdTopic = MQTT_TOPICS.allCmd(this.deviceId);
    this.client.subscribe(cmdTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${cmdTopic}: ${err.message}`);
      } else {
        console.log(`📥 Subscribed to commands: ${cmdTopic}`);
      }
    });

    // Start periodic state reporting
    this.startStateReporting();

    // Optionally trigger random events
    this.startEventEmitting();
  }

  private publishPresence(online: boolean) {
    const presence: DevicePresence = {
      deviceId: this.deviceId,
      online,
      ts: Date.now(),
      descTopic: MQTT_TOPICS.desc(this.deviceId),
    };

    this.client.publish(
      MQTT_TOPICS.presence(this.deviceId),
      JSON.stringify(presence),
      { qos: 1, retain: true },
      (err) => {
        if (err) {
          console.error(`❌ Failed to publish presence: ${err.message}`);
        } else {
          console.log(`✅ Published presence: ${online ? 'online' : 'offline'}`);
        }
      },
    );
  }

  private publishDescription() {
    const description: DeviceDescription = {
      deviceId: this.deviceId,
      modelId: this.modelId,
      name: this.name,
      capabilities: [
        {
          type: 'property',
          name: 'on',
          valueType: 'boolean',
          writable: true,
          readable: true,
          description: 'Power state',
        },
        {
          type: 'property',
          name: 'brightness',
          valueType: 'number',
          writable: true,
          readable: true,
          unit: '%',
          min: 0,
          max: 100,
          description: 'Brightness level',
        },
        {
          type: 'action',
          name: 'turnOn',
          description: 'Turn on the light',
        },
        {
          type: 'action',
          name: 'turnOff',
          description: 'Turn off the light',
        },
        {
          type: 'action',
          name: 'setBrightness',
          description: 'Set brightness level',
        },
        {
          type: 'event',
          name: 'overheat',
          description: 'Temperature too high',
        },
      ],
      semantic: {
        type: 'light',
        location: 'Living Room',
        tags: ['smart-home', 'lighting', 'simulated'],
      },
      control: {
        protocol: 'mqtt',
        cmdTopicPrefix: MQTT_TOPICS.cmd(this.deviceId, ''),
        stateTopicPrefix: MQTT_TOPICS.state(this.deviceId, ''),
        respTopicPrefix: MQTT_TOPICS.resp(this.deviceId, ''),
        eventTopicPrefix: MQTT_TOPICS.event(this.deviceId, ''),
      },
    };

    this.client.publish(
      MQTT_TOPICS.desc(this.deviceId),
      JSON.stringify(description),
      { qos: 1, retain: true },
      (err) => {
        if (err) {
          console.error(`❌ Failed to publish description: ${err.message}`);
        } else {
          console.log(`✅ Published device description`);
        }
      },
    );
  }

  private startStateReporting() {
    // Report state every 5 seconds
    setInterval(() => {
      this.publishState('on', this.state.on);
      this.publishState('brightness', this.state.brightness);
      
      // Simulate temperature changes
      this.state.temperature = 20 + Math.random() * 15;
    }, 5000);
  }

  private startEventEmitting() {
    // Randomly trigger overheat event
    setInterval(() => {
      if (this.state.on && this.state.brightness > 80 && Math.random() > 0.7) {
        this.publishEvent('overheat', {
          temperature: this.state.temperature,
          threshold: 35,
        });
      }
    }, 15000);
  }

  private publishState(key: string, value: any) {
    const topic = MQTT_TOPICS.state(this.deviceId, key);
    this.client.publish(topic, JSON.stringify(value), { qos: 1 });
    console.log(`📊 State update: ${key} = ${value}`);
  }

  private publishEvent(eventName: string, payload: any) {
    const topic = MQTT_TOPICS.event(this.deviceId, eventName);
    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    console.log(`🔔 Event emitted: ${eventName}`, payload);
  }

  private handleMessage(topic: string, payload: Buffer) {
    const parsed = parseTopic(topic);
    
    if (parsed.type === 'cmd' && parsed.deviceId === this.deviceId) {
      try {
        const command: DeviceCommand = JSON.parse(payload.toString());
        console.log(`📥 Received command: ${command.actionName}`, command.params);
        this.handleCommand(command);
      } catch (error: any) {
        console.error(`❌ Error handling command: ${error.message}`);
      }
    }
  }

  private handleCommand(command: DeviceCommand) {
    let result: any = null;
    let error: string | null = null;

    try {
      switch (command.actionName) {
        case 'turnOn':
          this.state.on = true;
          this.state.brightness = this.state.brightness || 100;
          result = { on: true, brightness: this.state.brightness };
          break;

        case 'turnOff':
          this.state.on = false;
          result = { on: false };
          break;

        case 'setBrightness':
          const brightness = command.params.brightness;
          if (brightness < 0 || brightness > 100) {
            throw new Error('Brightness must be between 0 and 100');
          }
          this.state.brightness = brightness;
          this.state.on = brightness > 0;
          result = { brightness, on: this.state.on };
          break;

        default:
          throw new Error(`Unknown action: ${command.actionName}`);
      }

      console.log(`✅ Command executed: ${command.actionName}`, result);

      // Publish updated state
      this.publishState('on', this.state.on);
      this.publishState('brightness', this.state.brightness);
    } catch (err: any) {
      error = err.message;
      console.error(`❌ Command failed: ${error}`);
    }

    // Send response
    const response: DeviceResponse = {
      requestId: command.requestId,
      ok: error === null,
      result,
      error: error || undefined,
      ts: Date.now(),
    };

    const respTopic = MQTT_TOPICS.resp(this.deviceId, command.requestId);
    this.client.publish(respTopic, JSON.stringify(response), { qos: 1 });
  }

  private stop() {
    console.log('\n🛑 Shutting down device...');
    
    // Publish offline presence
    this.publishPresence(false);

    // Give time for the message to be sent
    setTimeout(() => {
      this.client.end();
      console.log('👋 Device stopped');
      process.exit(0);
    }, 500);
  }
}

// CLI
const argv = yargs(hideBin(process.argv))
  .option('deviceId', {
    alias: 'd',
    type: 'string',
    description: 'Device ID',
    default: process.env.DEFAULT_DEVICE_ID || 'sim-light-001',
  })
  .option('modelId', {
    alias: 'm',
    type: 'string',
    description: 'Device Model ID',
    default: process.env.DEFAULT_MODEL_ID || 'model.sim.light.v1',
  })
  .option('name', {
    alias: 'n',
    type: 'string',
    description: 'Device Name',
    default: 'Simulated Smart Light',
  })
  .option('mqttUrl', {
    alias: 'u',
    type: 'string',
    description: 'MQTT Broker URL',
    default: process.env.MQTT_URL || 'mqtt://localhost:1883',
  })
  .help()
  .alias('help', 'h')
  .parseSync();

const device = new SimulatedDevice(
  argv.deviceId,
  argv.modelId,
  argv.name,
  argv.mqttUrl,
);

device.start();
