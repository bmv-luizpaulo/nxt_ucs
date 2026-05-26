import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

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

export async function GET() {
  try {
    const { data: dbTables, error: rpcError } = await supabaseAdmin.rpc('get_tables_metadata');

    if (rpcError || !dbTables) {
      console.warn("RPC 'get_tables_metadata' failed or missing, returning empty table list:", rpcError?.message);
      return NextResponse.json({ tables: [], total: 0 });
    }

    const tables = dbTables.map((t: any) => {
      const name = t.table_name;
      // Filter out metadata columns to keep user view clean
      const metadataCols = ['migrated_at', 'migration_version', 'source', 'original_table', 'original_id', 'source_hash', 'document_hash'];
      const columns = (t.columns || []).filter((c: string) => !metadataCols.includes(c));

      return {
        name,
        file: `${name}.csv`,
        domain: getDomain(name),
        sizeBytes: 0,
        sizeKB: 0,
        rows: Number(t.row_count || 0),
        columns,
        columnCount: columns.length,
      };
    });

    // Sort: by domain then by name
    tables.sort((a: any, b: any) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));

    return NextResponse.json({ tables, total: tables.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
