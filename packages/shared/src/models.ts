// Device Model Schema
export interface DeviceModel {
  id: string;
  version: string;
  name: string;
  description?: string;
  capabilities: {
    properties?: Record<string, PropertySchema>;
    actions?: Record<string, ActionSchema>;
    events?: Record<string, EventSchema>;
  };
  metadata?: Record<string, any>;
}

export interface PropertySchema {
  type: 'number' | 'string' | 'boolean' | 'object';
  readOnly?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  description?: string;
  default?: any;
}

export interface ActionSchema {
  description?: string;
  params?: Record<string, ParamSchema>;
  returns?: {
    type: string;
    description?: string;
  };
}

export interface ParamSchema {
  type: string;
  required?: boolean;
  description?: string;
  min?: number;
  max?: number;
  enum?: any[];
}

export interface EventSchema {
  description?: string;
  payload?: Record<string, {
    type: string;
    description?: string;
  }>;
}

// Example Device Model: Simulated Light
export const SimLightModelV1: DeviceModel = {
  id: 'model.sim.light.v1',
  version: '1.0.0',
  name: 'Simulated Light',
  description: 'A simulated smart light with on/off and brightness control',
  capabilities: {
    properties: {
      on: {
        type: 'boolean',
        description: 'Light on/off state',
        default: false,
      },
      brightness: {
        type: 'number',
        min: 0,
        max: 100,
        unit: '%',
        description: 'Light brightness percentage',
        default: 50,
      },
    },
    actions: {
      turnOn: {
        description: 'Turn the light on',
      },
      turnOff: {
        description: 'Turn the light off',
      },
      setBrightness: {
        description: 'Set light brightness',
        params: {
          brightness: {
            type: 'number',
            required: true,
            min: 0,
            max: 100,
            description: 'Brightness value (0-100)',
          },
        },
      },
    },
    events: {
      stateChanged: {
        description: 'Emitted when light state changes',
        payload: {
          on: { type: 'boolean', description: 'New on/off state' },
          brightness: { type: 'number', description: 'New brightness value' },
        },
      },
    },
  },
};
