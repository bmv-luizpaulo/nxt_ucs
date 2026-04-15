import React from "react";
import { AlertCircle, History, Table2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "./DashboardComponents";

// 1. TIPAGENS REAIS
interface Fazenda {
  fazendaNome: string;
  idf: string;
  saldoOriginacao?: number | string;
  aposentado?: number | string;
}

interface SummarySectionProps {
  entityData: any;
  currentStats: any;
  produtor: {
    fazendas?: Fazenda[];
  } | null;
  currentData: {
    tabelaOriginacao?: any[];
    tabelaMovimentacao?: any[];
    tabelaAquisicao?: any[];
    tabelaLegado?: any[];
  } | null;
}

// 2. EXTRAÇÃO DA LÓGICA DE MATCH (ALTA PERFORMANCE)
const checkSafeMatch = (val: string, nomeFazenda: string, idfFazenda: string) => {
  if (!val) return false;
  const d = val.toUpperCase().trim();
  const n = (nomeFazenda || '').toUpperCase().trim();
  const idf = (idfFazenda || '').toUpperCase().trim();
  
  if (idf && idf !== '---' && d.includes(idf)) return true;
  if (n && d.includes(n)) return true;
  
  const cleanN = n.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
  const cleanD = d.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
  
  if (cleanN && cleanN.length > 3 && (cleanD.includes(cleanN) || cleanN.includes(cleanD))) return true;
  return false;
};

// HELPER GENÉRICO PARA SOMAR VALORES DA TABELA (EVITA REPETIÇÃO DE CÓDIGO)
const sumTableValues = (tableData: any[] | undefined, fNome: string, fIdf: string, valueKey: string = 'valor') => {
  if (!tableData) return 0;
  return tableData.reduce((acc: number, row: any) => {
    if (checkSafeMatch(row.dist, fNome, fIdf) || checkSafeMatch(row.plataforma, fNome, fIdf)) {
      return acc + (Number(row[valueKey]) || 0);
    }
    return acc;
  }, 0);
};

export function SummarySection({ 
  entityData, 
  currentStats, 
  produtor, 
  currentData 
}: SummarySectionProps) {
  
  // PREVENÇÃO DE CRASH
  if (!produtor || !currentStats) return null;

  return (
    <div className="space-y-8 md:space-y-12">
      
      {/* JUSTIFICATIVA DE AUDITORIA (MODERNIZADA E MENOR) */}
      {entityData?.ajusteManualJustificativa && (
        <div className="bg-rose-50/80 backdrop-blur-sm border border-rose-200/60 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-center shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 grayscale group-hover:grayscale-0 transition-all duration-700 pointer-events-none">
            <AlertCircle className="w-32 h-32 text-rose-500" />
          </div>
          
          <div className="w-14 h-14 rounded-2xl bg-rose-500 shadow-lg shadow-rose-200 flex items-center justify-center text-white shrink-0 z-10">
            <AlertCircle className="w-7 h-7" />
          </div>
          
          <div className="space-y-2 relative z-10 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Badge className="bg-rose-100 hover:bg-rose-200 text-rose-700 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1">
                Nota de Auditoria Crítica
              </Badge>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-rose-300" />
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Ajuste Manual Indireto Detectado</span>
            </div>
            <p className="text-base md:text-lg font-black text-slate-800 leading-tight italic tracking-tight">
              "{entityData.ajusteManualJustificativa}"
            </p>
          </div>
        </div>
      )}

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Patrimônio Total (Originação)" value={currentStats.originacao || 0} unit="UCS" />
        <StatCard label="Saídas Auditadas (Consumo)" value={currentStats.movimentacao || 0} unit="UCS" />
        <StatCard label="Bloqueio / Ajuste Manual" value={currentStats.bloqueado || 0} unit="UCS" />
        <StatCard
          label="Saldo Líquido Disponível"
          value={currentStats.saldoReal || 0}
          unit="UCS"
          isPositive={(currentStats.saldoReal || 0) > 0}
        />
      </div>

      {/* PARTICIONAMENTO TÉCNICO DE SALDOS (TABELA OTIMIZADA) */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <Table2 className="w-5 h-5 text-slate-400" />
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Particionamento Técnico de Saldos</h2>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
            Movimentação distribuída igualmente em inteiros
          </span>
        </div>
        
        {/* Container com scroll horizontal para responsividade em telas pequenas */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-100 hover:bg-slate-50/80">
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 pl-8 h-12">Propriedade</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">Originação</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">
                    Consumo
                    <span className="block text-[8px] font-bold text-slate-400 normal-case tracking-normal">÷ distribuído</span>
                  </TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">Aquisição</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">Aposentado</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 pr-8">Saldo Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const fazendas = produtor?.fazendas || [];
                  const n = fazendas.length;

                  // Total de movimentação (apenas CONSUMO, excluindo AJUSTE_PLATAFORMA — já filtrado no hook)
                  const totalMovimentacao = Math.floor(currentStats.movimentacao || 0);

                  // Distribuição inteira: base = floor(total/n), remainder = total % n
                  // As primeiras `remainder` fazendas recebem base+1
                  const base = n > 0 ? Math.floor(totalMovimentacao / n) : 0;
                  const remainder = n > 0 ? totalMovimentacao % n : 0;

                  if (n === 0) return (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Nenhuma propriedade cadastrada
                      </TableCell>
                    </TableRow>
                  );

                  let totalOrigRow = 0;
                  let totalAquisRow = 0;
                  let totalAposentadoRow = 0;
                  let totalSaldoRow = 0;

                  const rows = fazendas.map((f: Fazenda, j: number) => {
                    const farmOrig = sumTableValues(currentData?.tabelaOriginacao, f.fazendaNome, f.idf) || Number(f.saldoOriginacao) || 0;
                    // Distribuição inteira: as primeiras `remainder` fazendas levam base+1
                    const farmDeduction = j < remainder ? base + 1 : base;
                    const farmAquisicao = sumTableValues(currentData?.tabelaAquisicao, f.fazendaNome, f.idf);
                    const farmAposentado = sumTableValues(currentData?.tabelaLegado, f.fazendaNome, f.idf, 'aposentado') || Number(f.aposentado) || 0;
                    const saldoLiquido = farmOrig - farmDeduction - farmAquisicao - farmAposentado;

                    totalOrigRow += farmOrig;
                    totalAquisRow += farmAquisicao;
                    totalAposentadoRow += farmAposentado;
                    totalSaldoRow += saldoLiquido;

                    return (
                      <TableRow key={j} className="h-14 border-b border-slate-50 hover:bg-slate-50/50 transition-colors group/row">
                        <TableCell className="pl-8 text-xs font-black text-slate-800 uppercase tracking-tighter group-hover/row:text-emerald-600 transition-colors">
                          {f.fazendaNome}
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-500">{farmOrig.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-bold text-rose-500/80">-{farmDeduction.toLocaleString('pt-BR')}</span>
                            {j < remainder && (
                              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">+1 resto</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-indigo-500/80">-{farmAquisicao.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-400">-{farmAposentado.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right pr-8 text-sm font-black text-emerald-600">
                          {saldoLiquido.toLocaleString('pt-BR')} <span className="text-[9px] opacity-50 ml-0.5">UCS</span>
                        </TableCell>
                      </TableRow>
                    );
                  });

                  return (
                    <>
                      {rows}
                      {/* LINHA DE TOTAIS */}
                      <TableRow className="bg-slate-50 border-t border-slate-200">
                        <TableCell className="pl-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Consolidado</TableCell>
                        <TableCell className="text-center text-xs font-black text-slate-700">{totalOrigRow.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center text-xs font-black text-rose-600">-{totalMovimentacao.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center text-xs font-black text-indigo-600">-{totalAquisRow.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center text-xs font-black text-slate-500">-{totalAposentadoRow.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right pr-8 text-sm font-black text-emerald-700">
                          {totalSaldoRow.toLocaleString('pt-BR')} <span className="text-[9px] opacity-50 ml-0.5">UCS</span>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>

      {/* BLOCOS DE RESUMO ADICIONAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">

        {/* CARD ESQUERDO: RESUMO LEGADO & CONCILIAÇÃO */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <History className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Resumo Legado &amp; Conciliação</h3>
          </div>

          <div className="px-6 py-2 divide-y divide-slate-50">
            {/* Saldo Auditado Disponível */}
            <div className="flex justify-between items-center py-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Saldo Auditado Disponível</span>
              <span className="text-sm font-black text-emerald-600 tabular-nums">
                {(currentStats.saldoReal || 0).toLocaleString('pt-BR')} <span className="text-[9px] font-bold text-slate-400 ml-0.5">UCS</span>
              </span>
            </div>

            {/* Saldo Legado */}
            <div className="flex justify-between items-center py-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Saldo (Legado)</span>
              <span className="text-sm font-black text-slate-700 tabular-nums">
                {(currentStats.legado || 0).toLocaleString('pt-BR')} <span className="text-[9px] font-bold text-slate-400 ml-0.5">UCS</span>
              </span>
            </div>

            {/* UCS Bloqueadas — destaque âmbar */}
            <div className="py-2">
              <div className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">UCS Bloqueadas</span>
                <span className="text-sm font-black text-rose-500 tabular-nums">
                  -{(currentStats.bloqueado || 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Ajuste Manual Aplicado */}
            {!!currentStats.ajusteManual && (
              <div className="py-2">
                <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Ajuste Manual Aplicado</span>
                      {entityData?.ajusteManualJustificativa && (
                        <p className="text-[8px] font-medium text-slate-400 leading-relaxed uppercase">{entityData.ajusteManualJustificativa}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-slate-800 tabular-nums shrink-0">
                      {currentStats.ajusteManual >= 0 ? '+' : ''}{(currentStats.ajusteManual || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Divergência Técnica */}
            <div className="flex justify-between items-center py-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Divergência Técnica</span>
              <span className="text-sm font-black tabular-nums px-3 py-1 rounded-lg bg-rose-50 text-rose-500">
                {((currentStats.saldoReal || 0) - (currentStats.legado || 0)).toLocaleString('pt-BR')} <span className="text-[9px] font-bold ml-0.5">UCS</span>
              </span>
            </div>
          </div>
        </div>

        {/* CARD DIREITO: STATUS DE AUDITORIA EXTERNO (DARK) */}
        <div className="bg-[#1E2A3B] rounded-2xl p-8 shadow-lg border border-slate-700/50 relative overflow-hidden flex flex-col justify-center group min-h-[260px]">
          <div className="absolute bottom-0 right-0 p-6 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity duration-700">
            <ShieldCheck className="w-40 h-40 text-emerald-400" strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Status de Auditoria Externo</h3>
            </div>
            <p className="text-[12px] font-medium text-slate-300 leading-relaxed italic">
              "A BMV atesta que, após verificação técnica e auditoria das camadas de originação e movimentação histórica, o titular possui a devida custódia das UCs citadas."
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}