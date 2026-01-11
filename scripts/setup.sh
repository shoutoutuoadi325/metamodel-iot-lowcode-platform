#!/bin/bash

# IoT Platform Setup Script

set -e

echo "🚀 Setting up IoT Low-Code Platform..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start infrastructure (PostgreSQL + Mosquitto)
echo "🐳 Starting Docker containers (PostgreSQL + Mosquitto)..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run Prisma migrations
echo "🗄️  Running database migrations..."
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev --name init
cd ../..

# Build shared package
echo "🔨 Building shared package..."
cd packages/shared
pnpm build
cd ../..

# Build simulated device
echo "🔨 Building simulated device..."
cd apps/sim-device
pnpm build
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the platform:"
echo "1. Start API:     cd apps/api && pnpm dev"
echo "2. Start Web:     cd apps/web && pnpm dev"
echo "3. Start Device:  cd apps/sim-device && pnpm dev"
echo ""
echo "Or use: pnpm dev (runs all in parallel)"
echo ""
echo "📖 See README.md for more information."
