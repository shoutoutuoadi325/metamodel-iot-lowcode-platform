/**
 * MQTT Topic Structure for IoT Platform v1
 * 
 * Topic hierarchy:
 * - iot/v1/devices/{deviceId}/presence (retained)
 * - iot/v1/devices/{deviceId}/desc (retained)
 * - iot/v1/devices/{deviceId}/state/{propertyName}
 * - iot/v1/devices/{deviceId}/event/{eventName}
 * - iot/v1/devices/{deviceId}/cmd/{actionName}
 * - iot/v1/devices/{deviceId}/resp/{requestId}
 */

export const MQTT_TOPICS = {
  VERSION: 'v1',
  BASE: 'iot/v1/devices',
  
  // Topic builders
  presence: (deviceId: string) => `iot/v1/devices/${deviceId}/presence`,
  desc: (deviceId: string) => `iot/v1/devices/${deviceId}/desc`,
  state: (deviceId: string, propertyName: string) => `iot/v1/devices/${deviceId}/state/${propertyName}`,
  event: (deviceId: string, eventName: string) => `iot/v1/devices/${deviceId}/event/${eventName}`,
  cmd: (deviceId: string, actionName: string) => `iot/v1/devices/${deviceId}/cmd/${actionName}`,
  resp: (deviceId: string, requestId: string) => `iot/v1/devices/${deviceId}/resp/${requestId}`,
  
  // Wildcard subscriptions
  allPresence: () => 'iot/v1/devices/+/presence',
  allDesc: () => 'iot/v1/devices/+/desc',
  allState: (deviceId?: string) => deviceId 
    ? `iot/v1/devices/${deviceId}/state/#` 
    : 'iot/v1/devices/+/state/#',
  allEvent: (deviceId?: string) => deviceId 
    ? `iot/v1/devices/${deviceId}/event/#` 
    : 'iot/v1/devices/+/event/#',
  allCmd: (deviceId: string) => `iot/v1/devices/${deviceId}/cmd/#`,
  allResp: (deviceId?: string) => deviceId 
    ? `iot/v1/devices/${deviceId}/resp/#` 
    : 'iot/v1/devices/+/resp/#',
} as const;

/**
 * Parse topic to extract components
 */
export function parseTopic(topic: string): {
  type: 'presence' | 'desc' | 'state' | 'event' | 'cmd' | 'resp' | null;
  deviceId: string | null;
  subPath: string | null;
} {
  const parts = topic.split('/');
  
  if (parts.length < 4 || parts[0] !== 'iot' || parts[1] !== 'v1' || parts[2] !== 'devices') {
    return { type: null, deviceId: null, subPath: null };
  }
  
  const deviceId = parts[3];
  const type = parts[4] as any;
  const subPath = parts.slice(5).join('/') || null;
  
  return { type, deviceId, subPath };
}
