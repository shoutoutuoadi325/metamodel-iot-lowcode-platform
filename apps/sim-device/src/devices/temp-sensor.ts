
import { BaseDevice } from '../base-device';
import { DeviceCapability, DeviceSemantic, DeviceCommand } from '@iot-platform/shared';

interface TempSensorState {
  active: boolean;
  temperature: number;
  humidity: number;
  battery: number;
}

export class TempSensorDevice extends BaseDevice {
  private state: TempSensorState = {
    active: true,
    temperature: 25,
    humidity: 45,
    battery: 100,
  };

  getCapabilities(): DeviceCapability[] {
    return [
      {
        type: 'property',
        name: 'active',
        valueType: 'boolean',
        writable: true,
        readable: true,
        description: 'Sensor status',
      },
      {
        type: 'property',
        name: 'temperature',
        valueType: 'number',
        writable: false,
        readable: true,
        unit: '°C',
        min: -20,
        max: 80,
        description: 'Current temperature',
      },
      {
        type: 'property',
        name: 'humidity',
        valueType: 'number',
        writable: false,
        readable: true,
        unit: '%',
        min: 0,
        max: 100,
        description: 'Current humidity',
      },
      {
        type: 'property',
        name: 'battery',
        valueType: 'number',
        writable: false,
        readable: true,
        unit: '%',
        min: 0,
        max: 100,
        description: 'Battery level',
      },
      {
        type: 'action',
        name: 'enable',
        description: 'Enable the sensor',
      },
      {
        type: 'action',
        name: 'disable',
        description: 'Disable the sensor',
      },
      {
        type: 'action',
        name: 'reset',
        description: 'Reset the sensor',
      },
    ];
  }

  getSemantic(): DeviceSemantic {
    return {
      type: 'sensor',
      location: 'Living Room',
      tags: ['smart-home', 'sensor', 'temperature'],
    };
  }

  onLoop(): void {
    // Only update if active
    if (this.state.active) {
      // Simulate data changes
      this.state.temperature += (Math.random() - 0.5); // drift +/- 0.5
      this.state.humidity += (Math.random() - 0.5) * 2;
      this.state.battery = Math.max(0, this.state.battery - 0.01);

      this.publishState('temperature', parseFloat(this.state.temperature.toFixed(1)));
      // Also emit an event for flows
      this.publishEvent('temperature', { temperature: parseFloat(this.state.temperature.toFixed(1)) });

      this.publishState('humidity', parseFloat(this.state.humidity.toFixed(1)));
      this.publishState('battery', parseFloat(this.state.battery.toFixed(1)));
    }
    
    this.publishState('active', this.state.active);
  }

  handleSpecificCommand(command: DeviceCommand): { result: any; error?: string } {
    let result: any = null;

    switch (command.actionName) {
      case 'enable':
        this.state.active = true;
        result = { active: true };
        break;

      case 'disable':
        this.state.active = false;
        result = { active: false };
        break;

      case 'reset':
        this.state.temperature = 25;
        this.state.humidity = 45;
        result = { success: true };
        break;

      default:
        throw new Error(`Unknown action: ${command.actionName}`);
    }

    // Publish state update immediately
    this.publishState('active', this.state.active);
    if (command.actionName === 'reset') {
        this.publishState('temperature', this.state.temperature);
        this.publishState('humidity', this.state.humidity);
    }

    return { result };
  }
}
