import * as fs from 'fs';
import * as path from 'path';

const LOGS_DIR = path.resolve(process.cwd(), 'scripts/etl/logs');

export interface ImportMetrics {
  totalRows: number;
  processed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  throughput: number; // rows/sec
  avgBatchTimeMs: number;
  memoryUsageMb: number;
  durationMs: number;
  etaSeconds: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
}

function ensureDirectories() {
  fs.mkdirSync(path.join(LOGS_DIR, 'dead_letter'), { recursive: true });
  fs.mkdirSync(path.join(LOGS_DIR, 'metrics'), { recursive: true });
}

/**
 * Log a parsing or validation error to the Dead Letter Queue (.jsonl format).
 */
export function logDLQ(importerKey: string, row: any, error: any) {
  ensureDirectories();
  const filePath = path.join(LOGS_DIR, 'dead_letter', `${importerKey}_dlq.jsonl`);
  const record = {
    timestamp: new Date().toISOString(),
    row,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  try {
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf-8');
  } catch (err) {
    console.error(`⚠️ Erro ao gravar DLQ para ${importerKey}:`, err);
  }
}

/**
 * Save execution metrics to a JSON file.
 */
export function saveMetrics(importerKey: string, metrics: ImportMetrics) {
  ensureDirectories();
  const filePath = path.join(LOGS_DIR, 'metrics', `${importerKey}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2), 'utf-8');
  } catch (err) {
    console.error(`⚠️ Erro ao salvar métricas para ${importerKey}:`, err);
  }
}

/**
 * Read current metrics if they exist.
 */
export function readMetrics(importerKey: string): ImportMetrics | null {
  const filePath = path.join(LOGS_DIR, 'metrics', `${importerKey}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ImportMetrics;
  } catch {
    return null;
  }
}

/**
 * Clear DLQ file for an importer.
 */
export function clearDLQ(importerKey: string) {
  ensureDirectories();
  const filePath = path.join(LOGS_DIR, 'dead_letter', `${importerKey}_dlq.jsonl`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
}

/**
 * Prints a beautiful telemetry update on the terminal line.
 */
export function printTelemetry(importerKey: string, metrics: ImportMetrics) {
  const percent = metrics.totalRows > 0 ? ((metrics.processed / metrics.totalRows) * 100).toFixed(1) : '0.0';
  const progressStr = `Progress: [${'='.repeat(Math.round(Number(percent) / 5))}${' '.repeat(20 - Math.round(Number(percent) / 5))}] ${percent}%`;
  const speedStr = `${metrics.throughput.toFixed(1)} rows/s`;
  const etaStr = metrics.etaSeconds > 0 ? `ETA: ${Math.round(metrics.etaSeconds)}s` : 'ETA: --';
  const batchTimeStr = `Avg Batch: ${Math.round(metrics.avgBatchTimeMs)}ms`;
  const memStr = `RAM: ${metrics.memoryUsageMb.toFixed(1)}MB`;
  const countsStr = `Processed: ${metrics.processed}/${metrics.totalRows} (OK:${metrics.successCount}, Err:${metrics.errorCount}, Skip:${metrics.skippedCount})`;

  // Print in place
  process.stdout.write(`\r\x1b[K📊 [${importerKey}] ${progressStr} | ${countsStr} | ${speedStr} | ${batchTimeStr} | ${memStr} | ${etaStr}`);
}
