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

let metaPromise: Promise<ModelMeta> | null = null;

export const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function loadMeta(): Promise<ModelMeta> {
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
