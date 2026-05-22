export type PreprocessResult = {
  tensor: Float32Array;
  sourceUrl: string;
  modelPreviewUrl: string;
  cropLabel: string;
  estimatedLength: number;
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GrayImage = {
  values: Float32Array;
  width: number;
  height: number;
};

const MAX_SIDE = 1600;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function luminance(data: Uint8ClampedArray, offset: number): number {
  return (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
}

function canvasToGrayImage(canvas: HTMLCanvasElement): GrayImage {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 读取失败");
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const values = new Float32Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    values[i] = luminance(image.data, i * 4);
  }

  return { values, width, height };
}

function buildIntegral(values: Float32Array, width: number, height: number): Float64Array {
  const stride = width + 1;
  const integral = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < width; x += 1) {
      rowSum += values[y * width + x];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum;
    }
  }

  return integral;
}

function localMean(
  integral: Float64Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number
): number {
  const stride = width + 1;
  const x0 = Math.max(0, x - radius);
  const y0 = Math.max(0, y - radius);
  const x1 = Math.min(width - 1, x + radius);
  const y1 = Math.min(height - 1, y + radius);
  const left = x0;
  const top = y0;
  const right = x1 + 1;
  const bottom = y1 + 1;
  const sum =
    integral[bottom * stride + right] -
    integral[top * stride + right] -
    integral[bottom * stride + left] +
    integral[top * stride + left];
  return sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return image;
}

function drawLimited(image: HTMLImageElement): HTMLCanvasElement {
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 初始化失败");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function detectInkBox(canvas: HTMLCanvasElement): Box {
  const gray = canvasToGrayImage(canvas);
  const { width, height } = gray;
  const integral = buildIntegral(gray.values, width, height);
  const radius = Math.round(clamp(Math.min(width, height) / 18, 18, 72));
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const lum = gray.values[index];
      const bg = localMean(integral, width, height, x, y, radius);
      const delta = bg - lum;
      const strongStroke = delta > 0.075;
      const faintStroke = delta > 0.045 && lum < 0.42;
      if (strongStroke || faintStroke) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height };
  }

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const padX = Math.round(boxWidth * 0.18 + 18);
  const padY = Math.round(boxHeight * 0.55 + 18);
  const x = clamp(minX - padX, 0, width - 1);
  const y = clamp(minY - padY, 0, height - 1);
  const right = clamp(maxX + padX, 1, width);
  const bottom = clamp(maxY + padY, 1, height);
  return { x, y, width: right - x, height: bottom - y };
}

function fitToModel(source: HTMLCanvasElement, box: Box, height: number, width: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 缩放失败");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min((width * 0.92) / box.width, (height * 0.8) / box.height);
  const drawWidth = Math.max(1, Math.round(box.width * scale));
  const drawHeight = Math.max(1, Math.round(box.height * scale));
  const dx = Math.max(6, Math.round(width * 0.035));
  const dy = Math.round((height - drawHeight) / 2);
  ctx.drawImage(source, box.x, box.y, box.width, box.height, dx, dy, drawWidth, drawHeight);
  return canvas;
}

function estimateDigitCount(tensor: Float32Array, width: number, height: number): number {
  const columns = new Float32Array(width);
  let maxMass = 0;

  for (let x = 0; x < width; x += 1) {
    let mass = 0;
    for (let y = 0; y < height; y += 1) {
      mass += tensor[y * width + x];
    }
    columns[x] = mass;
    maxMass = Math.max(maxMass, mass);
  }

  const active = Array.from(columns, (mass) => mass > Math.max(0.42, maxMass * 0.09));
  const closed = [...active];
  for (let x = 1; x < width - 1; x += 1) {
    if (!closed[x] && active[x - 1] && active[x + 1]) {
      closed[x] = true;
    }
  }

  const runs: number[] = [];
  let runWidth = 0;
  let gapWidth = 0;
  for (let x = 0; x < width; x += 1) {
    if (closed[x]) {
      if (gapWidth > 0 && gapWidth <= 2) {
        runWidth += gapWidth;
      } else if (gapWidth > 2 && runWidth >= 3) {
        runs.push(runWidth);
        runWidth = 0;
      }
      runWidth += 1;
      gapWidth = 0;
    } else if (runWidth > 0) {
      gapWidth += 1;
    }
  }
  if (runWidth >= 3) {
    runs.push(runWidth);
  }

  return Math.round(clamp(runs.length, 1, 12));
}

function canvasToTensor(canvas: HTMLCanvasElement): { tensor: Float32Array; previewUrl: string; estimatedLength: number } {
  const gray = canvasToGrayImage(canvas);
  const { width, height } = gray;
  const integral = buildIntegral(gray.values, width, height);
  const radius = Math.round(clamp(Math.min(width, height) / 7, 7, 14));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 转换失败");
  const tensor = new Float32Array(width * height);
  const preview = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i += 1) {
    const x = i % width;
    const y = Math.floor(i / width);
    const lum = gray.values[i];
    const bg = localMean(integral, width, height, x, y, radius);
    let ink = clamp((bg - lum - 0.018) / 0.16, 0, 1);
    if (ink < 0.05) ink = 0;
    ink = Math.min(1, Math.pow(ink, 0.72) * 1.08);
    tensor[i] = ink;
    const value = Math.round(255 * (1 - ink));
    preview.data[i * 4] = value;
    preview.data[i * 4 + 1] = value;
    preview.data[i * 4 + 2] = value;
    preview.data[i * 4 + 3] = 255;
  }

  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = width;
  previewCanvas.height = height;
  const previewCtx = previewCanvas.getContext("2d");
  if (!previewCtx) throw new Error("预览生成失败");
  previewCtx.putImageData(preview, 0, 0);
  return {
    tensor,
    previewUrl: previewCanvas.toDataURL("image/png"),
    estimatedLength: estimateDigitCount(tensor, width, height)
  };
}

export async function preprocessFile(file: File, height: number, width: number): Promise<PreprocessResult> {
  const image = await loadImage(file);
  const sourceUrl = image.src;
  const limited = drawLimited(image);
  const box = detectInkBox(limited);
  const fitted = fitToModel(limited, box, height, width);
  const { tensor, previewUrl, estimatedLength } = canvasToTensor(fitted);
  return {
    tensor,
    sourceUrl,
    modelPreviewUrl: previewUrl,
    cropLabel: `${Math.round(box.width)} x ${Math.round(box.height)}`,
    estimatedLength
  };
}
