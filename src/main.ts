import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept,Authorization,Authentication, Access-control-allow-credentials, Access-control-allow-headers, Access-control-allow-methods, Access-control-allow-origin, User-Agent, Referer, Accept-Encoding, Accept-Language, Access-Control-Request-Headers, Cache-Control, Pragma',
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Ruta al modelo en dist/assets
  // const modelPath = path.join(__dirname, 'assets', 'bria.onnx');

  // try {
  //   const stats = fs.statSync(modelPath);
  //   console.log(`Archivo encontrado: ${modelPath}`);
  //   console.log(`Tamaño: ${stats.size} bytes`);
  // } catch (err) {
  //   console.error(`❌ No se pudo leer el archivo: ${modelPath}`);
  // }

  await app.listen(process.env.PORT ?? 3000);
  console.log("API on http://localhost:3000");
  console.log("WS  on ws://localhost:3000/ws");
}

bootstrap();
