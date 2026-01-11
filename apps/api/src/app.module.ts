import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MqttModule } from './mqtt/mqtt.module';
import { DevicesModule } from './devices/devices.module';
import { DeviceModelsModule } from './device-models/device-models.module';
import { FlowsModule } from './flows/flows.module';
import { WebSocketModule } from './websocket/websocket.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';

@Module({
  imports: [
    PrismaModule,
    MqttModule,
    WebSocketModule,
    DevicesModule,
    DeviceModelsModule,
    FlowsModule,
    OrchestratorModule,
  ],
})
export class AppModule {}
