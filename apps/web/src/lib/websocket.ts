'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WsMessage } from '@iot-platform/shared';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WsMessage[]>([]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    const socketInstance = io(wsUrl, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socketInstance.on('message', (message: WsMessage) => {
      setMessages((prev) => [...prev.slice(-99), message]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const subscribe = useCallback((callback: (message: WsMessage) => void) => {
    if (socket) {
      socket.on('message', callback);
      return () => {
        socket.off('message', callback);
      };
    }
  }, [socket]);

  return { socket, connected, messages, subscribe };
}
