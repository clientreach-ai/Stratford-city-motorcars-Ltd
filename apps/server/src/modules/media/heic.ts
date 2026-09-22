import { createRequire } from "node:module";
import { Worker } from "node:worker_threads";

/**
 * HEIC/HEIF (HEVC) decoding, in a worker thread that ends with the photograph.
 *
 * sharp's prebuilt binaries leave out the HEVC decoder, so HEIC is decoded by
 * libheif compiled to WebAssembly (heic-decode). WebAssembly memory only ever
 * grows: decoding one 48 MP iPhone photograph in the server's own thread left
 * it holding ~900 MB for the rest of its life. In a worker, that memory goes
 * away when the worker does.
 *
 * The size is read from the file before anything is decoded, so a
 * decompression bomb is refused without allocating its pixels. libheif applies
 * the file's own rotation while decoding.
 */

const MODULE = createRequire(import.meta.url).resolve("heic-decode");

// Plain CommonJS so it runs the same under Node (production) and Bun (dev).
const WORKER = `
const { parentPort, workerData } = require("node:worker_threads");
require(workerData.module).all({ buffer: workerData.input }).then(
  async (images) => {
    try {
      const image = images[0];
      if (image.width * image.height > workerData.maxPixels) return parentPort.postMessage({ tooLarge: true });
      const { width, height, data } = await image.decode();
      parentPort.postMessage({ width, height, data }, [data.buffer]);
    } finally {
      images.dispose();
    }
  },
  (error) => parentPort.postMessage({ error: String(error && error.message || error) }),
);
`;

export class HeicTooLargeError extends Error {}

export async function decodeHeic(
  input: Uint8Array,
  maxPixels: number,
): Promise<{ width: number; height: number; pixels: Buffer }> {
  const worker = new Worker(WORKER, { eval: true, workerData: { module: MODULE, input, maxPixels } });
  try {
    const message = await new Promise<{ tooLarge?: true; error?: string; width?: number; height?: number; data?: Uint8ClampedArray }>(
      (resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.once("exit", (code) => reject(new Error(`HEIC decoder exited (${code})`)));
      },
    );
    if (message.tooLarge) throw new HeicTooLargeError();
    if (message.error || !message.data || !message.width || !message.height) throw new Error(message.error ?? "HEIC decode failed");
    const { data } = message;
    return { width: message.width, height: message.height, pixels: Buffer.from(data.buffer, data.byteOffset, data.byteLength) };
  } finally {
    await worker.terminate();
  }
}
