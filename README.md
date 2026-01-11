# IoT Low-Code Platform with Meta-Modeling

A complete IoT platform featuring device meta-modeling, MQTT-based communication, real-time monitoring, and low-code orchestration capabilities.

## 🌟 Features

- **Meta-Modeling & DSL**: Define device capabilities using JSON schemas with validation
- **Device Discovery**: Automatic device discovery via MQTT with retained messages
- **Cross-Computer Support**: Devices can run on different machines and connect to the same broker
- **Real-Time Updates**: WebSocket-based real-time state and event streaming
- **Low-Code Orchestration**: Visual flow builder for device automation (Trigger → Condition → Action)
- **REST API**: Complete API for device management, models, and flows
- **Simulated Devices**: Built-in device simulator for testing without physical hardware

## 📐 Architecture

```
┌─────────────────┐     MQTT      ┌─────────────────┐
│ Simulated       │◄──────────────►│  MQTT Broker    │
│ Devices         │   (1883)       │  (Mosquitto)    │
│ (apps/sim-device│                └────────┬────────┘
└─────────────────┘                         │
                                            │ MQTT
                                            ▼
┌─────────────────┐   WebSocket   ┌─────────────────┐
│   Web Frontend  │◄──────────────┤  Backend API    │
│   (Next.js)     │   HTTP/WS     │  (NestJS)       │
│   Port: 3000    │               │  Port: 3001     │
└─────────────────┘               └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │   PostgreSQL    │
                                  │   Port: 5432    │
                                  └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Docker** & **Docker Compose**

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd metamodel-iot-lowcode-platform
```

2. Run the setup script:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- Install all dependencies
- Start Docker containers (PostgreSQL + Mosquitto)
- Run database migrations
- Build all packages

### Starting the Platform

#### Option 1: Start All Services (Recommended for Development)
```bash
pnpm dev
```

This starts all services in parallel:
- API server on port 3001
- Web frontend on port 3000
- Shared package in watch mode

#### Option 2: Start Services Individually

**Terminal 1 - API Server:**
```bash
cd apps/api
pnpm dev
```

**Terminal 2 - Web Frontend:**
```bash
cd apps/web
pnpm dev
```

**Terminal 3 - Simulated Device:**
```bash
cd apps/sim-device
pnpm dev
# Or use the helper script:
# ./scripts/start-device.sh sim-light-001
```

### Access the Platform

- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api (if implemented)
- **Database Admin**: http://localhost:8080 (Adminer)

## 📱 Using Simulated Devices

### Start a Device

```bash
cd apps/sim-device
pnpm start -- \
  --deviceId sim-light-001 \
  --modelId model.sim.light.v1 \
  --name "Living Room Light" \
  --mqttUrl mqtt://localhost:1883
```

### Start Multiple Devices

```bash
# Device 1
pnpm start -- --deviceId sim-light-001 --name "Living Room Light"

# Device 2 (in another terminal)
pnpm start -- --deviceId sim-light-002 --name "Bedroom Light"
```

### Cross-Computer Setup

To run devices on a different computer:

1. **On Computer A (Platform):**
   - Note the IP address: `192.168.1.100`
   - Ensure MQTT port 1883 is accessible

2. **On Computer B (Device):**
```bash
pnpm start -- \
  --deviceId sim-light-remote \
  --mqttUrl mqtt://192.168.1.100:1883
```

