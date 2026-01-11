#!/bin/bash

# Script to start a simulated device

DEVICE_ID=${1:-"sim-light-001"}
MODEL_ID=${2:-"model.sim.light.v1"}
DEVICE_NAME=${3:-"Simulated Smart Light"}
MQTT_URL=${4:-"mqtt://localhost:1883"}

echo "Starting simulated device..."
echo "Device ID: $DEVICE_ID"
echo "Model ID: $MODEL_ID"
echo "Name: $DEVICE_NAME"
echo "MQTT URL: $MQTT_URL"
echo ""

cd "$(dirname "$0")/../apps/sim-device"

node dist/index.js \
  --deviceId "$DEVICE_ID" \
  --modelId "$MODEL_ID" \
  --name "$DEVICE_NAME" \
  --mqttUrl "$MQTT_URL"
