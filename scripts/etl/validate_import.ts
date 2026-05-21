import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { supabaseAdmin } from '../../src/lib/db/supabase';
import { calculateHash, countLines } from './core/helpers';

// Import all configs
import { configs as platforms } from './mappings/platforms.mapping';
import { configs as users } from './mappings/users.mapping';
import { configs as distributionConfigs } from './mappings/distribution_configs.mapping';
import { configs as projects } from './mappings/projects.mapping';
import { configs as areas } from './mappings/areas.mapping';
import { configs as roleUsers } from './mappings/role_users.mapping';
import { configs as quotes } from './mappings/quotes.mapping';
import { configs as harvests } from './mappings/harvests.mapping';
import { configs as cprs } from './mappings/cprs.mapping';
import { configs as ucsBatches } from './mappings/ucs_batches.mapping';
import { configs as distributions } from './mappings/distributions.mapping';
import { configs as balances } from './mappings/balances.mapping';
import { configs as transactions } from './mappings/transactions.mapping';
import { configs as ownershipTransfers } from './mappings/ownership_transfers.mapping';
import { configs as financialBills } from './mappings/financial_bills.mapping';
import { configs as tvOrders } from './mappings/tv_orders.mapping';
import { configs as aksesOrders } from './mappings/akses_orders.mapping';
import { configs as adjustments } from './mappings/adjustments.mapping';
import { configs as blockedUcs } from './mappings/blocked_ucs.mapping';

const ALL_CONFIGS = [
  ...platforms,
  ...users,
  ...distributionConfigs,
  ...projects,
  ...areas,
  ...roleUsers,
  ...quotes,
  ...harvests,
  ...cprs,
  ...ucsBatches,
  ...distributions,
  ...balances,
  ...transactions,
  ...ownershipTransfers,
  ...financialBills,
  ...tvOrders,
  ...aksesOrders,
  ...adjustments,
  ...blockedUcs,
];

/**
 * Streams the CSV file to find rows matching the specified original IDs.
 */
