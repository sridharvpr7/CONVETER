import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Download, RefreshCw, Trash2, Filter, Search,
  FileText, Image, Video, Music, Table, Globe, AlertCircle,
} from 'lucide-react';
import { CATEGORY_META } from '@/registry/tools';

interface HistoryItem {
  id: string;
  fileName: string;
  toolName: string;
  toolSlug: string;
  category: string;
  date: string;
  size: string;
  resultSize?: string;
  status: 'completed' | 'failed' | 'processing';
  processingType: 'local' | 'cloud';
}

const DEMO_HISTORY: HistoryItem[] = [
  {
    id: '1', fileName: 'Annual_Report_2024.pdf', toolName: 'Compress PDF',
    toolSlug: 'compress-pdf', category: 'pdf', date: '2026-10-07 09:21', size: '4.2 MB',
    resultSize: '1.1 MB', status: 'completed', processingType: 'cloud',
  },
  {
    id: '2', fileName: 'product_photos.jpg', toolName: 'Image Compressor',
    toolSlug: 'image-compressor', category: 'image', date: '2026-10-07 07:45', size: '8.2 MB',
    resultSize: '2.4 MB', status: 'completed', processingType: 'local',
  },
  {
    id: '3', fileName: 'Invoice_Q4.docx', toolName: 'Word to PDF',
    toolSlug: 'word-to-pdf', category: 'pdf', date: '2026-10-06 18:12', size: '128 KB',
    resultSize: '234 KB', status: 'completed', processingType: 'cloud',
  },
  {
    id: '4', fileName: 'customer_data.csv', toolName: 'CSV to Excel',
    toolSlug: 'csv-to-excel', category: 'data', date: '2026-10-06 14:30', size: '2.8 MB',
    resultSize: '3.1 MB', status: 'completed', processingType: 'local',
  },
  {
    id: '5', fileName: 'corrupted_scan.pdf', toolName: 'OCR PDF',
    toolSlug: 'ocr-pdf', category: 'pdf', date: '2026-10-05 11:00', size: '14.2 MB',
    status: 'failed', processingType: 'cloud',
  },
  {
    id: '6', fileName: 'presentation.pptx', toolName: 'PDF to PowerPoint',
    toolSlug: 'pdf-to-powerpoint', category: 'pdf', date: '2026-10-05 09:45', size: '6.3 MB',
    resultSize: '5.8 MB', status: 'completed', processingType: 'cloud',
  },
];

const CATEGORY_FILTERS = ['all', 'pdf', 'image', 'document', 'data', 'video', 'audio'] as const;

const categoryIcon = (cat: string, size = 14) => {
  const props = { size };
  const m: Record<string, React.ReactNode> = {
    pdf: <FileText {...props} />,
    image: <Image {...props} />,
    document: <FileText {...props} />,
    data: <Table {...props} />,
    video: <Video {...props} />,
    audio: <Music {...props} />,
    web: <Globe {...props} />,
  };
  return m[cat] ?? <FileText {...props} />;
};

export const HistoryPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = DEMO_HISTORY.filter((h) => {
    if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
    if (query && !h.fileName.toLowerCase().includes(query.toLowerCase()) &&
        !h.toolName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  return (
    <div className="pt-20 pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="container-app">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">File History</h1>
            <p className="text-sm text-muted-cv mt-1">
              {DEMO_HISTORY.length} processed files
            </p>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-cv">{selected.length} selected</span>
              <button className="btn-secondary btn-sm gap-1.5">
                <Download size={13} /> Download
              </button>
              <button className="btn-danger btn-sm gap-1.5">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-48 h-9 px-3 rounded-lg border"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files or tools..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-3 h-8 rounded-lg text-xs font-medium capitalize transition-all duration-150"
                style={{
                  backgroundColor: categoryFilter === cat ? 'var(--accent)' : 'var(--muted)',
                  color: categoryFilter === cat ? 'white' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: categoryFilter === cat ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {cat === 'all' ? 'All' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* History table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Clock size={40} style={{ color: 'var(--text-disabled)' }} />
            <div className="text-center">
              <p className="font-medium text-primary">No history found</p>
              <p className="text-sm text-muted-cv mt-1">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {/* Table header */}
            <div className="grid gap-4 px-4 py-2.5 border-b text-2xs font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--muted)',
                color: 'var(--text-muted)',
                gridTemplateColumns: '2rem 1fr 180px 100px 100px 80px 120px',
                fontSize: '11px',
              }}
            >
              <span />
              <span>File</span>
              <span>Tool</span>
              <span>Original</span>
              <span>Result</span>
              <span>Type</span>
              <span>Actions</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map((item) => {
                const meta = CATEGORY_META[item.category as keyof typeof CATEGORY_META] ?? CATEGORY_META.pdf;
                const isSelected = selected.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className="grid items-center gap-4 px-4 py-3 transition-colors hover:bg-hover-cv"
                    style={{
                      gridTemplateColumns: '2rem 1fr 180px 100px 100px 80px 120px',
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : undefined,
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent)' }}
                    />

                    {/* File info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ backgroundColor: meta.color + '15', color: meta.color }}
                      >
                        {categoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{item.fileName}</p>
                        <p className="text-xs text-muted-cv">{item.date}</p>
                      </div>
                    </div>

                    {/* Tool */}
                    <Link
                      to={`/tool/${item.toolSlug}`}
                      className="text-xs font-medium transition-colors truncate"
                      style={{ color: meta.color }}
                    >
                      {item.toolName}
                    </Link>

                    {/* Original size */}
                    <span className="text-xs text-muted-cv font-num">{item.size}</span>

                    {/* Result size */}
                    <span className="text-xs font-num"
                      style={{ color: item.status === 'completed' ? '#22c55e' : item.status === 'failed' ? '#ef4444' : 'var(--text-muted)' }}
                    >
                      {item.status === 'completed' ? item.resultSize || '—' : item.status === 'failed' ? 'Failed' : '...'}
                    </span>

                    {/* Processing type */}
                    <span className="text-2xs flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: item.processingType === 'local' ? '#22c55e' : '#3b82f6' }}
                      />
                      {item.processingType === 'local' ? 'Local' : 'Cloud'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {item.status === 'completed' && (
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover-cv transition-colors"
                          title="Download"
                        >
                          <Download size={13} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      )}
                      {item.status === 'failed' && (
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover-cv transition-colors"
                          title="Retry"
                        >
                          <RefreshCw size={13} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      )}
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover-cv transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
