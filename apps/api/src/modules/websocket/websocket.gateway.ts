import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('✅ WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.id}`);
  }

  // Emit device updates to all connected clients
  emitDeviceUpdate(deviceId: string, data: any) {
    this.server.emit('device:update', { deviceId, ...data });
  }

  emitDeviceState(deviceId: string, propertyName: string, value: any) {
    this.server.emit('device:state', { deviceId, propertyName, value });
  }

  emitDeviceEvent(deviceId: string, eventName: string, payload: any) {
    this.server.emit('device:event', { deviceId, eventName, payload });
  }
}
