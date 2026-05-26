import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { supabaseAdmin } from '../../src/lib/db/supabase';

const CSV_DIR = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo');

const files = [
  'dbo_authentication.csv',
  'dbo_rl_user_address.csv',
  'dbo_address.csv',
  'dbo_city.csv',
  'dbo_state.csv',
  'dbo_country.csv',
  'dbo_rl_user_system.csv',
  'dbo_yearly_area_info.csv',
  'dbo_certificate.csv',
  'dbo_nxt.csv',
  'plat_tesouro_verde_certificate.csv',
  'plat_akses_living_carbon_certificate.csv',
  'plat_akses_client_certificate.csv',
  'plat_akses_distributor_certificate.csv'
];

function calculateHash(obj: any): string {
  return String(JSON.stringify(obj).length); // Simple mock hash to avoid external dependencies
}

async function importFile(file: string) {
  const tableName = file.replace('.csv', '');
  const filePath = path.join(CSV_DIR, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${file}, skipping.`);
    return;
  }

  console.log(`⏳ Starting import for ${tableName}...`);
  const stream = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());
  
  let batch: any[] = [];
  const batchSize = 1000;
  let totalProcessed = 0;

  for await (const row of stream) {
    // Generate hashes and metadata
    const sourceHash = calculateHash(row);
    const documentHash = sourceHash;
    
    const record: any = { ...row };
    // Add metadata columns
    record.migrated_at = new Date().toISOString();
    record.migration_version = 'v1';
    record.source = 'legacy_sql';
    record.original_table = tableName;
    record.original_id = String(row.id || '');
    record.source_hash = sourceHash;
    record.document_hash = documentHash;

    batch.push(record);

    if (batch.length === batchSize) {
      const { error } = await supabaseAdmin.from(tableName).upsert(batch);
      if (error) {
        console.error(`❌ Error inserting batch into ${tableName}:`, error.message);
        throw error;
      }
      totalProcessed += batch.length;
      console.log(`  • Imported ${totalProcessed} rows...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const { error } = await supabaseAdmin.from(tableName).upsert(batch);
    if (error) {
      console.error(`❌ Error inserting final batch into ${tableName}:`, error.message);
      throw error;
    }
    totalProcessed += batch.length;
  }

  console.log(`✅ Successfully imported ${totalProcessed} rows into ${tableName}.`);
}

async function main() {
  const args = process.argv.slice(2);
  const skipCheck = args.includes('--skip-check');

  console.log("🚀 STARTING MIGRATION OF MISSING TABLES TO SUPABASE");
  
  for (const file of files) {
    const tableName = file.replace('.csv', '');
    
    if (!skipCheck) {
      // Test if table exists in Supabase first
      const { error } = await supabaseAdmin.from(tableName).select('*').limit(1);
      if (error && error.message.includes("does not exist")) {
        console.log(`❌ Table "${tableName}" does not exist in Supabase yet. Please run the scripts/etl/missing_schema.sql script in the SQL editor first.`);
        continue;
      }
    }

    try {
      await importFile(file);
    } catch (e: any) {
      console.error(`❌ Failed to import ${file}:`, e.message);
    }
  }
}

main().catch(console.error);
