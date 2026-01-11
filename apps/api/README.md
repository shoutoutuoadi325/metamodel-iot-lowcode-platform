# IoT Platform API (NestJS)

Backend API service for the IoT Low-Code Platform.

## Features

- **MQTT Gateway**: Automatic device discovery and command/response handling
- **WebSocket**: Real-time updates to connected clients
- **REST API**: Complete CRUD operations for devices, models, and flows
- **Device Model Validation**: AJV-based JSON schema validation
- **Orchestration Engine**: JSONLogic-based flow execution
- **Prisma ORM**: Type-safe database access

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Start in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start:prod
```

## Environment Variables

```env
DATABASE_URL="postgresql://iot_user:iot_password@localhost:5432/iot_platform"
MQTT_URL="mqtt://localhost:1883"
API_PORT=3001
NODE_ENV=development
```

## API Endpoints

See main README.md for full API documentation.

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key tables:

- `device_models` - Device meta-model definitions
- `devices` - Device instances
- `device_state_log` - State change history
- `device_event_log` - Event history
- `flows` - Orchestration flows
- `flow_runs` - Flow execution history

## MQTT Integration

The MQTT Gateway service:
- Subscribes to device presence, description, state, and events
- Publishes commands to devices
- Manages request/response correlation with timeouts
- Automatically reconnects on connection loss

## Orchestration

Flows are executed by the Orchestrator service:
- Triggered by device events
- Supports conditional logic via JSONLogic
- Executes actions on devices via MQTT
- Logs all execution steps and errors
