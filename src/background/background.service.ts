import { Injectable } from '@nestjs/common';
import loadORT from './ort-loader';
import Jimp from 'jimp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackgroundService {
    private sessionBRIA: any = null;
    private loading: Promise<void>;

    constructor() {
        console.log("Cargando modelo BRIA desde chunks...");
        this.loading = this.loadModel();
    }

    private async loadModel() {
        const ort = await loadORT();

        // Cargar chunks concatenados
        const chunkDir = path.join(__dirname, '..', 'assets');
        let files = fs.readdirSync(chunkDir).filter(f => f.endsWith('.bin'));

        files = files.sort((a, b) => Number(a.match(/\d+/)) - Number(b.match(/\d+/)));

        const buffers = files.map(f => fs.readFileSync(path.join(chunkDir, f)));
        const unified = Buffer.concat(buffers);

        console.log("✔ Modelo BRIA cargado desde chunks:", unified.length);

        this.sessionBRIA = await ort.InferenceSession.create(unified, {
            executionProviders: ["wasm"],
        });

        console.log("✔ Sesión WASM cargada");
    }

    private async ensureLoaded() {
        await this.loading;
        if (!this.sessionBRIA) throw new Error("Modelo no cargado");
    }

    async removeBackgroundBRIA(buffer: Buffer): Promise<Buffer> {
        console.log("🟦 [BRIA] → Iniciando procesamiento...");

        await this.ensureLoaded();
        console.log("🟩 [BRIA] → Modelo cargado correctamente.");

        const ort = await loadORT();
        console.log("🔧 [BRIA] → ONNX Web cargado.");

        console.log("📥 [BRIA] → Leyendo imagen...");
        const image = await Jimp.read(buffer);
        console.log(`📏 [BRIA] → Imagen original: ${image.bitmap.width}x${image.bitmap.height}`);

        const size = 1024;
        console.log("🔄 [BRIA] → Redimensionando imagen a 1024x1024...");
        const resized = image.clone().resize(size, size);

        console.log("🧮 [BRIA] → Generando tensor flotante...");
        const data = new Float32Array(1 * 3 * size * size);
        let idx = 0;

        console.log("🖼️ [BRIA] → Iniciando lectura de píxeles...");
        resized.scan(0, 0, size, size, function (x, y, i) {
            data[idx] = this.bitmap.data[i] / 255;
            data[idx + size * size] = this.bitmap.data[i + 1] / 255;
            data[idx + 2 * size * size] = this.bitmap.data[i + 2] / 255;
            idx++;
        });
        console.log("✔ [BRIA] → Lectura de píxeles completada.");

        console.log("📦 [BRIA] → Creando tensor ORT...");
        const tensor = new ort.Tensor("float32", data, [1, 3, size, size]);

        console.log("⚙️ [BRIA] → Ejecutando modelo...");
        const output = await this.sessionBRIA!.run({ "input": tensor });
        console.log("🟩 [BRIA] → Modelo ejecutado correctamente.");

        const outputKey = Object.keys(output)[0];
        console.log("🔑 [BRIA] → Output key:", outputKey);

        const maskData = output[outputKey].data;
        console.log("📊 [BRIA] → Mask recibido, tamaño:", maskData.length);

        console.log("🖌️ [BRIA] → Construyendo maskImg...");
        const maskImg = new Jimp(size, size);
        for (let i = 0; i < maskData.length; i++) {
            let m = Math.pow(Number(maskData[i]), 2.2);
            const v = Math.min(Math.max(m * 255, 0), 255);
            const pos = i * 4;
            maskImg.bitmap.data[pos] = v;
            maskImg.bitmap.data[pos + 1] = v;
            maskImg.bitmap.data[pos + 2] = v;
            maskImg.bitmap.data[pos + 3] = 255;
        }
        console.log("✔ [BRIA] → maskImg creado.");

        console.log("📐 [BRIA] → Redimensionando mask al tamaño original...");
        const maskResized = maskImg.resize(image.bitmap.width, image.bitmap.height);

        console.log("🖼️ [BRIA] → Aplicando máscara a imagen original...");
        const outputImg = image.clone();
        outputImg.scan(0, 0, outputImg.bitmap.width, outputImg.bitmap.height, function (x, y, i) {
            const m = maskResized.bitmap.data[(y * maskResized.bitmap.width + x) * 4];
            this.bitmap.data[i + 3] = m;
        });
        console.log("✔ [BRIA] → Máscara aplicada.");

        console.log("💾 [BRIA] → Generando buffer PNG final...");
        const resultBuffer = await outputImg.getBufferAsync("image/png");

        console.log("🏁 [BRIA] → Procesamiento finalizado. Tamaño buffer:", resultBuffer.length);

        return resultBuffer;
    }

}














