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
const SLEEP_MS = 2000;
const CSV_PATH = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_harvest.csv');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`🔑 Autenticando usuário...`);
  try {
    await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
  } catch (error) {
    console.error(`❌ Falha na autenticação.`);
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando importação de SAFRAS da tabela dbo_harvest...`);
  
  let batch = writeBatch(db);
  let count = 0;
  let totalImported = 0;

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ ERRO: Arquivo CSV não encontrado.`);
    process.exit(1);
  }

  const parser = fs.createReadStream(CSV_PATH).pipe(csv());

  for await (const row of parser) {
    if (!row.id) continue;

    const docRef = doc(db, 'harvests', row.id.toString());
    
    const harvestData = {
      id: row.id.toString(),
      areaId: row.area_id ? row.area_id.toString() : null,
      year: row.year ? parseInt(row.year) : null,
      amount: row.amount ? parseFloat(row.amount) : 0,
      platformId: row.platform_id ? row.platform_id.toString() : null,
      registeredOn: row.registered_on ? Timestamp.fromDate(new Date(row.registered_on)) : null,
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
      migratedAt: serverTimestamp()
    };

    batch.set(docRef, harvestData, { merge: true });
    count++;
    totalImported++;

    if (count === BATCH_SIZE) {
      console.log(`⏳ Gravando lote no Firestore... (${totalImported} safras processadas)`);
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
      await sleep(SLEEP_MS);
    }
  }

  if (count > 0) {
    console.log(`⏳ Gravando lote final...`);
    await batch.commit();
  }

  console.log(`\n✅ Sucesso! Total de Safras migradas: ${totalImported}`);
  process.exit(0);
}

run().catch(console.error);
