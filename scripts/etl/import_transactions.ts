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
const CSV_PATH = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_transaction.csv');

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

  console.log(`\n🚀 Iniciando importação massiva das TRANSAÇÕES (Ledger) da tabela dbo_transaction...`);
  
  let batch = writeBatch(db);
  let count = 0;
  let totalImported = 0;

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ ERRO: Arquivo CSV não encontrado.`);
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const parser = fs.createReadStream(CSV_PATH).pipe(csv());
    
    parser.on('data', async (row) => {
      if (!row.id) return;
      parser.pause();

      const docRef = doc(db, 'transactions', row.id.toString());
      
      const txData = {
        id: row.id.toString(),
        amount: row.amount ? parseFloat(row.amount) : 0,
        issuerId: row.issuer_id ? row.issuer_id.toString() : null,
        recipientId: row.recipient_id ? row.recipient_id.toString() : null,
        description: row.description || null,
        targetBalance: row.target_balance || null,
        originBalance: row.origin_balance || null,
        originalCreatedOn: row.created_on ? Timestamp.fromDate(new Date(row.created_on)) : null,
        originalFinishedOn: row.finished_on ? Timestamp.fromDate(new Date(row.finished_on)) : null,
        cprAreaId: row.cpr_area_id ? row.cpr_area_id.toString() : null,
        migratedAt: serverTimestamp()
      };

      batch.set(docRef, txData, { merge: true });
      count++;
      totalImported++;

      if (count === BATCH_SIZE) {
        console.log(`⏳ Gravando lote no Firestore... (${totalImported} transações processadas)`);
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
      console.log(`\n✅ Sucesso! Total de Transações migradas: ${totalImported}`);
      process.exit(0);
    });

    parser.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });
  });
}

run().catch(console.error);
