import 'dotenv/config';
import { supabaseAdmin } from '../../src/lib/db/supabase';

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

  let targetCollection: string | null = null;
  const colArg = args.find((a) => a.startsWith('--collection='));
  if (colArg) {
    targetCollection = colArg.split('=')[1];
  } else {
    const cIndex = args.indexOf('--collection');
    if (cIndex !== -1 && args[cIndex + 1]) {
      targetCollection = args[cIndex + 1];
    }
  }

  console.log(`\n======================================================`);
  console.log(`🧹 INICIANDO ROLLBACK NO SUPABASE DA VERSÃO: ${targetVersion}`);
  if (targetCollection) {
    console.log(`📁 Tabela/Coleção Alvo: ${targetCollection}`);
  } else {
    console.log(`📁 Tabela/Coleção Alvo: TODAS`);
  }
  console.log(`======================================================`);

  try {
    let totalDeleted = 0;
    const processedTables = new Set<string>();

    for (const config of ALL_CONFIGS) {
      const tableName = config.originalTable;
      const collectionName = config.collection;

      // Avoid processing the same table multiple times (e.g. balances mapping has multiple configs)
      if (processedTables.has(tableName)) {
        continue;
      }

      if (targetCollection) {
        const matches =
          collectionName === targetCollection ||
          tableName === targetCollection ||
          config.importerKey === targetCollection;
        if (!matches) {
          continue;
        }
      }

      processedTables.add(tableName);
      console.log(`⏳ Verificando tabela [${tableName}]...`);

      // Count records matching the version in Supabase
      const { count, error: countError } = await supabaseAdmin
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('migration_version', targetVersion);

      if (countError) {
        console.error(`  ❌ Erro ao contar registros na tabela ${tableName}:`, countError.message);
        throw countError;
      }

      const rowsToDelete = count || 0;

      if (rowsToDelete === 0) {
        console.log(`  • Nenhum registro encontrado.`);
        continue;
      }

      console.log(`  • Encontrados ${rowsToDelete} registros para remoção.`);

      // Delete records matching the version
      const { error: deleteError } = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('migration_version', targetVersion);

      if (deleteError) {
        console.error(`  ❌ Erro ao deletar registros da tabela ${tableName}:`, deleteError.message);
        throw deleteError;
      }

      console.log(`  ✅ Removidos ${rowsToDelete} registros da tabela [${tableName}].`);
      totalDeleted += rowsToDelete;
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ROLLBACK CONCLUÍDO COM SUCESSO! Total deletados: ${totalDeleted}`);
    console.log(`======================================================`);
  } catch (err) {
    console.error('❌ Erro durante o rollback:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
