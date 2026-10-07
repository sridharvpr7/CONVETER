import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, ChevronRight, Star, Share2, DownloadCloud,
  RefreshCw, Info, Shield, Cloud, WifiOff, CheckCircle2,
  AlertCircle, X, Loader2, FileText, Layers, ArrowRight,
  Sparkles, Settings, Eye, Copy, ExternalLink,
} from 'lucide-react';
import { getToolBySlug, getRelatedTools, CATEGORY_META } from '@/registry/tools';
import { useAppStore } from '@/store/app.store';
import { getToolDispatch, hasProcessor, type OptionField } from '@/lib/toolDispatch';
import type { ProcessorResult } from '@/lib/processors';

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
  // For multi-result (e.g. split PDF)
  results?: ProcessorResult[];
  outputUrl?: string;
  outputName?: string;
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

  // Multiple results (e.g. split PDF)
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
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-cv">{(pf.file.size / 1024 / 1024).toFixed(2)} MB</span>
          {pf.result?.meta?.outputSize && (
            <span className="text-xs text-muted-cv">
              → {((pf.result.meta.outputSize as number) / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
          {pf.result?.meta?.compressionRatio && (
            <span className="text-xs font-medium text-success-600">
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
            <label className="label">{field.label}</label>

            {field.type === 'select' && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {field.options.map((opt) => (
                  <button
                    key={opt.value}
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
  const { isFavoriteTool, toggleFavoriteTool } = useAppStore();

  const tool = slug ? getToolBySlug(slug) : undefined;
  const dispatch = slug ? getToolDispatch(slug) : null;
  const implemented = slug ? hasProcessor(slug) : false;

  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallState, setOverallState] = useState<ProcessingState>('idle');
  const [activeTab, setActiveTab] = useState<'upload' | 'options' | 'result'>('upload');
  const [textInput, setTextInput] = useState('');
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    // Initialize from field defaults
    const defaults: Record<string, unknown> = {};
    dispatch?.optionFields?.forEach((f) => { defaults[f.key] = f.default; });
    return defaults;
  });

  // Reset options when tool changes
  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    dispatch?.optionFields?.forEach((f) => { defaults[f.key] = f.default; });
    setOptions(defaults);
  }, [slug]);

  if (!tool) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle size={48} style={{ color: 'var(--text-disabled)' }} />
        <h1 className="text-2xl font-bold text-primary">Tool Not Found</h1>
        <p className="text-muted-cv">The tool you're looking for doesn't exist.</p>
        <Link to="/tools" className="btn-primary btn-md">Browse All Tools</Link>
      </div>
    );
  }

  const meta = CATEGORY_META[tool.category];
  const relatedTools = getRelatedTools(tool);
  const isFav = isFavoriteTool(tool.slug);
  const isTextTool = Boolean(dispatch?.textPlaceholder);
  const canRunEmptyText = ['uuid-generator', 'password-generator', 'lorem-ipsum'].includes(tool.slug);
  const completedCount = files.filter((f) => f.state === 'completed').length;
  const failedCount = files.filter((f) => f.state === 'failed').length;

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

  const handleProcess = useCallback(async (inputFiles?: ProcessingFile[]) => {
    const filesToProcess = inputFiles ?? files;
    if (filesToProcess.length === 0) return;
    setIsRunning(true);
    setOverallState('processing');
    setActiveTab('result');

    if (!dispatch) {
      const message = 'This tool is listed in the catalog, but this build does not include its processing engine yet.';
      const failedIds = new Set(filesToProcess.map((f) => f.id));
      setFiles((prev) => prev.map((f) => failedIds.has(f.id) ? { ...f, state: 'failed', progress: 0, error: message } : f));
    } else if (dispatch.multiFile) {
      // Process all files together
      const fileList = filesToProcess.map((pf) => pf.file);
      // Show progress on first file
      setFiles((prev) => prev.map((f, i) => i === 0 ? { ...f, state: 'processing', progress: 50 } : f));
      try {
        const result = await dispatch.processor(fileList, options);
        const results = Array.isArray(result) ? result : [result];
        setFiles((prev) => prev.map((f, i) => i === 0 ? {
          ...f,
          state: 'completed',
          progress: 100,
          result: results[0],
          results: results.length > 1 ? results : undefined,
        } : { ...f, state: 'completed', progress: 100 }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setFiles((prev) => prev.map((f) => ({ ...f, state: 'failed', error: msg })));
      }
    } else {
      // Process each file individually
      for (const pf of filesToProcess) {
        setFiles((prev) => prev.map((f) => f.id === pf.id ? { ...f, state: 'processing', progress: 10 } : f));
        try {
          // Animate to 80% while processing
          const progressInterval = setInterval(() => {
            setFiles((prev) => prev.map((f) => {
              if (f.id === pf.id && f.progress < 80) {
                return { ...f, progress: Math.min(f.progress + 15, 80) };
              }
              return f;
            }));
          }, 200);

          const result = await dispatch.processor([pf.file], options);
          clearInterval(progressInterval);

          const results = Array.isArray(result) ? result : null;
          setFiles((prev) => prev.map((f) => f.id === pf.id ? {
            ...f,
            state: 'completed',
            progress: 100,
            result: Array.isArray(result) ? result[0] : result,
            results: results && results.length > 1 ? results : undefined,
          } : f));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Processing failed';
          setFiles((prev) => prev.map((f) => f.id === pf.id ? {
            ...f, state: 'failed', error: msg, progress: 0,
          } : f));
        }
      }
    }

    setOverallState('completed');
    setIsRunning(false);
  }, [files, dispatch, options]);

  const handleTextProcess = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (!slug) return;
    const file = new File([textInput], `${slug}-input.txt`, { type: 'text/plain' });
    const processingFile: ProcessingFile = { id: crypto.randomUUID(), file, state: 'idle', progress: 0 };
    setFiles([processingFile]);
    void handleProcess([processingFile]);
  }, [slug, textInput, handleProcess]);

  const handleReset = () => {
    setFiles([]);
    setOverallState('idle');
    setActiveTab('upload');
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

  const acceptMap = useMemo(() => tool.supportedInputFormats?.reduce(
    (acc, fmt) => {
      const mime = fmt === 'pdf' ? 'application/pdf'
        : fmt.startsWith('jp') ? 'image/jpeg'
        : fmt === 'png' ? 'image/png'
        : fmt === 'webp' ? 'image/webp'
        : fmt === 'gif' ? 'image/gif'
        : fmt === 'zip' ? 'application/zip'
        : fmt === 'csv' ? 'text/csv'
        : fmt === 'json' ? 'application/json'
        : fmt === 'txt' ? 'text/plain'
        : fmt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/octet-stream';
      if (!acc[mime]) acc[mime] = [];
      acc[mime].push(`.${fmt}`);
      return acc;
    },
    {} as Record<string, string[]>
  ), [tool.supportedInputFormats]);

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
          {implemented && (
            <span className="ml-2 badge badge-success text-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 mr-1 inline-block" />
              Offline Ready
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
                    {tool.offlineSupported ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-success-600">
                        <WifiOff size={12} /> Processes locally on your device
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#3b82f6' }}>
                        <Cloud size={12} /> Processed securely in the cloud
                      </span>
                    )}
                    {tool.batchSupported && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-cv">
                        <Layers size={12} /> Batch supported
                      </span>
                    )}
                    {!implemented && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-cv">
                        <Sparkles size={12} /> Processing engine not included yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleFavoriteTool(tool.slug)} className="btn-secondary btn-sm gap-1.5">
                  <Star size={13} className={isFav ? 'fill-current text-warning-500' : ''} />
                  {isFav ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}
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
                  {tab === 'upload' && <Upload size={13} />}
                  {tab === 'options' && <Settings size={13} />}
                  {tab === 'result' && <Eye size={13} />}
                  {tab === 'upload' ? 'Upload Files' : tab === 'options' ? 'Options' : 'Results'}
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

            {/* Upload tab */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                {isTextTool ? (
                  <form onSubmit={handleTextProcess} className="space-y-3">
                    <label htmlFor="tool-text-input" className="label">Input</label>
                    <textarea id="tool-text-input" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={dispatch?.textPlaceholder} rows={8} className="input-lg w-full resize-y font-mono text-sm" />
                    <div className="flex items-center gap-3">
                      <button type="submit" disabled={isRunning || (!textInput.trim() && !canRunEmptyText)} className="btn-primary btn-lg gap-2" style={{ backgroundColor: meta.color, opacity: isRunning ? 0.7 : 1 }}>
                        {isRunning ? <><Loader2 size={16} className="animate-spin" />Processing...</> : <><Sparkles size={16} />{tool.name}</>}
                      </button>
                      {dispatch?.optionFields && dispatch.optionFields.length > 0 && <button type="button" onClick={() => setActiveTab('options')} className="btn-secondary btn-md gap-1.5"><Settings size={14} />Options</button>}
                    </div>
                  </form>
                ) : (
                  <UploadZone
                    onFiles={handleFiles}
                    multiple={tool.batchSupported || dispatch?.multiFile}
                    supportedFormats={tool.supportedInputFormats}
                    color={meta.color}
                    accept={acceptMap}
                  />
                )}

                {!isTextTool && files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">
                        {files.length} file{files.length !== 1 ? 's' : ''} selected
                      </p>
                      <button onClick={() => setFiles([])} className="text-xs text-muted-cv hover:text-primary transition-colors">
                        Clear all
                      </button>
                    </div>
                    {files.map((pf) => (
                      <FileItem key={pf.id} pf={pf} color={meta.color} onRemove={handleRemove} onDownload={handleDownload} />
                    ))}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleProcess()}
                        disabled={isRunning || files.length === 0}
                        className="btn-primary btn-lg gap-2"
                        style={{
                          backgroundColor: meta.color,
                          boxShadow: isRunning ? 'none' : `0 4px 16px ${meta.color}40`,
                          opacity: isRunning ? 0.7 : 1,
                        }}
                      >
                        {isRunning ? (
                          <><Loader2 size={16} className="animate-spin" />Processing...</>
                        ) : (
                          <><Sparkles size={16} />{tool.name}</>
                        )}
                      </button>
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
                {files.length > 0 && (
                  <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => { setActiveTab('upload'); handleProcess(); }}
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
                      <p className="text-sm text-muted-cv mt-1">Upload files and run the tool to see results here</p>
                    </div>
                    <button onClick={() => setActiveTab('upload')} className="btn-primary btn-md" style={{ backgroundColor: meta.color }}>
                      <Upload size={15} /> Upload Files
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
                              {failedCount > 0 && <span className="text-error-600 ml-2">{failedCount} failed</span>}
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
                backgroundColor: tool.offlineSupported ? '#22c55e08' : '#3b82f608',
                borderColor: tool.offlineSupported ? '#22c55e30' : '#3b82f630',
              }}
            >
              <div className="flex items-start gap-3">
                {tool.offlineSupported
                  ? <WifiOff size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                  : <Shield size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
                }
                <div>
                  <p className="text-xs font-semibold mb-1"
                    style={{ color: tool.offlineSupported ? '#22c55e' : '#3b82f6' }}
                  >
                    {tool.offlineSupported ? 'LOCAL PROCESSING' : 'SECURE CLOUD'}
                  </p>
                  <p className="text-xs text-muted-cv leading-relaxed">
                    {tool.offlineSupported
                      ? 'Your file stays on this device. Nothing is uploaded.'
                      : 'Temporarily uploaded, auto-deleted after processing.'}
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
                  { label: 'Processing', value: tool.offlineSupported ? 'Local' : 'Cloud' },
                  { label: 'Batch', value: tool.batchSupported ? 'Supported' : 'Not supported' },
                  { label: 'Plan', value: tool.premium ? 'Premium' : 'Free' },
                  { label: 'Status', value: tool.status === 'stable' ? 'Stable' : tool.status === 'beta' ? 'Beta' : 'Coming soon' },
                  { label: 'Engine', value: implemented ? 'Browser processor' : 'Not available in this build' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-cv">{item.label}</span>
                    <span className="text-xs font-medium text-primary">{item.value}</span>
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
