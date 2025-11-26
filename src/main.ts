import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  // Ruta pública
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // 🔥 LOGS ÚTILES 🔥  
  console.log('================= RUTAS DEL PROYECTO =================');
  console.log('process.cwd():                ', process.cwd());
  console.log('__dirname:                    ', __dirname);
  console.log('Ruta public:                  ', publicPath);

  const assetsDist = path.join(__dirname, '..', 'assets');
  console.log('Ruta assets (dist/assets):    ', assetsDist);

  console.log('------------------------------------------------------');
  console.log('Contenido de dist/:');
  try {
    console.log(fs.readdirSync(path.join(__dirname, '..')));
  } catch (e) {
    console.log('No existe dist todavía');
  }

  console.log('------------------------------------------------------');
  console.log('Contenido de dist/assets:');
  try {
    console.log(fs.readdirSync(assetsDist));
  } catch (e) {
    console.log('❌ dist/assets NO EXISTE');
  }

  console.log('======================================================');

  await app.listen(process.env.PORT ?? 3000);
  console.log('API on http://localhost:3000');
  console.log('WS  on ws://localhost:3000/ws');
}

bootstrap();
