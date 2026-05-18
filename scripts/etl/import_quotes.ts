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
const SLEEP_MS = 1500;
const CSV_PATH = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_ucs_quote.csv');

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

  console.log(`\n🚀 Iniciando importação de COTAÇÕES UCS (dbo_ucs_quote)...`);
  console.log(`Total estimado: 402 registros (histórico mensal desde Jan/2021)\n`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ ERRO: Arquivo CSV não encontrado em: ${CSV_PATH}`);
    process.exit(1);
  }

  let batch = writeBatch(db);
  let count = 0;
  let totalImported = 0;

  const parser = fs.createReadStream(CSV_PATH, { encoding: 'latin1' }).pipe(csv());

  for await (const row of parser) {
    if (!row.id) continue;

    // Compõe ID legível: "REAL_2021-01" para facilitar queries diretas
    const currency = (row.currency || 'UNKNOWN').toUpperCase();
    const dateStr = row.created_on ? row.created_on.substring(0, 7) : row.id; // ex: "2021-01"
    const docId = `${currency}_${dateStr}`;

    const docRef = doc(db, 'ucsQuotes', docId);

    const data = {
      legacyId: row.id.toString(),
      currency: currency,                                   // REAL | USD | EUR
      price: row.price ? parseFloat(row.price) : 0,        // preço da UCS naquela moeda naquele mês
      referenceMonth: dateStr,                              // "2021-01"
      originalCreatedOn: row.created_on ? Timestamp.fromDate(new Date(row.created_on)) : null,
      updatedBy: row.user_id ? row.user_id.toString() : null,
      migratedAt: serverTimestamp(),
    };

    batch.set(docRef, data, { merge: true });
    count++;
    totalImported++;

    if (count === BATCH_SIZE) {
      console.log(`⏳ Gravando lote... (${totalImported} cotações processadas)`);
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

  console.log(`\n✅ Sucesso! Total de Cotações migradas: ${totalImported}`);
  process.exit(0);
}

run().catch(console.error);
