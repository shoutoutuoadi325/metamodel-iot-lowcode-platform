'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';

interface DeviceModel {
  id: string;
  modelId: string;
  name: string;
  version: string;
  schemaJson: any;
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

const defaultSchema = {
  $schema: 'https://iot-platform.dev/device-model-schema/v1',
  modelId: '',
  version: '1.0.0',
  name: '',
  description: '',
  semantic: {
    type: '',
    category: '',
    tags: [],
  },
  properties: [],
  actions: [],
  events: [],
};

export default function DeviceModelsPage() {
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null);
  const [formData, setFormData] = useState({
    modelId: '',
    name: '',
    version: '1.0.0',
    schema: JSON.stringify(defaultSchema, null, 2),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await api.getDeviceModels();
      setModels(res.data);
    } catch (error) {
      console.error('Failed to fetch device models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      const schema = JSON.parse(formData.schema);
      schema.modelId = formData.modelId;
      schema.name = formData.name;
      schema.version = formData.version;
      
      await api.createDeviceModel({
        modelId: formData.modelId,
        name: formData.name,
        version: formData.version,
        schema,
      });
      setShowCreateModal(false);
      resetForm();
      fetchModels();
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON schema');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to create device model');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedModel) return;
    setError('');
    setSaving(true);
    try {
      const schema = JSON.parse(formData.schema);
      schema.modelId = selectedModel.modelId;
      schema.name = formData.name;
      schema.version = formData.version;
      
      await api.updateDeviceModel(selectedModel.id, {
        name: formData.name,
        schema,
      });
      setShowEditModal(false);
      setSelectedModel(null);
      resetForm();
      fetchModels();
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON schema');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to update device model');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      modelId: '',
      name: '',
      version: '1.0.0',
      schema: JSON.stringify(defaultSchema, null, 2),
    });
    setError('');
  };

  const openViewModal = (model: DeviceModel) => {
    setSelectedModel(model);
    setShowViewModal(true);
  };

  const openEditModal = (model: DeviceModel) => {
    setSelectedModel(model);
    setFormData({
      modelId: model.modelId,
      name: model.name,
      version: model.version,
      schema: JSON.stringify(model.schemaJson, null, 2),
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openDeleteModal = (model: DeviceModel) => {
    setSelectedModel(model);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedModel) return;
    setDeleting(true);
    try {
      await api.deleteDeviceModel(selectedModel.id);
      setShowDeleteModal(false);
      setSelectedModel(null);
      fetchModels();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete device model');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading device models...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Device Models</h1>
          <p className="mt-2 text-sm text-gray-700">
            Device models define the meta-model schema for IoT devices.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            + Create Model
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
                      Model ID
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Version
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Capabilities
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {models.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No device models found. Click "Create Model" to add one.
                      </td>
                    </tr>
                  ) : (
                    models.map((model) => (
                      <tr key={model.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {model.modelId}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {model.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {model.version}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 mr-1">
                            {model.schemaJson?.properties?.length || 0} props
                          </span>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 mr-1">
                            {model.schemaJson?.actions?.length || 0} actions
                          </span>
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                            {model.schemaJson?.events?.length || 0} events
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                          <button
                            onClick={() => openViewModal(model)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditModal(model)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(model)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
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
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Device Model">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Model ID</label>
              <input
                type="text"
                value={formData.modelId}
                onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                placeholder="model.sensor.temp.v1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Temperature Sensor"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Schema (JSON)</label>
            <textarea
              value={formData.schema}
              onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
              rows={18}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm border px-3 py-2"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !formData.modelId || !formData.name}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={`Device Model: ${selectedModel?.name || ''}`}>
        {selectedModel && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Model ID</span>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedModel.modelId}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Name</span>
                <p className="mt-1 text-sm text-gray-900">{selectedModel.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Version</span>
                <p className="mt-1 text-sm text-gray-900">{selectedModel.version}</p>
              </div>
            </div>

            {/* Properties */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Properties ({selectedModel.schemaJson?.properties?.length || 0})</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                {selectedModel.schemaJson?.properties?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedModel.schemaJson.properties.map((prop: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                        <div>
                          <span className="font-medium text-sm">{prop.name}</span>
                          <span className="ml-2 text-xs text-gray-500">({prop.type})</span>
                        </div>
                        <div className="flex space-x-2">
                          {prop.readable && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">readable</span>}
                          {prop.writable && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">writable</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No properties defined</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Actions ({selectedModel.schemaJson?.actions?.length || 0})</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                {selectedModel.schemaJson?.actions?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedModel.schemaJson.actions.map((action: any, idx: number) => (
                      <div key={idx} className="bg-white px-3 py-2 rounded border">
                        <div className="font-medium text-sm">{action.name}</div>
                        {action.description && <p className="text-xs text-gray-500">{action.description}</p>}
                        {action.parameters?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {action.parameters.map((param: any, pIdx: number) => (
                              <span key={pIdx} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                {param.name}: {param.type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No actions defined</p>
                )}
              </div>
            </div>

            {/* Events */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Events ({selectedModel.schemaJson?.events?.length || 0})</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                {selectedModel.schemaJson?.events?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedModel.schemaJson.events.map((event: any, idx: number) => (
                      <div key={idx} className="bg-white px-3 py-2 rounded border">
                        <div className="font-medium text-sm">{event.name}</div>
                        {event.description && <p className="text-xs text-gray-500">{event.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No events defined</p>
                )}
              </div>
            </div>

            {/* Raw JSON */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Raw Schema</h4>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(selectedModel.schemaJson, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit: ${selectedModel?.name || ''}`}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Model ID</label>
              <input
                type="text"
                value={formData.modelId}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-sm border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Schema (JSON)</label>
            <textarea
              value={formData.schema}
              onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
              rows={18}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm border px-3 py-2"
            />
          </div>
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

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Device Model">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Are you sure?</h3>
              <p className="text-sm text-gray-500">
                This will permanently delete the device model <strong>{selectedModel?.name}</strong> ({selectedModel?.modelId}). This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
