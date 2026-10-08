// ============================================================
// CONVETER — Web Tool Processors
//
// These tools fetch external URLs. To prevent SSRF attacks and
// browser CORS restrictions, requests MUST go through the
// backend proxy (VITE_BACKEND_URL env var).
//
// If VITE_BACKEND_URL is not set the tools display a clear
// "Backend not configured" error instead of silently failing
// or using client-side fetches.
//
// Backend requirements:
//   POST /api/web/fetch     — fetch URL, return text/html
//   POST /api/web/seo       — SEO analysis of URL
//   POST /api/web/scrape    — structured content extraction
//   POST /api/web/tables    — extract HTML tables
//
// SSRF protections that MUST be implemented in the backend:
//   - Block private/loopback IP ranges (RFC 1918, ::1, etc.)
//   - 10-second connect timeout, 30-second total timeout
//   - 5 MB response size limit
//   - Rate-limit per IP (10 req/min)
//   - Respect robots.txt (log warning, but allow override)
//   - Allowlist Content-Type (text/html, text/plain, application/json)
// ============================================================

import type { ProcessorResult } from './processors';
import { ProcessorError } from './processors';

function getBackendUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL as string | undefined;
  if (!url) {
    throw new ProcessorError(
      'Web tools require the CONVETER backend service. ' +
      'Set VITE_BACKEND_URL to your backend URL in Render (or .env.local for development). ' +
      'See README.md → Backend Setup for full instructions.',
      'BACKEND_NOT_CONFIGURED'
    );
  }
  return url.replace(/\/$/, '');
}

function validateUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new ProcessorError('Enter a URL.', 'NO_URL');
  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new ProcessorError(`"${trimmed}" is not a valid URL.`, 'INVALID_URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ProcessorError('Only http:// and https:// URLs are supported.', 'INVALID_PROTOCOL');
  }
  return url.toString();
}

async function callBackend<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const base = getBackendUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProcessorError('Request timed out (45s). The URL may be slow or unreachable.', 'TIMEOUT');
    }
    throw new ProcessorError(
      `Could not reach the backend at ${base}. Is it running? Error: ${String(err)}`,
      'BACKEND_UNREACHABLE'
    );
  }

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error ?? ''; } catch { /* ignore */ }
    throw new ProcessorError(
      `Backend error (HTTP ${response.status}): ${detail || response.statusText}`,
      'BACKEND_ERROR'
    );
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────
// URL Scraper — extract page text content
// ─────────────────────────────────────────────────────────
export async function scrapeUrl(
  url: string,
  options: { format?: 'text' | 'markdown' | 'html' } = {}
): Promise<ProcessorResult> {
  const validated = validateUrl(url);
  const { format = 'text' } = options;

  const data = await callBackend<{ content: string; title: string; url: string }>(
    '/api/web/scrape',
    { url: validated, format }
  );

  const ext = format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt';
  const mimeType = format === 'html' ? 'text/html' : format === 'markdown' ? 'text/markdown' : 'text/plain';
  const hostname = new URL(validated).hostname.replace(/^www\./, '');
  const filename = `${hostname}_scraped.${ext}`;
  const blob = new Blob([data.content], { type: mimeType });

  return {
    blob,
    filename,
    mimeType,
    meta: { url: validated, title: data.title, format, outputSize: blob.size },
  };
}

