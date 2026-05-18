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

// ─── Importa financial_participant ───────────────────────────────────────────
async function importParticipants(): Promise<number> {
  const filePath = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/financial_participant.csv');
  if (!fs.existsSync(filePath)) { console.log(`⏭️ Pulando financial_participant.csv`); return 0; }

  console.log(`\n📂 Importando PARTICIPANTES FINANCEIROS (~1.600 registros)...`);

  return new Promise((resolve, reject) => {
    let batch = writeBatch(db);
    let count = 0;
    let total = 0;

    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());

    parser.on('data', async (row) => {
      if (!row.id) return;
      parser.pause();

      const docRef = doc(db, 'financialParticipants', row.id.toString());
      batch.set(docRef, {
        id: row.id.toString(),
        name: fixEncoding(row.name),
        document: row.document || null,                         // CPF ou CNPJ
        documentType: row.document_type || null,                // CPF | CNPJ
        email: row.email || null,
        status: row.status || null,                             // ACTIVE | INACTIVE
        phoneNumber: row.phone_number || null,
        originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
        migratedAt: serverTimestamp(),
      }, { merge: true });

      count++; total++;
      if (count === BATCH_SIZE) {
        console.log(`⏳ Gravando lote participantes... (${total})`);
        try { await batch.commit(); batch = writeBatch(db); count = 0; await sleep(SLEEP_MS); parser.resume(); }
        catch (err) { reject(err); }
      } else { parser.resume(); }
    });

    parser.on('end', async () => {
      if (count > 0) await batch.commit();
      console.log(`✅ Participantes: ${total} registros`);
      resolve(total);
    });
    parser.on('error', reject);
  });
}

// ─── Importa financial_bill_to_pay ───────────────────────────────────────────
async function importBills(): Promise<number> {
  const filePath = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/financial_bill_to_pay.csv');
  if (!fs.existsSync(filePath)) { console.log(`⏭️ Pulando financial_bill_to_pay.csv`); return 0; }

  console.log(`\n📂 Importando CONTAS A PAGAR (7.571 registros)...`);

  return new Promise((resolve, reject) => {
    let batch = writeBatch(db);
    let count = 0;
    let total = 0;

    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());

    parser.on('data', async (row) => {
      if (!row.id) return;
      parser.pause();

      const docRef = doc(db, 'financialBills', row.id.toString());
      batch.set(docRef, {
        id: row.id.toString(),
        participantId: row.participant_id ? row.participant_id.toString() : null,
        amount: row.amount ? parseFloat(row.amount) : 0,
        dueDate: row.due_date ? Timestamp.fromDate(new Date(row.due_date)) : null,
        status: row.status || null,                             // PENDING | PAID | CANCELED
        type: row.type || null,                                 // tipo de despesa
        description: fixEncoding(row.description),
        costCenterId: row.cost_center_id ? row.cost_center_id.toString() : null,
        branchCompanyId: row.branch_company_id ? row.branch_company_id.toString() : null,
        originalCreatedAt: row.created_date ? Timestamp.fromDate(new Date(row.created_date)) : null,
        migratedAt: serverTimestamp(),
      }, { merge: true });

      count++; total++;
      if (count === BATCH_SIZE) {
        console.log(`⏳ Gravando lote contas... (${total})`);
        try { await batch.commit(); batch = writeBatch(db); count = 0; await sleep(SLEEP_MS); parser.resume(); }
        catch (err) { reject(err); }
      } else { parser.resume(); }
    });

    parser.on('end', async () => {
      if (count > 0) await batch.commit();
      console.log(`✅ Contas a Pagar: ${total} registros`);
      resolve(total);
    });
    parser.on('error', reject);
  });
}

// ─── Importa financial_bill_write_off ────────────────────────────────────────
async function importWriteOffs(): Promise<number> {
  const filePath = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo/financial_bill_write_off.csv');
  if (!fs.existsSync(filePath)) { console.log(`⏭️ Pulando financial_bill_write_off.csv`); return 0; }

  console.log(`\n📂 Importando BAIXAS DE CONTAS (~5.000 registros)...`);

  return new Promise((resolve, reject) => {
    let batch = writeBatch(db);
    let count = 0;
    let total = 0;

    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());

    parser.on('data', async (row) => {
      if (!row.id) return;
      parser.pause();

      const docRef = doc(db, 'financialWriteOffs', row.id.toString());
      batch.set(docRef, {
        id: row.id.toString(),
        billId: row.bill_id ? row.bill_id.toString() : null,
        amount: row.amount ? parseFloat(row.amount) : 0,
        writeOffDate: row.write_off_date ? Timestamp.fromDate(new Date(row.write_off_date)) : null,
        type: row.type || null,
        description: fixEncoding(row.description),
        migratedAt: serverTimestamp(),
      }, { merge: true });

      count++; total++;
      if (count === BATCH_SIZE) {
        console.log(`⏳ Gravando lote baixas... (${total})`);
        try { await batch.commit(); batch = writeBatch(db); count = 0; await sleep(SLEEP_MS); parser.resume(); }
        catch (err) { reject(err); }
      } else { parser.resume(); }
    });

    parser.on('end', async () => {
      if (count > 0) await batch.commit();
      console.log(`✅ Baixas: ${total} registros`);
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

  console.log(`\n🚀 Iniciando importação FINANCEIRA (participantes + contas a pagar + baixas)...`);

  const p = await importParticipants();
  const b = await importBills();
  const w = await importWriteOffs();

  console.log(`\n✅ Sucesso! Total migrado: ${p + b + w} registros financeiros`);
  process.exit(0);
}

run().catch(console.error);
