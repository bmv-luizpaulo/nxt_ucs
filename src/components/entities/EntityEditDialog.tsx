
"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ClipboardPaste, Database, ShieldCheck, Table as TableIcon, Calculator, ChevronDown, ListFilter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

interface EntityEditDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityEditDialog({ entity, open, onOpenChange, onUpdate }: EntityEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [activePasteField, setActivePasteField] = useState<string | null>(null);
  const [pasteBuffer, setPasteBuffer] = useState("");

  useEffect(() => {
    if (entity) {
      setFormData(entity);
      setPasteBuffer("");
    }
  }, [entity]);

  const handleIndividualSave = () => {
    if (!entity) return;
    onUpdate(entity.id, formData);
    onOpenChange(false);
  };

  const processSectionPaste = (field: keyof EntidadeSaldo) => {
    if (!pasteBuffer.trim()) return;

    const lines = pasteBuffer.split('\n').filter(l => l.trim());
    let total = 0;

    lines.forEach(line => {
      // Tenta encontrar o valor numérico na linha (geralmente a penúltima ou última coluna)
      const parts = line.split('\t');
      // Se for TSV (Excel), tentamos pegar a coluna que parece ser de valor
      // Para movimentação, costuma ser o Débito (UCS)
      const rawValue = parts.length > 1 ? parts[parts.length - 2] || parts[parts.length - 1] : line;
      
      const cleanValue = parseFloat(rawValue.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      total += cleanValue;
    });

    setFormData(prev => ({ ...prev, [field]: total }));
    setPasteBuffer("");
    setActivePasteField(null);
    
    toast({ 
      title: "Consolidação Concluída", 
      description: `${lines.length} registros processados para o campo ${field.toString().toUpperCase()}.` 
    });
  };

  if (!entity) return null;

  const SaldoField = ({ label, field, color }: { label: string, field: keyof EntidadeSaldo, color: string }) => (
    <div className="bg-white p-4 space-y-2 relative group border-r border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <Label className="text-[8px] font-black uppercase text-slate-400 tracking-tighter block">{label}</Label>
        <Popover open={activePasteField === field} onOpenChange={(open) => setActivePasteField(open ? field : null)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
              <Calculator className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 rounded-2xl shadow-2xl border-none bg-slate-900 text-white" side="top">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest">Consolidador de {label}</p>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">Cole as linhas da planilha para somar automaticamente.</p>
              <Textarea 
                value={pasteBuffer}
                onChange={e => setPasteBuffer(e.target.value)}
                placeholder="Cole as linhas aqui..."
                className="bg-slate-800 border-slate-700 text-[10px] font-mono h-24 resize-none"
              />
              <Button 
                onClick={() => processSectionPaste(field)}
                className="w-full h-10 font-black uppercase text-[10px] bg-primary hover:bg-primary/90"
              >
                Consolidar Saldo
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Input 
        type="number" 
        value={formData[field] || 0}
        onChange={e => setFormData({...formData, [field]: Number(e.target.value)})}
        className={cn("border-none p-0 h-auto text-sm font-bold font-mono focus-visible:ring-0 bg-transparent", color)}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden bg-[#F1F5F9] border-none shadow-2xl rounded-[3rem] p-0 flex flex-col">
        <DialogTitle className="sr-only">Editor de Auditoria - {entity.nome}</DialogTitle>
        <DialogDescription className="sr-only">Interface para consolidação de saldos e rastreabilidade por seções.</DialogDescription>
        
        {/* Header Superior - Identificação */}
        <div className="bg-slate-900 p-10 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Auditoria Permanente LedgerTrust</p>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
                {entity.nome}
              </h2>
              <div className="flex gap-4">
                <p className="text-xs font-mono opacity-60 uppercase">DOC: {entity.documento}</p>
                <p className="text-xs font-mono opacity-60 uppercase">UF: {entity.uf}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Final (Auditado)</p>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-5xl font-black text-primary tracking-tighter">{(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')}</span>
                <span className="text-xs font-bold text-primary opacity-50 uppercase">UCS</span>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-10 space-y-10">
            {/* Seção 01: Saldo Atualizado com Consolidadores */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-slate-400" />
                  <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Painel de Saldos (Consolidação em Bloco)</h3>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Clique no <Calculator className="inline w-3 h-3 mx-1"/> para importar seção</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl bg-white">
                <SaldoField label="Originação" field="originacao" color="text-slate-900" />
                <SaldoField label="Movimentação" field="movimentacao" color="text-rose-600" />
                <SaldoField label="Aposentado" field="aposentado" color="text-slate-600" />
                <SaldoField label="Bloqueado" field="bloqueado" color="text-amber-600" />
                <SaldoField label="Aquisição" field="aquisicao" color="text-emerald-600" />
                <SaldoField label="Ajuste IMEI" field="saldoAjustarImei" color="text-indigo-600" />
                <div className="bg-slate-50 p-4 space-y-2 border-l border-slate-200">
                  <Label className="text-[8px] font-black uppercase text-slate-400 tracking-tighter block">Saldo Final</Label>
                  <div className="text-sm font-black font-mono text-primary">
                    {(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 02: Detalhamento Legado */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-400" />
                <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Detalhamento Legado (Auditoria Externa)</h3>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-10 shadow-sm">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Legado (Auditado)</Label>
                  <Input 
                    type="number"
                    value={formData.saldoLegadoTotal || 0}
                    onChange={e => setFormData({...formData, saldoLegadoTotal: Number(e.target.value)})}
                    className="h-16 rounded-2xl bg-slate-50 border-slate-200 font-mono font-black text-xl text-slate-700 focus:ring-primary shadow-inner"
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase italic">Soma de Trading, Investment e Custódia.</p>
                </div>
                <div className="col-span-2 bg-slate-50/50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <ClipboardPaste className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs leading-relaxed">
                    Arraste ou cole o extrato consolidado para vinculação permanente de hash.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-10 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-10 h-16 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50">Descartar Alterações</Button>
          <Button onClick={handleIndividualSave} className="px-16 h-20 rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center gap-4 transition-all active:scale-95 bg-primary hover:bg-primary/90">
            <Save className="w-6 h-6" /> Gravar Auditoria no Ledger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
