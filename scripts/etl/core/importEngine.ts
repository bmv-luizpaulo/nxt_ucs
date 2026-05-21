import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

import { supabaseAdmin } from '../../../src/lib/db/supabase';
import { calculateHash, countLines } from './helpers';
import { loadCheckpoint, saveCheckpoint, clearCheckpoint } from './checkpoint';
import { logDLQ, saveMetrics, printTelemetry, clearDLQ, readMetrics } from './logger';
import { updateManifestImport } from './manifest';

export interface ImporterConfig<Row = any, Output = any, AuxData = any> {
  importerKey: string;
  csvFile: string;
  collection: string;
  originalTable: string;
  schema: z.ZodSchema<Row>;
  transform: (row: Row, auxData?: AuxData) => Output | null | Promise<Output | null>;
  loadAuxiliaryData?: () => Promise<AuxData> | AuxData;
  sleepMs?: number;
  batchSize?: number;
  docId?: (row: Row) => string;
}

// Helper to convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Prepare flat record for Postgres
function prepareRecordForPostgres(transformed: any, metadata: any): any {
  const record: any = {};
  
  // Copy transformed properties
  for (const [key, val] of Object.entries(transformed)) {
    record[camelToSnake(key)] = val;
  }
  
  // Copy metadata properties
  for (const [key, val] of Object.entries(metadata)) {
    record[camelToSnake(key)] = val;
  }
  
  return record;
}

/**
 * Execute a single importer config using modular settings.
 */
