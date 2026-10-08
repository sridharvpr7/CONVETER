// ============================================================
// CONVETER — AI Tool Processors
//
// These tools call an AI provider (OpenAI-compatible API).
// The API key MUST be kept on the server — never in VITE_*
// environment variables.
//
// Requests are routed through the backend at VITE_BACKEND_URL:
//   POST /api/ai/summarize      — summarize text / PDF
//   POST /api/ai/translate      — translate text
//   POST /api/ai/grammar        — grammar check
//   POST /api/ai/paraphrase     — paraphrase text
//   POST /api/ai/keywords       — keyword extraction
//   POST /api/ai/ask-pdf        — Q&A over PDF text
//
// Backend environment variables (set in Render, NOT in client):
//   AI_PROVIDER        = openai | anthropic | gemini
//   AI_API_KEY         = sk-...
//   AI_MODEL           = gpt-4o-mini (or claude-3-haiku, gemini-1.5-flash, etc.)
//   AI_MAX_INPUT_CHARS = 50000 (optional, default 50000)
// ============================================================

import type { ProcessorResult } from './processors';
import { ProcessorError } from './processors';

function getBackendUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL as string | undefined;
  if (!url) {
    throw new ProcessorError(
      'AI tools require the CONVETER backend service with an AI provider configured. ' +
      'Set VITE_BACKEND_URL in Render (or .env.local). ' +
      'See README.md → Backend Setup for full instructions.',
      'BACKEND_NOT_CONFIGURED'
    );
  }
  return url.replace(/\/$/, '');
}

async function callAiBackend<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const base = getBackendUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProcessorError('AI request timed out (90s). The model may be busy.', 'TIMEOUT');
    }
    throw new ProcessorError(
      `Could not reach the AI backend at ${base}. Is it running? Error: ${String(err)}`,
      'BACKEND_UNREACHABLE'
    );
  }

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error ?? ''; } catch { /* ignore */ }
    if (response.status === 402) {
      throw new ProcessorError('AI provider quota exceeded. Check billing on your AI provider dashboard.', 'QUOTA_EXCEEDED');
    }
    if (response.status === 401) {
      throw new ProcessorError('AI provider API key is invalid or not configured on the backend.', 'AUTH_ERROR');
    }
    throw new ProcessorError(
      `AI backend error (HTTP ${response.status}): ${detail || response.statusText}`,
      'BACKEND_ERROR'
    );
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────
// Shared text extractor for files
// ─────────────────────────────────────────────────────────
async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') {
    // Use pdf-lib to extract raw text streams
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(await file.arrayBuffer());
    const texts: string[] = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(raw)) !== null) {
      const strRegex = /\((.*?)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(match[1])) !== null) {
        const s = strMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
        if (s.trim()) texts.push(s);
      }
    }
    const text = texts.join(' ');
    void doc; // loaded only to check validity
    if (!text.trim()) {
      throw new ProcessorError(
        'No extractable text found in this PDF. For scanned PDFs, run OCR first.',
        'NO_TEXT'
      );
    }
    return text;
  }
  if (['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm'].includes(ext)) {
    return file.text();
  }
  if (['docx', 'doc', 'odt'].includes(ext)) {
    throw new ProcessorError(
      'Word document text extraction is not yet supported in the browser. ' +
      'Convert your DOCX to PDF first, then use this tool.',
      'UNSUPPORTED_FORMAT'
    );
  }
  // Attempt to read as text
  const text = await file.text();
  if (!text.trim()) throw new ProcessorError(`Could not read text from ${file.name}.`, 'NO_TEXT');
  return text;
}

// ─────────────────────────────────────────────────────────
// AI Summarizer (document file or plain text)
// ─────────────────────────────────────────────────────────
export async function aiSummarize(
  textOrFile: string | File,
  options: { style?: 'concise' | 'detailed' | 'bullet'; language?: string } = {}
): Promise<ProcessorResult> {
  const { style = 'concise', language = 'English' } = options;
  const text = typeof textOrFile === 'string' ? textOrFile : await extractText(textOrFile);

  if (text.length < 20) {
    throw new ProcessorError('The input is too short to summarize.', 'TOO_SHORT');
  }

  const data = await callAiBackend<{ summary: string; wordCount: number }>(
    '/api/ai/summarize',
    { text, style, language }
  );

  const blob = new Blob([data.summary], { type: 'text/plain' });
  const filename = typeof textOrFile === 'string'
    ? `summary_${style}.txt`
    : `${textOrFile.name.replace(/\.[^.]+$/, '')}_summary_${style}.txt`;

  return {
    blob,
    filename,
    mimeType: 'text/plain',
    meta: { inputWords: text.split(/\s+/).length, outputWords: data.wordCount, style, language },
  };
}

