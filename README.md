# IoT Low-Code Platform with Meta-Modeling

A complete, runnable IoT platform built with meta-modeling, DSL, low-code orchestration, and semantic device discovery. This platform enables automatic device discovery, real-time control, and visual flow-based automation.

## 🎯 Features

- **Meta-Modeling & DSL**: Define device models using a flexible schema
- **Automatic Device Discovery**: Devices auto-register via MQTT with semantic metadata
- **Real-time Device Control**: Control devices across computers using MQTT
- **API Visualization**: Interactive API documentation and testing interface
- **Low-Code Flow Builder**: Visual automation editor (foundation included)
- **WebSocket Updates**: Real-time state updates to web frontend
- **Cross-Computer Communication**: Devices and platform can run on different computers

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
│  Web Frontend   │◄────►│  API Server  │◄────►│  PostgreSQL │
│  (Next.js)      │      │  (NestJS)    │      │             │
│  Port 3000      │      │  Port 3001   │      └─────────────┘
└─────────────────┘      └──────────────┘
                               │
                         ┌─────▼──────┐
                         │    MQTT    │
                         │  Mosquitto │
                         │  Port 1883 │
                         └─────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────▼─────┐         ┌────▼─────┐
              │  Device 1 │         │ Device 2 │
              │ (sim-dev) │         │ (sim-dev)│
              └───────────┘         └──────────┘
```

## 📦 Tech Stack

- **Monorepo**: pnpm workspace
- **Frontend**: Next.js 14 + TypeScript + React + Tailwind CSS
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Communication**: MQTT (Eclipse Mosquitto)
- **Real-time**: WebSocket (Socket.io)
- **Device Simulation**: Node.js

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repo-url>
cd metamodel-iot-lowcode-platform

# Copy environment variables
cp .env.example .env

# Run setup script (installs deps, starts Docker, runs migrations)
bash scripts/setup.sh
```

### 2. Start Services

**Option A: Manual Start (Recommended for Development)**

```bash
# Terminal 1: Start API Server
cd apps/api
pnpm dev

# Terminal 2: Start Web Frontend
cd apps/web
pnpm dev

# Terminal 3: Start Simulated Device
cd apps/sim-device
pnpm dev
```

**Option B: Start All at Once**

```bash
bash scripts/start-all.sh
```

### 3. Access the Platform

- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs (✨ New Feature!)
- **API Server**: http://localhost:3001
- **Database Admin**: http://localhost:8080 (Adminer)

## 📚 API Documentation

### Decision: Integrated API Visualization

**The API visualization has been integrated into the existing localhost:3000 web interface** rather than creating a separate webpage. This decision provides:

✅ **Benefits:**
- Unified user experience - navigate between devices, flows, and API docs seamlessly
- Single authentication/authorization system (when implemented)
- Consistent UI/UX across all platform features
- Better maintainability - one web application to manage
- Easier development workflow

### Using the API Documentation Page

1. Navigate to http://localhost:3000/api-docs
2. Browse all available REST API endpoints
3. Click any endpoint to see:
   - Request parameters
   - Request body schema
   - Response examples
4. **Test APIs directly** from the browser:
   - Enter request body (for POST/PUT)
   - Click "Send Request"
   - View the response

### Available APIs

#### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details
- `POST /api/devices/:id/actions/:actionName` - Execute device action

#### Device Models
- `GET /api/device-models` - List all device models
- `GET /api/device-models/:id` - Get specific model
- `POST /api/device-models` - Create new model
- `PUT /api/device-models/:id` - Update model

#### Flows
- `GET /api/flows` - List all flows
- `GET /api/flows/:id` - Get specific flow
- `POST /api/flows` - Create new flow
- `PUT /api/flows/:id` - Update flow
- `POST /api/flows/:id/enable` - Enable flow
- `POST /api/flows/:id/disable` - Disable flow
- `GET /api/flows/:id/runs` - Get flow execution history

## 🔌 MQTT Protocol

### Topic Convention (v1)

```
iot/v1/devices/{deviceId}/presence     - Device online/offline (retained)
iot/v1/devices/{deviceId}/desc         - Device description (retained)
iot/v1/devices/{deviceId}/state/{prop} - Property state updates
iot/v1/devices/{deviceId}/event/{name} - Device events
iot/v1/devices/{deviceId}/cmd/{action} - Send commands to device
iot/v1/devices/{deviceId}/resp/{reqId} - Command responses
```

### Message Formats

**Presence Message:**
```json
{
  "deviceId": "sim-light-001",
  "online": true,
  "ts": 1704960000000,
  "ip": "192.168.1.100"
}
```

