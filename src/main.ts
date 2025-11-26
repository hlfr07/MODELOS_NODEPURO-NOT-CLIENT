import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import serverless from 'serverless-http';
import express from 'express';

const expressApp = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Opciones de Nest
    logger: ['error', 'warn', 'log'],
  });
  
  app.enableCors();
  await app.init();

  // Monta NestJS sobre Express
  app.getHttpAdapter().getInstance() // devuelve Express interno de Nest
    .use(expressApp); // opcional, si quieres middleware adicional

  console.log("NestJS listo para serverless");
}

// Localmente
if (process.env.NODE_ENV !== 'production') {
  bootstrap().then(() => {
    expressApp.listen(3000, () => {
      console.log("API on http://localhost:3000");
    });
  });
}

// Exporta handler para Vercel
export const handler = serverless(expressApp);





// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import serverless from 'serverless-http';


// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   Ruta al modelo en dist/assets
//   const modelPath = path.join(__dirname, 'assets', 'bria.onnx');

//   try {
//     const stats = fs.statSync(modelPath);
//     console.log(`Archivo encontrado: ${modelPath}`);
//     console.log(`Tamaño: ${stats.size} bytes`);
//   } catch (err) {
//     console.error(`❌ No se pudo leer el archivo: ${modelPath}`);
//   }

//   await app.listen(process.env.PORT ?? 3000);
//   console.log("API on http://localhost:3000");
//   console.log("WS  on ws://localhost:3000/ws");
// }
// //
// bootstrap();
