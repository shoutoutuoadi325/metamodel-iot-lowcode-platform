#!/bin/bash

echo "🚀 Setting up IoT Platform..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🐳 Starting Docker services..."
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "🗄️  Running database migrations..."
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate

echo "✅ Setup complete!"
echo ""
echo "To start the platform:"
echo "  1. Start API server:    cd apps/api && pnpm dev"
echo "  2. Start web frontend:  cd apps/web && pnpm dev"
echo "  3. Run simulated device: cd apps/sim-device && pnpm dev"
echo ""
echo "Access the platform at: http://localhost:3000"