// ─────────────────────────────────────────────────────────
// AI Translation
// ─────────────────────────────────────────────────────────
export async function aiTranslate(
  textOrFile: string | File,
  options: { targetLanguage?: string; sourceLanguage?: string } = {}
): Promise<ProcessorResult> {
  const { targetLanguage = 'Spanish', sourceLanguage = 'auto' } = options;
  const text = typeof textOrFile === 'string' ? textOrFile : await extractText(textOrFile);

  if (!text.trim()) throw new ProcessorError('No text to translate.', 'EMPTY_INPUT');

  const data = await callAiBackend<{ translation: string; detectedLanguage: string }>(
    '/api/ai/translate',
    { text, targetLanguage, sourceLanguage }
  );

  const blob = new Blob([data.translation], { type: 'text/plain' });
  const filename = typeof textOrFile === 'string'
    ? `translation_${targetLanguage.toLowerCase().replace(/\s+/g, '_')}.txt`
    : `${textOrFile.name.replace(/\.[^.]+$/, '')}_${targetLanguage.toLowerCase().replace(/\s+/g, '_')}.txt`;

  return {
    blob,
    filename,
    mimeType: 'text/plain',
    meta: {
      targetLanguage,
      detectedSourceLanguage: data.detectedLanguage,
      inputChars: text.length,
    },
  };
}

// ─────────────────────────────────────────────────────────
// Grammar Checker
// ─────────────────────────────────────────────────────────
export async function checkGrammar(
  text: string,
  options: { returnCorrected?: boolean } = {}
): Promise<ProcessorResult> {
  if (!text.trim()) throw new ProcessorError('Enter text to check.', 'EMPTY_INPUT');

  const data = await callAiBackend<{
    corrected: string;
    issues: { original: string; suggestion: string; explanation: string }[];
  }>('/api/ai/grammar', { text, returnCorrected: options.returnCorrected ?? true });

  const issueLines = data.issues.map(
    (issue, i) => `${i + 1}. "${issue.original}" → "${issue.suggestion}"\n   ${issue.explanation}`
  );
  const report = [
    data.issues.length === 0 ? 'No grammar issues found.' : `Found ${data.issues.length} issue(s):`,
    '',
    ...issueLines,
    '',
    '─'.repeat(40),
    'CORRECTED TEXT:',
    '',
    data.corrected,
  ].join('\n');

  const blob = new Blob([report], { type: 'text/plain' });
  return {
    blob,
    filename: 'grammar_check.txt',
    mimeType: 'text/plain',
    meta: { issuesFound: data.issues.length, inputChars: text.length },
  };
}

// ─────────────────────────────────────────────────────────
// AI Paraphraser
// ─────────────────────────────────────────────────────────
export async function aiParaphrase(
  text: string,
  options: { tone?: 'formal' | 'casual' | 'simple' | 'creative' } = {}
): Promise<ProcessorResult> {
  if (!text.trim()) throw new ProcessorError('Enter text to paraphrase.', 'EMPTY_INPUT');
  const { tone = 'formal' } = options;

  const data = await callAiBackend<{ paraphrase: string }>(
    '/api/ai/paraphrase',
    { text, tone }
  );

  const blob = new Blob([data.paraphrase], { type: 'text/plain' });
  return {
    blob,
    filename: `paraphrased_${tone}.txt`,
    mimeType: 'text/plain',
    meta: { tone, inputChars: text.length },
  };
}

// ─────────────────────────────────────────────────────────
// Keyword Extractor
// ─────────────────────────────────────────────────────────
export async function extractKeywords(
  textOrFile: string | File,
  options: { maxKeywords?: number; includeFrequency?: boolean } = {}
): Promise<ProcessorResult> {
  const { maxKeywords = 20, includeFrequency = true } = options;
  const text = typeof textOrFile === 'string' ? textOrFile : await extractText(textOrFile);
  if (!text.trim()) throw new ProcessorError('No text to extract keywords from.', 'EMPTY_INPUT');

  const data = await callAiBackend<{
    keywords: { term: string; frequency: number; relevance: number }[];
  }>('/api/ai/keywords', { text, maxKeywords, includeFrequency });

  const lines = data.keywords.map((kw, i) =>
    `${String(i + 1).padStart(2, ' ')}. ${kw.term.padEnd(30)} relevance: ${(kw.relevance * 100).toFixed(0)}%${includeFrequency ? `  freq: ${kw.frequency}` : ''}`
  );

  const output = [
    `KEYWORDS — ${data.keywords.length} terms extracted`,
    '─'.repeat(60),
    ...lines,
  ].join('\n');

  const blob = new Blob([output], { type: 'text/plain' });
  const filename = typeof textOrFile === 'string'
    ? 'keywords.txt'
    : `${textOrFile.name.replace(/\.[^.]+$/, '')}_keywords.txt`;

  return {
    blob,
    filename,
    mimeType: 'text/plain',
    meta: { keywordsFound: data.keywords.length, maxKeywords },
  };
}

