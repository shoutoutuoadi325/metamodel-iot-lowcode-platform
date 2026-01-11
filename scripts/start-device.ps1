# Script to start a simulated device for Windows

param(
    [string]$DeviceId = "sim-light-001",
    [string]$ModelId = "model.sim.light.v1",
    [string]$DeviceName = "Simulated Smart Light",
    [string]$MqttUrl = "mqtt://localhost:1883"
)

Write-Host "Starting simulated device..." -ForegroundColor Cyan
Write-Host "Device ID: $DeviceId" -ForegroundColor White
Write-Host "Model ID: $ModelId" -ForegroundColor White
Write-Host "Name: $DeviceName" -ForegroundColor White
Write-Host "MQTT URL: $MqttUrl" -ForegroundColor White
Write-Host ""

# Get script directory and navigate to sim-device folder
$scriptPath = Split-Path -Parent $PSScriptRoot
$simDevicePath = Join-Path $scriptPath "apps\sim-device"

# Check if sim-device directory exists
if (-not (Test-Path $simDevicePath)) {
    Write-Host "❌ sim-device directory not found at: $simDevicePath" -ForegroundColor Red
    exit 1
}

Set-Location $simDevicePath

# Check if dist/index.js exists
$distPath = Join-Path $simDevicePath "dist\index.js"
if (-not (Test-Path $distPath)) {
    Write-Host "⚠️  Build not found. Building simulated device..." -ForegroundColor Yellow
    pnpm build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build simulated device" -ForegroundColor Red
        exit 1
    }
}

# Start the device
node dist\index.js `
  --deviceId $DeviceId `
  --modelId $ModelId `
  --name $DeviceName `
  --mqttUrl $MqttUrl