The device will automatically appear in the web UI on Computer A!

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```env
# Database
DATABASE_URL="postgresql://iot_user:iot_password@localhost:5432/iot_platform"

# MQTT
MQTT_URL="mqtt://localhost:1883"

# API
API_PORT=3001
NODE_ENV=development

# Web Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## 📚 API Endpoints

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details
- `POST /api/devices/:id/actions/:actionName` - Execute device action
- `GET /api/devices/:id/state/history` - Get state history
- `GET /api/devices/:id/events/history` - Get event history

### Device Models
- `GET /api/device-models` - List all device models
- `GET /api/device-models/:id` - Get device model
- `POST /api/device-models` - Create device model
- `PUT /api/device-models/:id` - Update device model
- `DELETE /api/device-models/:id` - Delete device model

### Flows
- `GET /api/flows` - List all flows
- `GET /api/flows/:id` - Get flow details
- `POST /api/flows` - Create flow
- `PUT /api/flows/:id` - Update flow
- `DELETE /api/flows/:id` - Delete flow
- `POST /api/flows/:id/enable` - Enable flow
- `POST /api/flows/:id/disable` - Disable flow
- `GET /api/flows/:id/runs` - Get flow execution history

## 🔄 MQTT Protocol

### Topic Structure

```
iot/v1/devices/{deviceId}/presence     (retained)
iot/v1/devices/{deviceId}/desc         (retained)
iot/v1/devices/{deviceId}/state/{propertyName}
iot/v1/devices/{deviceId}/event/{eventName}
iot/v1/devices/{deviceId}/cmd/{actionName}
iot/v1/devices/{deviceId}/resp/{requestId}
```

### Message Formats

**Presence:**
```json
{
  "deviceId": "sim-light-001",
  "online": true,
  "ts": 1704970800000,
  "ip": "192.168.1.100",
  "descTopic": "iot/v1/devices/sim-light-001/desc"
}
```

**Device Description:**
```json
{
  "deviceId": "sim-light-001",
  "modelId": "model.sim.light.v1",
  "name": "Smart Light",
  "capabilities": [...],
  "semantic": {
    "type": "light",
    "location": "Living Room",
    "tags": ["smart-home"]
  },
  "control": {
    "protocol": "mqtt",
    "cmdTopicPrefix": "iot/v1/devices/sim-light-001/cmd/",
    ...
  }
}
```

**Command:**
```json
{
  "requestId": "uuid-here",
  "actionName": "setBrightness",
  "params": { "brightness": 75 },
  "ts": 1704970800000
}
```

**Response:**
```json
{
  "requestId": "uuid-here",
  "ok": true,
  "result": { "brightness": 75, "on": true },
  "ts": 1704970800000
}
```

## 🎨 Low-Code Orchestration

### Creating a Flow

Flows consist of three node types:
1. **Trigger** - Device event that starts the flow
2. **Condition** - JSONLogic-based conditional logic
3. **Action** - Device action to execute

Example flow: "Turn on light when overheat detected"

```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "data": {
        "deviceId": "sim-light-001",
        "eventName": "overheat"
      }
    },
    {
      "id": "action-1",
      "type": "action",
      "data": {
        "deviceId": "sim-light-001",
        "actionName": "turnOff",
        "params": {}
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "trigger-1",
      "target": "action-1"
    }
  ]
}
```

## 🗂️ Project Structure

```
metamodel-iot-lowcode-platform/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── devices/     # Device management
│   │   │   ├── device-models/ # Meta-model management
│   │   │   ├── flows/       # Flow management
│   │   │   ├── mqtt/        # MQTT gateway
│   │   │   ├── orchestrator/ # Flow execution engine
│   │   │   ├── prisma/      # Database service
│   │   │   └── websocket/   # Real-time updates
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── web/                 # Next.js frontend
│   │   └── src/
│   │       ├── app/         # App router pages
│   │       └── lib/         # API client & WebSocket
│   └── sim-device/          # Device simulator
│       └── src/
│           └── index.ts
├── packages/
│   └── shared/              # Shared types & constants
│       └── src/
│           ├── mqtt-topics.ts
│           └── types.ts
├── scripts/                 # Helper scripts
│   ├── setup.sh
│   └── start-device.sh
├── docker-compose.yml       # Infrastructure
├── mosquitto.conf           # MQTT broker config
├── pnpm-workspace.yaml      # Monorepo config
└── README.md
```

## 🧪 Testing the Platform

### End-to-End Test

1. **Start the platform:**
   ```bash
   pnpm dev
   ```

2. **Start a simulated device:**
   ```bash
   cd apps/sim-device
   pnpm dev
   ```

3. **Open the web UI:** http://localhost:3000
   - You should see the device appear in the list
   - Click on the device to see details
   - Try turning it on/off
   - Adjust the brightness

4. **Create a flow (via API):**
   ```bash
   curl -X POST http://localhost:3001/api/flows \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Auto Shutoff on Overheat",
       "graph": {
         "nodes": [
           {
             "id": "trigger-1",
             "type": "trigger",
             "position": {"x": 0, "y": 0},
             "data": {"eventName": "overheat"}
           },
           {
             "id": "action-1",
             "type": "action",
             "position": {"x": 200, "y": 0},
             "data": {
               "deviceId": "sim-light-001",
               "actionName": "turnOff",
               "params": {}
             }
           }
         ],
         "edges": [
           {"id": "e1", "source": "trigger-1", "target": "action-1"}
         ]
       }
     }'
   ```

5. **Enable the flow:**
   ```bash
   curl -X POST http://localhost:3001/api/flows/{flowId}/enable
   ```

## 🛠️ Development

### Database Migrations

```bash
cd apps/api

# Create a new migration
pnpm prisma migrate dev --name migration_name

# Reset database
pnpm prisma migrate reset

# Open Prisma Studio
pnpm prisma studio
```

### Build for Production

```bash
# Build all packages
pnpm build

# Start in production mode
cd apps/api && pnpm start:prod
cd apps/web && pnpm start
```

## 📖 Additional Documentation

- [API Documentation](./apps/api/README.md)
- [Web Frontend Documentation](./apps/web/README.md)
- [Simulated Device Documentation](./apps/sim-device/README.md)
- [Shared Package Documentation](./packages/shared/README.md)

## 🤝 Contributing

This is a research prototype. Contributions are welcome!

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- NestJS
- Next.js
- React Flow
- Prisma
- MQTT.js
- PostgreSQL
- Mosquitto MQTT Broker
