"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X, Calculator, ShieldCheck, Database, Save, ArrowRightLeft, FileText, Link as LinkIcon, AlertCircle, CheckCircle2 } from "lucide-react";
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

  // Lógica de Auditoria BMV (Equação Central)
  const totals = useMemo(() => {
    const sum = (arr?: RegistroTabela[]) => (arr || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    // 1. Originação (Sessão 1)
    const orig = sum(formData.tabelaOriginacao);
    
    // 2. Movimentação (Sessão 2) - Geralmente valores negativos
    const mov = sum(formData.tabelaMovimentacao);
    
    // 3. Ajuste IMEI (Sessão 3) - Neutro para o cálculo final
    const imei = (formData.tabelaImei || []).reduce((acc, c) => acc + (c.valorCredito || 0) - (c.valorDebito || 0), 0);

    // 4. Aquisição (Sessão 4) - Retirada da conta
    const aq = sum(formData.tabelaAquisicao);

    // 5. Legado (Sessão 5)
    // Legado = Disponível + Reservado
    const legDisponivel = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const legReservado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0);
    const legadoTotal = legDisponivel + legReservado;

    // Aposentado e Bloqueado vêm das colunas específicas da tabela Legado
    const aposentado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0);
    const bloqueado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0);

    // EQUAÇÃO: Saldo Final = Originação + Movimentação - Aquisição + Legado
    const final = orig + mov - aq + legadoTotal;
    
    const movPercentage = orig > 0 ? ((Math.abs(mov) / orig) * 100).toFixed(1) : "0.0";

    return { 
      orig, mov, aq, imei, legadoTotal, aposentado, bloqueado, final, movPercentage 
    };
  }, [formData]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleImport = (field: keyof EntidadeSaldo) => {
    if (!pasteBuffer.trim()) return;
    
    const lines = pasteBuffer.split('\n').filter(l => l.trim());
    const newRows: RegistroTabela[] = lines.map(line => {
      const parts = line.split('\t');
      
      if (field === 'tabelaLegado') {
        return {
          id: parts[0] || Math.random().toString(36).substr(2, 5).toUpperCase(),
          data: parts[1] || new Date().toLocaleString(),
          disponivel: parseFloat(parts[15]?.replace(/[^\d-]/g, '') || '0'),
          reservado: parseFloat(parts[16]?.replace(/[^\d-]/g, '') || '0'), // Ajustar conforme coluna real
          aposentado: parseFloat(parts[4]?.replace(/[^\d-]/g, '') || '0'),
          bloqueado: parseFloat(parts[5]?.replace(/[^\d-]/g, '') || '0'),
          tipo: 'LEGADO'
        };
      }

      const val = parseFloat(parts[parts.length - 1]?.replace(/[R$\s.]/g, '').replace(',', '.') || '0');
      return {
        id: parts[0] || Math.random().toString(36).substr(2, 5).toUpperCase(),
        data: parts[1] || new Date().toLocaleString(),
        tipo: parts[2] || 'ATIVO',
        valor: val,
        statusAuditoria: 'VALIDADO'
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
      saldoLegadoTotal: totals.legadoTotal,
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
        <DialogHeader className="sr-only">
          <DialogTitle>Auditoria Técnica BMV - {entity.nome}</DialogTitle>
          <DialogDescription>Cálculos de conferência técnica e conciliação de saldos Ledger.</DialogDescription>
        </DialogHeader>

        {activePasteField && (
          <div className="absolute inset-0 z-[100] bg-[#0B0F1A]/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900">Mapeamento LedgerTrust</h3>
                <Button variant="ghost" size="icon" onClick={() => setActivePasteField(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-8 space-y-6">
                <Textarea 
                  autoFocus 
                  value={pasteBuffer} 
                  onChange={e => setPasteBuffer(e.target.value)}
                  placeholder="Cole os dados do Excel/Sheets aqui..."
                  className="min-h-[250px] font-mono text-[11px] bg-slate-50 border-slate-200 rounded-2xl p-6 focus:ring-primary shadow-inner"
                />
                <Button onClick={() => handleImport(activePasteField)} className="w-full h-14 rounded-2xl bg-[#734DCC] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">
                  Sincronizar no Ledger
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CABEÇALHO DARK - 8 COLUNAS */}
        <div className="bg-[#0B0F1A] p-10 shrink-0 text-white relative">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[#734DCC] rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#734DCC]">AUDITORIA TÉCNICA BMV</p>
              </div>
              <h1 className="text-[28px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
              <p className="text-xs font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
            </div>

            <div className="bg-[#161B2E] border border-white/5 rounded-[2rem] p-8 min-w-[340px] shadow-2xl flex flex-col items-end relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-[#734DCC]/10 blur-3xl -mr-20 -mt-20"></div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10">Saldo Final Auditado</p>
               <div className="flex items-baseline gap-3 relative z-10">
                  <span className="text-5xl font-black text-white tracking-tighter">{totals.final.toLocaleString('pt-BR')}</span>
                  <span className="text-[11px] font-black text-[#734DCC] uppercase tracking-widest">UCS</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
            <StatBox label="ORIGINAÇÃO" value={totals.orig} />
            <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative percentage={totals.movPercentage} />
            <StatBox label="APOSENTADO" value={totals.aposentado} />
            <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
            <StatBox label="AQUISIÇÃO" value={totals.aq} isNegative />
            <StatBox label="AJUSTE IMEI" value={totals.imei} isAccent />
            <StatBox label="LEGADO" value={totals.legadoTotal} isAccent />
            <StatBox label="DISPONÍVEL" value={totals.final} isHighlight />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-10 space-y-14">
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
              title="Sessão 03: Ajuste IMEI (Conferência)" 
              data={formData.tabelaImei || []} 
              onImport={() => setActivePasteField('tabelaImei')}
              icon={Calculator}
            />
            <Section 
              title="Sessão 04: Aquisições (Dedução)" 
              data={formData.tabelaAquisicao || []} 
              onImport={() => setActivePasteField('tabelaAquisicao')}
              icon={FileText}
            />
            <Section 
              title="Sessão 05: Saldo Legado (Disponível + Reservado)" 
              data={formData.tabelaLegado || []} 
              onImport={() => setActivePasteField('tabelaLegado')}
              icon={LinkIcon}
              isLegado
            />
          </div>
        </ScrollArea>

        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 shadow-inner">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 hover:bg-rose-50 px-8 rounded-xl h-14">
            Descartar Alterações
          </Button>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={handlePrint} className="h-14 px-10 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[11px] tracking-widest text-slate-700 hover:bg-white">
              <Printer className="w-4 h-4 mr-2" /> Gerar Relatório PDF
            </Button>
            <Button onClick={handleSave} className="h-14 px-12 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">
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
    <div className="bg-[#161B2E] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-[100px] hover:bg-[#1C2237] transition-all group">
      <div className="flex justify-between items-start w-full">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</p>
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
        "text-[20px] font-black font-mono leading-none tracking-tight",
        isNegative ? "text-rose-500" : isHighlight ? "text-emerald-400" : isAccent ? "text-[#734DCC]" : "text-white"
      )}>
        {value === 0 ? "0" : value.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function Section({ title, data, onImport, icon: Icon, isLegado }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-100 rounded-xl">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
        </div>
        <Button onClick={onImport} variant="outline" size="sm" className="h-10 rounded-xl text-[10px] font-black uppercase px-6 border-dashed border-[#734DCC]/30 text-[#734DCC] hover:bg-[#734DCC]/5">
          <Calculator className="w-3.5 h-3.5 mr-2" /> Importar Planilha
        </Button>
      </div>

      <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referência</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</TableHead>
              {isLegado ? (
                <>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Disponível</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Reservado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aposentado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Bloqueado</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Volume (UCS)</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isLegado ? 6 : 5} className="text-center py-16 opacity-30">
                  <p className="text-[11px] font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row: any, i: number) => (
                <TableRow key={i} className="border-b border-slate-50 last:border-0">
                  <TableCell className="py-4 text-[11px] font-bold text-slate-600 font-mono">{row.id}</TableCell>
                  <TableCell className="py-4 text-[11px] text-slate-400">{row.data}</TableCell>
                  {isLegado ? (
                    <>
                      <TableCell className="text-right font-mono font-black">{row.disponivel?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono font-black">{row.reservado?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono font-black text-emerald-500">{row.aposentado?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono font-black text-rose-500 pr-8">{row.bloqueado?.toLocaleString('pt-BR')}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="py-4">
                        <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600">{row.tipo}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VALIDADO
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right font-mono font-black text-slate-900 pr-8">
                        {row.valor?.toLocaleString('pt-BR')}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}