// private async loadModel() {
//     const ruta = path.join(__dirname, '..', '..', 'src', 'assets');
//     console.log("Ruta de modelos:", ruta);
//     console.log("Archivos en assets:", fs.readdirSync(ruta));
//     try {
//         // this.session = await ort.InferenceSession.create(path.join(ruta, 'u2net.onnx'));
//         // console.log("MODELO U2NET CARGADO");

//         this.sessionBRIA = await ort.InferenceSession.create(path.join(ruta, 'bria.onnx'),
//             { executionProviders: ['wasm'] });
//         console.log("MODELO BRIA CARGADO");

//         // this.sessionMODEL20 = await ort.InferenceSession.create(path.join(ruta, 'model20.onnx'));
//         // console.log("MODELO MODEL20 CARGADO");

//         // this.sessionGANv2 = await ort.InferenceSession.create(path.join(ruta, 'face_paint_512_v2_0.onnx'));
//         // console.log("MODELO GANv2 CARGADO");
//     } catch (err) {
//         console.error("ERROR AL CARGAR MODELO:", err);
//     }
// }


// async removeBackground(buffer: Buffer): Promise<Buffer> {
//     const image = await Jimp.read(buffer);
//     const resized = image.clone().resize(320, 320);

//     // tensor CHW
//     const data = new Float32Array(1 * 3 * 320 * 320);
//     let idx = 0;

//     resized.scan(0, 0, 320, 320, function (x, y, i) {
//         const r = this.bitmap.data[i] / 255;
//         const g = this.bitmap.data[i + 1] / 255;
//         const b = this.bitmap.data[i + 2] / 255;

//         data[idx] = r;
//         data[idx + 320 * 320] = g;
//         data[idx + 2 * 320 * 320] = b;
//         idx++;
//     });

//     const tensor = new ort.Tensor('float32', data, [1, 3, 320, 320]);
//     // const output = await this.session.run({ "input.1": tensor });
//     const output = await this.session!.run({ 'input.1': tensor });


//     const mask = output[Object.keys(output)[0]].data;
//     const maskImg = new Jimp(320, 320);

//     for (let i = 0; i < mask.length; i++) {
//         let m = Number(mask[i]);

//         // Mejorar bordes (magia ✨)
//         m = Math.pow(m, 1.5); // 1.5-2.2 funciona excelente

//         const v = Math.min(Math.max(m * 255, 0), 255);

//         const pos = i * 4;

//         maskImg.bitmap.data[pos] = v;
//         maskImg.bitmap.data[pos + 1] = v;
//         maskImg.bitmap.data[pos + 2] = v;
//         maskImg.bitmap.data[pos + 3] = 255;
//     }

//     const maskResized = maskImg.resize(image.bitmap.width, image.bitmap.height);
//     const outputImg = image.clone();

//     outputImg.scan(0, 0, outputImg.bitmap.width, outputImg.bitmap.height, function (x, y, i) {
//         const m = maskResized.bitmap.data[(y * maskResized.bitmap.width + x) * 4];
//         this.bitmap.data[i + 3] = m;
//     });

