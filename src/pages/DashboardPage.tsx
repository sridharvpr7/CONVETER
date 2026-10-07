import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, Star, Workflow, HardDrive, BarChart3,
  ArrowRight, Plus, Zap, WifiOff, Cloud,
} from 'lucide-react';
import { getPopularTools, CATEGORY_META } from '@/registry/tools';

const RECENT_FILES = [
  { name: 'Annual_Report_2024.pdf', tool: 'Compress PDF', date: '2h ago', size: '4.2 MB → 1.1 MB', status: 'completed', type: 'pdf' },
  { name: 'product_photos.zip', tool: 'Image Compressor', date: '5h ago', size: '82 MB → 34 MB', status: 'completed', type: 'image' },
  { name: 'Invoice_Nov2024.docx', tool: 'Word to PDF', date: 'Yesterday', size: '128 KB', status: 'completed', type: 'document' },
  { name: 'customer_data.csv', tool: 'CSV to Excel', date: '2 days ago', size: '2.8 MB', status: 'completed', type: 'data' },
];

const SAVED_WORKFLOWS = [
  { name: 'Image → Compress → PDF', steps: 3, lastRun: '1 day ago' },
  { name: 'PDF → OCR → Translate', steps: 3, lastRun: '3 days ago' },
  { name: 'Video → Compress → MP4', steps: 2, lastRun: '1 week ago' },
];

const STAT_CARDS = [
  { label: 'Files Processed', value: '142', change: '+12 this week', icon: <FileText size={18} />, color: '#5b6af8' },
  { label: 'Storage Used', value: '1.2 GB', change: 'of 5 GB', icon: <HardDrive size={18} />, color: '#10b981' },
  { label: 'Offline Operations', value: '98', change: '69% of total', icon: <WifiOff size={18} />, color: '#22c55e' },
  { label: 'Cloud Operations', value: '44', change: '31% of total', icon: <Cloud size={18} />, color: '#3b82f6' },
];

export const DashboardPage: React.FC = () => {
  const favoriteTools = getPopularTools(6);

  return (
    <div className="pt-20 pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="container-app">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
            <p className="text-sm text-muted-cv mt-1">Welcome back! Here's what's happening.</p>
          </div>
          <Link to="/tools" className="btn-primary btn-md gap-2">
            <Plus size={16} />
            New Conversion
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-xl border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: card.color + '15', color: card.color }}
                >
                  {card.icon}
                </div>
              </div>
              <div className="text-2xl font-bold font-num text-primary">{card.value}</div>
              <div className="text-xs text-muted-cv mt-1">{card.label}</div>
              <div className="text-xs mt-0.5" style={{ color: card.color }}>{card.change}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent files */}
          <div
            className="lg:col-span-2 rounded-xl border"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-sm font-semibold text-primary">Recent Files</h2>
              </div>
              <Link to="/history" className="text-xs text-accent hover:underline">View all</Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {RECENT_FILES.map((file, idx) => {
                const color = { pdf: '#ef4444', image: '#f59e0b', document: '#3b82f6', data: '#10b981' }[file.type] || '#5b6af8';
                return (
                  <div key={idx} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: color + '15', color }}
                    >
                      <FileText size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-cv">{file.tool}</span>
                        <span className="text-xs text-muted-cv">·</span>
                        <span className="text-xs text-muted-cv">{file.size}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-cv">{file.date}</span>
                      <span className="w-2 h-2 rounded-full bg-success-500 inline-block" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Workflows */}
            <div
              className="rounded-xl border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Workflow size={16} style={{ color: 'var(--text-muted)' }} />
                  <h2 className="text-sm font-semibold text-primary">Saved Workflows</h2>
                </div>
                <Link to="/workflows" className="text-xs text-accent hover:underline">Manage</Link>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {SAVED_WORKFLOWS.map((wf, idx) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-xs font-medium text-primary">{wf.name}</p>
                      <p className="text-xs text-muted-cv mt-0.5">{wf.steps} steps · {wf.lastRun}</p>
                    </div>
                    <button className="btn-ghost btn-sm">
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <Link to="/workflows" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                    <Plus size={12} />
                    Create workflow
                  </Link>
                </div>
              </div>
            </div>

            {/* Favorite tools */}
            <div
              className="rounded-xl border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <Star size={16} style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-sm font-semibold text-primary">Quick Access</h2>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {favoriteTools.map((tool) => {
                  const meta = CATEGORY_META[tool.category];
                  return (
                    <Link
                      key={tool.id}
                      to={`/tool/${tool.slug}`}
                      className="flex items-center gap-2 p-2 rounded-lg transition-all duration-150"
                      style={{ backgroundColor: 'var(--muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = meta.color + '12';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--muted)';
                      }}
                    >
                      <div
                        className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0"
                        style={{ backgroundColor: meta.color + '20', color: meta.color }}
                      >
                        <span className="text-xs font-bold">{tool.name[0]}</span>
                      </div>
                      <span className="text-xs font-medium text-primary truncate">{tool.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Premium upgrade card */}
            <div
              className="p-4 rounded-xl border"
              style={{
                background: 'linear-gradient(135deg, var(--accent-subtle) 0%, var(--card) 100%)',
                borderColor: 'var(--accent)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Free Plan</span>
              </div>
              <p className="text-xs text-secondary mb-3">
                Upgrade to Premium for larger files, AI tools, and batch processing.
              </p>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-cv mb-1">
                  <span>Daily jobs</span>
                  <span>4 / 5 used</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '80%', backgroundColor: '#f59e0b' }} />
                </div>
              </div>
              <Link to="/pricing" className="btn-primary btn-sm w-full justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
