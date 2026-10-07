import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Search, Filter, Grid3X3, LayoutList, Star, ArrowRight,
  CheckCircle, Layers, Wifi, WifiOff, Sparkles,
} from 'lucide-react';
import {
  TOOLS, CATEGORY_META, getToolsByCategory, ToolCategory, Tool,
  searchTools,
} from '@/registry/tools';
import { useAppStore } from '@/store/app.store';

interface ToolCardProps {
  tool: Tool;
  view: 'grid' | 'list';
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, view }) => {
  const { isFavoriteTool, toggleFavoriteTool } = useAppStore();
  const meta = CATEGORY_META[tool.category];
  const isFav = isFavoriteTool(tool.slug);

  if (view === 'list') {
    return (
      <div
        className="group flex items-center gap-4 p-4 rounded-xl border transition-all duration-150"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = meta.color + '50';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <div
          className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ backgroundColor: meta.color + '15', color: meta.color }}
        >
          <span className="text-lg">{meta.id[0].toUpperCase()}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-primary">{tool.name}</span>
            <span
              className="badge text-2xs"
              style={{ backgroundColor: meta.color + '15', color: meta.color, fontSize: '10px' }}
            >
              {meta.name.replace(' Tools', '')}
            </span>
            {tool.premium && (
              <span className="badge text-2xs" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b', fontSize: '10px' }}>
                Pro
              </span>
            )}
            {tool.new && (
              <span className="badge text-2xs" style={{ backgroundColor: meta.color + '15', color: meta.color, fontSize: '10px' }}>
                New
              </span>
            )}
          </div>
          <p className="text-xs text-muted-cv truncate">{tool.description}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {tool.offlineSupported && (
            <span className="flex items-center gap-1 text-xs text-muted-cv">
              <WifiOff size={12} />
              Offline
            </span>
          )}
          {tool.batchSupported && (
            <span className="flex items-center gap-1 text-xs text-muted-cv">
              <Layers size={12} />
              Batch
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavoriteTool(tool.slug);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover-cv transition-colors"
          >
            <Star
              size={13}
              className={isFav ? 'fill-current text-warning-500' : 'text-muted-cv'}
            />
          </button>
          <Link
            to={`/tool/${tool.slug}`}
            className="btn-primary btn-sm"
          >
            Use
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = meta.color + '50';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 4px 16px ${meta.color}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 flex items-center justify-center rounded-lg"
          style={{ backgroundColor: meta.color + '15', color: meta.color }}
        >
          <span className="text-sm font-bold">{tool.name[0]}</span>
        </div>
        <div className="flex items-center gap-1">
          {tool.new && (
            <span className="badge" style={{ backgroundColor: meta.color + '15', color: meta.color, fontSize: '10px' }}>New</span>
          )}
          {tool.premium && (
            <span className="badge" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b', fontSize: '10px' }}>Pro</span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavoriteTool(tool.slug);
            }}
            className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Star size={13} className={isFav ? 'fill-current text-warning-500' : 'text-muted-cv'} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div>
        <h3 className="text-sm font-semibold text-primary mb-1">{tool.name}</h3>
        <p className="text-xs text-muted-cv leading-relaxed line-clamp-2">{tool.description}</p>
      </div>

      {/* Formats */}
      {(tool.supportedInputFormats?.length || tool.supportedOutputFormats?.length) && (
        <div className="flex flex-wrap gap-1">
          {[...(tool.supportedInputFormats || []), ...(tool.supportedOutputFormats || [])]
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 5)
            .map((fmt) => (
              <span
                key={fmt}
                className="text-2xs px-1.5 py-0.5 rounded font-mono uppercase"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--text-muted)', fontSize: '10px' }}
              >
                {fmt}
              </span>
            ))}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-2 border-t mt-auto"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          {tool.offlineSupported ? (
            <span className="flex items-center gap-1 text-2xs text-muted-cv">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 inline-block" />
              Offline
            </span>
          ) : (
            <span className="flex items-center gap-1 text-2xs text-muted-cv">
              <Wifi size={10} />
              Cloud
            </span>
          )}
          {tool.batchSupported && (
            <span className="flex items-center gap-1 text-2xs text-muted-cv">
              <Layers size={10} />
              Batch
            </span>
          )}
        </div>
        <Link
          to={`/tool/${tool.slug}`}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: meta.color }}
        >
          Use
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// All Tools Page
// ────────────────────────────────────────────────
export const ToolsPage: React.FC = () => {
  const { category } = useParams<{ category?: string }>();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filterPremium, setFilterPremium] = useState<'all' | 'free' | 'premium'>('all');
  const [filterOffline, setFilterOffline] = useState(false);

  const activeCategory = category as ToolCategory | undefined;
  const categoryMeta = activeCategory ? CATEGORY_META[activeCategory] : null;

  const allTools = useMemo(() => {
    let result = activeCategory ? getToolsByCategory(activeCategory) : TOOLS;
    if (query) result = result.filter((t) => searchTools(query).some((r) => r.id === t.id));
    if (filterPremium === 'free') result = result.filter((t) => !t.premium);
    if (filterPremium === 'premium') result = result.filter((t) => t.premium);
    if (filterOffline) result = result.filter((t) => t.offlineSupported);
    return result;
  }, [activeCategory, query, filterPremium, filterOffline]);

  const categories = Object.values(CATEGORY_META);

  return (
    <div className="pt-20 pb-16">
      {/* Page header */}
      <div
        className="border-b mb-8"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="container-app py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {categoryMeta ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="badge"
                      style={{ backgroundColor: categoryMeta.color + '15', color: categoryMeta.color }}
                    >
                      {categoryMeta.name}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">{categoryMeta.name}</h1>
                  <p className="text-secondary">{categoryMeta.description}</p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold mb-2">All Tools</h1>
                  <p className="text-secondary">
                    {TOOLS.length}+ professional tools for file conversion, editing, and analysis
                  </p>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { label: 'Tools', value: allTools.length },
                { label: 'Free', value: allTools.filter((t) => !t.premium).length },
                { label: 'Offline', value: allTools.filter((t) => t.offlineSupported).length },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold text-accent">{s.value}</div>
                  <div className="text-xs text-muted-cv">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-app flex gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-3 w-52 flex-shrink-0">
          <p className="text-label">Categories</p>
          <nav className="space-y-0.5">
            <Link
              to="/tools"
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                !activeCategory ? 'bg-accent-subtle text-accent font-medium' : 'text-secondary hover:bg-hover-cv hover:text-primary'
              }`}
            >
              <span>All Tools</span>
              <span className="text-xs text-muted-cv">{TOOLS.length}</span>
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/tools/${cat.id}`}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  activeCategory === cat.id
                    ? 'font-medium'
                    : 'text-secondary hover:bg-hover-cv hover:text-primary'
                }`}
                style={
                  activeCategory === cat.id
                    ? { backgroundColor: cat.color + '15', color: cat.color }
                    : {}
                }
              >
                <span>{cat.name.replace(' Tools', '')}</span>
                <span className="text-xs text-muted-cv">
                  {getToolsByCategory(cat.id).length}
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Filters & search bar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Search */}
            <div
              className="flex items-center gap-2 flex-1 min-w-48 h-9 px-3 rounded-lg border"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter tools..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            {/* Premium filter */}
            <div
              className="flex items-center rounded-lg border overflow-hidden flex-shrink-0"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
            >
              {(['all', 'free', 'premium'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilterPremium(opt)}
                  className={`px-3 h-9 text-xs font-medium capitalize transition-all ${
                    filterPremium === opt
                      ? 'bg-card-cv text-primary shadow-cv-sm'
                      : 'text-muted-cv hover:text-primary'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Offline filter */}
            <button
              onClick={() => setFilterOffline(!filterOffline)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-all duration-150 flex-shrink-0 ${
                filterOffline ? 'text-success-600' : 'text-muted-cv'
              }`}
              style={{
                borderColor: filterOffline ? '#22c55e50' : 'var(--border)',
                backgroundColor: filterOffline ? '#22c55e10' : 'var(--muted)',
              }}
            >
              <WifiOff size={12} />
              Offline only
            </button>

            {/* View toggle */}
            <div
              className="flex items-center rounded-lg border overflow-hidden flex-shrink-0"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
            >
              <button
                onClick={() => setView('grid')}
                className={`w-9 h-9 flex items-center justify-center transition-all ${
                  view === 'grid' ? 'bg-card-cv text-primary shadow-cv-sm' : 'text-muted-cv hover:text-primary'
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`w-9 h-9 flex items-center justify-center transition-all ${
                  view === 'list' ? 'bg-card-cv text-primary shadow-cv-sm' : 'text-muted-cv hover:text-primary'
                }`}
                aria-label="List view"
              >
                <LayoutList size={14} />
              </button>
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-cv mb-4">
            {allTools.length} tool{allTools.length !== 1 ? 's' : ''}
            {query ? ` for "${query}"` : ''}
          </p>

          {/* Tools grid/list */}
          {allTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Search size={40} style={{ color: 'var(--text-disabled)' }} />
              <div className="text-center">
                <p className="font-medium text-primary">No tools found</p>
                <p className="text-sm text-muted-cv mt-1">Try a different search or clear your filters</p>
              </div>
              <button
                onClick={() => {
                  setQuery('');
                  setFilterPremium('all');
                  setFilterOffline(false);
                }}
                className="btn-secondary btn-sm"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div
              className={
                view === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-2'
              }
            >
              {allTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} view={view} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
