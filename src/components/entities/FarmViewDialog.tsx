"use client"

import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer, ShieldCheck, X, FileText, AlertTriangle,
  Building2, Users, PieChart, Info, MapPin, ExternalLink, Calendar, Scale, History, Link2, QrCode, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FarmAuditReport } from "./reports/FarmAuditReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useUser } from "@/firebase";

interface FarmViewDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allData?: EntidadeSaldo[];
}

export function FarmViewDialog({ entity, open, onOpenChange, allData }: FarmViewDialogProps) {
  const { user } = useUser();
  const [reportType, setReportType] = useState<'executive' | 'juridico'>('executive');
  const formatUCS = (val: number | undefined) => (val || 0).toLocaleString('pt-BR');

  // Filtra todos os registros (produtores) que pertencem a esta mesma fazenda
  const participants = useMemo(() => {
    if (!entity || !allData) return [];
    
    const normalize = (s: string | undefined) => (s || "").trim().toLowerCase();
    const entityProp = normalize(entity.propriedade);
    const entityIdf = entity.idf;
    
    // Filtro por Propriedade ou IDF (Inscrição da Fazenda)
    const filtered = allData.filter(e => {
      if (e.safra !== entity.safra) return false;
      
      // Se houver IDF, o match por IDF é o mais seguro
      if (entityIdf && e.idf && entityIdf === e.idf) return true;
      
      // Fallback para nome da propriedade
      return normalize(e.propriedade) === entityProp;
    });

    // Remove duplicados (caso o mesmo produtor apareça duas vezes em documentos diferentes por erro de importação)
    const unique = Array.from(new Map(filtered.map(item => [item.id, item])).values());
    
    return unique;
  }, [entity, allData]);

  // Totais da Fazenda (Global Wallet)
  const farmTotals = useMemo(() => {
    const defaultData = { 
      totalOrig: 0, totalMov: 0, totalFinal: 0, totalAssoc: 0, totalImei: 0, totalProdutores: 0, diff: 0,
      imeiCnpj: "-", imeiParticionamento: 0, associacaoCnpj: "-", associacaoParticionamento: 0 
    };

    if (participants.length === 0) return defaultData;
    
    // Farm total: use originacaoFazendaTotal if available, otherwise fall back to originacao
    const totalOrig = participants[0]?.originacaoFazendaTotal || participants[0]?.originacao || 0;
    const totalMov = participants.reduce((sum, p) => sum + (p.movimentacao || 0), 0);

    // Dados consolidados (pegamos de qualquer registro que tenha preenchido)
    const imeiCnpj = participants.find(p => p.imeiCnpj)?.imeiCnpj || "-";
    const imeiParticionamento = participants.find(p => p.imeiParticionamento)?.imeiParticionamento || 0;
    const associacaoCnpj = participants.find(p => p.associacaoCnpj)?.associacaoCnpj || "-";
    const associacaoParticionamento = participants.find(p => p.associacaoParticionamento)?.associacaoParticionamento || 0;

    // RECALCULATE partitioned values from percentages instead of trusting stored values
    // Produtor: use saldoParticionado if it looks correct, otherwise recalculate from percentage
    const totalProdutores = participants.reduce((sum, p) => {
      if (p.particionamento && p.particionamento > 0) {
        return sum + Math.round(totalOrig * (p.particionamento / 100));
      }
      return sum + (p.saldoParticionado || p.originacao || 0);
    }, 0);

    // Associação: recalculate from farm total × percentage
    const totalAssoc = associacaoParticionamento > 0 
      ? Math.round(totalOrig * (associacaoParticionamento / 100))
      : participants.reduce((sum, p) => sum + (p.associacaoSaldo || 0), 0);
    
    // IMEI: recalculate from farm total × percentage  
    const totalImei = imeiParticionamento > 0
      ? Math.round(totalOrig * (imeiParticionamento / 100))
      : participants.reduce((sum, p) => sum + (p.imeiSaldo || 0), 0);
    
    const diff = totalOrig - (totalProdutores + totalAssoc + totalImei);

    const totalFinal = participants.reduce((sum, p) => sum + (p.saldoFinalAtual || 0), 0);
    
    return { 
      totalOrig, totalMov, totalFinal, totalAssoc, totalImei, totalProdutores, diff, 
      imeiCnpj, imeiParticionamento, associacaoCnpj, associacaoParticionamento 
    };
  }, [participants]);

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  const handlePrintExecutive = () => {
    setReportType('executive');
    setTimeout(() => handlePrint(), 500);
  };

  const handlePrintJuridico = () => {
    setReportType('juridico');
    setTimeout(() => handlePrint(), 500);
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[90vw] h-[90vh] max-h-[90vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualização da Fazenda - {entity.propriedade}</DialogTitle>
          <DialogDescription>Detalhes da carteira da fazenda e particionamento entre produtores.</DialogDescription>
        </DialogHeader>

        {/* HEADER DA FAZENDA */}
        <div className="bg-[#0F172A] p-8 pb-10 shrink-0 text-white relative flex-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl -mr-32 -mt-32 rounded-full"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Carteira · Fazenda</p>
                  <h1 className="text-[26px] font-black tracking-tight uppercase leading-tight font-headline">
                    {entity.propriedade || "Sem Nome"}
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase">Safra {entity.safra}</span>
                 </div>
                 {entity.idf && (
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                       <Info className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-[11px] font-bold text-slate-300 uppercase font-mono">IDF: {entity.idf}</span>
                    </div>
                 )}
              </div>
            </div>

            <div className="text-right">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Total da Safra (Original)</p>
               <div className="flex items-baseline justify-end gap-2">
                  <span className="text-[42px] font-black text-primary tracking-tighter leading-none">
                    {formatUCS(farmTotals.totalOrig)}
                  </span>
                  <span className="text-[14px] font-black text-slate-400 uppercase">UCS</span>
               </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white relative z-20 print:hidden">
          <div className="p-8 pt-10 space-y-10">
            {/* GRID DE DETALHES TÉCNICOS DA FAZENDA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
               <div className="space-y-1">
                 <div className="flex items-center gap-1.5">
                   <Calendar className="w-3 h-3 text-slate-400" />
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Registro Safra</p>
                 </div>
                 <p className="text-[11px] font-bold text-slate-900">{entity.dataRegistro || "-"}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Área Total (HA)</p>
                 <p className="text-[11px] font-bold text-slate-900">{entity.areaTotal?.toLocaleString('pt-BR') || "-"}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                 <p className="text-[11px] font-bold text-slate-900">
                   {(entity.lat && entity.long) ? (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${entity.lat.replace(',', '.')},${entity.long.replace(',', '.')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {entity.lat}, {entity.long}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                   ) : "-"}
                 </p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Núcleo / Região</p>
                 <p className="text-[11px] font-bold text-slate-900">{entity.nucleo || "-"}</p>
               </div>
            </div>

            {/* SEÇÃO DE PARTICIONAMENTO (PRODUTORES) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <PieChart className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 font-headline">Participantes e Particionamento</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Distribuição do saldo entre os detentores da fazenda.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-transparent border-b border-slate-100 h-12">
                      <TableHead className="text-[9px] font-black uppercase tracking-widest pl-6">Usuário Destino</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest">Documento</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Proporção (%)</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Saldo (UCS)</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-center pr-6 w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((p) => (
                      <TableRow key={p.id} className="h-14 hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 font-medium">
                        <TableCell className="pl-6 font-bold text-[11px] text-slate-900 uppercase">{p.nome}</TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-400 tracking-tighter">{p.documento}</TableCell>
                        <TableCell className="text-center font-black text-[11px] text-emerald-600">
                          {p.particionamento ? `${p.particionamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-black text-[11px] text-primary">
                          {formatUCS(
                            p.particionamento && p.particionamento > 0
                              ? Math.round(farmTotals.totalOrig * (p.particionamento / 100))
                              : (p.saldoParticionado || p.saldoFinalAtual)
                          )} UCS
                        </TableCell>
                        <TableCell className="pr-6 text-center">
                          {p.saldoParticionado && p.saldoParticionado > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase rounded-full px-4 py-1">CONCLUÍDO</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-300 border-slate-100 text-[8px] font-black uppercase rounded-full">PENDENTE</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* LINHAS DE RETENÇÃO (ASSOCIAÇÃO E IMEI) */}
                    {(farmTotals.totalAssoc > 0) && (
                      <TableRow className="h-14 bg-amber-50/20 border-b border-amber-100/50">
                        <TableCell className="pl-6 font-black text-[11px] text-amber-700 uppercase">
                          ({participants[0]?.associacaoNome || 'NÚCLEO'})
                        </TableCell>
                        <TableCell className="text-amber-600 font-mono text-[10px]">{farmTotals.associacaoCnpj}</TableCell>
                        <TableCell className="text-center font-black text-[11px] text-amber-600">
                          {farmTotals.associacaoParticionamento > 0 ? `${farmTotals.associacaoParticionamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-black text-[11px] text-amber-800">
                          {formatUCS(farmTotals.totalAssoc)} UCS
                        </TableCell>
                        <TableCell className="pr-6 text-center">
                          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase rounded-full px-4 py-1">CONCLUÍDO</Badge>
                        </TableCell>
                      </TableRow>
                    )}

                    {(farmTotals.totalImei > 0) && (
                      <TableRow className="h-14 bg-indigo-50/20 border-b border-indigo-100/50">
                        <TableCell className="pl-6 font-black text-[11px] text-indigo-700 uppercase">
                          IMEI (PLATAFORMA)
                        </TableCell>
                        <TableCell className="text-indigo-600 font-mono text-[10px]">{farmTotals.imeiCnpj}</TableCell>
                        <TableCell className="text-center font-black text-[11px] text-indigo-600">
                          {farmTotals.imeiParticionamento > 0 ? `${farmTotals.imeiParticionamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-black text-[11px] text-indigo-800">
                          {formatUCS(farmTotals.totalImei)} UCS
                        </TableCell>
                        <TableCell className="pr-6 text-center">
                          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase rounded-full px-4 py-1">CONCLUÍDO</Badge>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-10 px-8 py-6 rounded-2xl bg-slate-50 border border-slate-100">
                 <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Alocado</p>
                    <p className="text-[12px] font-black text-slate-900">{formatUCS(farmTotals.totalProdutores + farmTotals.totalAssoc + farmTotals.totalImei)} UCS</p>
                 </div>
                 <div className="text-right border-l border-slate-200 pl-10">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest underline underline-offset-4 decoration-primary/30">Diferença de Wallet</p>
                    <p className={cn(
                      "text-[12px] font-black",
                      farmTotals.diff !== 0 ? "text-rose-500" : "text-slate-400"
                    )}>
                      {formatUCS(farmTotals.diff)} UCS
                    </p>
                 </div>
              </div>
            </div>

            {/* SEÇÃO: APONTAMENTOS DE AUDITORIA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Observações de Auditoria Global</h3>
              </div>
              <div className="p-6 bg-slate-50/30 rounded-2xl border border-slate-100 text-[12px] text-slate-500 font-medium italic min-h-[80px]">
                {entity.observacaoFazenda || "Nenhuma observação global registrada para esta propriedade."}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 no-print transition-all">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 px-6 h-11">
            <X className="w-4 h-4 mr-2" /> Fechar Visualização
          </Button>
          <div className="flex gap-3">
             <Button variant="outline" onClick={handlePrintExecutive} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
                <Printer className="w-4 h-4" /> EXECUTIVO
             </Button>
             <Button variant="outline" onClick={handlePrintJuridico} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 bg-slate-50 text-[#734DCC] hover:bg-slate-100 border-slate-200">
                <Scale className="w-4 h-4" /> JURÍDICO
             </Button>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <FarmAuditReport 
          entity={entity} 
          participants={participants} 
          farmTotals={farmTotals} 
          reportType={reportType} 
          userEmail={user?.email || "SYSTEM_AUDITOR"} 
        />
      </DialogContent>
    </Dialog>
  );
}
