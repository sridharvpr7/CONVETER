// ============================================================
// CONVETER — Tool Processor Engine
// Browser-side processing pipeline for all offline tools.
// Each processor returns a ProcessorResult.
// ============================================================

export interface ProcessorResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  meta?: Record<string, string | number>;
}

export class ProcessorError extends Error {
  constructor(
    message: string,
    public code: string = 'PROCESSING_ERROR'
  ) {
    super(message);
    this.name = 'ProcessorError';
  }
}

// ─────────────────────────────────────────────────────────
// Image Processing (Canvas API — no dependencies)
// ─────────────────────────────────────────────────────────

/** Convert image to target format using Canvas API */
export async function imageConvert(
  file: File,
  targetFormat: 'jpeg' | 'png' | 'webp',
  quality = 0.85
): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const mimeType = `image/${targetFormat === 'jpeg' ? 'jpeg' : targetFormat}`;
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob,
    filename: `${baseName}.${ext}`,
    mimeType,
    meta: {
      originalSize: file.size,
      outputSize: blob.size,
      width: canvas.width,
      height: canvas.height,
    },
  };
}

/** Crop an image around its center to a selected aspect ratio. */
export async function imageCropByRatio(file: File, ratio: 'free' | '1:1' | '4:3' | '16:9' = '1:1'): Promise<ProcessorResult> {
  const img = await loadImage(file);
  let width = img.naturalWidth, height = img.naturalHeight;
  const ratios: Record<string, number> = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
  const desired = ratios[ratio];
  if (desired) {
    if (width / height > desired) width = Math.round(height * desired);
    else height = Math.round(width / desired);
  }
  const sx = Math.floor((img.naturalWidth - width) / 2);
  const sy = Math.floor((img.naturalHeight - height) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(img, sx, sy, width, height, 0, 0, width, height);
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, mimeType, 0.92);
  return { blob, filename: `${file.name.replace(/\.[^.]+$/, '')}_crop.${mimeType === 'image/png' ? 'png' : 'jpg'}`, mimeType, meta: { width, height, outputSize: blob.size } };
}

/** Re-encode a supported raster image so EXIF metadata is not carried into output. */
export async function removeImageExif(file: File): Promise<ProcessorResult> {
  const format = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpeg';
  return imageConvert(file, format, 0.92);
}

export async function makeFavicon(file: File): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = Math.floor((img.naturalWidth - size) / 2), sy = Math.floor((img.naturalHeight - size) / 2);
  canvas.getContext('2d')!.drawImage(img, sx, sy, size, size, 0, 0, 32, 32);
  const blob = await canvasToBlob(canvas, 'image/png', 1);
  return { blob, filename: 'favicon.png', mimeType: 'image/png', meta: { width: 32, height: 32, outputSize: blob.size } };
}

/** Create a generic 35:45 portrait crop. It does not identify or center a face. */
export async function makePassportPhoto(file: File): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const aspect = 35 / 45;
  let cropWidth = img.naturalWidth, cropHeight = img.naturalHeight;
  if (cropWidth / cropHeight > aspect) cropWidth = cropHeight * aspect;
  else cropHeight = cropWidth / aspect;
  const canvas = document.createElement('canvas');
  canvas.width = 413; canvas.height = 531;
  const sx = Math.floor((img.naturalWidth - cropWidth) / 2), sy = Math.floor((img.naturalHeight - cropHeight) / 2);
  canvas.getContext('2d')!.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.94);
  return { blob, filename: `${file.name.replace(/\.[^.]+$/, '')}_portrait.jpg`, mimeType: 'image/jpeg', meta: { width: 413, height: 531, outputSize: blob.size } };
}

/** Resize image to target dimensions */
export async function imageResize(
  file: File,
  options: {
    width?: number;
    height?: number;
    maintainAspect?: boolean;
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
  }
): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const { width: origW, height: origH } = img;
  let targetW = options.width ?? origW;
  let targetH = options.height ?? origH;

  if (options.maintainAspect !== false) {
    if (options.width && !options.height) {
      targetH = Math.round((origH / origW) * targetW);
    } else if (options.height && !options.width) {
      targetW = Math.round((origW / origH) * targetH);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const fmt = options.format ?? 'jpeg';
  const mimeType = `image/${fmt}`;
  const quality = options.quality ?? 0.85;
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = fmt === 'jpeg' ? 'jpg' : fmt;

  return {
    blob,
    filename: `${baseName}_${targetW}x${targetH}.${ext}`,
    mimeType,
    meta: { width: targetW, height: targetH, outputSize: blob.size },
  };
}

/** Compress image by reducing quality */
export async function imageCompress(
  file: File,
  quality = 0.7
): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // Determine output format — preserve PNG if source is PNG, else use JPEG for size
  const isPNG = file.type === 'image/png';
  const mimeType = isPNG ? 'image/png' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = isPNG ? 'png' : 'jpg';

  return {
    blob,
    filename: `${baseName}_compressed.${ext}`,
    mimeType,
    meta: {
      originalSize: file.size,
      outputSize: blob.size,
      savedBytes: file.size - blob.size,
      compressionRatio: +(((1 - blob.size / file.size) * 100).toFixed(1)),
    },
  };
}

