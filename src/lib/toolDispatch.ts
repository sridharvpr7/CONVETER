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
  | { type: 'number'; key: string; label: string; min?: number; max?: number; default: number }
  | { type: 'password'; key: string; label: string; placeholder?: string; default: string }
  | { type: 'textarea'; key: string; label: string; placeholder?: string; default: string; rows?: number };

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
  /** 'url' = show URL input instead of file upload; 'signature' = show signature pad; 'camera' = show camera capture */
  inputMode?: 'url' | 'signature' | 'camera' | 'url-or-file';
}

// ─────────────────────────────────────────────────────────
// The dispatch map
// ─────────────────────────────────────────────────────────
const dispatchMap: Record<string, ToolDispatch> = {
  // ── TEXT / DEVELOPER ──────────────────────────────────
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

  // ── COLOR PICKER ──────────────────────────────────────
  'color-picker': {
    processor: async (files, opts) => {
      const { runTextTool } = await import('./textTools');
      return runTextTool('color-converter', files[0], opts);
    },
    textPlaceholder: 'Enter a HEX color (e.g. #4A4AE8), RGB (e.g. rgb(74,74,232)), or HSL…',
    optionsHint: 'Returns the color in HEX, RGB, and HSL formats.',
  },

  // ── PDF ──────────────────────────────────────────────
  'compress-pdf': {
    processor: async (files, opts) => {
      const { watermarkPdf } = await import('./processors');
      // Re-save strips unused objects; show actual output size vs input
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
    optionsHint: 'Browser-side compression re-saves the PDF and strips unused objects. Deep image compression requires the backend service.',
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
    optionsHint: 'Extracts embedded text only. Scanned PDFs require OCR (Premium — needs backend).',
  },

  'pdf-to-markdown': {
    processor: async (files) => {
      const result = await (await import('./processors')).extractTextFromPdf(files[0]);
      const text = await result.blob.text();
      return { blob: new Blob([text], { type: 'text/markdown' }), filename: files[0].name.replace(/\.pdf$/i, '.md'), mimeType: 'text/markdown' };
    },
    optionsHint: 'Extracts embedded PDF text only; it does not OCR scanned pages.',
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

  // NEW PDF TOOLS
  'pdf-to-jpg': {
    processor: async (files, opts) => {
      const { pdfToImages } = await import('./advancedPdfTools');
      return pdfToImages(files[0], {
        format: (opts.format as 'jpeg' | 'png') ?? 'jpeg',
        quality: Number(opts.quality ?? 85) / 100,
        dpi: Number(opts.dpi ?? 150),
      });
    },
    optionFields: [
      { type: 'select', key: 'format', label: 'Image Format',
        options: [{ label: 'JPEG', value: 'jpeg' }, { label: 'PNG (lossless)', value: 'png' }],
        default: 'jpeg',
      },
      { type: 'range', key: 'quality', label: 'JPEG Quality', min: 40, max: 100, step: 5, default: 85, unit: '%' },
      { type: 'select', key: 'dpi', label: 'Resolution',
        options: [{ label: '72 DPI (web)', value: '72' }, { label: '150 DPI (balanced)', value: '150' }, { label: '300 DPI (print)', value: '300' }],
        default: '150',
      },
    ],
    optionsHint: 'Renders each PDF page as an image. Requires internet (loads pdf.js from CDN). Results are bundled as individual files.',
  },

  'protect-pdf': {
    processor: async (files, opts) => {
      const { protectPdf } = await import('./advancedPdfTools');
      return protectPdf(files[0], {
        userPassword: String(opts.userPassword ?? ''),
        ownerPassword: String(opts.ownerPassword ?? ''),
        allowPrinting: opts.allowPrinting !== false,
        allowCopying: Boolean(opts.allowCopying ?? false),
      });
    },
    optionFields: [
      { type: 'password', key: 'userPassword', label: 'Open Password (required)', placeholder: 'Password to open the PDF', default: '' },
      { type: 'password', key: 'ownerPassword', label: 'Owner Password (optional)', placeholder: 'Leave blank to use open password', default: '' },
      { type: 'checkbox', key: 'allowPrinting', label: 'Allow printing', default: true },
      { type: 'checkbox', key: 'allowCopying', label: 'Allow text copying', default: false },
    ],
    optionsHint: 'Uses RC4-128 encryption — standard PDF password protection compatible with all PDF readers.',
  },

  'unlock-pdf': {
    processor: async (files, opts) => {
      const { unlockPdf } = await import('./advancedPdfTools');
      return unlockPdf(files[0], String(opts.password ?? ''));
    },
    optionFields: [
      { type: 'password', key: 'password', label: 'PDF Password', placeholder: 'Enter the PDF password to unlock it', default: '' },
    ],
    optionsHint: 'Enter the password you set when protecting the PDF. Without the correct password the file cannot be unlocked.',
  },

  'sign-pdf': {
    inputMode: 'signature',
    processor: async (files, opts) => {
      const { signPdf } = await import('./advancedPdfTools');
      return signPdf(files[0], {
        signatureDataUrl: String(opts.signatureDataUrl ?? ''),
        page: opts.page ? Number(opts.page) : undefined,
        x: Number(opts.x ?? 50),
        y: Number(opts.y ?? 10),
        scalePercent: Number(opts.scalePercent ?? 40),
      });
    },
    optionFields: [
      { type: 'number', key: 'page', label: 'Page number (0 = last page)', min: 0, max: 9999, default: 0 },
      { type: 'range', key: 'x', label: 'Horizontal position', min: 0, max: 100, step: 5, default: 50, unit: '%' },
      { type: 'range', key: 'y', label: 'Vertical position (from bottom)', min: 0, max: 100, step: 5, default: 10, unit: '%' },
      { type: 'range', key: 'scalePercent', label: 'Signature width', min: 10, max: 80, step: 5, default: 40, unit: '% of page' },
    ],
    optionsHint: 'Draw your signature in the pad above, then set the placement options and click Process.',
  },

  'redact-pdf': {
    processor: async (files, opts) => {
      const { redactPdf } = await import('./advancedPdfTools');
      const terms = String(opts.terms ?? '').split('\n').map((t) => t.trim()).filter(Boolean);
      return redactPdf(files[0], { terms, caseSensitive: Boolean(opts.caseSensitive) });
    },
    optionFields: [
      { type: 'textarea', key: 'terms', label: 'Terms to redact (one per line)', placeholder: 'John Smith\nSSN: 123-45-6789\nconfidential', default: '', rows: 6 },
      { type: 'checkbox', key: 'caseSensitive', label: 'Case-sensitive matching', default: false },
    ],
    optionsHint: 'Removes matched text from the content stream and covers the area with a black rectangle. For forensic-grade redaction, configure the backend service.',
  },

  'compare-pdf': {
    multiFile: true,
    processor: async (files) => {
      const { comparePdfs } = await import('./advancedPdfTools');
      if (files.length < 2) throw new Error('Upload exactly two PDF files to compare.');
      return comparePdfs(files[0], files[1]);
    },
    optionsHint: 'Upload two PDF files. The comparison extracts embedded text and reports differences. Visual layout differences are not detected.',
  },

  'repair-pdf': {
    processor: async (files) => {
      const { repairPdf } = await import('./advancedPdfTools');
      return repairPdf(files[0]);
    },
    optionsHint: 'Attempts to reload and re-save the PDF, fixing broken cross-reference tables. Severely corrupted files may require the backend service.',
  },

  'ocr-pdf': {
    processor: async (files, opts) => {
      const { ocrPdf } = await import('./aiTools');
      return ocrPdf(files[0], {
        language: String(opts.language ?? 'eng'),
        outputFormat: (opts.outputFormat as 'pdf' | 'txt') ?? 'txt',
      });
    },
    optionFields: [
      { type: 'select', key: 'language', label: 'Document Language',
        options: [
          { label: 'English', value: 'eng' },
          { label: 'French', value: 'fra' },
          { label: 'German', value: 'deu' },
          { label: 'Spanish', value: 'spa' },
          { label: 'Italian', value: 'ita' },
          { label: 'Portuguese', value: 'por' },
          { label: 'Chinese (Simplified)', value: 'chi_sim' },
          { label: 'Japanese', value: 'jpn' },
          { label: 'Arabic', value: 'ara' },
          { label: 'Hindi', value: 'hin' },
        ],
        default: 'eng',
      },
      { type: 'select', key: 'outputFormat', label: 'Output Format',
        options: [{ label: 'Text (.txt)', value: 'txt' }, { label: 'Searchable PDF', value: 'pdf' }],
        default: 'txt',
      },
    ],
    optionsHint: 'Requires the CONVETER backend with Tesseract or an OCR provider configured.',
  },

  'pdf-to-word': {
    processor: async (files) => {
      const { pdfToWord } = await import('./advancedPdfTools');
      return pdfToWord(files[0]);
    },
    optionsHint: 'Requires the CONVETER backend service. Set VITE_BACKEND_URL in Render.',
  },

  'pdf-to-excel': {
    processor: async (files, opts) => {
      const { extractPdfTables } = await import('./advancedPdfTools');
      return extractPdfTables(files[0], {
        outputFormat: (opts.outputFormat as 'csv' | 'xlsx') ?? 'xlsx',
      });
    },
    optionFields: [
      { type: 'select', key: 'outputFormat', label: 'Output Format',
        options: [{ label: 'Excel (.xlsx)', value: 'xlsx' }, { label: 'CSV', value: 'csv' }],
        default: 'xlsx',
      },
    ],
    optionsHint: 'Uses heuristic text extraction. For complex PDF tables, configure the backend for server-side extraction.',
  },

  'pdf-to-powerpoint': {
    processor: async (files) => {
      const { pdfToPowerPoint } = await import('./advancedPdfTools');
      return pdfToPowerPoint(files[0]);
    },
    optionsHint: 'Requires the CONVETER backend service. Set VITE_BACKEND_URL in Render.',
  },

  'ai-pdf-summarizer': {
    processor: async (files, opts) => {
      const { aiSummarize } = await import('./aiTools');
      return aiSummarize(files[0], {
        style: (opts.style as 'concise' | 'detailed' | 'bullet') ?? 'concise',
        language: String(opts.language ?? 'English'),
      });
    },
    optionFields: [
      { type: 'select', key: 'style', label: 'Summary Style',
        options: [
          { label: 'Concise (1 paragraph)', value: 'concise' },
          { label: 'Detailed (multiple paragraphs)', value: 'detailed' },
          { label: 'Bullet points', value: 'bullet' },
        ],
        default: 'concise',
      },
      { type: 'text', key: 'language', label: 'Output Language', placeholder: 'e.g. English, Spanish, French', default: 'English' },
    ],
    optionsHint: 'Requires the CONVETER backend with an AI provider (OpenAI, Anthropic, or Gemini) configured.',
  },

  'ask-pdf': {
    processor: async (files, opts) => {
      const { askPdf } = await import('./aiTools');
      return askPdf(files[0], String(opts.question ?? ''));
    },
    optionFields: [
      { type: 'textarea', key: 'question', label: 'Your question', placeholder: 'What is the main topic of this document?', default: '', rows: 3 },
    ],
    optionsHint: 'Requires the CONVETER backend with an AI provider configured. The AI reads the extracted text from the PDF to answer your question.',
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

  // NEW IMAGE TOOLS
  'background-remover': {
    processor: async (files) => {
      const { removeBackground } = await import('./advancedPdfTools');
      return removeBackground(files[0]);
    },
    optionsHint: 'Requires the CONVETER backend with an AI background removal model (remove.bg API or self-hosted RMBG). Set VITE_BACKEND_URL in Render.',
  },

  'image-upscaler': {
    processor: async (files, opts) => {
      const { upscaleImage } = await import('./advancedPdfTools');
      return upscaleImage(files[0], { scale: (opts.scale as 2 | 4) ?? 2 });
    },
    optionFields: [
      { type: 'select', key: 'scale', label: 'Upscale Factor',
        options: [{ label: '2× (recommended)', value: '2' }, { label: '4× (slower, larger output)', value: '4' }],
        default: '2',
      },
    ],
    optionsHint: 'Requires the CONVETER backend with Real-ESRGAN or a similar AI upscaling model configured.',
  },

  'exif-viewer': {
    processor: async (files) => {
      const { readExif } = await import('./advancedPdfTools');
      return readExif(files[0]);
    },
    optionsHint: 'Reads JPEG EXIF metadata directly in your browser. No file is uploaded.',
  },

  // ── DOCUMENT ────────────────────────────────────────
  'docx-to-pdf': {
    processor: async (files) => {
      const { docxToPdf } = await import('./advancedPdfTools');
      return docxToPdf(files[0]);
    },
    optionsHint: 'Requires the CONVETER backend service. Set VITE_BACKEND_URL in Render.',
  },

  'word-to-pdf': {
    processor: async (files) => {
      const { wordToPdf } = await import('./advancedPdfTools');
      return wordToPdf(files[0]);
    },
    optionsHint: 'Requires the CONVETER backend service. Set VITE_BACKEND_URL in Render.',
  },

  'markdown-to-pdf': {
    processor: async (files, opts) => {
      const { markdownToPdf } = await import('./advancedPdfTools');
      const text = await files[0].text();
      return markdownToPdf(text, { title: String(opts.title ?? files[0].name.replace(/\.[^.]+$/, '')) });
    },
    optionFields: [
      { type: 'text', key: 'title', label: 'Document Title', placeholder: 'Optional title for the PDF', default: '' },
    ],
    optionsHint: 'Converts Markdown headings, paragraphs, and basic formatting to a PDF document — fully in the browser.',
  },

  'epub-to-pdf': {
    processor: async (files) => {
      const { epubToPdf } = await import('./advancedPdfTools');
      return epubToPdf(files[0]);
    },
    optionsHint: 'Requires the CONVETER backend service. Set VITE_BACKEND_URL in Render.',
  },

  'html-to-pdf': {
    processor: async (files, opts) => {
      const { htmlToPdf } = await import('./advancedPdfTools');
      if (opts.url) {
        return htmlToPdf('', { url: String(opts.url) });
      }
      const text = await files[0].text();
      return htmlToPdf(text);
    },
    optionFields: [
      { type: 'text', key: 'url', label: 'Or enter a URL instead of a file', placeholder: 'https://example.com (requires backend)', default: '' },
    ],
    optionsHint: 'Upload an HTML file for client-side conversion, or enter a URL for backend-rendered PDF (requires VITE_BACKEND_URL).',
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

  'pdf-table-extractor': {
    processor: async (files, opts) => {
      const { extractPdfTables } = await import('./advancedPdfTools');
      return extractPdfTables(files[0], {
        outputFormat: (opts.outputFormat as 'csv' | 'xlsx') ?? 'xlsx',
      });
    },
    optionFields: [
      { type: 'select', key: 'outputFormat', label: 'Output Format',
        options: [{ label: 'Excel (.xlsx)', value: 'xlsx' }, { label: 'CSV', value: 'csv' }],
        default: 'xlsx',
      },
    ],
    optionsHint: 'Uses heuristic text-based extraction. Complex PDF tables may need the backend service.',
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

  // ── WEB TOOLS ────────────────────────────────────────
  'url-scraper': {
    inputMode: 'url',
    processor: async (files, opts) => {
      const { scrapeUrl } = await import('./webTools');
      return scrapeUrl(String(opts._url ?? ''), {
        format: (opts.format as 'text' | 'markdown' | 'html') ?? 'text',
      });
    },
    optionFields: [
      { type: 'select', key: 'format', label: 'Output Format',
        options: [
          { label: 'Plain Text', value: 'text' },
          { label: 'Markdown', value: 'markdown' },
          { label: 'HTML', value: 'html' },
        ],
        default: 'text',
      },
    ],
    optionsHint: 'Requires the CONVETER backend service for SSRF-safe URL fetching.',
  },

  'webpage-to-pdf': {
    inputMode: 'url',
    processor: async (files, opts) => {
      const { webpageToPdf } = await import('./webTools');
      return webpageToPdf(String(opts._url ?? ''));
    },
    optionsHint: 'Requires the CONVETER backend service (Puppeteer/Playwright for headless rendering).',
  },

  'webpage-to-markdown': {
    inputMode: 'url',
    processor: async (files, opts) => {
      const { webpageToMarkdown } = await import('./webTools');
      return webpageToMarkdown(String(opts._url ?? ''));
    },
    optionsHint: 'Requires the CONVETER backend service.',
  },

  'table-scraper': {
    inputMode: 'url',
    processor: async (files, opts) => {
      const { scrapeTables } = await import('./webTools');
      return scrapeTables(String(opts._url ?? ''), {
        outputFormat: (opts.outputFormat as 'csv' | 'xlsx') ?? 'csv',
      });
    },
    optionFields: [
      { type: 'select', key: 'outputFormat', label: 'Output Format',
        options: [{ label: 'CSV', value: 'csv' }, { label: 'Excel (.xlsx)', value: 'xlsx' }],
        default: 'csv',
      },
    ],
    optionsHint: 'Extracts HTML <table> elements from the page. JavaScript-rendered tables require the backend.',
  },

  'seo-analyzer': {
    inputMode: 'url',
    processor: async (files, opts) => {
      const { analyzeSeo } = await import('./webTools');
      const { blob, filename } = await analyzeSeo(String(opts._url ?? ''));
      return { blob, filename, mimeType: 'text/plain' };
    },
    optionsHint: 'Analyzes on-page SEO factors via the CONVETER backend. Requires VITE_BACKEND_URL.',
  },

  // ── AI TOOLS ─────────────────────────────────────────
  'ai-document-summarizer': {
    processor: async (files, opts) => {
      const { aiSummarize } = await import('./aiTools');
      return aiSummarize(files[0], {
        style: (opts.style as 'concise' | 'detailed' | 'bullet') ?? 'concise',
        language: String(opts.language ?? 'English'),
      });
    },
    optionFields: [
      { type: 'select', key: 'style', label: 'Summary Style',
        options: [
          { label: 'Concise (1 paragraph)', value: 'concise' },
          { label: 'Detailed (multiple paragraphs)', value: 'detailed' },
          { label: 'Bullet points', value: 'bullet' },
        ],
        default: 'concise',
      },
      { type: 'text', key: 'language', label: 'Output Language', placeholder: 'English, Spanish, French…', default: 'English' },
    ],
    optionsHint: 'Requires the CONVETER backend with an AI provider (OpenAI, Anthropic, or Gemini) configured.',
  },

  'ai-translation': {
    processor: async (files, opts) => {
      const { aiTranslate } = await import('./aiTools');
      return aiTranslate(files[0], {
        targetLanguage: String(opts.targetLanguage ?? 'Spanish'),
        sourceLanguage: String(opts.sourceLanguage ?? 'auto'),
      });
    },
    optionFields: [
      { type: 'text', key: 'targetLanguage', label: 'Target Language', placeholder: 'e.g. Spanish, French, Japanese', default: 'Spanish' },
      { type: 'text', key: 'sourceLanguage', label: 'Source Language (auto-detect if blank)', placeholder: 'auto', default: 'auto' },
    ],
    optionsHint: 'Translates the entire file text using AI. Requires the backend with an AI provider configured.',
  },

  'grammar-checker': {
    processor: async (files, opts) => {
      const { checkGrammar } = await import('./aiTools');
      const text = await files[0].text();
      return checkGrammar(text, { returnCorrected: Boolean(opts.returnCorrected ?? true) });
    },
    textPlaceholder: 'Paste the text you want to check for grammar errors…',
    optionFields: [
      { type: 'checkbox', key: 'returnCorrected', label: 'Include corrected version in output', default: true },
    ],
    optionsHint: 'Requires the CONVETER backend with an AI provider configured.',
  },

  'ai-paraphraser': {
    processor: async (files, opts) => {
      const { aiParaphrase } = await import('./aiTools');
      const text = await files[0].text();
      return aiParaphrase(text, { tone: (opts.tone as 'formal' | 'casual' | 'simple' | 'creative') ?? 'formal' });
    },
    textPlaceholder: 'Enter the text you want to paraphrase…',
    optionFields: [
      { type: 'select', key: 'tone', label: 'Tone / Style',
        options: [
          { label: 'Formal (professional)', value: 'formal' },
          { label: 'Casual (conversational)', value: 'casual' },
          { label: 'Simple (easy to read)', value: 'simple' },
          { label: 'Creative (varied vocabulary)', value: 'creative' },
        ],
        default: 'formal',
      },
    ],
    optionsHint: 'Requires the CONVETER backend with an AI provider configured.',
  },

  'keyword-extractor': {
    processor: async (files, opts) => {
      const { extractKeywords } = await import('./aiTools');
      return extractKeywords(files[0], {
        maxKeywords: Number(opts.maxKeywords ?? 20),
        includeFrequency: Boolean(opts.includeFrequency ?? true),
      });
    },
    optionFields: [
      { type: 'number', key: 'maxKeywords', label: 'Maximum keywords', min: 5, max: 50, default: 20 },
      { type: 'checkbox', key: 'includeFrequency', label: 'Show word frequency', default: true },
    ],
    optionsHint: 'Requires the CONVETER backend with an AI provider configured.',
  },

  // ── VIDEO TOOLS ──────────────────────────────────────
  'video-converter': {
    processor: async (files, opts) => {
      // Browser can only re-encode via canvas/MediaRecorder to WebM.
      // Real format conversion requires backend FFmpeg.
      const targetFormat = String(opts.format ?? 'webm');
      if (targetFormat !== 'webm') {
        // Route to backend
        const base = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '');
        if (!base) {
          const { ProcessorError } = await import('./processors');
          throw new ProcessorError(
            `Converting to ${targetFormat.toUpperCase()} requires the CONVETER backend with FFmpeg. ` +
            'Set VITE_BACKEND_URL in Render. WebM output works in the browser.',
            'BACKEND_NOT_CONFIGURED'
          );
        }
        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('format', targetFormat);
        const response = await fetch(`${base}/api/video/convert`, { method: 'POST', body: formData, signal: AbortSignal.timeout(300_000) });
        if (!response.ok) throw new Error(`Backend error: ${response.status}`);
        const blob = await response.blob();
        return { blob, filename: `${files[0].name.replace(/\.[^.]+$/, '')}.${targetFormat}`, mimeType: blob.type };
      }
      const { compressVideoCanvas } = await import('./mediaTools');
      return compressVideoCanvas(files[0], { scalePercent: 100 });
    },
    optionFields: [
      { type: 'select', key: 'format', label: 'Output Format',
        options: [
          { label: 'WebM (browser, no backend needed)', value: 'webm' },
          { label: 'MP4 (requires backend)', value: 'mp4' },
          { label: 'MOV (requires backend)', value: 'mov' },
          { label: 'MKV (requires backend)', value: 'mkv' },
        ],
        default: 'webm',
      },
    ],
    optionsHint: 'WebM output works in the browser. MP4/MOV/MKV require the CONVETER backend with FFmpeg.',
  },

  'video-compressor': {
    processor: async (files, opts) => {
      const { compressVideoCanvas } = await import('./mediaTools');
      return compressVideoCanvas(files[0], { scalePercent: Number(opts.scalePercent ?? 50) });
    },
    optionFields: [
      { type: 'select', key: 'scalePercent', label: 'Output Resolution',
        options: [
          { label: '100% (original resolution, codec compression only)', value: '100' },
          { label: '75% (light reduction)', value: '75' },
          { label: '50% (balanced)', value: '50' },
          { label: '25% (maximum reduction)', value: '25' },
        ],
        default: '50',
      },
    ],
    optionsHint: 'Browser-side compression re-encodes to WebM VP8 via canvas. This removes audio and preserves only the video. For full-featured compression with audio, configure the backend.',
  },

  'video-to-gif': {
    processor: async (files, opts) => {
      const { videoToGif } = await import('./mediaTools');
      return videoToGif(files[0], {
        fps: Number(opts.fps ?? 10),
        durationSeconds: Number(opts.durationSeconds ?? 5),
        width: Number(opts.width ?? 480),
      });
    },
    optionFields: [
      { type: 'number', key: 'fps', label: 'Frames per second', min: 1, max: 30, default: 10 },
      { type: 'number', key: 'durationSeconds', label: 'Duration to capture (seconds)', min: 1, max: 60, default: 5 },
      { type: 'number', key: 'width', label: 'Output width (px)', min: 120, max: 1280, default: 480 },
    ],
    optionsHint: 'Extracts PNG frames in the browser and bundles them in a ZIP with assembly instructions. True GIF encoding requires FFmpeg on the backend.',
  },

  'video-to-audio': {
    processor: async (files, opts) => {
      const { extractAudioFromVideo } = await import('./mediaTools');
      return extractAudioFromVideo(files[0], (opts.format as 'wav' | 'ogg' | 'mp3') ?? 'wav');
    },
    optionFields: [
      { type: 'select', key: 'format', label: 'Output Format',
        options: [
          { label: 'WAV (browser-native, uncompressed)', value: 'wav' },
          { label: 'MP3 (requires backend)', value: 'mp3' },
          { label: 'AAC (requires backend)', value: 'aac' },
        ],
        default: 'wav',
      },
    ],
    optionsHint: 'WAV output works in the browser using the Web Audio API. MP3/AAC require the CONVETER backend with FFmpeg.',
  },

  // ── AUDIO TOOLS ──────────────────────────────────────
  'audio-converter': {
    processor: async (files, opts) => {
      const { convertAudio } = await import('./mediaTools');
      return convertAudio(files[0], (opts.format as 'wav' | 'ogg' | 'webm') ?? 'wav');
    },
    optionFields: [
      { type: 'select', key: 'format', label: 'Output Format',
        options: [
          { label: 'WAV (browser-native)', value: 'wav' },
          { label: 'OGG (browser, limited support)', value: 'ogg' },
          { label: 'MP3 (requires backend)', value: 'mp3' },
          { label: 'AAC/M4A (requires backend)', value: 'aac' },
          { label: 'FLAC (requires backend)', value: 'flac' },
        ],
        default: 'wav',
      },
    ],
    optionsHint: 'WAV output is fully browser-side. Other formats require the CONVETER backend with FFmpeg.',
  },

  'speech-to-text': {
    processor: async (files, opts) => {
      const { speechToText } = await import('./aiTools');
      return speechToText(files[0], {
        language: String(opts.language ?? 'auto'),
        outputFormat: (opts.outputFormat as 'txt' | 'srt' | 'vtt') ?? 'txt',
      });
    },
    optionFields: [
      { type: 'select', key: 'language', label: 'Audio Language',
        options: [
          { label: 'Auto-detect', value: 'auto' },
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'German', value: 'de' },
          { label: 'Hindi', value: 'hi' },
          { label: 'Chinese', value: 'zh' },
          { label: 'Japanese', value: 'ja' },
          { label: 'Arabic', value: 'ar' },
        ],
        default: 'auto',
      },
      { type: 'select', key: 'outputFormat', label: 'Output Format',
        options: [
          { label: 'Plain text (.txt)', value: 'txt' },
          { label: 'SRT subtitles (.srt)', value: 'srt' },
          { label: 'WebVTT (.vtt)', value: 'vtt' },
        ],
        default: 'txt',
      },
    ],
    optionsHint: 'Requires the CONVETER backend with OpenAI Whisper or a compatible speech-to-text API configured.',
  },

  // ── SCANNER ──────────────────────────────────────────
  'document-scanner': {
    processor: async (files, opts) => {
      const { scanDocument } = await import('./advancedPdfTools');
      return scanDocument(files[0], {
        outputFormat: (opts.outputFormat as 'pdf' | 'jpg') ?? 'pdf',
        contrast: Number(opts.contrast ?? 1.3),
        threshold: Number(opts.threshold ?? 128),
      });
    },
    optionFields: [
      { type: 'select', key: 'outputFormat', label: 'Output Format',
        options: [{ label: 'PDF', value: 'pdf' }, { label: 'JPEG Image', value: 'jpg' }],
        default: 'pdf',
      },
      { type: 'range', key: 'contrast', label: 'Contrast enhancement', min: 1.0, max: 2.5, step: 0.1, default: 1.3 },
      { type: 'range', key: 'threshold', label: 'B&W threshold', min: 80, max: 200, step: 5, default: 128 },
    ],
    optionsHint: 'Upload a photo of a document. The processor enhances contrast and converts to near-B&W for a clean scan look.',
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
