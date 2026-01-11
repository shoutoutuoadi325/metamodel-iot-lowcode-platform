import Layout from '@/components/Layout';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Flows() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const { data: flows, error } = useSWR(`${apiBaseUrl}/api/flows`, fetcher);

  if (error) {
    return (
      <Layout>
        <div className="text-red-600">Failed to load flows: {error.message}</div>
      </Layout>
    );
  }

  if (!flows) {
    return (
      <Layout>
        <div>Loading flows...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flow Builder</h1>
          <p className="mt-2 text-gray-600">
            Low-code automation flows
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">🚧 Flow Builder</h3>
          <p className="text-sm text-blue-800">
            The visual flow builder with React Flow will be implemented here. 
            For now, you can manage flows via the API.
          </p>
        </div>

        {flows.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center">
            <p className="text-gray-600">No flows created yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flows.map((flow: any) => (
              <div key={flow.id} className="bg-white border rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{flow.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Created: {new Date(flow.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded font-semibold text-sm ${
                      flow.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {flow.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
