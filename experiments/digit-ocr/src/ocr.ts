import * as ort from "onnxruntime-web/wasm";
import ortWasmMjs from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import ortWasmBinary from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { assetPath, type ModelMeta } from "./model-meta";

export type Recognition = {
  text: string;
  confidence: number;
  timeMs: number;
};

type Beam = {
  blank: number;
  nonBlank: number;
};

type Candidate = {
  text: string;
  score: number;
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;

ort.env.wasm.wasmPaths = {
  mjs: ortWasmMjs,
  wasm: ortWasmBinary
};
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

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

function logAddExp(a: number, b: number): number {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const max = Math.max(a, b);
  return max + Math.log(Math.exp(a - max) + Math.exp(b - max));
}

function beamScore(beam: Beam): number {
  return logAddExp(beam.blank, beam.nonBlank);
}

function logSoftmaxFrame(logits: Float32Array, offset: number, classes: number): number[] {
  let max = -Infinity;
  for (let i = 0; i < classes; i += 1) {
    max = Math.max(max, logits[offset + i]);
  }

  let sum = 0;
  for (let i = 0; i < classes; i += 1) {
    sum += Math.exp(logits[offset + i] - max);
  }
  const logSum = max + Math.log(sum);
  return Array.from({ length: classes }, (_, i) => logits[offset + i] - logSum);
}

function updateBeam(map: Map<string, Beam>, text: string, blank: number, nonBlank: number): void {
  const beam = map.get(text) ?? { blank: -Infinity, nonBlank: -Infinity };
  beam.blank = logAddExp(beam.blank, blank);
  beam.nonBlank = logAddExp(beam.nonBlank, nonBlank);
  map.set(text, beam);
}

function ctcBeamSearch(
  logits: Float32Array,
  dims: readonly number[],
  blankIndex: number,
  maxLength: number
): Candidate[] {
  const time = dims[1];
  const classes = dims[2];
  const beamWidth = 16;
  let beams = new Map<string, Beam>([["", { blank: 0, nonBlank: -Infinity }]]);

  for (let t = 0; t < time; t += 1) {
    const logProbs = logSoftmaxFrame(logits, t * classes, classes);
    const next = new Map<string, Beam>();

    for (const [text, beam] of beams) {
      for (let id = 0; id < classes; id += 1) {
        const prob = logProbs[id];
        if (id === blankIndex) {
          updateBeam(next, text, beamScore(beam) + prob, -Infinity);
          continue;
        }

        const char = String(id - 1);
        if (text.length >= maxLength) continue;
        const last = text.at(-1);
        if (char === last) {
          updateBeam(next, text, -Infinity, beam.nonBlank + prob);
          updateBeam(next, text + char, -Infinity, beam.blank + prob);
        } else {
          updateBeam(next, text + char, -Infinity, beamScore(beam) + prob);
        }
      }
    }

    beams = new Map(
      [...next.entries()]
        .sort((a, b) => beamScore(b[1]) - beamScore(a[1]))
        .slice(0, beamWidth)
    );
  }

  return [...beams.entries()]
    .map(([text, beam]) => ({ text, score: beamScore(beam) }))
    .sort((a, b) => b.score - a.score);
}

function decode(
  logits: Float32Array,
  dims: readonly number[],
  blankIndex: number,
  maxLength: number,
  lengthHint?: number
): Recognition {
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

  const greedyText = chars.join("");
  const decodeMaxLength = lengthHint ? Math.min(lengthHint, maxLength) : maxLength;
  const candidates = ctcBeamSearch(logits, dims, blankIndex, decodeMaxLength);
  const candidate =
    (lengthHint ? candidates.find((item) => item.text.length === lengthHint) : candidates[0]) ??
    candidates.find((item) => item.text.length > 0) ??
    { text: greedyText.slice(0, decodeMaxLength), score: 0 };
  const confidence = probs.length > 0 ? probs.reduce((sum, value) => sum + value, 0) / probs.length : 0;
  return { text: candidate.text, confidence, timeMs: performance.now() - started };
}

export async function recognizeDigitString(
  tensorData: Float32Array,
  meta: ModelMeta,
  lengthHint?: number
): Promise<Recognition> {
  const session = await loadSession();
  const input = new ort.Tensor("float32", tensorData, [1, meta.channels, meta.height, meta.width]);
  const started = performance.now();
  const outputs = await session.run({ [meta.inputName]: input });
  const output = outputs[meta.outputName];
  const decoded = decode(output.data as Float32Array, output.dims, meta.blankIndex, meta.maxLabelLength, lengthHint);
  return { ...decoded, timeMs: performance.now() - started };
}
