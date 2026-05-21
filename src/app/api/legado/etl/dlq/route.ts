import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const importerKey = searchParams.get('importerKey');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const cwd = process.cwd();
    const dlqDir = path.resolve(cwd, 'scripts/etl/logs/dead_letter');

    if (!fs.existsSync(dlqDir)) {
      return NextResponse.json({ summary: [], records: [], pagination: { total: 0 } });
    }

    // 1. If no specific importerKey is requested, return the general summary of DLQ files
    if (!importerKey) {
      const files = fs.readdirSync(dlqDir);
      const summary = [];
      
      for (const f of files) {
        if (f.endsWith('_dlq.jsonl')) {
          const filePath = path.join(dlqDir, f);
          const key = f.replace('_dlq.jsonl', '');
          try {
            const stat = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l.length > 0);
            summary.push({
              importerKey: key,
              filename: f,
              sizeBytes: stat.size,
              errorCount: lines.length,
              lastModified: stat.mtime.toISOString(),
            });
          } catch {}
        }
      }
      return NextResponse.json({ summary });
    }

    // 2. Return the paginated errors for the specified importerKey
    const filePath = path.join(dlqDir, `${importerKey}_dlq.jsonl`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        records: [], 
        pagination: { total: 0, page, pageSize, totalPages: 0 } 
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    
    // We reverse the lines to show the most recent validation errors first
    lines.reverse();
    
    const total = lines.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedLines = lines.slice(startIndex, startIndex + pageSize);

    const records = paginatedLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line, error: 'Formato JSON inválido no log' };
      }
    });

    return NextResponse.json({
      records,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
