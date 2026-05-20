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

      const data: Record<string, unknown> = {
        id: row.id.toString(),
        ucsTransferAmount: row.ucs_transfer_amount ? parseFloat(row.ucs_transfer_amount) : 0,
        issuerId: row.issuer_id ? row.issuer_id.toString() : null,
        recipientId: row.recipient_id ? row.recipient_id.toString() : null,
        distributionId: row.distribution_id ? row.distribution_id.toString() : null,
        ownershipTransferTypeId: row.ownership_transfer_type_id ? row.ownership_transfer_type_id.toString() : null,
        status: row.status || null,
        retired: row.retired === 't' || row.retired === 'true',
        negotiatedTotal: row.negotiated_total ? parseFloat(row.negotiated_total) : null,
        createdBy: row.created_by ? row.created_by.toString() : null,
        originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
        lastModifiedBy: row.last_modified_by ? row.last_modified_by.toString() : null,
        originalUpdatedAt: row.last_modified_date ? Timestamp.fromDate(new Date(row.last_modified_date)) : null,
        reasonDescription: fixEncoding(row.reason_description),
        typeReason: row.type_reason || null,
        nxtId: row.nxt_id ? row.nxt_id.toString() : null,
        year: row.year ? parseInt(row.year) : null,
        originPlatformId: row.origin_platform_id ? row.origin_platform_id.toString() : null,
        recipientPlatformId: row.recipient_platform_id ? row.recipient_platform_id.toString() : null,
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
        await batch.commit();
      }
      console.log(`✅ ${label}: ${totalImported} registros migrados`);
      resolve(totalImported);
    });

    parser.on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('🔑 Autenticando no Firebase...');
  await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
  console.log('✅ Autenticado com sucesso!');

  const csvPath = path.join(__dirname, '../../docs/banco_legado_csvs_completo/dbo_ownership_transfer_order.csv');
  const total = await processFile(csvPath, 'ownershipTransfers', 'Transferências de Titularidade (ownershipTransfers)');

  console.log(`\n✅ Sucesso! Total ownershipTransfers migrado: ${total} registros`);
  process.exit(0);
}

run().catch(console.error);
