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
  const farmCount = produtor.fazendas.length;

  // Totais dos 3 tipos de consumo (distribuídos igualmente por fazenda)
  // movimentacao é negativo (débitos armazenados como negativo) → abs para distribuição
  const totalConsumo    = Math.abs(Math.floor(currentStats.movimentacao || 0));
  const totalAquisicao  = Math.floor(currentStats.aquisicao    || 0);
  const totalAposentado = Math.floor(currentStats.aposentado   || 0);
  // Bloqueado: não é consumo, não distribui por fazenda
  const totalBloqueado  = Math.floor(currentStats.bloqueado    || 0);

  // Função de distribuição inteira: floor + resto nas primeiras fazendas
  const distValue = (total: number, idx: number) => {
    if (farmCount === 0) return 0;
    const base = Math.floor(total / farmCount);
    const resto = total % farmCount;
    return idx < resto ? base + 1 : base;
  };

  const resumoData = produtor.fazendas.map((f: any, i: number) => {
    const farmOrig      = Number(f.saldoOriginacao) || 0;
    const farmDeduction = distValue(totalConsumo,    i);
    const farmAquisicao = distValue(totalAquisicao,  i);
    const farmAposentado = distValue(totalAposentado, i);

    // Saldo da fazenda = origem - (consumos distribuídos)
    // Bloqueado não é deduzido por fazenda individualmente
    const liquid = farmOrig - farmDeduction - farmAquisicao - farmAposentado;

    return {
      "IDF": f.idf,
      "Fazenda": f.fazendaNome,
      "Núcleo": f.nucleo,
      "Proprietário": produtor.nome,
      "Documento": produtor.documento,
      "Safra": f.safraReferencia,
      "Originação (UCS)": farmOrig,
      "Dedução Consumo (UCS)": farmDeduction,
      "Aquisição (UCS)": farmAquisicao,
      "Aposentadas (UCS)": farmAposentado,
      "Saldo Líquido (UCS)": liquid
    };
  });

  // Linha de totais
  const totalOrigem = resumoData.reduce((acc: number, r: any) => acc + r["Originação (UCS)"], 0);
  const totalFarmSaldo = resumoData.reduce((acc: number, r: any) => acc + r["Saldo Líquido (UCS)"], 0);

  resumoData.push({
    "IDF": "TOTAL",
    "Fazenda": "—",
    "Núcleo": "—",
    "Proprietário": "—",
    "Documento": "—",
    "Safra": "—",
    "Originação (UCS)": totalOrigem,
    "Dedução Consumo (UCS)": totalConsumo,
    "Aquisição (UCS)": totalAquisicao,
    "Aposentadas (UCS)": totalAposentado,
    "Saldo Líquido (UCS)": totalFarmSaldo
  });

  if (totalBloqueado > 0) {
    resumoData.push({
      "IDF": "BLOQUEADO (pool)",
      "Fazenda": "Não distribuído por fazenda",
      "Núcleo": "—",
      "Proprietário": "—",
      "Documento": "—",
      "Safra": "—",
      "Originação (UCS)": 0,
      "Dedução Consumo (UCS)": 0,
      "Aquisição (UCS)": 0,
      "Aposentadas (UCS)": 0,
      "Saldo Líquido (UCS)": -totalBloqueado
    });
    resumoData.push({
      "IDF": "SALDO REAL",
      "Fazenda": "Após deduzir bloqueado",
      "Núcleo": "—",
      "Proprietário": "—",
      "Documento": "—",
      "Safra": "—",
      "Originação (UCS)": 0,
      "Dedução Consumo (UCS)": 0,
      "Aquisição (UCS)": 0,
      "Aposentadas (UCS)": 0,
      "Saldo Líquido (UCS)": totalFarmSaldo - totalBloqueado
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
