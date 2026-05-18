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
  if (!fs.existsSync(filePath)) { console.log(`⏭️ Pulando: ${csvFile}`); return 0; }
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

  console.log(`\n🚀 Iniciando importação PLATAFORMA TESOURO VERDE...`);
  let total = 0;

  // Pedidos de certificado TV — tabela principal (656 registros)
  total += await processFile(
    'plat_tesouro_verde_certificate_order.csv',
    'tvCertificateOrders',
    'Pedidos de Certificado TV (656)',
    (row) => ({
      id: row.id.toString(),
      issuerId: row.issuer_id ? row.issuer_id.toString() : null,
      rlPartnersCampaignsCertificatesId: row.rl_partners_campaigns_certificates_id ? row.rl_partners_campaigns_certificates_id.toString() : null,
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      price: row.price ? parseFloat(row.price) : 0,
      fee: row.fee ? parseFloat(row.fee) : 0,
      total: row.total ? parseFloat(row.total) : 0,
      discount: row.discount ? parseFloat(row.discount) : 0,
      commissionSum: row.commission_sum ? parseFloat(row.commission_sum) : 0,
      status: row.status || null,                               // PROCESSED | ARCHIVED | PENDING | CANCELED
      paymentType: row.payment_type || null,
      templateType: row.template_type || null,                  // COMPENSATION | PURCHASE
      distributionId: row.distribution_id ? row.distribution_id.toString() : null,
      billetId: row.billet_id ? row.billet_id.toString() : null,
      basketFeeId: row.basket_fee_id ? row.basket_fee_id.toString() : null,
      promoCodeId: row.promo_code_id ? row.promo_code_id.toString() : null,
      commissionId: row.commission_id ? row.commission_id.toString() : null,
      originPlatformId: row.origin_platform_id ? row.origin_platform_id.toString() : null,
      recipientPlatformId: row.recipient_platform_id ? row.recipient_platform_id.toString() : null,
      publicOriginPlatformId: row.public_origin_platform_id ? row.public_origin_platform_id.toString() : null,
      publicRecipientPlatformId: row.public_recipient_platform_id ? row.public_recipient_platform_id.toString() : null,
      publicOrderBookQueueId: row.public_order_book_queue_id ? row.public_order_book_queue_id.toString() : null,
      orderBookQueueId: row.order_book_queue_id ? row.order_book_queue_id.toString() : null,
      responsibleDocument: row.responsible_document || null,
      responsibleName: fixEncoding(row.responsible_name),
      allDocumentationViewed: row.all_documentation_viewed === 't',
      additionalInfo: row.additional_info || null,
      reasonDescription: fixEncoding(row.reason_description),
      typeReason: row.type_reason || null,
      createdBy: row.created_by ? row.created_by.toString() : null,
      originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
      originalUpdatedAt: row.last_modified_date ? Timestamp.fromDate(new Date(row.last_modified_date)) : null,
    })
  );

  // Parceiros TV (~120)
  total += await processFile(
    'plat_tesouro_verde_partners.csv',
    'tvPartners',
    'Parceiros TV (~120)',
    (row) => ({
      id: row.id.toString(),
      name: fixEncoding(row.name),
      document: row.document || null,
      documentType: row.document_type || null,
      email: row.email || null,
      status: row.status || null,
    })
  );

  // Campanhas TV (~5)
  total += await processFile(
    'plat_tesouro_verde_campaigns.csv',
    'tvCampaigns',
    'Campanhas TV (~5)',
    (row) => ({
      id: row.id.toString(),
      name: fixEncoding(row.name),
      partnerId: row.partner_id ? row.partner_id.toString() : null,
      status: row.status || null,
    })
  );

  // DARE Royalties (~500)
  total += await processFile(
    'plat_tesouro_verde_dare_royalties.csv',
    'tvDareRoyalties',
    'DARE Royalties (~500)',
    (row) => ({
      id: row.id.toString(),
      areaId: row.area_id ? row.area_id.toString() : null,
      amount: row.amount ? parseFloat(row.amount) : 0,
      year: row.year ? parseInt(row.year) : null,
      status: row.status || null,
      referenceDate: row.reference_date ? Timestamp.fromDate(new Date(row.reference_date)) : null,
    })
  );

  // Intenções de compensação (~150)
  total += await processFile(
    'plat_tesouro_verde_compensation_intent.csv',
    'tvCompensationIntents',
    'Intenções de Compensação (~150)',
    (row) => ({
      id: row.id.toString(),
      userId: row.user_id ? row.user_id.toString() : null,
      ucsAmount: row.ucs_amount ? parseFloat(row.ucs_amount) : 0,
      status: row.status || null,
      description: fixEncoding(row.description),
      createdAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
    })
  );

  console.log(`\n✅ Sucesso! Total Tesouro Verde migrado: ${total} registros`);
  process.exit(0);
}

run().catch(console.error);
