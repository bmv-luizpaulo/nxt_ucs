import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

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

async function getHeaders(file: string): Promise<string[]> {
  return new Promise((resolve) => {
    const filePath = path.join(CSV_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return resolve([]);
    }
    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());
    parser.once('headers', (headers: string[]) => {
      parser.destroy();
      resolve(headers.map(h => h.trim()));
    });
    parser.on('error', () => resolve([]));
  });
}

async function main() {
  console.log("-- SQL Schema for Missing Tables");
  for (const file of files) {
    const headers = await getHeaders(file);
    if (headers.length === 0) continue;
    const tableName = file.replace('.csv', '');
    
    console.log(`\n-- ${tableName}`);
    console.log(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
    console.log(`CREATE TABLE ${tableName} (`);
    const cols = headers.map((h, index) => {
      const isPk = h.toLowerCase() === 'id' ? ' PRIMARY KEY' : '';
      return `    "${h}" TEXT${isPk}`;
    });
    // Add metadata columns like the other tables
    cols.push(`    "migrated_at" TIMESTAMPTZ DEFAULT now()`);
    cols.push(`    "migration_version" TEXT`);
    cols.push(`    "source" TEXT`);
    cols.push(`    "original_table" TEXT`);
    cols.push(`    "original_id" TEXT`);
    cols.push(`    "source_hash" TEXT`);
    cols.push(`    "document_hash" TEXT`);
    
    console.log(cols.join(',\n'));
    console.log(`);`);
  }
}

main().catch(console.error);
