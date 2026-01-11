import Layout from '@/components/Layout';
import Link from 'next/link';

export default function Home() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            IoT Low-Code Platform
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Meta-modeling based IoT device management and orchestration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/devices" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                📱 Devices
              </h2>
              <p className="text-gray-600">
                View and control connected IoT devices in real-time
              </p>
            </div>
          </Link>

          <Link href="/device-models" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                📐 Device Models
              </h2>
              <p className="text-gray-600">
                Define device meta-models with DSL schema
              </p>
            </div>
          </Link>

          <Link href="/flows" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                🔄 Flow Builder
              </h2>
              <p className="text-gray-600">
                Create low-code automation flows with visual editor
              </p>
            </div>
          </Link>

          <Link href="/api-docs" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-2 border-blue-500">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                📚 API Documentation
              </h2>
              <p className="text-gray-600">
                Interactive API documentation and testing interface
              </p>
            </div>
          </Link>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            🚀 Quick Start
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Start Docker services: <code className="bg-white px-2 py-1 rounded">docker compose up -d</code></li>
            <li>Run migrations: <code className="bg-white px-2 py-1 rounded">cd apps/api && pnpm prisma:migrate</code></li>
            <li>Start API server: <code className="bg-white px-2 py-1 rounded">cd apps/api && pnpm dev</code></li>
            <li>Start web frontend: <code className="bg-white px-2 py-1 rounded">cd apps/web && pnpm dev</code></li>
            <li>Run simulated device: <code className="bg-white px-2 py-1 rounded">cd apps/sim-device && pnpm dev</code></li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}
