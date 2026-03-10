import { BaseDevice } from '../base-device';
import { DeviceCapability, DeviceCommand, DeviceSemantic } from '@iot-platform/shared';

export class OccupancySensorDevice extends BaseDevice {
  private occupied: boolean = false;

  getCapabilities(): DeviceCapability[] {
    return [
      {
        name: 'setOccupancy',
        description: 'Simulate occupancy state',
        inputs: [
          {
            name: 'occupied',
            type: 'boolean',
          },
        ],
      },
    ];
  }

  getSemantic(): DeviceSemantic {
    return { type: 'occupancy' };
  }

  onLoop(): void {
    // Just report the current state periodically
    this.publishState('occupied', this.occupied);
  }

  handleSpecificCommand(command: DeviceCommand): { result: any; error?: string } {
    if (command.actionName === 'setOccupancy') {
      this.occupied = !!command.params.occupied;
      this.publishState('occupied', this.occupied);
      this.publishEvent('occupied', { occupied: this.occupied });
      return { result: { occupied: this.occupied } };
    }
    return { result: null, error: 'Unknown command' };
  }
}
