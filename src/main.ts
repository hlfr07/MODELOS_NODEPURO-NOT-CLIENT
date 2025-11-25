import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.use(express.static(path.join(__dirname, '..', 'public')));
  await app.listen(process.env.PORT ?? 3000);
  console.log('API on http://localhost:3000');
  console.log('WS  on ws://localhost:3000/ws');
}
bootstrap();
