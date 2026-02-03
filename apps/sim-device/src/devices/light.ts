
import { BaseDevice } from '../base-device';
import { DeviceCapability, DeviceSemantic, DeviceCommand } from '@iot-platform/shared';

interface LightState {
  on: boolean;
  brightness: number;
  temperature: number;
}

export class LightDevice extends BaseDevice {
  private state: LightState = {
    on: false,
    brightness: 0,
    temperature: 25,
  };

  getCapabilities(): DeviceCapability[] {
    return [
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
    ];
  }

  getSemantic(): DeviceSemantic {
    return {
      type: 'light',
      location: 'Living Room',
      tags: ['smart-home', 'lighting', 'simulated'],
    };
  }

  onLoop(): void {
    this.publishState('on', this.state.on);
    this.publishState('brightness', this.state.brightness);
    
    // Simulate temperature changes
    this.state.temperature = 20 + Math.random() * 15;

    // Randomly trigger overheat event (approx every 15-20s on average)
    if (this.state.on && this.state.brightness > 80 && Math.random() > 0.8) {
        this.publishEvent('overheat', {
          temperature: this.state.temperature,
          threshold: 35,
        });
    }
  }

  handleSpecificCommand(command: DeviceCommand): { result: any; error?: string } {
    let result: any = null;

    switch (command.actionName) {
      case 'turnOn':
        this.state.on = true;
        if (this.state.brightness === 0) {
            this.state.brightness = 50;
        }
        result = { on: true, brightness: this.state.brightness };
        break;

      case 'turnOff':
        this.state.on = false;
        this.state.brightness = 0;
        result = { on: false, brightness: 0 };
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

    // Publish updated state
    this.publishState('on', this.state.on);
    this.publishState('brightness', this.state.brightness);

    return { result };
  }
}