//     return outputImg.getBufferAsync("image/png");
// }


// async removeBackgroundMODEL20(buffer: Buffer): Promise < Buffer > {
//     await this.ensureSession();

//     const image = await Jimp.read(buffer);
//     const size = 1024; // puedes ajustar según tu modelo
//     const resized = image.clone().resize(size, size);

//     const data = new Float32Array(1 * 3 * size * size);
//     let idx = 0;

//     resized.scan(0, 0, size, size, function (x, y, i) {
//         data[idx] = this.bitmap.data[i] / 255;
//         data[idx + size * size] = this.bitmap.data[i + 1] / 255;
//         data[idx + 2 * size * size] = this.bitmap.data[i + 2] / 255;
//         idx++;
//     });

//     const tensor = new ort.Tensor("float32", data, [1, 3, size, size]);
//     const output = await this.sessionMODEL20!.run({ "pixel_values": tensor });

//     const maskData = output[Object.keys(output)[0]].data;
//     const maskImg = new Jimp(size, size);

//     for (let i = 0; i < maskData.length; i++) {
//         let m = Math.pow(Number(maskData[i]), 2.2); // mejora bordes
//         const v = Math.min(Math.max(m * 255, 0), 255);
//         const pos = i * 4;
//         maskImg.bitmap.data[pos] = v;
//         maskImg.bitmap.data[pos + 1] = v;
//         maskImg.bitmap.data[pos + 2] = v;
//         maskImg.bitmap.data[pos + 3] = 255;
//     }

//     const maskResized = maskImg.resize(image.bitmap.width, image.bitmap.height);
//     const outputImg = image.clone();
//     outputImg.scan(0, 0, outputImg.bitmap.width, outputImg.bitmap.height, function (x, y, i) {
//         const m = maskResized.bitmap.data[(y * maskResized.bitmap.width + x) * 4];
//         this.bitmap.data[i + 3] = m;
//     });

//     return outputImg.getBufferAsync("image/png");
// }

// async animateGANv2(buffer: Buffer): Promise<Buffer> {
//     await this.ensureSession(); // asegurar que los modelos estén cargados
//     const image = await Jimp.read(buffer);

//     const size = 512; // tamaño del modelo
//     const resized = image.clone().resize(size, size);

//     // Convertir imagen a tensor CHW normalizado [0,1]
//     const data = new Float32Array(1 * 3 * size * size);
//     let idx = 0;
//     resized.scan(0, 0, size, size, function (x, y, i) {
//         data[idx] = this.bitmap.data[i] / 255; // R
//         data[idx + size * size] = this.bitmap.data[i + 1] / 255; // G
//         data[idx + 2 * size * size] = this.bitmap.data[i + 2] / 255; // B
//         idx++;
//     });

//     const tensor = new ort.Tensor("float32", data, [1, 3, size, size]);

//     // Ejecutar inferencia
//     const output = await this.sessionGANv2!.run({ "input_image": tensor });

//     // Type assertion: decimos que outputData es Float32Array
//     const outputData = output[Object.keys(output)[0]].data as Float32Array;

//     // Convertir output a imagen
//     const outputImg = new Jimp(size, size);
//     for (let i = 0; i < size * size; i++) {
//         const r = Math.min(Math.max(outputData[i] * 255, 0), 255);
//         const g = Math.min(Math.max(outputData[i + size * size] * 255, 0), 255);
//         const b = Math.min(Math.max(outputData[i + 2 * size * size] * 255, 0), 255);

//         const pos = i * 4;
//         outputImg.bitmap.data[pos] = r;
//         outputImg.bitmap.data[pos + 1] = g;
//         outputImg.bitmap.data[pos + 2] = b;
//         outputImg.bitmap.data[pos + 3] = 255;
//     }

//     return outputImg.getBufferAsync("image/png");
// }
