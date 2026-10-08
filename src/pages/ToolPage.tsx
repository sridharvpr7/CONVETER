import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, ChevronRight, Star, DownloadCloud,
  RefreshCw, Info, Shield, Cloud, WifiOff, CheckCircle2,
  AlertCircle, X, Loader2, FileText, Layers, ArrowRight,
  Sparkles, Settings, Eye, Copy, Globe, PenLine, Camera,
  Eraser, Trash2,
} from 'lucide-react';
import { getToolBySlug, getRelatedTools, CATEGORY_META } from '@/registry/tools';
import { useAppStore } from '@/store/app.store';
import { getToolDispatch, hasProcessor, type OptionField } from '@/lib/toolDispatch';
import type { ProcessorResult } from '@/lib/processors';
import { recordHistory } from '@/pages/HistoryPage';

// ────────────────────────────────────────────────
// Processing states
// ────────────────────────────────────────────────
type ProcessingState =
  | 'idle'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface ProcessingFile {
  id: string;
  file: File;
  state: ProcessingState;
  progress: number;
  error?: string;
  result?: ProcessorResult;
  results?: ProcessorResult[];
}

// ────────────────────────────────────────────────
// Utility: download a blob
// ────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ────────────────────────────────────────────────
// Upload Zone
// ────────────────────────────────────────────────
interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  supportedFormats?: string[];
  color: string;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onFiles, accept, multiple = true, supportedFormats, color,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles, accept, multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={`upload-zone py-16 px-8 cursor-pointer transition-all duration-200 ${isDragActive ? 'active' : ''}`}
      style={isDragActive ? { borderColor: color, backgroundColor: color + '08' } : {}}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-200"
          style={{
            backgroundColor: isDragActive ? color + '15' : 'var(--muted)',
            color: isDragActive ? color : 'var(--text-muted)',
          }}
        >
          {isDragActive ? <DownloadCloud size={32} /> : <Upload size={32} />}
        </div>
        <div>
          <p className="text-base font-semibold text-primary mb-1">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-muted-cv">
            or <span style={{ color }} className="font-medium">browse to upload</span>
          </p>
        </div>
        {supportedFormats && supportedFormats.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-xs text-muted-cv">Supported:</span>
            {supportedFormats.map((fmt) => (
              <span key={fmt} className="text-2xs px-2 py-0.5 rounded font-mono uppercase font-medium border"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)', color: 'var(--text-muted)', fontSize: '10px' }}
              >
                {fmt}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-cv">
          {multiple ? 'Multiple files supported' : 'Single file mode'} · Up to 100MB free
        </p>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// URL Input Panel (for web tools)
// ────────────────────────────────────────────────
const UrlInputPanel: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
  color: string;
  hint?: string;
}> = ({ value, onChange, onSubmit, isRunning, color, hint }) => (
  <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
    <label htmlFor="tool-url-input" className="label">URL</label>
    <div className="flex gap-2">
      <div className="flex-1 flex items-center gap-2 input-lg" style={{ padding: 0 }}>
        <Globe size={16} style={{ color: 'var(--text-muted)', marginLeft: '12px', flexShrink: 0 }} />
        <input
          id="tool-url-input"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-sm text-primary"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isRunning || !value.trim()}
        className="btn-primary btn-lg gap-2 flex-shrink-0"
        style={{ backgroundColor: color, opacity: isRunning ? 0.7 : 1 }}
      >
        {isRunning ? <><Loader2 size={16} className="animate-spin" />Processing…</> : <><Sparkles size={16} />Analyze</>}
      </button>
    </div>
    {hint && (
      <p className="text-xs text-muted-cv flex items-start gap-1.5">
        <Info size={12} style={{ flexShrink: 0, marginTop: 2 }} />
        {hint}
      </p>
    )}
  </form>
);

// ────────────────────────────────────────────────
// Signature Pad (for sign-pdf)
// ────────────────────────────────────────────────
const SignaturePad: React.FC<{
  onSignature: (dataUrl: string) => void;
  color: string;
}> = ({ onSignature, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    isDrawing.current = true;
    const pos = getPos(e.nativeEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e.nativeEvent, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
    e.preventDefault();
  }, []);

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    onSignature(canvas.toDataURL('image/png'));
  }, [hasSignature, onSignature]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignature('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label">Draw Your Signature</label>
        <button type="button" onClick={clear} className="btn-secondary btn-sm gap-1.5 text-xs">
          <Eraser size={12} /> Clear
        </button>
      </div>
      <div className="relative rounded-xl border-2 border-dashed overflow-hidden"
        style={{ borderColor: color + '40', backgroundColor: '#fafafa', touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full"
          style={{ cursor: 'crosshair', display: 'block' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-cv flex items-center gap-2">
              <PenLine size={16} /> Sign here
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-cv">Draw your signature above, then upload a PDF and click Process.</p>
    </div>
  );
};

// ────────────────────────────────────────────────
// Camera Capture (for tools declaring camera input)
// ────────────────────────────────────────────────
const CameraCapture: React.FC<{
  onCapture: (file: File) => void;
  color: string;
}> = ({ onCapture, color }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported on this browser or connection.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setIsOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied or unavailable.');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="mb-4">
      {!isOpen ? (
        <button
          type="button"
          onClick={startCamera}
          className="btn-secondary btn-md gap-2 w-full justify-center"
        >
          <Camera size={16} /> Use Camera to Capture Document / Photo
        </button>
      ) : (
        <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={takePhoto}
              className="btn-primary btn-md gap-2"
              style={{ backgroundColor: color }}
            >
              <Camera size={16} /> Capture Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="btn-secondary btn-md gap-2"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs mt-2 flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────
// File Item
// ────────────────────────────────────────────────
const FileItem: React.FC<{
  pf: ProcessingFile;
  color: string;
  onRemove: (id: string) => void;
  onDownload: (pf: ProcessingFile) => void;
}> = ({ pf, color, onRemove, onDownload }) => {
  const stateConfig: Record<ProcessingState, { icon: React.ReactNode; label: string; stateColor: string }> = {
    idle: { icon: <FileText size={14} />, label: 'Ready', stateColor: 'var(--text-muted)' },
    processing: { icon: <Loader2 size={14} className="animate-spin" />, label: `Processing ${pf.progress}%`, stateColor: color },
    completed: { icon: <CheckCircle2 size={14} />, label: 'Done', stateColor: '#22c55e' },
    failed: { icon: <AlertCircle size={14} />, label: pf.error || 'Failed', stateColor: '#ef4444' },
    cancelled: { icon: <X size={14} />, label: 'Cancelled', stateColor: 'var(--text-muted)' },
  };
  const cfg = stateConfig[pf.state];
  const hasMultiResult = (pf.results?.length ?? 0) > 1;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border"
      style={{
        borderColor: pf.state === 'failed' ? '#ef444440' : pf.state === 'completed' ? '#22c55e30' : 'var(--border)',
        backgroundColor: pf.state === 'completed' ? '#22c55e06' : pf.state === 'failed' ? '#ef444406' : 'var(--card)',
      }}
    >
      <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ backgroundColor: 'var(--muted)', color: 'var(--text-muted)' }}
      >
        <FileText size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{pf.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-cv">{(pf.file.size / 1024 / 1024).toFixed(2)} MB</span>
          {pf.result?.meta?.outputSize && (
            <span className="text-xs text-muted-cv">
              → {((pf.result.meta.outputSize as number) / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
          {pf.result?.meta?.compressionRatio && (
            <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
              -{pf.result.meta.compressionRatio}%
            </span>
          )}
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: cfg.stateColor }}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>
        {pf.state === 'processing' && (
          <div className="progress-bar mt-1.5">
            <div className="progress-fill" style={{ width: `${pf.progress}%`, backgroundColor: color }} />
          </div>
        )}
        {/* Multi-result download links */}
        {hasMultiResult && pf.state === 'completed' && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pf.results!.map((r, i) => (
              <button
                key={i}
                onClick={() => downloadBlob(r.blob, r.filename)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors"
                style={{ borderColor: color + '60', color, backgroundColor: color + '10' }}
              >
                <DownloadCloud size={10} />
                {r.filename}
              </button>
            ))}
          </div>
        )}
        {/* Error detail */}
        {pf.state === 'failed' && pf.error && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#ef4444' }}>{pf.error}</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {pf.state === 'completed' && !hasMultiResult && (
          <button
            onClick={() => onDownload(pf)}
            className="btn-sm flex items-center gap-1 text-xs"
            style={{ color, backgroundColor: color + '15', borderRadius: '6px', padding: '4px 10px' }}
          >
            <DownloadCloud size={12} />
            Download
          </button>
        )}
        <button
          onClick={() => onRemove(pf.id)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-hover-cv transition-colors"
        >
          <X size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// Dynamic Options Panel
// ────────────────────────────────────────────────
const OptionsPanel: React.FC<{
  fields: OptionField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  hint?: string;
  color: string;
}> = ({ fields, values, onChange, hint, color }) => {
  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const val = values[field.key] ?? field.default;
        return (
          <div key={field.key}>
            {field.type !== 'checkbox' && <label className="label">{field.label}</label>}

            {field.type === 'select' && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {field.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(field.key, opt.value)}
                    className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150"
                    style={{
                      borderColor: val === opt.value ? color : 'var(--border)',
                      backgroundColor: val === opt.value ? color + '15' : 'var(--muted)',
                      color: val === opt.value ? color : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {field.type === 'range' && (
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={Number(val)}
                  onChange={(e) => onChange(field.key, Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: color }}
                />
                <span
                  className="text-sm font-semibold font-num w-16 text-right"
                  style={{ color }}
                >
                  {String(val)}{field.unit ?? ''}
                </span>
              </div>
            )}

            {field.type === 'number' && (
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={Number(val)}
                onChange={(e) => onChange(field.key, Number(e.target.value))}
                className="input-lg mt-1.5"
                style={{ maxWidth: '160px' }}
              />
            )}

            {field.type === 'text' && (
              <input
                type="text"
                placeholder={field.placeholder}
                value={String(val)}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="input-lg mt-1.5"
              />
            )}

            {field.type === 'password' && (
              <div className="mt-1.5">
                <label className="label mb-1">{field.label}</label>
                <input
                  type="password"
                  placeholder={field.placeholder}
                  value={String(val)}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="input-lg w-full"
                  autoComplete="new-password"
                />
              </div>
            )}

            {field.type === 'textarea' && (
              <textarea
                placeholder={field.placeholder}
                value={String(val)}
                rows={field.rows ?? 4}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="input-lg mt-1.5 w-full resize-y font-mono text-sm"
              />
            )}

            {field.type === 'checkbox' && (
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  id={`opt-${field.key}`}
                  checked={Boolean(val)}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: color }}
                />
                <label htmlFor={`opt-${field.key}`} className="text-sm text-secondary cursor-pointer">
                  {field.label}
                </label>
              </div>
            )}
          </div>
        );
      })}

      {hint && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border"
          style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          <Info size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs text-muted-cv leading-relaxed">{hint}</p>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────
// Main Tool Page
// ────────────────────────────────────────────────
export const ToolPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isFavoriteTool, toggleFavoriteTool, addNotification } = useAppStore();

  const tool = slug ? getToolBySlug(slug) : undefined;
  const dispatch = slug ? getToolDispatch(slug) : null;
  const implemented = slug ? hasProcessor(slug) : false;

  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallState, setOverallState] = useState<ProcessingState>('idle');
  const [activeTab, setActiveTab] = useState<'upload' | 'options' | 'result'>('upload');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    dispatch?.optionFields?.forEach((f) => { defaults[f.key] = f.default; });
    return defaults;
  });

  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    dispatch?.optionFields?.forEach((f) => { defaults[f.key] = f.default; });
    setOptions(defaults);
    setFiles([]);
    setOverallState('idle');
    setActiveTab('upload');
    setTextInput('');
    setUrlInput('');
    setSignatureDataUrl('');
  }, [slug, dispatch?.optionFields]);

  const handleFiles = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      state: 'idle' as ProcessingState,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDownload = useCallback((pf: ProcessingFile) => {
    if (pf.result) {
      downloadBlob(pf.result.blob, pf.result.filename);
    }
  }, []);

  const runProcessor = useCallback(async (
    inputFiles: ProcessingFile[],
    extraOpts: Record<string, unknown> = {}
  ) => {
    if (!dispatch) {
      const message = 'This tool does not have a processor in this build.';
      setFiles((prev) => prev.map((f) =>
        inputFiles.some((pf) => pf.id === f.id)
          ? { ...f, state: 'failed', progress: 0, error: message }
          : f
      ));
      return;
    }

    const mergedOpts = { ...options, ...extraOpts };

    if (dispatch.multiFile) {
      const fileList = inputFiles.map((pf) => pf.file);
      setFiles((prev) => prev.map((f, i) => i === 0 ? { ...f, state: 'processing', progress: 50 } : f));
      try {
        const result = await dispatch.processor(fileList, mergedOpts);
        const results = Array.isArray(result) ? result : [result];
        setFiles((prev) => prev.map((f, i) => i === 0 ? {
          ...f,
          state: 'completed',
          progress: 100,
          result: results[0],
          results: results.length > 1 ? results : undefined,
        } : { ...f, state: 'completed', progress: 100 }));

        recordHistory({
          fileName: fileList.map((f) => f.name).join(', '),
          toolName: tool!.name,
          toolSlug: tool!.slug,
          category: tool!.category,
          size: (fileList.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2) + ' MB',
          resultSize: results[0]?.meta?.outputSize
            ? ((results[0].meta.outputSize as number) / (1024 * 1024)).toFixed(2) + ' MB'
            : undefined,
          status: 'completed',
          processingType: tool!.processingMode === 'local' ? 'local' : 'cloud',
        });
        addNotification({
          title: `${tool!.name} completed`,
          desc: `${fileList.length} files processed successfully`,
          type: 'success',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setFiles((prev) => prev.map((f) => ({ ...f, state: 'failed', error: msg })));
        recordHistory({
          fileName: fileList.map((f) => f.name).join(', '),
          toolName: tool!.name,
          toolSlug: tool!.slug,
          category: tool!.category,
          size: (fileList.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2) + ' MB',
          status: 'failed',
          processingType: tool!.processingMode === 'local' ? 'local' : 'cloud',
        });
        addNotification({
          title: `${tool!.name} failed`,
          desc: msg,
          type: 'error',
        });
      }
    } else {
      for (const pf of inputFiles) {
        setFiles((prev) => prev.map((f) => f.id === pf.id ? { ...f, state: 'processing', progress: 10 } : f));
        try {
          const progressInterval = setInterval(() => {
            setFiles((prev) => prev.map((f) => {
              if (f.id === pf.id && f.progress < 80) {
                return { ...f, progress: Math.min(f.progress + 15, 80) };
              }
              return f;
            }));
          }, 200);

          const result = await dispatch.processor([pf.file], mergedOpts);
          clearInterval(progressInterval);

          const results = Array.isArray(result) ? result : null;
          const primaryRes = Array.isArray(result) ? result[0] : result;
          setFiles((prev) => prev.map((f) => f.id === pf.id ? {
            ...f,
            state: 'completed',
            progress: 100,
            result: primaryRes,
            results: results && results.length > 1 ? results : undefined,
          } : f));

          recordHistory({
            fileName: pf.file.name,
            toolName: tool!.name,
            toolSlug: tool!.slug,
            category: tool!.category,
            size: (pf.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            resultSize: primaryRes?.meta?.outputSize
              ? ((primaryRes.meta.outputSize as number) / (1024 * 1024)).toFixed(2) + ' MB'
              : undefined,
            status: 'completed',
            processingType: tool!.processingMode === 'local' ? 'local' : 'cloud',
          });
          addNotification({
            title: `${tool!.name} completed`,
            desc: `${pf.file.name} processed successfully`,
            type: 'success',
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Processing failed';
          setFiles((prev) => prev.map((f) => f.id === pf.id ? {
            ...f, state: 'failed', error: msg, progress: 0,
          } : f));
          recordHistory({
            fileName: pf.file.name,
            toolName: tool!.name,
            toolSlug: tool!.slug,
            category: tool!.category,
            size: (pf.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            status: 'failed',
            processingType: tool!.processingMode === 'local' ? 'local' : 'cloud',
          });
          addNotification({
            title: `${tool!.name} failed`,
            desc: msg,
            type: 'error',
          });
        }
      }
    }
  }, [dispatch, options, tool, addNotification]);

  const handleProcess = useCallback(async (inputFiles?: ProcessingFile[]) => {
    const filesToProcess = inputFiles ?? files;
    if (filesToProcess.length === 0) return;
    setIsRunning(true);
    setOverallState('processing');
    setActiveTab('result');
    await runProcessor(filesToProcess);
    setOverallState('completed');
    setIsRunning(false);
  }, [files, runProcessor]);

  const handleTextProcess = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (!slug) return;
    const file = new File([textInput], `${slug}-input.txt`, { type: 'text/plain' });
    const processingFile: ProcessingFile = { id: crypto.randomUUID(), file, state: 'idle', progress: 0 };
    setFiles([processingFile]);
    setIsRunning(true);
    setOverallState('processing');
    setActiveTab('result');
    void runProcessor([processingFile]).then(() => {
      setOverallState('completed');
      setIsRunning(false);
    });
  }, [slug, textInput, runProcessor]);

  const handleUrlProcess = useCallback(() => {
    if (!urlInput.trim()) return;
    const file = new File([''], `url-input.txt`, { type: 'text/plain' });
    const processingFile: ProcessingFile = { id: crypto.randomUUID(), file, state: 'idle', progress: 0 };
    setFiles([processingFile]);
    setIsRunning(true);
    setOverallState('processing');
    setActiveTab('result');
    void runProcessor([processingFile], { _url: urlInput.trim() }).then(() => {
      setOverallState('completed');
      setIsRunning(false);
    });
  }, [urlInput, runProcessor]);

  const handleReset = () => {
    setFiles([]);
    setOverallState('idle');
    setActiveTab('upload');
    setSignatureDataUrl('');
  };

  const handleDownloadAll = () => {
    const completed = files.filter((f) => f.state === 'completed' && f.result);
    for (const pf of completed) {
      if (pf.results && pf.results.length > 1) {
        pf.results.forEach((r) => downloadBlob(r.blob, r.filename));
      } else if (pf.result) {
        downloadBlob(pf.result.blob, pf.result.filename);
      }
    }
  };

  const setOption = (key: string, value: unknown) => setOptions((prev) => ({ ...prev, [key]: value }));

  const acceptMap = useMemo(() => (tool?.supportedInputFormats ?? []).reduce(
    (acc, fmt) => {
      const mime = fmt === 'pdf' ? 'application/pdf'
        : fmt.startsWith('jp') ? 'image/jpeg'
        : fmt === 'png' ? 'image/png'
        : fmt === 'webp' ? 'image/webp'
        : fmt === 'gif' ? 'image/gif'
        : fmt === 'tiff' || fmt === 'tif' ? 'image/tiff'
        : fmt === 'bmp' ? 'image/bmp'
        : fmt === 'svg' ? 'image/svg+xml'
        : fmt === 'zip' ? 'application/zip'
        : fmt === 'csv' ? 'text/csv'
        : fmt === 'json' ? 'application/json'
        : fmt === 'txt' ? 'text/plain'
        : fmt === 'md' || fmt === 'markdown' ? 'text/markdown'
        : fmt === 'html' || fmt === 'htm' ? 'text/html'
        : fmt === 'xml' ? 'application/xml'
        : fmt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : fmt === 'doc' ? 'application/msword'
        : fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : fmt === 'xls' ? 'application/vnd.ms-excel'
        : fmt === 'epub' ? 'application/epub+zip'
        : fmt === 'mp4' ? 'video/mp4'
        : fmt === 'mov' ? 'video/quicktime'
        : fmt === 'mkv' ? 'video/x-matroska'
        : fmt === 'avi' ? 'video/x-msvideo'
        : fmt === 'webm' ? 'video/webm'
        : fmt === 'mp3' ? 'audio/mpeg'
        : fmt === 'wav' ? 'audio/wav'
        : fmt === 'aac' ? 'audio/aac'
        : fmt === 'm4a' ? 'audio/mp4'
        : fmt === 'flac' ? 'audio/flac'
        : fmt === 'ogg' ? 'audio/ogg'
        : 'application/octet-stream';
      if (!acc[mime]) acc[mime] = [];
      if (!acc[mime].includes(`.${fmt}`)) acc[mime].push(`.${fmt}`);
      return acc;
    },
    {} as Record<string, string[]>
  ), [tool?.supportedInputFormats]);

  // ── Derived variables (computed after all hooks) ──────────────────
  const toolNotFound = !tool;
  const meta = tool ? CATEGORY_META[tool.category] : CATEGORY_META['pdf'];
  // Text tools expose textPlaceholder without inputMode; URL tools use inputMode='url'/'url-or-file'
  const isTextTool = !!(dispatch?.textPlaceholder && !dispatch?.inputMode);
  const isUrlTool = dispatch?.inputMode === 'url' || dispatch?.inputMode === 'url-or-file';
  const isSignatureTool = tool?.slug === 'sign-pdf';
  const canRunEmptyText = false; // text tools always require input
  const completedCount = files.filter((f) => f.state === 'completed').length;
  const failedCount = files.filter((f) => f.state === 'failed').length;
  const relatedTools = tool ? getRelatedTools(tool) : [];

  // Truthful status label
  const statusLabel = implemented
    ? (tool?.processingMode === 'local' ? 'Local processor' : 'Cloud processor (backend required)')
    : 'Processor not yet available';

  const isFav = tool ? isFavoriteTool(tool.slug) : false;

  if (toolNotFound) {
    return (
      <div className="pt-14 min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h1 className="text-2xl font-bold text-primary mb-2">Tool Not Found</h1>
          <p className="text-secondary mb-6">The tool &ldquo;{slug}&rdquo; does not exist in the catalog.</p>
          <Link to="/tools" className="btn-primary btn-md">Browse All Tools</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-14 min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Breadcrumb */}
      <div className="border-b" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="container-app py-3 flex items-center gap-2 text-xs text-muted-cv flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/tools" className="hover:text-primary transition-colors">Tools</Link>
          <ChevronRight size={12} />
          <Link to={`/tools/${tool.category}`} className="hover:text-primary transition-colors" style={{ color: meta.color }}>
            {meta.name}
          </Link>
          <ChevronRight size={12} />
          <span className="text-primary font-medium">{tool.name}</span>
          {implemented && tool.processingMode === 'local' && (
            <span className="ml-2 badge badge-success text-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 mr-1 inline-block" />
              Offline Ready
            </span>
          )}
          {implemented && tool.processingMode !== 'local' && (
            <span className="ml-2 badge badge-neutral text-2xs">
              <Cloud size={10} className="mr-1 inline-block" />
              Backend Required
            </span>
          )}
        </div>
      </div>

      <div className="container-app py-6">
        <div className="flex gap-6">
          {/* Main workspace */}
          <div className="flex-1 min-w-0">
            {/* Tool header */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0 text-2xl font-bold"
                  style={{ backgroundColor: meta.color + '15', color: meta.color }}
                >
                  {tool.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-2xl font-bold text-primary">{tool.name}</h1>
                    {tool.new && <span className="badge" style={{ backgroundColor: meta.color + '15', color: meta.color }}>New</span>}
                    {tool.premium && <span className="badge" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>Premium</span>}
                    {tool.status === 'beta' && <span className="badge badge-neutral">Beta</span>}
                  </div>
                  <p className="text-secondary">{tool.description}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {implemented && tool.processingMode === 'local' ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-success-600">
                        <WifiOff size={12} /> Processes locally on your device
                      </span>
                    ) : implemented ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#3b82f6' }}>
                        <Cloud size={12} /> Requires backend service
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        <AlertCircle size={12} /> Processor not available in this build
                      </span>
                    )}
                    {tool.batchSupported && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-cv">
                        <Layers size={12} /> Batch supported
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleFavoriteTool(tool!.slug)} className="btn-secondary btn-sm gap-1.5">
                  <Star size={13} className={isFav ? 'fill-current text-warning-500' : ''} />
                  {isFav ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                  className="btn-secondary btn-sm gap-1.5"
                  title="Copy link"
                >
                  <Copy size={13} />
                  Share
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6" style={{ borderColor: 'var(--border)' }}>
              {(['upload', 'options', 'result'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-all duration-150 border-b-2 -mb-px flex items-center gap-1.5 ${
                    activeTab === tab ? 'border-current' : 'border-transparent text-muted-cv hover:text-primary'
                  }`}
                  style={activeTab === tab ? { color: meta.color, borderColor: meta.color } : {}}
                >
                  {tab === 'upload' && (isUrlTool ? <Globe size={13} /> : <Upload size={13} />)}
                  {tab === 'options' && <Settings size={13} />}
                  {tab === 'result' && <Eye size={13} />}
                  {tab === 'upload' ? (isUrlTool ? 'Enter URL' : 'Upload Files') : tab === 'options' ? 'Options' : 'Results'}
                  {tab === 'result' && overallState === 'completed' && (
                    <span className="w-4 h-4 flex items-center justify-center rounded-full text-white text-2xs ml-1"
                      style={{ backgroundColor: '#22c55e', fontSize: '10px' }}
                    >
                      {completedCount}
                    </span>
                  )}
                  {tab === 'options' && (dispatch?.optionFields?.length ?? 0) > 0 && (
                    <span className="w-4 h-4 flex items-center justify-center rounded-full text-white text-2xs ml-1"
                      style={{ backgroundColor: 'var(--text-muted)', fontSize: '10px' }}
                    >
                      {dispatch!.optionFields!.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Upload / Input tab */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                {/* URL input mode */}
                {isUrlTool && (
                  <UrlInputPanel
                    value={urlInput}
                    onChange={setUrlInput}
                    onSubmit={handleUrlProcess}
                    isRunning={isRunning}
                    color={meta.color}
                    hint={dispatch?.optionsHint}
                  />
                )}

                {/* Text input mode */}
                {isTextTool && (
                  <form onSubmit={handleTextProcess} className="space-y-3">
                    <label htmlFor="tool-text-input" className="label">Input</label>
                    <textarea
                      id="tool-text-input"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={dispatch?.textPlaceholder}
                      rows={8}
                      className="input-lg w-full resize-y font-mono text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={isRunning || (!textInput.trim() && !canRunEmptyText)}
                        className="btn-primary btn-lg gap-2"
                        style={{ backgroundColor: meta.color, opacity: isRunning ? 0.7 : 1 }}
                      >
                        {isRunning ? <><Loader2 size={16} className="animate-spin" />Processing…</> : <><Sparkles size={16} />{tool.name}</>}
                      </button>
                      {dispatch?.optionFields && dispatch.optionFields.length > 0 && (
                        <button type="button" onClick={() => setActiveTab('options')} className="btn-secondary btn-md gap-1.5">
                          <Settings size={14} />Options
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* File upload mode (default, also used by signature tools) */}
                {!isTextTool && !isUrlTool && (
                  <>
                    {/* Signature pad (for sign-pdf) */}
                    {isSignatureTool && (
                      <div className="mb-4">
                        <SignaturePad
                          color={meta.color}
                          onSignature={(dataUrl) => {
                            setSignatureDataUrl(dataUrl);
                            setOption('signatureDataUrl', dataUrl);
                          }}
                        />
                      </div>
                    )}

                    {tool.inputTypes?.includes('camera') && (
                      <CameraCapture
                        onCapture={(capturedFile) => handleFiles([capturedFile])}
                        color={meta.color}
                      />
                    )}

                    <UploadZone
                      onFiles={handleFiles}
                      multiple={tool.batchSupported || dispatch?.multiFile}
                      supportedFormats={tool.supportedInputFormats}
                      color={meta.color}
                      accept={acceptMap}
                    />
                  </>
                )}

                {/* File list */}
                {!isTextTool && !isUrlTool && files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">
                        {files.length} file{files.length !== 1 ? 's' : ''} selected
                      </p>
                      <button onClick={() => setFiles([])} className="text-xs text-muted-cv hover:text-primary transition-colors flex items-center gap-1">
                        <Trash2 size={11} /> Clear all
                      </button>
                    </div>
                    {files.map((pf) => (
                      <FileItem key={pf.id} pf={pf} color={meta.color} onRemove={handleRemove} onDownload={handleDownload} />
                    ))}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleProcess()}
                        disabled={isRunning || files.length === 0 || (isSignatureTool && !signatureDataUrl)}
                        className="btn-primary btn-lg gap-2"
                        style={{
                          backgroundColor: meta.color,
                          boxShadow: isRunning ? 'none' : `0 4px 16px ${meta.color}40`,
                          opacity: isRunning ? 0.7 : 1,
                        }}
                      >
                        {isRunning ? (
                          <><Loader2 size={16} className="animate-spin" />Processing…</>
                        ) : (
                          <><Sparkles size={16} />{tool.name}</>
                        )}
                      </button>
                      {isSignatureTool && !signatureDataUrl && (
                        <p className="text-xs text-muted-cv flex items-center gap-1">
                          <PenLine size={12} /> Draw your signature above first
                        </p>
                      )}
                      {dispatch?.optionFields && dispatch.optionFields.length > 0 && !isRunning && (
                        <button
                          onClick={() => setActiveTab('options')}
                          className="btn-secondary btn-md gap-1.5"
                        >
                          <Settings size={14} />
                          Options
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Not implemented notice */}
                {!implemented && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border mt-4"
                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                  >
                    <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">Processor not available</p>
                      <p className="text-xs text-muted-cv leading-relaxed">
                        This tool is listed in the catalog but does not have a connected processor in this build.
                        No simulated results will be returned.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Options tab */}
            {activeTab === 'options' && (
              <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold text-primary mb-6">Tool Options</p>
                {dispatch?.optionFields && dispatch.optionFields.length > 0 ? (
                  <OptionsPanel
                    fields={dispatch.optionFields}
                    values={options}
                    onChange={setOption}
                    hint={dispatch.optionsHint}
                    color={meta.color}
                  />
                ) : (
                  <div className="flex items-start gap-3 p-4 rounded-lg border"
                    style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                  >
                    <Info size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
                    <p className="text-xs text-muted-cv leading-relaxed">
                      This tool has no additional options. Simply upload your files and click Process.
                    </p>
                  </div>
                )}
                {(files.length > 0 || urlInput) && (
                  <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => {
                        setActiveTab('upload');
                        if (isUrlTool) { handleUrlProcess(); }
                        else { void handleProcess(); }
                      }}
                      className="btn-primary btn-md gap-2"
                      style={{ backgroundColor: meta.color }}
                    >
                      <Sparkles size={14} />
                      Apply &amp; Process
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Result tab */}
            {activeTab === 'result' && (
              <div className="space-y-4">
                {overallState === 'idle' && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 flex items-center justify-center rounded-2xl"
                      style={{ backgroundColor: 'var(--muted)', color: 'var(--text-disabled)' }}
                    >
                      <Eye size={28} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-primary">No results yet</p>
                      <p className="text-sm text-muted-cv mt-1">
                        {isUrlTool ? 'Enter a URL and click Analyze' : 'Upload files and run the tool'} to see results here
                      </p>
                    </div>
                    <button onClick={() => setActiveTab('upload')} className="btn-primary btn-md" style={{ backgroundColor: meta.color }}>
                      {isUrlTool ? <><Globe size={15} /> Enter URL</> : <><Upload size={15} /> Upload Files</>}
                    </button>
                  </div>
                )}

                {(overallState === 'processing' || overallState === 'completed') && (
                  <>
                    {overallState === 'completed' && (
                      <div className="flex items-center justify-between p-4 rounded-xl border"
                        style={{
                          backgroundColor: failedCount > 0 ? '#f59e0b08' : '#22c55e08',
                          borderColor: failedCount > 0 ? '#f59e0b30' : '#22c55e30',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={20} style={{ color: failedCount > 0 ? '#f59e0b' : '#22c55e' }} />
                          <div>
                            <p className="text-sm font-semibold text-primary">
                              {completedCount} file{completedCount !== 1 ? 's' : ''} processed
                              {failedCount > 0 && <span className="ml-2" style={{ color: '#ef4444' }}>{failedCount} failed</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {completedCount > 1 && (
                            <button onClick={handleDownloadAll} className="btn-primary btn-sm gap-1.5"
                              style={{ backgroundColor: meta.color }}
                            >
                              <DownloadCloud size={13} /> Download All
                            </button>
                          )}
                          <button onClick={handleReset} className="btn-secondary btn-sm gap-1.5">
                            <RefreshCw size={13} /> New Conversion
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {files.map((pf) => (
                        <FileItem key={pf.id} pf={pf} color={meta.color} onRemove={handleRemove} onDownload={handleDownload} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="hidden xl:flex flex-col gap-4 w-64 flex-shrink-0">
            {/* Privacy indicator */}
            <div className="p-4 rounded-xl border"
              style={{
                backgroundColor: implemented && tool.processingMode === 'local' ? '#22c55e08' : '#3b82f608',
                borderColor: implemented && tool.processingMode === 'local' ? '#22c55e30' : '#3b82f630',
              }}
            >
              <div className="flex items-start gap-3">
                {implemented && tool.processingMode === 'local'
                  ? <WifiOff size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                  : <Shield size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
                }
                <div>
                  <p className="text-xs font-semibold mb-1"
                    style={{ color: implemented && tool.processingMode === 'local' ? '#22c55e' : '#3b82f6' }}
                  >
                    {implemented && tool.processingMode === 'local' ? 'LOCAL PROCESSING' : 'CLOUD / BACKEND'}
                  </p>
                  <p className="text-xs text-muted-cv leading-relaxed">
                    {implemented && tool.processingMode === 'local'
                      ? 'Your file stays on this device. Nothing is uploaded.'
                      : 'Processed via the configured backend service. Requires VITE_BACKEND_URL.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tool info */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold text-primary mb-3">Tool Information</p>
              <div className="space-y-2">
                {[
                  { label: 'Category', value: meta.name },
                  { label: 'Processing', value: tool.processingMode === 'local' ? 'Local (browser)' : 'Backend service' },
                  { label: 'Batch', value: tool.batchSupported ? 'Supported' : 'Not supported' },
                  { label: 'Plan', value: tool.premium ? 'Premium' : 'Free' },
                  { label: 'Status', value: tool.status === 'stable' ? 'Stable' : tool.status === 'beta' ? 'Beta' : 'Coming soon' },
                  { label: 'Engine', value: statusLabel },
                ].map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-cv flex-shrink-0">{item.label}</span>
                    <span className="text-xs font-medium text-primary text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formats */}
            {(tool.supportedInputFormats || tool.supportedOutputFormats) && (
              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold text-primary mb-3">Supported Formats</p>
                {tool.supportedInputFormats && (
                  <div className="mb-3">
                    <p className="text-2xs text-muted-cv mb-1.5 uppercase tracking-wider font-semibold">Input</p>
                    <div className="flex flex-wrap gap-1">
                      {tool.supportedInputFormats.map((fmt) => (
                        <span key={fmt} className="text-2xs px-1.5 py-0.5 rounded font-mono uppercase border"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)', color: 'var(--text-muted)', fontSize: '10px' }}
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tool.supportedOutputFormats && (
                  <div>
                    <p className="text-2xs text-muted-cv mb-1.5 uppercase tracking-wider font-semibold">Output</p>
                    <div className="flex flex-wrap gap-1">
                      {tool.supportedOutputFormats.map((fmt) => (
                        <span key={fmt} className="text-2xs px-1.5 py-0.5 rounded font-mono uppercase"
                          style={{ backgroundColor: meta.color + '15', color: meta.color, fontSize: '10px' }}
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Related tools */}
            {relatedTools.length > 0 && (
              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold text-primary mb-3">Related Tools</p>
                <div className="space-y-2">
                  {relatedTools.slice(0, 5).map((rt) => {
                    const rtMeta = CATEGORY_META[rt.category];
                    return (
                      <Link key={rt.id} to={`/tool/${rt.slug}`}
                        className="flex items-center gap-2.5 p-2 rounded-lg transition-all duration-150 group"
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 text-xs font-bold"
                          style={{ backgroundColor: rtMeta.color + '15', color: rtMeta.color }}
                        >
                          {rt.name[0]}
                        </div>
                        <span className="text-xs font-medium text-primary truncate">{rt.name}</span>
                        <ArrowRight size={11} className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: rtMeta.color }}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ToolPage;
