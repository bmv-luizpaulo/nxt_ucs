"use client"

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, ShieldCheck, AlertTriangle, Users, ExternalLink,
  Landmark, Building2, Eye, EyeOff, Printer, Scale, QrCode, Database, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { getLinkWithFilter } from "./EntityFilters";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { EntityAuditReport } from "./reports/EntityAuditReport";

interface NucleoViewDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allData?: EntidadeSaldo[];
}

export function NucleoViewDialog({ entity, open, onOpenChange, allData }: NucleoViewDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isCensored, setIsCensored] = useState(false);
  const [reportType, setReportType] = useState<'executive' | 'juridico'>('executive');

  // Consulta DIRETA ao banco para garantir precisão de auditoria (todos os produtores do núcleo)
  const linkedQuery = useMemoFirebase(() => {
    if (!firestore || !entity || !open) return null;
    const nucleoName = entity.nucleo || entity.associacaoNome;
    if (!nucleoName) return null;
    
    // Tenta buscar por núcleo ou nome da associação
    return query(
      collection(firestore, "produtores"),
      where("nucleo", "==", nucleoName)
    );
  }, [firestore, entity, open]);

  const { data: dbLinked, isLoading: isFetching } = useCollection<EntidadeSaldo>(linkedQuery);

  const linkedProducers = useMemo(() => {
    if (isFetching) return [];
    if (dbLinked && dbLinked.length > 0) return dbLinked;
    
    // Fallback para dados locais
    if (!entity || !allData) return [entity].filter(Boolean) as EntidadeSaldo[];
    const nucleoName = entity.nucleo || entity.associacaoNome;
    return allData.filter(e => e.nucleo === nucleoName || e.associacaoNome === nucleoName);
  }, [dbLinked, isFetching, entity, allData]);

  // Consolidação
  const stats = useMemo(() => {
    const uniqueProducers = new Set(linkedProducers.map((p: EntidadeSaldo) => p.documento)).size;
    const uniqueFarms = new Set(linkedProducers.map((p: EntidadeSaldo) => p.propriedade || p.idf)).size;
    const totalOriginacao = linkedProducers.reduce((s: number, p: EntidadeSaldo) => s + (p.originacaoFazendaTotal || p.originacao || 0), 0);
    const totalSaldoAssoc = linkedProducers.reduce((s: number, p: EntidadeSaldo) => s + (p.associacaoSaldo || 0), 0);
    const totalSaldoProd = linkedProducers.reduce((s: number, p: EntidadeSaldo) => s + (p.saldoFinalAtual || 0), 0);
    const avgPart = linkedProducers.length > 0 
      ? linkedProducers.reduce((s: number, p: EntidadeSaldo) => s + (p.associacaoParticionamento || 0), 0) / linkedProducers.length 
      : 0;
      
    return { uniqueProducers, uniqueFarms, totalOriginacao, totalSaldoAssoc, totalSaldoProd, avgPart };
  }, [linkedProducers]);

  const formatUCS = (val: number | undefined) => (val || 0).toLocaleString('pt-BR');
  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };
  const handlePrintExecutive = () => { setReportType('executive'); setTimeout(() => handlePrint(), 500); };
  const handlePrintJuridico = () => { setReportType('juridico'); setTimeout(() => handlePrint(), 500); };

  const aggregatedEntity = useMemo(() => {
    if (!entity) return null;
    return {
      ...entity,
      tabelaOriginacao: linkedProducers.length > 0 ? linkedProducers.map(p => ({
        id: p.id,
        data: p.safra || "-",
        plataforma: p.nome || "PRODUTOR",
        valor: p.associacaoSaldo || 0,
        dist: "PARTICIONAMENTO"
      })) : (entity.tabelaOriginacao || []),
      tabelaMovimentacao: linkedProducers.flatMap(p => p.tabelaMovimentacao || []),
      tabelaAquisicao: linkedProducers.flatMap(p => p.tabelaAquisicao || []),
      tabelaImei: linkedProducers.flatMap(p => p.tabelaImei || []),
      tabelaLegado: linkedProducers.flatMap(p => p.tabelaLegado || []),
    } as EntidadeSaldo;
  }, [entity, linkedProducers]);

  const reportTotals = useMemo(() => ({
    origProdutor: stats.totalSaldoProd,
    origFazenda: stats.totalOriginacao,
    mov: linkedProducers.reduce((sum, p) => sum + (p.movimentacao || 0), 0),
    aq: linkedProducers.reduce((sum, p) => sum + (p.aquisicao || 0), 0),
    imeiPending: linkedProducers.reduce((sum, p) => sum + (p.imeiSaldo || 0), 0),
    legadoTotal: 0,
    aposentado: linkedProducers.reduce((sum, p) => sum + (p.aposentado || 0), 0),
    bloqueado: linkedProducers.reduce((sum, p) => sum + (p.bloqueado || 0), 0),
    final: stats.totalSaldoAssoc
  }), [stats, linkedProducers]);

  if (!entity) return null;

  const nucleoName = entity.nucleo || entity.associacaoNome || 'Sem Nome';
  const assocName = entity.associacaoNome || '';
  const assocCnpj = entity.associacaoCnpj || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualização do Núcleo - {nucleoName}</DialogTitle>
          <DialogDescription>Visão consolidada dos produtores vinculados ao núcleo/associação.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden print:hidden">
          {/* HEADER — Amber theme */}
          <div className="bg-[#0B0F1A] p-10 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-amber-500/20 rounded-md flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500">Auditoria de Precisão · Núcleo</p>
                </div>
                <h1 className="text-[32px] font-black tracking-tight uppercase leading-none font-headline">{nucleoName}</h1>
                <div className="flex items-center gap-4">
                  {assocCnpj && <p className="text-[14px] font-bold text-slate-500 font-mono tracking-widest">{maskText(assocCnpj)}</p>}
                  {isFetching && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando Membros...
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#161B2E] border border-amber-500/20 rounded-[2.5rem] p-8 min-w-[360px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl -mr-20 -mt-20"></div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Saldo Total Associação (Banco)</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-[48px] font-black text-white tracking-tighter leading-none font-headline font-mono">{formatUCS(stats.totalSaldoAssoc)}</span>
                  <span className="text-[14px] font-black text-amber-500 uppercase tracking-widest">UCS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="border border-white/5 rounded-[1rem] p-4 bg-[#161B2E] flex flex-col justify-between h-[80px]">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Membros Ativos</p>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <p className="text-[20px] font-black text-white tracking-tighter font-mono">{stats.uniqueProducers}</p>
                </div>
              </div>
              <div className="border border-white/5 rounded-[1rem] p-4 bg-[#161B2E] flex flex-col justify-between h-[80px]">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Fazendas Vinculadas</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-400" />
                  <p className="text-[20px] font-black text-white tracking-tighter font-mono">{stats.uniqueFarms}</p>
                </div>
              </div>
              <div className="border border-white/5 rounded-[1rem] p-4 bg-[#161B2E] flex flex-col justify-between h-[80px]">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-teal-400">UCS Originação Bruta</p>
                <p className="text-[18px] font-black text-white tracking-tighter font-mono">{formatUCS(stats.totalOriginacao)}</p>
              </div>
              <div className="border border-amber-500/20 rounded-[1rem] p-4 bg-[#161B2E] flex flex-col justify-between h-[80px]">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-500">Part. Médio Núcleo</p>
                <p className="text-[18px] font-black text-amber-500 tracking-tighter font-mono">{stats.avgPart.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-10 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-amber-500" />
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 font-headline">Membros do Núcleo / Associação</h3>
                  <Badge variant="secondary" className="text-[10px] font-black uppercase rounded-full bg-amber-50 text-amber-600 px-3 py-1">
                    {linkedProducers.length} Registros Consolidados
                  </Badge>
                </div>

                <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="h-12">
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-6">Produtor</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Documento</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Propriedade</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Safra</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Originação</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Quota Assoc.</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-amber-600 text-right pr-6">Saldo Associação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedProducers.map((p) => (
                        <TableRow key={p.id} className="h-12 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors">
                          <TableCell className="pl-6 font-black text-[10px] uppercase text-slate-900 truncate max-w-[180px]">{maskText(p.nome)}</TableCell>
                          <TableCell className="font-mono text-[10px] text-slate-400">{maskText(p.documento)}</TableCell>
                          <TableCell className="text-[10px] text-slate-600 truncate max-w-[120px]">{p.propriedade || '—'}</TableCell>
                          <TableCell className="text-center text-[10px] font-bold text-primary">{p.safra}</TableCell>
                          <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatUCS(p.originacao)}</TableCell>
                          <TableCell className="text-right font-mono text-[10px] text-slate-500">{(p.associacaoParticionamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</TableCell>
                          <TableCell className="text-right font-mono text-[11px] font-black text-amber-600 pr-6">{formatUCS(p.associacaoSaldo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-amber-50/30 border border-amber-100 rounded-[2rem] p-8">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-6 font-headline">Balanço do Núcleo (Dados do Banco)</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-amber-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Originação Total Base</p>
                    <p className="text-[22px] font-black text-slate-900 font-headline">{formatUCS(stats.totalOriginacao)}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest mt-1">UCS BRUTOS</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-primary/20 text-center">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">Saldo Total Produtores</p>
                    <p className="text-[22px] font-black text-primary font-headline">{formatUCS(stats.totalSaldoProd)}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest mt-1">UCS PARTICIONADOS</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-amber-300 text-center">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Saldo sob Governança</p>
                    <p className="text-[22px] font-black text-amber-600 font-headline">{formatUCS(stats.totalSaldoAssoc)}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest mt-1">UCS PARTICIONADOS</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

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
            </div>
          </div>
        </div>

        {/* ÁREA DE IMPRESSÃO (UNIFIED REPORT) */}
        {aggregatedEntity && (
          <EntityAuditReport
            entity={aggregatedEntity}
            totals={reportTotals as any}
            reportType={reportType}
            userEmail={user?.email || "SYSTEM_AUDITOR"}
            isCensored={isCensored}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}