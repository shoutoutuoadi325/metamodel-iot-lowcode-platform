import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API Server running on http://localhost:${port}`);
}

bootstrap();
