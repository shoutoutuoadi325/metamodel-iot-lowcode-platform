# IoT Platform Web Frontend

Next.js-based web frontend for the IoT Low-Code Platform.

## Features

- **Device List**: View all discovered devices with real-time status updates
- **Device Details**: Control devices and view state/event history
- **Device Models**: Manage device meta-model definitions
- **Flows**: View and manage orchestration flows
- **Real-Time Updates**: WebSocket integration for live data

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Pages

- `/` - Device list page
- `/devices/[id]` - Device detail and control page
- `/device-models` - Device model management
- `/flows` - Flow management

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Socket.IO Client (WebSocket)
- Axios (HTTP client)

## Real-Time Updates

The application uses WebSocket to receive real-time updates for:
- Device presence changes (online/offline)
- Device state updates
- Device events
- Flow execution status
