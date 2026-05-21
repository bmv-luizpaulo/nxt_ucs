import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: NextRequest) {
  try {
    const cwd = process.cwd();
    const activeProcessPath = path.resolve(cwd, 'scripts/etl/logs/active-process.json');

    if (!fs.existsSync(activeProcessPath)) {
      return NextResponse.json({ error: 'Nenhum processo ativo encontrado.' }, { status: 400 });
    }

    let active: any = null;
    try {
      active = JSON.parse(fs.readFileSync(activeProcessPath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: 'Falha ao ler dados do processo ativo.' }, { status: 500 });
    }

    if (active && active.pid) {
      try {
        // Kill the process group (using negative PID on unix, or standard kill on windows)
        process.kill(active.pid, 'SIGTERM');
        
        // Try to clean up the file
        try {
          fs.unlinkSync(activeProcessPath);
        } catch {}

        return NextResponse.json({ 
          success: true, 
          message: `Processo ${active.pid} (${active.importerKey}) interrompido com sucesso.` 
        });
      } catch (e: any) {
        // If process was already dead, clean up file and return success
        try {
          fs.unlinkSync(activeProcessPath);
        } catch {}
        
        return NextResponse.json({ 
          success: true, 
          message: 'O processo já havia sido finalizado. Estado de execução limpo.' 
        });
      }
    }

    return NextResponse.json({ error: 'PID inválido do processo ativo.' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
