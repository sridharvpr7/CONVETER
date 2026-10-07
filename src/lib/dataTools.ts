import * as XLSX from 'xlsx';
import type { ProcessorResult } from './processors';
import { ProcessorError } from './processors';

function excelResult(workbook: XLSX.WorkBook, filename: string): ProcessorResult {
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return { blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
}

export async function csvToExcel(file: File): Promise<ProcessorResult> {
  const workbook = XLSX.read(await file.text(), { type: 'string' });
  return excelResult(workbook, file.name.replace(/\.csv$/i, '') + '.xlsx');
}

export async function excelToCsv(file: File): Promise<ProcessorResult> {
  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new ProcessorError('The workbook has no worksheets.');
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return { blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename: file.name.replace(/\.(xlsx?|xlsm)$/i, '') + '.csv', mimeType: 'text/csv' };
}

export async function jsonToExcel(file: File): Promise<ProcessorResult> {
  let data: unknown;
  try { data = JSON.parse(await file.text()); }
  catch { throw new ProcessorError('Invalid JSON file.', 'INVALID_JSON'); }
  const rows = Array.isArray(data) ? data : [data];
  if (!rows.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    throw new ProcessorError('JSON must contain an object or an array of objects.');
  }
  const sheet = XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
  return excelResult(workbook, file.name.replace(/\.json$/i, '') + '.xlsx');
}

function xmlNode(node: Element): unknown {
  const result: Record<string, unknown> = {};
  for (const attr of Array.from(node.attributes)) result[`@${attr.name}`] = attr.value;
  for (const child of Array.from(node.children)) {
    const value = xmlNode(child);
    const existing = result[child.tagName];
    result[child.tagName] = existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  const text = Array.from(node.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent?.trim() ?? '').join('').trim();
  if (text) result['#text'] = text;
  if (!Object.keys(result).length) return node.textContent?.trim() ?? '';
  return result;
}

export async function xmlToJson(file: File): Promise<ProcessorResult> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror') || !doc.documentElement) throw new ProcessorError('Invalid XML file.', 'INVALID_XML');
  const json = JSON.stringify({ [doc.documentElement.tagName]: xmlNode(doc.documentElement) }, null, 2);
  return { blob: new Blob([json], { type: 'application/json' }), filename: file.name.replace(/\.xml$/i, '') + '.json', mimeType: 'application/json' };
}