async function findRowsInCSV(csvPath: string, ids: string[]): Promise<Map<string, any>> {
  const idSet = new Set(ids);
  const results = new Map<string, any>();
  if (!fs.existsSync(csvPath) || ids.length === 0) {
    return results;
  }
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvPath, { encoding: 'latin1' }).pipe(csv());
    stream
      .on('data', (row) => {
        if (row.id && idSet.has(String(row.id))) {
          results.set(String(row.id), row);
          if (results.size === idSet.size) {
            stream.destroy();
            resolve(results);
          }
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('close', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let targetVersion = 'v1';
  const versionArg = args.find((a) => a.startsWith('--version='));
  if (versionArg) {
    targetVersion = versionArg.split('=')[1];
  } else {
    const vIndex = args.indexOf('--version');
    if (vIndex !== -1 && args[vIndex + 1]) {
      targetVersion = args[vIndex + 1];
    }
  }

  console.log(`\n======================================================`);
  console.log(`🔍 AUDITORIA E VALIDAÇÃO DE INTEGRIDADE NO SUPABASE (Versão: ${targetVersion})`);
  console.log(`======================================================`);

  try {
    let passedAll = true;

    for (const config of ALL_CONFIGS) {
      console.log(`\n------------------------------------------------------`);
      console.log(`📦 Validando importador: ${config.importerKey} (Tabela: ${config.originalTable})`);

      const csvPath = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo', config.csvFile);
      const csvRowsCount = (await countLines(csvPath)) - 1; // desconta cabeçalho
      console.log(`  • Linhas no CSV (estimado): ${csvRowsCount}`);

      // Count records in Supabase
      const { count: dbCount, error: countError } = await supabaseAdmin
        .from(config.originalTable)
        .select('*', { count: 'exact', head: true })
        .eq('migration_version', targetVersion);

      if (countError) {
        console.error(`  ❌ Erro ao contar registros no Supabase:`, countError.message);
        passedAll = false;
        continue;
      }

      const supabaseCount = dbCount || 0;
      console.log(`  • Registros no Supabase: ${supabaseCount}`);

      if (supabaseCount === 0) {
        console.log(`  ⚠️ Status: Sem registros importados para esta versão.`);
        continue;
      }

      // Check count mismatch (tolerance of 5% for skips/duplicates/errors)
      const difference = Math.abs(csvRowsCount - supabaseCount);
      const diffPercentage = csvRowsCount > 0 ? (difference / csvRowsCount) * 100 : 0;

      if (diffPercentage > 5) {
        console.log(`  ❌ AVISO: Divergência de contagem superior a 5% (${diffPercentage.toFixed(2)}%).`);
        passedAll = false;
      } else {
        console.log(`  ✅ Contagem de registros consistente (${difference} divergência).`);
      }

      // Hash Check on Sample
      console.log(`  • Realizando amostragem para validação de integridade dos hashes...`);
      
      const { data: sampleRows, error: sampleError } = await supabaseAdmin
        .from(config.originalTable)
        .select('*')
        .eq('migration_version', targetVersion)
        .limit(5);

      if (sampleError) {
        console.error(`    ❌ Erro ao buscar amostra no Supabase:`, sampleError.message);
        passedAll = false;
        continue;
      }

      if (!sampleRows || sampleRows.length === 0) {
        console.log(`  ⚠️ Status: Nenhum registro de amostra retornado.`);
        continue;
      }

      // Get sample original IDs
      const sampleOriginalIds = sampleRows.map((r) => String(r.original_id));

      // Fetch matching rows from CSV
      const csvRows = await findRowsInCSV(csvPath, sampleOriginalIds);

      // Load auxiliary data if required
      let auxData: any = undefined;
      if (config.loadAuxiliaryData) {
        auxData = await config.loadAuxiliaryData();
      }

      let samplePassed = true;

      for (const row of sampleRows) {
        const originalId = String(row.original_id);
        const storedDocHash = row.document_hash;

        const csvRow = csvRows.get(originalId);
        if (!csvRow) {
          console.log(`    ❌ Registro original_id ${originalId} não encontrado no arquivo CSV!`);
          samplePassed = false;
          passedAll = false;
          continue;
        }

        // Validate using Zod schema
        const parsed = config.schema.safeParse(csvRow);
        if (!parsed.success) {
          console.log(`    ❌ Registro original_id ${originalId}: Falha de validação Zod no CSV!`, parsed.error.message);
          samplePassed = false;
          passedAll = false;
          continue;
        }

        // Run transformation
        let transformed: any = null;
        try {
          transformed = await config.transform(parsed.data, auxData);
        } catch (err: any) {
          console.log(`    ❌ Registro original_id ${originalId}: Falha ao transformar dados do CSV!`, err.message || err);
          samplePassed = false;
          passedAll = false;
          continue;
        }

        if (!transformed) {
          console.log(`    ❌ Registro original_id ${originalId}: Transformação resultou em null!`);
          samplePassed = false;
          passedAll = false;
          continue;
        }

        // Recompute hash
        const recomputedDocHash = calculateHash(transformed);

        if (storedDocHash !== recomputedDocHash) {
          console.log(
            `    ❌ Registro original_id ${originalId}: Hashes inconsistentes! (Armazenado: ${storedDocHash}, Recomputado: ${recomputedDocHash})`
          );
          samplePassed = false;
          passedAll = false;
        }
      }

      if (samplePassed && sampleRows.length > 0) {
        console.log(`  ✅ Amostragem de hashes verificada com sucesso.`);
      }
    }

    console.log(`\n======================================================`);
    if (passedAll) {
      console.log(`🎉 AUDITORIA CONCLUÍDA: TODOS OS DOMÍNIOS PASSARAM!`);
    } else {
      console.log(`⚠️ AUDITORIA CONCLUÍDA COM AVISOS OU ERROS. Verifique os logs acima.`);
    }
    console.log(`======================================================`);
  } catch (err) {
    console.error('❌ Erro durante a auditoria:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
