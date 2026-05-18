import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const CSV_DIR = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo');

// Domain classification by filename prefix
function getDomain(name: string): string {
  if (name.startsWith('dbo_')) return 'Core';
  if (name.startsWith('financial_')) return 'Financeiro';
  if (name.startsWith('plat_tesouro_verde_')) return 'Tesouro Verde';
  if (name.startsWith('plat_akses_')) return 'Akses';
  if (name.startsWith('mundi_')) return 'Mundi';
  if (name.startsWith('public_')) return 'Sistema';
  return 'Outros';
}

// Counts lines in a file efficiently (no full load)
async function countLines(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });
    rl.on('line', () => count++);
    rl.on('close', () => resolve(Math.max(0, count - 1))); // subtract header
    rl.on('error', () => resolve(-1));
  });
}

// Reads only the first line to extract column names
function getColumns(filePath: string): Promise<string[]> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'latin1' }),
      crlfDelay: Infinity,
    });
    rl.once('line', (line) => {
      rl.close();
      resolve(line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
    });
    rl.on('error', () => resolve([]));
  });
}

export async function GET() {
  if (!fs.existsSync(CSV_DIR)) {
    return NextResponse.json({ error: 'CSV directory not found', path: CSV_DIR }, { status: 404 });
  }

  const files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));

  const tables = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(CSV_DIR, file);
      const stats = fs.statSync(filePath);
      const name = file.replace('.csv', '');
      const [rows, columns] = await Promise.all([countLines(filePath), getColumns(filePath)]);

      return {
        name,
        file,
        domain: getDomain(name),
        sizeBytes: stats.size,
        sizeKB: Math.round(stats.size / 1024),
        rows,
        columns,
        columnCount: columns.length,
      };
    })
  );

  // Sort: by domain then by name
  tables.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));

  return NextResponse.json({ tables, total: tables.length, csvDir: CSV_DIR });
}
