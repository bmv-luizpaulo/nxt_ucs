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
const SLEEP_MS = 2500; // Tempo de pausa um pouco maior para evitar gargalo com o lote de 8MB

const FILES_TO_PROCESS = [
  'dbo_ucs_batch.csv',
  'dbo_ucs_batch__2010.csv',
  'dbo_ucs_batch__2020.csv',
  'dbo_ucs_batch__2022.csv',
  'dbo_ucs_batch__2023.csv'
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processFile(fileName: string): Promise<number> {
  const filePath = path.resolve(process.cwd(), `docs/banco_legado_csvs_completo/${fileName}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️ Arquivo não encontrado, pulando: ${fileName}`);
    return 0;
  }

  console.log(`\n📂 Processando: ${fileName} ...`);
  
  let batch = writeBatch(db);
  let count = 0;
  let totalImported = 0;

  return new Promise((resolve, reject) => {
    const parser = fs.createReadStream(filePath).pipe(csv());
    
    parser.on('data', async (row) => {
      if (!row.id) return;
      
      // Pausa a leitura enquanto gravamos o lote (backpressure manual simples)
      parser.pause();

      const docRef = doc(db, 'ucs_batches', row.id.toString());
      
      const batchData = {
        id: row.id.toString(),
        initialAmount: row.initial_amount ? parseFloat(row.initial_amount) : 0,
        availableBalance: row.available_balance ? parseFloat(row.available_balance) : 0,
        harvestYear: row.harvest_year ? parseInt(row.harvest_year) : null,
        userId: row.user_id ? row.user_id.toString() : null,
        harvestId: row.harvest_id ? row.harvest_id.toString() : null,
        transactionId: row.transaction_id ? row.transaction_id.toString() : null,
        isRetired: row.retired === 't' || row.retired === 'true',
        originalUpdatedOn: row.updated_on ? Timestamp.fromDate(new Date(row.updated_on)) : null,
        sourcePartition: fileName, // Marca de qual CSV o lote veio (Ex: __2010)
        migratedAt: serverTimestamp()
      };

      batch.set(docRef, batchData, { merge: true });
      count++;
      totalImported++;

      if (count === BATCH_SIZE) {
        console.log(`⏳ Gravando lote (${totalImported} lidos de ${fileName})`);
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
        console.log(`⏳ Gravando último lote de ${fileName}...`);
        await batch.commit();
      }
      resolve(totalImported);
    });

    parser.on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log(`🔑 Autenticando usuário...`);
  try {
    await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
  } catch (error) {
    console.error(`❌ Falha na autenticação.`);
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando importação massiva dos LOTES DE UCS...`);
  
  let totalGeral = 0;
  for (const fileName of FILES_TO_PROCESS) {
    const qtde = await processFile(fileName);
    totalGeral += qtde;
  }

  console.log(`\n✅ Sucesso MÁXIMO! Total de Lotes de UCS migrados: ${totalGeral}`);
  process.exit(0);
}

run().catch(console.error);
