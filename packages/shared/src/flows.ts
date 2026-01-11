// Flow Definition
export interface FlowDefinition {
  id: string;
  name: string;
  enabled: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  data: TriggerNodeData | ConditionNodeData | ActionNodeData;
  position?: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// Node Data Types
export interface TriggerNodeData {
  type: 'device_event';
  deviceId: string;
  eventName: string;
}

export interface ConditionNodeData {
  type: 'if';
  condition: any; // JSONLogic format
}

export interface ActionNodeData {
  type: 'device_action';
  deviceId: string;
  actionName: string;
  params?: Record<string, any>;
}

// Flow Execution
export interface FlowRun {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed';
  logs: FlowLogEntry[];
  startedAt: number;
  endedAt?: number;
}

export interface FlowLogEntry {
  step: string;
  nodeId: string;
  timestamp: number;
  status: 'success' | 'error';
  message?: string;
  data?: any;
}
