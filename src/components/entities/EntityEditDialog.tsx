"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ClipboardPaste, User, FileText, Database, ShieldCheck, Info, Table as TableIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EntityEditDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityEditDialog({ entity, open, onOpenChange, onUpdate }: EntityEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [rawRow, setRawRow] = useState("");

  useEffect(() => {
    if (entity) {
      setFormData(entity);
      setRawRow("");
    }
  }, [entity]);

  const handleIndividualSave = () => {
    if (!entity) return;
    onUpdate(entity.id, formData);
    onOpenChange(false);
  };

  const handlePasteProcess = () => {
    if (!rawRow.trim() || !entity) return;
    
    // Suporta TAB (Excel)
    const parts = rawRow.split('\t');
    
    if (parts.length < 5) {
      toast({ 
        variant: "destructive", 
        title: "Formato incompatível", 
        description: "A linha colada não possui colunas suficientes para o mapeamento automático." 
      });
      return;
    }

    const parseNum = (v: string) => {
      if (!v) return 0;
      const clean = v.replace(/[R$\s.]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    // Mapeamento baseado no modelo de planilha:
    // 0:Originação 1:Movimentação 2:Aposentado 3:Bloqueado 4:Aquisição 5:Ajuste IMEI 6:Final
    const updates: Partial<EntidadeSaldo> = {
      originacao: parseNum(parts[0]),
      movimentacao: parseNum(parts[1]),
      aposentado: parseNum(parts[2]),
      bloqueado: parseNum(parts[3]),
      aquisicao: parseNum(parts[4]),
      saldoAjustarImei: parseNum(parts[5]),
      saldoFinalAtual: parseNum(parts[6]),
    };

    setFormData(prev => ({ ...prev, ...updates }));
    toast({ 
      title: "Células Mapeadas", 
      description: "Os saldos da planilha foram processados para o Ledger." 
    });
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden bg-[#F1F5F9] border-none shadow-2xl rounded-[2rem] p-0 flex flex-col">
        {/* Header Superior - Identificação */}
        <div className="bg-slate-900 p-8 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Auditoria de LedgerTrust</p>
              <h2 className="text-2xl font-black uppercase tracking-tight">{entity.nome}</h2>
              <p className="text-xs font-mono opacity-60">DOCUMENTO: {entity.documento}</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Final (Auditado)</p>
                <p className="text-3xl font-black text-primary">{(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')} <span className="text-xs">UCS</span></p>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-8 space-y-8">
            {/* Seção 01: Mapeamento Rápido */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <ClipboardPaste className="w-5 h-5 text-primary" />
                <h3 className="text-xs font-black uppercase text-slate-900">Mapear Linha de Planilha (Células A:G)</h3>
              </div>
              <div className="flex gap-4">
                <Input 
                  placeholder="Cole aqui a linha: Originação [tab] Movimentação [tab] Aposentado..."
                  value={rawRow}
                  onChange={e => setRawRow(e.target.value)}
                  className="flex-1 h-12 bg-slate-50 border-slate-200 font-mono text-[10px]"
                />
                <Button onClick={handlePasteProcess} className="h-12 px-8 font-black uppercase text-[10px] tracking-widest">
                  Processar
                </Button>
              </div>
            </div>

            {/* Seção 02: Grade de Saldos (Estilo Planilha) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Saldo Atualizado</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {[
                  { label: 'Originação', key: 'originacao', color: 'text-slate-900' },
                  { label: 'Movimentação', key: 'movimentacao', color: 'text-rose-600' },
                  { label: 'Aposentado', key: 'aposentado', color: 'text-slate-600' },
                  { label: 'Bloqueado', key: 'bloqueado', color: 'text-amber-600' },
                  { label: 'Aquisição', key: 'aquisicao', color: 'text-emerald-600' },
                  { label: 'Ajuste IMEI', key: 'saldoAjustarImei', color: 'text-indigo-600' },
                  { label: 'Saldo Final', key: 'saldoFinalAtual', color: 'text-primary font-black' },
                ].map((field) => (
                  <div key={field.key} className="bg-white p-4 space-y-2">
                    <Label className="text-[8px] font-black uppercase text-slate-400 tracking-tighter block">{field.label}</Label>
                    <Input 
                      type="number" 
                      value={formData[field.key as keyof EntidadeSaldo] || 0}
                      onChange={e => setFormData({...formData, [field.key]: Number(e.target.value)})}
                      className={`border-none p-0 h-auto text-sm font-bold font-mono focus-visible:ring-0 ${field.color}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Seção 03: Saldo Legado */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Detalhamento Legado</h3>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Total Legado (Auditado)</Label>
                  <Input 
                    type="number"
                    value={formData.saldoLegadoTotal || 0}
                    onChange={e => setFormData({...formData, saldoLegadoTotal: Number(e.target.value)})}
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-mono font-black text-slate-700"
                  />
                </div>
                <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Área para importação de extratos detalhados (Trading/Investment/Custódia)</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-8 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-10 h-14 font-black uppercase text-[10px] tracking-widest text-slate-400">Descartar</Button>
          <Button onClick={handleIndividualSave} className="px-16 h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-all active:scale-95">
            <Save className="w-5 h-5" /> Gravar Auditoria no Ledger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
