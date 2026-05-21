import * as fs from 'fs';
import * as path from 'path';
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

interface MetricData {
  totalRows: number;
  processed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  throughput: number;
  avgBatchTimeMs: number;
  memoryUsageMb: number;
  durationMs: number;
  status: string;
}

async function main() {
  const metricsDir = path.resolve(process.cwd(), 'scripts/etl/logs/metrics');
  const reportPath = path.resolve(process.cwd(), 'scripts/etl/logs/migration_report.md');

  console.log(`📊 Lendo métricas de importação do diretório: ${metricsDir}`);

  const rows: any[] = [];
  let grandTotalCSV = 0;
  let grandTotalSuccess = 0;
  let grandTotalErrors = 0;
  let grandTotalSkipped = 0;
  let totalDurationMs = 0;

  for (const config of IMPORTERS) {
    const metricFile = path.join(metricsDir, `${config.importerKey}.json`);
    let metric: MetricData | null = null;

    if (fs.existsSync(metricFile)) {
      try {
        const fileContent = fs.readFileSync(metricFile, 'utf8');
        metric = JSON.parse(fileContent);
      } catch (err: any) {
        console.error(`❌ Erro ao ler/parsear arquivo ${metricFile}:`, err.message);
      }
    }

    if (metric) {
      grandTotalCSV += metric.totalRows || 0;
      grandTotalSuccess += metric.successCount || 0;
      grandTotalErrors += metric.errorCount || 0;
      grandTotalSkipped += metric.skippedCount || 0;
      totalDurationMs += metric.durationMs || 0;

      rows.push({
        importerKey: config.importerKey,
        csvFile: config.csvFile,
        tableName: config.originalTable,
        totalRows: metric.totalRows,
        successCount: metric.successCount,
        errorCount: metric.errorCount,
        skippedCount: metric.skippedCount,
        throughput: metric.throughput,
        durationMs: metric.durationMs,
        status: metric.status,
      });
    } else {
      rows.push({
        importerKey: config.importerKey,
        csvFile: config.csvFile,
        tableName: config.originalTable,
        totalRows: -1,
        successCount: 0,
        errorCount: 0,
        skippedCount: 0,
        throughput: 0,
        durationMs: 0,
        status: 'missing',
      });
    }
  }

  // Format Duration helper
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    if (ms < 60000) return `${sec}s`;
    const min = Math.floor(ms / 60000);
    const remainingSec = Math.round((ms % 60000) / 1000);
    return `${min}m ${remainingSec}s`;
  };

  // Generate Markdown
  let md = `# 📊 Relatório de Migração de Dados - Legado para Supabase (PostgreSQL)\n\n`;
  md += `## Resumo Geral da Execução\n\n`;
  md += `| Métrica | Valor |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Data/Hora do Relatório** | ${new Date().toLocaleString('pt-BR')} |\n`;
  md += `| **Total de Sub-Importadores** | ${rows.length} |\n`;
  md += `| **Total de Registros Declarados no CSV** | **${grandTotalCSV.toLocaleString('pt-BR')}** |\n`;
  md += `| **Total de Registros Importados (OK)** | **${grandTotalSuccess.toLocaleString('pt-BR')}** |\n`;
  md += `| **Total de Erros** | <span style="color:red;font-weight:bold;">${grandTotalErrors}</span> |\n`;
  md += `| **Total de Ignorados (Skipped)** | ${grandTotalSkipped} |\n`;
  md += `| **Tempo Total Acumulado de Importação** | ${formatDuration(totalDurationMs)} |\n`;
  md += `| **Status Global** | ${grandTotalErrors === 0 ? '✅ SUCESSO ABSOLUTO (Sem erros)' : '⚠️ CONCLUÍDO COM ERROS'} |\n\n`;

  md += `## Detalhamento por Tabela / Importador\n\n`;
  md += `| # | Chave do Importador | Tabela de Origem/Postgres | CSV de Origem | Registros CSV | Importados (OK) | Erros | Ignorados | Vazão (rows/s) | Duração |\n`;
  md += `| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  rows.forEach((row, index) => {
    const statusIcon = row.status === 'completed' && row.errorCount === 0 ? '✅' : row.status === 'missing' ? '❌ Não executado' : '⚠️ Erro';
    const csvDisplay = row.totalRows === -1 ? 'N/A' : row.totalRows.toLocaleString('pt-BR');
    const okDisplay = row.successCount.toLocaleString('pt-BR');
    const errDisplay = row.errorCount > 0 ? `**${row.errorCount}**` : '0';
    const skipDisplay = row.skippedCount;
    const throughputDisplay = row.throughput ? row.throughput.toFixed(1) : '0.0';
    const durationDisplay = formatDuration(row.durationMs);

    md += `| ${index + 1} | \`${row.importerKey}\` | \`${row.tableName}\` | \`${row.csvFile}\` | ${csvDisplay} | ${okDisplay} | ${errDisplay} | ${skipDisplay} | ${throughputDisplay} | ${durationDisplay} |\n`;
  });

  md += `\n\n*Nota: A contagem de registros do CSV desconsidera a linha de cabeçalho. Algumas tabelas do banco legado podem possuir apenas a linha de cabeçalho (0 registros reais), o que é normal no mapeamento do sistema.*\n`;

  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`\n🎉 Relatório de migração gerado e salvo com sucesso em:\n   ${reportPath}\n`);
  console.log(md);
}

main().catch((err) => {
  console.error('❌ Erro ao gerar o relatório:', err);
  process.exit(1);
});
