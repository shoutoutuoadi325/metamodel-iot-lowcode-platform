import { BaseDevice } from '../base-device';
import { DeviceCapability, DeviceCommand, DeviceSemantic } from '@iot-platform/shared';

export class HvacDevice extends BaseDevice {
  private mode: 'off' | 'cool' | 'heat' = 'off';
  private targetTemp: number = 24;
  private currentTemp: number = 26;
  private fanSpeed: 'low' | 'mid' | 'high' = 'mid';

  getCapabilities(): DeviceCapability[] {
    return [
      {
        name: 'setMode',
        description: 'Set HVAC mode',
        inputs: [
          {
            name: 'mode',
            type: 'string',
            enum: ['off', 'cool', 'heat'],
          },
        ],
      },
      {
        name: 'setTargetTemp',
        description: 'Set target temperature',
        inputs: [
          {
            name: 'temp',
            type: 'integer',
            min: 16,
            max: 30,
          },
        ],
      },
      {
        name: 'setFanSpeed',
        description: 'Set fan speed',
        inputs: [
          {
            name: 'speed',
            type: 'string',
            enum: ['low', 'mid', 'high'],
          },
        ],
      },
    ];
  }

  getSemantic(): DeviceSemantic {
    return { type: 'hvac' };
  }

  onLoop(): void {
    // Simulate temperature adjustment
    if (this.mode === 'cool' && this.currentTemp > this.targetTemp) {
      this.currentTemp -= 0.5;
    } else if (this.mode === 'heat' && this.currentTemp < this.targetTemp) {
      this.currentTemp += 0.5;
    } else if (this.mode === 'off') {
      // Return to ambient 26C
      if (this.currentTemp > 26) this.currentTemp -= 0.1;
      if (this.currentTemp < 26) this.currentTemp += 0.1;
    }

    // Keep within logical bounds
    this.currentTemp = Math.round(this.currentTemp * 10) / 10;

    this.publishState('mode', this.mode);
    this.publishState('targetTemp', this.targetTemp);
    this.publishState('currentTemp', this.currentTemp);
    this.publishState('fanSpeed', this.fanSpeed);
  }

  handleSpecificCommand(command: DeviceCommand): { result: any; error?: string } {
    switch (command.actionName) {
      case 'setMode':
        if (!['off', 'cool', 'heat'].includes(command.params.mode)) {
          return { result: null, error: 'Invalid mode' };
        }
        this.mode = command.params.mode;
        this.publishState('mode', this.mode);
        return { result: { mode: this.mode } };

      case 'setTargetTemp':
        const temp = Number(command.params.temp);
        if (isNaN(temp) || temp < 16 || temp > 30) {
          return { result: null, error: 'Temperature out of range (16-30)' };
        }
        this.targetTemp = temp;
        this.publishState('targetTemp', this.targetTemp);
        return { result: { targetTemp: this.targetTemp } };

      case 'setFanSpeed':
        if (!['low', 'mid', 'high'].includes(command.params.speed)) {
          return { result: null, error: 'Invalid fan speed' };
        }
        this.fanSpeed = command.params.speed;
        this.publishState('fanSpeed', this.fanSpeed);
        return { result: { fanSpeed: this.fanSpeed } };

      default:
        return { result: null, error: 'Unknown command' };
    }
  }
}
