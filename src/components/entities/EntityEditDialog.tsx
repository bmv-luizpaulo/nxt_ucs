"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X, Calculator, ShieldCheck, Database, Save, ArrowRightLeft, FileText, Link as LinkIcon, AlertCircle } from "lucide-react";
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

  const totals = useMemo(() => {
    const sum = (arr?: any[]) => (arr || []).reduce((acc, curr) => acc + (curr.valor || curr.valorCredito || 0) - (curr.valorDebito || 0), 0);
    
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
    const movPercentage = orig > 0 ? ((Math.abs(mov) / orig) * 100).toFixed(1) : "0.0";

    return { orig, mov, aq, imei, legado, aposentado, bloqueado, final, movPercentage };
  }, [formData]);

  const handlePrint = () => {
    window.print();
  };

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
    if (!entity) return;
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

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 pb-0 sr-only">
          <DialogTitle>Auditoria Técnica - {entity.nome}</DialogTitle>
          <DialogDescription>Detalhamento de saldos e conciliação do Ledger BMV.</DialogDescription>
        </DialogHeader>

        {activePasteField && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Mapeamento de Planilha</h3>
                <Button variant="ghost" size="icon" onClick={() => setActivePasteField(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-8 space-y-4">
                <Textarea 
                  autoFocus 
                  value={pasteBuffer} 
                  onChange={e => setPasteBuffer(e.target.value)}
                  placeholder="Cole aqui os dados copiados do Excel/Sheets..."
                  className="min-h-[300px] font-mono text-xs bg-slate-50 border-slate-200 rounded-2xl p-6"
                />
                <Button onClick={() => handleImport(activePasteField)} className="w-full h-14 rounded-2xl font-black uppercase text-xs">
                  Sincronizar Dados na Sessão
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#0B0F1A] p-8 shrink-0 text-white relative">
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AUDITORIA TÉCNICA BMV</p>
              </div>
              <h1 className="text-2xl font-black tracking-tight uppercase">{entity.nome}</h1>
              <p className="text-xs font-bold text-slate-500 font-mono">{entity.documento}</p>
            </div>

            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-3xl p-6 min-w-[320px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16"></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Saldo Final Auditado</p>
               <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-4xl font-black text-white">{totals.final.toLocaleString('pt-BR')}</span>
                  <span className="text-xs font-black text-primary uppercase">UCS</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <StatBox label="ORIGINAÇÃO" value={totals.orig} />
            <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative percentage={totals.movPercentage} />
            <StatBox label="APOSENTADO" value={totals.aposentado} isHighlight />
            <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
            <StatBox label="AQUISIÇÃO" value={totals.aq} />
            <StatBox label="AJUSTE IMEI" value={totals.imei} isAccent />
            <StatBox label="LEGADO" value={totals.legado} isAccent />
            <StatBox label="DISPONÍVEL" value={totals.final} isHighlight />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-8 space-y-12">
            <Section 
              title="Sessão 01: Lançamentos de Originação" 
              data={formData.tabelaOriginacao || []} 
              onImport={() => setActivePasteField('tabelaOriginacao')}
              icon={Database}
            />
            <Section 
              title="Sessão 02: Histórico de Movimentação" 
              data={formData.tabelaMovimentacao || []} 
              onImport={() => setActivePasteField('tabelaMovimentacao')}
              icon={ArrowRightLeft}
            />
            <Section 
              title="Sessão 03: Ajustes IMEI (Crédito/Débito)" 
              data={formData.tabelaImei || []} 
              onImport={() => setActivePasteField('tabelaImei')}
              icon={Calculator}
            />
            <Section 
              title="Sessão 04: Registros de Aquisição" 
              data={formData.tabelaAquisicao || []} 
              onImport={() => setActivePasteField('tabelaAquisicao')}
              icon={FileText}
            />
            <Section 
              title="Sessão 05: Saldo Legado" 
              data={formData.tabelaLegado || []} 
              onImport={() => setActivePasteField('tabelaLegado')}
              icon={LinkIcon}
            />
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500">
            Descartar Alterações
          </Button>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={handlePrint} className="h-14 px-8 rounded-2xl border-slate-200 bg-white font-black uppercase text-[10px] tracking-widest text-slate-600">
              <Printer className="w-4 h-4 mr-2" /> Gerar Relatório PDF
            </Button>
            <Button onClick={handleSave} className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
              <Save className="w-4 h-4 mr-2" /> Sincronizar no Ledger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAccent, percentage }: any) {
  return (
    <div className="bg-[#161B2E] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-20 hover:bg-[#1C2237] transition-colors relative">
      <div className="flex justify-between items-start w-full">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        {percentage !== undefined && (
          <span className={cn(
            "text-[8px] font-black px-1.5 py-0.5 rounded-md",
            isNegative ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {percentage}%
          </span>
        )}
      </div>
      <p className={cn(
        "text-lg font-black font-mono",
        isNegative ? "text-rose-500" : isHighlight ? "text-emerald-400" : isAccent ? "text-primary" : "text-white"
      )}>
        {value.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function Section({ title, data, onImport, icon: Icon }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
        </div>
        <Button onClick={onImport} variant="outline" size="sm" className="h-8 rounded-full text-[9px] font-black uppercase px-4 border-dashed border-primary/40 text-primary hover:bg-primary/5">
          <Calculator className="w-3.5 h-3.5 mr-2" /> Importar Planilha
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[9px] font-black uppercase h-10">Referência</TableHead>
              <TableHead className="text-[9px] font-black uppercase h-10">Data</TableHead>
              <TableHead className="text-[9px] font-black uppercase h-10">Categoria/Tipo</TableHead>
              <TableHead className="text-[9px] font-black uppercase h-10">Status Auditoria</TableHead>
              <TableHead className="text-[9px] font-black uppercase h-10 text-right">Volume (UCS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 opacity-30">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-6 h-6" />
                    <p className="text-[9px] font-bold uppercase tracking-tighter">Nenhum registro vinculado nesta sessão</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row: any, i: number) => (
                <TableRow key={i} className="border-b border-slate-50 last:border-0">
                  <TableCell className="py-3 text-[10px] font-bold text-slate-600 font-mono">{row.id}</TableCell>
                  <TableCell className="py-3 text-[10px] text-slate-400">{row.data}</TableCell>
                  <TableCell className="py-3">
                    <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600">{row.tipo || 'ATIVO'}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Select defaultValue="valido">
                       <SelectTrigger className="h-8 w-32 rounded-lg bg-emerald-50 border-none text-[9px] font-black text-emerald-600 uppercase">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="valido">VALIDADO</SelectItem>
                          <SelectItem value="pendente">EM ANÁLISE</SelectItem>
                       </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono font-black text-slate-900">
                    {row.valor?.toLocaleString('pt-BR') || row.disponivel?.toLocaleString('pt-BR')}
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
