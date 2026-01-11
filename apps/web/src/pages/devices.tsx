import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Devices() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const { data: devices, error, mutate } = useSWR(`${apiBaseUrl}/api/devices`, fetcher, {
    refreshInterval: 3000,
  });

  if (error) {
    return (
      <Layout>
        <div className="text-red-600">Failed to load devices: {error.message}</div>
      </Layout>
    );
  }

  if (!devices) {
    return (
      <Layout>
        <div>Loading devices...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="mt-2 text-gray-600">
            Connected IoT devices ({devices.length} total)
          </p>
        </div>

        {devices.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              No devices found. Start a simulated device to see it appear here automatically.
            </p>
            <code className="mt-2 block bg-yellow-100 p-2 rounded text-sm">
              cd apps/sim-device && pnpm dev
            </code>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device: any) => (
              <div
                key={device.deviceId}
                className="bg-white border rounded-lg shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {device.name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      device.online
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {device.online ? '🟢 Online' : '⚫ Offline'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Device ID:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {device.deviceId}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-500">Model:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {device.modelId}
                    </code>
                  </div>
                  {device.lastSeen && (
                    <div>
                      <span className="text-gray-500">Last seen:</span>{' '}
                      {new Date(device.lastSeen).toLocaleString()}
                    </div>
                  )}
                </div>

                {device.descJson && device.descJson.capabilities && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Capabilities
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {device.descJson.capabilities.properties && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {Object.keys(device.descJson.capabilities.properties).length} properties
                        </span>
                      )}
                      {device.descJson.capabilities.actions && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {Object.keys(device.descJson.capabilities.actions).length} actions
                        </span>
                      )}
                      {device.descJson.capabilities.events && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {Object.keys(device.descJson.capabilities.events).length} events
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