/** Crop image to given coordinates */
export async function imageCrop(
  file: File,
  crop: { x: number; y: number; width: number; height: number },
  quality = 0.9
): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const mimeType = file.type || 'image/jpeg';
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];

  return {
    blob,
    filename: `${baseName}_cropped.${ext}`,
    mimeType,
    meta: { width: crop.width, height: crop.height },
  };
}

/** Rotate image by degrees (90, 180, 270) */
export async function imageRotate(
  file: File,
  degrees: 90 | 180 | 270,
  quality = 0.92
): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const { naturalWidth: w, naturalHeight: h } = img;
  const canvas = document.createElement('canvas');
  const isSwapped = degrees === 90 || degrees === 270;
  canvas.width = isSwapped ? h : w;
  canvas.height = isSwapped ? w : h;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);

  const mimeType = file.type || 'image/jpeg';
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];

  return {
    blob,
    filename: `${baseName}_rotated${degrees}.${ext}`,
    mimeType,
    meta: { rotation: degrees, width: canvas.width, height: canvas.height },
  };
}

/** Flip image horizontally or vertically */
export async function imageFlip(
  file: File,
  direction: 'horizontal' | 'vertical',
  quality = 0.92
): Promise<ProcessorResult> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  if (direction === 'horizontal') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(img, 0, 0);
  const mimeType = file.type || 'image/jpeg';
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];

  return {
    blob,
    filename: `${baseName}_flipped.${ext}`,
    mimeType,
    meta: { direction },
  };
}

/** Add text watermark to image */
export async function imageWatermark(
  file: File,
  text: string,
  options: {
    opacity?: number;
    fontSize?: number;
    color?: string;
    position?: 'center' | 'bottomRight' | 'tile';
  } = {}
): Promise<ProcessorResult> {
  const { opacity = 0.35, fontSize = 40, color = '#ffffff', position = 'bottomRight' } = options;
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';

  if (position === 'center') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  } else if (position === 'tile') {
    const step = 300;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        ctx.save();
        ctx.translate(x + step / 2, y + step / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }
  } else {
    ctx.fillText(text, canvas.width - 20, canvas.height - 20);
  }

  const mimeType = file.type || 'image/jpeg';
  const blob = await canvasToBlob(canvas, mimeType, 0.9);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];

  return {
    blob,
    filename: `${baseName}_watermarked.${ext}`,
    mimeType,
    meta: { watermark: text },
  };
}

// ─────────────────────────────────────────────────────────
// Images → PDF (pdf-lib)
// ─────────────────────────────────────────────────────────

/** Convert one or more images into a PDF document */
export async function imagesToPdf(files: File[]): Promise<ProcessorResult> {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let img;
    if (file.type === 'image/png') {
      img = await pdfDoc.embedPng(uint8);
    } else {
      img = await pdfDoc.embedJpg(uint8);
    }
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const baseName = files[0].name.replace(/\.[^.]+$/, '');

  return {
    blob,
    filename: files.length > 1 ? 'images_to_pdf.pdf' : `${baseName}.pdf`,
    mimeType: 'application/pdf',
    meta: { pages: files.length, outputSize: blob.size },
  };
}

// ─────────────────────────────────────────────────────────
// PDF Processing (pdf-lib)
// ─────────────────────────────────────────────────────────

/** Merge multiple PDF files into one */
export async function mergePdfs(files: File[]): Promise<ProcessorResult> {
  const { PDFDocument } = await import('pdf-lib');
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  return {
    blob,
    filename: 'merged.pdf',
    mimeType: 'application/pdf',
    meta: { totalPages: mergedPdf.getPageCount(), files: files.length },
  };
}

