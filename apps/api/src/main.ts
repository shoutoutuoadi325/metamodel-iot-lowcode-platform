import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 IoT Platform API is running on: http://localhost:${port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${port}`);
}

bootstrap();
