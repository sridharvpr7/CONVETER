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
  textPlaceholder?: string;
  /** If true, processor receives all files at once as an array. Otherwise called per-file. */
  multiFile?: boolean;
  /** Human-readable description of what options do */
  optionsHint?: string;
}

// ─────────────────────────────────────────────────────────
// The dispatch map
// ─────────────────────────────────────────────────────────
const dispatchMap: Record<string, ToolDispatch> = {
  'base64-encoder': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('base64-encoder', files[0], opts),
    textPlaceholder: 'Enter the text to encode or decode…',
    optionFields: [{ type: 'select', key: 'mode', label: 'Action', options: [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }], default: 'encode' }],
  },
  'regex-tester': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('regex-tester', files[0], opts),
    textPlaceholder: 'Enter sample text to test…',
    optionFields: [
      { type: 'text', key: 'pattern', label: 'Regular expression', placeholder: 'e.g. \\b\\w+\\b', default: '' },
      { type: 'text', key: 'flags', label: 'Flags', placeholder: 'g, i, m…', default: 'g' },
    ],
  },
  'diff-checker': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('diff-checker', files[0], opts),
    textPlaceholder: '{\n  "before": "old text",\n  "after": "new text"\n}',
  },
  'jwt-decoder': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('jwt-decoder', files[0], opts),
    textPlaceholder: 'Paste a JWT to decode (signature is not verified)…',
  },
  'uuid-generator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('uuid-generator', files[0], opts),
    textPlaceholder: 'Click Process to generate UUIDs…',
    optionFields: [{ type: 'number', key: 'count', label: 'Number of UUIDs', min: 1, max: 1000, default: 1 }],
  },
  'url-encoder': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('url-encoder', files[0], opts),
    textPlaceholder: 'Enter text or a URL…',
    optionFields: [{ type: 'select', key: 'mode', label: 'Action', options: [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }], default: 'encode' }],
  },
  'color-converter': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('color-converter', files[0], opts),
    textPlaceholder: 'Enter a HEX or RGB color, e.g. #4A4AE8…',
  },
  'password-generator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('password-generator', files[0], opts),
    textPlaceholder: 'Click Process to create a secure random password…',
    optionFields: [{ type: 'number', key: 'length', label: 'Password length', min: 8, max: 128, default: 20 }],
  },
  'cron-generator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('cron-generator', files[0], opts),
    textPlaceholder: 'Enter five cron fields, e.g. 0 9 * * 1-5…',
  },
  'sql-formatter': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('sql-formatter', files[0], opts),
    textPlaceholder: 'Paste a SQL query…',
  },
  'lorem-ipsum': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('lorem-ipsum', files[0], opts),
    textPlaceholder: 'Click Process to generate sample text…',
    optionFields: [{ type: 'number', key: 'count', label: 'Paragraphs', min: 1, max: 100, default: 3 }],
  },
  'emi-calculator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('emi-calculator', files[0], opts),
    textPlaceholder: 'Enter principal, annual rate (%), months. Example: 500000, 8.5, 60',
  },
  'percentage-calculator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('percentage-calculator', files[0], opts),
    textPlaceholder: 'Enter amount and percent. Example: 250, 15',
  },
  'bmi-calculator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('bmi-calculator', files[0], opts),
    textPlaceholder: 'Enter weight in kg and height in cm. Example: 70, 175',
  },
  'age-calculator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('age-calculator', files[0], opts),
    textPlaceholder: 'Enter date of birth, e.g. 1990-06-15',
  },
  'gst-calculator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('gst-calculator', files[0], opts),
    textPlaceholder: 'Enter amount and GST rate (%). Example: 1200, 18',
  },
  'sip-calculator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('sip-calculator', files[0], opts),
    textPlaceholder: 'Enter monthly investment, annual return (%), years. Example: 5000, 12, 10',
  },
  'timestamp-converter': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('timestamp-converter', files[0], opts),
    textPlaceholder: 'Enter a Unix timestamp or ISO date…',
  },
  'unit-converter': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('unit-converter', files[0], opts),
    textPlaceholder: 'Enter value, source unit, target unit. Example: 5 km mi',
  },
  'hash-generator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('hash-generator', files[0], opts),
    textPlaceholder: 'Enter text to hash…',
    optionFields: [{ type: 'select', key: 'algorithm', label: 'Algorithm', options: [{ label: 'SHA-256', value: 'SHA-256' }, { label: 'SHA-384', value: 'SHA-384' }, { label: 'SHA-512', value: 'SHA-512' }], default: 'SHA-256' }],
  },
  'markdown-preview': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('markdown-preview', files[0], opts),
    textPlaceholder: '# Heading\n\nWrite Markdown here…',
  },
  'qr-generator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('qr-generator', files[0], opts),
    textPlaceholder: 'Enter the text or URL for the QR code…',
    optionFields: [{ type: 'number', key: 'size', label: 'Image size (px)', min: 128, max: 1024, default: 512 }],
  },
  'invoice-generator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('invoice-generator', files[0], opts),
    textPlaceholder: '{\n  "invoiceNumber": "INV-001",\n  "from": "Your business",\n  "to": "Customer",\n  "currency": "INR",\n  "items": [{ "description": "Service", "quantity": 1, "unitPrice": 1000 }]\n}',
  },
  'resume-builder': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('resume-builder', files[0], opts),
    textPlaceholder: '{\n  "name": "Your Name",\n  "title": "Role",\n  "email": "you@example.com",\n  "summary": "A short profile",\n  "skills": ["Skill one", "Skill two"],\n  "experience": ["Role — Company — dates"],\n  "education": ["Degree — School"]\n}',
  },
  'business-card-generator': {
    processor: async (files, opts) => (await import('./textTools')).runTextTool('business-card-generator', files[0], opts),
    textPlaceholder: '{\n  "name": "Your Name",\n  "title": "Role",\n  "company": "Company",\n  "email": "you@example.com",\n  "phone": "+1 555 0100",\n  "website": "example.com"\n}',
  },
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

  'remove-pdf-pages': {
    processor: async (files, opts) => (await import('./processors')).removePdfPages(files[0], String(opts.pages ?? '')),
    optionFields: [{ type: 'text', key: 'pages', label: 'Pages to remove', placeholder: 'e.g. 2, 4, 5', default: '' }],
  },

  'extract-pdf-pages': {
    processor: async (files, opts) => (await import('./processors')).extractPdfPages(files[0], String(opts.pages ?? '')),
    optionFields: [{ type: 'text', key: 'pages', label: 'Pages to extract', placeholder: 'e.g. 1, 3, 5', default: '' }],
  },

  'reorder-pdf-pages': {
    processor: async (files, opts) => (await import('./processors')).reorderPdfPages(files[0], String(opts.order ?? '')),
    optionFields: [{ type: 'text', key: 'order', label: 'New page order', placeholder: 'e.g. 3, 1, 2', default: '' }],
  },

  'pdf-page-numbers': {
    processor: async (files, opts) => (await import('./processors')).addPdfPageNumbers(files[0], Number(opts.startAt ?? 1)),
    optionFields: [{ type: 'number', key: 'startAt', label: 'Start numbering at', min: 1, max: 999, default: 1 }],
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

  'pdf-to-markdown': {
    processor: async (files) => {
      const result = await (await import('./processors')).extractTextFromPdf(files[0]);
      const text = await result.blob.text();
      return { blob: new Blob([text], { type: 'text/markdown' }), filename: files[0].name.replace(/\.pdf$/i, '.md'), mimeType: 'text/markdown' };
    },
    optionsHint: 'Extracts embedded PDF text only; it does not OCR scanned pages.',
  },

  'image-crop': {
    processor: async (files, opts) => (await import('./processors')).imageCropByRatio(files[0], (opts.ratio as 'free' | '1:1' | '4:3' | '16:9') ?? '1:1'),
    optionFields: [{ type: 'select', key: 'ratio', label: 'Crop ratio', options: [{ label: 'Square (1:1)', value: '1:1' }, { label: 'Landscape (4:3)', value: '4:3' }, { label: 'Wide (16:9)', value: '16:9' }, { label: 'Original', value: 'free' }], default: '1:1' }],
  },

  'exif-remover': {
    processor: async (files) => (await import('./processors')).removeImageExif(files[0]),
    optionsHint: 'Re-encodes supported raster images to remove embedded metadata.',
  },

  'favicon-generator': {
    processor: async (files) => (await import('./processors')).makeFavicon(files[0]),
  },

  'passport-photo-maker': {
    processor: async (files) => (await import('./processors')).makePassportPhoto(files[0]),
    optionsHint: 'Creates a centered 35:45 portrait crop. It does not detect or align faces.',
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

  'zip-compressor': {
    multiFile: true,
    processor: async (files) => (await import('./processors')).createZip(files, 'archive.zip'),
  },

  'zip-extractor': {
    processor: async (files) => (await import('./processors')).extractZip(files[0]),
  },

  'batch-rename': {
    multiFile: true,
    processor: async (files, opts) => (await import('./processors')).batchRename(files, { prefix: String(opts.prefix ?? ''), suffix: String(opts.suffix ?? ''), numbered: Boolean(opts.numbered) }),
    optionFields: [
      { type: 'text', key: 'prefix', label: 'Prefix', placeholder: 'Optional', default: '' },
      { type: 'text', key: 'suffix', label: 'Suffix', placeholder: 'Optional', default: '' },
      { type: 'checkbox', key: 'numbered', label: 'Add a sequence number', default: true },
    ],
    optionsHint: 'Renamed files are bundled in a ZIP download.',
  },

  'csv-to-excel': {
    processor: async (files) => (await import('./dataTools')).csvToExcel(files[0]),
  },

  'excel-to-csv': {
    processor: async (files) => (await import('./dataTools')).excelToCsv(files[0]),
  },

  'json-to-excel': {
    processor: async (files) => (await import('./dataTools')).jsonToExcel(files[0]),
  },

  'xml-to-json': {
    processor: async (files) => (await import('./dataTools')).xmlToJson(files[0]),
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
