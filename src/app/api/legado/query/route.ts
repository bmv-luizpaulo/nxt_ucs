import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

const MAX_ROWS = 500;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const table = searchParams.get('table');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), MAX_ROWS);
  const search = searchParams.get('search') || '';
  const searchCol = searchParams.get('searchCol') || '';

  if (!table) {
    return NextResponse.json({ error: 'Missing ?table= parameter' }, { status: 400 });
  }

  const tableName = table.replace(/[^a-zA-Z0-9_\-]/g, '');

  try {
    // 1. Fetch all rows matching basic filters
    let query = supabaseAdmin.from(tableName).select('*');

    if (search && searchCol) {
      query = query.ilike(searchCol, `%${search}%`);
    }

    const { data: dbRows, error: rowsError } = await query;

    if (rowsError) {
      return NextResponse.json({ error: rowsError.message }, { status: 500 });
    }

    let filteredRows = dbRows || [];

    // Apply global search filter in JS if search is global
    if (search && !searchCol) {
      const lc = search.toLowerCase();
      filteredRows = filteredRows.filter(row =>
        Object.values(row).some(v => String(v || '').toLowerCase().includes(lc))
      );
    }

    const total = filteredRows.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedRows = filteredRows.slice(start, start + pageSize);

    // Extract columns from the first row or return empty
    const columns = dbRows && dbRows.length > 0 ? Object.keys(dbRows[0]) : [];

    const rows = paginatedRows.map(r => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 't' : 'f') : String(v);
      }
      return out;
    });

    return NextResponse.json({
      table: tableName,
      columns,
      rows,
      pagination: { page, pageSize, total, totalPages },
      search,
      searchCol,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
