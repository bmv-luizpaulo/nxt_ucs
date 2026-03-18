"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela, AuditoriaStatus } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ShieldCheck, Calculator, Link as LinkIcon, CheckCircle2, AlertCircle, Clock, X, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface EntityEditDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityEditDialog({ entity, open, onOpenChange, onUpdate }: EntityEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [activePasteField, setActivePasteField] = useState<keyof EntidadeSaldo | null>(null);
  const [pasteBuffer, setPasteBuffer] = useState("");
  const [previewRows, setPreviewRows] = useState<RegistroTabela[]>([]);

  useEffect(() => {
    if (entity) {
      setFormData(entity);
    }
  }, [entity]);

  const stats = useMemo(() => {
    const sumTable = (table?: RegistroTabela[]) => (table || []).reduce((acc, row) => acc + (row.valor || 0), 0);
    
    const movTable = formData.tabelaMovimentacao || [];
    const totalMov = sumTable(movTable);
    const pagas = movTable.filter(m => m.statusAuditoria === 'Pago').length;
    const percPago = movTable.length > 0 ? (pagas / movTable.length) * 100 : 0;

    const totalOrig = sumTable(formData.tabelaOriginacao);
    const totalAq = sumTable(formData.tabelaAquisicao);

    const totalCreditoImei = (formData.tabelaImei || []).reduce((acc, row) => acc + (row.valorCredito || 0), 0);
    const totalDebitoImei = (formData.tabelaImei || []).reduce((acc, row) => acc + (row.valorDebito || 0), 0);
    const ajusteImei = Math.max(0, totalDebitoImei - totalCreditoImei);

    const legadoTotal = (formData.tabelaLegado || []).reduce((acc, row) => acc + ((row.disponivel || 0) + (row.reservado || 0)), 0);
    const totalAposentado = (formData.tabelaLegado || []).reduce((acc, row) => acc + (row.bloqueado || 0), 0);
    const totalBloqueado = (formData.tabelaLegado || []).reduce((acc, row) => acc + (row.aposentado || 0), 0);
    
    const finalAuditado = totalOrig + totalMov - totalAq;

    return {
      percPago,
      totalMov,
      totalOrig,
      totalAq,
      ajusteImei,
      legadoTotal,
      totalAposentado,
      totalBloqueado,
      finalAuditado
    };
  }, [formData]);

  useEffect(() => {
    if (!pasteBuffer.trim()) {
      setPreviewRows([]);
      return;
    }
    const lines = pasteBuffer.split('\n').filter(l => l.trim());
    const results: RegistroTabela[] = [];
    const parseBRL = (val: string) => {
      if (!val) return 0;
      return parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    };

    lines.forEach((line, index) => {
      const parts = line.split('\t').map(p => p.trim());
      if (parts.length < 2) return;
      if (index === 0 && (line.toLowerCase().includes('data') || line.toLowerCase().includes('valor'))) return;

      if (activePasteField === 'tabelaImei') {
        const cred = parseBRL(parts[parts.length - 2]);
        const deb = parseBRL(parts[parts.length - 1]);
        results.push({ dist: parts[0], data: parts[1], destino: parts[2], valor: cred - deb, valorCredito: cred, valorDebito: deb });
      } else if (activePasteField === 'tabelaLegado') {
        results.push({
          data: parts[0], plataforma: parts[1], disponivel: parseBRL(parts[4]),
          reservado: parseBRL(parts[5]), bloqueado: parseBRL(parts[6]), aposentado: parseBRL(parts[7]),
          valor: parseBRL(parts[4]) + parseBRL(parts[5])
        });
      } else {
        const val = parseBRL(parts[parts.length - 1]);
        const isNeg = activePasteField === 'tabelaMovimentacao' || activePasteField === 'tabelaAquisicao';
        results.push({ dist: parts[0], data: parts[1], destino: parts[2], valor: isNeg ? -Math.abs(val) : val, statusAuditoria: 'Pendente' });
      }
    });
    setPreviewRows(results);
  }, [pasteBuffer, activePasteField]);

  if (!entity) return null;

  const handleUpdateRow = (field: keyof EntidadeSaldo, index: number, updates: Partial<RegistroTabela>) => {
    setFormData(prev => {
      const currentTable = [...((prev[field] as any[]) || [])];
      currentTable[index] = { ...currentTable[index], ...updates };
      return { ...prev, [field]: currentTable };
    });
  };

  const handleSaveFinal = () => {
    const finalData: Partial<EntidadeSaldo> = {
      ...formData,
      originacao: stats.totalOrig,
      movimentacao: stats.totalMov,
      aposentado: stats.totalAposentado,
      bloqueado: stats.totalBloqueado,
      aquisicao: stats.totalAq,
      saldoAjustarImei: stats.ajusteImei,
      saldoLegadoTotal: stats.legadoTotal,
      saldoFinalAtual: stats.finalAuditado
    };
    onUpdate(entity.id, finalData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] h-[90vh] flex flex-col p-0 border-none bg-white shadow-2xl overflow-hidden rounded-[2rem]">
        {activePasteField && (
          <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col">
              <div className="p-4 flex justify-between items-center border-b">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Processador de Dados</h3>
                <Button variant="ghost" size="icon" onClick={() => { setActivePasteField(null); setPasteBuffer(""); }}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-6">
                <Textarea autoFocus value={pasteBuffer} onChange={e => setPasteBuffer(e.target.value)} placeholder="Cole aqui..." className="h-60 font-mono text-[11px] mb-4" />
                <Button onClick={() => { setFormData(p => ({ ...p, [activePasteField]: previewRows })); setActivePasteField(null); setPasteBuffer(""); }} className="w-full h-12 font-black uppercase text-[10px]">Importar {previewRows.length} Linhas</Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#0F172A] p-6 text-white shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1 text-primary">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Console de Auditoria</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{entity.nome}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entity.documento}</p>
            </div>
            <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl text-right min-w-[200px]">
              <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Saldo Auditado</p>
              <p className="text-3xl font-black">{stats.finalAuditado.toLocaleString('pt-BR')} <span className="text-sm font-medium opacity-50">UCS</span></p>
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-4 pt-6 border-t border-white/10">
            <StatItem label="Originação" value={stats.totalOrig} color="white" />
            <StatItem label="Movimentação" value={stats.totalMov} color="rose" />
            <StatItem label="Aposentado" value={stats.totalAposentado} color="white" />
            <StatItem label="Bloqueado" value={stats.totalBloqueado} color="rose" />
            <StatItem label="Aquisição" value={stats.totalAq} color="rose" />
            <StatItem label="Ajuste IMEI" value={stats.ajusteImei} color="indigo" />
            <StatItem label="Legado" value={stats.legadoTotal} color="amber" />
            <StatItem label="Final" value={stats.finalAuditado} color="emerald" />
          </div>
        </div>

        <ScrollArea className="flex-1 p-8">
          <div className="space-y-10">
            <TableSection title="Originação" data={formData.tabelaOriginacao || []} onImport={() => setActivePasteField('tabelaOriginacao')} 
              columns={[{label: "Ref", key: "dist"}, {label: "Data", key: "data"}, {label: "Volume", key: "valor", align: "right"}]} />
            
            <TableSection title="Movimentações" data={formData.tabelaMovimentacao || []} onImport={() => setActivePasteField('tabelaMovimentacao')} 
              onUpdate={(idx, upd) => handleUpdateRow('tabelaMovimentacao', idx, upd)}
              columns={[
                {label: "Ref", key: "dist"}, {label: "Data", key: "data"}, {label: "Destino", key: "destino"}, 
                {label: "Status", key: "statusAuditoria", type: "status"}, {label: "Volume", key: "valor", align: "right"}
              ]} />
          </div>
        </ScrollArea>

        <div className="p-6 border-t bg-white flex justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400">Cancelar</Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.print()} className="h-12 px-6 rounded-xl font-black uppercase text-[10px]"><Printer className="w-4 h-4 mr-2" /> PDF</Button>
            <Button onClick={handleSaveFinal} className="h-12 px-10 rounded-xl font-black uppercase text-[10px] bg-primary">Salvar no Ledger</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatItem({ label, value, color }: any) {
  const colors: any = { white: "text-white", rose: "text-rose-400", indigo: "text-indigo-300", amber: "text-amber-400", emerald: "text-primary" };
  return (
    <div className="space-y-0.5">
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{label}</p>
      <p className={cn("text-sm font-black truncate", colors[color])}>{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}

function TableSection({ title, data, onImport, columns, onUpdate }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
        <Button onClick={onImport} variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase"><Calculator className="w-3 h-3 mr-1" /> Importar</Button>
      </div>
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {columns.map((c: any) => <TableHead key={c.label} className={cn("text-[9px] font-black uppercase h-8", c.align === 'right' && "text-right")}>{c.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? <TableRow><TableCell colSpan={columns.length} className="text-center py-8 text-[10px] text-slate-400 font-bold uppercase">Sem dados</TableCell></TableRow> :
              data.map((row: any, i: number) => (
                <TableRow key={i}>
                  {columns.map((col: any) => (
                    <TableCell key={col.label} className={cn("text-[10px] font-medium py-2", col.align === 'right' && "text-right")}>
                      {col.type === 'status' ? (
                        <Select value={row[col.key]} onValueChange={v => onUpdate(i, {[col.key]: v})}>
                          <SelectTrigger className="h-7 text-[9px] font-bold uppercase"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Não Pago">Não Pago</SelectItem></SelectContent>
                        </Select>
                      ) : (typeof row[col.key] === 'number' ? Math.abs(row[col.key]).toLocaleString('pt-BR') : row[col.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}