export async function runImportForConfig(config: ImporterConfig): Promise<number> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');

  // Parse version flag e.g. --version=v1
  let migrationVersion = 'v1';
  const versionArg = args.find((a) => a.startsWith('--version='));
  if (versionArg) {
    migrationVersion = versionArg.split('=')[1];
  } else {
    const vIndex = args.indexOf('--version');
    if (vIndex !== -1 && args[vIndex + 1]) {
      migrationVersion = args[vIndex + 1];
    }
  }

  const csvPath = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo', config.csvFile);
  const importerKey = config.importerKey;

  console.log(`\n======================================================`);
  console.log(`🚀 IMPORTANDO PARA SUPABASE: ${importerKey.toUpperCase()} (Tabela: ${config.originalTable})`);
  console.log(`📁 CSV: ${config.csvFile}`);
  console.log(`📦 Coleção/Tabela: ${config.originalTable}`);
  console.log(`🏷️  Versão da Migração: ${migrationVersion}`);
  console.log(`⚙️  Modo: ${dryRun ? 'DRY-RUN (Sem Gravar)' : 'LIVE (Escrita)'}`);
  console.log(`⚙️  Continuar de Checkpoint: ${resume ? 'SIM' : 'NÃO (Reiniciar)'}`);
  console.log(`======================================================`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ ERRO: Arquivo CSV não encontrado em: ${csvPath}`);
    updateManifestImport(importerKey, { status: 'failed', dryRun });
    return 0;
  }

  // Load checkpoint
  let lastProcessedIndex = 0;
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  if (resume) {
    const cp = loadCheckpoint(importerKey);
    if (cp) {
      lastProcessedIndex = cp.lastProcessedIndex;
      console.log(`🔄 Checkpoint carregado: retomando a partir da linha ${lastProcessedIndex}`);

      // Read matching metric counts to keep stats coherent
      const pastMetrics = readMetrics(importerKey);
      if (pastMetrics) {
        successCount = pastMetrics.successCount;
        errorCount = pastMetrics.errorCount;
        skippedCount = pastMetrics.skippedCount;
      }
    }
  } else {
    clearCheckpoint(importerKey);
    clearDLQ(importerKey);
  }

  // 1. Auxiliary Data Load
  let auxData: any = undefined;
  if (config.loadAuxiliaryData) {
    console.log(`⏳ Carregando dados auxiliares para desnormalização...`);
    auxData = await config.loadAuxiliaryData();
    console.log(`✅ Dados auxiliares carregados.`);
  }

  // 2. Scan Lines
  console.log(`⏳ Calculando total de linhas...`);
  const totalRows = await countLines(csvPath);
  console.log(`✅ Total de linhas no CSV: ${totalRows}`);

  // Update manifest status to running
  updateManifestImport(importerKey, { status: 'running', dryRun });

  // Initialize loop parameters
  let bufferedRecords: any[] = [];
  let processed = 0;
  const batchSize = config.batchSize || 1000;
  let baseSleepMs = config.sleepMs !== undefined ? config.sleepMs : 50;
  let currentSleepMs = baseSleepMs;

  const startTime = Date.now();
  let lastLogTime = Date.now();
  let batchStartTimes: number[] = [];

  const stream = fs.createReadStream(csvPath, { encoding: 'latin1' }).pipe(csv());

  // Loop
  for await (const row of stream) {
    processed++;

    // Skip if resuming
    if (resume && processed <= lastProcessedIndex) {
      continue;
    }

    if (!row.id) {
      skippedCount++;
      continue;
    }

    // Schema Validation
    const parsed = config.schema.safeParse(row);
    if (!parsed.success) {
      errorCount++;
      logDLQ(importerKey, row, parsed.error);
      continue;
    }

    // Transform
    let transformed: any = null;
    try {
      transformed = await config.transform(parsed.data, auxData);
    } catch (err) {
      errorCount++;
      logDLQ(importerKey, row, err);
      continue;
    }

    if (!transformed) {
      skippedCount++;
      continue;
    }

    // Hashing
    const sourceHash = calculateHash(row);
    const documentHash = calculateHash(transformed);

    // Final Document structure
    const rawMetadata = {
      migratedAt: new Date(),
      migrationVersion,
      source: 'legacy_sql',
      originalTable: config.originalTable,
      originalId: String(row.id),
      sourceHash,
      documentHash,
    };

    // Convert keys to snake_case and flatten metadata for Postgres
    const finalRecord = prepareRecordForPostgres(transformed, rawMetadata);

    if (!dryRun) {
      bufferedRecords.push(finalRecord);
    }
    successCount++;

    // Commit Batch if full
    if (bufferedRecords.length === batchSize) {
      const batchTime = await commitSupabaseBatchWithRetry(
        importerKey,
        config.originalTable,
        bufferedRecords,
        dryRun,
        currentSleepMs
      );

      if (batchTime !== null) {
        batchStartTimes.push(batchTime);
        if (batchStartTimes.length > 5) batchStartTimes.shift();

        // Adaptive Sleep adjustment based on latency
        const avgBatchTime = batchStartTimes.reduce((a, b) => a + b, 0) / batchStartTimes.length;
        if (avgBatchTime > 2000) {
          currentSleepMs = Math.min(10000, currentSleepMs + 100); // Latency high, cool down
        } else if (avgBatchTime < 1000) {
          currentSleepMs = Math.max(baseSleepMs, currentSleepMs - 20); // Latency low, speed up
        }
      }

      // Checkpoint per batch
      if (!dryRun) {
        saveCheckpoint(importerKey, processed, String(row.id));
      }

      bufferedRecords = [];
    }

    // Telemetry throttle (every 1s)
    const now = Date.now();
    if (now - lastLogTime > 1000 || processed === totalRows) {
      const durationMs = now - startTime;
      const throughput = processed / (durationMs / 1000);
      const avgBatchTime = batchStartTimes.length > 0
        ? batchStartTimes.reduce((a, b) => a + b, 0) / batchStartTimes.length
        : 0;

      const metrics = {
        totalRows,
        processed,
        successCount,
        errorCount,
        skippedCount,
        throughput: isFinite(throughput) ? throughput : 0,
        avgBatchTimeMs: avgBatchTime,
        memoryUsageMb: process.memoryUsage().heapUsed / 1024 / 1024,
        durationMs,
        etaSeconds: throughput > 0 ? (totalRows - processed) / throughput : 0,
        status: 'running' as const,
      };

      printTelemetry(importerKey, metrics);
      saveMetrics(importerKey, metrics);
      lastLogTime = now;

      // Incremental manifest update
      updateManifestImport(importerKey, {
        processedRows: processed,
        successCount,
        errorCount,
        skippedCount,
      });
    }
  }

  // Commit remaining items in final batch
  if (bufferedRecords.length > 0) {
    await commitSupabaseBatchWithRetry(
      importerKey,
      config.originalTable,
      bufferedRecords,
      dryRun,
      currentSleepMs
    );
    if (!dryRun) {
      saveCheckpoint(importerKey, processed, 'final');
    }
    bufferedRecords = [];
  }

  // Complete metrics
  const durationMs = Date.now() - startTime;
  const finalMetrics = {
    totalRows,
    processed,
    successCount,
    errorCount,
    skippedCount,
    throughput: totalRows / (durationMs / 1000),
    avgBatchTimeMs: batchStartTimes.length > 0
      ? batchStartTimes.reduce((a, b) => a + b, 0) / batchStartTimes.length
      : 0,
    memoryUsageMb: process.memoryUsage().heapUsed / 1024 / 1024,
    durationMs,
    etaSeconds: 0,
    status: 'completed' as const,
  };

  printTelemetry(importerKey, finalMetrics);
  saveMetrics(importerKey, finalMetrics);
  console.log(`\n\n🏁 Concluído [${importerKey}]. OK: ${successCount}, ERR: ${errorCount}, SKIP: ${skippedCount}`);

  // Final checkpoint cleanup
  if (!dryRun) {
    clearCheckpoint(importerKey);
  }

  updateManifestImport(importerKey, {
    status: 'completed',
    processedRows: processed,
    successCount,
    errorCount,
    skippedCount,
    durationMs,
    dryRun,
  });

  return successCount;
}

/**
 * Commits a batch to Supabase, wrapping with retries, adaptive backoff delay, and throttling.
 */
async function commitSupabaseBatchWithRetry(
  importerKey: string,
  table: string,
  records: any[],
  dryRun: boolean,
  sleepMs: number
): Promise<number | null> {
  if (dryRun || records.length === 0) {
    // Simulated sleep in dry run
    await new Promise((r) => setTimeout(r, 10));
    return 10;
  }

  const maxAttempts = 3;
  let attempt = 0;
  let delay = sleepMs;

  while (attempt < maxAttempts) {
    attempt++;
    const start = Date.now();
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .upsert(records);

      if (error) {
        throw error;
      }

      const elapsed = Date.now() - start;

      // Apply standard throttle sleep
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
      return elapsed;
    } catch (err: any) {
      console.error(
        `\n⚠️ [${importerKey}] Falha no Supabase upsert (Tentativa ${attempt}/${maxAttempts}). Erro:`,
        err.message || err
      );

      if (attempt === maxAttempts) {
        updateManifestImport(importerKey, { status: 'failed' });
        throw err; // Out of retries
      }

      // Check for common temporary errors or rate limits
      const coolDownDelay = 2000 * Math.pow(2, attempt);
      console.log(`⏳ Aguardando ${coolDownDelay / 1000}s antes de tentar novamente...`);
      await new Promise((r) => setTimeout(r, coolDownDelay));
      delay = delay + 50; // Increase normal throttle sleep slightly
    }
  }

  return null;
}
