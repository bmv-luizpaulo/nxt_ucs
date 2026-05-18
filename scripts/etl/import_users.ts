import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as fs from 'fs';
import csv from 'csv-parser';
import * as path from 'path';

import { firebaseConfig } from '../../src/firebase/config';

// ============================================================================
// ⚠️ ATENÇÃO: INSIRA SUAS CREDENCIAIS AQUI ANTES DE RODAR O SCRIPT
// ============================================================================
const USER_EMAIL = 'luizpaulo.jesus@bmv.global';
const USER_PASSWORD = 'l1u2i3z4';
// ============================================================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const BATCH_SIZE = 450;
const SLEEP_MS = 2000;
const CSV_PATH = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_user.csv');

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

  console.log(`\n🚀 Iniciando importação de USUÁRIOS da tabela dbo_user...`);
  
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

    const docRef = doc(db, 'users', row.id.toString());
    
    // id,cell_phone,created_on,document,name,phone,status,surname,type,document_type
    const userData = {
      id: row.id.toString(),
      name: row.name || 'Sem Nome',
      surname: row.surname || null,
      document: row.document || null,
      documentType: row.document_type || null,
      cellPhone: row.cell_phone || null,
      phone: row.phone || null,
      type: row.type || null, // PF/PJ
      status: row.status || 'ACTIVE',
      originalCreatedAt: row.created_on ? Timestamp.fromDate(new Date(row.created_on)) : null,
      migratedAt: serverTimestamp()
    };

    batch.set(docRef, userData, { merge: true });
    count++;
    totalImported++;

    if (count === BATCH_SIZE) {
      console.log(`⏳ Gravando lote no Firestore... (${totalImported} usuários processados)`);
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

  console.log(`\n✅ Sucesso! Total de Usuários migrados: ${totalImported}`);
  process.exit(0);
}

run().catch(console.error);
