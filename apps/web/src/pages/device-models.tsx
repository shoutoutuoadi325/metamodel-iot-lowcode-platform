import Layout from '@/components/Layout';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DeviceModels() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const { data: models, error } = useSWR(`${apiBaseUrl}/api/device-models`, fetcher);

  if (error) {
    return (
      <Layout>
        <div className="text-red-600">Failed to load device models: {error.message}</div>
      </Layout>
    );
  }

  if (!models) {
    return (
      <Layout>
        <div>Loading device models...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Device Models</h1>
          <p className="mt-2 text-gray-600">
            Meta-model definitions for device types
          </p>
        </div>

        <div className="space-y-4">
          {models.map((model: any) => (
            <div key={model.id} className="bg-white border rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {model.modelId}
                    </code>
                    <span className="text-xs text-gray-500">v{model.version}</span>
                  </div>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                  View Schema
                </summary>
                <pre className="mt-2 bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(model.schemaJson, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
