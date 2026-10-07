import type { ProcessorResult } from './processors';
import { ProcessorError } from './processors';
import QRCode from 'qrcode';

const textResult = (text: string, filename: string, mimeType = 'text/plain'): ProcessorResult => ({
  blob: new Blob([text], { type: mimeType }), filename, mimeType,
});

function numbers(text: string, count: number, usage: string): number[] {
  const values = text.split(/[\s,;]+/).filter(Boolean).map(Number);
  if (values.length < count || values.slice(0, count).some((n) => !Number.isFinite(n))) {
    throw new ProcessorError(`Enter ${usage}.`, 'INVALID_INPUT');
  }
  return values;
}

function colorToRgb(input: string): [number, number, number] {
  const hex = input.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const value = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = input.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgb) {
    const values = rgb.slice(1).map(Number);
    if (values.every((v) => v >= 0 && v <= 255)) return values as [number, number, number];
  }
  throw new ProcessorError('Enter a 3/6 digit HEX color or an RGB color.', 'INVALID_COLOR');
}

function rgbToHsl([r0, g0, b0]: [number, number, number]) {
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  return [Math.round((h * 60 + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
}

async function simplePdf(title: string, rows: string[], filename: string): Promise<ProcessorResult> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 744;
  page.drawText(title, { x: 48, y, size: 20, font: bold, color: rgb(0.15, 0.18, 0.35) });
  y -= 36;
  for (const row of rows) {
    const wrapped = row.match(/.{1,90}(?:\s|$)|.{1,90}/g) ?? [''];
    for (const line of wrapped) {
      if (y < 48) { page = pdf.addPage([612, 792]); y = 744; }
      page.drawText(line.trim(), { x: 48, y, size: 10, font, color: rgb(0.12, 0.12, 0.16) });
      y -= 16;
    }
  }
  const bytes = await pdf.save();
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename, mimeType: 'application/pdf', meta: { pages: pdf.getPageCount() } };
}

function parseJsonInput(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value as Record<string, unknown>;
  } catch { throw new ProcessorError('Enter valid JSON object data using the example shown in the input field.'); }
}

