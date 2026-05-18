import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
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

// Fix encoding Latin-1 → UTF-8
function fixEncoding(str: string | undefined): string | null {
  if (!str) return null;
  try { return Buffer.from(str, 'latin1').toString('utf8'); } catch { return str; }
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

  // Importa as 8 plataformas
  const platformsFile = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_platform.csv');
  console.log(`\n🚀 Importando PLATAFORMAS (dbo_platform)...`);

  let batch = writeBatch(db);
  let count = 0;
  let totalImported = 0;

  if (fs.existsSync(platformsFile)) {
    const parser = fs.createReadStream(platformsFile, { encoding: 'latin1' }).pipe(csv());

    for await (const row of parser) {
      if (!row.id) continue;
      const docRef = doc(db, 'platforms', row.id.toString());
      batch.set(docRef, {
        id: row.id.toString(),
        name: fixEncoding(row.name),
        alias: row.alias || null,                           // CUSTODIA, MATEUS, CPR_VERDE, MUNDI, INVESTMENT, TRADING, GOV, MOV
        status: row.status || 'ACTIVE',
        isFinalPlatform: row.final_platform === 't',        // true = plataforma pública/destino final
        isPublicOnly: row.public_only === 't',
        description: fixEncoding(row.description),
        migratedAt: serverTimestamp(),
      }, { merge: true });
      count++;
      totalImported++;
    }
  }

  // Importa as platform_tags
  const tagsFile = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/dbo_platform_tags.csv');
  console.log(`📂 Importando PLATFORM TAGS (dbo_platform_tags)...`);

  if (fs.existsSync(tagsFile)) {
    const parser2 = fs.createReadStream(tagsFile, { encoding: 'latin1' }).pipe(csv());
    for await (const row of parser2) {
      if (!row.id) continue;
      const docRef = doc(db, 'platformTags', row.id.toString());
      batch.set(docRef, {
        id: row.id.toString(),
        name: fixEncoding(row.name),
        alias: row.alias || null,
        migratedAt: serverTimestamp(),
      }, { merge: true });
      count++;
      totalImported++;
    }
  }

  if (count === BATCH_SIZE) {
    await batch.commit();
    batch = writeBatch(db);
    count = 0;
    await sleep(SLEEP_MS);
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Sucesso! Total de registros de Plataforma migrados: ${totalImported}`);
  process.exit(0);
}

run().catch(console.error);
