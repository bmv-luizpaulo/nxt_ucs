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
const CSV_PATH = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_cpr.csv');

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

  console.log(`\n🚀 Iniciando importação de CPRs da tabela dbo_cpr...`);
  
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

    const docRef = doc(db, 'cprs', row.id.toString());
    
    // Tratamento robusto para os valores numéricos da CPR e datas
    const cprData = {
      id: row.id.toString(),
      isin: row.isin || null,
      name: row.name || 'Sem Nome',
      representativeName: row.representative_name || null,
      representativeDocument: row.representative_document || null,
      representativeContact: row.representative_contact || null,
      status: row.status || 'UNKNOWN',
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      nominalValue: row.nominal_value ? parseFloat(row.nominal_value) : 0,
      emissionDate: row.emission_date ? Timestamp.fromDate(new Date(row.emission_date)) : null,
      expirationDate: row.expiration_date ? Timestamp.fromDate(new Date(row.expiration_date)) : null,
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
      description: row.description || null,
      processingMessage: row.processing_message || null,
      roleUserId: row.role_user_id ? row.role_user_id.toString() : null,
      migratedAt: serverTimestamp()
    };

    batch.set(docRef, cprData, { merge: true });
    count++;
    totalImported++;

    if (count === BATCH_SIZE) {
      console.log(`⏳ Gravando lote no Firestore... (${totalImported} CPRs processadas)`);
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

  console.log(`\n✅ Sucesso! Total de CPRs migradas: ${totalImported}`);
  process.exit(0);
}

run().catch(console.error);
