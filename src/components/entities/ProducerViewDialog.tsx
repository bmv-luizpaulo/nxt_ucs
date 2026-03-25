"use client"

import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer, ShieldCheck, X, FileText, AlertTriangle, Scale, History, Link2,
  ExternalLink, Eye, EyeOff, Database, MapPin, Layers, Building2, QrCode, FileText as FileIcon, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityAuditReport } from "./reports/EntityAuditReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { getLinkWithFilter } from "./EntityFilters";
import Link from "next/link";
import Image from "next/image";
import { useAuditor } from "@/hooks/use-auditor";

interface ProducerViewDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  allData?: EntidadeSaldo[]; 
}

export function ProducerViewDialog({ entity, open, onOpenChange, onEdit, allData }: ProducerViewDialogProps) {
  const { user } = useUser();
  const auditor = useAuditor();
  const firestore = useFirestore();
  const [isCensored, setIsCensored] = useState(false);
  const [reportType, setReportType] = useState<'executive' | 'juridico'>('executive');

  // Consulta DIRETA ao banco para garantir precisão de auditoria (todas as fazendas do produtor)
  const relatedQuery = useMemoFirebase(() => {
    if (!firestore || !entity || !open) return null;
    return query(
      collection(firestore, "produtores"),
      where("documento", "==", entity.documento)
    );
  }, [firestore, entity, open]);

  const { data: dbFarms, isLoading: isFetching } = useCollection<EntidadeSaldo>(relatedQuery);

  const relatedFarms = useMemo(() => {
    if (isFetching) return [];
    if (dbFarms && dbFarms.length > 0) return dbFarms;
    
    // Fallback para dados locais
    if (!entity || !allData) return [];
    return allData.filter(e => e.documento === entity.documento);
  }, [dbFarms, isFetching, entity, allData]);

  const formatUCS = (val: number | undefined) => (val || 0).toLocaleString('pt-BR');

  // Consolidação de todas as fazendas
  const consolidated = useMemo(() => {
    if (relatedFarms.length === 0) return { orig: 0, origFazenda: 0, mov: 0, apo: 0, bloq: 0, aq: 0, imei: 0, legado: 0, final: 0 };
    
    const orig = relatedFarms.reduce((sum, f) => sum + (f.saldoParticionado || 0), 0);
    const origFazenda = relatedFarms.reduce((sum, f) => sum + (f.originacaoFazendaTotal || f.originacao || 0), 0);
    const mov = relatedFarms.reduce((sum, f) => sum + (f.movimentacao || 0), 0);
    const apo = relatedFarms.reduce((sum, f) => sum + (f.aposentado || 0), 0);
    const bloq = relatedFarms.reduce((sum, f) => sum + (f.bloqueado || 0), 0);
    const aq = relatedFarms.reduce((sum, f) => sum + (f.aquisicao || 0), 0);
    const imei = relatedFarms.reduce((sum, f) => sum + (f.saldoAjustarImei || 0), 0);
    const legado = relatedFarms.reduce((sum, f) => sum + (f.saldoLegadoTotal || 0), 0);
    const final_ = relatedFarms.reduce((sum, f) => sum + (f.saldoFinalAtual || 0), 0);
    
    return { orig, origFazenda, mov, apo, bloq, aq, imei, legado, final: final_ };
  }, [relatedFarms]);

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  const handlePrintExecutive = () => {
    setReportType('executive');
    setTimeout(() => handlePrint(), 500);
  };

  const handlePrintJuridico = () => {
    setReportType('juridico');
    setTimeout(() => handlePrint(), 500);
  };

  const aggregatedEntity = useMemo(() => {
    if (!entity) return null;
    return {
      ...entity,
      tabelaOriginacao: relatedFarms.length > 0 ? relatedFarms.map(f => ({
        id: f.id,
        data: f.safra || f.dataRegistro || "-",
        plataforma: f.propriedade || "FAZENDA",
        valor: f.saldoParticionado || 0,
        dist: "ORIGINAÇÃO"
      })) : (entity.tabelaOriginacao || []),
      tabelaMovimentacao: relatedFarms.flatMap(f => f.tabelaMovimentacao || []),
      tabelaAquisicao: relatedFarms.flatMap(f => f.tabelaAquisicao || []),
      tabelaLegado: relatedFarms.flatMap(f => f.tabelaLegado || []),
      tabelaImei: relatedFarms.flatMap(f => f.tabelaImei || [])
    } as EntidadeSaldo;
  }, [entity, relatedFarms]);

  const reportTotals = useMemo(() => ({
    origProdutor: consolidated.orig,
    origFazenda: consolidated.origFazenda,
    mov: consolidated.mov,
    aq: consolidated.aq,
    imeiPending: consolidated.imei,
    legadoTotal: consolidated.legado,
    aposentado: consolidated.apo,
    bloqueado: consolidated.bloq,
    final: consolidated.final
  }), [consolidated]);

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualização do Produtor - {entity.nome}</DialogTitle>
          <DialogDescription>Visão consolidada de todas as fazendas e saldos do produtor.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden print:hidden">
          {/* HEADER */}
          <div className="bg-[#0B0F1A] p-10 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-[#10B981]/20 rounded-md flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#10B981]">Auditoria de Precisão · Produtor</p>
                </div>
                <h1 className="text-[32px] font-black tracking-tight uppercase leading-none font-headline">{entity.nome}</h1>
                <div className="flex items-center gap-4">
                  <p className="text-[14px] font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
                  <Badge className={cn(
                    "text-[10px] font-black uppercase px-4 py-1.5 rounded-full",
                    entity.status === 'disponivel' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" :
                    entity.status === 'bloqueado' ? "bg-rose-500/20 text-rose-400 border-rose-500/50" :
                    "bg-amber-500/20 text-amber-400 border-amber-500/50"
                  )}>
                    {entity.status === 'disponivel' ? 'APTO / DISPONÍVEL' : entity.status?.toUpperCase()}
                  </Badge>
                  {isFetching && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> Atualizando Ledger...
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#161B2E] border border-white/5 rounded-[2.5rem] p-8 min-w-[360px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 blur-3xl -mr-20 -mt-20"></div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Saldo Total Auditado (Banco)</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-[48px] font-black text-white tracking-tighter leading-none font-headline">{formatUCS(consolidated.final)}</span>
                  <span className="text-[14px] font-black text-[#10B981] uppercase tracking-widest">UCS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              <StatBox label="ORIGINAÇÃO (PART.)" value={consolidated.orig} />
              <StatBox label="ORIG. FAZENDAS" value={consolidated.origFazenda} isHighlight />
              <StatBox label="MOVIMENTAÇÃO" value={consolidated.mov} isNegative />
              <StatBox label="APOSENTADO" value={consolidated.apo} isNegative />
              <StatBox label="BLOQUEADO" value={consolidated.bloq} isNegative />
              <StatBox label="AQUISIÇÃO" value={consolidated.aq} isNegative />
              <StatBox label="AJUSTE IMEI" value={consolidated.imei} isImei />
              <StatBox label="SALDO LEGADO" value={consolidated.legado} isAmber />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-10 space-y-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 font-headline">
                    Fazendas Vinculadas no Ledger
                  </h3>
                  <Badge variant="outline" className="text-[9px] font-black uppercase rounded-full px-3 py-1 border-slate-200 text-slate-400">
                    {relatedFarms.length} Propriedades Identificadas
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {relatedFarms.map((farm, idx) => (
                    <div key={farm.id} className={cn(
                      "bg-slate-50 border border-slate-100 rounded-[2rem] p-8 transition-all",
                      relatedFarms.length > 1 ? "hover:border-teal-200 hover:shadow-sm" : ""
                    )}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center text-[10px] font-black text-teal-600">
                            {idx + 1}
                          </div>
                          <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-900 font-headline">
                            {farm.propriedade || 'Sem Nome de Propriedade'}
                          </h4>
                          {farm.idf && (
                            <Badge variant="outline" className="text-[8px] font-black text-slate-400 border-slate-200 rounded-full px-2 py-0.5">
                              IDF: {farm.idf}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Originação Fazenda</p>
                          <p className="text-[16px] font-black text-slate-900 font-headline">{formatUCS(farm.originacaoFazendaTotal || farm.originacao)} UCS</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-5">
                        <DetailItem label="Safra" value={farm.safra} />
                        <DetailItem label="Data Registro" value={farm.dataRegistro} />
                        <DetailItem label="Área Total" value={farm.areaTotal ? `${farm.areaTotal.toLocaleString('pt-BR')} ha` : '-'} />
                        <DetailItem label="Área Vegetação" value={farm.areaVegetacao ? `${farm.areaVegetacao.toLocaleString('pt-BR')} ha` : '-'} />
                        <DetailItem label="Núcleo" value={farm.nucleo} />
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                          {farm.lat ? (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${String(farm.lat).replace(',', '.')},${String(farm.long).replace(',', '.')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{farm.lat}, {farm.long}</span>
                              <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                          ) : <p className="text-[11px] font-bold text-slate-900">-</p>}
                        </div>
                        <DetailItem label="ISIN" value={farm.isin} isMono />
                        <DetailItem label="Hash Originação" value={farm.hashOriginacao ? `${farm.hashOriginacao.substring(0, 20)}...` : '-'} isMono />
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Part. Produtor</p>
                          <p className="text-[13px] font-black text-slate-900">{(farm.particionamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% <span className="text-slate-300">|</span> {formatUCS(farm.saldoParticionado)} UCS</p>
                        </div>
                        {farm.associacaoNome && (
                          <Link 
                            href={getLinkWithFilter("/nucleos", farm.associacaoNome)}
                            onClick={() => onOpenChange(false)}
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-600 transition-colors truncate">{farm.associacaoNome}</p>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-amber-600 shrink-0" />
                            </div>
                            <p className="text-[13px] font-black text-slate-900">{(farm.associacaoParticionamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% <span className="text-slate-300">|</span> {formatUCS(farm.associacaoSaldo)} UCS</p>
                          </Link>
                        )}
                        {farm.imeiSaldo !== undefined && (
                          <Link 
                            href={getLinkWithFilter("/imeis", farm.imeiNome || "IMEI")}
                            onClick={() => onOpenChange(false)}
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-violet-300 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-violet-600 transition-colors">IMEI</p>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-violet-600 shrink-0" />
                            </div>
                            <p className="text-[13px] font-black text-slate-900">{formatUCS(farm.imeiSaldo)} UCS</p>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#10B981]" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900 font-headline">Apontamentos de Auditoria</h3>
                  </div>
                  <div className="p-8 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[120px] text-[14px] font-medium text-slate-600 leading-relaxed italic">
                    {entity.observacao || "Nenhum apontamento registrado para este produtor."}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Status da Conformidade</h3>
                  <div className="h-16 flex items-center px-8 bg-slate-50 border border-slate-100 rounded-2xl">
                    {entity.statusAuditoriaSaldo === 'valido' ? (
                      <div className="flex items-center gap-3 text-emerald-600 font-black text-[12px] uppercase tracking-widest">
                        <ShieldCheck className="w-5 h-5" /> SALDO VALIDADO</div>
                    ) : (
                      <div className="flex items-center gap-3 text-amber-500 font-black text-[12px] uppercase tracking-widest">
                        <AlertTriangle className="w-5 h-5" /> PENDENTE DE VALIDAÇÃO
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TABELAS EM MODO LEITURA CONSOLIDADA */}
              {aggregatedEntity && (
                <div className="space-y-12">
                  {(aggregatedEntity.tabelaOriginacao?.length || 0) > 0 && (
                    <ViewSection 
                      title="01. ORIGINAÇÃO CONSOLIDADA" 
                      data={aggregatedEntity.tabelaOriginacao} 
                      type="originacao" 
                      total={consolidated.orig} 
                    />
                  )}
                  {(aggregatedEntity.tabelaMovimentacao?.length || 0) > 0 && (
                    <ViewSection 
                      title="02. MOVIMENTAÇÃO CONSOLIDADA" 
                      data={aggregatedEntity.tabelaMovimentacao} 
                      type="movimentacao" 
                      isNegative 
                      total={consolidated.mov} 
                      initialBalance={consolidated.orig}
                    />
                  )}
                  {(aggregatedEntity.tabelaLegado?.length || 0) > 0 && (
                    <ViewSection 
                      title="03. SALDO LEGADO CONSOLIDADO" 
                      data={aggregatedEntity.tabelaLegado} 
                      type="legado" 
                      isAmber 
                      total={consolidated.legado} 
                    />
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* FOOTER */}
          <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 no-print">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 px-8 h-12">
              <X className="w-4 h-4 mr-2" /> Fechar
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsCensored(!isCensored)} 
                className={cn(
                  "h-12 px-5 rounded-2xl border-slate-200 transition-all font-black uppercase text-[10px] tracking-widest",
                  isCensored ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-slate-50/50 text-slate-500"
                )}
              >
                {isCensored ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {isCensored ? "Censura Ativa" : "Censurar"}
              </Button>
              <Button variant="outline" onClick={handlePrintExecutive} title="Relatório de Auditoria Padrão" className="h-11 px-6 rounded-xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-slate-700 hover:bg-white transition-all shadow-sm">
                <Printer className="w-4 h-4 mr-2" /> EXECUTIVO
              </Button>
              <Button variant="outline" onClick={handlePrintJuridico} title="Relatório Detalhado para Contraprova Jurídica" className="h-11 px-6 rounded-xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-[#734DCC] hover:bg-white transition-all shadow-sm">
                <Scale className="w-4 h-4 mr-2" /> CONTRAPROVA JURÍDICA
              </Button>
              {onEdit && (
                <Button onClick={onEdit} className="h-12 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95">
                  Habilitar Edição
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* PRINTABLE AREA (UNIFIED REPORT) */}
        {aggregatedEntity && (
          <EntityAuditReport 
            entity={aggregatedEntity} 
            totals={reportTotals} 
            reportType={reportType} 
            userEmail={user?.email || "SYSTEM_AUDITOR"} 
            auditor={auditor}
            isCensored={isCensored}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAmber, isImei }: any) {
  return (
    <div className={cn(
      "border rounded-[1rem] p-3 flex flex-col justify-between h-[80px] transition-all bg-[#161B2E]",
      isAmber ? "border-amber-500/30" : isImei ? "border-indigo-500/30" : "border-white/5"
    )}>
      <p className={cn(
        "text-[8px] font-black uppercase tracking-[0.12em] leading-none",
        isAmber ? "text-amber-500" : isImei ? "text-indigo-400" : isHighlight ? "text-teal-400" : "text-slate-500"
      )}>
        {label}
      </p>
      <p className={cn(
        "text-[16px] font-black font-mono leading-none tracking-tighter",
        isNegative && value !== 0 ? "text-rose-500" :
          isHighlight ? "text-teal-400" :
            isAmber ? "text-amber-500" :
              isImei ? "text-indigo-400" : "text-white"
      )}>
        {(isNegative && value > 0) ? `-${(value || 0).toLocaleString('pt-BR')}` : (value || 0).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function DetailItem({ label, value, isMono, className }: { label: string, value: any, isMono?: boolean, className?: string }) {
  if (value === undefined || value === null || value === "") value = "-";
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-[11px] font-bold text-slate-900", isMono ? "font-mono tracking-tight text-[10px] break-all" : "")}>{value}</p>
    </div>
  );
}

function ViewSection({ title, data, type, isNegative, isAmber, isImei, total, maskFn = (t: any) => t || '-', initialBalance = 0 }: any) {
  const isLegado = type === 'legado';
  const isMovimentacao = type === 'movimentacao';

  // Calculate Running Balance for Movimentação
  let runningBalance = initialBalance;
  const sortedData = useMemo(() => {
    // Ordenar por data se disponível para o saldo acumulado fazer sentido
    const items = [...(data || [])];
    if (isMovimentacao) {
      items.sort((a, b) => {
        const dateA = a.data ? new Date(a.data.split('/').reverse().join('-')) : new Date(0);
        const dateB = b.data ? new Date(b.data.split('/').reverse().join('-')) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
    }
    return items;
  }, [data, isMovimentacao]);

  const dataWithBalance = isMovimentacao ? sortedData.map((row: any) => {
    runningBalance -= (row.valor || 0);
    return { ...row, saldoAcumulado: runningBalance };
  }) : sortedData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-1.5 h-6 rounded-full",
            isAmber ? "bg-amber-500" : isImei ? "bg-indigo-500" : isNegative ? "bg-rose-500" : "bg-[#10B981]"
          )} />
          <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900 font-headline">{title}</h3>
          <Badge variant="secondary" className={cn(
            "text-[10px] font-black uppercase rounded-full bg-slate-100 px-3 py-1",
            isAmber ? "text-amber-500" : isImei ? "text-indigo-500" : isNegative ? "text-rose-500" : "text-[#10B981]"
          )}>
            {(total || 0).toLocaleString('pt-BR')} UCS
          </Badge>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="h-12 hover:bg-transparent">
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-8 w-[100px]">DIST.</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-[100px]">DATA INÍCIO</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">HISTÓRICO</TableHead>
              
              {isMovimentacao ? (
                <>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">DESTINO</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">USUÁRIO DESTINO</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-rose-500 text-right w-[100px]">DÉBITO</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-emerald-600 text-right w-[100px]">SALDO ACUM.</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-[80px]">SITUAÇÃO</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">PAGAMENTO</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-[#734DCC] text-center w-[60px]">NXT</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 pr-8">OBSERVAÇÕES</TableHead>
                </>
              ) : isLegado ? (
                <>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-emerald-600 text-right">DISPONÍVEL</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-amber-500 text-right">RESERVADO</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">BLOQUEADO</TableHead>
                </>
              ) : (
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">VOLUME (UCS)</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataWithBalance?.map((row: any, i: number) => (
              <TableRow key={i} className="h-14 border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                <TableCell className="pl-8 font-mono text-[10px] text-slate-400">{row.dist || '-'}</TableCell>
                <TableCell className="font-mono text-[10px] text-slate-400">{row.data || '-'}</TableCell>
                <TableCell className="font-bold text-[10px] uppercase text-slate-600 max-w-[140px] truncate">
                  {maskFn(row.plataforma || row.nome || '-')}
                </TableCell>
                
                {isMovimentacao && (
                  <>
                    <TableCell className="font-bold text-[10px] uppercase text-slate-400 max-w-[140px] truncate">{maskFn(row.destino || '-')}</TableCell>
                    <TableCell className="text-right font-mono font-black text-[11px] text-rose-500">
                      -{ (row.valor || 0).toLocaleString('pt-BR') }
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-[11px] text-emerald-600 bg-emerald-50/20">
                      { (row.saldoAcumulado || 0).toLocaleString('pt-BR') }
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge className={cn(
                         "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none",
                         (row.statusAuditoria === 'Concluido' || row.statusAuditoria === 'CONCLUÍDO') ? "bg-emerald-100 text-emerald-700" : 
                         row.statusAuditoria === 'Cancelado' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                       )}>
                         {(row.statusAuditoria || 'PENDENTE').substring(0, 10)}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-[9px] text-slate-500 whitespace-nowrap">
                       <div className="flex flex-col items-center">
                          <span>{row.dataPagamento || '-'}</span>
                          {row.valorPago > 0 && (
                            <span className="text-emerald-600 font-black">
                               {row.valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          )}
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                           {row.linkNxt && (
                             <a href={row.linkNxt} target="_blank" rel="noopener noreferrer">
                                <Link2 className="w-3.5 h-3.5 text-[#734DCC] hover:scale-110 transition-transform" />
                             </a>
                           )}
                        </div>
                    </TableCell>
                    <TableCell className="pr-8 text-[10px] font-medium text-slate-400 italic max-w-[180px] break-words">
                       {row.observacaoTransacao || '-'}
                    </TableCell>
                  </>
                )}

                {isLegado ? (
                  <>
                    <TableCell className="text-right font-mono font-bold text-[10px] text-emerald-600">{(row.disponivel || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[10px] text-amber-500">{(row.reservado || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[10px] text-rose-400 pr-8">{(row.bloqueado || row.aposentado || 0).toLocaleString('pt-BR')}</TableCell>
                  </>
                ) : !isMovimentacao && (
                  <TableCell className="text-right font-mono font-black text-[11px] pr-8 text-slate-900">
                    {(row.valor || 0).toLocaleString('pt-BR')}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}