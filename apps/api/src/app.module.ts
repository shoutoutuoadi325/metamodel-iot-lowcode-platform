import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DeviceModelsModule } from './modules/device-models/device-models.module';
import { FlowsModule } from './modules/flows/flows.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    PrismaModule,
    MqttModule,
    DevicesModule,
    DeviceModelsModule,
    FlowsModule,
    WebsocketModule,
  ],
})
export class AppModule {}
