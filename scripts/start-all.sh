#!/bin/bash

echo "🚀 Starting all services..."

# Start Docker services in background
echo "🐳 Starting Docker services..."
docker compose up -d

echo "⏳ Waiting for services..."
sleep 5

# Start API server in background
echo "🔧 Starting API server on port 3001..."
cd apps/api
pnpm dev &
API_PID=$!

# Go back to root
cd ../..

# Wait a bit for API to start
sleep 5

# Start web server in background
echo "🌐 Starting web frontend on port 3000..."
cd apps/web
pnpm dev &
WEB_PID=$!

# Go back to root
cd ../..

echo ""
echo "✅ All services started!"
echo ""
echo "Services:"
echo "  - Web Frontend: http://localhost:3000"
echo "  - API Server:   http://localhost:3001"
echo "  - PostgreSQL:   localhost:5432"
echo "  - MQTT Broker:  localhost:1883"
echo "  - Adminer:      http://localhost:8080"
echo ""
echo "To start a simulated device:"
echo "  cd apps/sim-device && pnpm dev"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
