import * as fs from 'fs';
import * as path from 'path';

const CHECKPOINT_DIR = path.resolve(process.cwd(), 'scripts/etl/checkpoints');

export interface CheckpointData {
  importerKey: string;
  lastProcessedIndex: number;
  lastProcessedId: string | null;
  timestamp: string;
}

function ensureDirectoryExists() {
  if (!fs.existsSync(CHECKPOINT_DIR)) {
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }
}

export function loadCheckpoint(importerKey: string): CheckpointData | null {
  ensureDirectoryExists();
  const filePath = path.join(CHECKPOINT_DIR, `${importerKey}.checkpoint.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as CheckpointData;
  } catch (err) {
    console.error(`⚠️ Erro ao ler checkpoint para ${importerKey}:`, err);
    return null;
  }
}

export function saveCheckpoint(importerKey: string, index: number, lastId: string | null = null): void {
  ensureDirectoryExists();
  const filePath = path.join(CHECKPOINT_DIR, `${importerKey}.checkpoint.json`);
  const data: CheckpointData = {
    importerKey,
    lastProcessedIndex: index,
    lastProcessedId: lastId,
    timestamp: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`⚠️ Erro ao salvar checkpoint para ${importerKey}:`, err);
  }
}

export function clearCheckpoint(importerKey: string): void {
  ensureDirectoryExists();
  const filePath = path.join(CHECKPOINT_DIR, `${importerKey}.checkpoint.json`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`⚠️ Erro ao deletar checkpoint para ${importerKey}:`, err);
    }
  }
}
