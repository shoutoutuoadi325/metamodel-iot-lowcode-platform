/**
 * Core type definitions for IoT Platform
 */

// ============= Device Presence =============

export interface DevicePresence {
  deviceId: string;
  online: boolean;
  ts: number;
  ip?: string;
  descTopic?: string;
}

// ============= Device Description =============

export interface DeviceCapability {
  type: 'property' | 'action' | 'event';
  name: string;
  valueType?: string;
  writable?: boolean;
  readable?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  enum?: string[];
  description?: string;
}

export interface DeviceSemantic {
  type?: string;  // e.g., 'light', 'sensor', 'actuator'
  location?: string;
  tags?: string[];
}

export interface DeviceControl {
  protocol: string;  // 'mqtt'
  cmdTopicPrefix: string;
  stateTopicPrefix: string;
  respTopicPrefix: string;
  eventTopicPrefix?: string;
}

export interface DeviceDescription {
  deviceId: string;
  modelId: string;
  name: string;
  capabilities: DeviceCapability[];
  semantic: DeviceSemantic;
  control: DeviceControl;
}

// ============= Device Commands & Responses =============

export interface DeviceCommand {
  requestId: string;
  actionName: string;
  params: Record<string, any>;
  ts: number;
}

export interface DeviceResponse {
  requestId: string;
  ok: boolean;
  result?: any;
  error?: string;
  ts: number;
}

// ============= Device State & Events =============

export interface DeviceState {
  deviceId: string;
  key: string;
  value: any;
  ts: number;
}

export interface DeviceEvent {
  deviceId: string;
  eventName: string;
  payload: Record<string, any>;
  ts: number;
}

// ============= Device Model (Meta-Model) =============

export interface PropertySchema {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'object';
  writable: boolean;
  readable: boolean;
  unit?: string;
  min?: number;
  max?: number;
  enum?: string[];
  description?: string;
}

export interface ActionSchema {
  name: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: 'number' | 'string' | 'boolean' | 'object';
    required?: boolean;
    min?: number;
    max?: number;
    enum?: string[];
    description?: string;
  }>;
}

export interface EventSchema {
  name: string;
  description?: string;
  payloadSchema?: Record<string, any>;
}

export interface DeviceModelSchema {
  $schema?: string;
  modelId: string;
  version: string;
  name: string;
  description?: string;
  semantic?: {
    type?: string;
    category?: string;
    tags?: string[];
  };
  properties: PropertySchema[];
  actions: ActionSchema[];
  events: EventSchema[];
}

// ============= Flow / Orchestration =============

export interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: Record<string, any>;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Flow {
  id: string;
  name: string;
  enabled: boolean;
  graph: FlowGraph;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowRun {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed';
  logs: Array<{
    timestamp: number;
    nodeId: string;
    message: string;
    level: 'info' | 'warn' | 'error';
    data?: any;
  }>;
  startedAt: Date;
  endedAt?: Date;
}

// ============= API DTOs =============

export interface CreateDeviceModelDto {
  modelId: string;
  version: string;
  name: string;
  schema: DeviceModelSchema;
}

export interface UpdateDeviceModelDto {
  name?: string;
  schema?: DeviceModelSchema;
}

export interface CreateFlowDto {
  name: string;
  graph: FlowGraph;
}

export interface UpdateFlowDto {
  name?: string;
  graph?: FlowGraph;
  enabled?: boolean;
}

export interface ExecuteActionDto {
  params: Record<string, any>;
}

// ============= WebSocket Messages =============

export type WsMessageType = 
  | 'device:presence'
  | 'device:state'
  | 'device:event'
  | 'flow:started'
  | 'flow:completed'
  | 'flow:failed';

export interface WsMessage<T = any> {
  type: WsMessageType;
  deviceId?: string;
  flowId?: string;
  data: T;
  timestamp: number;
}
