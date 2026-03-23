"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela, AuditoriaStatus, EntityStatus } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
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
  Lock,
  UserCheck,
  Ban,
  UserX,
  UserCheck2
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
  
  const { user } = useUser();
  
  useEffect(() => {
    if (entity) {
      setFormData(entity);
    }
  }, [entity]);

  useEffect(() => {
    const hasUnpaid = (formData.tabelaMovimentacao || []).some(m => m.statusAuditoria === 'Não Pago');
    if (hasUnpaid && formData.statusAuditoriaSaldo !== 'inconsistente') {
      setFormData(prev => ({ ...prev, statusAuditoriaSaldo: 'inconsistente' }));
    }
  }, [formData.tabelaMovimentacao, formData.statusAuditoriaSaldo]);

  const totals = useMemo(() => {
    const sumVal = (arr?: RegistroTabela[]) => (arr || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const orig = sumVal(formData.tabelaOriginacao);
    const mov = (formData.tabelaMovimentacao || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    const aq = sumVal(formData.tabelaAquisicao);
    
    const imeiCredits = (formData.tabelaImei || []).reduce((acc, curr) => acc + (curr.valorCredito || 0), 0);
    const imeiDebits = (formData.tabelaImei || []).reduce((acc, curr) => acc + (curr.valorDebito || 0), 0);
    const imeiPending = imeiDebits - imeiCredits;

    const aposentado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0);
    const bloqueado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0);
    const legDisp = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const legRes = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0);
    const legadoTotal = legDisp + legRes;

    const finalCalculated = orig - mov - aposentado - bloqueado - aq;
    const final = formData.ajusteRealizado ? (formData.valorAjusteManual || 0) : finalCalculated;

    return { 
      orig, mov, aq, imeiPending, legadoTotal, aposentado, bloqueado, final
    };
  }, [formData]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleSave = () => {
    if (!entity) return;
    onUpdate(entity.id, {
      ...formData,
      originacao: totals.orig,
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

      switch (pasteData.section) {
        case 'tabelaLegado':
          return {
            id: `LEG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            data: parts[1]?.trim() || '',
            plataforma: parts[0]?.trim() || '',
            disponivel: parseVal(parts[4]),
            reservado: parseVal(parts[5]),
            bloqueado: parseVal(parts[6]),
            aposentado: parseVal(parts[7]),
          };
        case 'tabelaImei':
          const cred = parseVal(parts[parts.length - 2]);
          const deb = parseVal(parts[parts.length - 1]);
          return { 
            id: `IMEI-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: parts[1]?.trim() || '', 
            destino: parts[2]?.trim() || '', 
            valorCredito: cred, 
            valorDebito: deb, 
            valor: deb - cred
          };
        case 'tabelaOriginacao':
          return { 
            id: `ORIG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: parts[1]?.trim() || '', 
            destino: parts[2]?.trim() || '', 
            valor: parseVal(parts[parts.length - 1]) 
          };
        default:
          return { 
            id: `MOV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: parts[1]?.trim() || '', 
            destino: parts[2]?.trim() || '', 
            valor: parseVal(parts[parts.length - 1]),
            statusAuditoria: 'Pendente'
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
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Console de Auditoria de Saldo - {entity.nome}</DialogTitle>
          <DialogDescription>Detalhamento técnico de conformidade e auditoria de UCS.</DialogDescription>
        </DialogHeader>

        {/* RELATÓRIO EXECUTIVO A4 PRINT */}
        <div className="printable-audit-report hidden print:block bg-white text-slate-900 p-0 font-body">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-5">
            <div className="flex items-center gap-0">
               <div className="relative w-14 h-14">
                 <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
               </div>
               <span className="text-[32px] font-black text-amber-500 leading-none -ml-2">bmv</span>
            </div>
            <div className="text-right">
              <h2 className="text-[14px] font-black uppercase tracking-tight leading-tight">RELATÓRIO EXECUTIVO DE AUDITORIA</h2>
              <p className="text-[9px] font-black uppercase text-slate-900 tracking-widest mt-0.5">PROTOCOLO DE SALDO: {entity.id}</p>
              <p className="text-[7px] text-slate-400 font-bold mt-0.5 uppercase">{new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-3">
              <h3 className="text-[8px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1 tracking-[0.2em]">IDENTIFICAÇÃO DA ENTIDADE</h3>
              <div className="space-y-2">
                <p className="text-[16px] font-black text-slate-900 leading-none tracking-tighter uppercase">{entity.nome}</p>
                <div className="text-[8px] space-y-1 font-bold uppercase tracking-tight">
                  <p><strong className="text-slate-400 font-black mr-2">DOCUMENTO REGISTRADO:</strong> {entity.documento}</p>
                  <p><strong className="text-slate-400 font-black mr-2">STATUS CADASTRAL:</strong> {entity.status?.toUpperCase()}</p>
                  <p><strong className="text-slate-400 font-black mr-2">AUDITOR RESPONSÁVEL:</strong> {user?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[8px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1 tracking-[0.2em]">RESUMO DE SALDOS (UCS)</h3>
              <div className="flex justify-between items-start gap-3">
                <div className="text-[8px] space-y-2 font-bold uppercase flex-1">
                  <div>
                    <p className="text-slate-400 font-black text-[6px] mb-0.5">ORIGINAÇÃO TOTAL</p>
                    <p className="text-base font-black text-slate-900">{totals.orig.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-black text-[6px] mb-0.5">SALDO FINAL AUDITADO</p>
                    <p className="text-base font-black text-primary">{totals.final.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 shrink-0 shadow-sm">
                  <QrCode className="w-12 h-12 text-slate-200" />
                  <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest">CONFORMIDADE</p>
                </div>
              </div>
            </div>
          </div>

          {formData.ajusteRealizado && (
             <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
               <h3 className="text-[8px] font-black text-emerald-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                 <ShieldCheck className="w-3 h-3" /> AJUSTE DE GOVERNANÇA APLICADO
               </h3>
               <div className="grid grid-cols-2 gap-4 text-[8px] font-bold uppercase">
                 <p><span className="text-slate-400">SALDO AJUSTADO:</span> {formData.valorAjusteManual?.toLocaleString('pt-BR')} UCS</p>
                 <p><span className="text-slate-400">DATA DO AJUSTE:</span> {new Date(formData.dataAjuste!).toLocaleString('pt-BR')}</p>
                 <p className="col-span-2"><span className="text-slate-400">JUSTIFICATIVA:</span> {formData.justificativaAjuste}</p>
                 <p className="col-span-2"><span className="text-slate-400">RESPONSÁVEL:</span> {formData.usuarioAjuste}</p>
               </div>
             </div>
          )}

          <div className="space-y-4">
            <ReportTable title="01. DEMONSTRATIVO DE ORIGINAÇÃO" data={formData.tabelaOriginacao} type="originacao" />
            <ReportTable title="02. DEMONSTRATIVO DE MOVIMENTAÇÃO" data={formData.tabelaMovimentacao} isNegative type="movimentacao" />
            <ReportTable title="03. DEMONSTRATIVO DE SALDO LEGADO" data={formData.tabelaLegado} isLegado type="legado" />
            <ReportTable title="04. AJUSTE IMEI" data={formData.tabelaImei} isImei type="imei" />
            <ReportTable title="05. AQUISIÇÃO" data={formData.tabelaAquisicao} isNegative type="aquisicao" />
          </div>

          <div className="mt-8 flex justify-between items-end">
            <div className="text-[8px] text-[#10B981] font-black flex items-center gap-1.5 uppercase tracking-tight">
              <ShieldCheck className="w-3.5 h-3.5" /> SALDO VALIDADO PELO LEDGERTRUST
            </div>
            <div className="text-right">
              <div className="border-t border-slate-900 w-56 pt-2">
                <p className="text-[8px] font-black uppercase text-slate-900 tracking-tight">RESPONSÁVEL TÉCNICO BMV</p>
                <p className="text-[6px] text-slate-400 uppercase font-bold">Assinado digitalmente via LedgerTrust</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONSOLE UI - INTERFACE TÉCNICA (HIDDEN EM PRINT) */}
        <div className="flex-1 flex flex-col overflow-hidden print:hidden bg-[#0F172A]">
          <div className="p-8 pb-10 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-[#10B981]/20 rounded-md flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981]">AUDITORIA TÉCNICA BMV</p>
                </div>
                <h1 className="text-[32px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
                <div className="flex items-center gap-4">
                  <p className="text-[13px] font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
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

              <div className="bg-[#1E293B] border border-white/5 rounded-[2rem] p-6 min-w-[340px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/10 blur-3xl -mr-16 -mt-16"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Saldo Final Auditado</p>
                 <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-[48px] font-black text-white tracking-tighter leading-none">{totals.final.toLocaleString('pt-BR')}</span>
                    <span className="text-[12px] font-black text-[#10B981] uppercase tracking-widest">UCS</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              <StatBox label="ORIGINAÇÃO" value={totals.orig} />
              <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative />
              <StatBox label="APOSENTADO" value={totals.aposentado} isNegative />
              <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
              <StatBox label="AQUISIÇÃO" value={totals.aq} isNegative />
              <StatBox label="AJUSTE IMEI" value={totals.imeiPending} isImei />
              <StatBox label="SALDO LEGADO" value={totals.legadoTotal} isAmber />
              <StatBox label="DISPONÍVEL" value={totals.final} isHighlight />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-10 space-y-14">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-[#10B981]" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">APONTAMENTOS DE AUDITORIA</h3>
                    </div>
                    <Textarea 
                      value={formData.observacao || ""} 
                      onChange={e => setFormData({...formData, observacao: e.target.value})}
                      placeholder="Descreva aqui divergências, inconsistências ou justificativas técnicas..."
                      className="min-h-[140px] bg-slate-50 border-slate-100 rounded-2xl p-6 text-[12px] font-medium focus:ring-primary shadow-inner resize-none"
                    />
                 </div>
                 <div className="space-y-6">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">CONTROLE DE GOVERNANÇA</Label>
                    <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Status do Produtor</Label>
                        <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as EntityStatus})}>
                          <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-100 font-black text-[11px] uppercase tracking-widest shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-xl">
                            <SelectItem value="disponivel" className="font-bold text-[10px] uppercase">
                              <div className="flex items-center gap-2"><UserCheck2 className="w-3 h-3 text-emerald-500" /> APTO / DISPONÍVEL</div>
                            </SelectItem>
                            <SelectItem value="bloqueado" className="font-bold text-[10px] uppercase">
                              <div className="flex items-center gap-2"><Ban className="w-3 h-3 text-rose-500" /> BLOQUEADO</div>
                            </SelectItem>
                            <SelectItem value="inapto" className="font-bold text-[10px] uppercase">
                              <div className="flex items-center gap-2"><UserX className="w-3 h-3 text-amber-500" /> INAPTO</div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={() => setIsAjustando(true)} 
                        variant="outline" 
                        className="w-full h-14 rounded-2xl border-[#734DCC]/20 bg-[#734DCC]/5 text-[#734DCC] font-black uppercase text-[11px] tracking-widest gap-3 hover:bg-[#734DCC]/10"
                      >
                        <Lock className="w-4 h-4" /> AJUSTE GERAL (AUTORIZAÇÃO)
                      </Button>
                      
                      <div className="space-y-2">
                         <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Auditoria de Saldo</Label>
                         <Select 
                          value={formData.statusAuditoriaSaldo || "valido"} 
                          onValueChange={v => setFormData({...formData, statusAuditoriaSaldo: v as any})}
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-100 font-black text-[11px] uppercase tracking-widest shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-xl">
                            <SelectItem value="valido" className="font-bold text-[10px] uppercase">✓ SALDO VALIDADO</SelectItem>
                            <SelectItem value="inconsistente" className="font-bold text-[10px] uppercase text-rose-500">⚠ DIVERGÊNCIA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                <SectionHeader title="01. ORIGINAÇÃO" value={totals.orig} onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })} />
                <SectionTable data={formData.tabelaOriginacao || []} type="originacao" onRemove={(id) => handleRemoveItem('tabelaOriginacao', id)} />
              </div>

              <div className="space-y-8">
                <SectionHeader title="02. MOVIMENTAÇÃO" value={totals.mov} isNegative onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })} />
                <SectionTable 
                  data={formData.tabelaMovimentacao || []} 
                  type="movimentacao" 
                  onRemove={(id) => handleRemoveItem('tabelaMovimentacao', id)}
                  onUpdateItem={(id, updates) => handleUpdateItem('tabelaMovimentacao', id, updates)}
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
          </ScrollArea>

          <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 px-8 h-14">
              CANCELAR
            </Button>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrint} className="h-14 px-10 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[11px] tracking-widest text-slate-700 hover:bg-white transition-all shadow-sm">
                <Printer className="w-4 h-4 mr-2" /> RELATÓRIO EXECUTIVO
              </Button>
              <Button onClick={handleSave} className="h-14 px-12 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">
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
                <Lock className="w-8 h-8 text-[#734DCC]" />
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

