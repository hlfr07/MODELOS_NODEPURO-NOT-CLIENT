import * as path from 'path';

let ort: any = null;

async function loadORT() {
    if (ort) return ort;

    // Ruta al ort.min.js dentro de dist/module
    const ortPath = path.join(__dirname, '..', 'assets', 'module', 'ort.min.js');

    ort = require(ortPath);

    // Rutas para los archivos WASM
    const wasmBase = path.join(__dirname, '..', 'assets', 'module');

    ort.env.wasm.wasmPaths = {
        'ort-wasm.wasm': `${wasmBase}/ort-wasm.wasm`,
        'ort-wasm-simd.wasm': `${wasmBase}/ort-wasm-simd.wasm`,
    };

    console.log("✔ ONNX Web cargado en servidor Node");

    return ort;
}

export default loadORT;
