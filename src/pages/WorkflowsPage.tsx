import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Play, Trash2, Copy, Edit3, ArrowRight, ChevronRight,
  Workflow, Sparkles, Clock, Star,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  toolSlug: string;
  color: string;
}

interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  lastRun?: string;
  runCount: number;
  favorite: boolean;
  createdAt: string;
}

const DEMO_WORKFLOWS: SavedWorkflow[] = [
  {
    id: '1',
    name: 'Images to Compressed PDF',
    description: 'Convert JPG images to PDF, then compress for sharing',
    steps: [
      { id: 's1', name: 'JPG to PDF', toolSlug: 'jpg-to-pdf', color: '#ef4444' },
      { id: 's2', name: 'Compress PDF', toolSlug: 'compress-pdf', color: '#f59e0b' },
    ],
    lastRun: '2 hours ago',
    runCount: 12,
    favorite: true,
    createdAt: '2026-10-01',
  },
  {
    id: '2',
    name: 'PDF OCR to Text',
    description: 'Extract text from scanned PDFs using OCR',
    steps: [
      { id: 's1', name: 'OCR PDF', toolSlug: 'ocr-pdf', color: '#ef4444' },
      { id: 's2', name: 'PDF to Text', toolSlug: 'pdf-to-text', color: '#3b82f6' },
    ],
    lastRun: '1 day ago',
    runCount: 5,
    favorite: false,
    createdAt: '2026-10-03',
  },
  {
    id: '3',
    name: 'Bulk Image Optimizer',
    description: 'Resize and compress images in batch',
    steps: [
      { id: 's1', name: 'Image Resize', toolSlug: 'image-resize', color: '#f59e0b' },
      { id: 's2', name: 'Image Compressor', toolSlug: 'image-compressor', color: '#f59e0b' },
    ],
    lastRun: '3 days ago',
    runCount: 28,
    favorite: true,
    createdAt: '2026-09-28',
  },
];

const WORKFLOW_TEMPLATES = [
  { name: 'Scan → OCR → PDF', description: 'Camera → Edge detect → OCR → PDF', icon: '📄', steps: 4 },
  { name: 'Video → Compress → MP4', description: 'Trim video and compress for web', icon: '🎬', steps: 3 },
  { name: 'CSV → Analyze → Excel', description: 'Clean CSV data and export to Excel', icon: '📊', steps: 3 },
  { name: 'Word → PDF → Watermark', description: 'Convert Word and add watermark', icon: '📝', steps: 3 },
];

export const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState(DEMO_WORKFLOWS);
  const [activeTab, setActiveTab] = useState<'my' | 'templates'>('my');

  const toggleFav = (id: string) =>
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, favorite: !w.favorite } : w))
    );

  const deleteWorkflow = (id: string) =>
    setWorkflows((prev) => prev.filter((w) => w.id !== id));

  return (
    <div className="pt-20 pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="container-app">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">Workflows</h1>
            <p className="text-sm text-muted-cv mt-1">
              Automate multi-step file processing pipelines
            </p>
          </div>
          <button className="btn-primary btn-md gap-2">
            <Plus size={16} />
            New Workflow
          </button>
        </div>

        {/* AI Suggestion box */}
        <div
          className="flex items-start gap-4 p-4 rounded-xl border mb-8"
          style={{
            background: 'linear-gradient(135deg, var(--accent-subtle), var(--card))',
            borderColor: 'var(--accent)',
          }}
        >
          <div
            className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
          >
            <Sparkles size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary mb-1">AI Workflow Builder</p>
            <p className="text-xs text-secondary mb-3">
              Describe what you want to do and AI will build the workflow for you.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='e.g. "Convert scanned PDF to editable Word document"'
                className="input flex-1 h-8 text-xs"
              />
              <button className="btn-primary btn-sm px-4">
                <Sparkles size={13} />
                Build
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          {(['my', 'templates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === tab ? 'border-current text-accent' : 'border-transparent text-muted-cv hover:text-primary'
              }`}
              style={activeTab === tab ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
            >
              {tab === 'my' ? <Workflow size={14} /> : <Star size={14} />}
              {tab === 'my' ? 'My Workflows' : 'Templates'}
              {tab === 'my' && (
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-white text-2xs"
                  style={{ backgroundColor: 'var(--accent)', fontSize: '10px' }}
                >
                  {workflows.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* My Workflows */}
        {activeTab === 'my' && (
          <>
            {workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Workflow size={40} style={{ color: 'var(--text-disabled)' }} />
                <div className="text-center">
                  <p className="font-medium text-primary">No workflows yet</p>
                  <p className="text-sm text-muted-cv mt-1">
                    Create your first workflow or start from a template
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('templates')}
                  className="btn-primary btn-md"
                >
                  Browse Templates
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {workflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="group flex flex-col gap-4 p-4 rounded-xl border transition-all duration-200"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,74,232,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-primary mb-1">{wf.name}</h3>
                        <p className="text-xs text-muted-cv">{wf.description}</p>
                      </div>
                      <button
                        onClick={() => toggleFav(wf.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-hover-cv"
                      >
                        <Star
                          size={13}
                          className={wf.favorite ? 'fill-current text-warning-500' : 'text-muted-cv'}
                        />
                      </button>
                    </div>

                    {/* Steps pipeline */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {wf.steps.map((step, i) => (
                        <React.Fragment key={step.id}>
                          <span
                            className="text-2xs px-2 py-1 rounded font-medium"
                            style={{
                              backgroundColor: step.color + '15',
                              color: step.color,
                              fontSize: '11px',
                            }}
                          >
                            {step.name}
                          </span>
                          {i < wf.steps.length - 1 && (
                            <ChevronRight size={12} style={{ color: 'var(--text-disabled)' }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-muted-cv pt-2 border-t"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {wf.lastRun ?? 'Never run'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Play size={11} />
                          {wf.runCount} runs
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover-cv transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover-cv transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button
                          onClick={() => deleteWorkflow(wf.id)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover-cv transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button className="btn-primary btn-sm gap-1 ml-1">
                          <Play size={11} />
                          Run
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add new card */}
                <button
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed transition-all duration-200 min-h-[160px]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.backgroundColor = 'var(--accent-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Plus size={20} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-medium text-muted-cv">Create Workflow</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.name}
                className="flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="text-2xl">{tmpl.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-1">{tmpl.name}</h3>
                  <p className="text-xs text-muted-cv">{tmpl.description}</p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <span className="text-xs text-muted-cv">{tmpl.steps} steps</span>
                  <button className="flex items-center gap-1 text-xs font-medium text-accent">
                    Use template
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsPage;