/** Split a PDF into individual pages or page ranges */
export async function splitPdf(
  file: File,
  ranges?: { from: number; to: number }[]
): Promise<ProcessorResult[]> {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();
  const results: ProcessorResult[] = [];
  const baseName = file.name.replace(/\.pdf$/i, '');

  if (!ranges || ranges.length === 0) {
    // Split every page individually
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(page);
      const bytes = await newPdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      results.push({
        blob,
        filename: `${baseName}_page_${i + 1}.pdf`,
        mimeType: 'application/pdf',
        meta: { page: i + 1 },
      });
    }
  } else {
    for (const range of ranges) {
      const newPdf = await PDFDocument.create();
      const from = Math.max(0, range.from - 1);
      const to = Math.min(totalPages - 1, range.to - 1);
      const indices = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      const pages = await newPdf.copyPages(srcPdf, indices);
      pages.forEach((p) => newPdf.addPage(p));
      const bytes = await newPdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      results.push({
        blob,
        filename: `${baseName}_pages_${range.from}-${range.to}.pdf`,
        mimeType: 'application/pdf',
        meta: { pages: indices.length },
      });
    }
  }

  return results;
}

/** Rotate PDF pages */
export async function rotatePdf(
  file: File,
  degrees: 90 | 180 | 270,
  pageNumbers?: number[] // 1-indexed, defaults to all
): Promise<ProcessorResult> {
  const { PDFDocument, degrees: deg } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  const targetPages = pageNumbers ?? Array.from({ length: totalPages }, (_, i) => i + 1);

  for (const pageNum of targetPages) {
    const page = pdfDoc.getPage(pageNum - 1);
    page.setRotation(deg(degrees));
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return {
    blob,
    filename: `${baseName}_rotated${degrees}.pdf`,
    mimeType: 'application/pdf',
    meta: { rotation: degrees, affectedPages: targetPages.length },
  };
}

function parsePageList(value: string, count: number): number[] {
  const pages = value.split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!pages.length || pages.some((page) => !Number.isInteger(page) || page < 1 || page > count)) {
    throw new ProcessorError(`Enter page numbers between 1 and ${count}, separated by commas.`);
  }
  return [...new Set(pages)];
}

export async function removePdfPages(file: File, pageList: string): Promise<ProcessorResult> {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const remove = new Set(parsePageList(pageList, pdf.getPageCount()).map((n) => n - 1));
  if (remove.size >= pdf.getPageCount()) throw new ProcessorError('At least one page must remain.');
  [...remove].sort((a, b) => b - a).forEach((index) => pdf.removePage(index));
  const bytes = await pdf.save();
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: file.name.replace(/\.pdf$/i, '') + '_pages_removed.pdf', mimeType: 'application/pdf', meta: { pages: pdf.getPageCount() } };
}

export async function extractPdfPages(file: File, pageList: string): Promise<ProcessorResult> {
  const { PDFDocument } = await import('pdf-lib');
  const source = await PDFDocument.load(await file.arrayBuffer());
  const indices = parsePageList(pageList, source.getPageCount()).map((page) => page - 1);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indices);
  pages.forEach((page) => output.addPage(page));
  const bytes = await output.save();
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: file.name.replace(/\.pdf$/i, '') + '_extracted.pdf', mimeType: 'application/pdf', meta: { pages: pages.length } };
}

export async function reorderPdfPages(file: File, pageList: string): Promise<ProcessorResult> {
  const { PDFDocument } = await import('pdf-lib');
  const source = await PDFDocument.load(await file.arrayBuffer());
  const order = parsePageList(pageList, source.getPageCount());
  if (order.length !== source.getPageCount()) throw new ProcessorError(`List every page exactly once (1 through ${source.getPageCount()}).`);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, order.map((page) => page - 1));
  pages.forEach((page) => output.addPage(page));
  const bytes = await output.save();
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: file.name.replace(/\.pdf$/i, '') + '_reordered.pdf', mimeType: 'application/pdf', meta: { pages: pages.length } };
}

export async function addPdfPageNumbers(file: File, startAt = 1): Promise<ProcessorResult> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.getPages().forEach((page, index) => {
    const { width } = page.getSize();
    const label = String(startAt + index);
    page.drawText(label, { x: width / 2 - font.widthOfTextAtSize(label, 10) / 2, y: 18, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
  });
  const bytes = await pdf.save();
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: file.name.replace(/\.pdf$/i, '') + '_numbered.pdf', mimeType: 'application/pdf', meta: { pages: pdf.getPageCount() } };
}

