import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import serverless from 'serverless-http';

let cachedHandler: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.init();
  cachedHandler = serverless(app.getHttpAdapter().getInstance());
}

// Exporta el handler para Vercel
export const handler = async (event: any, context: any) => {
  if (!cachedHandler) await bootstrap();
  return cachedHandler(event, context);
};
