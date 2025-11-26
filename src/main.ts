import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
//
bootstrap();
