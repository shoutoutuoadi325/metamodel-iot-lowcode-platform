'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import * as api from '@/lib/api';

interface FlowRun {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed';
  logsJson: Array<{
    timestamp: number;
    nodeId: string;
    message: string;
    level: 'info' | 'warn' | 'error';
    data?: any;
  }>;
  startedAt: string;
  endedAt?: string;
}

interface Flow {
  id: string;
  name: string;
  enabled: boolean;
  graphJson: any;
  updatedAt: string;
}

export default function FlowDetailPage() {
  const params = useParams();
  const flowId = params.id as string;
  
  const [flow, setFlow] = useState<Flow | null>(null);
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<FlowRun | null>(null);

  useEffect(() => {
    if (flowId) {
      fetchFlowDetails();
    }
  }, [flowId]);

  const fetchFlowDetails = async () => {
    try {
      const [flowRes, runsRes] = await Promise.all([
        api.getFlow(flowId),
        api.getFlowRuns(flowId),
      ]);
      setFlow(flowRes.data);
      setRuns(runsRes.data);
    } catch (error) {
      console.error('Failed to fetch flow details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Running...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return <div className="text-center py-12">Loading flow details...</div>;
  }

  if (!flow) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Flow not found</p>
        <Link href="/flows" className="text-indigo-600 hover:text-indigo-900 mt-4 inline-block">
          ← Back to Flows
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/flows" className="text-indigo-600 hover:text-indigo-900 text-sm">
          ← Back to Flows
        </Link>
      </div>

      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{flow.name}</h1>
          <div className="mt-2 flex items-center space-x-4">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                flow.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {flow.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className="text-sm text-gray-500">
              {flow.graphJson?.nodes?.length || 0} nodes
            </span>
            <span className="text-sm text-gray-500">
              Last updated: {new Date(flow.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={fetchFlowDetails}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Flow Diagram Preview */}
      <div className="bg-white shadow rounded-lg mb-8 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Flow Structure</h2>
        <div className="bg-gray-50 rounded-lg p-4 border">
          {flow.graphJson?.nodes?.length > 0 ? (
            <div className="flex items-center justify-center flex-wrap gap-4">
              {flow.graphJson.nodes.map((node: any, idx: number) => (
                <div key={node.id} className="flex items-center">
                  <div className={`p-3 rounded-lg border-2 min-w-[140px] ${
                    node.type === 'trigger' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    node.type === 'condition' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    'bg-green-100 text-green-800 border-green-300'
                  }`}>
                    <div className="flex items-center justify-center mb-1">
                      <span className="mr-1">
                        {node.type === 'trigger' ? '⚡' : node.type === 'condition' ? '❓' : '▶️'}
                      </span>
                      <span className="font-semibold text-sm capitalize">{node.type}</span>
                    </div>
                    {node.type === 'trigger' && (
                      <div className="text-xs text-center">
                        <div className="font-medium truncate">{node.data?.deviceId}</div>
                        <div>on: {node.data?.eventName}</div>
                      </div>
                    )}
                    {node.type === 'action' && (
                      <div className="text-xs text-center">
                        <div className="font-medium truncate">{node.data?.deviceId}</div>
                        <div>do: {node.data?.actionName}</div>
                      </div>
                    )}
                  </div>
                  {idx < flow.graphJson.nodes.length - 1 && (
                    <svg className="w-8 h-8 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">No nodes in this flow</p>
          )}
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Execution History</h2>
          <p className="text-sm text-gray-500 mt-1">
            Recent flow runs and their status
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2">No execution history yet</p>
            <p className="text-sm mt-1">Flow runs will appear here when triggers are activated</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {runs.map((run) => (
              <div key={run.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(run.status)}`}>
                      {run.status}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Run {run.id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        Started: {new Date(run.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      Duration: {formatDuration(run.startedAt, run.endedAt)}
                    </span>
                    <button
                      onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      {selectedRun?.id === run.id ? 'Hide Logs' : 'View Logs'}
                    </button>
                  </div>
                </div>

                {/* Expanded Logs */}
                {selectedRun?.id === run.id && (
                  <div className="mt-4 bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {run.logsJson && run.logsJson.length > 0 ? (
                        run.logsJson.map((log, idx) => (
                          <div key={idx} className="flex items-start space-x-3 text-sm font-mono">
                            <span className="text-gray-500 flex-shrink-0">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${getLogLevelColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-gray-400 flex-shrink-0">
                              [{log.nodeId}]
                            </span>
                            <span className="text-gray-100">
                              {log.message}
                            </span>
                            {log.data && (
                              <pre className="text-gray-400 text-xs mt-1 overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No logs available</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
