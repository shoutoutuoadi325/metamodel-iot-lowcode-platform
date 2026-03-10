
import { BaseDevice } from '../base-device';
import { DeviceCapability, DeviceSemantic, DeviceCommand } from '@iot-platform/shared';

interface LockState {
  isLocked: boolean;
  battery: number;
}

export class SmartLockDevice extends BaseDevice {
  private state: LockState = {
    isLocked: true,
    battery: 95,
  };

  getCapabilities(): DeviceCapability[] {
    return [
      {
        type: 'property',
        name: 'isLocked',
        valueType: 'boolean',
        writable: false,
        readable: true,
        description: 'Lock status',
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
        name: 'lock',
        description: 'Lock the door',
      },
      {
        type: 'action',
        name: 'unlock',
        description: 'Unlock the door',
      },
      {
        type: 'event',
        name: 'tamper',
        description: 'Tamper detected',
      },
    ];
  }

  getSemantic(): DeviceSemantic {
    return {
      type: 'lock',
      location: 'Front Door',
      tags: ['smart-home', 'security', 'lock'],
    };
  }

  onLoop(): void {
    this.publishState('isLocked', this.state.isLocked);
    this.state.battery = Math.max(0, this.state.battery - 0.001);
    this.publishState('battery', parseFloat(this.state.battery.toFixed(1)));

    // Random tamper event
    if (Math.random() > 0.95) {
        this.publishEvent('tamper', { severity: 'high', ts: Date.now() });
    }
  }

  handleSpecificCommand(command: DeviceCommand): { result: any; error?: string } {
    let result: any = null;

    switch (command.actionName) {
      case 'lock':
        this.state.isLocked = true;
        result = { isLocked: true };
        this.publishEvent('locked', { isLocked: true });
        break;

      case 'unlock':
        this.state.isLocked = false;
        result = { isLocked: false };
        this.publishEvent('unlocked', { isLocked: false });
        break;

      default:
        throw new Error(`Unknown action: ${command.actionName}`);
    }
    
    this.publishState('isLocked', this.state.isLocked);
    return { result };
  }
}
