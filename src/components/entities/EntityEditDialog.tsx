"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X, Calculator, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  useEffect(() => {
    if (entity) {
      setFormData(entity);
    }
  }, [entity]);

  // Cálculos automáticos para o dashboard do modal
  const totals = useMemo(() => {
    const sum = (arr?: any[]) => (arr || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const orig = sum(formData.tabelaOriginacao);
    const mov = sum(formData.tabelaMovimentacao);
    const aq = sum(formData.tabelaAquisicao);
    
    const imeiCred = (formData.tabelaImei || []).reduce((acc, c) => acc + (c.valorCredito || 0), 0);
    const imeiDeb = (formData.tabelaImei || []).reduce((acc, c) => acc + (c.valorDebito || 0), 0);
    const imei = imeiCred - imeiDeb;

    const legado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const aposentado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0);
    const bloqueado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0);

    const final = orig + mov + aq + imei + legado;

    return { orig, mov, aq, imei, legado, aposentado, bloqueado, final };
  }, [formData]);

  if (!entity) return null;

  const handleImport = (field: keyof EntidadeSaldo) => {
    if (!pasteBuffer.trim()) return;
    
    const lines = pasteBuffer.split('\n').filter(l => l.trim());
    const newRows: RegistroTabela[] = lines.map(line => {
      const parts = line.split('\t');
      const val = parseFloat(parts[parts.length - 1]?.replace(/[R$\s.]/g, '').replace(',', '.') || '0');
      
      return {
        id: parts[0] || Math.random().toString(36).substr(2, 5).toUpperCase(),
        data: parts[1] || new Date().toLocaleString(),
        tipo: parts[2] || 'TRADING',
        valor: val,
        prioridade: 1
      };
    });

    setFormData(prev => ({ ...prev, [field]: [...(prev[field] as any[] || []), ...newRows] }));
    setPasteBuffer("");
    setActivePasteField(null);
  };

  const handleSave = () => {
    onUpdate(entity.id, {
      ...formData,
      originacao: totals.orig,
      movimentacao: totals.mov,
      aquisicao: totals.aq,
      saldoAjustarImei: totals.imei,
      saldoLegadoTotal: totals.legado,
      aposentado: totals.aposentado,
      bloqueado: totals.bloqueado,
      saldoFinalAtual: totals.final
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-3xl shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Console de Auditoria - {entity.nome}</DialogTitle>
          <DialogDescription>Interface técnica para conciliação de saldos e rastreabilidade.</DialogDescription>
        </DialogHeader>

        {/* Modal de Colagem (Overlay) */}
        {activePasteField && (
          <div className="absolute inset-0 z-50 bg-[#0B0F1A]/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Importação de Dados</h3>
                <Button variant="ghost" size="icon" onClick={() => setActivePasteField(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-8 space-y-4">
                <Textarea 
                  autoFocus 
                  value={pasteBuffer} 
                  onChange={e => setPasteBuffer(e.target.value)}
                  placeholder="Cole aqui os dados da sua planilha..."
                  className="min-h-[300px] font-mono text-xs bg-slate-50 border-slate-200 rounded-2xl"
                />
                <Button onClick={() => handleImport(activePasteField)} className="w-full h-14 rounded-2xl font-black uppercase text-xs">
                  Processar e Sincronizar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header Estilo Imagem */}
        <div className="bg-[#0B0F1A] p-8 shrink-0 text-white relative">
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                CONSOLE TÉCNICO • AUDITORIA BMV
              </p>
              <h1 className="text-4xl font-black tracking-tight">{entity.nome}</h1>
              <p className="text-sm font-bold text-slate-500 tracking-wider">{entity.documento}</p>
            </div>

            {/* Card Saldo Final Principal */}
            <div className="bg-gradient-to-br from-[#161B2E] to-[#0B0F1A] border border-white/10 rounded-[2rem] p-6 min-w-[300px] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors"></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">SALDO FINAL AUDITADO</p>
               <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-5xl font-black text-white">{totals.final.toLocaleString('pt-BR')}</span>
                  <span className="text-sm font-bold text-slate-500 uppercase">UCS</span>
               </div>
            </div>
          </div>

          {/* Grid de 8 Indicadores */}
          <div className="grid grid-cols-8 gap-4">
            <StatBox label="ORIGINAÇÃO" value={totals.orig} />
            <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative />
            <StatBox label="APOSENTADO" value={totals.aposentado} />
            <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
            <StatBox label="AQUISIÇÃO" value={totals.aq} isHighlight />
            <StatBox label="AJUSTE IMEI" value={totals.imei} isAccent />
            <StatBox label="LEGADO" value={totals.legado} isHighlight />
            <StatBox label="INTEGRIDADE" value={totals.final} isAccent />
          </div>
        </div>

        {/* Content Area - Tabelas */}
        <ScrollArea className="flex-1 bg-white">
          <div className="p-8 space-y-12">
            <Section 
              title="HISTÓRICO DE LANÇAMENTOS" 
              data={formData.tabelaOriginacao || []} 
              onImport={() => setActivePasteField('tabelaOriginacao')}
            />
          </div>
        </ScrollArea>

        {/* Footer Estilo Imagem */}
        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500">
            DESCARTAR ALTERAÇÕES
          </Button>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={handlePrint} className="h-14 px-8 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[11px] tracking-widest text-slate-700 hover:bg-white">
              <Printer className="w-4 h-4 mr-2" /> GERAR RELATÓRIO
            </Button>
            <Button onClick={handleSave} className="h-14 px-10 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-200">
              SINCRONIZAR NO LEDGER
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAccent }: any) {
  return (
    <div className="bg-[#161B2E] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-24 hover:border-white/20 transition-colors">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <p className={cn(
        "text-xl font-black",
        isNegative ? "text-rose-500" : isHighlight ? "text-rose-400" : isAccent ? "text-indigo-400" : "text-white"
      )}>
        {value < 0 ? value.toLocaleString('pt-BR') : value.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function Section({ title, data, onImport }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h3>
        <Button onClick={onImport} variant="outline" size="sm" className="h-8 rounded-full text-[9px] font-black uppercase px-4">
          <Calculator className="w-3.5 h-3.5 mr-2" /> IMPORTAR
        </Button>
      </div>

      <div className="overflow-hidden">
        <Table>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-20 text-[10px] font-bold uppercase text-slate-300">Nenhum dado vinculado</TableCell>
              </TableRow>
            ) : (
              data.map((row: any, i: number) => (
                <TableRow key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <TableCell className="py-4 text-[11px] font-bold text-slate-600">{row.id}</TableCell>
                  <TableCell className="py-4 text-[11px] font-bold text-slate-500">{row.data}</TableCell>
                  <TableCell className="py-4 text-[11px] font-black text-slate-900 uppercase tracking-tight">{row.tipo}</TableCell>
                  <TableCell className="py-4">
                    <Select defaultValue="valido">
                       <SelectTrigger className="h-9 w-32 rounded-full bg-slate-100/50 border-none text-[10px] font-black uppercase">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="valido">VALIDADO</SelectItem>
                          <SelectItem value="pendente">PENDENTE</SelectItem>
                       </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <span className="text-xs font-black text-rose-500">{row.prioridade || 1}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}