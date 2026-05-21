import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { version, collection: collectionName } = body;

    const targetVersion = version || 'v1';
    const cwd = process.cwd();
    const activeProcessPath = path.resolve(cwd, 'scripts/etl/logs/active-process.json');

    // 1. Guard: Check if another process is running
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

    // 2. Build args
    const argsList = [`--version=${targetVersion}`];
    if (collectionName) {
      argsList.push(`--collection=${collectionName}`);
    }

    const logDir = path.resolve(cwd, 'scripts/etl/logs/console');
    fs.mkdirSync(logDir, { recursive: true });

    // Clear previous rollback log
    const logFile = path.join(logDir, 'rollback.log');
    if (fs.existsSync(logFile)) {
      try {
        fs.unlinkSync(logFile);
      } catch {}
    }
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    console.log(`[API] Rollback Spawning: npx tsx scripts/etl/rollback.ts ${argsList.join(' ')}`);

    // 3. Spawn rollback script (Windows safe with shell: true)
    const child = spawn('npx', ['tsx', 'scripts/etl/rollback.ts', ...argsList], {
      cwd,
      shell: true,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!child.pid) {
      return NextResponse.json(
        { error: 'Falha ao iniciar o processo de rollback em background.' },
        { status: 500 }
      );
    }

    // Pipe stdout & stderr
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);

    // 4. Save active process info
    const activeProcess = {
      pid: child.pid,
      importerKey: 'rollback',
      startTime: new Date().toISOString(),
      dryRun: false,
      resume: false,
      version: targetVersion,
    };
    fs.writeFileSync(activeProcessPath, JSON.stringify(activeProcess, null, 2), 'utf-8');

    child.on('close', (code) => {
      console.log(`[API] Rollback process ${child.pid} exited with code ${code}`);
      logStream.end();
      try {
        if (fs.existsSync(activeProcessPath)) {
          const active = JSON.parse(fs.readFileSync(activeProcessPath, 'utf-8'));
          if (active.pid === child.pid) {
            fs.unlinkSync(activeProcessPath);
          }
        }
      } catch {}
    });

    child.unref();

    return NextResponse.json({
      success: true,
      pid: child.pid,
      importerKey: 'rollback',
      message: `Processo de rollback iniciado com sucesso para a versão ${targetVersion} em background.`,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
