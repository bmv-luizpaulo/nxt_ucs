import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(req: NextRequest) {
  try {
    const cwd = process.cwd();

    // 1. Read Manifest
    const manifestPath = path.resolve(cwd, 'scripts/etl/migration-manifest.json');
    let manifest = {
      version: 'v1',
      status: 'idle',
      startedAt: null,
      completedAt: null,
      imports: {},
    };
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch (err) {
        console.error('Error parsing manifest:', err);
      }
    }

    // 2. Read Active Process
    const activeProcessPath = path.resolve(cwd, 'scripts/etl/logs/active-process.json');
    let activeProcess: any = null;
    let isRunning = false;

    if (fs.existsSync(activeProcessPath)) {
      try {
        activeProcess = JSON.parse(fs.readFileSync(activeProcessPath, 'utf-8'));
        if (activeProcess && activeProcess.pid) {
          try {
            // Check if process exists (Windows & Unix safe)
            process.kill(activeProcess.pid, 0);
            isRunning = true;
          } catch (e) {
            // Process is dead, clean up active process log
            isRunning = false;
            try {
              fs.unlinkSync(activeProcessPath);
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error parsing active process state:', err);
      }
    }

    // 3. Read Metrics for all sub-importers
    const metricsDir = path.resolve(cwd, 'scripts/etl/logs/metrics');
    const metrics: Record<string, any> = {};
    if (fs.existsSync(metricsDir)) {
      try {
        const files = fs.readdirSync(metricsDir);
        for (const f of files) {
          if (f.endsWith('.json')) {
            const key = f.replace('.json', '');
            try {
              metrics[key] = JSON.parse(fs.readFileSync(path.join(metricsDir, f), 'utf-8'));
            } catch {}
          }
        }
      } catch {}
    }

    // 4. Read Checkpoints
    const checkpointsDir = path.resolve(cwd, 'scripts/etl/checkpoints');
    const checkpoints: Record<string, any> = {};
    if (fs.existsSync(checkpointsDir)) {
      try {
        const files = fs.readdirSync(checkpointsDir);
        for (const f of files) {
          if (f.endsWith('.checkpoint.json')) {
            const key = f.replace('.checkpoint.json', '');
            try {
              checkpoints[key] = JSON.parse(fs.readFileSync(path.join(checkpointsDir, f), 'utf-8'));
            } catch {}
          }
        }
      } catch {}
    }

    // 5. Read Console Log Tail
    const { searchParams } = new URL(req.url);
    const selectedKey = searchParams.get('importerKey') || (isRunning ? activeProcess?.importerKey : null);
    let consoleTail = '';

    if (selectedKey) {
      const logPath = path.resolve(cwd, `scripts/etl/logs/console/${selectedKey}.log`);
      if (fs.existsSync(logPath)) {
        try {
          const content = fs.readFileSync(logPath, 'utf-8');
          // Clean ANSI color escape codes from log output for cleaner display
          const cleanContent = content.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
          const lines = cleanContent.split('\n');
          consoleTail = lines.slice(-200).join('\n');
        } catch {}
      }
    }

    // 6. Quota Estimation
    // Firebase Spark Plan allows 20,000 writes/day
    const SPARK_DAILY_LIMIT = 20000;
    let totalWrites = 0;
    if (manifest && manifest.imports) {
      totalWrites = Object.values(manifest.imports).reduce((acc: number, imp: any) => {
        return acc + (imp.successCount || 0);
      }, 0);
    }

    // Calculate DLQ files size / rows count
    const dlqDir = path.resolve(cwd, 'scripts/etl/logs/dead_letter');
    let totalDlqErrors = 0;
    const dlqFiles: string[] = [];
    if (fs.existsSync(dlqDir)) {
      try {
        const files = fs.readdirSync(dlqDir);
        for (const f of files) {
          if (f.endsWith('_dlq.jsonl')) {
            dlqFiles.push(f);
            try {
              const content = fs.readFileSync(path.join(dlqDir, f), 'utf-8');
              const linesCount = content.trim().split('\n').filter(l => l.length > 0).length;
              totalDlqErrors += linesCount;
            } catch {}
          }
        }
      } catch {}
    }

    return NextResponse.json({
      manifest,
      activeProcess: isRunning ? activeProcess : null,
      metrics,
      checkpoints,
      consoleTail,
      quota: {
        totalWrites,
        limit: SPARK_DAILY_LIMIT,
        percentage: Number(((totalWrites / SPARK_DAILY_LIMIT) * 100).toFixed(2)),
      },
      dlq: {
        totalErrors: totalDlqErrors,
        files: dlqFiles,
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
