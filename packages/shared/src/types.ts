// Device Presence Message
export interface PresenceMessage {
  deviceId: string;
  online: boolean;
  ts: number;
  ip?: string;
  descTopic?: string;
}

// Device Description Message
export interface DeviceDescription {
  deviceId: string;
  modelId: string;
  name: string;
  capabilities: DeviceCapabilities;
  semantic: DeviceSemantic;
  control: DeviceControl;
}

export interface DeviceCapabilities {
  properties?: Record<string, PropertyCapability>;
  actions?: Record<string, ActionCapability>;
  events?: Record<string, EventCapability>;
}

export interface PropertyCapability {
  type: 'number' | 'string' | 'boolean' | 'object';
  readOnly?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  description?: string;
}

export interface ActionCapability {
  params?: Record<string, {
    type: string;
    required?: boolean;
    description?: string;
  }>;
  description?: string;
}

export interface EventCapability {
  payload?: Record<string, {
    type: string;
    description?: string;
  }>;
  description?: string;
}

export interface DeviceSemantic {
  type: string; // e.g., 'light', 'sensor', 'actuator'
  location?: string;
  tags?: string[];
}

export interface DeviceControl {
  protocol: 'mqtt';
  cmdTopicPrefix: string;
  stateTopicPrefix: string;
  respTopicPrefix: string;
}

// Command Message
export interface CommandMessage {
  requestId: string;
  actionName: string;
  params?: Record<string, any>;
  ts: number;
}

// Response Message
export interface ResponseMessage {
  requestId: string;
  ok: boolean;
  result?: any;
  error?: string;
  ts: number;
}

// State Message
export interface StateMessage {
  deviceId: string;
  propertyName: string;
  value: any;
  ts: number;
}

// Event Message
export interface EventMessage {
  deviceId: string;
  eventName: string;
  payload?: Record<string, any>;
  ts: number;
}
