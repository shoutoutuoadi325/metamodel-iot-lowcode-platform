import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MqttGatewayService } from './mqtt-gateway.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [MqttGatewayService],
  exports: [MqttGatewayService],
})
export class MqttModule {}
