import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

function listDirShallow(dir: string) {
  console.log(`📁 Contenido de: ${dir}`);

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    if (!items.length) {
      console.log("   (vacío)");
      return;
    }

    items.forEach(item => {
      const type = item.isDirectory() ? "📁 CARPETA" : "📄 ARCHIVO";
      console.log(`   ${type}  ->  ${item.name}`);
    });

  } catch (e) {
    console.log(`   ❌ No existe o no se puede leer.`);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  const distPath = path.join(__dirname, '..');
  const publicPath = path.join(__dirname, '..', 'public');
  const assetsPath = path.join(__dirname, '..', 'assets');

  app.use(express.static(publicPath));

  console.log("\n================ RUTAS IMPORTANTES ================");
  console.log("process.cwd(): ", process.cwd());
  console.log("__dirname:     ", __dirname);
  console.log("publicPath:    ", publicPath);
  console.log("assetsPath:    ", assetsPath);
  console.log("===================================================\n");

  // 🔥 LISTADOS (SOLO NIVEL ACTUAL)
  console.log("---------------------------------------------------");
  listDirShallow(process.cwd());  // raíz del runtime
  console.log("---------------------------------------------------");
  listDirShallow(distPath);       // dist/
  console.log("---------------------------------------------------");
  listDirShallow(assetsPath);     // dist/assets/
  console.log("---------------------------------------------------");

  await app.listen(process.env.PORT ?? 3000);
  console.log("API on http://localhost:3000");
  console.log("WS  on ws://localhost:3000/ws");
}

bootstrap();
