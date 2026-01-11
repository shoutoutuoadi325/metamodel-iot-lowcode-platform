import { useState } from 'react';
import Layout from '@/components/Layout';

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params?: { name: string; type: string; description: string; required?: boolean }[];
  body?: { example: any; schema?: string };
  response?: { example: any };
}

const API_ENDPOINTS: APIEndpoint[] = [
  // Devices
  {
    method: 'GET',
    path: '/api/devices',
    description: 'List all devices',
    response: {
      example: [
        {
          deviceId: 'sim-light-001',
          name: 'Living Room Light',
          modelId: 'model.sim.light.v1',
          online: true,
          lastSeen: '2024-01-11T08:00:00Z',
          descJson: { /* device description */ },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api/devices/:id',
    description: 'Get a specific device by ID',
    params: [
      { name: 'id', type: 'string', description: 'Device ID', required: true },
    ],
    response: {
      example: {
        deviceId: 'sim-light-001',
        name: 'Living Room Light',
        modelId: 'model.sim.light.v1',
        online: true,
        descJson: {
          deviceId: 'sim-light-001',
          capabilities: {
            properties: { on: { type: 'boolean' }, brightness: { type: 'number' } },
            actions: { turnOn: {}, turnOff: {}, setBrightness: {} },
          },
        },
      },
    },
  },
  {
    method: 'POST',
    path: '/api/devices/:id/actions/:actionName',
    description: 'Execute an action on a device',
    params: [
      { name: 'id', type: 'string', description: 'Device ID', required: true },
      { name: 'actionName', type: 'string', description: 'Action name (e.g., turnOn, setBrightness)', required: true },
    ],
    body: {
      example: { brightness: 75 },
      schema: '{ [paramName: string]: any }',
    },
    response: {
      example: {
        requestId: 'uuid',
        ok: true,
        result: { success: true },
        ts: 1704960000000,
      },
    },
  },
  
  // Device Models
  {
    method: 'GET',
    path: '/api/device-models',
    description: 'List all device models',
    response: {
      example: [
        {
          id: 'uuid',
          modelId: 'model.sim.light.v1',
          version: '1.0.0',
          name: 'Simulated Light',
          schemaJson: { /* model schema */ },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api/device-models/:id',
    description: 'Get a specific device model',
    params: [
      { name: 'id', type: 'string', description: 'Model UUID', required: true },
    ],
  },
  {
    method: 'POST',
    path: '/api/device-models',
    description: 'Create a new device model',
    body: {
      example: {
        id: 'model.sim.sensor.v1',
        version: '1.0.0',
        name: 'Simulated Sensor',
        capabilities: {
          properties: {
            temperature: { type: 'number', unit: '°C' },
          },
        },
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/device-models/:id',
    description: 'Update a device model',
    params: [
      { name: 'id', type: 'string', description: 'Model UUID', required: true },
    ],
    body: {
      example: {
        id: 'model.sim.sensor.v1',
        version: '1.0.1',
        name: 'Updated Sensor',
        capabilities: { /* ... */ },
      },
    },
  },
  
  // Flows
  {
    method: 'GET',
    path: '/api/flows',
    description: 'List all automation flows',
    response: {
      example: [
        {
          id: 'uuid',
          name: 'Auto Light Control',
          enabled: true,
          graphJson: { nodes: [], edges: [] },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api/flows/:id',
    description: 'Get a specific flow',
    params: [
      { name: 'id', type: 'string', description: 'Flow UUID', required: true },
    ],
  },
  {
    method: 'POST',
    path: '/api/flows',
    description: 'Create a new flow',
    body: {
      example: {
        name: 'My Flow',
        graphJson: {
          nodes: [
            { id: '1', type: 'trigger', data: { type: 'device_event', deviceId: 'sim-light-001', eventName: 'stateChanged' } },
            { id: '2', type: 'action', data: { type: 'device_action', deviceId: 'sim-light-002', actionName: 'turnOn' } },
          ],
          edges: [{ id: 'e1-2', source: '1', target: '2' }],
        },
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/flows/:id',
    description: 'Update a flow',
    params: [
      { name: 'id', type: 'string', description: 'Flow UUID', required: true },
    ],
  },
  {
    method: 'POST',
    path: '/api/flows/:id/enable',
    description: 'Enable a flow',
    params: [
      { name: 'id', type: 'string', description: 'Flow UUID', required: true },
    ],
  },
  {
    method: 'POST',
    path: '/api/flows/:id/disable',
    description: 'Disable a flow',
    params: [
      { name: 'id', type: 'string', description: 'Flow UUID', required: true },
    ],
  },
  {
    method: 'GET',
    path: '/api/flows/:id/runs',
    description: 'Get execution history of a flow',
    params: [
      { name: 'id', type: 'string', description: 'Flow UUID', required: true },
    ],
  },
];

export default function ApiDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [testBody, setTestBody] = useState('');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  const testEndpoint = async (endpoint: APIEndpoint) => {
    setTestLoading(true);
    setTestResponse(null);

    try {
      const url = `${apiBaseUrl}${endpoint.path.replace(/:id/g, 'test-id').replace(/:actionName/g, 'turnOn')}`;
      
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (endpoint.method !== 'GET' && testBody) {
        options.body = testBody;
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        data,
      });
    } catch (error: any) {
      setTestResponse({
        error: error.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-2 text-gray-600">
            Interactive REST API reference and testing interface
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Base URL: <code className="bg-gray-100 px-2 py-1 rounded">{apiBaseUrl}</code>
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">💡 About this API</h3>
          <p className="text-sm text-yellow-800">
            This platform provides REST APIs for managing IoT devices, device models, and automation flows. 
            The backend runs on port 3001 while this web interface runs on port 3000. 
            All APIs support JSON payloads and return JSON responses.
          </p>
        </div>

        <div className="space-y-4">
          {API_ENDPOINTS.map((endpoint, index) => (
            <div key={index} className="api-endpoint">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedEndpoint(selectedEndpoint === endpoint ? null : endpoint)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`api-method ${endpoint.method.toLowerCase()}`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                  </div>
                  <span className="text-gray-400">
                    {selectedEndpoint === endpoint ? '▼' : '▶'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{endpoint.description}</p>
              </div>

              {selectedEndpoint === endpoint && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  {endpoint.params && endpoint.params.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Parameters</h4>
                      <div className="space-y-2">
                        {endpoint.params.map((param, i) => (
                          <div key={i} className="flex items-start space-x-2 text-sm">
                            <code className="bg-white px-2 py-1 rounded">{param.name}</code>
                            <span className="text-gray-500">{param.type}</span>
                            {param.required && (
                              <span className="text-red-600 text-xs">required</span>
                            )}
                            <span className="text-gray-600">- {param.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {endpoint.body && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Request Body</h4>
                      <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                        {JSON.stringify(endpoint.body.example, null, 2)}
                      </pre>
                    </div>
                  )}

                  {endpoint.response && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Response Example</h4>
                      <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                        {JSON.stringify(endpoint.response.example, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Test this API</h4>
                    {endpoint.method !== 'GET' && (
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Request Body (JSON)
                        </label>
                        <textarea
                          className="w-full p-2 border rounded font-mono text-sm"
                          rows={6}
                          value={testBody}
                          onChange={(e) => setTestBody(e.target.value)}
                          placeholder={JSON.stringify(endpoint.body?.example || {}, null, 2)}
                        />
                      </div>
                    )}
                    <button
                      onClick={() => testEndpoint(endpoint)}
                      disabled={testLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {testLoading ? 'Testing...' : 'Send Request'}
                    </button>

                    {testResponse && (
                      <div className="mt-4">
                        <h5 className="font-semibold text-gray-900 mb-2">Response</h5>
                        <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                          {JSON.stringify(testResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">MQTT Topics</h2>
          <p className="text-sm text-gray-600 mb-4">
            The platform uses MQTT for real-time device communication:
          </p>
          <div className="space-y-2 text-sm font-mono">
            <div><span className="text-purple-600">Presence:</span> iot/v1/devices/{'{deviceId}'}/presence</div>
            <div><span className="text-purple-600">Description:</span> iot/v1/devices/{'{deviceId}'}/desc</div>
            <div><span className="text-purple-600">State:</span> iot/v1/devices/{'{deviceId}'}/state/{'{propertyName}'}</div>
            <div><span className="text-purple-600">Event:</span> iot/v1/devices/{'{deviceId}'}/event/{'{eventName}'}</div>
            <div><span className="text-purple-600">Command:</span> iot/v1/devices/{'{deviceId}'}/cmd/{'{actionName}'}</div>
            <div><span className="text-purple-600">Response:</span> iot/v1/devices/{'{deviceId}'}/resp/{'{requestId}'}</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
