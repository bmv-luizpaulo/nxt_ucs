import React, { useState } from "react";
import { Droplets, ShieldCheck, MapPin, Target, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── TIPAGENS ─────────────────────────────────────────────────────────────────
interface Fazenda {
  fazendaNome: string;
  idf: string;
  safraReferencia?: string;
  areaProdutor?: number;
  nucleo?: string;
  municipio?: string;
  uf?: string;
  saldoOriginacao?: number | string;
  aposentado?: number | string;
}

interface PortfolioSectionProps {
  produtor: { fazendas?: Fazenda[] } | null;
  currentData: {
    tabelaOriginacao?: any[];
    tabelaMovimentacao?: any[];
  } | null;
  currentStats: {
    movimentacao?: number;
    aquisicao?: number;
    aposentado?: number;
    bloqueado?: number;
    saldoBruto?: number;
    [key: string]: any;
  };
}

// ── HELPER DE MATCH ────────────────────────────────────────────────────────────
const checkSafeMatch = (val: string, nomeFazenda: string, idfFazenda: string): boolean => {
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

// ── COMPONENTE ─────────────────────────────────────────────────────────────────
export function PortfolioSection({ produtor, currentData, currentStats }: PortfolioSectionProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  if (!produtor?.fazendas || !Array.isArray(produtor.fazendas)) return null;

  const fazendas = produtor.fazendas;
  const n = fazendas.length;

  // Totais de cada tipo de dedução
  // movimentacao é negativo (débitos armazenados como negativo) → abs para distribuição
  const totalMovimentacao = Math.abs(Math.floor(currentStats?.movimentacao || 0));
  const totalAquisicao   = Math.floor(currentStats?.aquisicao   || 0);
  const totalAposentado  = Math.floor(currentStats?.aposentado  || 0);
  // Bloqueado: não é consumo, não divide por fazenda
  const totalBloqueado   = Math.abs(Math.floor(currentStats?.bloqueado   || 0));


  // Distribui totais inteiros entre fazendas (floor + resto nas primeiras)
  const dist = (total: number) => ({
    base: n > 0 ? Math.floor(total / n) : 0,
    resto: n > 0 ? total % n : 0,
    total,
  });
  const dMov = dist(totalMovimentacao);
  const dAqui = dist(totalAquisicao);
  const dApos = dist(totalAposentado);

  // Pré-calcula todos os valores
  const farmData = fazendas.map((f, i) => {
    const farmOrig = currentData?.tabelaOriginacao?.reduce((acc: number, row: any) => {
      if (checkSafeMatch(row.dist, f.fazendaNome, f.idf) || checkSafeMatch(row.plataforma, f.fazendaNome, f.idf)) {
        return acc + (Number(row.valor) || 0);
      }
      return acc;
    }, 0) || Number(f.saldoOriginacao) || 0;

    // Distribuição igualitária inteira das 3 deduções
    const farmMov   = i < dMov.resto  ? dMov.base  + 1 : dMov.base;
    const farmAqui  = i < dAqui.resto ? dAqui.base + 1 : dAqui.base;
    const farmApos  = i < dApos.resto ? dApos.base + 1 : dApos.base;
    const farmDeduction = farmMov + farmAqui + farmApos;

    const temRestoMov  = i < dMov.resto;
    const temRestoAqui = i < dAqui.resto;
    const temRestoApos = i < dApos.resto;

    const farmLiquido = farmOrig - farmDeduction;
    return { f, farmOrig, farmMov, farmAqui, farmApos, farmDeduction, temRestoMov, temRestoAqui, temRestoApos, farmLiquido };
  });

  const totalOrig    = farmData.reduce((acc, d) => acc + d.farmOrig, 0);
  // Saldo bruto das fazendas (consumo distribuído, sem bloqueado)
  const totalFarmSaldo = farmData.reduce((acc, d) => acc + d.farmLiquido, 0);
  // Saldo real = saldo bruto das fazendas - bloqueado total
  const totalLiquido = totalFarmSaldo - totalBloqueado;

  return (
    <div className="space-y-6">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
          <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">Portfólio de Propriedades</h3>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
            {n} propriedade{n !== 1 ? 's' : ''}
          </span>
        </div>

        {/* TOGGLE */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('cards')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200",
              viewMode === 'cards' ? "bg-white shadow text-slate-900 border border-slate-200/80" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200",
              viewMode === 'list' ? "bg-white shadow text-slate-900 border border-slate-200/80" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* ─── MODO LISTA ─────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="border-b-0 hover:bg-transparent">
                  {/* Cabeçalho com indicadores coloridos por coluna */}
                  <TableHead className="bg-slate-50 h-10 pl-5 w-8 text-[8px] font-black text-slate-300 uppercase tracking-widest">#</TableHead>
                  <TableHead className="bg-slate-50 h-10 text-[8px] font-black text-slate-500 uppercase tracking-widest">Propriedade</TableHead>
                  <TableHead className="bg-slate-50 h-10 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">IDF</TableHead>
                  <TableHead className="bg-slate-50 h-10 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">Área (HA)</TableHead>
                  <TableHead className="bg-slate-50 h-10 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">Núcleo</TableHead>
                  <TableHead className="bg-slate-50 h-10 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">Município / UF</TableHead>
                  {/* Colunas financeiras com accent colorido */}
                  <TableHead className="bg-emerald-50/60 h-10 text-center text-[8px] font-black text-emerald-600 uppercase tracking-widest border-b-2 border-emerald-300">Originação</TableHead>
                  <TableHead className="bg-rose-50/60 h-10 text-center text-[8px] font-black text-rose-500 uppercase tracking-widest border-b-2 border-rose-300">Consumo</TableHead>
                  <TableHead className="bg-indigo-50/60 h-10 text-center text-[8px] font-black text-indigo-500 uppercase tracking-widest border-b-2 border-indigo-300">Aquisição</TableHead>
                  <TableHead className="bg-slate-50/80 h-10 text-center text-[8px] font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-300">Aposentadas</TableHead>
                  <TableHead className="bg-slate-900 h-10 text-right pr-6 text-[8px] font-black text-emerald-400 uppercase tracking-widest">Saldo Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmData.map(({ f, farmOrig, farmMov, farmAqui, farmApos, temRestoMov, temRestoAqui, temRestoApos, farmLiquido }, i) => (
                  <TableRow
                    key={i}
                    className={cn(
                      "h-10 border-b border-slate-100/80 transition-colors group/row",
                      i % 2 === 0 ? "bg-white hover:bg-emerald-50/20" : "bg-slate-50/40 hover:bg-emerald-50/30"
                    )}
                  >
                    <TableCell className="pl-5 text-[9px] font-black text-slate-300 tabular-nums w-8">{i + 1}</TableCell>
                    <TableCell className="font-black text-[11px] text-slate-800 uppercase tracking-tight group-hover/row:text-emerald-700 transition-colors py-0">
                      {f.fazendaNome}
                    </TableCell>
                    <TableCell className="text-center text-[9px] font-mono font-bold text-slate-400 py-0">{f.idf || '—'}</TableCell>
                    <TableCell className="text-center text-[10px] font-bold text-slate-500 tabular-nums py-0">
                      {f.areaProdutor ? f.areaProdutor.toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-center text-[9px] font-bold text-slate-500 uppercase py-0">{f.nucleo || '—'}</TableCell>
                    <TableCell className="text-center text-[9px] font-bold text-slate-500 py-0">
                      {f.municipio ? `${f.municipio} / ${f.uf}` : '—'}
                    </TableCell>

                    {/* Originação */}
                    <TableCell className="text-center bg-emerald-50/30 py-0">
                      <span className="text-[11px] font-black text-slate-700 tabular-nums">
                        {farmOrig.toLocaleString('pt-BR')}
                      </span>
                    </TableCell>

                    {/* Consumo */}
                    <TableCell className="text-center bg-rose-50/20 py-0">
                      <div className="flex flex-col items-center leading-none gap-0.5">
                        <span className="text-[11px] font-black text-rose-500 tabular-nums">
                          {farmMov > 0 ? `-${farmMov.toLocaleString('pt-BR')}` : '—'}
                        </span>
                        {temRestoMov && <span className="text-[7px] font-black text-amber-500 leading-none">+1</span>}
                      </div>
                    </TableCell>

                    {/* Aquisição */}
                    <TableCell className="text-center bg-indigo-50/20 py-0">
                      <div className="flex flex-col items-center leading-none gap-0.5">
                        <span className="text-[11px] font-black text-indigo-500 tabular-nums">
                          {farmAqui > 0 ? `-${farmAqui.toLocaleString('pt-BR')}` : '—'}
                        </span>
                        {temRestoAqui && <span className="text-[7px] font-black text-amber-500 leading-none">+1</span>}
                      </div>
                    </TableCell>

                    {/* Aposentadas */}
                    <TableCell className="text-center bg-slate-50/60 py-0">
                      <div className="flex flex-col items-center leading-none gap-0.5">
                        <span className="text-[11px] font-black text-slate-500 tabular-nums">
                          {farmApos > 0 ? `-${farmApos.toLocaleString('pt-BR')}` : '—'}
                        </span>
                        {temRestoApos && <span className="text-[7px] font-black text-amber-500 leading-none">+1</span>}
                      </div>
                    </TableCell>

                    {/* Saldo Líquido */}
                    <TableCell className="text-right pr-6 bg-slate-900/5 py-0">
                      <span className={cn(
                        "text-[12px] font-black tabular-nums",
                        farmLiquido >= 0 ? "text-emerald-600" : "text-rose-500"
                      )}>
                        {farmLiquido.toLocaleString('pt-BR')}
                        <span className="text-[8px] font-bold text-slate-400 ml-1">UCS</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* FOOTER FINANCEIRO */}
            <div className="border-t-2 border-slate-900">

              {/* Subtotal fazendas */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] bg-slate-800 px-0">
                <div className="pl-5 py-2.5 flex items-center">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Subtotal Fazendas</span>
                </div>
                <div className="py-2.5 px-6 bg-emerald-900/30 text-center">
                  <span className="text-[11px] font-black text-white tabular-nums">{totalOrig.toLocaleString('pt-BR')}</span>
                </div>
                <div className="py-2.5 px-6 bg-rose-900/30 text-center">
                  <span className="text-[11px] font-black text-rose-400 tabular-nums">
                    {totalMovimentacao > 0 ? `-${totalMovimentacao.toLocaleString('pt-BR')}` : '—'}
                  </span>
                </div>
                <div className="py-2.5 px-6 bg-indigo-900/30 text-center">
                  <span className="text-[11px] font-black text-indigo-400 tabular-nums">
                    {totalAquisicao > 0 ? `-${totalAquisicao.toLocaleString('pt-BR')}` : '—'}
                  </span>
                </div>
                <div className="py-2.5 px-6 bg-slate-700/50 text-center">
                  <span className="text-[11px] font-black text-slate-400 tabular-nums">
                    {totalAposentado > 0 ? `-${totalAposentado.toLocaleString('pt-BR')}` : '—'}
                  </span>
                </div>
                <div className="py-2.5 pr-6 pl-4 text-right">
                  <span className="text-[12px] font-black text-slate-200 tabular-nums">
                    {totalFarmSaldo.toLocaleString('pt-BR')}
                    <span className="text-[8px] font-bold text-slate-500 ml-1">UCS</span>
                  </span>
                </div>
              </div>

              {/* Bloqueado pool (condicional) */}
              {totalBloqueado > 0 && (
                <div className="flex items-center justify-between bg-amber-950/60 px-5 py-2 border-t border-amber-900/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">🔒 Saldo Bloqueado</span>
                    <span className="text-[8px] font-bold text-amber-700">pool — não distribuído por fazenda</span>
                  </div>
                  <span className="text-[12px] font-black text-amber-400 tabular-nums pr-6">
                    -{totalBloqueado.toLocaleString('pt-BR')}
                    <span className="text-[8px] font-bold text-amber-700 ml-1">UCS</span>
                  </span>
                </div>
              )}

              {/* Saldo Real */}
              <div className="flex items-center justify-between bg-slate-900 px-5 py-3.5 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Saldo Real Disponível</span>
                </div>
                <span className="text-[16px] font-black text-emerald-400 tabular-nums tracking-tight pr-6">
                  {totalLiquido.toLocaleString('pt-BR')}
                  <span className="text-[9px] font-bold text-emerald-700 ml-1">UCS</span>
                </span>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* ─── MODO CARDS ────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          {farmData.map(({ f, farmOrig, farmMov, farmAqui, farmApos, temRestoMov, temRestoAqui, temRestoApos, farmLiquido }, i) => (
            <div
              key={i}
              className="flex flex-col lg:flex-row gap-4 items-stretch animate-in fade-in slide-in-from-right-4 duration-500"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* CARD ESQUERDO: DETALHES CADASTRAIS */}
              <div className="flex-1 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-emerald-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-slate-900 text-white border-none px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-widest">Ativo Físico</Badge>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verificado
                      </span>
                    </div>
                    <h4 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1 mt-1">{f.fazendaNome}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IDF: <span className="text-slate-600">{f.idf || 'Não Informado'}</span></p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5">
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wide w-fit">100% Operacional</Badge>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Safra {f.safraReferencia || '---'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Área Certificada</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-emerald-600 tracking-tighter">
                        {(f.areaProdutor || 0).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Hectares</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center space-y-3 px-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-slate-400" />
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Núcleo / Gestão</p>
                        <p className="text-[11px] font-bold text-slate-700 uppercase leading-none">{f.nucleo || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="w-full h-px bg-slate-100" />
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Localização</p>
                        <p className="text-[11px] font-bold text-slate-700 uppercase leading-none">{f.municipio ? `${f.municipio} — ${f.uf}` : 'Não Informado'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD DIREITO: RESUMO TÉCNICO (DARK) */}
              <div className="w-full lg:w-[380px] lg:shrink-0 bg-[#0F172A] p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden border border-slate-800 flex flex-col group/dark">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover/dark:opacity-10 transition-opacity duration-500">
                  <Droplets className="w-24 h-24 text-emerald-400" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-6 border-b border-white/10 pb-4">
                    <h5 className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Resumo de Auditoria</h5>
                    <p className="text-sm font-black text-white uppercase leading-tight truncate">{f.fazendaNome}</p>
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Ref: {f.idf || '---'}</p>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Originação Bruta (+)</span>
                      <span className="text-sm font-black text-white">{farmOrig.toLocaleString('pt-BR')} <span className="text-[8px] text-slate-500 ml-0.5">UCS</span></span>
                    </div>

                    {/* Consumo */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-rose-400/80 uppercase">Consumo (-)</span>
                        {temRestoMov && <span className="text-[8px] font-black text-amber-400">+1</span>}
                      </div>
                      <span className="text-[11px] font-black text-rose-400 tabular-nums">-{farmMov.toLocaleString('pt-BR')}</span>
                    </div>

                    {/* Aquisição */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-indigo-400/80 uppercase">Aquisição (-)</span>
                        {temRestoAqui && <span className="text-[8px] font-black text-amber-400">+1</span>}
                      </div>
                      <span className="text-[11px] font-black text-indigo-400 tabular-nums">-{farmAqui.toLocaleString('pt-BR')}</span>
                    </div>

                    {/* Aposentadas */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400/80 uppercase">Aposentadas (-)</span>
                        {temRestoApos && <span className="text-[8px] font-black text-amber-400">+1</span>}
                      </div>
                      <span className="text-[11px] font-black text-slate-400 tabular-nums">-{farmApos.toLocaleString('pt-BR')}</span>
                    </div>

                    {/* Separador + Bloqueado (pool, não distribuído) */}
                    {totalBloqueado > 0 && (
                      <>
                        <div className="border-t border-white/5 my-1" />
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col gap-0">
                            <span className="text-[10px] font-bold text-amber-500/80 uppercase">Bloqueado pool 🔒</span>
                            <span className="text-[8px] text-amber-700">não distribuído por fazenda</span>
                          </div>
                          <span className="text-[11px] font-black text-amber-500 tabular-nums">-{totalBloqueado.toLocaleString('pt-BR')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Saldo Disponível Liquidado</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-white tracking-tighter leading-none">
                          {farmLiquido.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-emerald-500 text-sm font-black">UCS</span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase px-2 py-1 rounded-md">Auditado</Badge>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}