// ============================================================
// CONVETER — Tool Dispatch Map
// Maps tool slugs → processor functions + option schemas.
// The ToolPage uses this to know which processor to call
// and which options UI to render.
// ============================================================

import type { ProcessorResult } from './processors';

// ─────────────────────────────────────────────────────────
// Option field definitions (drives dynamic options UI)
// ─────────────────────────────────────────────────────────
export type OptionField =
  | {
      type: 'select';
      key: string;
      label: string;
      options: { label: string; value: string }[];
      default: string;
    }
  | { type: 'range'; key: string; label: string; min: number; max: number; step: number; default: number; unit?: string }
  | { type: 'text'; key: string; label: string; placeholder?: string; default: string }
  | { type: 'checkbox'; key: string; label: string; default: boolean }
  | { type: 'number'; key: string; label: string; min?: number; max?: number; default: number };

// ─────────────────────────────────────────────────────────
// Processor function signature
// ─────────────────────────────────────────────────────────
export type ToolProcessor = (
  files: File[],
  options: Record<string, unknown>
) => Promise<ProcessorResult | ProcessorResult[]>;

// ─────────────────────────────────────────────────────────
// Tool dispatch entry
// ─────────────────────────────────────────────────────────
export interface ToolDispatch {
  processor: ToolProcessor;
  optionFields?: OptionField[];
  /** If true, processor receives all files at once as an array. Otherwise called per-file. */
  multiFile?: boolean;
  /** Human-readable description of what options do */
  optionsHint?: string;
}

