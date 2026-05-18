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

async function processFile(
  csvFile: string,
  collection: string,
  label: string,
  mapper: (row: Record<string, string>) => Record<string, unknown>
): Promise<number> {
  const filePath = path.resolve(process.cwd(), `docs/banco_legado_csvs_completo/${csvFile}`);
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Pulando: ${csvFile}`);
    return 0;
  }
  console.log(`\n📂 Importando ${label}...`);
  return new Promise((resolve, reject) => {
    let batch = writeBatch(db);
    let count = 0;
    let total = 0;
    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());
    parser.on('data', async (row) => {
      if (!row.id) return;
      parser.pause();
      const docRef = doc(db, collection, row.id.toString());
      batch.set(docRef, { ...mapper(row), migratedAt: serverTimestamp() }, { merge: true });
      count++; total++;
      if (count === BATCH_SIZE) {
        console.log(`⏳ Lote... (${total})`);
        try { await batch.commit(); batch = writeBatch(db); count = 0; await sleep(SLEEP_MS); parser.resume(); }
        catch (err) { reject(err); }
      } else { parser.resume(); }
    });
    parser.on('end', async () => {
      if (count > 0) await batch.commit();
      console.log(`✅ ${label}: ${total}`);
      resolve(total);
    });
    parser.on('error', reject);
  });
}

async function run() {
  console.log(`🔑 Autenticando usuário...`);
  try {
    await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
    console.log(`✅ Autenticado!`);
  } catch {
    console.error(`❌ Falha na autenticação.`);
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando importação PLATAFORMA AKSES...`);
  let total = 0;

  // Pedidos de certificado de distribuidor (principal — 764 registros)
  total += await processFile(
    'plat_akses_distributor_certificate_order.csv',
    'aksesDistributorCertOrders',
    'Pedidos Certificado Distribuidor Akses (764)',
    (row) => ({
      id: row.id.toString(),
      distributorId: row.distributor_id ? row.distributor_id.toString() : null,
      certificateId: row.certificate_id ? row.certificate_id.toString() : null,
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      price: row.price ? parseFloat(row.price) : 0,
      fee: row.fee ? parseFloat(row.fee) : 0,
      total: row.total ? parseFloat(row.total) : 0,
      status: row.status || null,
      paymentType: row.payment_type || null,
      distributionId: row.distribution_id ? row.distribution_id.toString() : null,
      billetId: row.billet_id ? row.billet_id.toString() : null,
      originPlatformId: row.origin_platform_id ? row.origin_platform_id.toString() : null,
      recipientPlatformId: row.recipient_platform_id ? row.recipient_platform_id.toString() : null,
      additionalInfo: row.additional_info || null,
      createdBy: row.created_by ? row.created_by.toString() : null,
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
    })
  );

  // Pedidos de certificado de cliente (~60)
  total += await processFile(
    'plat_akses_client_certificate_order.csv',
    'aksesClientCertOrders',
    'Pedidos Certificado Cliente Akses (~60)',
    (row) => ({
      id: row.id.toString(),
      clientId: row.client_id ? row.client_id.toString() : null,
      certificateId: row.certificate_id ? row.certificate_id.toString() : null,
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      status: row.status || null,
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
    })
  );

  // Pedidos de transferência Akses (~600)
  total += await processFile(
    'plat_akses_transfer_order.csv',
    'aksesTransferOrders',
    'Pedidos de Transferência Akses (~600)',
    (row) => ({
      id: row.id.toString(),
      fromId: row.from_id ? row.from_id.toString() : null,
      toId: row.to_id ? row.to_id.toString() : null,
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      harvestYear: row.harvest_year ? parseInt(row.harvest_year) : null,
      status: row.status || null,
      description: fixEncoding(row.description),
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
    })
  );

  // Pedidos de compra (~50)
  total += await processFile(
    'plat_akses_purchase_order.csv',
    'aksesPurchaseOrders',
    'Pedidos de Compra Akses (~50)',
    (row) => ({
      id: row.id.toString(),
      buyerId: row.buyer_id ? row.buyer_id.toString() : null,
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      price: row.price ? parseFloat(row.price) : 0,
      status: row.status || null,
      distributionId: row.distribution_id ? row.distribution_id.toString() : null,
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
    })
  );

  // Living Carbon (~100)
  total += await processFile(
    'plat_akses_living_carbon_certificate_order.csv',
    'aksesLivingCarbonOrders',
    'Living Carbon Orders Akses (~100)',
    (row) => ({
      id: row.id.toString(),
      buyerId: row.buyer_id ? row.buyer_id.toString() : null,
      certificateId: row.certificate_id ? row.certificate_id.toString() : null,
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      status: row.status || null,
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
    })
  );

  console.log(`\n✅ Sucesso! Total Akses migrado: ${total} registros`);
  process.exit(0);
}

run().catch(console.error);
