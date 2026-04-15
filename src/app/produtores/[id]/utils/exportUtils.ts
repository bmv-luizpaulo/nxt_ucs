import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const handleExportJSON = (data: any, name: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria-${name}.json`;
  a.click();
  toast.success("Banco de dados JSON baixado!");
};

export const handleExportXLSX = (produtor: any, entityData: any, currentStats: any) => {
  const wb = XLSX.utils.book_new();

  // 1. Planilha de Resumo por Fazenda
  const resumoData = produtor.fazendas.map((f: any) => {
    const safeMatch = (val: string) => {
      if (!val) return false;
      const d = val.toUpperCase().trim();
      const n = (f.fazendaNome || '').toUpperCase().trim();
      const idf = (f.idf || '').toUpperCase().trim();
      if (idf && idf !== '---' && d.includes(idf)) return true;
      if (n && d.includes(n)) return true;
      const cleanN = n.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
      const cleanD = d.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
      if (cleanN && cleanN.length > 3 && (cleanD.includes(cleanN) || cleanN.includes(cleanD))) return true;
      return false;
    };

    const farmOrig = (entityData?.tabelaOriginacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0)) || Number(f.saldoOriginacao) || 0;
    const farmConsumo = entityData?.tabelaMovimentacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0;
    const farmAquisicao = entityData?.tabelaAquisicao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0;
    const farmAposentado = (entityData?.tabelaLegado?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0)) || Number(f.aposentado) || 0;

    const liquid = farmOrig - farmConsumo - farmAquisicao - farmAposentado;

    return {
      "IDF": f.idf,
      "Fazenda": f.fazendaNome,
      "Núcleo": f.nucleo,
      "Proprietário": produtor.nome,
      "Documento": produtor.documento,
      "Safra": f.safraReferencia,
      "Originação (UCS)": farmOrig,
      "Dedução Consumo (UCS)": farmConsumo,
      "Aquisição (UCS)": farmAquisicao,
      "Aposentadas (UCS)": farmAposentado,
      "Saldo Líquido (UCS)": liquid
    };
  });

  // Linha de totais
  const totalOrigem = resumoData.reduce((acc: number, r: any) => acc + r["Originação (UCS)"], 0);
  const totalConsumoReal = resumoData.reduce((acc: number, r: any) => acc + r["Dedução Consumo (UCS)"], 0);
  const totalAquisicaoReal = resumoData.reduce((acc: number, r: any) => acc + r["Aquisição (UCS)"], 0);
  const totalAposentadoReal = resumoData.reduce((acc: number, r: any) => acc + r["Aposentadas (UCS)"], 0);
  const totalFarmSaldo = resumoData.reduce((acc: number, r: any) => acc + r["Saldo Líquido (UCS)"], 0);

  resumoData.push({
    "IDF": "TOTAL",
    "Fazenda": "—",
    "Núcleo": "—",
    "Proprietário": "—",
    "Documento": "—",
    "Safra": "—",
    "Originação (UCS)": totalOrigem,
    "Dedução Consumo (UCS)": totalConsumoReal,
    "Aquisição (UCS)": totalAquisicaoReal,
    "Aposentadas (UCS)": totalAposentadoReal,
    "Saldo Líquido (UCS)": totalFarmSaldo
  });

  const totalBloqueadoVlr = Math.floor(currentStats.bloqueado || 0);

  if (totalBloqueadoVlr > 0) {
    resumoData.push({
      "IDF": "BLOQUEADO (pool)",
      "Fazenda": "Bloqueio Técnico Central",
      "Núcleo": "—",
      "Proprietário": "—",
      "Documento": "—",
      "Safra": "—",
      "Originação (UCS)": 0,
      "Dedução Consumo (UCS)": 0,
      "Aquisição (UCS)": 0,
      "Aposentadas (UCS)": 0,
      "Saldo Líquido (UCS)": -totalBloqueadoVlr
    });
    resumoData.push({
      "IDF": "SALDO REAL",
      "Fazenda": "Após deduções e bloqueios",
      "Núcleo": "—",
      "Proprietário": "—",
      "Documento": "—",
      "Safra": "—",
      "Originação (UCS)": totalOrigem,
      "Dedução Consumo (UCS)": totalConsumoReal,
      "Aquisição (UCS)": totalAquisicaoReal,
      "Aposentadas (UCS)": totalAposentadoReal,
      "Saldo Líquido (UCS)": totalFarmSaldo - totalBloqueadoVlr
    });
  }

  // 2. Planilha de Extrato Completo
  const extratoData = [
    ...(entityData?.tabelaOriginacao || []).map((i: any) => ({ ...i, Seção: 'Originação' })),
    ...(entityData?.tabelaMovimentacao || []).map((i: any) => ({ ...i, Seção: 'Movimentação' })),
    ...(entityData?.tabelaLegado || []).map((i: any) => ({ ...i, Seção: 'Legado' })),
    ...(entityData?.tabelaAquisicao || []).map((i: any) => ({ ...i, Seção: 'Aquisição ADM' })),
    ...(entityData?.tabelaImei || []).map((i: any) => ({ ...i, Seção: 'IMEI' }))
  ];

  const wsResumo = XLSX.utils.json_to_sheet(resumoData);
  const wsExtrato = XLSX.utils.json_to_sheet(extratoData);

  XLSX.utils.book_append_sheet(wb, wsResumo, "Particionamento");
  XLSX.utils.book_append_sheet(wb, wsExtrato, "Extrato Técnico");

  XLSX.writeFile(wb, `auditoria-completa-${produtor.nome?.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  toast.success("Arquivo XLSX Completo disponível!");
};
