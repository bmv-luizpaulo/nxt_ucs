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
const CSV_PATH = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_distribution.csv');

// Fix encoding: converte Latin-1/Windows-1252 → UTF-8
function fixEncoding(str: string | undefined): string | null {
  if (!str) return null;
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch {
    return str;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`🔑 Autenticando usuário...`);
  try {
    await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
    console.log(`✅ Autenticado!`);
  } catch (error) {
    console.error(`❌ Falha na autenticação.`);
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando importação de DISTRIBUIÇÕES (dbo_distribution)...`);
  console.log(`Total estimado: ~39.355 registros\n`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ ERRO: Arquivo CSV não encontrado em: ${CSV_PATH}`);
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    let batch = writeBatch(db);
    let count = 0;
    let totalImported = 0;

    const parser = fs.createReadStream(CSV_PATH, { encoding: 'latin1' }).pipe(csv());

    parser.on('data', async (row) => {
      if (!row.id) return;
      parser.pause();

      const docRef = doc(db, 'distributions', row.id.toString());

      const data = {
        id: row.id.toString(),
        amount: row.amount ? parseFloat(row.amount) : 0,
        status: row.status || null,
        type: row.type || null,                             // PARTITION_HARVEST, SALE, TRANSFER, etc.
        harvestYear: row.harvest_year ? parseInt(row.harvest_year) : null,
        harvestId: row.harvest_id ? row.harvest_id.toString() : null,
        distributionOriginId: row.distribution_origin_id ? row.distribution_origin_id.toString() : null,
        privateUcsAmount: row.private_ucs_amount ? parseFloat(row.private_ucs_amount) : 0,
        publicUcsAmount: row.public_ucs_amount ? parseFloat(row.public_ucs_amount) : 0,
        errorDescription: fixEncoding(row.error_description),
        originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
        createdBy: row.created_by ? row.created_by.toString() : null,
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
        console.log(`⏳ Gravando lote final...`);
        await batch.commit();
      }
      console.log(`\n✅ Sucesso! Total de Distribuições migradas: ${totalImported}`);
      process.exit(0);
    });

    parser.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });
  });
}

run().catch(console.error);
