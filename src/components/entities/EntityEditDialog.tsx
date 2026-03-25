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
import { EntityAuditReport } from "./reports/EntityAuditReport";
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

    const mov = (formData.tabelaMovimentacao !== undefined)
      ? (formData.tabelaMovimentacao || []).reduce((acc, curr) => acc + (curr.valor || 0), 0)
      : (formData.movimentacao || 0);

    const aq = (formData.tabelaAquisicao !== undefined)
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
    const legadoTotal = (formData.tabelaLegado !== undefined)
      ? (legDisp + legRes)
      : (formData.saldoLegadoTotal || 0);

    // Final calculation always uses PRODUCER origination
    // Aquisicao is now SUBTRACTED as per user latest instruction
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
        // Suporte para formato brasileiro (1.000,00)
        if (str.includes(',')) {
          return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
        }
        return parseFloat(str.replace(/\./g, "").replace(/[^\d.-]/g, "")) || 0;
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
          if (parts.length >= 14) {
            // New specific format: Dist [0], Data [1], Hist [2], Dest [3], . [4], . [5], Debito [6], . [7], Situa [8], Dt Pgt [9], Link [10], Val Pgt [11], NXT [12], OBS [13]
            const statusRaw = parts[8]?.trim().toLowerCase() || '';
            const statusAuditoria: AuditoriaStatus = (statusRaw.includes('pago') || statusRaw.includes('concl') || statusRaw.includes('final')) ? 'Concluido' :
                                                    statusRaw.includes('canc') ? 'Cancelado' : 'Pendente';
            
            return {
              id: `MOV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              dist: parts[0]?.trim() || '',
              data: cleanData(parts[1]),
              plataforma: parts[2]?.trim() || '', // Destino (Propriedade)
              destino: parts[3]?.trim() || '',    // Usuário Destino
              usuarioDestino: parts[4]?.trim() || '', // .
              valor: parseVal(parts[6]),          // Débito (UCS) - Corrigido para index 6
              statusAuditoria,
              dataPagamento: parts[9]?.trim() || '',
              linkComprovante: parts[10]?.trim() || '',
              valorPago: parseVal(parts[11]),
              linkNxt: parts[12]?.trim() || '',
              observacaoTransacao: parts[13]?.trim() || ''
            };
          }

          // Smart Scanning Fallback for other formats
          let valor = 0;
          let statusAuditoria: AuditoriaStatus = 'Pendente';
          let linkComprovante = "";
          let linkNxt = "";
          let foundValor = false;

          parts.forEach((p, idx) => {
            const val = p.trim();
            if (!val) return;

            if (!foundValor && idx >= 4) {
              const parsed = parseVal(val);
              if (parsed > 0) {
                valor = parsed;
                foundValor = true;
                return;
              }
            }

            if (val.toLowerCase() === 'pago') {
              statusAuditoria = 'Concluido';
            }

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

        {/* RELATÓRIO EXECUTIVO E JURÍDICO A4 PRINT */}
        <EntityAuditReport
          entity={formData as EntidadeSaldo}
          totals={{
            orig: totals.origProdutor || totals.origFazenda || 0,
            mov: totals.mov || 0,
            final: totals.final || 0
          }}
          reportType={reportType}
          userEmail={user?.email || "SYSTEM_AUDITOR"}
          isCensored={isCensored}
        />

        {/* CONSOLE UI - INTERFACE TÉCNICA (HIDDEN EM PRINT) */}
        <div className="flex-1 flex flex-col overflow-hidden print:hidden bg-[#0F172A] technical-console-wrapper">
          <div className="p-5 pb-6 shrink-0 text-white relative border-b border-white/5 bg-[#111827]">
            <div className="flex justify-between items-center mb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-[#10B981]/20 rounded flex items-center justify-center">
                    <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#10B981]">AUDITORIA TÉCNICA BMV</p>
                </div>
                <h1 className="text-[22px] font-black tracking-tight uppercase leading-none truncate max-w-[600px]">{entity.nome}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] font-bold text-slate-500 font-mono tracking-widest bg-white/5 px-2 py-0.5 rounded">{entity.documento}</p>
                  <Badge className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-white/10",
                    formData.status === 'disponivel' ? "bg-emerald-500/10 text-emerald-400" :
                      formData.status === 'bloqueado' ? "bg-rose-500/10 text-rose-400" :
                        "bg-amber-500/10 text-amber-400"
                  )}>
                    {formData.status === 'disponivel' ? 'APTO / DISPONÍVEL' : formData.status?.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-4 min-w-[280px] shadow-2xl flex flex-col items-end relative overflow-hidden group hover:border-[#10B981]/30 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#10B981]/10 blur-3xl -mr-12 -mt-12 group-hover:bg-[#10B981]/20 transition-all"></div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">SALDO FINAL AUDITADO</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-[34px] font-black text-white tracking-tighter leading-none">{totals.final.toLocaleString('pt-BR')}</span>
                  <span className="text-[10px] font-black text-[#10B981] uppercase tracking-widest pl-1">UCS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
              <StatBox label="ORIG. FAZENDA" value={totals.origFazenda} isHighlight />
              <StatBox label="ORIG. PRODUTOR" value={totals.origProdutor} />
              <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative />
              <StatBox label="APOSENTADO" value={totals.aposentado} isNegative />
              <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
              <StatBox label="AQUISIÇÃO" value={totals.aq} />
              <StatBox label="AJUSTE IMEI" value={totals.imeiPending} isImei />
              <StatBox label="SALDO LEGADO" value={totals.legadoTotal} isAmber />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* COLUNA PRINCIPAL (ESQUERDA) */}
                <div className="lg:col-span-8 space-y-10">
                  {formData.ajusteRealizado && (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 flex items-start justify-between shadow-sm">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                          <UserCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[11px] font-black uppercase text-emerald-700 tracking-widest">AJUSTE DE GOVERNANÇA ATIVO</h4>
                            <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase px-2 py-0.5">Fidedigno ✓</Badge>
                          </div>
                          <p className="text-[14px] font-black text-slate-900 font-mono">Saldo Consolidado: {formData.valorAjusteManual?.toLocaleString('pt-BR')} UCS</p>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight flex gap-4">
                            <span>{formData.usuarioAjuste}</span>
                            <span>•</span>
                            <span>{new Date(formData.dataAjuste!).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 bg-white/50 px-3 py-2 rounded-lg border border-emerald-50/50 italic leading-relaxed mt-2">
                            "{formData.justificativaAjuste}"
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" onClick={handleRemoveAjuste} className="text-rose-500 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest h-9 px-4">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Revogar
                      </Button>
                    </div>
                  )}

                  {/* SEÇÃO DE CARTEIRA E PARTICIONAMENTO */}
                  <div className="bg-slate-50/40 p-6 rounded-3xl border border-slate-100 flex flex-col gap-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-primary rounded-full"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Particionamento e Carteira</h3>
                      </div>
                      <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-[9px] font-black text-primary uppercase tracking-widest shadow-sm font-mono">
                        REF: {((formData.originacao || 0) * (formData.particionamento || 0) / 100).toLocaleString('pt-BR')} UCS
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                      <div className="space-y-1.5">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Originação (Total)</Label>
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
                          className="h-10 rounded-xl bg-white border-slate-200 font-bold text-[12px] shadow-sm focus:ring-primary h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-emerald-600 ml-1">Quota (%)</Label>
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
                          className="h-10 rounded-xl bg-white border-emerald-100 font-bold text-[12px] text-emerald-600 shadow-sm focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-emerald-600 ml-1">Saldo (Produtor)</Label>
                        <Input
                          type="number"
                          value={formData.saldoParticionado ?? ""}
                          onChange={e => setFormData({ ...formData, saldoParticionado: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })}
                          className="h-10 rounded-xl bg-emerald-50 border-emerald-100 font-bold text-[12px] text-emerald-700 shadow-sm focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-5 border-t border-slate-200/60 relative z-10">
                      <div className="p-4 rounded-2xl bg-amber-50/20 border border-amber-100/40 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <DatabaseIcon className="w-3 h-3 text-amber-600" />
                          <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Associação / Núcleo</span>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-amber-600/70 ml-1">Nome</Label>
                            <Input
                              value={formData.associacaoNome || ""}
                              onChange={e => setFormData({ ...formData, associacaoNome: e.target.value })}
                              placeholder="NOME"
                              className="h-9 rounded-lg bg-white border-slate-200 font-bold text-[11px] shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-amber-600/70 ml-1">CNPJ</Label>
                            <Input
                              value={formData.associacaoCnpj || ""}
                              onChange={e => setFormData({ ...formData, associacaoCnpj: e.target.value })}
                              placeholder="CNPJ"
                              className="h-9 rounded-lg bg-white border-slate-200 font-bold text-[11px] shadow-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[8px] font-black uppercase text-amber-600 ml-1">Quota (%)</Label>
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
                                onChange={e => setFormData({ ...formData, associacaoSaldo: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })}
                                className="h-10 rounded-xl bg-white border-amber-100 font-bold text-[11px] text-amber-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-indigo-50/20 border border-indigo-100/40 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">IMEI / Plataforma</span>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-indigo-500/70 ml-1">Nome</Label>
                            <Input
                              value={formData.imeiNome || "IMEI (PLATAFORMA)"}
                              onChange={e => setFormData({ ...formData, imeiNome: e.target.value })}
                              placeholder="NOME"
                              className="h-9 rounded-lg bg-white border-slate-200 font-bold text-[11px] shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-indigo-500/70 ml-1">CNPJ</Label>
                            <Input
                              value={formData.imeiCnpj || ""}
                              onChange={e => setFormData({ ...formData, imeiCnpj: e.target.value })}
                              placeholder="CNPJ"
                              className="h-9 rounded-lg bg-white border-slate-200 font-bold text-[11px] shadow-sm"
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
                                onChange={e => setFormData({ ...formData, imeiSaldo: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })}
                                className="h-10 rounded-xl bg-white border-indigo-100 font-bold text-[11px] text-indigo-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-100/30 border border-slate-200/50 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DatabaseIcon className="w-3 h-3 text-slate-500" />
                          <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider">Notas da Propriedade</span>
                        </div>
                        <textarea
                          value={formData.observacaoFazenda || ""}
                          onChange={e => setFormData({ ...formData, observacaoFazenda: e.target.value })}
                          className="w-full h-32 rounded-lg bg-white border border-slate-200 p-3 text-[11px] font-bold text-slate-700 shadow-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                          placeholder="Notas técnicas..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 pt-2">
                    <div className="space-y-6">
                      <SectionHeader
                        title="01. ORIGINAÇÃO (VOL. PRODUTOR)"
                        value={totals.origProdutor}
                        onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })}
                      />
                      <SectionTable data={formData.tabelaOriginacao || []} type="originacao" onRemove={(id) => handleRemoveItem('tabelaOriginacao', id)} />
                    </div>

                    <div className="space-y-6">
                      <SectionHeader title="02. MOVIMENTAÇÃO" value={totals.mov} isNegative onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })} />
                      <SectionTable
                        data={formData.tabelaMovimentacao || []}
                        type="movimentacao"
                        onRemove={(id) => handleRemoveItem('tabelaMovimentacao', id)}
                        onUpdateItem={(id, updates) => handleUpdateItem('tabelaMovimentacao', id, updates)}
                        maskFn={maskText}
                      />
                    </div>

                    <div className="space-y-6">
                      <SectionHeader title="03. SALDO LEGADO" value={totals.legadoTotal} isAmber onPaste={() => setPasteData({ section: 'tabelaLegado', raw: '' })} />
                      <SectionTable data={formData.tabelaLegado || []} type="legado" onRemove={(id) => handleRemoveItem('tabelaLegado', id)} />
                    </div>

                    <div className="space-y-6">
                      <SectionHeader title="04. AJUSTE IMEI" value={totals.imeiPending} isImei onPaste={() => setPasteData({ section: 'tabelaImei', raw: '' })} />
                      <SectionTable data={formData.tabelaImei || []} type="imei" onRemove={(id) => handleRemoveItem('tabelaImei', id)} />
                    </div>

                    <div className="space-y-6">
                      <SectionHeader title="05. AQUISIÇÃO" value={totals.aq} isNegative onAdd={() => setIsAddingAq(true)} />
                      <SectionTable data={formData.tabelaAquisicao || []} type="aquisicao" onRemove={(id) => handleRemoveItem('tabelaAquisicao', id)} />
                    </div>
                  </div>
                </div>

                {/* COLUNA LATERAL (DIREITA) */}
                <aside className="lg:col-span-4 space-y-10">
                  <div className="sticky top-0 space-y-10">
                    <div className="space-y-6 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="space-y-3 px-1">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500">APONTAMENTOS DE AUDITORIA</h3>
                        </div>
                        <Textarea
                          value={formData.observacao || ""}
                          onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                          placeholder="Divergências ou justificativas técnicas..."
                          className="min-h-[140px] bg-slate-50/50 border-slate-100 rounded-xl p-4 text-[11px] font-medium focus:ring-primary shadow-inner resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="px-1">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">GOVERNANÇA & STATUS</Label>
                        </div>

                        <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 relative overflow-hidden">
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Status do Produtor</Label>
                            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as EntityStatus })}>
                              <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200 font-black text-[9px] uppercase tracking-widest shadow-sm">
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
                            className="w-full h-10 rounded-lg border-[#734DCC]/20 bg-[#734DCC]/5 text-[#734DCC] font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-[#734DCC]/10 transition-all"
                          >
                            <LockIcon className="w-3.5 h-3.5" /> AJUSTE DE GOVERNANÇA
                          </Button>

                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Auditoria de Saldo</Label>
                            <Select
                              value={formData.statusAuditoriaSaldo || "valido"}
                              onValueChange={v => setFormData({ ...formData, statusAuditoriaSaldo: v as any })}
                            >
                              <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200 font-black text-[9px] uppercase tracking-widest shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 shadow-xl">
                                <SelectItem value="valido" className="font-black text-[9px] uppercase text-emerald-600">✓ SALDO VALIDADO</SelectItem>
                                <SelectItem value="inconsistente" className="font-black text-[9px] uppercase text-rose-500">⚠ DIVERGÊNCIA</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="pt-4 border-t border-slate-200/60 mt-2">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase leading-relaxed">
                              Última atualização por:<br />
                              <span className="text-slate-600 font-black">{user?.email || "AUDITOR"}</span>
                            </p>
                          </div>
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
                  onChange={e => setAjusteData({ ...ajusteData, valor: e.target.value })}
                  placeholder="EX: 493262"
                  className="h-16 rounded-2xl border-slate-100 bg-slate-50 font-black text-center text-2xl text-[#734DCC]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Justificativa da Auditoria</Label>
                <Textarea
                  value={ajusteData.justificativa}
                  onChange={e => setAjusteData({ ...ajusteData, justificativa: e.target.value })}
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
                  onChange={e => setNewAq({ ...newAq, data: e.target.value })}
                  placeholder="EX: 2018"
                  className="h-14 rounded-xl border-slate-100 bg-slate-50 font-black text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Volume (UCS)</Label>
                <Input
                  type="number"
                  value={newAq.valor}
                  onChange={e => setNewAq({ ...newAq, valor: e.target.value })}
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
      "border rounded-xl p-2.5 flex flex-col justify-between h-[60px] transition-all bg-[#1E293B]/40 hover:bg-[#1E293B]/60",
      isAmber ? "border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.1)]" : "border-white/5",
      isImei ? "border-indigo-500/20" : ""
    )}>
      <p className={cn(
        "text-[7px] font-black uppercase tracking-[0.15em] leading-none opacity-60",
        isAmber ? "text-amber-500/80" : isImei ? "text-indigo-400/80" : "text-slate-300"
      )}>
        {label}
      </p>
      <p className={cn(
        "text-[14px] font-black font-mono leading-none tracking-tight truncate",
        isNegative || (label === 'MOVIMENTAÇÃO' && value !== 0) || (label === 'AQUISIÇÃO' && value !== 0) ? "text-rose-400" :
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
    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-1 h-5 rounded-full",
          isAmber ? "bg-amber-500" : isImei ? "bg-indigo-500" : isNegative ? "bg-rose-500" : "bg-[#10B981]"
        )} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">{title}</h3>
        <Badge variant="outline" className={cn(
          "text-[9px] font-black uppercase rounded-full border-slate-100 px-2 py-0.5",
          isAmber ? "text-amber-500" : isImei ? "text-indigo-500" : isNegative ? "text-rose-500" : "text-[#10B981]"
        )}>
          {(value || 0).toLocaleString('pt-BR')} UCS
        </Badge>
      </div>
      {onAdd ? (
        <Button variant="outline" size="sm" onClick={onAdd} className="h-8 px-4 rounded-xl text-[8px] font-black uppercase gap-2 border-slate-200 hover:bg-slate-50 shadow-sm transition-all hover:border-primary/30">
          <Plus className="w-3.5 h-3.5" /> ADICIONAR REGISTRO
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onPaste} className="h-8 px-4 rounded-xl text-[8px] font-black uppercase gap-2 border-slate-200 hover:bg-slate-50 shadow-sm transition-all hover:border-primary/30">
          <Calculator className="w-3.5 h-3.5" /> COLAR DADOS
        </Button>
      )}
    </div>
  );
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
}

function SectionTable({ data, type, onRemove, onUpdateItem, maskFn = (t: any) => t || '-' }: { data: any[], type: string, onRemove?: (id: string) => void, onUpdateItem?: (id: string, updates: Partial<RegistroTabela>) => void, maskFn?: (t: string | undefined) => string }) {
  const isLegado = type === 'legado';
  const isImei = type === 'imei';
  const isMovimentacao = type === 'movimentacao';

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-x-auto technical-console-scroll custom-scrollbar">
      <Table className="min-w-[1600px]">
        <TableHeader className="bg-slate-50/50">
          <TableRow className="h-10 border-b border-slate-100">
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-6 w-[120px]">DATA</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-primary w-[140px]">DISTRIBUIÇÃO</TableHead>
            {isMovimentacao ? (
              <>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">DESTINO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">USUÁRIO DESTINO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">SITUAÇÃO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">DATA PGTO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-emerald-600 text-center">VALOR PAGO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-[200px]">OBSERVAÇÕES</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">COMPROVANTE</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-[#734DCC] text-center">NXT</TableHead>
              </>
            ) : (
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">HISTÓRICO / PLATAFORMA</TableHead>
            )}
            {isLegado ? (
              <>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-primary text-right">DISPONÍVEL</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-amber-500 text-right">RESERVADO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-rose-500 text-right">BLOQUEADO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">APOSENTADO</TableHead>
              </>
            ) : isImei ? (
              <>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-indigo-500 text-right">DÉBITO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">CRÉDITO</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-indigo-600 text-right pr-6">VOLUME (UCS)</TableHead>
              </>
            ) : (
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">VOLUME (UCS)</TableHead>
            )}
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isLegado ? 7 : isImei ? 6 : isMovimentacao ? 11 : 4} className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                Nenhum registro auditado nesta sessão
              </TableCell>
            </TableRow>
          ) : (
            data.map((row: any, i: number) => (
              <TableRow key={i} className="h-9 border-b border-slate-50 hover:bg-slate-50/50">
                <TableCell className="px-4 py-1">
                  <Input
                    value={row.data || ""}
                    onChange={e => onUpdateItem?.(row.id, { data: e.target.value })}
                    className="h-7 w-24 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-slate-500 rounded-lg focus:bg-white"
                  />
                </TableCell>
                <TableCell className="px-4 py-1">
                  <Input
                    value={row.dist || ""}
                    onChange={e => onUpdateItem?.(row.id, { dist: e.target.value })}
                    placeholder="Distribuição"
                    className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-primary focus:ring-primary rounded-lg focus:bg-white"
                  />
                </TableCell>
                <TableCell className="px-4 py-1">
                  <Input
                    value={row.plataforma || row.nome || ""}
                    onChange={e => onUpdateItem?.(row.id, { plataforma: e.target.value })}
                    placeholder={isMovimentacao ? "Destino" : "Histórico / Plataforma"}
                    className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-bold text-slate-600 rounded-lg uppercase focus:bg-white"
                  />
                </TableCell>

                {isMovimentacao && (
                  <>
                    <TableCell className="px-4 py-1 min-w-[150px]">
                      <Input
                        value={row.destino || ""}
                        onChange={e => onUpdateItem?.(row.id, { destino: e.target.value })}
                        placeholder="Destino"
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-bold text-slate-600 rounded-lg uppercase min-w-[150px] focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="text-center px-4 py-1">
                      <Select
                        value={row.statusAuditoria || "Pendente"}
                        onValueChange={(v) => onUpdateItem?.(row.id, { statusAuditoria: v as AuditoriaStatus })}
                      >
                        <SelectTrigger className="h-7 rounded-lg bg-slate-50/50 text-[8px] font-black uppercase border-slate-100 min-w-[130px] focus:bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                          <SelectItem value="Concluido" className="text-[8px] font-black uppercase text-emerald-600">✓ CONCLUÍDO</SelectItem>
                          <SelectItem value="Pendente" className="text-[8px] font-black uppercase text-amber-500">⚠ PENDENTE</SelectItem>
                          <SelectItem value="Cancelado" className="text-[8px] font-black uppercase text-rose-500">✗ CANCELADO</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center px-4 py-1">
                      <Input
                        value={row.dataPagamento || ""}
                        onChange={e => onUpdateItem?.(row.id, { dataPagamento: e.target.value })}
                        placeholder="Ex: 01/01/2025"
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-bold text-slate-600 rounded-lg text-center min-w-[110px] focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="text-center px-4 py-1">
                      <Input
                        type="text"
                        value={formatCurrency(row.valorPago || 0)}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "");
                          const num = parseFloat(val) / 100;
                          onUpdateItem?.(row.id, { valorPago: num });
                        }}
                        className="h-7 bg-emerald-50/50 border-emerald-100 text-[9px] font-bold text-emerald-700 rounded-lg text-right min-w-[110px] focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="text-center px-4 py-1 min-w-[200px]">
                      <Input
                        value={row.observacaoTransacao || ""}
                        onChange={e => onUpdateItem?.(row.id, { observacaoTransacao: e.target.value })}
                        placeholder="Detalhes..."
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-bold text-slate-600 rounded-lg min-w-[200px] focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="text-center px-4 py-1 min-w-[150px]">
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Link do comprovante..."
                          value={row.linkComprovante || ""}
                          onChange={(e) => onUpdateItem?.(row.id, { linkComprovante: e.target.value })}
                          className="h-7 bg-slate-50/50 text-[9px] rounded-lg border-slate-100 min-w-[140px] focus:bg-white"
                        />
                        {row.linkComprovante && (
                          <a href={row.linkComprovante} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 text-emerald-500 hover:scale-110 transition-all" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-4 py-1 min-w-[140px]">
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Link NXT / Hash..."
                          value={row.linkNxt || ""}
                          onChange={(e) => onUpdateItem?.(row.id, { linkNxt: e.target.value })}
                          className="h-7 bg-slate-50/50 text-[9px] rounded-lg border-slate-100 border-[#734DCC]/10 min-w-[130px] focus:bg-white"
                        />
                        {row.linkNxt && (
                          <a href={row.linkNxt.startsWith('http') ? row.linkNxt : `https://nxtportal.org/transactions/${row.linkNxt}`} target="_blank" rel="noopener noreferrer">
                            <QrCode className="w-3 h-3 text-[#734DCC] hover:scale-110 transition-all" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}

                {isLegado ? (
                  <>
                    <TableCell className="px-4 py-1">
                      <Input
                        type="number"
                        value={row.disponivel ?? ""}
                        onChange={e => onUpdateItem?.(row.id, { disponivel: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-primary text-right rounded-lg focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1">
                      <Input
                        type="number"
                        value={row.reservado ?? ""}
                        onChange={e => onUpdateItem?.(row.id, { reservado: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-amber-500 text-right rounded-lg focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1">
                      <Input
                        type="number"
                        value={row.bloqueado ?? ""}
                        onChange={e => onUpdateItem?.(row.id, { bloqueado: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-rose-500 text-right rounded-lg focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1 pr-6">
                      <Input
                        type="number"
                        value={row.aposentado ?? ""}
                        onChange={e => onUpdateItem?.(row.id, { aposentado: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-slate-400 text-right rounded-lg focus:bg-white"
                      />
                    </TableCell>
                  </>
                ) : isImei ? (
                  <>
                    <TableCell className="px-4 py-1">
                      <Input
                        type="number"
                        value={row.valorDebito ?? ""}
                        onChange={e => onUpdateItem?.(row.id, { valorDebito: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-indigo-500 text-right rounded-lg focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1">
                      <Input
                        type="number"
                        value={row.valorCredito ?? ""}
                        onChange={e => onUpdateItem?.(row.id, { valorCredito: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-bold text-slate-400 text-right rounded-lg focus:bg-white"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-1 text-right font-mono font-black text-[10px] pr-6 text-indigo-600">
                      {((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR')}
                    </TableCell>
                  </>
                ) : (
                  <TableCell className="px-4 py-1 pr-6">
                    <Input
                      type="number"
                      value={row.valor ?? ""}
                      onChange={e => onUpdateItem?.(row.id, { valor: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                      className="h-7 bg-slate-50/50 border-slate-100 text-[10px] font-mono font-black text-right rounded-lg focus:bg-white"
                    />
                  </TableCell>
                )}
                <TableCell className="pr-6">
                  {onRemove && (
                    <Button variant="ghost" size="icon" onClick={() => onRemove(row.id)} className="h-7 w-7 text-slate-200 hover:text-rose-500">
                      <Trash2 className="w-3 h-3" />
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