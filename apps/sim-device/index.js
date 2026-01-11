#!/usr/bin/env node
import mqtt from 'mqtt';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse CLI arguments
const argv = yargs(hideBin(process.argv))
  .option('deviceId', {
    type: 'string',
    demandOption: true,
    describe: 'Device ID',
  })
  .option('modelId', {
    type: 'string',
    demandOption: true,
    describe: 'Device Model ID',
  })
  .option('name', {
    type: 'string',
    demandOption: true,
    describe: 'Device name',
  })
  .option('mqttUrl', {
    type: 'string',
    default: 'mqtt://localhost:1883',
    describe: 'MQTT broker URL',
  })
  .help()
  .argv;

// Device state
const state = {
  on: false,
  brightness: 50,
};

// MQTT client
let client;

// Topic builders
const topics = {
  presence: `iot/v1/devices/${argv.deviceId}/presence`,
  desc: `iot/v1/devices/${argv.deviceId}/desc`,
  state: (prop) => `iot/v1/devices/${argv.deviceId}/state/${prop}`,
  event: (name) => `iot/v1/devices/${argv.deviceId}/event/${name}`,
  cmd: `iot/v1/devices/${argv.deviceId}/cmd/#`,
  resp: (reqId) => `iot/v1/devices/${argv.deviceId}/resp/${reqId}`,
};

function connect() {
  console.log(`🔌 Connecting to ${argv.mqttUrl}...`);
  
  client = mqtt.connect(argv.mqttUrl, {
    clientId: `${argv.deviceId}-${Date.now()}`,
    clean: true,
    will: {
      topic: topics.presence,
      payload: JSON.stringify({
        deviceId: argv.deviceId,
        online: false,
        ts: Date.now(),
      }),
      qos: 1,
      retain: true,
    },
  });

  client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    
    // Publish presence (retained)
    publishPresence(true);
    
    // Publish description (retained)
    publishDescription();
    
    // Subscribe to commands
    client.subscribe(topics.cmd, { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to subscribe to commands:', err);
      } else {
        console.log(`📡 Subscribed to ${topics.cmd}`);
      }
    });

    // Start periodic state reporting
    startStateReporting();
  });

  client.on('message', (topic, payload) => {
    handleCommand(topic, payload);
  });

  client.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
  });

  client.on('close', () => {
    console.log('Connection closed');
  });
}

function publishPresence(online) {
  const message = {
    deviceId: argv.deviceId,
    online,
    ts: Date.now(),
  };
  
  client.publish(topics.presence, JSON.stringify(message), {
    qos: 1,
    retain: true,
  });
  
  console.log(`📍 Presence published: ${online ? 'ONLINE' : 'OFFLINE'}`);
}

function publishDescription() {
  const description = {
    deviceId: argv.deviceId,
    modelId: argv.modelId,
    name: argv.name,
    capabilities: {
      properties: {
        on: {
          type: 'boolean',
          description: 'Light on/off state',
        },
        brightness: {
          type: 'number',
          min: 0,
          max: 100,
          unit: '%',
          description: 'Light brightness',
        },
      },
      actions: {
        turnOn: {
          description: 'Turn the light on',
        },
        turnOff: {
          description: 'Turn the light off',
        },
        setBrightness: {
          description: 'Set brightness',
          params: {
            brightness: {
              type: 'number',
              required: true,
              min: 0,
              max: 100,
            },
          },
        },
      },
      events: {
        stateChanged: {
          description: 'State changed event',
        },
      },
    },
    semantic: {
      type: 'light',
      tags: ['simulated', 'smart-light'],
    },
    control: {
      protocol: 'mqtt',
      cmdTopicPrefix: `iot/v1/devices/${argv.deviceId}/cmd`,
      stateTopicPrefix: `iot/v1/devices/${argv.deviceId}/state`,
      respTopicPrefix: `iot/v1/devices/${argv.deviceId}/resp`,
    },
  };

  client.publish(topics.desc, JSON.stringify(description), {
    qos: 1,
    retain: true,
  });

  console.log('📝 Description published');
}

function publishState(propertyName, value) {
  client.publish(topics.state(propertyName), JSON.stringify(value), {
    qos: 1,
  });
  
  console.log(`📊 State: ${propertyName} = ${JSON.stringify(value)}`);
}

function handleCommand(topic, payload) {
  try {
    const command = JSON.parse(payload.toString());
    const parts = topic.split('/');
    const actionName = parts[parts.length - 1];

    console.log(`📥 Command received: ${actionName}`, command.params || '');

    let result;
    let error;

    switch (actionName) {
      case 'turnOn':
        state.on = true;
        publishState('on', true);
        result = { success: true };
        break;

      case 'turnOff':
        state.on = false;
        publishState('on', false);
        result = { success: true };
        break;

      case 'setBrightness':
        const brightness = command.params?.brightness;
        if (brightness !== undefined && brightness >= 0 && brightness <= 100) {
          state.brightness = brightness;
          publishState('brightness', brightness);
          result = { success: true, brightness };
        } else {
          error = 'Invalid brightness value (must be 0-100)';
        }
        break;

      default:
        error = `Unknown action: ${actionName}`;
    }

    // Publish response
    const response = {
      requestId: command.requestId,
      ok: !error,
      result,
      error,
      ts: Date.now(),
    };

    client.publish(topics.resp(command.requestId), JSON.stringify(response), {
      qos: 1,
    });

    console.log(`📤 Response sent:`, response);
  } catch (error) {
    console.error('Error handling command:', error);
  }
}

function startStateReporting() {
  // Report current state every 10 seconds
  setInterval(() => {
    publishState('on', state.on);
    publishState('brightness', state.brightness);
  }, 10000);

  // Initial state report
  publishState('on', state.on);
  publishState('brightness', state.brightness);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down...');
  publishPresence(false);
  setTimeout(() => {
    client.end();
    process.exit(0);
  }, 500);
});

// Start
connect();
