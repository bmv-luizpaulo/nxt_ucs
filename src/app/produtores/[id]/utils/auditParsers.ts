export interface AuditRow {
  id: string;
  data: string;
  valor?: number;
  linkNxt?: string;
  dist?: string;
  destino?: string;
  usuarioDestino?: string;
  plataforma?: string;
  disponivel?: number;
  reservado?: number;
  bloqueado?: number;
  aposentado?: number;
  [key: string]: any;
}

export const parseVal = (str: string | undefined) => {
  if (!str) return 0;
  const clean = str.replace(/\.(?=\d{3})/g, "").replace(/\s/g, "").replace(",", ".");
  const val = parseFloat(clean.replace(/[^\d.-]/g, ""));
  return isNaN(val) ? 0 : val;
};
export const cleanData = (str: string | undefined) => str?.split(' ')[0] || '';

export function processAuditPaste(targetSection: string, rawText: string): AuditRow[] {
  const newRows: AuditRow[] = [];
  const rawLines = rawText.split('\n');

  // 1. Detect if this is a Single-Line Summary Format (Excel)
  const isExcelSummary = rawText.includes('Transferência p/') || rawText.includes('Usuário Destino:');

  // 2. Scan for NXT Log Format (Multi-line Blocks) - ONLY if not the Excel summary
  const headerRegex = /\b\d{1,10}\s+\d{1,10}\s+\d{2}\/\d{2}\/\d{4}/g;
  const matches = rawText.match(headerRegex);
  
  if (!isExcelSummary && matches && matches.length > 0) {
    const indices: number[] = [];
    let match;
    headerRegex.lastIndex = 0; // Reset regex
    
    while ((match = headerRegex.exec(rawText)) !== null) {
      indices.push(match.index);
    }

    const chunks = indices.map((start, i) => {
      const end = indices[i + 1] || rawText.length;
      return rawText.substring(start, end);
    });

    chunks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const headerLine = lines.find(l => /\d{2}\/\d{2}\/\d{4}/.test(l));
      if (!headerLine) return;

      const headerParts = headerLine.split(/\s+/);
      const idStr = headerParts[0];
      const distStr = headerParts[1];
      const dataStr = headerParts[2];

      // 3. Extract Participant Names (Improved Semantic Search)
      const produtorIdx = lines.findIndex(l => l.toLowerCase().includes('produtor'));
      const plataformaOrigem = lines.find(l => ['TRADING', 'CUSTODIA', 'INVESTMENT', 'MEX', 'IMEI', 'MATEUS'].some(p => l.startsWith(p))) || "N/A";
      const usuarioOrigem = (produtorIdx !== -1 && lines[produtorIdx + 1]) ? lines[produtorIdx + 1] : "N/A";

      // 4. Destination and Type Logic
      const ucsIdx = lines.findIndex(l => l.toUpperCase().includes('UCS'));
      let plataformaDestino = "---";
      let usuarioDestino = "---";
      let tipoDestino = "CLIENTE";

      // Search for second entity (Skip the first one found at origin)
      const originPlatIdx = lines.findIndex(l => l === plataformaOrigem);
      const secondPlatIdx = lines.findIndex((l, i) => i > (originPlatIdx + 1) && ['TRADING', 'INVESTMENT', 'CUSTODIA', 'IMEI', 'MATEUS'].some(p => l.startsWith(p)));
      
      if (secondPlatIdx !== -1) {
        plataformaDestino = lines[secondPlatIdx];
        usuarioDestino = lines[secondPlatIdx + 1] || "---";
        tipoDestino = lines[secondPlatIdx].includes('Saas') ? 'SAAS TESOURO VERDE' : (lines[secondPlatIdx].includes('Produtor') ? 'PRODUTOR' : 'CLIENTE');
      } else if (ucsIdx !== -1 && lines[ucsIdx - 1]) {
         // Fallback: If no second platform found, look above the "UCS" line
         usuarioDestino = lines[ucsIdx - 1];
      }

      const valorRaw = ucsIdx !== -1 ? parseVal(lines[ucsIdx]) : 0;
      
      // --- INTELLIGENT TRANSACTION TYPE HIERARCHY ---
      let tipoTransacao = 'CONSUMO';
      let valor = valorRaw;

      // 1. Check for specific status markers
      if (block.includes('APO') || block.includes('APOSENTADO')) {
        tipoTransacao = 'CONSUMO';
        valor = -Math.abs(valorRaw);
      } else if (block.includes('RES') || block.includes('RESERVA')) {
        // Reserved is usually potential consumption
        tipoTransacao = 'CONSUMO'; 
        valor = -Math.abs(valorRaw);
      } else if (block.includes('TRANS') || block.includes('TRANSFERENCIA')) {
        tipoTransacao = 'TRANSFERENCIA';
      } 
      // 2. Origination check
      else if (plataformaOrigem.startsWith('MATEUS') || plataformaOrigem.startsWith('MEX')) {
        tipoTransacao = 'ORIGINACAO';
      }
      // 3. Status DIS/DIS means it's a movement (Custodia)
      else if (block.includes('DIS\nDIS') || block.includes('DIS DIS')) {
        tipoTransacao = 'TRANSFERENCIA';
        valor = valorRaw;
      }
      // 4. User match means it's an internal adjustment
      else if (usuarioOrigem === usuarioDestino && usuarioOrigem !== 'N/A') {
        tipoTransacao = 'TRANSFERENCIA';
      }

      newRows.push({
        id: idStr,
        data: cleanData(dataStr),
        dist: distStr,
        origem: plataformaOrigem,
        nome: usuarioOrigem,
        usuarioOrigem: usuarioOrigem,
        destino: plataformaDestino,
        tipoUsuarioDestino: tipoDestino,
        usuarioDestino: usuarioDestino,
        valor: valor,
        tipoTransacao: tipoTransacao,
        statusAuditoria: 'Concluido'
      });
    });
  } else {
    // Standard line-by-line parsing for Excel/Sheets templates

    for (const line of rawLines) {
      if (!line.trim()) continue;
      const parts = line.trim().split(/\s+/).filter(p => p.length > 0);

      switch (targetSection) {
        case 'tabelaLegado':
          // 1. We process the WHOLE text for Legado to handle multi-line blocks
          // We only do this once, so we check if we already processed it
          if (line === rawLines[0]) {
            const records = rawText.split(/(\d{2}\/\d{2}\/\d{4})/g);
            // records[0] is preamble, [1] is date, [2] is data, [3] is date...
            for (let i = 1; i < records.length; i += 2) {
              const date = records[i];
              const content = records[i+1] || "";
              
              const platformKeywords = ['TRADING', 'INVESTMENT', 'CUSTODIA', 'MATEUS', 'PORTFOLIO'];
              const plat = platformKeywords.find(kw => content.toUpperCase().includes(kw)) || "---";
              
              const ucsMatches = content.match(/(-?[\d.,]+)\s*UCS/gi);
              if (ucsMatches && ucsMatches.length >= 4) {
                 const balances = ucsMatches.map(m => parseVal(m.replace(/UCS/gi, '')));
                 newRows.push({
                   id: `LEG-${crypto.randomUUID().substring(0, 6).toUpperCase()}`,
                   data: cleanData(date),
                   plataforma: plat.toUpperCase(),
                   disponivel: balances[0] || 0,
                   reservado: balances[1] || 0,
                   bloqueado: balances[2] || 0,
                   aposentado: balances[3] || 0,
                   statusAuditoria: 'Concluido'
                 });
              }
            }
          }
          break;
        case 'tabelaOriginacao':
          const ucsIdx = parts.findIndex(p => p.toUpperCase().includes('UCS') || /^-?\d+([.,]\d+)?$/.test(p));
          const finalVal = ucsIdx !== -1 ? parseVal(parts[ucsIdx]) : parseVal(parts[parts.length - 1]);
          newRows.push({ 
            id: `ORIG-${crypto.randomUUID().substring(0, 8).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: cleanData(parts[1]), 
            plataforma: parts[2]?.trim() || '', 
            valor: finalVal,
            tipoTransacao: 'ORIGINACAO'
          }); 
          break;
        case 'tabelaMovimentacao':
          if (line.toLowerCase().includes('dist') || line.toLowerCase().includes('soma')) break;
          const movCols = line.split('\t').map(p => p.trim());
          
          if (movCols.length >= 3) {
             const dist = movCols[0] || "---";
             const dataStr = movCols[1] || "---";
             const destino = movCols[2] || "---";
             const cliente = movCols[3] || "---";
             
             // Dynamic value detection: find the first number after client column
             const potentialValues = movCols.slice(4)
               .filter(p => /^[\d.]+$/.test(p.replace(',', '.')) && p.length > 0)
               .map(p => parseVal(p));
             
             const valorUcs = potentialValues[0] || 0;
             
             // Metadata detection
             const link = movCols.find(p => p.startsWith('http')) || "";
             const sit = movCols.find(p => ['Pago', 'Não pago', 'A conferir', 'Não Pago'].includes(p)) || "---";
             const financeiro = movCols.find(p => p.includes('R$')) || "---";

             newRows.push({
               id: `MOV-${dist}-${crypto.randomUUID().substring(0, 4)}`,
               dist,
               data: cleanData(dataStr),
               destino,
               cliente,
               valor: -Math.abs(valorUcs),
               situacao: sit,
               valorPago: financeiro,
               comprovante: link,
               tipoTransacao: (line.toUpperCase().includes('RESERVA') || line.toUpperCase().includes('RES')) ? 'RESERVA' : 'CONSUMO',
               statusAuditoria: 'Concluido'
             });
          }
          break;
        case 'tabelaImei':
          // Semantic IMEI Parser: Detects flow based on keywords and column positioning
          if (line.toLowerCase().includes('dist.') || line.toLowerCase().includes('data')) break;
          
          const imeiParts = line.split('\t').map(p => p.trim());
          if (imeiParts.length >= 4) {
             const dist = imeiParts[0] || "";
             const dataStr = imeiParts[1] || "";
             const tipo = imeiParts[2] || "";
             const usuarioDestino = imeiParts[3] || "";
             
             // Extract any number that looks like a balance (usually at the end)
             const numericValues = imeiParts
               .filter(p => /^-?[\d.,]+$/.test(p) && p.length > 0)
               .map(p => {
                 // Force treat dot as thousand separator if it looks like X.XXX
                 let clean = p;
                 if (p.includes('.') && !p.includes(',')) {
                   const segments = p.split('.');
                   if (segments[segments.length-1].length === 3) {
                     clean = p.replace(/\./g, '');
                   }
                 }
                 return parseVal(clean);
               });

             const val = numericValues[numericValues.length - 1] || 0;
             
             let debito = 0;
             let credito = 0;

             // Determine type based on keywords in the 'tipo' or full line
             if (tipo.toUpperCase().includes('CUSTODIA') || line.toUpperCase().includes('CUSTODIA')) {
               debito = val;
             } else if (tipo.toUpperCase().includes('INVESTMENT') || line.toUpperCase().includes('INVESTMENT')) {
               credito = val;
             }

             newRows.push({
               id: dist.replace(/\./g, '') || `IMEI-${crypto.randomUUID().substring(0, 6).toUpperCase()}`,
               dist: dist.replace(/\./g, ''),
               data: cleanData(dataStr),
               origem: tipo, // The "Tipo" column
               usuarioDestino: usuarioDestino,
               metrica: 'UCS',
               debito,
               credito,
               statusAuditoria: 'Concluido'
             });
          }
          break;
      }
    }
  }
  return newRows;
}