// ─────────────────────────────────────────────────────────
// Ask PDF (Q&A over PDF content)
// ─────────────────────────────────────────────────────────
export async function askPdf(
  file: File,
  question: string
): Promise<ProcessorResult> {
  if (!question.trim()) throw new ProcessorError('Enter a question to ask about the PDF.', 'NO_QUESTION');

  const text = await extractText(file);
  const data = await callAiBackend<{ answer: string; confidence?: string }>(
    '/api/ai/ask-pdf',
    { text, question }
  );

  const output = [
    `QUESTION: ${question}`,
    '',
    `ANSWER:`,
    data.answer,
    ...(data.confidence ? ['', `Confidence: ${data.confidence}`] : []),
  ].join('\n');

  const blob = new Blob([output], { type: 'text/plain' });
  return {
    blob,
    filename: `${file.name.replace(/\.[^.]+$/, '')}_answer.txt`,
    mimeType: 'text/plain',
    meta: { question, inputChars: text.length },
  };
}

// ─────────────────────────────────────────────────────────
// Speech to Text (audio transcription)
// ─────────────────────────────────────────────────────────
export async function speechToText(
  file: File,
  options: { language?: string; outputFormat?: 'txt' | 'srt' | 'vtt' } = {}
): Promise<ProcessorResult> {
  const { language = 'auto', outputFormat = 'txt' } = options;
  const base = getBackendUrl();

  const formData = new FormData();
  formData.append('audio', file);
  formData.append('language', language);
  formData.append('outputFormat', outputFormat);

  let response: Response;
  try {
    response = await fetch(`${base}/api/ai/speech-to-text`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new ProcessorError(`Backend unreachable: ${String(err)}`, 'BACKEND_UNREACHABLE');
  }

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error ?? ''; } catch { /* ignore */ }
    throw new ProcessorError(`Transcription failed (HTTP ${response.status}): ${detail}`, 'BACKEND_ERROR');
  }

  const data = await response.json() as { transcript: string; language: string; duration?: number };
  const mimeType = outputFormat === 'txt' ? 'text/plain' : `text/${outputFormat}`;
  const blob = new Blob([data.transcript], { type: mimeType });

  return {
    blob,
    filename: `${file.name.replace(/\.[^.]+$/, '')}_transcript.${outputFormat}`,
    mimeType,
    meta: {
      detectedLanguage: data.language,
      duration: data.duration ?? 0,
      outputFormat,
    },
  };
}

// ─────────────────────────────────────────────────────────
// OCR PDF (optical character recognition)
// ─────────────────────────────────────────────────────────
export async function ocrPdf(
  file: File,
  options: { language?: string; outputFormat?: 'pdf' | 'txt' } = {}
): Promise<ProcessorResult> {
  const { language = 'eng', outputFormat = 'txt' } = options;
  const base = getBackendUrl();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);
  formData.append('outputFormat', outputFormat);

  let response: Response;
  try {
    response = await fetch(`${base}/api/ai/ocr`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new ProcessorError(`Backend unreachable: ${String(err)}`, 'BACKEND_UNREACHABLE');
  }

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error ?? ''; } catch { /* ignore */ }
    throw new ProcessorError(`OCR failed (HTTP ${response.status}): ${detail}`, 'BACKEND_ERROR');
  }

  const blob = await response.blob();
  const ext = outputFormat === 'pdf' ? 'pdf' : 'txt';
  const mimeType = outputFormat === 'pdf' ? 'application/pdf' : 'text/plain';

  return {
    blob,
    filename: `${file.name.replace(/\.[^.]+$/, '')}_ocr.${ext}`,
    mimeType,
    meta: { language, outputFormat, outputSize: blob.size },
  };
}
