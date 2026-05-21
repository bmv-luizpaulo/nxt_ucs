import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_PATH = path.resolve(process.cwd(), 'scripts/etl/migration-manifest.json');

export interface ManifestImport {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  processedRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  durationMs: number;
  lastRunAt: string;
  dryRun: boolean;
}

export interface MigrationManifest {
  version: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  imports: Record<string, ManifestImport>;
}

export function loadManifest(): MigrationManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {
      version: 'v1',
      status: 'idle',
      startedAt: null,
      completedAt: null,
      imports: {},
    };
  }
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as MigrationManifest;
  } catch {
    return {
      version: 'v1',
      status: 'idle',
      startedAt: null,
      completedAt: null,
      imports: {},
    };
  }
}

export function saveManifest(manifest: MigrationManifest): void {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️ Erro ao salvar manifest:', err);
  }
}

export function updateManifestImport(
  importerKey: string,
  data: Partial<ManifestImport>
): void {
  const manifest = loadManifest();
  const current = manifest.imports[importerKey] || {
    status: 'idle',
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    durationMs: 0,
    lastRunAt: new Date().toISOString(),
    dryRun: false,
  };

  manifest.imports[importerKey] = {
    ...current,
    ...data,
    lastRunAt: new Date().toISOString(),
  };

  // Derive global status
  const importsArr = Object.values(manifest.imports);
  if (importsArr.some((i) => i.status === 'running')) {
    manifest.status = 'running';
    if (!manifest.startedAt) {
      manifest.startedAt = new Date().toISOString();
    }
  } else if (importsArr.every((i) => i.status === 'completed')) {
    manifest.status = 'completed';
    manifest.completedAt = new Date().toISOString();
  } else if (importsArr.some((i) => i.status === 'failed')) {
    manifest.status = 'failed';
  }

  saveManifest(manifest);
}
