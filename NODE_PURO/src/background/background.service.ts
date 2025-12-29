import { Injectable } from '@nestjs/common';
import * as ort from 'onnxruntime-web';
import Jimp from 'jimp';
import * as fs from 'fs';
import * as path from 'path';

const MODEL_SIZE = 1024;

@Injectable()
export class BackgroundService {

    private sessionBRIA: ort.InferenceSession | null = null;
    private loading: Promise<void>;

    // 🔒 Mutex: ONNX WASM NO es paralelo
    private running: Promise<any> = Promise.resolve();

    // ♻️ Buffer reutilizable (CRÍTICO)
    private inputBuffer = new Float32Array(1 * 3 * MODEL_SIZE * MODEL_SIZE);

    constructor() {
        console.log('🚀 Iniciando carga del modelo BRIA...');
        this.loading = this.loadModel();
    }

    // ===============================
    // 🔹 CARGA DEL MODELO
    // ===============================
    private async loadModel(): Promise<void> {
        const chunkDir = path.join(__dirname, '..', 'assets');

        const files = fs
            .readdirSync(chunkDir)
            .filter(f => f.endsWith('.bin'))
            .sort((a, b) => {
                const na = Number(a.match(/\d+/)?.[0] ?? 0);
                const nb = Number(b.match(/\d+/)?.[0] ?? 0);
                return na - nb;
            });

        if (!files.length) {
            throw new Error('No se encontraron chunks .bin del modelo');
        }

        console.log(`📦 Chunks encontrados: ${files.length}`);

        const buffers = files.map(f =>
            fs.readFileSync(path.join(chunkDir, f))
        );

        const modelBuffer = Buffer.concat(buffers);

        console.log(`✔ Modelo unido (${modelBuffer.length} bytes)`);

        this.sessionBRIA = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: ['cpu'], // backend correcto
        });

        console.log('🟢 Sesión ONNX CPU lista');
    }

    private async ensureLoaded(): Promise<void> {
        await this.loading;
        if (!this.sessionBRIA) {
            throw new Error('Modelo BRIA no cargado');
        }
    }

    // ===============================
    // 🔹 API PÚBLICA (CON MUTEX)
    // ===============================
    async removeBackgroundBRIA(buffer: Buffer): Promise<Buffer> {
        return this.running = this.running.then(() =>
            this._removeBackgroundBRIA(buffer)
        );
    }

    // ===============================
    // 🔹 IMPLEMENTACIÓN REAL
    // ===============================
    private async _removeBackgroundBRIA(buffer: Buffer): Promise<Buffer> {

        console.log('🟦 [BRIA] Procesando imagen...');
        await this.ensureLoaded();

        // 📥 Leer imagen
        const image = await Jimp.read(buffer);
        const origW = image.bitmap.width;
        const origH = image.bitmap.height;

        console.log(`📏 Imagen original: ${origW}x${origH}`);

        // ===============================
        // 🔹 RESIZE + PADDING (NO DEFORMAR)
        // ===============================
        const scale = Math.min(
            MODEL_SIZE / origW,
            MODEL_SIZE / origH
        );

        const w = Math.round(origW * scale);
        const h = Math.round(origH * scale);

        const resized = image.clone().resize(w, h);

        const canvas = new Jimp(MODEL_SIZE, MODEL_SIZE, 0x000000FF);
        const offsetX = ((MODEL_SIZE - w) / 2) | 0;
        const offsetY = ((MODEL_SIZE - h) / 2) | 0;

        canvas.composite(resized, offsetX, offsetY);

        // ===============================
        // 🔹 PREPROCESADO ULTRA RÁPIDO
        // ===============================
        const imgData = canvas.bitmap.data; // RGBA
        const data = this.inputBuffer;
        const hw = MODEL_SIZE * MODEL_SIZE;

        for (let i = 0, p = 0; i < hw; i++, p += 4) {
            data[i] = imgData[p] / 255;
            data[i + hw] = imgData[p + 1] / 255;
            data[i + hw * 2] = imgData[p + 2] / 255;
        }

        const inputTensor = new ort.Tensor(
            'float32',
            data,
            [1, 3, MODEL_SIZE, MODEL_SIZE]
        );

        // ===============================
        // 🔹 INFERENCIA
        // ===============================
        console.log('⚙️ Ejecutando inferencia...');
        const output = await this.sessionBRIA!.run({ input: inputTensor });

        const outputKey = Object.keys(output)[0];
        const maskData = output[outputKey].data as Float32Array;

        // ===============================
        // 🔹 CONSTRUIR MÁSCARA
        // ===============================
        const maskImg = new Jimp(MODEL_SIZE, MODEL_SIZE);

        for (let i = 0, p = 0; i < hw; i++, p += 4) {
            const m = Math.pow(maskData[i], 2.2);
            const v = Math.min(Math.max(m * 255, 0), 255);
            maskImg.bitmap.data[p] =
                maskImg.bitmap.data[p + 1] =
                maskImg.bitmap.data[p + 2] = v;
            maskImg.bitmap.data[p + 3] = 255;
        }

        // ===============================
        // 🔹 QUITAR PADDING + RESIZE
        // ===============================
        const croppedMask = maskImg
            .crop(offsetX, offsetY, w, h)
            .resize(origW, origH);

        // ===============================
        // 🔹 APLICAR ALPHA
        // ===============================
        const outputImg = image.clone();
        const maskBuf = croppedMask.bitmap.data;

        for (let y = 0; y < origH; y++) {
            for (let x = 0; x < origW; x++) {
                const idx = (y * origW + x) * 4;
                outputImg.bitmap.data[idx + 3] = maskBuf[idx];
            }
        }

        // ===============================
        // 🔹 SALIDA FINAL
        // ===============================
        const result = await outputImg.getBufferAsync(Jimp.MIME_PNG);

        console.log('🏁 [BRIA] Procesamiento finalizado');
        return result;
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
