import { AlertCircle, BrainCircuit, Image as ImageIcon, RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadMeta, ModelMeta, Recognition, recognizeDigitString } from "./ocr";
import { preprocessFile, PreprocessResult } from "./preprocess";

type Status = "idle" | "loading" | "ready" | "working" | "error";

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [meta, setMeta] = useState<ModelMeta | null>(null);
  const [preprocessed, setPreprocessed] = useState<PreprocessResult | null>(null);
  const [result, setResult] = useState<Recognition | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMeta()
      .then((loaded) => {
        setMeta(loaded);
        setStatus("ready");
      })
      .catch((err: Error) => {
        setError(err.message);
        setStatus("error");
      });
  }, []);

  const runFile = useCallback(
    async (file: File) => {
      if (!meta) return;
      setStatus("working");
      setError("");
      setResult(null);
      try {
        const processed = await preprocessFile(file, meta.height, meta.width);
        setPreprocessed(processed);
        const prediction = await recognizeDigitString(processed.tensor, meta, processed.estimatedLength);
        setResult(prediction);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "识别失败");
        setStatus("error");
      }
    },
    [meta]
  );

  const pickFile = () => inputRef.current?.click();

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) void runFile(file);
    event.currentTarget.value = "";
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void runFile(file);
  };

  const busy = status === "working" || status === "loading";

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">CRNN / CTC</p>
            <h1>手写数字串识别</h1>
          </div>
          <button className="icon-button" type="button" onClick={pickFile} disabled={!meta || busy} title="上传照片">
            {busy ? <RefreshCw className="spin" size={19} /> : <Upload size={19} />}
            <span>上传</span>
          </button>
          <input ref={inputRef} type="file" accept="image/*" onChange={onChange} hidden />
        </header>

        <div className="tool-grid">
          <div className="upload-pane" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
            {preprocessed ? (
              <img src={preprocessed.sourceUrl} alt="上传的数字串" />
            ) : (
              <div className="empty-state">
                <ImageIcon size={34} />
                <span>照片</span>
              </div>
            )}
          </div>

          <div className="result-pane">
            <div className="result-header">
              <BrainCircuit size={20} />
              <span>识别结果</span>
            </div>

            {status === "error" ? (
              <div className="notice error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : (
              <div className="digits-output">{result?.text || "待识别"}</div>
            )}

            <div className="metrics">
              <div>
                <span>置信度</span>
                <strong>{result ? `${Math.round(result.confidence * 100)}%` : "--"}</strong>
              </div>
              <div>
                <span>耗时</span>
                <strong>{result ? `${Math.round(result.timeMs)} ms` : "--"}</strong>
              </div>
              <div>
                <span>裁剪</span>
                <strong>{preprocessed?.cropLabel || "--"}</strong>
              </div>
            </div>

            <div className="model-preview">
              {preprocessed ? <img src={preprocessed.modelPreviewUrl} alt="模型输入" /> : <span>模型输入</span>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
