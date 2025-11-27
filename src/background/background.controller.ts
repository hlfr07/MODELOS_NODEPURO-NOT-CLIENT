import { Controller, Get, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackgroundService } from './background.service';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';


@Controller('background')
export class BackgroundController {
  constructor(private readonly backgroundService: BackgroundService) { }

  @Post('bria')
  @UseInterceptors(FileInterceptor('image'))
  async removeBgBria(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    //Antes de pasarlo al servicio, vamos a validar que no pese mas de 1mb la imagen
    if (file.size > 1 * 1024 * 1024) {
      return res.status(400).json({ error: "La imagen no debe pesar más de 1MB" });
    }
    const output = await this.backgroundService.removeBackgroundBRIA(file.buffer);
    res.setHeader('Content-Type', 'image/png');
    res.send(output);
  }


  @Get('chunks')
  async listChunks(@Res() res: Response) {
    try {
      const CHUNK_DIR = path.join(process.cwd(), 'assets'); // ruta relativa al JS compilado
      const files = fs.readdirSync(CHUNK_DIR);
      res.json({ files });
    } catch (err) {
      console.error('Error al leer model_chunks:', err);
      res.status(500).json({ error: 'No se pudo leer la carpeta model_chunks' });
    }
  }



}

// @Post('u2net')
// @UseInterceptors(FileInterceptor('image'))
// async removeBg(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
//   const output = await this.backgroundService.removeBackground(file.buffer);
//   res.setHeader('Content-Type', 'image/png');
//   res.send(output);
// }

//  @Post('model20')
//   @UseInterceptors(FileInterceptor('image'))
//   async removeBgModel20(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
//     const output = await this.backgroundService.removeBackgroundMODEL20(file.buffer);
//     res.setHeader('Content-Type', 'image/png');
//     res.send(output);
//   }

//   @Post('ganv2')
//   @UseInterceptors(FileInterceptor('image'))
//   async processGanv2(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
//     const output = await this.backgroundService.animateGANv2(file.buffer);
//     res.setHeader('Content-Type', 'image/png');
//     res.send(output);
//   }