import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import csv from 'csv-parser';

/**
 * Fix encoding from Latin-1 (ISO-8859-1) to UTF-8.
 */
export function fixEncoding(str: string | undefined | null): string | null {
  if (!str) return null;
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch {
    return str;
  }
}

/**
 * Safely converts value to float, returns fallback if NaN.
 */
export function toFloat(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const num = parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? fallback : num;
}

/**
 * Safely converts value to integer, returns fallback if NaN.
 */
export function toInt(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const num = parseInt(val, 10);
  return isNaN(num) ? fallback : num;
}

/**
 * Safely converts value to boolean (e.g. 't', 'true', 1).
 */
export function toBoolean(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).toLowerCase().trim();
  return str === 't' || str === 'true' || str === '1' || val === true;
}

/**
 * Converts string or date to standard JavaScript Date.
 */
export function toTimestamp(val: any): Date | null {
  if (!val) return null;
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Calculate SHA-256 hash of any string or object.
 */
export function calculateHash(obj: any): string {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * High-speed line count scan for large CSV files.
 */
export async function countLines(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      return resolve(0);
    }
    let count = 0;
    fs.createReadStream(filePath)
      .on('data', (chunk: string | Buffer) => {
        const isBuffer = Buffer.isBuffer(chunk);
        const len = chunk.length;
        for (let i = 0; i < len; ++i) {
          const char = isBuffer ? (chunk as Buffer)[i] : (chunk as string).charCodeAt(i);
          if (char === 10) count++; // 10 is '\n'
        }
      })
      .on('end', () => {
        resolve(count);
      })
      .on('error', () => {
        resolve(0);
      });
  });
}

/**
 * Reads a CSV file fully into memory. Useful for denormalizations.
 */
export async function readCSVFile(fileName: string): Promise<any[]> {
  const filePath = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo', fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return new Promise((resolve) => {
    const results: any[] = [];
    fs.createReadStream(filePath, { encoding: 'latin1' })
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', () => resolve([]));
  });
}
