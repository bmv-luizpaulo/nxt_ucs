import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPT_MAPPING: Record<string, string> = {
  platforms: 'import_platforms.ts',
  projects: 'import_projects.ts',
  areas: 'import_areas.ts',
  harvests: 'import_harvests.ts',
  users: 'import_users.ts',
  cprs: 'import_cprs.ts',
  quotes: 'import_quotes.ts',
  distributions: 'import_distributions.ts',
  ucs: 'import_ucs_batches.ts',
  transactions: 'import_transactions.ts',
  balances: 'import_balances.ts',
  financial: 'import_financial_bills.ts',
  tv: 'import_tv_orders.ts',
  akses: 'import_akses_orders.ts',
  adjustments: 'import_adjustments.ts',
  blocked_ucs: 'import_blocked_ucs.ts',
  role_users: 'import_role_users.ts',
  distribution_configs: 'import_distribution_configs.ts',
  ownership_transfers: 'import_ownership_transfers.ts',
  all: 'run_all_imports.ts',
  validate: 'validate_import.ts',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { importerKey, dryRun, resume, version } = body;

    if (!importerKey || !SCRIPT_MAPPING[importerKey]) {
      return NextResponse.json(
        { error: `Script de importação desconhecido ou não especificado: ${importerKey}` },
        { status: 400 }
      );
    }

    const cwd = process.cwd();
    const activeProcessPath = path.resolve(cwd, 'scripts/etl/logs/active-process.json');

    // 1. Guard: Check if another migration is running
    if (fs.existsSync(activeProcessPath)) {
      try {
        const active = JSON.parse(fs.readFileSync(activeProcessPath, 'utf-8'));
        if (active && active.pid) {
          try {
            process.kill(active.pid, 0);
            return NextResponse.json(
              { error: 'Já existe uma importação/operação ativa rodando em background.' },
              { status: 400 }
            );
          } catch (e) {
            // Process dead, proceed
            try {
              fs.unlinkSync(activeProcessPath);
            } catch {}
          }
        }
      } catch {}
    }

    // 2. Build script arguments
    const scriptFile = SCRIPT_MAPPING[importerKey];
    const scriptPath = path.join('scripts/etl', scriptFile);
    const argsList: string[] = [];

    if (dryRun) argsList.push('--dry-run');
    if (resume) argsList.push('--resume');
    if (version) argsList.push(`--version=${version}`);

    // Ensure logs/console directory exists
    const logDir = path.resolve(cwd, 'scripts/etl/logs/console');
    fs.mkdirSync(logDir, { recursive: true });
    
    // Clear previous log for this importer
    const logFile = path.join(logDir, `${importerKey}.log`);
    if (fs.existsSync(logFile)) {
      try {
        fs.unlinkSync(logFile);
      } catch {}
    }
    const logFd = fs.openSync(logFile, 'a');

    const tsxPath = path.resolve(cwd, 'node_modules/tsx/dist/cli.mjs');
    console.log(`[API] Spawning: node ${tsxPath} ${scriptPath} ${argsList.join(' ')}`);

    // 3. Spawn child process (Windows safe by calling node directly on tsx entry point)
    const child = spawn('node', [tsxPath, scriptPath, ...argsList], {
      cwd,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    });

    // Close the file descriptor in the parent process so it's not leaked.
    // The child process retains its copy.
    try {
      fs.closeSync(logFd);
    } catch {}

    if (!child.pid) {
      return NextResponse.json(
        { error: 'Falha ao iniciar o processo em background.' },
        { status: 500 }
      );
    }

    // 4. Save active process info
    const activeProcess = {
      pid: child.pid,
      importerKey,
      startTime: new Date().toISOString(),
      dryRun: !!dryRun,
      resume: !!resume,
      version: version || 'v1',
    };
    fs.writeFileSync(activeProcessPath, JSON.stringify(activeProcess, null, 2), 'utf-8');

    // Handle process termination to clean up
    child.on('close', (code) => {
      console.log(`[API] Background process ${child.pid} exited with code ${code}`);
      try {
        if (fs.existsSync(activeProcessPath)) {
          const active = JSON.parse(fs.readFileSync(activeProcessPath, 'utf-8'));
          if (active.pid === child.pid) {
            fs.unlinkSync(activeProcessPath);
          }
        }
      } catch {}
    });

    // Unreference child so the API response resolves immediately while child continues
    child.unref();

    return NextResponse.json({
      success: true,
      pid: child.pid,
      importerKey,
      message: `Processo de importação iniciado com sucesso em background.`,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
