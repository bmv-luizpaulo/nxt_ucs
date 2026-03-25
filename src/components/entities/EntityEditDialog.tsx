"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela, AuditoriaStatus, EntityStatus } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Database as DatabaseIcon,
  Printer, 
  Calculator, 
  ShieldCheck, 
  Save, 
  MessageSquare,
  QrCode,
  Plus, 
  Trash2, 
  ExternalLink,
  AlertTriangle,
  History,
  Scale,
  FileText,
  MapPin,
  Link2,
  Lock as LockIcon,
  UserCheck,
  Ban,
  UserX,
  UserCheck2,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/firebase";
import Image from "next/image";

interface EntityEditDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityEditDialog({ entity, open, onOpenChange, onUpdate }: EntityEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [pasteData, setPasteData] = useState<{ section: string; raw: string } | null>(null);
  const [isAddingAq, setIsAddingAq] = useState(false);
  const [isAjustando, setIsAjustando] = useState(false);
  const [newAq, setNewAq] = useState({ data: new Date().getFullYear().toString(), valor: "" });
  const [ajusteData, setAjusteData] = useState({ valor: "", justificativa: "" });
  const [reportType, setReportType] = useState<'executive' | 'juridico'>('executive');
  
  const { user } = useUser();
  const [isCensored, setIsCensored] = useState(false);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

  const maskDoc = (doc: string | undefined) => {
    if (!doc || !isCensored) return doc || '-';
    return doc.replace(/\d/g, "*");
  };
  
  useEffect(() => {
    if (entity) {
      const data = { ...entity };
      // The farm total is stored in originacaoFazendaTotal, or falls back to originacao
      const farmTotal = data.originacaoFazendaTotal || data.originacao || 0;
      
      // Ensure originacao reflects the farm total for the UI
      if (!data.originacaoFazendaTotal && data.originacao) {
        data.originacaoFazendaTotal = data.originacao;
      }
      
      // Auto-recalculate partitioned balances based on the FARM TOTAL
      if (data.particionamento && data.particionamento > 0) {
        data.saldoParticionado = Math.round(farmTotal * (data.particionamento / 100));
      }
      if (data.associacaoParticionamento && data.associacaoParticionamento > 0) {
        data.associacaoSaldo = Math.round(farmTotal * (data.associacaoParticionamento / 100));
      }
      if (data.imeiParticionamento && data.imeiParticionamento > 0) {
        data.imeiSaldo = Math.round(farmTotal * (data.imeiParticionamento / 100));
      }

      setFormData(data);
      // Reset auto-sync flag when a new entity is loaded
      setHasAutoSynced(false);
    }
  }, [entity]);

  // Auto-sync table if empty but has summary balance
  useEffect(() => {
    if (open && formData.saldoParticionado && (!formData.tabelaOriginacao || formData.tabelaOriginacao.length === 0) && !hasAutoSynced) {
      const autoRecord: RegistroTabela = {
        id: "auto-orig-" + Math.random().toString(36).substr(2, 9),
        data: new Date().getFullYear().toString(),
        plataforma: "SALDO DECLARADO (CONSOLIDADO)",
        valor: formData.saldoParticionado,
        dist: "AUDITORIA",
      };
      setFormData(prev => ({ ...prev, tabelaOriginacao: [autoRecord] }));
      setHasAutoSynced(true);
    }
  }, [open, formData.saldoParticionado, formData.tabelaOriginacao, hasAutoSynced]);

  useEffect(() => {
    const hasUnpaid = (formData.tabelaMovimentacao || []).some(m => m.statusAuditoria === 'Cancelado');
    if (hasUnpaid && formData.statusAuditoriaSaldo !== 'inconsistente') {
      setFormData(prev => ({ ...prev, statusAuditoriaSaldo: 'inconsistente' }));
    }
  }, [formData.tabelaMovimentacao, formData.statusAuditoriaSaldo]);

  const totals = useMemo(() => {
    const sumVal = (arr?: RegistroTabela[]) => (arr || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    // Current table sum (always considered as PRODUCER share in Section 01)
    const hasTableOrig = formData.tabelaOriginacao && formData.tabelaOriginacao.length > 0;
    const tableOrigSum = hasTableOrig ? sumVal(formData.tabelaOriginacao) : 0;

    // 1. Producer Origination: Table takes priority over the consolidated saldoParticionado
    const origProdutor = hasTableOrig ? tableOrigSum : (formData.saldoParticionado || 0);

    // 2. Farm Origination: Informational view of the total 100% volume
    // If we have table data, we project back to 100% using the partition. Otherwise use the field.
    const origFazenda = (hasTableOrig && formData.particionamento && formData.particionamento > 0)
      ? Math.round(tableOrigSum / (formData.particionamento / 100))
      : (formData.originacao || 0);

    const mov = (formData.tabelaMovimentacao && formData.tabelaMovimentacao.length > 0) 
      ? (formData.tabelaMovimentacao || []).reduce((acc, curr) => acc + (curr.valor || 0), 0)
      : (formData.movimentacao || 0);

    const aq = (formData.tabelaAquisicao && formData.tabelaAquisicao.length > 0) 
      ? sumVal(formData.tabelaAquisicao) 
      : (formData.aquisicao || 0);
    
    const imeiCredits = (formData.tabelaImei || []).reduce((acc, curr) => acc + (curr.valorCredito || 0), 0);
    const imeiDebits = (formData.tabelaImei || []).reduce((acc, curr) => acc + (curr.valorDebito || 0), 0);
    const imeiPending = (formData.tabelaImei && formData.tabelaImei.length > 0) 
      ? imeiDebits - imeiCredits 
      : (formData.saldoAjustarImei || 0);

    const aposentado = (formData.tabelaLegado && formData.tabelaLegado.length > 0) 
      ? (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0)
      : (formData.aposentado || 0);

    const bloqueado = (formData.tabelaLegado && formData.tabelaLegado.length > 0) 
      ? (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0)
      : (formData.bloqueado || 0);

    const legDisp = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const legRes = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0);
    const legadoTotal = (formData.tabelaLegado && formData.tabelaLegado.length > 0) 
      ? (legDisp + legRes)
      : (formData.saldoLegadoTotal || 0);

    // Final calculation always uses PRODUCER origination
    const finalCalculated = origProdutor - mov - aposentado - bloqueado - aq;
    const final = formData.ajusteRealizado ? (formData.valorAjusteManual || 0) : finalCalculated;

    return { 
      origFazenda, origProdutor, mov, aq, imeiPending, legadoTotal, aposentado, bloqueado, final
    };
  }, [formData]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handlePrintExecutive = () => {
    setReportType('executive');
    setTimeout(() => handlePrint(), 50);
  };

  const handlePrintJuridico = () => {
    setReportType('juridico');
    setTimeout(() => handlePrint(), 50);
  };

  const handleSave = () => {
    if (!entity) return;
    onUpdate(entity.id, {
      ...formData,
      // Keep originacao as the farm total, NOT the producer share
      originacao: formData.originacao || totals.origFazenda,
      originacaoFazendaTotal: formData.originacao || totals.origFazenda,
      // The producer's partitioned share
      saldoParticionado: totals.origProdutor,
      movimentacao: totals.mov,
      aquisicao: totals.aq,
      saldoAjustarImei: totals.imeiPending,
      saldoLegadoTotal: totals.legadoTotal,
      aposentado: totals.aposentado,
      bloqueado: totals.bloqueado,
      saldoFinalAtual: totals.final
    });
    onOpenChange(false);
  };

  const handleConfirmAjuste = () => {
    if (!ajusteData.valor || !ajusteData.justificativa || !user) return;
    
    setFormData({
      ...formData,
      ajusteRealizado: true,
      valorAjusteManual: parseInt(ajusteData.valor),
      justificativaAjuste: ajusteData.justificativa,
      usuarioAjuste: user.email || "AUDITOR",
      dataAjuste: new Date().toISOString(),
      statusAuditoriaSaldo: 'valido'
    });
    
    setIsAjustando(false);
    setAjusteData({ valor: "", justificativa: "" });
  };

  const handleRemoveAjuste = () => {
    setFormData({
      ...formData,
      ajusteRealizado: false,
      valorAjusteManual: undefined,
      justificativaAjuste: undefined,
      usuarioAjuste: undefined,
      dataAjuste: undefined
    });
  };

  const handleAddAquisicao = () => {
    if (!newAq.data || !newAq.valor) return;
    const item = {
      id: `AQ-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      data: newAq.data,
      destino: "AQUISIÇÃO MANUAL",
      valor: parseInt(newAq.valor) || 0
    };
    setFormData({
      ...formData,
      tabelaAquisicao: [...(formData.tabelaAquisicao || []), item]
    });
    setNewAq({ data: new Date().getFullYear().toString(), valor: "" });
    setIsAddingAq(false);
  };

  const handleUpdateItem = (section: string, id: string, updates: Partial<RegistroTabela>) => {
    const list = (formData[section as keyof EntidadeSaldo] as any[] || []).map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    setFormData({ ...formData, [section]: list });
  };

  const handleRemoveItem = (section: string, id: string) => {
    const list = (formData[section as keyof EntidadeSaldo] as any[] || []).filter(i => i.id !== id);
    setFormData({ ...formData, [section]: list });
  };

  const handleProcessPaste = () => {
    if (!pasteData) return;
    const lines = pasteData.raw.split('\n').filter(l => l.trim());
    
    const newRows: RegistroTabela[] = lines.map(line => {
      const parts = line.split('\t');
      const parseVal = (str: string | undefined) => {
        if (!str || !str.trim()) return 0;
        return parseInt(str.replace(/\./g, '').replace(/[^\d-]/g, '')) || 0;
      };

      const cleanData = (str: string | undefined) => {
        if (!str) return '';
        // If it's a full ISO or date/time string, take only the date part
        if (str.includes(' ')) return str.split(' ')[0];
        return str.trim();
      };

      switch (pasteData.section) {
        case 'tabelaLegado':
          return {
            id: `LEG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            data: cleanData(parts[1]),
            plataforma: parts[0]?.trim() || '',
            disponivel: parseVal(parts[4]),
            reservado: parseVal(parts[5]),
            bloqueado: parseVal(parts[6]),
            aposentado: parseVal(parts[7]),
          };
        case 'tabelaImei':
          const credImei = parseVal(parts[parts.length - 2]);
          const debImei = parseVal(parts[parts.length - 1]);
          return { 
            id: `IMEI-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: cleanData(parts[1]), 
            plataforma: parts[2]?.trim() || '', 
            valorCredito: credImei, 
            valorDebito: debImei, 
            valor: debImei - credImei
          };
        case 'tabelaOriginacao':
          return { 
            id: `ORIG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: cleanData(parts[1]), 
            plataforma: parts[2]?.trim() || '', // Use parts[2] as plataforma/nome
            valor: parseVal(parts[parts.length - 1]) 
          };
        default: // tabelaMovimentacao
          // Smart Scanning for complex Ledger formats
          let valor = 0;
          let statusAuditoria: AuditoriaStatus = 'Pendente';
          let linkComprovante = "";
          let linkNxt = "";
          let foundValor = false;

          // Scan columns starting from 2 to find specialized data
          parts.forEach((p, idx) => {
            const val = p.trim();
            if (!val) return;

            // 1. Find Volume (first number found after the initial identification columns)
            if (!foundValor && idx >= 4) {
              const parsed = parseVal(val);
              if (parsed > 0) {
                valor = parsed;
                foundValor = true;
                return;
              }
            }

            // 2. Find Status
            if (val.toLowerCase() === 'pago') {
              statusAuditoria = 'Concluido';
            }

            // 3. Find Links (Google Drive vs NXT)
            if (val.startsWith('http')) {
              if (val.includes('drive.google.com') || val.includes('docs.google.com')) {
                linkComprovante = val;
              } else if (val.includes('nxtportal.org')) {
                linkNxt = val;
              } else if (!linkComprovante) {
                linkComprovante = val;
              } else {
                linkNxt = val;
              }
            }
          });

          return { 
            id: `MOV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: cleanData(parts[1]), 
            plataforma: parts[2]?.trim() || '', 
            destino: parts[3]?.trim() || '', 
            valor: valor || parseVal(parts[parts.length - 1]),
            statusAuditoria,
            linkComprovante,
            linkNxt
          };
      }
    });

    setFormData({ 
      ...formData, 
      [pasteData.section]: [...(formData[pasteData.section as keyof EntidadeSaldo] as any[] || []), ...newRows] 
    });
    setPasteData(null);
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1700px] w-[98vw] max-h-[95vh] h-full p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl transition-all">
        <DialogHeader className="sr-only">
          <DialogTitle>Console de Auditoria de Saldo - {entity.nome}</DialogTitle>
          <DialogDescription>Detalhamento técnico de conformidade e auditoria de UCS.</DialogDescription>
        </DialogHeader>

        {/* RELATÓRIO EXECUTIVO A4 PRINT */}
        <div className="printable-audit-report hidden print:block bg-white text-slate-900 p-0 font-sans">
          {reportType === 'executive' ? (
            <>
              {/* TOP STATUS RIBBON */}
              <div className={cn(
                "w-full h-8 flex items-center justify-center text-white text-[9px] font-black uppercase tracking-[0.3em] mb-6",
                formData.statusAuditoriaSaldo === 'valido' ? "bg-emerald-600" : "bg-rose-600"
              )}>
                {formData.statusAuditoriaSaldo === 'valido' ? "CERTIFICADO DE CONFORMIDADE DE SALDO ✓" : "DIVERGÊNCIA IDENTIFICADA EM AUDITORIA ⚠"}
              </div>

              <div className="px-10">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
                  <div className="flex items-center gap-0">
                     <div className="relative w-16 h-16">
                       <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
                     </div>
                     <div className="flex flex-col -ml-2">
                       <span className="text-[36px] font-black text-amber-500 leading-none tracking-tighter">bmv</span>
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Global Standard</span>
                     </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-[16px] font-black uppercase tracking-tight leading-tight text-slate-900">RELATÓRIO EXECUTIVO DE AUDITORIA</h2>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">PROTOCOLO:</p>
                      <p className="text-[9px] font-mono font-bold text-slate-900 uppercase tracking-tighter">{entity.id}</p>
                    </div>
                    <p className="text-[7px] text-slate-400 font-bold mt-1 uppercase">EMISSÃO: {new Date().toLocaleString("pt-BR")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-10">
                  <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1.5 tracking-[0.2em]">IDENTIFICAÇÃO DO ATIVO</h3>
                    <div className="space-y-3">
                      <p className="text-[22px] font-black text-slate-900 leading-none tracking-tighter uppercase">{entity.nome}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                        <div className="space-y-0.5">
                          <p className="text-slate-400 font-black text-[6px] uppercase tracking-widest">Documento</p>
                          <p className="text-[10px] font-bold text-slate-900 uppercase truncate">{entity.documento}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-slate-400 font-black text-[6px] uppercase tracking-widest">Safra Registro</p>
                          <p className="text-[10px] font-bold text-slate-900 uppercase">{entity.safra}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-slate-400 font-black text-[6px] uppercase tracking-widest">Propriedade</p>
                          <p className="text-[10px] font-bold text-slate-900 uppercase truncate">{entity.propriedade || '-'}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-slate-400 font-black text-[6px] uppercase tracking-widest">Localização</p>
                          <p className="text-[10px] font-bold text-slate-900 uppercase">{entity.nucleo || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">SUMÁRIO DE SALDOS AUDITADOS</h3>
                      <div className="flex justify-between items-end mb-4">
                        <div className="space-y-1">
                          <p className="text-slate-400 font-black text-[6px] uppercase tracking-widest">Originação Fazenda</p>
                          <p className="text-[18px] font-black text-slate-900 leading-none font-mono">{(totals.origFazenda || 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-slate-400 font-black text-[6px] uppercase tracking-widest">Participação Prod.</p>
                          <p className="text-[18px] font-black text-amber-600 leading-none font-mono">{entity.particionamento || 0}%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-primary font-black text-[7px] uppercase tracking-widest mb-1">SALDO FINAL DISPONÍVEL</p>
                          <p className="text-[28px] font-black text-primary leading-none tracking-tighter">
                            {(totals.final || 0).toLocaleString('pt-BR')} <span className="text-[12px] font-black text-primary/50">UCS</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-20 grayscale">
                           <QrCode className="w-12 h-12 text-slate-900" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.ajusteRealizado && (
                   <div className="mb-10 bg-indigo-50/30 border-2 border-dashed border-indigo-100 p-6 rounded-2xl">
                     <h3 className="text-[9px] font-black text-indigo-600 uppercase mb-3 tracking-[0.2em] flex items-center gap-2">
                       <ShieldCheck className="w-3.5 h-3.5" /> AJUSTE DE GOVERNANÇA MANUAL APLICADO
                     </h3>
                     <div className="grid grid-cols-4 gap-4 text-[9px] font-bold uppercase">
                       <div className="space-y-1">
                          <p className="text-indigo-400 text-[6px] font-black">Saldo Ajustado</p>
                          <p className="text-slate-900 text-[11px] font-black">{(formData.valorAjusteManual || 0).toLocaleString('pt-BR')} UCS</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-indigo-400 text-[6px] font-black">Data do Ajuste</p>
                          <p className="text-slate-900">{new Date(formData.dataAjuste!).toLocaleDateString('pt-BR')}</p>
                       </div>
                       <div className="space-y-1 col-span-2">
                          <p className="text-indigo-400 text-[6px] font-black">Justificativa Técnica</p>
                          <p className="text-slate-700 font-medium italic normal-case leading-tight">"{formData.justificativaAjuste}"</p>
                       </div>
                     </div>
                   </div>
                )}

                <div className="space-y-8">
                  <ReportTable title="01. DEMONSTRATIVO DE ORIGINAÇÃO" data={formData.tabelaOriginacao} type="originacao" />
                  <ReportTable title="02. DEMONSTRATIVO DE MOVIMENTAÇÃO" data={formData.tabelaMovimentacao} isNegative type="movimentacao" maskFn={maskText} />
                  <div className="grid grid-cols-2 gap-8">
                    <ReportTable title="03. SALDO LEGADO" data={formData.tabelaLegado} isLegado type="legado" />
                    <ReportTable title="04. AJUSTE IMEI" data={formData.tabelaImei} isImei type="imei" />
                  </div>
                  <ReportTable title="05. AQUISIÇÃO EXTRAORDINÁRIA" data={formData.tabelaAquisicao} isNegative type="aquisicao" />
                </div>

                {/* AUDIT SUMMARY & SIGNATURE */}
                <div className="mt-14 pt-10 border-t-2 border-slate-100 flex justify-between items-end">
                  <div className="space-y-4">
                    <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-3 w-fit">
                       <ShieldCheck className="w-4 h-4 text-emerald-600" />
                       <div className="flex flex-col">
                         <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest leading-none">Status: LedgerTrust Verified</span>
                         <span className="text-[6px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Conformidade e Integridade de Dados BMV ✓</span>
                       </div>
                    </div>
                    <div className="text-[6px] text-slate-400 font-medium uppercase leading-relaxed max-w-[300px]">
                      Este relatório é um documento técnico gerado automaticamente pelo portal de auditoria BMV. Os dados aqui contidos são extraídos diretamente do LedgerTrust e refletem o estado atual do ativo na data da emissão.
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="border-t border-slate-300 w-64 pt-3 flex flex-col items-center">
                      <p className="text-[8px] font-black uppercase text-slate-900 tracking-widest">RESPONSÁVEL TÉCNICO BMV</p>
                      <p className="text-[7px] font-bold text-slate-500 uppercase mt-1 mb-0.5">{user?.email || "AUDIT.CONTROL@BMV.GLOBAL"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                        <span className="text-[6px] text-emerald-600 uppercase font-black tracking-widest">Assinado Digitalmente via Blockchain Ledger</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* RELATÓRIO JURÍDICO */}
              <div className="w-full h-12 bg-slate-900 flex items-center justify-between px-10 text-white uppercase tracking-[0.2em] font-black text-[10px]">
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4 text-amber-500" />
                  CERTIFICADO TÉCNICO DE RASTREABILIDADE JURÍDICA
                </div>
                <div className="flex items-center gap-4 text-slate-400 font-bold">
                  <span>SÉRIE: {entity.id?.substring(0, 8).toUpperCase()}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>AUTÊNTICO</span>
                </div>
              </div>

              <div className="px-10 py-12">
                <div className="flex justify-between items-start mb-12">
                   <div className="space-y-4">
                      <h1 className="text-[32px] font-black text-slate-900 tracking-tighter leading-none mb-2">{entity.nome}</h1>
                      <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                         <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> CPF/CNPJ: <span className="text-slate-900">{entity.documento}</span></div>
                         <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> FAZENDA: <span className="text-slate-900">{entity.propriedade}</span></div>
                      </div>
                   </div>
                   <div className="text-right flex flex-col items-end">
                      <QrCode className="w-20 h-20 text-slate-900 mb-2 opacity-10" />
                      <p className="text-[8px] font-black text-slate-400 uppercase">Validação via Ledger Core</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-12">
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Volume Originado (Produtor)</p>
                      <p className="text-[20px] font-black text-slate-900 font-mono">{(totals.origProdutor || 0).toLocaleString('pt-BR')} <span className="text-[10px]">UCS</span></p>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Movimentação Consolidada</p>
                      <p className="text-[20px] font-black text-rose-600 font-mono">{(totals.mov || 0).toLocaleString('pt-BR')} <span className="text-[10px]">UCS</span></p>
                   </div>
                   <div className="bg-[#734DCC]/5 p-6 rounded-2xl border border-[#734DCC]/10">
                      <p className="text-[8px] font-black text-[#734DCC] uppercase tracking-widest mb-2">Saldo Certificado BMV</p>
                      <p className="text-[20px] font-black text-[#734DCC] font-mono">{(totals.final || 0).toLocaleString('pt-BR')} <span className="text-[10px]">UCS</span></p>
                   </div>
                </div>

                <div className="space-y-10">
                   <section>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-3 mb-6 flex items-center gap-3">
                         <ShieldCheck className="w-4 h-4 text-emerald-500" /> APONTAMENTOS DE AUDITORIA E GOVERNANÇA
                      </h3>
                      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-6">
                         {formData.observacao ? (
                            <p className="text-[12px] font-medium text-slate-700 leading-relaxed italic border-l-4 border-[#734DCC] pl-6 py-2">
                               "{formData.observacao}"
                            </p>
                         ) : (
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nenhum apontamento técnico registrado para este ativo.</p>
                         )}
                         
                         {formData.ajusteRealizado && (
                            <div className="bg-white p-6 rounded-2xl border border-indigo-100 space-y-3 shadow-sm">
                               <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                  <LockIcon className="w-3.5 h-3.5" /> Ajuste de Governança Manual Aplicado
                               </div>
                               <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                                  Justificativa: {formData.justificativaAjuste}
                               </p>
                            </div>
                         )}
                      </div>
                   </section>

                   <section>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-3 mb-8 flex items-center gap-3">
                         <History className="w-4 h-4 text-primary" /> RASTREABILIDADE CRONOLÓGICA DE MOVIMENTAÇÕES
                      </h3>
                      <div className="space-y-4">
                         {formData.tabelaMovimentacao && formData.tabelaMovimentacao.length > 0 ? (
                            formData.tabelaMovimentacao.map((mov, idx) => (
                               <div key={mov.id} className="group relative bg-white border border-slate-100 rounded-3xl p-8 flex items-center justify-between shadow-sm page-break-inside-avoid">
                                  <div className="flex gap-8 items-center">
                                     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 text-[14px]">
                                        {String(idx + 1).padStart(2, '0')}
                                     </div>
                                     <div className="space-y-1.5">
                                        <div className="flex items-center gap-3">
                                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mov.data}</span>
                                           <Badge className={cn(
                                              "text-[8px] font-black uppercase px-2 py-0.5",
                                              mov.statusAuditoria === 'Concluido' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                                           )}>
                                              {mov.statusAuditoria || 'PENDENTE'}
                                           </Badge>
                                        </div>
                                        <h4 className="text-[16px] font-black text-slate-900 uppercase tracking-tight">{mov.destino}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plataforma: {mov.plataforma}</p>
                                     </div>
                                  </div>

                                  <div className="flex items-center gap-12 text-right">
                                     <div className="space-y-4">
                                        {mov.linkNxt && (
                                           <div className="flex flex-col items-end gap-1">
                                              <span className="text-[7px] font-black text-[#10B981] uppercase tracking-[0.2em] mb-1">Blockchain Hash (NXT)</span>
                                              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 max-w-[200px] overflow-hidden">
                                                 <Link2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                 <span className="text-[8px] font-mono text-emerald-800 truncate">{mov.linkNxt.split('/').pop()}</span>
                                              </div>
                                           </div>
                                        )}
                                        {mov.linkComprovante && (
                                           <div className="flex flex-col items-end gap-1">
                                              <span className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-1">Comprovante de Distribuição</span>
                                              <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 max-w-[200px] overflow-hidden">
                                                 <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                                                 <span className="text-[8px] font-mono text-primary truncate">LINK_PROVA_PAGAMENTO</span>
                                              </div>
                                           </div>
                                        )}
                                     </div>
                                     <div className="min-w-[120px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Volume</p>
                                        <p className="text-[22px] font-black text-slate-900 font-mono">-{mov.valor?.toLocaleString('pt-BR')}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">UCS</p>
                                     </div>
                                  </div>
                               </div>
                            ))
                         ) : (
                            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Não há registros de movimentações nesta conta.</p>
                            </div>
                         )}
                      </div>
                   </section>
                </div>

                <div className="mt-20 pt-12 border-t border-slate-200 flex justify-between items-start">
                   <div className="space-y-6 max-w-[450px]">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                            <LockIcon className="w-5 h-5 text-white" />
                         </div>
                         <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase">Garantia de Autenticidade</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Protocolo Descentralizado BMV Global</p>
                         </div>
                      </div>
                      <p className="text-[8px] text-slate-400 font-medium leading-relaxed uppercase">
                         Este relatório técnico serve como contraprova jurídica para fins de auditoria, fiscalização ou instrução processual. Todos os dados aqui apresentados são espelhados em tempo real do BMV Ledger e validados via rede NXT Blockchain, garantindo a imutabilidade do registro de originação e distribuição do ativo UCS.
                      </p>
                   </div>
                   <div className="text-right">
                      <div className="border-t border-slate-300 w-72 pt-4 flex flex-col items-center">
                         <p className="text-[9px] font-black uppercase text-slate-900 tracking-[0.2em]">RESPONSÁVEL PELA AUDITORIA</p>
                         <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 mb-2">{user?.email}</p>
                         <div className="bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                             <span className="text-[7px] text-emerald-700 font-black uppercase tracking-widest">Registro Blockchain LedgerTrust Verified</span>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CONSOLE UI - INTERFACE TÉCNICA (HIDDEN EM PRINT) */}
        <div className="flex-1 flex flex-col overflow-hidden print:hidden bg-[#0F172A] technical-console-wrapper">
          <div className="p-6 pb-8 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-5 h-5 bg-[#10B981]/20 rounded flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#10B981]">AUDITORIA TÉCNICA BMV</p>
                </div>
                <h1 className="text-[28px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
                <div className="flex items-center gap-4">
                  <p className="text-[12px] font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
                  <Badge className={cn(
                    "text-[9px] font-black uppercase px-3 py-1 rounded-full",
                    formData.status === 'disponivel' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" :
                    formData.status === 'bloqueado' ? "bg-rose-500/20 text-rose-400 border-rose-500/50" :
                    "bg-amber-500/20 text-amber-400 border-amber-500/50"
                  )}>
                    {formData.status === 'disponivel' ? 'APTO / DISPONÍVEL' : formData.status?.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="bg-[#1E293B] border border-white/5 rounded-[1.5rem] p-5 min-w-[300px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/10 blur-3xl -mr-16 -mt-16"></div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Saldo Final Auditado</p>
                 <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-[40px] font-black text-white tracking-tighter leading-none">{totals.final.toLocaleString('pt-BR')}</span>
                    <span className="text-[11px] font-black text-[#10B981] uppercase tracking-widest">UCS</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
              <StatBox label="ORIG. FAZENDA" value={totals.origFazenda} isHighlight />
              <StatBox label="ORIG. PRODUTOR" value={totals.origProdutor} />
              <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative />
              <StatBox label="APOSENTADO" value={totals.aposentado} isNegative />
              <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
              <StatBox label="AQUISIÇÃO" value={totals.aq} isNegative />
              <StatBox label="AJUSTE IMEI" value={totals.imeiPending} isImei />
              <StatBox label="SALDO LEGADO" value={totals.legadoTotal} isAmber />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* COLUNA PRINCIPAL (ESQUERDA) */}
                <div className="lg:col-span-8 space-y-14">
                  {formData.ajusteRealizado && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] p-10 flex items-start justify-between">
                      <div className="flex gap-6">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                          <UserCheck className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <h4 className="text-[13px] font-black uppercase text-emerald-700 tracking-widest">AJUSTE DE GOVERNANÇA ATIVO</h4>
                            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase px-3 py-1">Fidedigno ✓</Badge>
                          </div>
                          <p className="text-[16px] font-black text-slate-900">Novo Saldo Consolidado: {formData.valorAjusteManual?.toLocaleString('pt-BR')} UCS</p>
                          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-tight flex gap-6">
                            <span>Autor: {formData.usuarioAjuste}</span>
                            <span>Data: {new Date(formData.dataAjuste!).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-[12px] text-slate-600 bg-white/50 p-4 rounded-xl border border-emerald-50 italic leading-relaxed">
                            "{formData.justificativaAjuste}"
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" onClick={handleRemoveAjuste} className="text-rose-500 hover:bg-rose-50 text-[11px] font-black uppercase tracking-widest h-12 px-6">
                        <Trash2 className="w-4 h-4 mr-2" /> Revogar Ajuste
                      </Button>
                    </div>
                  )}

                  {/* SEÇÃO DE CARTEIRA E PARTICIONAMENTO */}
                  <div className="bg-slate-50/50 p-7 rounded-[2.5rem] border border-slate-100 flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Configurações de Particionamento e Carteira</h3>
                      </div>
                      <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-[10px] font-black text-primary uppercase tracking-widest shadow-sm">
                        Ref: {((formData.originacao || 0) * (formData.particionamento || 0) / 100).toLocaleString('pt-BR')} UCS
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Originação Fazenda (Total)</Label>
                        <Input 
                          type="number"
                          value={formData.originacao ?? ""}
                          onChange={e => {
                            const val = e.target.value;
                            const orig = val === "" ? 0 : parseInt(val) || 0;
                            const newSaldo = Math.round(orig * ((formData.particionamento ?? 0) / 100));
                            
                            let newTable = formData.tabelaOriginacao;
                            if (newTable && newTable.length === 1 && newTable[0].id?.startsWith("auto-orig-")) {
                              newTable = [{ ...newTable[0], valor: newSaldo }];
                            }

                            setFormData({
                              ...formData, 
                              originacao: val === "" ? undefined : orig,
                              saldoParticionado: newSaldo,
                              tabelaOriginacao: newTable
                            });
                          }}
                          className="h-12 rounded-xl bg-white border-slate-200 font-bold text-[13px] shadow-sm focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 ml-1">Particionamento (%)</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={formData.particionamento ?? ""}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "") {
                              setFormData({ ...formData, particionamento: undefined, saldoParticionado: undefined });
                              return;
                            }
                            const p = parseFloat(val) || 0;
                            const newSaldo = Math.round((formData.originacao ?? 0) * (p / 100));
                            
                            // If table has only the auto-record, update it too
                            let newTable = formData.tabelaOriginacao;
                            if (newTable && newTable.length === 1 && newTable[0].id?.startsWith("auto-orig-")) {
                              newTable = [{ ...newTable[0], valor: newSaldo }];
                            }

                            setFormData({
                              ...formData, 
                              particionamento: p,
                              saldoParticionado: newSaldo,
                              tabelaOriginacao: newTable
                            });
                          }}
                          className="h-12 rounded-xl bg-white border-emerald-100 font-bold text-[13px] text-emerald-600 shadow-sm focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 ml-1">Saldo Particionado (Produtor)</Label>
                        <Input 
                          type="number"
                          value={formData.saldoParticionado ?? ""}
                          onChange={e => setFormData({...formData, saldoParticionado: e.target.value === "" ? undefined : parseInt(e.target.value) || 0})}
                          className="h-12 rounded-xl bg-emerald-50 border-emerald-100 font-bold text-[13px] text-emerald-700 shadow-sm focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-200/60 relative z-10">
                      <div className="p-5 rounded-[1.5rem] bg-amber-50/30 border border-amber-100/50 space-y-5">
                        <div className="flex items-center gap-2 mb-1">
                          <DatabaseIcon className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Associação / Núcleo</span>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-amber-600/70 ml-1">Nome</Label>
                            <Input 
                              value={formData.associacaoNome || ""}
                              onChange={e => setFormData({...formData, associacaoNome: e.target.value})}
                              placeholder="NOME"
                              className="h-10 rounded-xl bg-white border-slate-200 font-bold text-[11px] shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-amber-600/70 ml-1">CNPJ</Label>
                            <Input 
                              value={formData.associacaoCnpj || ""}
                              onChange={e => setFormData({...formData, associacaoCnpj: e.target.value})}
                              placeholder="CNPJ"
                              className="h-10 rounded-xl bg-white border-slate-200 font-bold text-[11px] shadow-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-amber-600 ml-1">Quota (%)</Label>
                              <Input 
                                type="number"
                                step="0.01"
                                value={formData.associacaoParticionamento ?? ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    setFormData({ ...formData, associacaoParticionamento: undefined, associacaoSaldo: undefined });
                                    return;
                                  }
                                  const p = parseFloat(val) || 0;
                                  setFormData({
                                    ...formData, 
                                    associacaoParticionamento: p,
                                    associacaoSaldo: Math.round((formData.originacao || 0) * (p / 100))
                                  });
                                }}
                                className="h-10 rounded-xl bg-white border-amber-100 font-bold text-[11px] text-amber-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-amber-600 ml-1">Saldo (UCS)</Label>
                              <Input 
                                type="number"
                                value={formData.associacaoSaldo ?? ""}
                                onChange={e => setFormData({...formData, associacaoSaldo: e.target.value === "" ? undefined : parseInt(e.target.value) || 0})}
                                className="h-10 rounded-xl bg-white border-amber-100 font-bold text-[11px] text-amber-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-[1.5rem] bg-indigo-50/30 border border-indigo-100/50 space-y-5">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">IMEI / Plataforma</span>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-indigo-500/70 ml-1">Nome</Label>
                            <Input 
                              value={formData.imeiNome || "IMEI (PLATAFORMA)"}
                              onChange={e => setFormData({...formData, imeiNome: e.target.value})}
                              placeholder="NOME"
                              className="h-10 rounded-xl bg-white border-slate-200 font-bold text-[11px] shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-indigo-500/70 ml-1">CNPJ</Label>
                            <Input 
                              value={formData.imeiCnpj || ""}
                              onChange={e => setFormData({...formData, imeiCnpj: e.target.value})}
                              placeholder="CNPJ"
                              className="h-10 rounded-xl bg-white border-slate-200 font-bold text-[11px] shadow-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-indigo-500 ml-1">Quota (%)</Label>
                              <Input 
                                type="number"
                                step="0.01"
                                value={formData.imeiParticionamento ?? ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    setFormData({ ...formData, imeiParticionamento: undefined, imeiSaldo: undefined });
                                    return;
                                  }
                                  const p = parseFloat(val) || 0;
                                  setFormData({
                                    ...formData, 
                                    imeiParticionamento: p,
                                    imeiSaldo: Math.round((formData.originacao || 0) * (p / 100))
                                  });
                                }}
                                className="h-10 rounded-xl bg-white border-indigo-100 font-bold text-[11px] text-indigo-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-indigo-500 ml-1">Saldo (UCS)</Label>
                              <Input 
                                type="number"
                                value={formData.imeiSaldo ?? ""}
                                onChange={e => setFormData({...formData, imeiSaldo: e.target.value === "" ? undefined : parseInt(e.target.value) || 0})}
                                className="h-10 rounded-xl bg-white border-indigo-100 font-bold text-[11px] text-indigo-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-[1.5rem] bg-slate-100/50 border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <DatabaseIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Observações da Propriedade</span>
                        </div>
                        <textarea 
                          value={formData.observacaoFazenda || ""}
                          onChange={e => setFormData({...formData, observacaoFazenda: e.target.value})}
                          className="w-full h-44 rounded-xl bg-white border border-slate-200 p-4 text-[11px] font-bold text-slate-700 shadow-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                          placeholder="Notas técnicas de auditoria da fazenda..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="space-y-8">
                      <SectionHeader 
                        title="01. ORIGINAÇÃO (VOL. PRODUTOR)" 
                        value={totals.origProdutor} 
                        onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })} 
                      />
                      <SectionTable data={formData.tabelaOriginacao || []} type="originacao" onRemove={(id) => handleRemoveItem('tabelaOriginacao', id)} />
                    </div>

                    <div className="space-y-8">
                      <SectionHeader title="02. MOVIMENTAÇÃO" value={totals.mov} isNegative onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })} />
                      <SectionTable 
                        data={formData.tabelaMovimentacao || []} 
                        type="movimentacao" 
                        onRemove={(id) => handleRemoveItem('tabelaMovimentacao', id)}
                        onUpdateItem={(id, updates) => handleUpdateItem('tabelaMovimentacao', id, updates)}
                        maskFn={maskText}
                      />
                    </div>

                    <div className="space-y-8">
                      <SectionHeader title="03. SALDO LEGADO" value={totals.legadoTotal} isAmber onPaste={() => setPasteData({ section: 'tabelaLegado', raw: '' })} />
                      <SectionTable data={formData.tabelaLegado || []} type="legado" onRemove={(id) => handleRemoveItem('tabelaLegado', id)} />
                    </div>

                    <div className="space-y-8">
                      <SectionHeader title="04. AJUSTE IMEI" value={totals.imeiPending} isImei onPaste={() => setPasteData({ section: 'tabelaImei', raw: '' })} />
                      <SectionTable data={formData.tabelaImei || []} type="imei" onRemove={(id) => handleRemoveItem('tabelaImei', id)} />
                    </div>

                    <div className="space-y-8">
                      <SectionHeader title="05. AQUISIÇÃO" value={totals.aq} isNegative onAdd={() => setIsAddingAq(true)} />
                      <SectionTable data={formData.tabelaAquisicao || []} type="aquisicao" onRemove={(id) => handleRemoveItem('tabelaAquisicao', id)} />
                    </div>
                  </div>
                </div>

                {/* COLUNA LATERAL (DIREITA) */}
                <aside className="lg:col-span-4 space-y-10">
                  <div className="sticky top-0 space-y-10">
                    <div className="space-y-4 bg-white p-2 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <MessageSquare className="w-4 h-4 text-[#10B981]" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">APONTAMENTOS DE AUDITORIA</h3>
                      </div>
                      <Textarea 
                        value={formData.observacao || ""} 
                        onChange={e => setFormData({...formData, observacao: e.target.value})}
                        placeholder="Descreva aqui divergências, inconsistências ou justificativas técnicas..."
                        className="min-h-[220px] bg-slate-50 border-slate-100 rounded-[1.5rem] p-6 text-[12px] font-medium focus:ring-primary shadow-inner resize-none leading-relaxed"
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">CONTROLE DE GOVERNANÇA</Label>
                      </div>
                      
                      <div className="space-y-5 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Status do Produtor</Label>
                          <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as EntityStatus})}>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 font-black text-[10px] uppercase tracking-widest shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-xl">
                              <SelectItem value="disponivel" className="font-black text-[9px] uppercase">
                                <div className="flex items-center gap-2"><UserCheck2 className="w-3.5 h-3.5 text-emerald-500" /> APTO / DISPONÍVEL</div>
                              </SelectItem>
                              <SelectItem value="bloqueado" className="font-black text-[9px] uppercase">
                                <div className="flex items-center gap-2"><Ban className="w-3.5 h-3.5 text-rose-500" /> BLOQUEADO</div>
                              </SelectItem>
                              <SelectItem value="inapto" className="font-black text-[9px] uppercase">
                                <div className="flex items-center gap-2"><UserX className="w-3.5 h-3.5 text-amber-500" /> INAPTO</div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          onClick={() => setIsAjustando(true)} 
                          variant="outline" 
                          className="w-full h-12 rounded-xl border-[#734DCC]/20 bg-[#734DCC]/5 text-[#734DCC] font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-[#734DCC]/10 transition-all"
                        >
                          <LockIcon className="w-4 h-4" /> AJUSTE DE GOVERNANÇA
                        </Button>
                        
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Auditoria de Saldo</Label>
                          <Select 
                            value={formData.statusAuditoriaSaldo || "valido"} 
                            onValueChange={v => setFormData({...formData, statusAuditoriaSaldo: v as any})}
                          >
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 font-black text-[10px] uppercase tracking-widest shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-xl">
                              <SelectItem value="valido" className="font-black text-[10px] uppercase text-emerald-600">✓ SALDO VALIDADO</SelectItem>
                              <SelectItem value="inconsistente" className="font-black text-[10px] uppercase text-rose-500">⚠ DIVERGÊNCIA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="pt-4 border-t border-slate-200/60 mt-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase leading-relaxed">
                            Última atualização por:<br/>
                            <span className="text-slate-600 font-black">{user?.email || "AUDITOR"}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 px-8 h-11">
              CANCELAR
            </Button>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCensored(!isCensored)} 
                className={cn(
                  "h-11 px-6 rounded-xl border-slate-200 transition-all font-black uppercase text-[10px] tracking-widest",
                  isCensored ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-slate-50/50 text-slate-500"
                )}
              >
                {isCensored ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {isCensored ? "MODO CENSURA" : "CENSURAR DADOS"}
              </Button>
              <Button variant="outline" onClick={handlePrintExecutive} title="Relatório de Auditoria Padrão" className="h-11 px-6 rounded-xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-slate-700 hover:bg-white transition-all shadow-sm">
                <Printer className="w-4 h-4 mr-2" /> EXECUTIVO
              </Button>
              <Button variant="outline" onClick={handlePrintJuridico} title="Relatório Detalhado para Contraprova Jurídica" className="h-11 px-6 rounded-xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-[#734DCC] hover:bg-white transition-all shadow-sm">
                <Scale className="w-4 h-4 mr-2" /> CONTRAPROVA JURÍDICA
              </Button>
              <Button onClick={handleSave} className="h-11 px-12 rounded-xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">
                <Save className="w-4 h-4 mr-2" /> SALVAR NO LEDGER
              </Button>
            </div>
          </div>
        </div>

        {/* DIALOG DE AJUSTE GERAL (AUTORIZAÇÃO DUPLA) */}
        <Dialog open={isAjustando} onOpenChange={setIsAjustando}>
          <DialogContent className="max-w-lg rounded-[2.5rem] p-10 space-y-8 border-none shadow-2xl bg-white">
            <DialogHeader>
              <div className="w-16 h-16 bg-[#734DCC]/10 rounded-2xl flex items-center justify-center mb-6">
                <LockIcon className="w-8 h-8 text-[#734DCC]" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase text-slate-900 tracking-tight">Autorização de Ajuste</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">Esta ação irá sobrepor o saldo calculado por um valor arbitrário de governança.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Novo Saldo Final (UCS)</Label>
                <Input 
                  type="number"
                  value={ajusteData.valor} 
                  onChange={e => setAjusteData({...ajusteData, valor: e.target.value})}
                  placeholder="EX: 493262"
                  className="h-16 rounded-2xl border-slate-100 bg-slate-50 font-black text-center text-2xl text-[#734DCC]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Justificativa da Auditoria</Label>
                <Textarea 
                  value={ajusteData.justificativa} 
                  onChange={e => setAjusteData({...ajusteData, justificativa: e.target.value})}
                  placeholder="Descreva o motivo técnico para o ajuste manual deste saldo..."
                  className="min-h-[120px] rounded-2xl border-slate-100 bg-slate-50 p-5 font-medium"
                />
              </div>
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[11px] font-bold text-amber-700 leading-tight uppercase">
                  Atenção: Seu usuário ({user?.email}) será registrado como o autorizador deste ajuste permanente.
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col gap-3">
              <Button onClick={handleConfirmAjuste} className="w-full h-14 rounded-2xl font-black uppercase text-[12px] tracking-widest bg-[#734DCC] text-white shadow-xl shadow-indigo-100">
                Confirmar e Ajustar Saldo
              </Button>
              <Button variant="ghost" onClick={() => setIsAjustando(false)} className="w-full h-12 text-[10px] font-black uppercase text-slate-400">
                Cancelar Operação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE AQUISIÇÃO MANUAL */}
        <Dialog open={isAddingAq} onOpenChange={setIsAddingAq}>
          <DialogContent className="max-w-md rounded-3xl p-10 space-y-8 border-none bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase text-slate-900 flex items-center gap-3">
                <Plus className="w-6 h-6 text-primary" /> Nova Aquisição
              </DialogTitle>
              <DialogDescription>Insira o ano e o volume de UCS adquiridas para este registro.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referência (Ano)</Label>
                <Input 
                  value={newAq.data} 
                  onChange={e => setNewAq({...newAq, data: e.target.value})}
                  placeholder="EX: 2018"
                  className="h-14 rounded-xl border-slate-100 bg-slate-50 font-black text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Volume (UCS)</Label>
                <Input 
                  type="number"
                  value={newAq.valor} 
                  onChange={e => setNewAq({...newAq, valor: e.target.value})}
                  placeholder="0"
                  className="h-14 rounded-xl border-slate-100 bg-slate-50 font-black text-center text-lg text-primary"
                />
              </div>
            </div>
            <Button onClick={handleAddAquisicao} className="w-full h-14 rounded-xl font-black uppercase text-[12px] tracking-widest bg-primary text-white shadow-xl shadow-emerald-100">
              Registrar Aquisição
            </Button>
          </DialogContent>
        </Dialog>

        {/* MODAL DE COLAGEM TÉCNICA */}
        {pasteData && (
          <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
            <DialogContent className="max-w-xl rounded-3xl p-8 space-y-4 border-none bg-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" /> COLAGEM TÉCNICA
                </DialogTitle>
                <DialogDescription className="sr-only">Colagem de dados para processamento de auditoria.</DialogDescription>
              </DialogHeader>
              <Textarea 
                value={pasteData.raw} 
                onChange={e => setPasteData({ ...pasteData, raw: e.target.value })}
                placeholder="Cole aqui as colunas do Excel/Google Sheets para processamento automático..."
                className="min-h-[250px] font-mono text-[10px] bg-slate-50 border-slate-100 rounded-2xl p-6 shadow-inner"
              />
              <Button onClick={handleProcessPaste} className="w-full h-12 rounded-xl font-black uppercase text-[10px] bg-primary text-white shadow-lg shadow-emerald-100">IMPORTAR DADOS</Button>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportTable({ title, data, isNegative, isLegado, isImei, type, maskFn = (t: any) => t || '-' }: any) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2">
       <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-900 border-b border-slate-200 pb-1.5">{title}</h4>
       <table className="w-full text-left text-[9px]">
          <thead className="bg-[#F8FAFC]">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-400 text-[8px]">DATA</th>
              <th className="px-3 py-2 font-black uppercase tracking-widest text-primary text-[8px]">DISTRIBUIÇÃO</th>
              <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-400 text-[8px]">PLATAFORMA / HISTÓRICO</th>
              {isLegado ? (
                <>
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-900 text-right text-[8px]">DISP.</th>
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-amber-600 text-right text-[8px]">RES.</th>
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-rose-500 text-right text-[8px]">BLOQ.</th>
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-400 text-right text-[8px]">APOS.</th>
                </>
              ) : isImei ? (
                <>
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-indigo-500 text-right text-[8px]">DÉBITO</th>
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-400 text-right text-[8px]">CRÉDITO</th>
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-900 text-right text-[8px]">VOLUME</th>
                </>
              ) : (
                <>
                  {type === 'movimentacao' && <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-400 text-[8px]">DESTINO</th>}
                  {type === 'movimentacao' && <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-400 text-[8px] text-center">STATUS</th>}
                  {type === 'movimentacao' && <th className="px-3 py-2 font-black uppercase tracking-widest text-[#734DCC] text-[8px] text-center">NXT</th>}
                  <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-900 text-right text-[8px]">VOLUME (UCS)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="font-bold uppercase bg-white">
            {data.map((row: any, i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 h-10">
                <td className="px-3 py-1.5 font-mono text-slate-400 truncate max-w-[60px]">{row.data || '-'}</td>
                <td className="px-3 py-1.5 font-mono text-primary truncate max-w-[80px]">{row.dist || '-'}</td>
                <td className="px-3 py-1.5 text-slate-600 truncate max-w-[180px]">{type === 'movimentacao' ? (maskFn(row.nome || row.plataforma)) : (maskFn(row.destino || row.plataforma || row.nome))}</td>
                {isLegado ? (
                  <>
                    <td className="px-3 py-1.5 text-right text-slate-900 font-black">{(row.disponivel || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-1.5 text-right text-amber-600">{(row.reservado || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-1.5 text-right text-rose-600">{(row.bloqueado || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-1.5 text-right text-slate-300">{(row.aposentado || 0).toLocaleString('pt-BR')}</td>
                  </>
                ) : isImei ? (
                  <>
                    <td className="px-3 py-1.5 text-right text-indigo-500">{(row.valorDebito || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-1.5 text-right text-slate-300">{(row.valorCredito || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-1.5 text-right font-black text-slate-900">{((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR')}</td>
                  </>
                ) : (
                  <>
                    {type === 'movimentacao' && (
                      <td className="px-3 py-1.5 text-slate-600 truncate max-w-[120px]">{maskFn(row.destino)}</td>
                    )}
                    {type === 'movimentacao' && (
                      <td className="px-3 py-1.5 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                          row.statusAuditoria === 'Concluido' ? "bg-emerald-50 text-emerald-600" :
                          row.statusAuditoria === 'Cancelado' ? "bg-rose-50 text-rose-600" :
                          "bg-slate-100 text-slate-400"
                        )}>
                          {row.statusAuditoria || 'PENDENTE'}
                        </span>
                      </td>
                    )}
                    {type === 'movimentacao' && (
                      <td className="px-3 py-1.5 text-center text-[8px] font-black text-[#734DCC]">
                        {row.linkNxt ? "HASH ✓" : "-"}
                      </td>
                    )}
                    <td className={cn("px-3 py-1.5 text-right font-black", isNegative ? "text-rose-600" : "text-slate-900")}>
                      {(isLegado ? ((row.disponivel || 0) + (row.reservado || 0)) : 
                        type === 'imei' ? ((row.valorDebito || 0) - (row.valorCredito || 0)) :
                        (row.valor || 0)).toLocaleString('pt-BR')}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
       </table>
    </div>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAmber, isImei }: any) {
  return (
    <div className={cn(
      "border rounded-[1rem] p-3 flex flex-col justify-between h-[75px] transition-all bg-[#1E293B]/50",
      isAmber ? "border-amber-500/30 ring-1 ring-amber-500/10" : "border-white/5",
      isImei ? "border-indigo-500/30" : ""
    )}>
      <div className="flex justify-between items-start w-full">
        <p className={cn(
          "text-[8px] font-black uppercase tracking-widest leading-none",
          isAmber ? "text-amber-500" : isImei ? "text-indigo-400" : "text-slate-500"
        )}>
          {label}
        </p>
      </div>
      <p className={cn(
        "text-[15px] font-black font-mono leading-none tracking-tighter truncate",
        isNegative || (label === 'MOVIMENTAÇÃO' && value !== 0) || (label === 'AQUISIÇÃO' && value !== 0) ? "text-rose-500" : 
        isHighlight ? "text-[#10B981]" : 
        isAmber ? "text-amber-500" : 
        isImei ? "text-indigo-400" :
        "text-white"
      )}>
        {(label === 'MOVIMENTAÇÃO' && value > 0) ? `-${value.toLocaleString('pt-BR')}` : (value || 0).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function SectionHeader({ title, value, onPaste, onAdd, isNegative, isAmber, isImei }: any) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-1.5 h-6 rounded-full",
          isAmber ? "bg-amber-500" : isImei ? "bg-indigo-500" : isNegative ? "bg-rose-500" : "bg-[#10B981]"
        )} />
        <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
        <Badge variant="outline" className={cn(
          "text-[10px] font-black uppercase rounded-full border-slate-100 px-3 py-1",
          isAmber ? "text-amber-500" : isImei ? "text-indigo-500" : isNegative ? "text-rose-500" : "text-[#10B981]"
        )}>
          {(value || 0).toLocaleString('pt-BR')} UCS
        </Badge>
      </div>
      {onAdd ? (
        <Button variant="outline" size="sm" onClick={onAdd} className="h-10 px-6 rounded-xl text-[9px] font-black uppercase gap-2 border-slate-200 hover:bg-slate-50">
          <Plus className="w-4 h-4" /> ADICIONAR REGISTRO
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onPaste} className="h-10 px-6 rounded-xl text-[9px] font-black uppercase gap-2 border-slate-200 hover:bg-slate-50">
          <Calculator className="w-4 h-4" /> COLAR DADOS
        </Button>
      )}
    </div>
  );
}

function SectionTable({ data, type, onRemove, onUpdateItem, maskFn = (t: any) => t || '-' }: { data: any[], type: string, onRemove?: (id: string) => void, onUpdateItem?: (id: string, updates: Partial<RegistroTabela>) => void, maskFn?: (t: string | undefined) => string }) {
  const isLegado = type === 'legado';
  const isImei = type === 'imei';
  const isMovimentacao = type === 'movimentacao';

  return (
    <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm overflow-x-auto">
      <Table className="min-w-[1300px]">
        <TableHeader className="bg-slate-50/50">
          <TableRow className="h-12 border-b border-slate-100">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-6 w-[120px]">DATA</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary w-[140px]">DISTRIBUIÇÃO</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">HISTÓRICO / PLATAFORMA</TableHead>
            {isMovimentacao && (
              <>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">USUÁRIO DESTINO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">STATUS PGTO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">COMPROVANTE</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#734DCC] text-center">NXT</TableHead>
              </>
            )}
            {isLegado ? (
              <>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary text-right">DISPONÍVEL</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-amber-500 text-right">RESERVADO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-rose-500 text-right">BLOQUEADO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">APOSENTADO</TableHead>
              </>
            ) : isImei ? (
              <>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-indigo-500 text-right">DÉBITO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">CRÉDITO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-indigo-600 text-right pr-6">VOLUME (UCS)</TableHead>
              </>
            ) : (
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">VOLUME (UCS)</TableHead>
            )}
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isLegado ? 7 : isImei ? 6 : isMovimentacao ? 7 : 4} className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                Nenhum registro auditado nesta sessão
              </TableCell>
            </TableRow>
          ) : (
            data.map((row: any, i: number) => (
              <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-slate-50/50">
                <TableCell className="px-4 py-1.5">
                  <Input 
                    value={row.data || ""} 
                    onChange={e => onUpdateItem?.(row.id, { data: e.target.value })}
                    className="h-8 w-24 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-slate-500 rounded-lg"
                  />
                </TableCell>
                <TableCell className="px-4 py-1.5">
                  <Input 
                    value={row.dist || ""} 
                    onChange={e => onUpdateItem?.(row.id, { dist: e.target.value })}
                    placeholder="Distribuição"
                    className="h-8 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-primary focus:ring-primary rounded-lg"
                  />
                </TableCell>
                <TableCell className="px-4 py-1.5">
                  <Input 
                    value={row.plataforma || row.nome || ""} 
                    onChange={e => onUpdateItem?.(row.id, { plataforma: e.target.value })}
                    placeholder="Histórico / Plataforma"
                    className="h-8 bg-slate-50 border-slate-100 text-[9px] font-bold text-slate-600 rounded-lg uppercase"
                  />
                </TableCell>
                
                {isMovimentacao && (
                  <>
                    <TableCell className="px-4 py-1.5">
                      <Input 
                        value={row.destino || ""} 
                        onChange={e => onUpdateItem?.(row.id, { destino: e.target.value })}
                        placeholder="Destino"
                        className="h-8 bg-slate-50 border-slate-100 text-[9px] font-bold text-slate-600 rounded-lg uppercase"
                      />
                    </TableCell>
                    <TableCell className="text-center px-4 py-1.5">
                      <Select 
                        value={row.statusAuditoria || "Pendente"} 
                        onValueChange={(v) => onUpdateItem?.(row.id, { statusAuditoria: v as AuditoriaStatus })}
                      >
                        <SelectTrigger className="h-8 rounded-xl bg-slate-50 text-[8px] font-black uppercase border-slate-100 min-w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                          <SelectItem value="Concluido" className="text-[8px] font-black uppercase text-emerald-600">✓ CONCLUÍDO</SelectItem>
                          <SelectItem value="Pendente" className="text-[8px] font-black uppercase text-amber-500">⚠ PENDENTE</SelectItem>
                          <SelectItem value="Cancelado" className="text-[8px] font-black uppercase text-rose-500">✗ CANCELADO</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <Input 
                          placeholder="Link do comprovante..." 
                          value={row.linkComprovante || ""} 
                          onChange={(e) => onUpdateItem?.(row.id, { linkComprovante: e.target.value })}
                          className="h-8 bg-slate-50 text-[9px] rounded-xl border-slate-100"
                        />
                        {row.linkComprovante && (
                          <a href={row.linkComprovante} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-500 hover:scale-110 transition-all" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-4 py-1.5">
                       <div className="flex items-center gap-3">
                        <Input 
                          placeholder="Link NXT / Hash..." 
                          value={row.linkNxt || ""} 
                          onChange={(e) => onUpdateItem?.(row.id, { linkNxt: e.target.value })}
                          className="h-8 bg-slate-50 text-[9px] rounded-xl border-slate-100 border-[#734DCC]/10"
                        />
                        {row.linkNxt && (
                          <a href={row.linkNxt.startsWith('http') ? row.linkNxt : `https://nxtportal.org/transactions/${row.linkNxt}`} target="_blank" rel="noopener noreferrer">
                            <QrCode className="w-3.5 h-3.5 text-[#734DCC] hover:scale-110 transition-all" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}

                {isLegado ? (
                  <>
                    <TableCell className="px-4 py-1.5">
                      <Input 
                        type="number"
                        value={row.disponivel ?? ""} 
                        onChange={e => onUpdateItem?.(row.id, { disponivel: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-8 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-primary text-right rounded-lg"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1.5">
                      <Input 
                        type="number"
                        value={row.reservado ?? ""} 
                        onChange={e => onUpdateItem?.(row.id, { reservado: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-8 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-amber-500 text-right rounded-lg"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1.5">
                      <Input 
                        type="number"
                        value={row.bloqueado ?? ""} 
                        onChange={e => onUpdateItem?.(row.id, { bloqueado: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-8 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-rose-500 text-right rounded-lg"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1.5 pr-6">
                      <Input 
                        type="number"
                        value={row.aposentado ?? ""} 
                        onChange={e => onUpdateItem?.(row.id, { aposentado: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-8 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-slate-400 text-right rounded-lg"
                      />
                    </TableCell>
                  </>
                ) : isImei ? (
                  <>
                    <TableCell className="px-4 py-1.5">
                      <Input 
                        type="number"
                        value={row.valorDebito ?? ""} 
                        onChange={e => onUpdateItem?.(row.id, { valorDebito: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-8 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-indigo-500 text-right rounded-lg"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1.5">
                      <Input 
                        type="number"
                        value={row.valorCredito ?? ""} 
                        onChange={e => onUpdateItem?.(row.id, { valorCredito: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-8 bg-slate-50 border-slate-100 text-[9px] font-mono font-bold text-slate-400 text-right rounded-lg"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1.5 text-right font-mono font-black text-[10px] pr-6 text-indigo-600">
                      {((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR')}
                    </TableCell>
                  </>
                ) : (
                  <TableCell className="px-4 py-1.5 pr-6">
                    <Input 
                      type="number"
                      value={row.valor ?? ""} 
                      onChange={e => onUpdateItem?.(row.id, { valor: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                      className="h-8 bg-slate-50 border-slate-100 text-[10px] font-mono font-black text-right rounded-lg"
                    />
                  </TableCell>
                )}
                <TableCell className="pr-6">
                  {onRemove && (
                    <Button variant="ghost" size="icon" onClick={() => onRemove(row.id)} className="h-8 w-8 text-slate-200 hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}