function ReportTable({ title, data, isNegative, isLegado, isImei, type }: any) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-1.5">
       <h4 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-1">{title}</h4>
       <table className="w-full text-left text-[7px]">
          <thead className="bg-[#F8FAFC]">
            <tr className="border-b border-slate-100">
              <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500">REFERÊNCIA</th>
              <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500">HISTÓRICO</th>
              {isLegado ? (
                <>
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">DISP.</th>
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">RES.</th>
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">BLOQ.</th>
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">APOS.</th>
                </>
              ) : isImei ? (
                <>
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-indigo-500 text-right">DÉBITO</th>
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">CRÉDITO</th>
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">VOLUME</th>
                </>
              ) : (
                <>
                  {type === 'movimentacao' && <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500">USUÁRIO DESTINO</th>}
                  {type === 'movimentacao' && <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500">STATUS</th>}
                  <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">VOLUME (UCS)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="font-bold uppercase">
            {data.map((row: any, i: number) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="px-2 py-1 font-mono text-slate-400">{row.data || row.dist || '-'}</td>
                <td className="px-2 py-1 text-slate-600 truncate max-w-[180px]">{type === 'movimentacao' ? (row.nome || row.plataforma || '-') : (row.destino || row.plataforma || row.nome || '-')}</td>
                {isLegado ? (
                  <>
                    <td className="px-2 py-1 text-right text-primary">{(row.disponivel || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1 text-right text-amber-600">{(row.reservado || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1 text-right text-rose-600">{(row.bloqueado || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{(row.aposentado || 0).toLocaleString('pt-BR')}</td>
                  </>
                ) : isImei ? (
                  <>
                    <td className="px-2 py-1 text-right text-indigo-500">{(row.valorDebito || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{(row.valorCredito || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1 text-right font-black text-indigo-600">{((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR')}</td>
                  </>
                ) : (
                  <>
                    {type === 'movimentacao' && (
                      <td className="px-2 py-1 text-slate-600 truncate max-w-[180px]">{row.destino || '-'}</td>
                    )}
                    {type === 'movimentacao' && (
                      <td className="px-2 py-1">
                        <span className={cn(
                          "px-1 py-0.5 rounded-sm",
                          row.statusAuditoria === 'Pago' ? "bg-emerald-50 text-emerald-600" :
                          row.statusAuditoria === 'Não Pago' ? "bg-rose-50 text-rose-600" :
                          "bg-slate-50 text-slate-400"
                        )}>
                          {row.statusAuditoria || 'PENDENTE'}
                        </span>
                      </td>
                    )}
                    <td className={cn("px-2 py-1 text-right font-black", isNegative ? "text-rose-600" : "text-slate-900")}>
                      {isLegado ? ((row.disponivel || 0) + (row.reservado || 0)).toLocaleString('pt-BR') : 
                       type === 'imei' ? ((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR') :
                       row.valor?.toLocaleString('pt-BR')}
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
      "border rounded-[1.25rem] p-4 flex flex-col justify-between h-[85px] transition-all bg-[#1E293B]/50",
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
        "text-[16px] font-black font-mono leading-none tracking-tighter truncate",
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

function SectionTable({ data, type, onRemove, onUpdateItem }: { data: any[], type: string, onRemove?: (id: string) => void, onUpdateItem?: (id: string, updates: Partial<RegistroTabela>) => void }) {
  const isLegado = type === 'legado';
  const isImei = type === 'imei';
  const isMovimentacao = type === 'movimentacao';

  return (
    <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="h-12 border-b border-slate-100">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-6">REFERÊNCIA</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">HISTÓRICO / PLATAFORMA</TableHead>
            {isMovimentacao && (
              <>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">USUÁRIO DESTINO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">STATUS PGTO</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">COMPROVANTE</TableHead>
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
              <TableCell colSpan={isLegado ? 7 : isImei ? 6 : isMovimentacao ? 6 : 4} className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                Nenhum registro auditado nesta sessão
              </TableCell>
            </TableRow>
          ) : (
            data.map((row: any, i: number) => (
              <TableRow key={i} className="h-12 border-b border-slate-50 hover:bg-slate-50/50">
                <TableCell className="px-6 py-3 font-mono text-[11px] text-slate-400">{row.dist || row.data || '-'}</TableCell>
                <TableCell className="px-6 py-3 font-bold text-[11px] uppercase text-slate-600 truncate max-w-[200px]">{isMovimentacao ? (row.nome || row.plataforma || '-') : (row.destino || row.plataforma || row.nome || '-')}</TableCell>
                
                {isMovimentacao && (
                  <>
                    <TableCell className="px-6 py-3 font-bold text-[11px] uppercase text-slate-600 truncate max-w-[200px]">{row.destino || '-'}</TableCell>
                    <TableCell className="text-center px-4 py-2">
                      <Select 
                        value={row.statusAuditoria || "Pendente"} 
                        onValueChange={(v) => onUpdateItem?.(row.id, { statusAuditoria: v as AuditoriaStatus })}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 text-[9px] font-black uppercase border-slate-100 min-w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                          <SelectItem value="Pago" className="text-[9px] font-black uppercase text-emerald-600">✓ PAGO (OK)</SelectItem>
                          <SelectItem value="Pendente" className="text-[9px] font-black uppercase text-amber-500">⚠ AUSENTE</SelectItem>
                          <SelectItem value="Não Pago" className="text-[9px] font-black uppercase text-rose-500">✗ NÃO PAGO</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Input 
                          placeholder="Link do comprovante..." 
                          value={row.linkComprovante || ""} 
                          onChange={(e) => onUpdateItem?.(row.id, { linkComprovante: e.target.value })}
                          className="h-10 bg-slate-50 text-[10px] rounded-xl border-slate-100"
                        />
                        {row.linkComprovante && (
                          <a href={row.linkComprovante} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}

                {isLegado ? (
                  <>
                    <TableCell className="px-4 py-3 text-right font-mono font-black text-primary">{(row.disponivel || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono font-black text-amber-500">{(row.reservado || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono font-black text-rose-500">{(row.bloqueado || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono font-black text-slate-400 pr-6">{(row.aposentado || 0).toLocaleString('pt-BR')}</TableCell>
                  </>
                ) : isImei ? (
                  <>
                    <TableCell className="px-4 py-3 text-right font-mono font-black text-indigo-500">{(row.valorDebito || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono font-black text-slate-400">{(row.valorCredito || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono font-black text-[12px] pr-6 text-indigo-600">
                      {((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR')}
                    </TableCell>
                  </>
                ) : (
                  <TableCell className="px-4 py-3 text-right font-mono font-black text-[12px] pr-6 text-slate-900">
                    {(row.valor || 0).toLocaleString('pt-BR')}
                  </TableCell>
                )}
                <TableCell className="pr-6">
                  {onRemove && (
                    <Button variant="ghost" size="icon" onClick={() => onRemove(row.id)} className="h-10 w-10 text-slate-200 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
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