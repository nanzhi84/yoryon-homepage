export type PreprocessResult = {
  tensor: Float32Array;
  sourceUrl: string;
  modelPreviewUrl: string;
  cropLabel: string;
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAX_SIDE = 1600;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 1;
  const sorted = values.sort((a, b) => a - b);
  const index = Math.floor(clamp(p, 0, 1) * (sorted.length - 1));
  return sorted[index];
}

function luminance(data: Uint8ClampedArray, offset: number): number {
  return (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
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

function autocontrastCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 对比度处理失败");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let min = 1;
  let max = 0;

  for (let i = 0; i < canvas.width * canvas.height; i += 1) {
    const lum = luminance(image.data, i * 4);
    min = Math.min(min, lum);
    max = Math.max(max, lum);
  }

  const scale = max > min ? 1 / (max - min) : 1;
  for (let i = 0; i < canvas.width * canvas.height; i += 1) {
    const value = Math.round(255 * clamp((luminance(image.data, i * 4) - min) * scale, 0, 1));
    image.data[i * 4] = value;
    image.data[i * 4 + 1] = value;
    image.data[i * 4 + 2] = value;
    image.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

function estimateBackground(data: Uint8ClampedArray, width: number, height: number): number {
  const samples: number[] = [];
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 6000)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      samples.push(luminance(data, (y * width + x) * 4));
    }
  }
  return percentile(samples, 0.92);
}

function detectInkBox(canvas: HTMLCanvasElement): Box {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 读取失败");
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const bg = estimateBackground(image.data, width, height);
  const denom = Math.max(bg - 0.16, 0.28);
  const ink = new Float32Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    const lum = luminance(image.data, i * 4);
    ink[i] = clamp((bg - lum) / denom, 0, 1);
  }

  const findRawBox = (threshold: number) => {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let count = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (ink[y * width + x] > threshold) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          count += 1;
        }
      }
    }

    return { minX, minY, maxX, maxY, count };
  };

  const findFilteredBox = (threshold: number) => {
    const visited = new Uint8Array(width * height);
    let keptMinX = width;
    let keptMinY = height;
    let keptMaxX = -1;
    let keptMaxY = -1;
    let keptCount = 0;
    const stack: number[] = [];

    for (let start = 0; start < width * height; start += 1) {
      if (visited[start] || ink[start] <= threshold) continue;

      stack.length = 0;
      stack.push(start);
      visited[start] = 1;
      let minX = start % width;
      let maxX = minX;
      let minY = Math.floor(start / width);
      let maxY = minY;
      let area = 0;
      let touchesBorder = false;

      while (stack.length > 0) {
        const index = stack.pop();
        if (index === undefined) break;
        const x = index % width;
        const y = Math.floor(index / width);
        area += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        touchesBorder = touchesBorder || x === 0 || y === 0 || x === width - 1 || y === height - 1;

        for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) {
            const next = yy * width + xx;
            if (!visited[next] && ink[next] > threshold) {
              visited[next] = 1;
              stack.push(next);
            }
          }
        }
      }

      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const hugeOrEdgeLike =
        area > 0.12 * width * height ||
        boxWidth > 0.96 * width ||
        boxHeight > 0.96 * height ||
        (boxWidth > 0.55 * width && boxHeight < 0.18 * height) ||
        (boxHeight > 0.55 * height && boxWidth < 0.18 * width) ||
        (boxWidth > 0.75 * width && boxHeight > 0.35 * height);

      if (touchesBorder || area < 6 || hugeOrEdgeLike) continue;

      keptMinX = Math.min(keptMinX, minX);
      keptMinY = Math.min(keptMinY, minY);
      keptMaxX = Math.max(keptMaxX, maxX);
      keptMaxY = Math.max(keptMaxY, maxY);
      keptCount += area;
    }

    return { minX: keptMinX, minY: keptMinY, maxX: keptMaxX, maxY: keptMaxY, count: keptCount };
  };

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  const rawBox = findRawBox(0.22);
  for (const threshold of [0.34, 0.28, 0.22]) {
    ({ minX, minY, maxX, maxY, count } = findFilteredBox(threshold));
    if (count >= 20) break;
  }
  if (count >= 20 && rawBox.count >= 20) {
    const filteredWidth = maxX - minX + 1;
    const rawWidth = rawBox.maxX - rawBox.minX + 1;
    const rawHeight = rawBox.maxY - rawBox.minY + 1;
    const rawLooksLikeText =
      rawWidth < 0.96 * width &&
      rawHeight < 0.96 * height &&
      rawWidth * rawHeight < 0.75 * width * height;
    if (rawLooksLikeText && filteredWidth < rawWidth * 0.65) {
      ({ minX, minY, maxX, maxY, count } = rawBox);
    }
  }
  if (count < 20) {
    ({ minX, minY, maxX, maxY, count } = findRawBox(0.34));
  }
  if (count < 20) {
    ({ minX, minY, maxX, maxY } = findRawBox(0.22));
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height };
  }

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const padX = Math.max(10, Math.floor(Math.min(boxWidth * 0.06, boxHeight * 0.35) + 12));
  const padY = Math.max(8, Math.floor(boxHeight * 0.18 + 10));
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
  const drawWidth = Math.max(1, Math.floor(box.width * scale));
  const drawHeight = Math.max(1, Math.floor(box.height * scale));
  const dx = Math.max(6, Math.floor(width * 0.035));
  const dy = Math.floor((height - drawHeight) / 2);
  ctx.drawImage(source, box.x, box.y, box.width, box.height, dx, dy, drawWidth, drawHeight);
  return canvas;
}

function canvasToTensor(canvas: HTMLCanvasElement): { tensor: Float32Array; previewUrl: string } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 转换失败");
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const bg = estimateBackground(image.data, width, height);
  const denom = Math.max(bg - 0.16, 0.28);
  const tensor = new Float32Array(width * height);
  const preview = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i += 1) {
    const lum = luminance(image.data, i * 4);
    let ink = clamp((bg - lum) / denom, 0, 1);
    if (ink < 0.08) ink = 0;
    ink = Math.pow(ink, 0.82);
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
  return { tensor, previewUrl: previewCanvas.toDataURL("image/png") };
}

export async function preprocessFile(file: File, height: number, width: number): Promise<PreprocessResult> {
  const image = await loadImage(file);
  const sourceUrl = image.src;
  const limited = autocontrastCanvas(drawLimited(image));
  const box = detectInkBox(limited);
  const fitted = autocontrastCanvas(fitToModel(limited, box, height, width));
  const { tensor, previewUrl } = canvasToTensor(fitted);
  return {
    tensor,
    sourceUrl,
    modelPreviewUrl: previewUrl,
    cropLabel: `${Math.round(box.width)} x ${Math.round(box.height)}`
  };
}