**Device Description:**
```json
{
  "deviceId": "sim-light-001",
  "modelId": "model.sim.light.v1",
  "name": "Living Room Light",
  "capabilities": {
    "properties": { ... },
    "actions": { ... },
    "events": { ... }
  },
  "semantic": {
    "type": "light",
    "location": "living-room",
    "tags": ["smart-light"]
  }
}
```

**Command Message:**
```json
{
  "requestId": "uuid",
  "actionName": "setBrightness",
  "params": { "brightness": 75 },
  "ts": 1704960000000
}
```

## 🖥️ Running Devices on Different Computers

The platform supports cross-computer device communication:

### Computer A (Platform)

```bash
# Start platform services
docker-compose up -d
cd apps/api && pnpm dev
cd apps/web && pnpm dev
```

### Computer B (Device)

```bash
# Point to Computer A's MQTT broker
cd apps/sim-device
node index.js \
  --deviceId sim-light-002 \
  --modelId model.sim.light.v1 \
  --name "Bedroom Light" \
  --mqttUrl mqtt://COMPUTER_A_IP:1883
```

The device will automatically:
1. Publish retained presence (online=true)
2. Publish retained device description
3. Appear in the web UI on Computer A
4. Accept commands from the platform

## 📁 Repository Structure

```
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   └── main.ts
│   │   └── prisma/       # Database schema
│   ├── web/              # Next.js frontend
│   │   └── src/
│   │       ├── pages/    # Page components
│   │       │   ├── index.tsx
│   │       │   ├── devices.tsx
│   │       │   ├── device-models.tsx
│   │       │   ├── flows.tsx
│   │       │   └── api-docs.tsx  ← API Visualization
│   │       └── components/
│   └── sim-device/       # Simulated device program
│       └── index.js
├── packages/
│   └── shared/           # Shared types & constants
│       └── src/
├── scripts/              # Setup & start scripts
├── docker-compose.yml
└── README.md
```

## 🧪 Testing the Platform

### 1. Verify Device Discovery

```bash
# Start a device
cd apps/sim-device
pnpm dev

# Check in web UI
# Navigate to http://localhost:3000/devices
# Device should appear automatically
```

### 2. Test Device Control

Visit http://localhost:3000/api-docs and test:

```bash
POST /api/devices/sim-light-001/actions/turnOn
# Response: { "ok": true, "result": { "success": true } }

POST /api/devices/sim-light-001/actions/setBrightness
Body: { "brightness": 80 }
# Response: { "ok": true, "result": { "brightness": 80 } }
```

### 3. Monitor MQTT Traffic

```bash
# Subscribe to all topics
docker exec -it iot-mosquitto mosquitto_sub -t "iot/v1/#" -v
```

## 🛠️ Development

### Database Management

```bash
cd apps/api

# Generate Prisma client
pnpm prisma:generate

# Create migration
pnpm prisma:migrate

# Open Prisma Studio
pnpm prisma:studio
```

### Build for Production

```bash
# Build all apps
pnpm build

# Start API in production
cd apps/api
pnpm start:prod

# Start web in production
cd apps/web
pnpm start
```

## 📖 Additional Documentation

- See `prompt.md` for detailed requirements and specifications
- API endpoints are documented at `/api-docs` in the web interface
- MQTT topics are documented in `packages/shared/src/topics.ts`

## 🎉 Features Implemented

✅ Complete monorepo structure with pnpm workspace  
✅ Docker Compose with PostgreSQL + MQTT + Adminer  
✅ NestJS backend with all required modules  
✅ Prisma ORM with comprehensive schema  
✅ MQTT Gateway Service with auto-discovery  
✅ REST API endpoints for devices, models, and flows  
✅ Device model validation with AJV  
✅ WebSocket gateway for real-time updates  
✅ Next.js frontend with responsive UI  
✅ **Interactive API Documentation page** ⭐  
✅ Device list page with real-time status  
✅ Device models management page  
✅ Flows list page (builder foundation)  
✅ Simulated device with CLI parameters  
✅ Cross-computer device support  
✅ Setup and startup scripts  

## 🔮 Future Enhancements

- Visual Flow Builder with React Flow (UI foundation ready)
- Flow orchestration engine with JSONLogic
- Home Assistant MQTT Discovery integration
- KubeEdge YAML generator
- Authentication & authorization
- Device state history charts
- Event logs viewer
- More device types (sensors, actuators)

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! This is a research project demonstrating meta-modeling concepts for IoT platforms.
