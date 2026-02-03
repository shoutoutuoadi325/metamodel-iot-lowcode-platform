
import { connect, MqttClient } from 'mqtt';
import {
  MQTT_TOPICS,
  DevicePresence,
  DeviceDescription,
  DeviceCommand,
  DeviceResponse,
  DeviceCapability,
  DeviceSemantic,
  parseTopic,
} from '@iot-platform/shared';

export abstract class BaseDevice {
  protected client!: MqttClient;

  constructor(
    protected deviceId: string,
    protected modelId: string,
    protected name: string,
    protected mqttUrl: string,
  ) {}

  abstract getCapabilities(): DeviceCapability[];
  abstract getSemantic(): DeviceSemantic;
  abstract onLoop(): void;
  abstract handleSpecificCommand(command: DeviceCommand): { result: any; error?: string };

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
      console.error(`❌ MQTT error: ${error.message || 'Unknown error'}`);
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

    // Start periodic loop
    setInterval(() => this.onLoop(), 5000);
  }

  protected publishPresence(online: boolean) {
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

  protected publishDescription() {
    const description: DeviceDescription = {
      deviceId: this.deviceId,
      modelId: this.modelId,
      name: this.name,
      capabilities: this.getCapabilities(),
      semantic: this.getSemantic(),
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

  protected publishState(key: string, value: any) {
    const topic = MQTT_TOPICS.state(this.deviceId, key);
    this.client.publish(topic, JSON.stringify(value), { qos: 1 });
    console.log(`📊 State update: ${key} = ${value}`);
  }

  protected publishEvent(eventName: string, payload: any) {
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
      const outcome = this.handleSpecificCommand(command);
      result = outcome.result;
      error = outcome.error || null;
      
      console.log(`✅ Command executed: ${command.actionName}`, result);
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
