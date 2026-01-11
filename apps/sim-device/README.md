# Simulated IoT Device

A simulated IoT device that implements the platform's MQTT protocol.

## Features

- **MQTT Client**: Connects to MQTT broker with Last Will
- **Presence Management**: Publishes online/offline status (retained)
- **Device Description**: Publishes capabilities and configuration (retained)
- **State Reporting**: Periodic state updates
- **Event Emission**: Random event generation
- **Command Handling**: Responds to platform commands
- **Cross-Computer Support**: Can run on any machine with network access to broker

## Usage

```bash
# Build
pnpm build

# Start with defaults
pnpm start

# Start with custom parameters
pnpm start -- \
  --deviceId sim-light-001 \
  --modelId model.sim.light.v1 \
  --name "Living Room Light" \
  --mqttUrl mqtt://localhost:1883

# Or using the helper script
../../scripts/start-device.sh sim-light-001 model.sim.light.v1 "My Light" mqtt://192.168.1.100:1883
```

## CLI Options

- `--deviceId, -d`: Unique device identifier (default: sim-light-001)
- `--modelId, -m`: Device model ID (default: model.sim.light.v1)
- `--name, -n`: Human-readable device name (default: Simulated Smart Light)
- `--mqttUrl, -u`: MQTT broker URL (default: mqtt://localhost:1883)

## Simulated Capabilities

The device simulates a smart light with:

**Properties:**
- `on` (boolean): Power state
- `brightness` (number 0-100): Brightness level

**Actions:**
- `turnOn`: Turn light on
- `turnOff`: Turn light off
- `setBrightness(brightness)`: Set brightness level

**Events:**
- `overheat`: Randomly triggered when brightness > 80%

## MQTT Protocol

The device follows the platform's MQTT protocol:

1. **Connection**: Establishes MQTT connection with Last Will
2. **Presence**: Publishes online presence (retained)
3. **Description**: Publishes device capabilities (retained)
4. **State**: Reports state every 5 seconds
5. **Commands**: Subscribes to `iot/v1/devices/{deviceId}/cmd/#`
6. **Responses**: Publishes command responses with request ID
7. **Events**: Publishes events when triggered

## Cross-Computer Setup

To run on a different computer than the platform:

1. Find the platform's IP address (where MQTT broker runs)
2. Ensure port 1883 is accessible
3. Run device with custom MQTT URL:
   ```bash
   pnpm start -- --mqttUrl mqtt://192.168.1.100:1883
   ```

The device will automatically be discovered by the platform!

## Shutdown

Press Ctrl+C to gracefully shutdown. The device will:
1. Publish offline presence (retained)
2. Disconnect from MQTT broker
3. Exit

## Extending

To create your own simulated device:

1. Copy `src/index.ts` as a template
2. Modify capabilities in the description
3. Implement your custom action handlers
4. Add your own state properties and events
