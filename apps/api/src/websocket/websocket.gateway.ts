import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MqttGatewayService } from '../mqtt/mqtt-gateway.service';
import { WsMessage } from '@iot-platform/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(private mqttGateway: MqttGatewayService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
    this.setupMqttListeners();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private setupMqttListeners() {
    const eventEmitter = this.mqttGateway.getEventEmitter();

    // Device presence changes
    eventEmitter.on('device:presence', (data) => {
      const message: WsMessage = {
        type: 'device:presence',
        deviceId: data.deviceId,
        data,
        timestamp: Date.now(),
      };
      this.server.emit('message', message);
    });

    // Device state changes
    eventEmitter.on('device:state', (data) => {
      const message: WsMessage = {
        type: 'device:state',
        deviceId: data.deviceId,
        data,
        timestamp: Date.now(),
      };
      this.server.emit('message', message);
    });

    // Device events
    eventEmitter.on('device:event', (data) => {
      const message: WsMessage = {
        type: 'device:event',
        deviceId: data.deviceId,
        data,
        timestamp: Date.now(),
      };
      this.server.emit('message', message);
    });

    // Flow execution updates
    eventEmitter.on('flow:started', (data) => {
      const message: WsMessage = {
        type: 'flow:started',
        flowId: data.flowId,
        data,
        timestamp: Date.now(),
      };
      this.server.emit('message', message);
    });

    eventEmitter.on('flow:completed', (data) => {
      const message: WsMessage = {
        type: 'flow:completed',
        flowId: data.flowId,
        data,
        timestamp: Date.now(),
      };
      this.server.emit('message', message);
    });

    eventEmitter.on('flow:failed', (data) => {
      const message: WsMessage = {
        type: 'flow:failed',
        flowId: data.flowId,
        data,
        timestamp: Date.now(),
      };
      this.server.emit('message', message);
    });
  }
}
