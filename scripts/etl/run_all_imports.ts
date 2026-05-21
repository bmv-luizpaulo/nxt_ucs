import { runImportForConfig } from './core/importEngine';
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

const IMPORTERS = [
  // Phase A: Base
  ...platforms,
  ...users,
  ...distributionConfigs,
  ...projects,

  // Phase B: Dependencies
  ...areas,
  ...roleUsers,
  ...quotes,

  // Phase C: Intermediates
  ...harvests,
  ...cprs,

  // Phase D: Operational / Ledger / Transactions
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
  console.log(`🎬 INICIANDO ORQUESTRADOR GLOBAL DE MIGRAÇÃO`);
  console.log(`📦 Total de sub-importadores: ${IMPORTERS.length}`);

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const delayBetweenSeconds = 30;

  for (let i = 0; i < IMPORTERS.length; i++) {
    const config = IMPORTERS[i];
    console.log(`\n──────────────────────────────────────────────────────`);
    console.log(`📁 [${i + 1}/${IMPORTERS.length}] Orquestrador -> Executando: ${config.importerKey}`);

    const count = await runImportForConfig(config);
    console.log(`✅ Concluído ${config.importerKey}. Registros importados: ${count}`);

    // Pausa de resfriamento entre scripts
    if (i < IMPORTERS.length - 1 && !dryRun) {
      console.log(`\n⏳ Cooldown: Aguardando ${delayBetweenSeconds}s para proteção de cotas Firestore...`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenSeconds * 1000));
    }
  }

  console.log(`\n🎉 ORQUESTRAÇÃO GLOBAL DE MIGRAÇÃO CONCLUÍDA COM SUCESSO!`);
}

main().catch((err) => {
  console.error('❌ Erro fatal durante a orquestração:', err);
  process.exit(1);
});
