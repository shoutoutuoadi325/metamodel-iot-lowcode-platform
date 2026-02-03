# Sim-Device Refactoring & Smart Building Extension Guide

## 1. Overview
The `sim-device` application has been refactored from a single-file script into a modular, class-based architecture. This structure supports multiple device types simultaneously while sharing common MQTT communication logic. We have also extended the platform with specific devices for Smart Building scenarios (Universities, Offices).

## 2. Architecture

### 2.1 Base Class (`src/base-device.ts`)
The core logic is now encapsulated in the abstract `BaseDevice` class. It handles all protocol-level operations:
- **MQTT Lifecycle**: Connects to the broker, handles reconnection, and manages the "Last Will" message for offline detection.
- **Protocol Compliance**: Automatically publishes:
  - `presence`: Online/Offline status.
  - `description`: Device capabilities and metadata (JSON Schema).
- **Communication Patterns**:
  - Subscribes to command topics.
  - Dispatches incoming commands to the specific device handler.
  - Publishes command responses (ACK/Error).
  - Provides helpers `publishState()` and `publishEvent()` for device logic.

### 2.2 Concrete Devices (`src/devices/*.ts`)
Each device type is a separate class extending `BaseDevice`.

| Device Type | Class | File | Features |
|-------------|-------|------|----------|
| **Light** | `LightDevice` | `devices/light.ts` | Brightness control, On/Off state. |
| **Temp Sensor** | `TempSensorDevice` | `devices/temp-sensor.ts` | Temperature/Humidity reporting, emits `temperature` event for automation. |
| **Smart Lock** | `SmartLockDevice` | `devices/smart-lock.ts` | Lock/Unlock commands, emits `locked`/`unlocked` events. |
| **HVAC (AC)** | `HvacDevice` | `devices/hvac.ts` | Mode (Cool/Heat/Off), Target Temp, Fan Speed. Simulates thermal inertia. |
| **Occupancy** | `OccupancySensorDevice` | `devices/occupancy.ts` | Presence detection, emits `occupied` event. |

### 2.3 Entry Point (`src/index.ts`)
The entry point has been simplified to:
1. Parse CLI arguments.
2. Instantiate the appropriate device class based on the `modelId`.
3. Launch a default set of demo devices if no specific ID is provided:
   - Living Room Light
   - Bedroom Light
   - Living Room Sensor (Temp)
   - Front Door Lock
   - Office HVAC (Smart Building)
   - Meeting Room Sensor (Occupancy)

## 3. Automation Scenarios (Flows)

We have implemented standard Smart Building automation scenarios (`apps/api/src/flows/flows.service.ts`):

1.  **Auto-Light Control**
    - **Trigger**: Meeting Room Occupancy Sensor (`occupied` event).
    - **Action**: Turn Light ON when occupied, OFF when vacant.

2.  **High Temp Cooling**
    - **Trigger**: Temperature Sensor (`temperature` event).
    - **Condition**: Temp > 28°C.
    - **Action**: Set HVAC to `COOL` mode.

3.  **After-Hours Energy Saver**
    - **Trigger**: Front Door Lock (`locked` event).
    - **Action**: Turn HVAC `OFF`.

4.  **Comfortable Study Environment**
    - **Trigger**: Occupancy Sensor (`occupied` event).
    - **Action**: Set HVAC to 24°C, Fan Speed `MID`, Mode `COOL`.

## 4. How to Add a New Device

To add a new device type (e.g., a "Fan"), follow these steps:

### Step 1: Create Device Class
Create a new file `src/devices/fan.ts`:

```typescript
import { BaseDevice } from '../base-device';
import { DeviceCapability, DeviceCommand, DeviceSemantic } from '@iot-platform/shared';

export class FanDevice extends BaseDevice {
  private speed: number = 0;

  // Define device capabilities (JSON Schema)
  getCapabilities(): DeviceCapability[] {
    return [
      {
        name: 'setSpeed',
        description: 'Set fan speed',
        inputs: [{ name: 'speed', type: 'integer', min: 0, max: 100 }]
      }
    ];
  }

  // Define semantic meaning for frontend rendering
  getSemantic(): DeviceSemantic {
    return { type: 'fan' };
  }

  // Periodic tasks (heartbeat)
  onLoop(): void {
    this.publishState('speed', this.speed);
  }

  // Handle specific commands
  handleSpecificCommand(command: DeviceCommand): { result: any; error?: string } {
    if (command.actionName === 'setSpeed') {
      this.speed = command.params.speed;
      this.publishState('speed', this.speed);
      return { result: { speed: this.speed } };
    }
    return { result: null, error: 'Unknown command' };
  }
}
```

### Step 2: Register in Entry Point
Update `src/index.ts` to recognize the new model:

```typescript
import { FanDevice } from './devices/fan';

function startDevice(...) {
  // ... existing logic
  } else if (modelId.includes('fan')) {
    device = new FanDevice(deviceId, modelId, name, mqttUrl);
  }
  // ...
}
```