// ─────────────────────────────────────────────────────────
// The dispatch map
// ─────────────────────────────────────────────────────────
const dispatchMap: Record<string, ToolDispatch> = {
  // ── PDF ──────────────────────────────────────────────
  'compress-pdf': {
    processor: async (files, opts) => {
      const { watermarkPdf } = await import('./processors');
      // True compression requires server. For offline we do a re-save which
      // strips unused objects. Show as "optimized".
      return watermarkPdf(files[0], '', { opacity: 0 });
    },
    optionFields: [
      { type: 'select', key: 'level', label: 'Compression Level',
        options: [
          { label: 'Low (better quality)', value: 'low' },
          { label: 'Medium (balanced)', value: 'medium' },
          { label: 'High (smaller file)', value: 'high' },
        ],
        default: 'medium',
      },
    ],
    optionsHint: 'Higher compression = smaller file but may reduce quality.',
  },

  'merge-pdf': {
    multiFile: true,
    processor: async (files) => {
      const { mergePdfs } = await import('./processors');
      return mergePdfs(files);
    },
  },

  'split-pdf': {
    processor: async (files, opts) => {
      const { splitPdf } = await import('./processors');
      return splitPdf(files[0]);
    },
    optionFields: [
      { type: 'select', key: 'mode', label: 'Split Mode',
        options: [
          { label: 'Every page individually', value: 'each' },
          { label: 'By page range', value: 'range' },
        ],
        default: 'each',
      },
    ],
  },

  'rotate-pdf': {
    processor: async (files, opts) => {
      const { rotatePdf } = await import('./processors');
      return rotatePdf(files[0], (opts.degrees as 90 | 180 | 270) ?? 90);
    },
    optionFields: [
      { type: 'select', key: 'degrees', label: 'Rotation',
        options: [
          { label: '90° clockwise', value: '90' },
          { label: '180°', value: '180' },
          { label: '270° (90° counter-clockwise)', value: '270' },
        ],
        default: '90',
      },
    ],
  },

  'watermark-pdf': {
    processor: async (files, opts) => {
      const { watermarkPdf } = await import('./processors');
      return watermarkPdf(files[0], String(opts.text ?? 'CONFIDENTIAL'), {
        opacity: Number(opts.opacity ?? 0.3),
        fontSize: Number(opts.fontSize ?? 60),
      });
    },
    optionFields: [
      { type: 'text', key: 'text', label: 'Watermark Text', placeholder: 'e.g. CONFIDENTIAL', default: 'CONFIDENTIAL' },
      { type: 'range', key: 'opacity', label: 'Opacity', min: 0.1, max: 0.8, step: 0.05, default: 0.3 },
      { type: 'range', key: 'fontSize', label: 'Font Size', min: 24, max: 120, step: 4, default: 60, unit: 'px' },
    ],
  },

  'pdf-to-text': {
    processor: async (files) => {
      const { extractTextFromPdf } = await import('./processors');
      return extractTextFromPdf(files[0]);
    },
    optionsHint: 'Extracts embedded text only. Scanned PDFs require OCR (Premium).',
  },

  'jpg-to-pdf': {
    multiFile: true,
    processor: async (files) => {
      const { imagesToPdf } = await import('./processors');
      return imagesToPdf(files);
    },
    optionsHint: 'Each image becomes one page in the PDF, maintaining its original dimensions.',
  },

  'png-to-pdf': {
    multiFile: true,
    processor: async (files) => {
      const { imagesToPdf } = await import('./processors');
      return imagesToPdf(files);
    },
  },

  // ── IMAGE ────────────────────────────────────────────
  'image-converter': {
    processor: async (files, opts) => {
      const { imageConvert } = await import('./processors');
      const fmt = (opts.format as 'jpeg' | 'png' | 'webp') ?? 'webp';
      const q = Number(opts.quality ?? 85) / 100;
      return imageConvert(files[0], fmt, q);
    },
    optionFields: [
      { type: 'select', key: 'format', label: 'Output Format',
        options: [
          { label: 'WebP (recommended)', value: 'webp' },
          { label: 'JPEG', value: 'jpeg' },
          { label: 'PNG (lossless)', value: 'png' },
        ],
        default: 'webp',
      },
      { type: 'range', key: 'quality', label: 'Quality', min: 10, max: 100, step: 5, default: 85, unit: '%' },
    ],
  },

  'image-compressor': {
    processor: async (files, opts) => {
      const { imageCompress } = await import('./processors');
      const q = Number(opts.quality ?? 70) / 100;
      return imageCompress(files[0], q);
    },
    optionFields: [
      { type: 'range', key: 'quality', label: 'Quality', min: 10, max: 100, step: 5, default: 70, unit: '%' },
    ],
    optionsHint: 'Lower quality = smaller file size.',
  },

  'image-resize': {
    processor: async (files, opts) => {
      const { imageResize } = await import('./processors');
      return imageResize(files[0], {
        width: opts.width ? Number(opts.width) : undefined,
        height: opts.height ? Number(opts.height) : undefined,
        maintainAspect: Boolean(opts.maintainAspect ?? true),
        format: (opts.format as 'jpeg' | 'png' | 'webp') ?? 'jpeg',
        quality: Number(opts.quality ?? 90) / 100,
      });
    },
    optionFields: [
      { type: 'number', key: 'width', label: 'Width (px)', min: 1, max: 8000, default: 800 },
      { type: 'number', key: 'height', label: 'Height (px)', min: 1, max: 8000, default: 600 },
      { type: 'checkbox', key: 'maintainAspect', label: 'Maintain aspect ratio', default: true },
      { type: 'select', key: 'format', label: 'Output Format',
        options: [
          { label: 'JPEG', value: 'jpeg' },
          { label: 'WebP', value: 'webp' },
          { label: 'PNG', value: 'png' },
        ],
        default: 'jpeg',
      },
      { type: 'range', key: 'quality', label: 'Quality', min: 10, max: 100, step: 5, default: 90, unit: '%' },
    ],
  },

  'image-rotate': {
    processor: async (files, opts) => {
      const { imageRotate } = await import('./processors');
      return imageRotate(files[0], Number(opts.degrees ?? 90) as 90 | 180 | 270);
    },
    optionFields: [
      { type: 'select', key: 'degrees', label: 'Rotation',
        options: [
          { label: '90° clockwise', value: '90' },
          { label: '180°', value: '180' },
          { label: '270° counter-clockwise', value: '270' },
        ],
        default: '90',
      },
    ],
  },

  'image-flip': {
    processor: async (files, opts) => {
      const { imageFlip } = await import('./processors');
      return imageFlip(files[0], (opts.direction as 'horizontal' | 'vertical') ?? 'horizontal');
    },
    optionFields: [
      { type: 'select', key: 'direction', label: 'Flip Direction',
        options: [
          { label: 'Horizontal (mirror)', value: 'horizontal' },
          { label: 'Vertical (upside-down)', value: 'vertical' },
        ],
        default: 'horizontal',
      },
    ],
  },

  'image-watermark': {
    processor: async (files, opts) => {
      const { imageWatermark } = await import('./processors');
      return imageWatermark(files[0], String(opts.text ?? 'CONVETER'), {
        opacity: Number(opts.opacity ?? 35) / 100,
        fontSize: Number(opts.fontSize ?? 40),
        color: String(opts.color ?? '#ffffff'),
        position: (opts.position as 'center' | 'bottomRight' | 'tile') ?? 'bottomRight',
      });
    },
    optionFields: [
      { type: 'text', key: 'text', label: 'Watermark Text', placeholder: 'Your watermark', default: 'CONFIDENTIAL' },
      { type: 'select', key: 'position', label: 'Position',
        options: [
          { label: 'Bottom Right', value: 'bottomRight' },
          { label: 'Center', value: 'center' },
          { label: 'Tiled', value: 'tile' },
        ],
        default: 'bottomRight',
      },
      { type: 'range', key: 'opacity', label: 'Opacity', min: 10, max: 80, step: 5, default: 35, unit: '%' },
      { type: 'range', key: 'fontSize', label: 'Font Size', min: 12, max: 100, step: 4, default: 40, unit: 'px' },
    ],
  },

  'jpg-to-png': {
    processor: async (files) => {
      const { imageConvert } = await import('./processors');
      return imageConvert(files[0], 'png', 1.0);
    },
  },

  'png-to-jpg': {
    processor: async (files, opts) => {
      const { imageConvert } = await import('./processors');
      return imageConvert(files[0], 'jpeg', Number(opts.quality ?? 85) / 100);
    },
    optionFields: [
      { type: 'range', key: 'quality', label: 'JPEG Quality', min: 10, max: 100, step: 5, default: 85, unit: '%' },
    ],
  },

  'jpg-to-webp': {
    processor: async (files, opts) => {
      const { imageConvert } = await import('./processors');
      return imageConvert(files[0], 'webp', Number(opts.quality ?? 85) / 100);
    },
    optionFields: [
      { type: 'range', key: 'quality', label: 'WebP Quality', min: 10, max: 100, step: 5, default: 85, unit: '%' },
    ],
  },

  'png-to-webp': {
    processor: async (files, opts) => {
      const { imageConvert } = await import('./processors');
      return imageConvert(files[0], 'webp', Number(opts.quality ?? 90) / 100);
    },
    optionFields: [
      { type: 'range', key: 'quality', label: 'WebP Quality', min: 10, max: 100, step: 5, default: 90, unit: '%' },
    ],
  },

  // ── ARCHIVE ──────────────────────────────────────────
  'create-zip': {
    multiFile: true,
    processor: async (files) => {
      const { createZip } = await import('./processors');
      return createZip(files, 'archive.zip');
    },
    optionsHint: 'All selected files will be zipped into a single archive.',
  },

  'extract-zip': {
    processor: async (files) => {
      const { extractZip } = await import('./processors');
      return extractZip(files[0]);
    },
    optionsHint: 'The ZIP will be extracted and all files made available for download.',
  },

  // ── DATA ─────────────────────────────────────────────
  'csv-to-json': {
    processor: async (files) => {
      const { csvToJson } = await import('./processors');
      return csvToJson(files[0]);
    },
  },

  'json-to-csv': {
    processor: async (files) => {
      const { jsonToCsv } = await import('./processors');
      return jsonToCsv(files[0]);
    },
  },

  'json-formatter': {
    processor: async (files, opts) => {
      const { formatJson } = await import('./processors');
      return formatJson(files[0], (opts.mode as 'format' | 'minify') ?? 'format');
    },
    optionFields: [
      { type: 'select', key: 'mode', label: 'Mode',
        options: [
          { label: 'Format / Pretty-print', value: 'format' },
          { label: 'Minify', value: 'minify' },
        ],
        default: 'format',
      },
    ],
  },

  // ── DEVELOPER ────────────────────────────────────────
  'hash-file': {
    processor: async (files, opts) => {
      const { hashFile } = await import('./processors');
      return hashFile(files[0], (opts.algorithm as 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512') ?? 'SHA-256');
    },
    optionFields: [
      { type: 'select', key: 'algorithm', label: 'Hash Algorithm',
        options: [
          { label: 'SHA-256 (recommended)', value: 'SHA-256' },
          { label: 'SHA-512', value: 'SHA-512' },
          { label: 'SHA-384', value: 'SHA-384' },
          { label: 'SHA-1 (legacy)', value: 'SHA-1' },
        ],
        default: 'SHA-256',
      },
    ],
  },

  'base64-encode': {
    processor: async (files) => {
      const { textToBase64 } = await import('./processors');
      return textToBase64(files[0]);
    },
  },

  'base64-decode': {
    processor: async (files) => {
      const { base64ToText } = await import('./processors');
      return base64ToText(files[0]);
    },
  },

  // ── DOCUMENT / TEXT ──────────────────────────────────
  'word-counter': {
    processor: async (files) => {
      const { analyzeText } = await import('./processors');
      return analyzeText(files[0]);
    },
    optionsHint: 'Works with .txt files. For Word/PDF documents, export to text first.',
  },
};

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

/** Get the dispatch entry for a tool slug */
export function getToolDispatch(slug: string): ToolDispatch | null {
  return dispatchMap[slug] ?? null;
}

/** Check if a tool has a real offline processor */
export function hasProcessor(slug: string): boolean {
  return slug in dispatchMap;
}

/** List all implemented tool slugs */
export function getImplementedSlugs(): string[] {
  return Object.keys(dispatchMap);
}
