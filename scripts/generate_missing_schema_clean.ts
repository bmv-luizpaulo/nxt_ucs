import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const CSV_DIR = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo');
const OUT_FILE = path.resolve(process.cwd(), 'scripts/etl/missing_schema.sql');

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
  let output = "-- SQL Schema for Missing Tables\n";
  for (const file of files) {
    const headers = await getHeaders(file);
    if (headers.length === 0) continue;
    const tableName = file.replace('.csv', '');
    
    output += `\n-- ${tableName}\n`;
    output += `DROP TABLE IF EXISTS ${tableName} CASCADE;\n`;
    output += `CREATE TABLE ${tableName} (\n`;
    const cols = headers.map((h) => {
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
    
    output += cols.join(',\n') + '\n';
    output += `);\n`;
  }
  
  fs.writeFileSync(OUT_FILE, output, 'utf8');
  console.log("Successfully generated:", OUT_FILE);
}

main().catch(console.error);
