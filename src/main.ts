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
    console.log(`   ❌ No existe o no se puede leer: ${dir}`);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  // Ruta pública (mantener si la usas)
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  console.log("\n================ RUTAS IMPORTANTES ================");
  console.log("process.cwd(): ", process.cwd()); // raíz del runtime (/workspace)
  console.log("__dirname:     ", __dirname);     // carpeta donde está main.js
  console.log("===================================================\n");

  // 🔥 LISTADO SOLO DEL MISMO NIVEL QUE main.js (__dirname)
  console.log("---------------------------------------------------");
  listDirShallow(__dirname);   // <-- lista *solo* lo que hay junto a main.js
  console.log("---------------------------------------------------");

  // (Opcional) también puedes listar process.cwd() o distPath si quieres:
  // listDirShallow(process.cwd());
  // listDirShallow(path.join(__dirname, '..'));

  await app.listen(process.env.PORT ?? 3000);
  console.log("API on http://localhost:3000");
  console.log("WS  on ws://localhost:3000/ws");
}

bootstrap();
