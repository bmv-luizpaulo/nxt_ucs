import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
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
const CSV_PATH = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_area.csv');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`🔑 Autenticando usuário...`);
  try {
    await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
  } catch (error) {
    console.error(`❌ Falha na autenticação. Verifique o email e senha no script.`);
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando importação de ÁREAS da tabela dbo_area...`);
  
  let batch = writeBatch(db);
  let count = 0;
  let totalImported = 0;

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ ERRO: Arquivo CSV não encontrado em: ${CSV_PATH}`);
    process.exit(1);
  }

  const parser = fs.createReadStream(CSV_PATH).pipe(csv());

  for await (const row of parser) {
    if (!row.id) continue;

    const docRef = doc(db, 'areas', row.id.toString());
    
    // id,code,name,private,association_id,owner_id,country_id,uf,url
    const areaData = {
      id: row.id.toString(),
      code: row.code || null,
      name: row.name || 'Área Sem Nome',
      isPrivate: row.private === 't' || row.private === 'true',
      associationId: row.association_id ? row.association_id.toString() : null,
      ownerId: row.owner_id ? row.owner_id.toString() : null,
      uf: row.uf || null,
      url: row.url || null,
      migratedAt: serverTimestamp()
    };

    batch.set(docRef, areaData, { merge: true });
    count++;
    totalImported++;

    if (count === BATCH_SIZE) {
      console.log(`⏳ Gravando lote no Firestore... (${totalImported} áreas processadas)`);
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

  console.log(`\n✅ Sucesso! Total de Áreas migradas: ${totalImported}`);
  process.exit(0);
}

run().catch(console.error);
