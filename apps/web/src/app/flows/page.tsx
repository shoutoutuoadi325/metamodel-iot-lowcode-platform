'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api';

interface Flow {
  id: string;
  name: string;
  enabled: boolean;
  graphJson: any;
  updatedAt: string;
}

interface Device {
  deviceId: string;
  name: string;
  modelId: string;
  descJson: any;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const defaultGraph = {
  nodes: [],
  edges: [],
};

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    graph: JSON.stringify(defaultGraph, null, 2),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Simple flow builder state
  const [triggerDevice, setTriggerDevice] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [actionDevice, setActionDevice] = useState('');
  const [actionName, setActionName] = useState('');
  const [actionParams, setActionParams] = useState('{}');
  const [useSimpleBuilder, setUseSimpleBuilder] = useState(true);

  useEffect(() => {
    fetchFlows();
    fetchDevices();
  }, []);

  const fetchFlows = async () => {
    try {
      const res = await api.getFlows();
      setFlows(res.data);
    } catch (error) {
      console.error('Failed to fetch flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.getDevices();
      setDevices(res.data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const toggleFlow = async (flowId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await api.disableFlow(flowId);
      } else {
        await api.enableFlow(flowId);
      }
      fetchFlows();
    } catch (error: any) {
      alert(`Failed to toggle flow: ${error.response?.data?.message || error.message}`);
    }
  };

  const buildGraphFromSimpleForm = () => {
    const nodes: any[] = [];
    const edges: any[] = [];

    if (triggerDevice && triggerEvent) {
      nodes.push({
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          deviceId: triggerDevice,
          eventName: triggerEvent,
        },
      });
    }

    if (actionDevice && actionName) {
      nodes.push({
        id: 'action-1',
        type: 'action',
        position: { x: 300, y: 0 },
        data: {
          deviceId: actionDevice,
          actionName: actionName,
          params: JSON.parse(actionParams || '{}'),
        },
      });

      if (nodes.length === 2) {
        edges.push({
          id: 'e1',
          source: 'trigger-1',
          target: 'action-1',
        });
      }
    }

    return { nodes, edges };
  };

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      let graph;
      if (useSimpleBuilder) {
        graph = buildGraphFromSimpleForm();
      } else {
        graph = JSON.parse(formData.graph);
      }
      
      await api.createFlow({
        name: formData.name,
        graph,
      });
      setShowCreateModal(false);
      resetForm();
      fetchFlows();
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to create flow');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFlow) return;
    setError('');
    setSaving(true);
    try {
      let graph;
      if (useSimpleBuilder) {
        graph = buildGraphFromSimpleForm();
      } else {
        graph = JSON.parse(formData.graph);
      }
      
      await api.updateFlow(selectedFlow.id, {
        name: formData.name,
        graph,
      });
      setShowEditModal(false);
      setSelectedFlow(null);
      resetForm();
      fetchFlows();
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to update flow');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      graph: JSON.stringify(defaultGraph, null, 2),
    });
    setTriggerDevice('');
    setTriggerEvent('');
    setActionDevice('');
    setActionName('');
    setActionParams('{}');
    setError('');
    setUseSimpleBuilder(true);
  };

  const openViewModal = (flow: Flow) => {
    setSelectedFlow(flow);
    setShowViewModal(true);
  };

  const openEditModal = (flow: Flow) => {
    setSelectedFlow(flow);
    setFormData({
      name: flow.name,
      graph: JSON.stringify(flow.graphJson, null, 2),
    });
    // Try to parse simple form from existing graph
    const triggerNode = flow.graphJson?.nodes?.find((n: any) => n.type === 'trigger');
    const actionNode = flow.graphJson?.nodes?.find((n: any) => n.type === 'action');
    if (triggerNode) {
      setTriggerDevice(triggerNode.data?.deviceId || '');
      setTriggerEvent(triggerNode.data?.eventName || '');
    }
    if (actionNode) {
      setActionDevice(actionNode.data?.deviceId || '');
      setActionName(actionNode.data?.actionName || '');
      setActionParams(JSON.stringify(actionNode.data?.params || {}, null, 2));
    }
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const getDeviceActions = (deviceId: string): string[] => {
    const device = devices.find(d => d.deviceId === deviceId);
    if (!device || !device.descJson?.capabilities) return [];
    return device.descJson.capabilities
      .filter((c: any) => c.type === 'action')
      .map((c: any) => c.name);
  };

  const getDeviceEvents = (deviceId: string): string[] => {
    const device = devices.find(d => d.deviceId === deviceId);
    if (!device || !device.descJson?.capabilities) return [];
    return device.descJson.capabilities
      .filter((c: any) => c.type === 'event')
      .map((c: any) => c.name);
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'trigger':
        return '⚡';
      case 'condition':
        return '❓';
      case 'action':
        return '▶️';
      default:
        return '•';
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'condition':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'action':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading flows...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Flows</h1>
          <p className="mt-2 text-sm text-gray-700">
            Low-code orchestration flows for device automation.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            + Create Flow
          </button>
        </div>
      </div>
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Nodes
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Last Updated
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {flows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No flows found. Click "Create Flow" to add one.
                      </td>
                    </tr>
                  ) : (
                    flows.map((flow) => (
                      <tr key={flow.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {flow.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              flow.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {flow.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                            {flow.graphJson?.nodes?.length || 0} nodes
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(flow.updatedAt).toLocaleString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                          <button
                            onClick={() => openViewModal(flow)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditModal(flow)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleFlow(flow.id, flow.enabled)}
                            className={flow.enabled ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                          >
                            {flow.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <Link
                            href={`/flows/${flow.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            History
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Flow">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Flow Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Auto Shutoff on Overheat"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setUseSimpleBuilder(true)}
              className={`px-3 py-1.5 text-sm rounded-md ${useSimpleBuilder ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Simple Builder
            </button>
            <button
              onClick={() => setUseSimpleBuilder(false)}
              className={`px-3 py-1.5 text-sm rounded-md ${!useSimpleBuilder ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
            >
              JSON Editor
            </button>
          </div>

          {useSimpleBuilder ? (
            <div className="space-y-6">
              {/* Trigger Section */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-800 mb-3">⚡ Trigger (When event occurs)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device</label>
                    <select
                      value={triggerDevice}
                      onChange={(e) => { setTriggerDevice(e.target.value); setTriggerEvent(''); }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
                    >
                      <option value="">Select device...</option>
                      {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.name} ({d.deviceId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event</label>
                    <select
                      value={triggerEvent}
                      onChange={(e) => setTriggerEvent(e.target.value)}
                      disabled={!triggerDevice}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="">Select event...</option>
                      {getDeviceEvents(triggerDevice).map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-green-800 mb-3">▶️ Action (Then do this)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device</label>
                    <select
                      value={actionDevice}
                      onChange={(e) => { setActionDevice(e.target.value); setActionName(''); }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
                    >
                      <option value="">Select device...</option>
                      {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.name} ({d.deviceId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <select
                      value={actionName}
                      onChange={(e) => setActionName(e.target.value)}
                      disabled={!actionDevice}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="">Select action...</option>
                      {getDeviceActions(actionDevice).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Parameters (JSON)</label>
                  <textarea
                    value={actionParams}
                    onChange={(e) => setActionParams(e.target.value)}
                    rows={3}
                    placeholder='{"brightness": 100}'
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm border px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">Flow Graph (JSON)</label>
              <textarea
                value={formData.graph}
                onChange={(e) => setFormData({ ...formData, graph: e.target.value })}
                rows={15}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm border px-3 py-2"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !formData.name}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={`Flow: ${selectedFlow?.name || ''}`}>
        {selectedFlow && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Name</span>
                <p className="mt-1 text-sm text-gray-900">{selectedFlow.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                <p className="mt-1">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${selectedFlow.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {selectedFlow.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Last Updated</span>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedFlow.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Visual Flow Diagram */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Flow Diagram</h4>
              <div className="bg-gray-50 rounded-lg p-4 border">
                {selectedFlow.graphJson?.nodes?.length > 0 ? (
                  <div className="flex items-center justify-center flex-wrap gap-4">
                    {selectedFlow.graphJson.nodes.map((node: any, idx: number) => (
                      <div key={node.id} className="flex items-center">
                        <div className={`p-3 rounded-lg border-2 ${getNodeTypeColor(node.type)} min-w-[150px]`}>
                          <div className="flex items-center justify-center mb-1">
                            <span className="mr-1">{getNodeTypeIcon(node.type)}</span>
                            <span className="font-semibold text-sm capitalize">{node.type}</span>
                          </div>
                          {node.type === 'trigger' && (
                            <div className="text-xs text-center">
                              <div className="font-medium">{node.data?.deviceId}</div>
                              <div>on: {node.data?.eventName}</div>
                            </div>
                          )}
                          {node.type === 'condition' && (
                            <div className="text-xs text-center">
                              <div>Condition</div>
                            </div>
                          )}
                          {node.type === 'action' && (
                            <div className="text-xs text-center">
                              <div className="font-medium">{node.data?.deviceId}</div>
                              <div>do: {node.data?.actionName}</div>
                            </div>
                          )}
                        </div>
                        {idx < selectedFlow.graphJson.nodes.length - 1 && (
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

            {/* Nodes List */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Nodes ({selectedFlow.graphJson?.nodes?.length || 0})</h4>
              <div className="space-y-2">
                {selectedFlow.graphJson?.nodes?.map((node: any) => (
                  <div key={node.id} className="bg-white px-4 py-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getNodeTypeColor(node.type)}`}>
                          {getNodeTypeIcon(node.type)} {node.type}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">({node.id})</span>
                      </div>
                    </div>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(node.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Edges */}
            {selectedFlow.graphJson?.edges?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Edges ({selectedFlow.graphJson.edges.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFlow.graphJson.edges.map((edge: any) => (
                    <span key={edge.id} className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full text-xs">
                      {edge.source} → {edge.target}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Raw Graph JSON</h4>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(selectedFlow.graphJson, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit: ${selectedFlow?.name || ''}`}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Flow Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setUseSimpleBuilder(true)}
              className={`px-3 py-1.5 text-sm rounded-md ${useSimpleBuilder ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Simple Builder
            </button>
            <button
              onClick={() => setUseSimpleBuilder(false)}
              className={`px-3 py-1.5 text-sm rounded-md ${!useSimpleBuilder ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
            >
              JSON Editor
            </button>
          </div>

          {useSimpleBuilder ? (
            <div className="space-y-6">
              {/* Trigger Section */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-800 mb-3">⚡ Trigger (When event occurs)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device</label>
                    <select
                      value={triggerDevice}
                      onChange={(e) => { setTriggerDevice(e.target.value); setTriggerEvent(''); }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
                    >
                      <option value="">Select device...</option>
                      {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.name} ({d.deviceId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event</label>
                    <select
                      value={triggerEvent}
                      onChange={(e) => setTriggerEvent(e.target.value)}
                      disabled={!triggerDevice}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="">Select event...</option>
                      {getDeviceEvents(triggerDevice).map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-green-800 mb-3">▶️ Action (Then do this)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device</label>
                    <select
                      value={actionDevice}
                      onChange={(e) => { setActionDevice(e.target.value); setActionName(''); }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
                    >
                      <option value="">Select device...</option>
                      {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.name} ({d.deviceId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <select
                      value={actionName}
                      onChange={(e) => setActionName(e.target.value)}
                      disabled={!actionDevice}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="">Select action...</option>
                      {getDeviceActions(actionDevice).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Parameters (JSON)</label>
                  <textarea
                    value={actionParams}
                    onChange={(e) => setActionParams(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm border px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">Flow Graph (JSON)</label>
              <textarea
                value={formData.graph}
                onChange={(e) => setFormData({ ...formData, graph: e.target.value })}
                rows={15}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm border px-3 py-2"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving || !formData.name}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