/** Add a text watermark to every page of a PDF */
export async function watermarkPdf(
  file: File,
  text: string,
  options: { opacity?: number; fontSize?: number; color?: [number, number, number] } = {}
): Promise<ProcessorResult> {
  const { PDFDocument, StandardFonts, rgb, degrees: deg } = await import('pdf-lib');
  const { opacity = 0.3, fontSize = 60, color = [0.5, 0.5, 0.5] } = options;
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - (text.length * fontSize * 0.3) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(color[0], color[1], color[2]),
      opacity,
      rotate: deg(45),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return {
    blob,
    filename: `${baseName}_watermarked.pdf`,
    mimeType: 'application/pdf',
    meta: { watermark: text, pages: pdfDoc.getPageCount() },
  };
}

/** Extract text from PDF (basic — reads embedded text only, not OCR) */
export async function extractTextFromPdf(file: File): Promise<ProcessorResult> {
  // Using pdf.js for text extraction
  // Falls back to a simple raw string extraction for now
  const arrayBuffer = await file.arrayBuffer();

  // Try to extract readable strings from the binary
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const raw = decoder.decode(arrayBuffer);

  // Extract text-like sequences between BT (begin text) and ET (end text)
  const texts: string[] = [];
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const inner = match[1];
    const strRegex = /\((.*?)\)/g;
    let strMatch;
    while ((strMatch = strRegex.exec(inner)) !== null) {
      const s = strMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
      if (s.trim()) texts.push(s);
    }
  }

  const text = texts.join(' ') || '(No extractable text found — file may be a scanned PDF requiring OCR)';
  const blob = new Blob([text], { type: 'text/plain' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return {
    blob,
    filename: `${baseName}_text.txt`,
    mimeType: 'text/plain',
    meta: { characters: text.length, words: text.split(/\s+/).length },
  };
}

/** Get PDF info / metadata */
export async function getPdfInfo(file: File): Promise<Record<string, string | number>> {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  return {
    pageCount: pdfDoc.getPageCount(),
    title: pdfDoc.getTitle() ?? '',
    author: pdfDoc.getAuthor() ?? '',
    subject: pdfDoc.getSubject() ?? '',
    creator: pdfDoc.getCreator() ?? '',
    producer: pdfDoc.getProducer() ?? '',
    creationDate: pdfDoc.getCreationDate()?.toISOString() ?? '',
    modificationDate: pdfDoc.getModificationDate()?.toISOString() ?? '',
  };
}

// ─────────────────────────────────────────────────────────
// Archive (JSZip)
// ─────────────────────────────────────────────────────────

/** Create a ZIP archive from multiple files */
export async function createZip(
  files: File[],
  zipName = 'archive.zip'
): Promise<ProcessorResult> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    zip.file(file.name, arrayBuffer);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    blob,
    filename: zipName,
    mimeType: 'application/zip',
    meta: { files: files.length, outputSize: blob.size },
  };
}

export async function batchRename(files: File[], options: { prefix?: string; suffix?: string; numbered?: boolean } = {}): Promise<ProcessorResult> {
  const renamed = files.map((file, index) => {
    const dot = file.name.lastIndexOf('.');
    const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
    const ext = dot > 0 ? file.name.slice(dot) : '';
    const number = options.numbered ? `_${String(index + 1).padStart(2, '0')}` : '';
    return new File([file], `${options.prefix ?? ''}${stem}${options.suffix ?? ''}${number}${ext}`, { type: file.type, lastModified: file.lastModified });
  });
  const result = await createZip(renamed, 'renamed_files.zip');
  return { ...result, meta: { files: renamed.length, ...result.meta } };
}

