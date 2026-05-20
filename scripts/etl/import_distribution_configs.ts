import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as fs from 'fs';
import csv from 'csv-parser';
import * as path from 'path';

import { firebaseConfig } from '../../src/firebase/config';

// ============================================================================
const USER_EMAIL = 'luizpaulo.jesus@bmv.global';
const USER_PASSWORD = 'l1u2i3z4';
// ============================================================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const BATCH_SIZE = 450;
const SLEEP_MS = 2500;

function fixEncoding(str: string | undefined): string | null {
  if (!str) return null;
  try { return Buffer.from(str, 'latin1').toString('utf8'); } catch { return str; }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processFile(filePath: string, collection: string, label: string): Promise<number> {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Arquivo não encontrado, pulando: ${filePath}`);
    return 0;
  }

  console.log(`\n📂 Processando: ${label}...`);

  return new Promise((resolve, reject) => {
    let batch = writeBatch(db);
    let count = 0;
    let totalImported = 0;

    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());

    parser.on('data', async (row) => {
      if (!row.id) return;
      parser.pause();

      const docRef = doc(db, collection, row.id.toString());

      const data: Record<string, unknown> = {
        id: row.id.toString(),
        description: fixEncoding(row.description),
        type: row.type || null,
        status: row.status || null,
        migratedAt: serverTimestamp(),
      };

      batch.set(docRef, data, { merge: true });
      count++;
      totalImported++;

      if (count === BATCH_SIZE) {
        console.log(`⏳ Gravando lote... (${totalImported} processados)`);
        try {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
          await sleep(SLEEP_MS);
          parser.resume();
        } catch (err) {
          reject(err);
        }
      } else {
        parser.resume();
      }
    });

    parser.on('end', async () => {
      if (count > 0) {
        await batch.commit();
      }
      console.log(`✅ ${label}: ${totalImported} registros migrados`);
      resolve(totalImported);
    });

    parser.on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('🔑 Autenticando no Firebase...');
  await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
  console.log('✅ Autenticado com sucesso!');

  const csvPath = path.join(__dirname, '../../docs/banco_legado_csvs_completo/dbo_distribution_configuration.csv');
  const total = await processFile(csvPath, 'distributionConfigurations', 'Configurações de Distribuição (distributionConfigurations)');

  console.log(`\n✅ Sucesso! Total distributionConfigurations migrado: ${total} registros`);
  process.exit(0);
}

run().catch(console.error);
