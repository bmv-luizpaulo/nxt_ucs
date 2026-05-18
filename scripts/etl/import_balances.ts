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

const FILES = [
  { csv: 'dbo_consolidated_balance.csv',          collection: 'consolidatedBalances',        label: 'Saldos Consolidados (por plataforma)' },
  { csv: 'dbo_consolidated_balance_per_year.csv', collection: 'consolidatedBalancesPerYear', label: 'Saldos Consolidados (por safra/ano)'   },
];

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

      // Schema unificado — campos opcionais preenchidos conforme a tabela
      const data: Record<string, unknown> = {
        id: row.id.toString(),
        userId: row.user_id ? row.user_id.toString() : null,
        platformId: row.platform_id ? row.platform_id.toString() : null,
        availableBalance: row.available_balance ? parseFloat(row.available_balance) : 0,
        reservedBalance: row.reserved_balance ? parseFloat(row.reserved_balance) : 0,
        blockedBalance: row.blocked_balance ? parseFloat(row.blocked_balance) : 0,
        retiredBalance: row.retired_balance ? parseFloat(row.retired_balance) : 0,
        updatedOn: row.updated_on ? Timestamp.fromDate(new Date(row.updated_on)) : null,
        migratedAt: serverTimestamp(),
      };

      // Campo extra só em consolidated_balance_per_year
      if (row.harvest_year) data.harvestYear = parseInt(row.harvest_year);

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

    parser.on('error', reject);
  });
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

  console.log(`\n🚀 Iniciando importação de SALDOS CONSOLIDADOS...`);
  console.log(`  • consolidated_balances:          ~700 registros`);
  console.log(`  • consolidated_balances_per_year: ~12.000 registros\n`);

  let totalGeral = 0;
  for (const { csv: csvFile, collection, label } of FILES) {
    const filePath = path.resolve(process.cwd(), `docs/banco_legado_csvs_completo/${csvFile}`);
    const qtde = await processFile(filePath, collection, label);
    totalGeral += qtde;
  }

  console.log(`\n✅ Sucesso! Total de Saldos migrados: ${totalGeral}`);
  process.exit(0);
}

run().catch(console.error);