// ─────────────────────────────────────────────────────────
// Webpage to PDF (HTML → PDF via headless render on backend)
// ─────────────────────────────────────────────────────────
export async function webpageToPdf(url: string): Promise<ProcessorResult> {
  const validated = validateUrl(url);
  const base = getBackendUrl();

  let response: Response;
  try {
    response = await fetch(`${base}/api/web/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: validated }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new ProcessorError(`Backend unreachable: ${String(err)}`, 'BACKEND_UNREACHABLE');
  }

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error ?? ''; } catch { /* ignore */ }
    throw new ProcessorError(`Backend error (HTTP ${response.status}): ${detail}`, 'BACKEND_ERROR');
  }

  const blob = await response.blob();
  const hostname = new URL(validated).hostname.replace(/^www\./, '');

  return {
    blob,
    filename: `${hostname}.pdf`,
    mimeType: 'application/pdf',
    meta: { url: validated, outputSize: blob.size },
  };
}

// ─────────────────────────────────────────────────────────
// Webpage to Markdown
// ─────────────────────────────────────────────────────────
export async function webpageToMarkdown(url: string): Promise<ProcessorResult> {
  return scrapeUrl(url, { format: 'markdown' });
}

// ─────────────────────────────────────────────────────────
// Table Scraper — extract HTML tables from a page
// ─────────────────────────────────────────────────────────
export async function scrapeTables(
  url: string,
  options: { outputFormat?: 'csv' | 'xlsx' } = {}
): Promise<ProcessorResult> {
  const validated = validateUrl(url);
  const { outputFormat = 'csv' } = options;

  const data = await callBackend<{ tables: string[][][] }>(
    '/api/web/tables',
    { url: validated }
  );

  if (!data.tables || data.tables.length === 0) {
    throw new ProcessorError(
      'No HTML tables found on this page. The page may require JavaScript to render.',
      'NO_TABLES'
    );
  }

  const hostname = new URL(validated).hostname.replace(/^www\./, '');

  if (outputFormat === 'csv') {
    const csvBlocks = data.tables.map((table, i) => {
      const header = `# Table ${i + 1}\n`;
      const rows = table.map((row) =>
        row.map((cell) => (cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
      ).join('\n');
      return header + rows;
    });
    const csv = csvBlocks.join('\n\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    return {
      blob,
      filename: `${hostname}_tables.csv`,
      mimeType: 'text/csv',
      meta: { tablesFound: data.tables.length, outputSize: blob.size },
    };
  }

  // XLSX output
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  data.tables.forEach((table, i) => {
    const sheet = XLSX.utils.aoa_to_sheet(table);
    XLSX.utils.book_append_sheet(workbook, sheet, `Table ${i + 1}`);
  });
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return {
    blob,
    filename: `${hostname}_tables.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    meta: { tablesFound: data.tables.length, outputSize: blob.size },
  };
}

// ─────────────────────────────────────────────────────────
// SEO Analyzer
// ─────────────────────────────────────────────────────────
export interface SeoAnalysisResult {
  url: string;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  h1Tags: string[];
  h2Tags: string[];
  canonicalUrl: string;
  robotsMeta: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  openGraphPresent: boolean;
  twitterCardPresent: boolean;
  structuredDataCount: number;
  internalLinks: number;
  externalLinks: number;
  imagesMissingAlt: number;
  totalImages: number;
  wordCount: number;
  issues: { severity: 'error' | 'warning' | 'info'; message: string }[];
}

export async function analyzeSeo(url: string): Promise<{ result: SeoAnalysisResult; blob: Blob; filename: string }> {
  const validated = validateUrl(url);
  const data = await callBackend<SeoAnalysisResult>('/api/web/seo', { url: validated });

  // Also produce a plain-text report for download
  const report = formatSeoReport(data);
  const blob = new Blob([report], { type: 'text/plain' });
  const hostname = new URL(validated).hostname.replace(/^www\./, '');
  return { result: data, blob, filename: `${hostname}_seo_report.txt` };
}

function formatSeoReport(r: SeoAnalysisResult): string {
  const lines = [
    `SEO ANALYSIS — ${r.url}`,
    '═'.repeat(60),
    '',
    'TITLE',
    `  "${r.title}"`,
    `  Length: ${r.titleLength} chars ${r.titleLength < 50 ? '(too short)' : r.titleLength > 60 ? '(too long)' : '(ok)'}`,
    '',
    'META DESCRIPTION',
    `  "${r.metaDescription}"`,
    `  Length: ${r.metaDescriptionLength} chars ${r.metaDescriptionLength < 120 ? '(too short)' : r.metaDescriptionLength > 160 ? '(too long)' : '(ok)'}`,
    '',
    'HEADINGS',
    `  H1: ${r.h1Tags.length} found ${r.h1Tags.length !== 1 ? '(should be exactly 1)' : '(ok)'}`,
    ...r.h1Tags.map((h) => `    "${h}"`),
    `  H2 count: ${r.h2Tags.length}`,
    '',
    'STRUCTURED DATA',
    `  Schema.org items: ${r.structuredDataCount}`,
    '',
    'SOCIAL',
    `  OpenGraph: ${r.openGraphPresent ? 'present' : 'missing'}`,
    `  Twitter Card: ${r.twitterCardPresent ? 'present' : 'missing'}`,
    '',
    'LINKS',
    `  Internal: ${r.internalLinks}   External: ${r.externalLinks}`,
    '',
    'IMAGES',
    `  Total: ${r.totalImages}   Missing alt: ${r.imagesMissingAlt}`,
    '',
    'CONTENT',
    `  Word count: ${r.wordCount}`,
    '',
    'ISSUES',
    ...(r.issues.length
      ? r.issues.map((issue) => `  [${issue.severity.toUpperCase()}] ${issue.message}`)
      : ['  No issues found.']),
  ];
  return lines.join('\n');
}
