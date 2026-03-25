"use client"

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer,
  ShieldCheck,
  X,
  FileText,
  AlertTriangle,
  QrCode,
  ExternalLink,
  Clock,
  UserCheck,
  XCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Database, Scale, History, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityAuditReport } from "./reports/EntityAuditReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/firebase";
import Image from "next/image";

interface EntityViewDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function EntityViewDialog({ entity, open, onOpenChange, onEdit }: EntityViewDialogProps) {
  const { user } = useUser();
  const [isCensored, setIsCensored] = useState(false);
  const [reportType, setReportType] = useState<'executive' | 'juridico'>('executive');

  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

  const maskDoc = (doc: string | undefined) => {
    if (!doc || !isCensored) return doc || '-';
    return doc.replace(/\d/g, "*");
  };

  const totals = useMemo(() => {
    if (!entity) return { orig: 0, mov: 0, aq: 0, imeiPending: 0, legadoTotal: 0, aposentado: 0, bloqueado: 0, final: 0 };

    const sumVal = (arr?: RegistroTabela[]) => (arr || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);

    // Hybrid Logic: Use table data if present, otherwise use flat fields (Safra 2010 style)
    // CRITICAL: For "Originação" in the summary box, we want the entity's SHARE, not the gross farm total.
    const orig = entity.tabelaOriginacao?.length ? sumVal(entity.tabelaOriginacao) : (entity.saldoParticionado || entity.originacao || 0);
    const mov = entity.tabelaMovimentacao?.length ? (entity.tabelaMovimentacao || []).reduce((acc, curr) => acc + (curr.valor || 0), 0) : Math.abs(entity.movimentacao || 0);
    const aq = entity.tabelaAquisicao?.length ? sumVal(entity.tabelaAquisicao) : (entity.aquisicao || 0);

    const imeiCredits = (entity.tabelaImei || []).reduce((acc, curr) => acc + (curr.valorCredito || 0), 0);
    const imeiDebits = (entity.tabelaImei || []).reduce((acc, curr) => acc + (curr.valorDebito || 0), 0);
    // CRITICAL: "AJUSTE IMEI" in the summary boxes remains 0 until a real audit entry is made (manual edit)
    const imeiPending = imeiDebits - imeiCredits;

    const aposentado = entity.tabelaLegado?.length ? (entity.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0) : (entity.aposentado || 0);
    const bloqueado = entity.tabelaLegado?.length ? (entity.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0) : (entity.bloqueado || 0);
    
    // Legado consolidado
    const legadoTotal = entity.tabelaLegado?.length ? ((entity.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0) + (entity.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0)) : (entity.saldoLegadoTotal || 0);

    // Final Calculation (Assets - Liabilities/Adjustments)
    // Note: In Safra context, final is usually just the saldoParticionado minus any movements.
    const finalCalculated = orig - mov - aposentado - bloqueado - aq;
    const final = entity.ajusteRealizado ? entity.valorAjusteManual || 0 : (entity.tabelaOriginacao?.length ? finalCalculated : (entity.saldoFinalAtual || 0));

    return {
      orig, mov, aq, imeiPending, legadoTotal, aposentado, bloqueado, final
    };
  }, [entity]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

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
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualização de Auditoria - {entity.nome}</DialogTitle>
          <DialogDescription>Modo leitura dos dados técnicos de conformidade.</DialogDescription>
        </DialogHeader>

        {/* PRINTABLE AREA */}
        <EntityAuditReport 
          entity={entity} 
          totals={totals} 
          reportType={reportType} 
          userEmail={user?.email || "SYSTEM_AUDITOR"} 
          isCensored={isCensored}
        />

        {/* CONSOLE UI - INTERFACE DE VISUALIZAÇÃO (HIDDEN EM PRINT) */}
        <div className="flex-1 flex flex-col overflow-hidden print:hidden">
          {/* HEADER DASHBOARD STYLE */}
          <div className="bg-[#0B0F1A] p-10 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-[#10B981]/20 rounded-md flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#10B981]">AUDITORIA TÉCNICA BMV</p>
                </div>
                <h1 className="text-[36px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
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
                </div>
              </div>

              <div className="bg-[#161B2E] border border-white/5 rounded-[2.5rem] p-8 min-w-[360px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 blur-3xl -mr-20 -mt-20"></div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Saldo Final Auditado</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-[52px] font-black text-white tracking-tighter leading-none">{totals.final.toLocaleString('pt-BR')}</span>
                  <span className="text-[14px] font-black text-[#10B981] uppercase tracking-widest">UCS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
              <StatBox label="ORIGINAÇÃO" value={totals.orig} />
              <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative />
              <StatBox label="APOSENTADO" value={totals.aposentado} isNegative />
              <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
              <StatBox label="AQUISIÇÃO" value={totals.aq} isNegative />
              <StatBox label="AJUSTE IMEI" value={totals.imeiPending} isImei />
              <StatBox label="SALDO LEGADO" value={totals.legadoTotal} isAmber />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-10 space-y-14">
              {/* NOVOS DADOS DE SAFRA E ORIGINAÇÃO */}
              <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10">
                <div className="flex items-center gap-2 mb-8">
                  <Database className="w-5 h-5 text-primary" />
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900">DADOS DA SAFRA E ORIGINAÇÃO TÉCNICA</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-8">
                  <DetailItem label="SAFRA" value={entity.safra} />
                  <DetailItem label="PROPRIEDADE" value={entity.propriedade} />
                  <DetailItem label="IDENTIFICADOR (IDF)" value={entity.idf} />
                  <DetailItem label="DATA REGISTRO" value={entity.dataRegistro} />
                  
                  <DetailItem label="ÁREA TOTAL" value={entity.areaTotal ? `${entity.areaTotal.toLocaleString('pt-BR')} ha` : '-'} />
                  <DetailItem label="ÁREA VEGETAÇÃO" value={entity.areaVegetacao ? `${entity.areaVegetacao.toLocaleString('pt-BR')} ha` : '-'} />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordenadas</p>
                    {entity.lat ? (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${String(entity.lat).replace(',', '.')},${String(entity.long).replace(',', '.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[12px] font-bold text-primary hover:text-primary/80 transition-colors group"
                      >
                        <span>{entity.lat}, {entity.long}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Ver no Mapa</span>
                      </a>
                    ) : (
                      <p className="text-[12px] font-bold text-slate-900">-</p>
                    )}
                  </div>
                  <DetailItem label="NÚCLEO" value={entity.nucleo} />
                  
                  <DetailItem 
                    label="ORIGINAÇÃO DA FAZENDA (UCS)" 
                    value={entity.originacao ? entity.originacao.toLocaleString('pt-BR') : '-'} 
                  />
                  <DetailItem label="CÓDIGO ISIN" value={entity.isin} isMono />
                  <DetailItem label="HASH ORIGINAÇÃO" value={entity.hashOriginacao} isMono className="lg:col-span-2" />
                </div>

                <div className="mt-10 pt-10 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
                   {/* links remove navigation for simplicity in this file */}
                </div>
              </div>

              {entity.ajusteRealizado && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] p-10 flex items-start gap-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                    <UserCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <h4 className="text-[13px] font-black uppercase text-emerald-700 tracking-widest">SALDO AJUSTADO POR GOVERNANÇA</h4>
                      <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase px-3 py-1">Consolidado ✓</Badge>
                    </div>
                    <p className="text-[16px] font-black text-slate-900">Volume Validado: {entity.valorAjusteManual?.toLocaleString('pt-BR')} UCS</p>
                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-tight flex gap-6">
                      <span>Autorizador: {entity.usuarioAjuste}</span>
                      <span>Data: {new Date(entity.dataAjuste!).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-[12px] text-slate-600 bg-white/50 p-4 rounded-xl border border-emerald-50 italic leading-relaxed">
                      "{entity.justificativaAjuste}"
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#10B981]" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">APONTAMENTOS DE AUDITORIA</h3>
                  </div>
                  <div className="p-8 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[140px] text-[14px] font-medium text-slate-600 leading-relaxed italic">
                    {entity.observacao || "Nenhum apontamento registrado para este período."}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">STATUS DA CONFORMIDADE</h3>
                  <div className="h-16 flex items-center px-8 bg-slate-50 border border-slate-100 rounded-2xl">
                    {entity.statusAuditoriaSaldo === 'valido' ? (
                      <div className="flex items-center gap-3 text-emerald-600 font-black text-[12px] uppercase tracking-widest">
                        <ShieldCheck className="w-5 h-5" /> SALDO VALIDADO</div>
                    ) : (
                      <div className="flex items-center gap-3 text-rose-500 font-black text-[12px] uppercase tracking-widest">
                        <AlertTriangle className="w-5 h-5" /> DIVERGÊNCIA IDENTIFICADA
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TABELAS EM MODO LEITURA */}
              <div className="space-y-12">
                {(entity.tabelaOriginacao?.length || entity.originacao > 0) && (
                  <ViewSection 
                    title="01. ORIGINAÇÃO" 
                    data={entity.tabelaOriginacao?.length ? entity.tabelaOriginacao : [{ data: entity.dataRegistro, destino: entity.propriedade, valor: (entity.saldoParticionado || entity.originacao), plataforma: 'IMPORTAÇÃO SAFRA' }]} 
                    type="originacao" 
                    total={totals.orig} 
                  />
                )}
                {(entity.tabelaMovimentacao?.length || entity.movimentacao > 0) && (
                  <ViewSection title="02. MOVIMENTAÇÃO" data={entity.tabelaMovimentacao} type="movimentacao" isNegative total={totals.mov} maskFn={maskText} />
                )}
                {(entity.tabelaLegado?.length || entity.saldoLegadoTotal > 0) && (
                  <ViewSection title="03. SALDO LEGADO" data={entity.tabelaLegado} type="legado" isAmber total={totals.legadoTotal} />
                )}
              </div>
            </div>
          </ScrollArea>

          {/* FOOTER MODO LEITURA */}
          <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 no-print">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 px-8 h-14">
              <X className="w-4 h-4 mr-2" /> FECHAR VISUALIZAÇÃO
            </Button>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCensored(!isCensored)} 
                className={cn(
                  "h-14 px-6 rounded-2xl border-slate-200 transition-all font-black uppercase text-[10px] tracking-widest",
                  isCensored ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-slate-50/50 text-slate-500"
                )}
              >
                {isCensored ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {isCensored ? "MODO CENSURA ATIVO" : "CENSURAR DADOS"}
              </Button>
              <Button variant="outline" onClick={handlePrintExecutive} title="Relatório de Auditoria Padrão" className="h-11 px-6 rounded-xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-slate-700 hover:bg-white transition-all shadow-sm">
                <Printer className="w-4 h-4 mr-2" /> EXECUTIVO
              </Button>
              <Button variant="outline" onClick={handlePrintJuridico} title="Relatório Detalhado para Contraprova Jurídica" className="h-11 px-6 rounded-xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-[#734DCC] hover:bg-white transition-all shadow-sm">
                <Scale className="w-4 h-4 mr-2" /> CONTRAPROVA JURÍDICA
              </Button>
              {onEdit && (
                <Button onClick={onEdit} className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95">
                  HABILITAR EDIÇÃO
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAmber, isImei }: any) {
  return (
    <div className={cn(
      "border rounded-[1.25rem] p-4 flex flex-col justify-between h-[90px] transition-all bg-[#161B2E]",
      isAmber ? "border-amber-500/30" : "border-white/5",
      isImei ? "border-indigo-500/30" : ""
    )}>
      <p className={cn(
        "text-[9px] font-black uppercase tracking-[0.15em] leading-none",
        isAmber ? "text-amber-500" : isImei ? "text-indigo-400" : "text-slate-500"
      )}>
        {label}
      </p>
      <p className={cn(
        "text-[18px] font-black font-mono leading-none tracking-tighter",
        isNegative && value !== 0 ? "text-rose-500" :
          isHighlight ? "text-[#10B981]" :
            isAmber ? "text-amber-500" :
              isImei ? "text-indigo-400" :
                "text-white"
      )}>
        {(isNegative && value > 0) ? `-${value.toLocaleString('pt-BR')}` : (value || 0).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function ViewSection({ title, data, type, isNegative, isAmber, isImei, total, maskFn = (t: any) => t || '-' }: any) {
  const isLegado = type === 'legado';
  const isMovimentacao = type === 'movimentacao';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-1.5 h-6 rounded-full",
            isAmber ? "bg-amber-500" : isImei ? "bg-indigo-500" : isNegative ? "bg-rose-500" : "bg-[#10B981]"
          )} />
          <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
          <Badge variant="secondary" className={cn(
            "text-[11px] font-black uppercase rounded-full bg-slate-100 px-3 py-1",
            isAmber ? "text-amber-500" : isImei ? "text-indigo-500" : isNegative ? "text-rose-500" : "text-[#10B981]"
          )}>
            {(total || 0).toLocaleString('pt-BR')} UCS
          </Badge>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="h-12">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-8">REFERÊNCIA</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">HISTÓRICO / PLATAFORMA</TableHead>
              {isMovimentacao && (
                <>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">USUÁRIO DESTINO</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">STATUS PGTO</TableHead>
                </>
              )}
              {isLegado ? (
                <>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary text-right">DISPONÍVEL</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-amber-500 text-right">RESERVADO</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">APOSENTADO</TableHead>
                </>
              ) : (
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">VOLUME (UCS)</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((row: any, i: number) => (
              <TableRow key={i} className="h-12 border-b border-slate-50 last:border-0">
                <TableCell className="pl-8 font-mono text-[11px] text-slate-400">{row.dist || row.data || '-'}</TableCell>
                <TableCell className="font-bold text-[11px] uppercase text-slate-600 truncate max-w-[240px]">
                  <span>{isMovimentacao ? (maskFn(row.nome || row.plataforma)) : (maskFn(row.destino || row.plataforma || row.nome))}</span>
                </TableCell>
                {isMovimentacao && (
                  <TableCell className="font-bold text-[11px] uppercase text-slate-600 truncate max-w-[200px]">{maskFn(row.destino)}</TableCell>
                )}

                {isMovimentacao && (
                  <TableCell className="text-center">
                    <Badge className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 rounded-full border-none flex items-center gap-1.5",
                      row.statusAuditoria === 'Concluido' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {row.statusAuditoria || 'PENDENTE'}
                    </Badge>
                  </TableCell>
                )}

                {isLegado ? (
                  <>
                    <TableCell className="text-right font-mono font-black text-primary">{(row.disponivel || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-mono font-black text-amber-500">{(row.reservado || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-400 pr-8">{(row.aposentado || 0).toLocaleString('pt-BR')}</TableCell>
                  </>
                ) : (
                  <TableCell className={cn("text-right font-mono font-black text-[12px] pr-8", isNegative ? "text-rose-500" : "text-slate-900")}>
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



function DetailItem({ label, value, isMono, className }: { label: string, value: any, isMono?: boolean, className?: string }) {
  if (value === undefined || value === null || value === "") value = "-";
  
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn(
        "text-[12px] font-bold text-slate-900",
        isMono ? "font-mono tracking-tight text-[11px] break-all" : ""
      )}>
        {value}
      </p>
    </div>
  );
}
