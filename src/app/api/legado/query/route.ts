import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const CSV_DIR = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo');
const MAX_ROWS = 500; // Safety cap per request

function fixEncoding(str: string): string {
  if (!str) return '';
  try { return Buffer.from(str, 'latin1').toString('utf8'); } catch { return str; }
}

// Applies fix to all string values in a row object
function fixRow(row: Record<string, string>): Record<string, string> {
  const fixed: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    fixed[k] = fixEncoding(v);
  }
  return fixed;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const table = searchParams.get('table');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), MAX_ROWS);
  const search = searchParams.get('search') || '';
  const searchCol = searchParams.get('searchCol') || ''; // specific column to search, or all if empty

  if (!table) {
    return NextResponse.json({ error: 'Missing ?table= parameter' }, { status: 400 });
  }

  // Prevent path traversal
  const safeName = path.basename(table).replace(/[^a-zA-Z0-9_\-]/g, '');
  const filePath = path.join(CSV_DIR, `${safeName}.csv`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `Table not found: ${safeName}` }, { status: 404 });
  }

  return new Promise<NextResponse>((resolve) => {
    const allRows: Record<string, string>[] = [];
    let columns: string[] = [];

    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(
      csv({ mapHeaders: ({ header }) => header.trim() })
    );

    parser.on('headers', (headers: string[]) => {
      columns = headers;
    });

    parser.on('data', (row: Record<string, string>) => {
      const fixed = fixRow(row);

      // Apply search filter
      if (search) {
        const lc = search.toLowerCase();
        const matches = searchCol
          ? (fixed[searchCol] || '').toLowerCase().includes(lc)
          : Object.values(fixed).some(v => v.toLowerCase().includes(lc));
        if (!matches) return;
      }

      allRows.push(fixed);
    });

    parser.on('end', () => {
      const total = allRows.length;
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const rows = allRows.slice(start, start + pageSize);

      resolve(NextResponse.json({
        table: safeName,
        columns,
        rows,
        pagination: { page, pageSize, total, totalPages },
        search,
        searchCol,
      }));
    });

    parser.on('error', (err) => {
      resolve(NextResponse.json({ error: err.message }, { status: 500 }));
    });
  });
}