/** Extract all files from a ZIP archive — returns multiple results */
export async function extractZip(file: File): Promise<ProcessorResult[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const results: ProcessorResult[] = [];

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const content = await zipEntry.async('blob');
    results.push({
      blob: content,
      filename,
      mimeType: guessMime(filename),
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────
// Data Conversion (no heavy deps)
// ─────────────────────────────────────────────────────────

/** CSV to JSON */
export async function csvToJson(file: File): Promise<ProcessorResult> {
  const text = await file.text();
  const lines = text.trim().split('\n');
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() ?? '';
    });
    rows.push(row);
  }

  const json = JSON.stringify(rows, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const baseName = file.name.replace(/\.csv$/i, '');

  return {
    blob,
    filename: `${baseName}.json`,
    mimeType: 'application/json',
    meta: { rows: rows.length, columns: headers.length },
  };
}

/** JSON to CSV */
export async function jsonToCsv(file: File): Promise<ProcessorResult> {
  const text = await file.text();
  let data: Record<string, unknown>[];

  try {
    const parsed = JSON.parse(text);
    data = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new ProcessorError('Invalid JSON file', 'INVALID_JSON');
  }

  if (data.length === 0) {
    throw new ProcessorError('JSON array is empty', 'EMPTY_DATA');
  }

  const headers = Object.keys(data[0]);
  const csvLines = [headers.map(csvEscape).join(',')];
  for (const row of data) {
    csvLines.push(headers.map((h) => csvEscape(String(row[h] ?? ''))).join(','));
  }

  const csv = csvLines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const baseName = file.name.replace(/\.json$/i, '');

  return {
    blob,
    filename: `${baseName}.csv`,
    mimeType: 'text/csv',
    meta: { rows: data.length, columns: headers.length },
  };
}

/** Format and minify JSON */
export async function formatJson(
  file: File,
  mode: 'format' | 'minify' = 'format'
): Promise<ProcessorResult> {
  const text = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ProcessorError('Invalid JSON file', 'INVALID_JSON');
  }

  const output = mode === 'format' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
  const blob = new Blob([output], { type: 'application/json' });
  const baseName = file.name.replace(/\.json$/i, '');

  return {
    blob,
    filename: `${baseName}_${mode}ted.json`,
    mimeType: 'application/json',
    meta: { originalSize: file.size, outputSize: blob.size },
  };
}

// ─────────────────────────────────────────────────────────
// Text / Document Utilities
// ─────────────────────────────────────────────────────────

/** Count words, characters, lines in a text file */
export async function analyzeText(file: File): Promise<ProcessorResult> {
  const text = await file.text();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const lines = text.split('\n').length;
  const sentences = (text.match(/[.!?]+/g) ?? []).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;

  const report = `TEXT ANALYSIS — ${file.name}
${'─'.repeat(40)}
Words:       ${words.toLocaleString()}
Characters:  ${chars.toLocaleString()}
Lines:       ${lines.toLocaleString()}
Sentences:   ${sentences.toLocaleString()}
Paragraphs:  ${paragraphs.toLocaleString()}
Avg word len: ${words > 0 ? (chars / words).toFixed(1) : '0'} chars
Reading time: ~${Math.ceil(words / 200)} min
`;

  const blob = new Blob([report], { type: 'text/plain' });
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob,
    filename: `${baseName}_analysis.txt`,
    mimeType: 'text/plain',
    meta: { words, characters: chars, lines },
  };
}

/** Convert text to Base64 encoding */
export async function textToBase64(file: File): Promise<ProcessorResult> {
  const text = await file.text();
  const encoded = btoa(unescape(encodeURIComponent(text)));
  const blob = new Blob([encoded], { type: 'text/plain' });
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob,
    filename: `${baseName}_base64.txt`,
    mimeType: 'text/plain',
    meta: { originalSize: file.size, encodedSize: blob.size },
  };
}

/** Convert Base64 to text */
export async function base64ToText(file: File): Promise<ProcessorResult> {
  const encoded = (await file.text()).trim();
  let decoded: string;
  try {
    decoded = decodeURIComponent(escape(atob(encoded)));
  } catch {
    throw new ProcessorError('Invalid Base64 input', 'INVALID_BASE64');
  }
  const blob = new Blob([decoded], { type: 'text/plain' });
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    blob,
    filename: `${baseName}_decoded.txt`,
    mimeType: 'text/plain',
    meta: { outputSize: blob.size },
  };
}

// ─────────────────────────────────────────────────────────
// Developer Utilities
// ─────────────────────────────────────────────────────────

/** Hash a file using SubtleCrypto */
export async function hashFile(
  file: File,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<ProcessorResult> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const report = `FILE HASH — ${file.name}
${'─'.repeat(60)}
Algorithm: ${algorithm}
File size: ${file.size.toLocaleString()} bytes
Hash:      ${hashHex}
`;

  const blob = new Blob([report], { type: 'text/plain' });

  return {
    blob,
    filename: `${file.name}_${algorithm.replace('-', '').toLowerCase()}.txt`,
    mimeType: 'text/plain',
    meta: { algorithm, hash: hashHex, fileSize: file.size },
  };
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ProcessorError(`Could not load image: ${file.name}`, 'IMAGE_LOAD_ERROR'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ProcessorError('Canvas toBlob failed', 'CANVAS_BLOB_ERROR'));
      },
      mimeType,
      quality
    );
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'text/plain',
    zip: 'application/zip',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };
  return map[ext] ?? 'application/octet-stream';
}
