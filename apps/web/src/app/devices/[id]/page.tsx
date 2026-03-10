'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebSocket } from '@/lib/websocket';
import * as api from '@/lib/api';

interface Device {
  deviceId: string;
  name: string;
  modelId: string;
  online: boolean;
  lastSeen: string | null;
  descJson: any;
}

interface StateLog {
  id: string;
  key: string;
  valueJson: any;
  ts: string;
}

interface EventLog {
  id: string;
  eventName: string;
  payloadJson: any;
  ts: string;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;
  const [device, setDevice] = useState<Device | null>(null);
  const [stateHistory, setStateHistory] = useState<StateLog[]>([]);
  const [eventHistory, setEventHistory] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [brightnessValue, setBrightnessValue] = useState(50);
  const [targetTemp, setTargetTemp] = useState(24);
  const { messages } = useWebSocket();

  useEffect(() => {
    fetchDevice();
    fetchStateHistory();
    fetchEventHistory();
  }, [deviceId]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.deviceId === deviceId) {
      if (latestMessage.type === 'device:state') {
        fetchStateHistory();
      } else if (latestMessage.type === 'device:event') {
        fetchEventHistory();
      } else if (latestMessage.type === 'device:presence') {
        fetchDevice();
      }
    }
  }, [messages, deviceId]);

  const fetchDevice = async () => {
    try {
      const res = await api.getDevice(deviceId);
      setDevice(res.data);
    } catch (error) {
      console.error('Failed to fetch device:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStateHistory = async () => {
    try {
      const res = await api.getDeviceStateHistory(deviceId);
      setStateHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch state history:', error);
    }
  };

  const fetchEventHistory = async () => {
    try {
      const res = await api.getDeviceEventHistory(deviceId);
      setEventHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch event history:', error);
    }
  };

  const executeAction = async (actionName: string, params: any = {}) => {
    setActionLoading(actionName);
    try {
      await api.executeAction(deviceId, actionName, params);
      setTimeout(() => {
        fetchStateHistory();
      }, 500);
    } catch (error: any) {
      alert(`Failed to execute action: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getLatestState = (key: string) => {
    const log = stateHistory.find((s) => s.key === key);
    return log ? log.valueJson : null;
  };

  const isOn = getLatestState('on');
  const brightness = getLatestState('brightness');
  const hvacTargetTemp = getLatestState('targetTemp');

  useEffect(() => {
    if (brightness !== undefined && brightness !== null) {
      setBrightnessValue(brightness);
    }
  }, [brightness]);

  useEffect(() => {
    if (hvacTargetTemp !== undefined && hvacTargetTemp !== null) {
      setTargetTemp(hvacTargetTemp);
    }
  }, [hvacTargetTemp]);

  if (loading) {
    return <div className="text-center py-12">Loading device...</div>;
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Device not found</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-indigo-600 hover:text-indigo-900"
        >
          Back to devices
        </button>
      </div>
    );
  }

  const deviceType = device?.descJson?.semantic?.type || 'light';

  const renderState = () => {
    if (deviceType === 'sensor') {
      const active = getLatestState('active');
      const temperature = getLatestState('temperature');
      const humidity = getLatestState('humidity');
      const battery = getLatestState('battery');
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <span className={`text-sm font-bold ${active ? 'text-green-600' : 'text-gray-500'}`}>
              {active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Temperature</span>
            <span className="text-sm text-gray-900">{temperature ?? '--'} °C</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Humidity</span>
            <span className="text-sm text-gray-900">{humidity ?? '--'} %</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Battery</span>
            <span className="text-sm text-gray-900">{battery ?? '--'} %</span>
          </div>
        </div>
      );
    } else if (deviceType === 'lock') {
      const isLocked = getLatestState('isLocked');
      const battery = getLatestState('battery');
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <span
              className={`text-sm font-bold ${
                isLocked ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {isLocked === true ? 'LOCKED' : isLocked === false ? 'UNLOCKED' : '--'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Battery</span>
            <span className="text-sm text-gray-900">{battery ?? '--'} %</span>
          </div>
        </div>
      );
    } else if (deviceType === 'hvac') {
      const mode = getLatestState('mode');
      const currentTemp = getLatestState('currentTemp');
      const targetTempVal = getLatestState('targetTemp');
      const fanSpeed = getLatestState('fanSpeed');
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Mode</span>
            <span className="text-sm font-bold text-indigo-600 uppercase">{mode ?? '--'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Current Temp</span>
            <span className="text-sm text-gray-900">{currentTemp ?? '--'} °C</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Target Temp</span>
            <span className="text-sm text-gray-900">{targetTempVal ?? '--'} °C</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Fan Speed</span>
            <span className="text-sm text-gray-900 uppercase">{fanSpeed ?? '--'}</span>
          </div>
        </div>
      );
    } else if (deviceType === 'occupancy') {
      const occupied = getLatestState('occupied');
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <span
              className={`text-sm font-bold ${
                occupied ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {occupied ? 'OCCUPIED (有人)' : 'VACANT (无人)'}
            </span>
          </div>
        </div>
      );
    }
    // Default Light
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Power</span>
          <span className={`text-sm ${isOn ? 'text-green-600' : 'text-gray-500'}`}>
            {isOn ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Brightness</span>
          <span className="text-sm text-gray-900">{brightness ?? 0}%</span>
        </div>
      </div>
    );
  };

  const renderActions = () => {
    if (deviceType === 'sensor') {
      return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => executeAction('enable')}
              disabled={!device.online || actionLoading === 'enable'}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'enable' ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={() => executeAction('disable')}
              disabled={!device.online || actionLoading === 'disable'}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'disable' ? 'Disabling...' : 'Disable'}
            </button>
          </div>
          <button
            onClick={() => executeAction('reset')}
            disabled={!device.online || actionLoading === 'reset'}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'reset' ? 'Resetting...' : 'Reset Sensor'}
          </button>
        </div>
      );
    } else if (deviceType === 'lock') {
      return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => executeAction('lock')}
              disabled={!device.online || actionLoading === 'lock'}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'lock' ? 'Locking...' : 'Lock'}
            </button>
            <button
              onClick={() => executeAction('unlock')}
              disabled={!device.online || actionLoading === 'unlock'}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'unlock' ? 'Unlocking...' : 'Unlock'}
            </button>
          </div>
        </div>
      );
    } else if (deviceType === 'hvac') {
      return (
        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2">
            {['off', 'cool', 'heat'].map((m) => (
              <button
                key={m}
                onClick={() => executeAction('setMode', { mode: m })}
                disabled={!device.online || actionLoading === 'setMode'}
                className="flex-1 bg-indigo-100 text-indigo-700 px-2 py-2 rounded-md hover:bg-indigo-200 disabled:opacity-50 uppercase text-xs font-bold"
              >
                {m}
              </button>
            ))}
          </div>

          {/* Fan Speed Selection */}
          <div className="flex gap-2">
            {['low', 'mid', 'high'].map((s) => (
              <button
                key={s}
                onClick={() => executeAction('setFanSpeed', { speed: s })}
                disabled={!device.online || actionLoading === 'setFanSpeed'}
                className="flex-1 bg-gray-100 text-gray-700 px-2 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50 uppercase text-xs font-bold"
              >
                Fan: {s}
              </button>
            ))}
          </div>

          {/* Target Temp Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Set Target Temp: {targetTemp}°C
            </label>
            <input
              type="range"
              min="16"
              max="30"
              value={targetTemp}
              onChange={(e) => setTargetTemp(Number(e.target.value))}
              className="w-full"
              disabled={!device.online}
            />
            <button
              onClick={() => executeAction('setTargetTemp', { temp: targetTemp })}
              disabled={!device.online || actionLoading === 'setTargetTemp'}
              className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Temp
            </button>
          </div>
        </div>
      );
    } else if (deviceType === 'occupancy') {
      return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => executeAction('setOccupancy', { occupied: true })}
              disabled={!device.online || actionLoading === 'setOccupancy'}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simulate: Occupied
            </button>
            <button
              onClick={() => executeAction('setOccupancy', { occupied: false })}
              disabled={!device.online || actionLoading === 'setOccupancy'}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simulate: Vacant
            </button>
          </div>
        </div>
      );
    }
    // Default Light
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => executeAction('turnOn')}
            disabled={!device.online || actionLoading === 'turnOn'}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'turnOn' ? 'Turning On...' : 'Turn On'}
          </button>
          <button
            onClick={() => executeAction('turnOff')}
            disabled={!device.online || actionLoading === 'turnOff'}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'turnOff' ? 'Turning Off...' : 'Turn Off'}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Set Brightness: {brightnessValue}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={brightnessValue}
            onChange={(e) => setBrightnessValue(Number(e.target.value))}
            className="w-full"
            disabled={!device.online}
          />
          <button
            onClick={() => executeAction('setBrightness', { brightness: brightnessValue })}
            disabled={!device.online || actionLoading === 'setBrightness'}
            className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'setBrightness' ? 'Setting...' : 'Set Brightness'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-indigo-600 hover:text-indigo-900 mb-2"
        >
          ← Back to devices
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{device.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Device ID: {device.deviceId}</p>
            <p className="text-sm text-gray-500">Model: {device.modelId}</p>
          </div>
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                device.online
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {device.online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current State */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current State</h2>
          {renderState()}
        </div>

        {/* Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
          {renderActions()}
        </div>

        {/* State History */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">State History</h2>
          <div className="max-h-96 overflow-y-auto">
            {stateHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No state history</p>
            ) : (
              <div className="space-y-2">
                {stateHistory.slice(0, 20).map((log) => (
                  <div key={log.id} className="text-sm border-b border-gray-200 pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">{log.key}</span>
                      <span className="text-gray-900">{JSON.stringify(log.valueJson)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(log.ts).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event History */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Event History</h2>
          <div className="max-h-96 overflow-y-auto">
            {eventHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No events</p>
            ) : (
              <div className="space-y-2">
                {eventHistory.slice(0, 20).map((log) => (
                  <div key={log.id} className="text-sm border-b border-gray-200 pb-2">
                    <div className="font-medium text-gray-700">{log.eventName}</div>
                    <div className="text-gray-600 mt-1">
                      {JSON.stringify(log.payloadJson)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(log.ts).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
