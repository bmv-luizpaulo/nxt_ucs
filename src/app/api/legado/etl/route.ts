import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as path from 'path';

// Maps ETL script names to their npm commands and descriptions
const ETL_SCRIPTS: Record<string, { command: string; label: string; tables: string[]; priority: number }> = {
  platforms:      { command: 'npm run etl:platforms',      label: 'Plataformas',             tables: ['dbo_platform', 'dbo_platform_tags'],                                                           priority: 1  },
  projects:       { command: 'npm run etl:projects',       label: 'Projetos',                tables: ['dbo_project'],                                                                                priority: 2  },
  areas:          { command: 'npm run etl:areas',          label: 'Áreas / Fazendas',        tables: ['dbo_area', 'dbo_yearly_area_info'],                                                            priority: 3  },
  harvests:       { command: 'npm run etl:harvests',       label: 'Safras',                  tables: ['dbo_harvest'],                                                                                priority: 4  },
  users:          { command: 'npm run etl:users',          label: 'Usuários',                tables: ['dbo_user', 'dbo_role_user', 'dbo_authentication'],                                            priority: 5  },
  cprs:           { command: 'npm run etl:cprs',           label: 'CPRs',                    tables: ['dbo_cpr', 'dbo_rl_cpr_areas', 'dbo_rl_cpr_file'],                                            priority: 6  },
  quotes:         { command: 'npm run etl:quotes',         label: 'Cotações UCS',            tables: ['dbo_ucs_quote'],                                                                              priority: 7  },
  distributions:  { command: 'npm run etl:distributions',  label: 'Distribuições',           tables: ['dbo_distribution'],                                                                           priority: 8  },
  ucs:            { command: 'npm run etl:ucs',            label: 'Lotes UCS (118k)',        tables: ['dbo_ucs_batch__2010', 'dbo_ucs_batch__2020', 'dbo_ucs_batch__2022', 'dbo_ucs_batch__2023'],  priority: 9  },
  transactions:   { command: 'npm run etl:transactions',   label: 'Transações (56k)',        tables: ['dbo_transaction'],                                                                            priority: 10 },
  balances:       { command: 'npm run etl:balances',       label: 'Saldos Consolidados',     tables: ['dbo_consolidated_balance', 'dbo_consolidated_balance_per_year'],                             priority: 11 },
  financial:      { command: 'npm run etl:financial',      label: 'Financeiro',              tables: ['financial_participant', 'financial_bill_to_pay', 'financial_bill_write_off'],                 priority: 12 },
  tv:             { command: 'npm run etl:tv',             label: 'Tesouro Verde',           tables: ['plat_tesouro_verde_certificate_order', 'plat_tesouro_verde_partners', 'plat_tesouro_verde_campaigns'], priority: 13 },
  akses:          { command: 'npm run etl:akses',          label: 'Akses',                   tables: ['plat_akses_distributor_certificate_order', 'plat_akses_transfer_order', 'plat_akses_purchase_order'], priority: 14 },
};

export async function GET() {
  return NextResponse.json({ scripts: ETL_SCRIPTS });
}

export async function POST(req: NextRequest) {
  const { script } = await req.json();

  if (!script || !ETL_SCRIPTS[script]) {
    return NextResponse.json({ error: `Script desconhecido: ${script}` }, { status: 400 });
  }

  const { command, label } = ETL_SCRIPTS[script];
  const cwd = path.resolve(process.cwd());

  return new Promise<NextResponse>((resolve) => {
    const startTime = Date.now();
    exec(command, { cwd, timeout: 10 * 60 * 1000 /* 10 min */ }, (error, stdout, stderr) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (error) {
        resolve(NextResponse.json({
          success: false,
          script,
          label,
          error: error.message,
          stdout,
          stderr,
          elapsedSeconds: elapsed,
        }, { status: 500 }));
      } else {
        resolve(NextResponse.json({
          success: true,
          script,
          label,
          stdout,
          stderr,
          elapsedSeconds: elapsed,
        }));
      }
    });
  });
}
