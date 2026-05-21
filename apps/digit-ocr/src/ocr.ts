import * as ort from "onnxruntime-web";
import ortWasmMjs from "onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url";
import ortWasmBinary from "onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url";

export type ModelMeta = {
  inputName: string;
  outputName: string;
  height: number;
  width: number;
  channels: number;
  blankIndex: number;
  digits: string;
  maxLabelLength: number;
};

export type Recognition = {
  text: string;
  confidence: number;
  timeMs: number;
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let metaPromise: Promise<ModelMeta> | null = null;

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`;

ort.env.wasm.wasmPaths = {
  mjs: ortWasmMjs,
  wasm: ortWasmBinary
};
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

export async function loadMeta(): Promise<ModelMeta> {
  if (!metaPromise) {
    metaPromise = fetch(assetPath("models/digit-string-crnn.json")).then((response) => {
      if (!response.ok) {
        throw new Error("模型配置未找到");
      }
      return response.json();
    });
  }
  return metaPromise;
}

async function loadSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(assetPath("models/digit-string-crnn.onnx"), {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all"
    });
  }
  return sessionPromise;
}

function softmaxMax(logits: Float32Array, offset: number, classes: number): { id: number; prob: number } {
  let max = -Infinity;
  let id = 0;
  for (let i = 0; i < classes; i += 1) {
    const value = logits[offset + i];
    if (value > max) {
      max = value;
      id = i;
    }
  }
  let sum = 0;
  for (let i = 0; i < classes; i += 1) {
    sum += Math.exp(logits[offset + i] - max);
  }
  return { id, prob: 1 / sum };
}

function decode(logits: Float32Array, dims: readonly number[], blankIndex: number): Recognition {
  const started = performance.now();
  const time = dims[1];
  const classes = dims[2];
  const chars: string[] = [];
  const probs: number[] = [];
  let prev = -1;

  for (let t = 0; t < time; t += 1) {
    const { id, prob } = softmaxMax(logits, t * classes, classes);
    if (id !== prev && id !== blankIndex) {
      chars.push(String(id - 1));
      probs.push(prob);
    }
    prev = id;
  }

  const confidence = probs.length > 0 ? probs.reduce((sum, value) => sum + value, 0) / probs.length : 0;
  return { text: chars.join(""), confidence, timeMs: performance.now() - started };
}

export async function recognizeDigitString(tensorData: Float32Array, meta: ModelMeta): Promise<Recognition> {
  const session = await loadSession();
  const input = new ort.Tensor("float32", tensorData, [1, meta.channels, meta.height, meta.width]);
  const started = performance.now();
  const outputs = await session.run({ [meta.inputName]: input });
  const output = outputs[meta.outputName];
  const decoded = decode(output.data as Float32Array, output.dims, meta.blankIndex);
  return { ...decoded, timeMs: performance.now() - started };
}
