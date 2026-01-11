import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Devices
export const getDevices = () => api.get('/api/devices');
export const getDevice = (deviceId: string) => api.get(`/api/devices/${deviceId}`);
export const executeAction = (deviceId: string, actionName: string, params: any) =>
  api.post(`/api/devices/${deviceId}/actions/${actionName}`, { params });
export const getDeviceStateHistory = (deviceId: string) =>
  api.get(`/api/devices/${deviceId}/state/history`);
export const getDeviceEventHistory = (deviceId: string) =>
  api.get(`/api/devices/${deviceId}/events/history`);

// Device Models
export const getDeviceModels = () => api.get('/api/device-models');
export const getDeviceModel = (id: string) => api.get(`/api/device-models/${id}`);
export const createDeviceModel = (data: any) => api.post('/api/device-models', data);
export const updateDeviceModel = (id: string, data: any) => api.put(`/api/device-models/${id}`, data);
export const deleteDeviceModel = (id: string) => api.delete(`/api/device-models/${id}`);

// Flows
export const getFlows = () => api.get('/api/flows');
export const getFlow = (id: string) => api.get(`/api/flows/${id}`);
export const createFlow = (data: any) => api.post('/api/flows', data);
export const updateFlow = (id: string, data: any) => api.put(`/api/flows/${id}`, data);
export const enableFlow = (id: string) => api.post(`/api/flows/${id}/enable`);
export const disableFlow = (id: string) => api.post(`/api/flows/${id}/disable`);
export const getFlowRuns = (id: string) => api.get(`/api/flows/${id}/runs`);
export const deleteFlow = (id: string) => api.delete(`/api/flows/${id}`);

export default api;
