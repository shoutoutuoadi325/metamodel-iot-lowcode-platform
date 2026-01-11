// MQTT Topic constants
export const MQTT_TOPICS = {
  PRESENCE: 'iot/v1/devices/{deviceId}/presence',
  DESC: 'iot/v1/devices/{deviceId}/desc',
  STATE: 'iot/v1/devices/{deviceId}/state/{propertyName}',
  EVENT: 'iot/v1/devices/{deviceId}/event/{eventName}',
  CMD: 'iot/v1/devices/{deviceId}/cmd/{actionName}',
  RESP: 'iot/v1/devices/{deviceId}/resp/{requestId}',
} as const;

// Helper functions for topic building
export const buildTopic = {
  presence: (deviceId: string) => `iot/v1/devices/${deviceId}/presence`,
  desc: (deviceId: string) => `iot/v1/devices/${deviceId}/desc`,
  state: (deviceId: string, propertyName: string) => 
    `iot/v1/devices/${deviceId}/state/${propertyName}`,
  event: (deviceId: string, eventName: string) => 
    `iot/v1/devices/${deviceId}/event/${eventName}`,
  cmd: (deviceId: string, actionName: string) => 
    `iot/v1/devices/${deviceId}/cmd/${actionName}`,
  resp: (deviceId: string, requestId: string) => 
    `iot/v1/devices/${deviceId}/resp/${requestId}`,
};

// Wildcard subscriptions
export const MQTT_SUBSCRIPTIONS = {
  ALL_PRESENCE: 'iot/v1/devices/+/presence',
  ALL_DESC: 'iot/v1/devices/+/desc',
  ALL_STATE: 'iot/v1/devices/+/state/#',
  ALL_EVENT: 'iot/v1/devices/+/event/#',
  DEVICE_CMD: (deviceId: string) => `iot/v1/devices/${deviceId}/cmd/#`,
  DEVICE_RESP: (deviceId: string) => `iot/v1/devices/${deviceId}/resp/#`,
};
