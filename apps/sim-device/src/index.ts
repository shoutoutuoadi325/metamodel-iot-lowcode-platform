#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { BaseDevice } from './base-device';
import { LightDevice } from './devices/light';
import { TempSensorDevice } from './devices/temp-sensor';
import { SmartLockDevice } from './devices/smart-lock';
import { HvacDevice } from './devices/hvac';
import { OccupancySensorDevice } from './devices/occupancy';

// Helper to start a single device
function startDevice(deviceId: string, modelId: string, name: string, mqttUrl: string) {
  let device: BaseDevice;

  if (modelId.includes('sensor.temp')) {
    device = new TempSensorDevice(deviceId, modelId, name, mqttUrl);
  } else if (modelId.includes('lock')) {
    device = new SmartLockDevice(deviceId, modelId, name, mqttUrl);
  } else if (modelId.includes('hvac')) {
    device = new HvacDevice(deviceId, modelId, name, mqttUrl);
  } else if (modelId.includes('sensor.occupancy')) {
    device = new OccupancySensorDevice(deviceId, modelId, name, mqttUrl);
  } else {
    // Default to light
    device = new LightDevice(deviceId, modelId, name, mqttUrl);
  }

  device.start();
  return device;
}

// CLI
const argv = yargs(hideBin(process.argv))
  .option('deviceId', {
    alias: 'd',
    type: 'string',
    description: 'Device ID',
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

const mqttUrl = argv.mqttUrl;

// If a specific deviceId is provided via CLI, start only that device (backward compatibility)
if (argv.deviceId) {
  startDevice(argv.deviceId, argv.modelId, argv.name, mqttUrl);
} else {
  // Default mode: Start all demo devices
  console.log('🚀 Starting all demo devices...');

  // 1. Living Room Light (Default)
  startDevice(
    'sim-light-001', 
    'model.sim.light.v1', 
    'Simulated Smart Light', 
    mqttUrl
  );

  // 2. Bedroom Light
  setTimeout(() => {
    startDevice(
      'sim-light-002', 
      'model.sim.light.v1', 
      'Bedroom Light', 
      mqttUrl
    );
  }, 1000);

  // 3. Living Room Sensor
  setTimeout(() => {
    startDevice(
      'sim-sensor-temp-001', 
      'model.sim.sensor.temp.v1', 
      'Living Room Sensor', 
      mqttUrl
    );
  }, 2000);

  // 4. Front Door Lock
  setTimeout(() => {
    startDevice(
      'sim-lock-001', 
      'model.sim.lock.v1', 
      'Front Door Lock', 
      mqttUrl
    );
  }, 3000);

  // 5. Office HVAC
  setTimeout(() => {
    startDevice(
      'sim-hvac-001', 
      'model.sim.hvac.v1', 
      'Office HVAC', 
      mqttUrl
    );
  }, 4000);

  // 6. Meeting Room Occupancy
  setTimeout(() => {
    startDevice(
      'sim-occupancy-001', 
      'model.sim.sensor.occupancy.v1', 
      'Meeting Room Sensor', 
      mqttUrl
    );
  }, 5000);
}
