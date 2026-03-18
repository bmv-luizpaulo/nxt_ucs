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
  LayoutGrid
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
    const aq = (formData.tabelaAquisicao || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const imeiCredits = sumCredits(formData.tabelaImei);
    const imeiDebits = sumDebits(formData.tabelaImei);
    const imeiPending = imeiDebits - imeiCredits;

    const aposentado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0);
    const bloqueado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0);
    const legDisp = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const legRes = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0);
    const legadoTotal = legDisp + legRes;

    const final = orig + mov - aq - aposentado - bloqueado;
    const movPercentage = orig !== 0 ? ((Math.abs(mov) / Math.abs(orig)) * 100).toFixed(1) : "0.0";

    return { 
      orig, mov, aq, imeiPending, legadoTotal, aposentado, bloqueado, final, movPercentage 
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
        case 'tabelaImeiDebito':
          const valDeb = parseVal(parts[parts.length - 1]);
          return { id: `IMEI-D-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, dist: parts[0]?.trim() || '', data: parts[1]?.trim() || '', destino: parts[2]?.trim() || '', valorCredito: 0, valorDebito: valDeb, valor: valDeb };
        case 'tabelaImeiCredito':
          const valCred = parseVal(parts[parts.length - 1]);
          return { id: `IMEI-C-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, dist: parts[0]?.trim() || '', data: parts[1]?.trim() || '', destino: parts[2]?.trim() || '', valorCredito: valCred, valorDebito: 0, valor: -valCred };
        case 'tabelaOriginacao':
          let volOrig = 0;
          for (let j = parts.length - 1; j >= 0; j--) {
            const val = parseVal(parts[j]);
            if (val !== 0) { volOrig = val; break; }
          }
          return { id: `ORIG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, dist: parts[0]?.trim() || '', data: parts[1]?.trim() || '', destino: parts[2]?.trim() || '', valor: volOrig };
        default:
          return { id: `MOV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, dist: parts[0]?.trim() || '', data: parts[1]?.trim() || '', destino: parts[2]?.trim() || '', valor: parseVal(parts[parts.length - 1]) };
      }
    });

    const targetSection = (pasteData.section === 'tabelaImeiDebito' || pasteData.section === 'tabelaImeiCredito') ? 'tabelaImei' : pasteData.section;
    setFormData({ ...formData, [targetSection]: [...(formData[targetSection as keyof EntidadeSaldo] as any[] || []), ...newRows] });
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
        
        {/* CERTIFICADO A4 PRINT */}
        <div className="printable-audit-report hidden print:block bg-white text-slate-900 p-0 font-body">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center gap-0">
               <div className="relative w-16 h-16">
                 <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
               </div>
               <span className="text-[36px] font-black text-amber-500 leading-none -ml-2">bmv</span>
            </div>
            <div className="text-right">
              <h2 className="text-[16px] font-black uppercase tracking-tight leading-tight">RELATÓRIO EXECUTIVO DE AUDITORIA</h2>
              <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest mt-1">PROTOCOLO DE SALDO: {entity.id}</p>
              <p className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase">{new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1.5 tracking-[0.2em]">IDENTIFICAÇÃO DA ENTIDADE</h3>
              <div className="space-y-4">
                <p className="text-[24px] font-black text-slate-900 leading-none tracking-tighter uppercase">{entity.nome}</p>
                <div className="text-[10px] space-y-2 font-bold uppercase tracking-tight">
                  <p><strong className="text-slate-400 font-black mr-2">DOCUMENTO REGISTRADO:</strong> {entity.documento}</p>
                  <p><strong className="text-slate-400 font-black mr-2">AUDITOR RESPONSÁVEL:</strong> {user?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1.5 tracking-[0.2em]">RESUMO DE SALDOS (UCS)</h3>
              <div className="flex justify-between items-start gap-4">
                <div className="text-[10px] space-y-3 font-bold uppercase flex-1">
                  <div>
                    <p className="text-slate-400 font-black text-[8px] mb-0.5">ORIGINAÇÃO TOTAL</p>
                    <p className="text-xl font-black text-slate-900">{totals.orig.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-black text-[8px] mb-0.5">SALDO FINAL AUDITADO</p>
                    <p className="text-xl font-black text-primary">{totals.final.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0 shadow-sm">
                  <QrCode className="w-20 h-20 text-slate-200" />
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CONFORMIDADE</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {formData.tabelaOriginacao && formData.tabelaOriginacao.length > 0 && (
              <ReportTable title="DEMONSTRATIVO DE ORIGINAÇÃO" data={formData.tabelaOriginacao} />
            )}
            {formData.tabelaMovimentacao && formData.tabelaMovimentacao.length > 0 && (
              <ReportTable title="DEMONSTRATIVO DE MOVIMENTAÇÃO" data={formData.tabelaMovimentacao} isNegative />
            )}
          </div>

          <div className="mt-12 flex justify-between items-end">
            <div className="text-[10px] text-[#10B981] font-black flex items-center gap-2 uppercase tracking-tight">
              <ShieldCheck className="w-4 h-4" /> SALDO VALIDADO PELO LEDGERTRUST
            </div>
            <div className="text-right">
              <div className="border-t border-slate-900 w-64 pt-3">
                <p className="text-[10px] font-black uppercase text-slate-900 tracking-tight">RESPONSÁVEL TÉCNICO BMV</p>
                <p className="text-[7px] text-slate-400 uppercase font-bold">Assinado digitalmente via LedgerTrust</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONSOLE UI DESIGN SCREENSHOT */}
        <div className="flex-1 flex flex-col overflow-hidden print:hidden bg-[#0F172A]">
          <div className="p-8 pb-10 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-[#10B981]/20 rounded-md flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981]">AUDITORIA TÉCNICA BMV</p>
                </div>
                <h1 className="text-[28px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
                <p className="text-[12px] font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
              </div>

              <div className="bg-[#1E293B] border border-white/5 rounded-[2rem] p-6 min-w-[340px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/10 blur-3xl -mr-16 -mt-16"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Saldo Final Auditado</p>
                 <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-[42px] font-black text-white tracking-tighter">{totals.final.toLocaleString('pt-BR')}</span>
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

          <ScrollArea className="flex-1 bg-white rounded-t-[2.5rem]">
            <div className="p-10 space-y-16">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <MessageSquare className="w-4 h-4 text-[#10B981]" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">APONTAMENTOS DE AUDITORIA</h3>
                    </div>
                    <Textarea 
                      value={formData.observacao || ""} 
                      onChange={e => setFormData({...formData, observacao: e.target.value})}
                      placeholder="Descreva aqui divergências, inconsistências ou justificativas..."
                      className="min-h-[120px] bg-slate-50 border-slate-100 rounded-2xl p-6 text-[12px] font-medium focus:ring-primary shadow-inner resize-none"
                    />
                 </div>
                 <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">STATUS DA CONFORMIDADE</Label>
                    <Select 
                      value={formData.statusAuditoriaSaldo || "valido"} 
                      onValueChange={v => setFormData({...formData, statusAuditoriaSaldo: v as any})}
                    >
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold text-[11px] uppercase tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valido" className="font-bold text-[11px] uppercase">✓ SALDO VALIDADO</SelectItem>
                        <SelectItem value="inconsistente" className="font-bold text-[11px] uppercase text-rose-500">⚠ DIVERGÊNCIA</SelectItem>
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
            </div>
          </ScrollArea>

          <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 px-8 h-12">
              CANCELAR
            </Button>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrint} className="h-14 px-10 rounded-2xl border-slate-100 bg-slate-50/50 font-black uppercase text-[11px] tracking-widest text-slate-700 hover:bg-white transition-all">
                <Printer className="w-4 h-4 mr-2" /> GERAR RELATÓRIO EXECUTIVO
              </Button>
              <Button onClick={handleSave} className="h-14 px-12 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">
                <Save className="w-4 h-4 mr-2" /> SALVAR NO LEDGER
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL DE COLAGEM */}
        {pasteData && (
          <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
            <DialogContent className="max-w-xl rounded-3xl p-8 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" /> COLAGEM TÉCNICA
                </DialogTitle>
                <DialogDescription className="sr-only">Colagem de dados para processamento.</DialogDescription>
              </DialogHeader>
              <Textarea 
                value={pasteData.raw} 
                onChange={e => setPasteData({ ...pasteData, raw: e.target.value })}
                placeholder="Cole colunas do Excel..."
                className="min-h-[250px] font-mono text-[10px] bg-slate-50 border-slate-100 rounded-2xl p-6"
              />
              <Button onClick={handleProcessPaste} className="w-full h-12 rounded-xl font-black uppercase text-[10px] bg-primary text-white">IMPORTAR DADOS</Button>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportTable({ title, data, isNegative }: any) {
  return (
    <div className="space-y-3">
       <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">{title}</h4>
       <table className="w-full text-left text-[9px]">
          <thead className="bg-[#F8FAFC]">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500">REFERÊNCIA</th>
              <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500">HISTÓRICO</th>
              <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 text-right">VOLUME (UCS)</th>
            </tr>
          </thead>
          <tbody className="font-bold uppercase">
            {data.map((row: any, i: number) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="px-4 py-2 font-mono text-slate-400">{row.data || row.dist || '-'}</td>
                <td className="px-4 py-2 text-slate-600">{row.destino || row.plataforma || '-'}</td>
                <td className={cn("px-4 py-2 text-right font-black", isNegative ? "text-rose-600" : "text-slate-900")}>
                  {row.valor?.toLocaleString('pt-BR')}
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
      "border rounded-xl p-4 flex flex-col justify-between h-[85px] transition-all bg-[#1E293B]/50",
      isAmber ? "border-amber-500/30 ring-1 ring-amber-500/10" : "border-white/5",
      isImei ? "border-indigo-500/30" : ""
    )}>
      <p className={cn(
        "text-[8px] font-black uppercase tracking-widest leading-none",
        isAmber ? "text-amber-500" : isImei ? "text-indigo-400" : "text-slate-500"
      )}>
        {label}
      </p>
      <p className={cn(
        "text-[18px] font-black font-mono leading-none tracking-tighter truncate",
        isNegative ? "text-rose-500" : 
        isHighlight ? "text-[#10B981]" : 
        isAmber ? "text-amber-500" : 
        isImei ? "text-indigo-400" :
        "text-white"
      )}>
        {value.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function SectionHeader({ title, value, onPaste }: any) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-[#10B981] rounded-full" />
        <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
        <Badge variant="outline" className="text-[10px] font-black border-[#10B981]/20 text-[#10B981] uppercase rounded-full">
          TOTAL: {value.toLocaleString('pt-BR')} UCS
        </Badge>
      </div>
      <Button variant="outline" size="sm" onClick={onPaste} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase gap-2 border-slate-200 hover:bg-slate-50">
        <Calculator className="w-3.5 h-3.5" /> COLAR DADOS
      </Button>
    </div>
  );
}

function SectionTable({ data, type }: { data: any[], type: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="h-12 border-b border-slate-100">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">REFERÊNCIA</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">HISTÓRICO</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">VOLUME (UCS)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={3} className="py-10 text-center text-slate-300 font-bold uppercase text-[10px]">Aguardando dados estruturados...</TableCell></TableRow>
          ) : (
            data.map((row: any, i: number) => (
              <TableRow key={i} className="h-12 border-b border-slate-50 hover:bg-slate-50/50">
                <TableCell className="font-mono text-[11px] text-slate-400">{row.dist || row.data || '-'}</TableCell>
                <TableCell className="font-bold text-[11px] uppercase text-slate-600">{row.destino || row.plataforma || '-'}</TableCell>
                <TableCell className="text-right font-mono font-black text-[12px] pr-8 text-slate-900">
                   {type === 'imei' ? (row.valorDebito - row.valorCredito).toLocaleString('pt-BR') : row.valor?.toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