export async function runTextTool(slug: string, file: File, options: Record<string, unknown> = {}): Promise<ProcessorResult> {
  const input = await file.text();
  const base = file.name.replace(/\.[^.]+$/, '') || slug;
  switch (slug) {
    case 'base64-encoder': {
      const encoded = String(options.mode ?? 'encode') === 'decode'
        ? decodeURIComponent(escape(atob(input.trim())))
        : btoa(unescape(encodeURIComponent(input)));
      return textResult(encoded, `${base}_${String(options.mode ?? 'encode')}.txt`);
    }
    case 'regex-tester': {
      const pattern = String(options.pattern ?? '');
      if (!pattern) throw new ProcessorError('Enter a regular expression in Options.', 'REGEX_REQUIRED');
      let expression: RegExp;
      try { expression = new RegExp(pattern, String(options.flags ?? 'g')); }
      catch (error) { throw new ProcessorError(error instanceof Error ? error.message : 'Invalid regular expression.'); }
      const matches = [...input.matchAll(new RegExp(expression.source, expression.flags.includes('g') ? expression.flags : `${expression.flags}g`))];
      return textResult(`Pattern: /${expression.source}/${expression.flags}\nMatches: ${matches.length}\n\n${matches.map((m, i) => `${i + 1}. ${JSON.stringify(m[0])} at ${m.index}`).join('\n') || 'No matches.'}`, `${base}_regex.txt`);
    }
    case 'diff-checker': {
      let value: { before: string; after: string };
      try { value = JSON.parse(input); } catch { throw new ProcessorError('Enter JSON with “before” and “after” text fields.', 'INVALID_INPUT'); }
      if (typeof value.before !== 'string' || typeof value.after !== 'string') throw new ProcessorError('Both before and after must be text.');
      const a = value.before.split(/\r?\n/), b = value.after.split(/\r?\n/);
      return textResult(`--- before\n+++ after\n${b.map((line, i) => line === a[i] ? `  ${line}` : `+ ${line}`).join('\n')}${a.slice(b.length).map((line) => `\n- ${line}`).join('')}`, `${base}_diff.txt`);
    }
    case 'jwt-decoder': {
      const parts = input.trim().split('.');
      if (parts.length < 2) throw new ProcessorError('Enter a JWT with header.payload.signature parts.');
      const decode = (part: string) => JSON.stringify(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')), (c) => c.charCodeAt(0)))), null, 2);
      try { return textResult(`Header (decoded, not verified):\n${decode(parts[0])}\n\nPayload (decoded, not verified):\n${decode(parts[1])}\n\nWarning: decoding does not verify the token signature.`, `${base}_decoded.txt`); }
      catch { throw new ProcessorError('JWT header or payload is invalid Base64URL JSON.'); }
    }
    case 'uuid-generator': {
      const count = Math.max(1, Math.min(1000, Number(options.count ?? 1)));
      return textResult(Array.from({ length: count }, () => crypto.randomUUID()).join('\n'), 'uuids.txt');
    }
    case 'url-encoder': {
      const output = String(options.mode ?? 'encode') === 'decode' ? decodeURIComponent(input.trim()) : encodeURIComponent(input);
      return textResult(output, `${base}_${String(options.mode ?? 'encode')}.txt`);
    }
    case 'color-converter': {
      const rgb = colorToRgb(input);
      const hex = `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      const hsl = rgbToHsl(rgb);
      return textResult(`HEX: ${hex}\nRGB: rgb(${rgb.join(', ')})\nHSL: hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`, `${base}_color.txt`);
    }
    case 'password-generator': {
      const length = Math.max(8, Math.min(128, Number(options.length ?? 20)));
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';
      const random = crypto.getRandomValues(new Uint32Array(length));
      return textResult(Array.from(random, (n) => alphabet[n % alphabet.length]).join(''), 'password.txt');
    }
    case 'cron-generator': {
      const fields = input.trim().split(/\s+/);
      if (fields.length !== 5) throw new ProcessorError('Enter a standard five-field cron expression (minute hour day month weekday).');
      return textResult(`${input.trim()}\n\nField order: minute hour day-of-month month day-of-week\nThis format check does not evaluate timezone or calendar-specific behavior.`, `${base}_cron.txt`);
    }
    case 'sql-formatter': {
      const formatted = input.trim()
        .replace(/\s+/g, ' ')
        .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|VALUES|SET|UPDATE|INSERT INTO|DELETE FROM)\b/gi, '\n$1')
        .replace(/^\n/, '');
      return textResult(formatted, `${base}_formatted.sql`, 'text/sql');
    }
    case 'lorem-ipsum': {
      const count = Math.max(1, Math.min(100, Number(options.count ?? 3)));
      const paragraph = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
      return textResult(Array.from({ length: count }, () => paragraph).join('\n\n'), 'lorem-ipsum.txt');
    }
    case 'emi-calculator': {
      const [principal, annualRate, months] = numbers(input, 3, 'principal, annual interest rate (%), and number of months');
      const rate = annualRate / 1200;
      const emi = rate === 0 ? principal / months : principal * rate * (1 + rate) ** months / ((1 + rate) ** months - 1);
      return textResult(`Monthly EMI: ${emi.toFixed(2)}\nTotal payment: ${(emi * months).toFixed(2)}\nTotal interest: ${(emi * months - principal).toFixed(2)}`, 'emi-result.txt');
    }
    case 'percentage-calculator': {
      const [amount, percent] = numbers(input, 2, 'an amount and a percentage');
      return textResult(`${percent}% of ${amount} = ${(amount * percent / 100).toFixed(2)}\n${amount} is ${amount ? (percent / amount * 100).toFixed(2) : '0'}% of ${percent}.`, 'percentage-result.txt');
    }
    case 'bmi-calculator': {
      const [weight, heightCm] = numbers(input, 2, 'weight in kg and height in cm');
      const bmi = weight / ((heightCm / 100) ** 2);
      return textResult(`BMI: ${bmi.toFixed(1)}\n${bmi < 18.5 ? 'Below typical range' : bmi < 25 ? 'Typical range' : bmi < 30 ? 'Above typical range' : 'High range'}\n\nBMI is a screening measure, not a diagnosis.`, 'bmi-result.txt');
    }
    case 'age-calculator': {
      const birth = new Date(input.trim());
      if (Number.isNaN(birth.getTime())) throw new ProcessorError('Enter a valid birth date.');
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) years--;
      return textResult(`Age: ${years} years\nBirth date: ${birth.toLocaleDateString()}`, 'age-result.txt');
    }
    case 'gst-calculator': {
      const [amount, rate] = numbers(input, 2, 'amount and GST rate (%)');
      const tax = amount * rate / 100;
      return textResult(`Amount before GST: ${amount.toFixed(2)}\nGST (${rate}%): ${tax.toFixed(2)}\nTotal including GST: ${(amount + tax).toFixed(2)}`, 'gst-result.txt');
    }
    case 'sip-calculator': {
      const [monthly, annualRate, years] = numbers(input, 3, 'monthly investment, annual return (%), and years');
      const months = years * 12, rate = annualRate / 1200;
      const value = rate === 0 ? monthly * months : monthly * (((1 + rate) ** months - 1) / rate) * (1 + rate);
      return textResult(`Invested amount: ${(monthly * months).toFixed(2)}\nEstimated value: ${value.toFixed(2)}\nEstimated gain: ${(value - monthly * months).toFixed(2)}\n\nIllustration only; actual returns vary.`, 'sip-result.txt');
    }
    case 'timestamp-converter': {
      const value = input.trim();
      const date = /^-?\d+(\.\d+)?$/.test(value)
        ? new Date(Number(value) * (value.replace('-', '').split('.')[0].length <= 10 ? 1000 : 1))
        : new Date(value);
      if (Number.isNaN(date.getTime())) throw new ProcessorError('Enter a Unix timestamp (seconds or milliseconds) or an ISO date.');
      return textResult(`UTC: ${date.toISOString()}\nLocal: ${date.toLocaleString()}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}`, 'timestamp-result.txt');
    }
    case 'unit-converter': {
      const [valueRaw, from, to] = input.trim().split(/[\s,;]+/);
      const value = Number(valueRaw);
      if (!Number.isFinite(value) || !from || !to) throw new ProcessorError('Enter a value and units, e.g. 5 km mi.');
      const groups: Record<string, Record<string, number>> = {
        length: { m: 1, km: 1000, cm: .01, mm: .001, in: .0254, ft: .3048, yd: .9144, mi: 1609.344 },
        mass: { kg: 1, g: .001, mg: .000001, lb: .45359237, oz: .028349523125 },
        volume: { l: 1, ml: .001, gal: 3.785411784, cup: .2365882365 },
      };
      const a = from.toLowerCase(), b = to.toLowerCase();
      let converted: number;
      if (['c', 'f', 'k'].includes(a) && ['c', 'f', 'k'].includes(b)) {
        const c = a === 'c' ? value : a === 'f' ? (value - 32) * 5 / 9 : value - 273.15;
        converted = b === 'c' ? c : b === 'f' ? c * 9 / 5 + 32 : c + 273.15;
      } else {
        const family = Object.values(groups).find((group) => a in group && b in group);
        if (!family) throw new ProcessorError(`Can't convert ${from} to ${to}. Supported: length, mass, volume, and temperature units.`);
        converted = value * family[a] / family[b];
      }
      return textResult(`${value} ${from} = ${Number(converted.toPrecision(10))} ${to}`, 'unit-conversion.txt');
    }
    case 'hash-generator': {
      const algorithm = String(options.algorithm ?? 'SHA-256');
      const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
      const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      return textResult(`${algorithm}: ${hex}`, 'hash.txt');
    }
    case 'markdown-preview': {
      const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
      const html = escapeHtml(input).split(/\r?\n/).map((line) => {
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`;
        if (/^[-*]\s+/.test(line)) return `<li>${line.slice(2)}</li>`;
        return line ? `<p>${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>')}</p>` : '';
      }).join('\n');
      return textResult(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Markdown Preview</title><style>body{max-width:800px;margin:40px auto;padding:0 20px;font:16px/1.6 system-ui;color:#202124}code{background:#eee;padding:.15em .35em;border-radius:4px}li{margin-left:1.5em}</style>${html}`, `${base}_preview.html`, 'text/html');
    }
    case 'invoice-generator': {
      const data = parseJsonInput(input);
      const items = Array.isArray(data.items) ? data.items as Record<string, unknown>[] : [];
      if (!items.length) throw new ProcessorError('Add an items array with description, quantity, and unitPrice.');
      const itemRows = items.map((item) => {
        const qty = Number(item.quantity ?? 1), price = Number(item.unitPrice ?? 0);
        return `${String(item.description ?? 'Item')} | ${qty} × ${price.toFixed(2)} = ${(qty * price).toFixed(2)}`;
      });
      const total = items.reduce((sum, item) => sum + Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0), 0);
      const rows = [`Invoice: ${String(data.invoiceNumber ?? 'Draft')}`, `Date: ${String(data.date ?? new Date().toLocaleDateString())}`, `From: ${String(data.from ?? '')}`, `Bill to: ${String(data.to ?? '')}`, '', 'Items:', ...itemRows, '', `Total: ${String(data.currency ?? '')} ${total.toFixed(2)}`];
      return simplePdf('INVOICE', rows, 'invoice.pdf');
    }
    case 'resume-builder': {
      const data = parseJsonInput(input);
      const sections = ['name', 'title', 'email', 'phone', 'location', 'summary', 'skills', 'experience', 'education'];
      const rows = sections.filter((key) => data[key] !== undefined).flatMap((key) => [`${key.toUpperCase()}:`, ...(Array.isArray(data[key]) ? (data[key] as unknown[]).map(String) : [String(data[key])]), '']);
      if (!data.name) throw new ProcessorError('Resume JSON needs at least a name field.');
      return simplePdf(String(data.name), rows, 'resume.pdf');
    }
    case 'business-card-generator': {
      const data = parseJsonInput(input);
      if (!data.name) throw new ProcessorError('Add a name field to the business card details.');
      return simplePdf(String(data.name), ['BUSINESS CARD', String(data.title ?? ''), String(data.company ?? ''), String(data.email ?? ''), String(data.phone ?? ''), String(data.website ?? '')].filter(Boolean), 'business-card.pdf');
    }
    case 'qr-generator': {
      if (!input.trim()) throw new ProcessorError('Enter the text or URL to put in the QR code.');
      const dataUrl = await QRCode.toDataURL(input.trim(), { width: Number(options.size ?? 512), margin: 2, errorCorrectionLevel: 'M' });
      const blob = await (await fetch(dataUrl)).blob();
      return { blob, filename: 'qr-code.png', mimeType: 'image/png', meta: { width: Number(options.size ?? 512), outputSize: blob.size } };
    }
    default:
      throw new ProcessorError('This text tool does not have a processor in this build.', 'NOT_IMPLEMENTED');
  }
}
