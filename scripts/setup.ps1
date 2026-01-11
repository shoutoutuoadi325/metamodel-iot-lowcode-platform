# IoT Platform Setup Script for Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up IoT Low-Code Platform..." -ForegroundColor Cyan

# Check if pnpm is installed
try {
    $null = Get-Command pnpm -ErrorAction Stop
} catch {
    Write-Host "❌ pnpm is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is installed
try {
    $null = Get-Command docker -ErrorAction Stop
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker first." -ForegroundColor Red
    exit 1
}

# Get project root directory
$projectRoot = Split-Path -Parent $PSScriptRoot

# Copy .env.example to .env if not exists
$envPath = Join-Path $projectRoot ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"
if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Green
        Copy-Item $envExamplePath $envPath
    } else {
        Write-Host "⚠️  .env.example not found, skipping .env creation" -ForegroundColor Yellow
    }
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
Set-Location $projectRoot
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Start infrastructure (PostgreSQL + Mosquitto)
Write-Host "🐳 Starting Docker containers (PostgreSQL + Mosquitto)..." -ForegroundColor Green
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker containers" -ForegroundColor Red
    exit 1
}

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Run Prisma migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Green
$apiPath = Join-Path $projectRoot "apps\api"
Set-Location $apiPath

# Copy .env to apps/api if not exists (Prisma needs it)
$apiEnvPath = Join-Path $apiPath ".env"
if (-not (Test-Path $apiEnvPath)) {
    if (Test-Path $envPath) {
        Write-Host "📝 Copying .env to apps/api for Prisma..." -ForegroundColor Green
        Copy-Item $envPath $apiEnvPath
    }
}

pnpm prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
pnpm prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration may have failed or already exists" -ForegroundColor Yellow
}

# Build shared package
Set-Location $projectRoot
Write-Host "🔨 Building shared package..." -ForegroundColor Green
$sharedPath = Join-Path $projectRoot "packages\shared"
Set-Location $sharedPath
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build shared package" -ForegroundColor Red
    exit 1
}

# Build simulated device
Set-Location $projectRoot
Write-Host "🔨 Building simulated device..." -ForegroundColor Green
$simDevicePath = Join-Path $projectRoot "apps\sim-device"
Set-Location $simDevicePath
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build simulated device" -ForegroundColor Red
    exit 1
}

# Return to project root
Set-Location $projectRoot

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the platform:" -ForegroundColor Cyan
Write-Host "1. Start API:     cd apps\api && pnpm dev" -ForegroundColor White
Write-Host "2. Start Web:     cd apps\web && pnpm dev" -ForegroundColor White
Write-Host "3. Start Device:  cd apps\sim-device && pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use: pnpm dev (runs all in parallel)" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 See README.md for more information." -ForegroundColor Cyan
