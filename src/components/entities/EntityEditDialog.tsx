
"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Printer, 
  Calculator, 
  ShieldCheck, 
  Save, 
  MessageSquare,
  QrCode,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const { user } = useUser();
  
  useEffect(() => {
    if (entity) {
      setFormData(entity);
    }
  }, [entity]);

  const totals = useMemo(() => {
    const sumVal = (arr?: RegistroTabela[]) => (arr || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    const sumCredits = (arr?: RegistroTabela[]) => (arr || []).reduce((acc, curr) => acc + (curr.valorCredito || 0), 0);
    const sumDebits = (arr?: RegistroTabela[]) => (arr || []).reduce((acc, curr) => acc + (curr.valorDebito || 0), 0);
    
    const orig = sumVal(formData.tabelaOriginacao);
    const mov = sumVal(formData.tabelaMovimentacao);
    const aq = sumVal(formData.tabelaAquisicao);
    
    const imeiCredits = sumCredits(formData.tabelaImei);
    const imeiDebits = sumDebits(formData.tabelaImei);
    const imeiPending = imeiDebits - imeiCredits;

    const aposentado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0);
    const bloqueado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0);
    const legDisp = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const legRes = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0);
    const legadoTotal = legDisp + legRes + bloqueado + aposentado;

    // FÓRMULA SOLICITADA: Originação - Movimentação - Aposentadorias - Bloqueios - Aquisições
    const final = orig - mov - aposentado - bloqueado - aq;

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
            data: parts[0]?.trim() || '',
            plataforma: parts[1]?.trim() || '',
            nome: parts[2]?.trim() || '',
            documento: parts[3]?.trim() || '',
            disponivel: parseVal(parts[4]),
            reservado: parseVal(parts[5]),
            bloqueado: parseVal(parts[6]),
            aposentado: parseVal(parts[7]),
          };
        case 'tabelaImei':
          const valDeb = parseVal(parts[parts.length - 1]);
          return { 
            id: `IMEI-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: parts[1]?.trim() || '', 
            destino: parts[2]?.trim() || '', 
            valorCredito: 0, 
            valorDebito: valDeb, 
            valor: valDeb 
          };
        case 'tabelaAquisicao':
          return { 
            id: `AQ-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, 
            dist: parts[0]?.trim() || '', 
            data: parts[1]?.trim() || '', 
            destino: parts[2]?.trim() || '', 
            valor: parseVal(parts[parts.length - 1]) 
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
            valor: parseVal(parts[parts.length - 1]) 
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

          <div className="space-y-4">
            {formData.tabelaOriginacao && formData.tabelaOriginacao.length > 0 && (
              <ReportTable title="01. DEMONSTRATIVO DE ORIGINAÇÃO" data={formData.tabelaOriginacao} />
            )}
            {formData.tabelaMovimentacao && formData.tabelaMovimentacao.length > 0 && (
              <ReportTable title="02. DEMONSTRATIVO DE MOVIMENTAÇÃO" data={formData.tabelaMovimentacao} isNegative />
            )}
            {formData.tabelaLegado && formData.tabelaLegado.length > 0 && (
              <ReportTable title="03. DEMONSTRATIVO DE SALDO LEGADO" data={formData.tabelaLegado} isLegado />
            )}
            {formData.tabelaImei && formData.tabelaImei.length > 0 && (
              <ReportTable title="04. AJUSTE IMEI" data={formData.tabelaImei} isImei />
            )}
            {formData.tabelaAquisicao && formData.tabelaAquisicao.length > 0 && (
              <ReportTable title="05. AQUISIÇÃO" data={formData.tabelaAquisicao} isNegative />
            )}
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
          <div className="p-6 pb-8 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-[#10B981]/20 rounded-md flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#10B981]">AUDITORIA TÉCNICA BMV</p>
                </div>
                <h1 className="text-[24px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
                <p className="text-[11px] font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
              </div>

              <div className="bg-[#1E293B] border border-white/5 rounded-[1.5rem] p-5 min-w-[300px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/10 blur-3xl -mr-16 -mt-16"></div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Saldo Final Auditado</p>
                 <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-[36px] font-black text-white tracking-tighter">{totals.final.toLocaleString('pt-BR')}</span>
                    <span className="text-[10px] font-black text-[#10B981] uppercase tracking-widest">UCS</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5">
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
            <div className="p-8 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">APONTAMENTOS DE AUDITORIA</h3>
                    </div>
                    <Textarea 
                      value={formData.observacao || ""} 
                      onChange={e => setFormData({...formData, observacao: e.target.value})}
                      placeholder="Descreva aqui divergências, inconsistências ou justificativas técnicas..."
                      className="min-h-[100px] bg-slate-50 border-slate-100 rounded-xl p-5 text-[11px] font-medium focus:ring-primary shadow-inner resize-none"
                    />
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">STATUS DA CONFORMIDADE</Label>
                    <Select 
                      value={formData.statusAuditoriaSaldo || "valido"} 
                      onValueChange={v => setFormData({...formData, statusAuditoriaSaldo: v as any})}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-[10px] uppercase tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valido" className="font-bold text-[10px] uppercase">✓ SALDO VALIDADO</SelectItem>
                        <SelectItem value="inconsistente" className="font-bold text-[10px] uppercase text-rose-500">⚠ DIVERGÊNCIA</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-6">
                <SectionHeader title="01. ORIGINAÇÃO" value={totals.orig} onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })} />
                <SectionTable data={formData.tabelaOriginacao || []} type="originacao" />
              </div>

              <div className="space-y-6">
                <SectionHeader title="02. MOVIMENTAÇÃO" value={totals.mov} isNegative onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })} />
                <SectionTable data={formData.tabelaMovimentacao || []} type="movimentacao" />
              </div>

              <div className="space-y-6">
                <SectionHeader title="03. SALDO LEGADO" value={totals.legadoTotal} isAmber onPaste={() => setPasteData({ section: 'tabelaLegado', raw: '' })} />
                <SectionTable data={formData.tabelaLegado || []} type="legado" />
              </div>

              <div className="space-y-6">
                <SectionHeader title="04. AJUSTE IMEI" value={totals.imeiPending} isImei onPaste={() => setPasteData({ section: 'tabelaImei', raw: '' })} />
                <SectionTable data={formData.tabelaImei || []} type="imei" />
              </div>

              <div className="space-y-6">
                <SectionHeader title="05. AQUISIÇÃO" value={totals.aq} isNegative onPaste={() => setPasteData({ section: 'tabelaAquisicao', raw: '' })} />
                <SectionTable data={formData.tabelaAquisicao || []} type="aquisicao" />
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 px-6 h-12">
              CANCELAR
            </Button>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrint} className="h-12 px-8 rounded-xl border-slate-100 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-slate-700 hover:bg-white transition-all">
                <Printer className="w-4 h-4 mr-2" /> RELATÓRIO EXECUTIVO
              </Button>
              <Button onClick={handleSave} className="h-12 px-10 rounded-xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">
                <Save className="w-4 h-4 mr-2" /> SALVAR NO LEDGER
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL DE COLAGEM TÉCNICA */}
        {pasteData && (
          <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
            <DialogContent className="max-w-xl rounded-3xl p-8 space-y-4">
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
  return (
    <div className="space-y-1.5">
       <h4 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-1">{title}</h4>
       <table className="w-full text-left text-[7px]">
          <thead className="bg-[#F8FAFC]">
            <tr className="border-b border-slate-100">
              <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500">REFERÊNCIA</th>
              <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500">HISTÓRICO</th>
              <th className="px-2 py-1 font-black uppercase tracking-widest text-slate-500 text-right">VOLUME (UCS)</th>
            </tr>
          </thead>
          <tbody className="font-bold uppercase">
            {data.map((row: any, i: number) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="px-2 py-1 font-mono text-slate-400">{row.data || row.dist || '-'}</td>
                <td className="px-2 py-1 text-slate-600 truncate max-w-[250px]">{row.destino || row.plataforma || row.nome || '-'}</td>
                <td className={cn("px-2 py-1 text-right font-black", isNegative ? "text-rose-600" : "text-slate-900")}>
                  {isLegado ? ((row.disponivel || 0) + (row.reservado || 0)).toLocaleString('pt-BR') : 
                   type === 'imei' ? ((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR') :
                   row.valor?.toLocaleString('pt-BR')}
                </td>
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
      "border rounded-xl p-3 flex flex-col justify-between h-[75px] transition-all bg-[#1E293B]/50",
      isAmber ? "border-amber-500/30 ring-1 ring-amber-500/10" : "border-white/5",
      isImei ? "border-indigo-500/30" : ""
    )}>
      <div className="flex justify-between items-start w-full">
        <p className={cn(
          "text-[7px] font-black uppercase tracking-widest leading-none",
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

function SectionHeader({ title, value, onPaste, isNegative, isAmber, isImei }: any) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-1 h-5 rounded-full",
          isAmber ? "bg-amber-500" : isImei ? "bg-indigo-500" : isNegative ? "bg-rose-500" : "bg-[#10B981]"
        )} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
        <Badge variant="outline" className={cn(
          "text-[9px] font-black uppercase rounded-full border-slate-100",
          isAmber ? "text-amber-500" : isImei ? "text-indigo-500" : isNegative ? "text-rose-500" : "text-[#10B981]"
        )}>
          {(value || 0).toLocaleString('pt-BR')} UCS
        </Badge>
      </div>
      <Button variant="outline" size="sm" onClick={onPaste} className="h-8 px-3 rounded-lg text-[8px] font-black uppercase gap-2 border-slate-200 hover:bg-slate-50">
        <Calculator className="w-3 h-3" /> COLAR DADOS
      </Button>
    </div>
  );
}

function SectionTable({ data, type }: { data: any[], type: string }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="h-10 border-b border-slate-100">
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">REFERÊNCIA</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">HISTÓRICO / PLATAFORMA</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">VOLUME (UCS)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-slate-300 font-bold uppercase text-[9px] tracking-widest">
                Nenhum registro auditado nesta sessão
              </TableCell>
            </TableRow>
          ) : (
            data.map((row: any, i: number) => (
              <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-slate-50/50">
                <TableCell className="px-4 py-2 font-mono text-[10px] text-slate-400">{row.dist || row.data || '-'}</TableCell>
                <TableCell className="px-4 py-2 font-bold text-[10px] uppercase text-slate-600">{row.destino || row.plataforma || row.nome || '-'}</TableCell>
                <TableCell className="px-4 py-2 text-right font-mono font-black text-[11px] pr-6 text-slate-900">
                   {type === 'imei' ? ((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR') : 
                    type === 'legado' ? ((row.disponivel || 0) + (row.reservado || 0)).toLocaleString('pt-BR') :
                    row.valor?.toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
