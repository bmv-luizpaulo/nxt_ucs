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
  Database, 
  Save, 
  ArrowRightLeft, 
  FileText, 
  Link as LinkIcon, 
  AlertCircle, 
  CheckCircle2,
  Layers,
  Search,
  Check,
  X,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EntityEditDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityEditDialog({ entity, open, onOpenChange, onUpdate }: EntityEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});

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
    
    // IMEI Adjustment (Debits - Credits) - Treated as Pending/Informational
    const imeiCredits = sumCredits(formData.tabelaImei);
    const imeiDebits = sumDebits(formData.tabelaImei);
    const imeiPending = imeiDebits - imeiCredits;

    // Legado Consolidado (REF)
    const legDisp = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const legRes = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0);
    const legadoTotal = legDisp + legRes;

    const aposentado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0);
    const bloqueado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0);

    /**
     * EQUAÇÃO DE AUDITORIA BMV:
     * Saldo Final = Originação + Movimentação (débitos) - Aquisição (retiradas)
     * IMEI = Neutro (Conferência de Pendência)
     * Legado = Valor de Referência (REF)
     */
    const final = orig + mov - aq;
    
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

  const handleUpdateRowStatus = (section: keyof EntidadeSaldo, rowIndex: number, status: string) => {
    const currentTable = formData[section] as RegistroTabela[];
    if (!currentTable) return;

    const newTable = [...currentTable];
    newTable[rowIndex] = { ...newTable[rowIndex], statusAuditoria: status };
    setFormData({ ...formData, [section]: newTable });
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Console de Auditoria Técnica - {entity.nome}</DialogTitle>
          <DialogDescription>Detalhamento de conferência e rastreabilidade Ledger.</DialogDescription>
        </DialogHeader>

        {/* CABEÇALHO DARK - DESIGN INSTITUCIONAL BMV */}
        <div className="bg-[#0B0F1A] p-10 shrink-0 text-white relative">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">AUDITORIA TÉCNICA BMV</p>
              </div>
              <h1 className="text-[28px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
              <p className="text-xs font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
            </div>

            <div className="bg-[#161B2E] border border-white/5 rounded-[2rem] p-8 min-w-[340px] shadow-2xl flex flex-col items-end relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-3xl -mr-20 -mt-20"></div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10">Saldo Final Auditado</p>
               <div className="flex items-baseline gap-3 relative z-10">
                  <span className="text-5xl font-black text-white tracking-tighter">{totals.final.toLocaleString('pt-BR')}</span>
                  <span className="text-[11px] font-black text-primary uppercase tracking-widest">UCS</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-5">
            <StatBox label="ORIGINAÇÃO" value={totals.orig} />
            <StatBox label="MOVIMENTAÇÃO" value={totals.mov} isNegative percentage={totals.movPercentage} />
            <StatBox label="APOSENTADO" value={totals.aposentado} />
            <StatBox label="BLOQUEADO" value={totals.bloqueado} isNegative />
            <StatBox label="AQUISIÇÃO" value={totals.aq} isNegative />
            <StatBox label="AJUSTE IMEI" value={totals.imeiPending} isPending />
            <StatBox label="SALDO LEGADO" value={totals.legadoTotal} isReference />
            <StatBox label="DISPONÍVEL" value={totals.final} isHighlight />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-10 space-y-20">
            {/* SESSÃO 01 - ORIGINAÇÃO */}
            <Section title="LANÇAMENTOS DE ORIGINAÇÃO" data={formData.tabelaOriginacao || []} icon={Database} value={totals.orig} />

            {/* SESSÃO 02 - MOVIMENTAÇÕES / RETIRADAS */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                  <div className="flex flex-col">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">MOVIMENTAÇÕES / RETIRADAS</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">CONSOLIDADO: <span className="text-primary">{Math.abs(totals.mov).toLocaleString()} UCS</span></p>
                  </div>
                </div>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 gap-2 hover:bg-slate-50">
                  <Calculator className="w-3.5 h-3.5" /> COLAGEM VIA CALCULADORA
                </Button>
              </div>

              <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm min-h-[150px]">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referência</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destino/Histórico</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Volume (UCS)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pr-8">Status Auditoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.tabelaMovimentacao || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <Layers className="w-12 h-12 text-slate-300" />
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Aguardando inserção técnica de dados...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.tabelaMovimentacao?.map((row, i) => {
                        const isTransfer = row.destino?.toLowerCase().includes('transferência') || row.destino?.toLowerCase().includes('cliente') || row.destino?.toLowerCase().includes('investment') || row.destino?.toLowerCase().includes('trading');
                        return (
                          <TableRow key={i} className={cn(
                            "border-b border-slate-50 last:border-0 group transition-colors",
                            isTransfer ? "bg-indigo-50/30 hover:bg-indigo-50/50" : "hover:bg-slate-50/50"
                          )}>
                            <TableCell className="py-4 text-[11px] font-bold text-slate-600 font-mono">{row.dist || row.id || '-'}</TableCell>
                            <TableCell className="py-4 text-[11px] text-slate-400">{row.data}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[300px]">{row.destino || row.tipo || '-'}</span>
                                {isTransfer && <Badge className="w-fit bg-indigo-100 text-indigo-600 border-indigo-200 text-[7px] font-black h-4 px-1">TRANSFERÊNCIA / DÉBITO</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-right font-mono font-black pr-4 text-rose-500">
                              {row.valor?.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-center pr-8">
                              <Select 
                                value={row.statusAuditoria || "pago"} 
                                onValueChange={(val) => handleUpdateRowStatus('tabelaMovimentacao', i, val)}
                              >
                                <SelectTrigger className={cn(
                                  "h-8 text-[9px] font-black uppercase rounded-lg border-none shadow-none focus:ring-0",
                                  row.statusAuditoria === 'pago' ? "bg-emerald-50 text-emerald-600" :
                                  row.statusAuditoria === 'nao_pago' ? "bg-rose-50 text-rose-600" :
                                  row.statusAuditoria === 'a_conferir' ? "bg-amber-50 text-amber-600" :
                                  "bg-slate-100 text-slate-500"
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pago" className="text-[10px] font-bold">PAGO / PROCESSADO</SelectItem>
                                  <SelectItem value="nao_pago" className="text-[10px] font-bold">NÃO PAGO / ERRO</SelectItem>
                                  <SelectItem value="a_conferir" className="text-[10px] font-bold">A CONFERIR / PENDENTE</SelectItem>
                                  <SelectItem value="estornado" className="text-[10px] font-bold">ESTORNADO</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* SESSÃO 03 - TRANSFERÊNCIAS IMEI */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                  <div className="flex flex-col">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">TRANSFERÊNCIAS IMEI</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">CONSOLIDADO: <span className="text-primary">{totals.imeiPending.toLocaleString()} UCS</span></p>
                  </div>
                </div>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 gap-2 hover:bg-slate-50">
                  <Calculator className="w-3.5 h-3.5" /> COLAGEM VIA CALCULADORA
                </Button>
              </div>

              <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referência</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário Destino</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Crédito</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Débito</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Valor Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.tabelaImei || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <Layers className="w-12 h-12 text-slate-300" />
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Aguardando inserção técnica de dados...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.tabelaImei?.map((row, i) => (
                        <TableRow key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-4 text-[11px] font-bold text-slate-600 font-mono">{row.dist || row.id || '-'}</TableCell>
                          <TableCell className="py-4 text-[11px] text-slate-400">{row.data}</TableCell>
                          <TableCell className="py-4 text-[10px] text-slate-600 font-bold truncate max-w-[200px]">{row.destino || row.tipo || '-'}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">{row.valorCredito?.toLocaleString('pt-BR') || '0'}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-rose-500">{row.valorDebito?.toLocaleString('pt-BR') || '0'}</TableCell>
                          <TableCell className={cn(
                            "text-right font-mono font-black pr-8",
                            (row.valor || 0) < 0 ? "text-rose-500" : "text-emerald-600"
                          )}>
                            {row.valor?.toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* SESSÃO 04 - AQUISIÇÕES */}
            <Section title="AQUISIÇÕES (DEDUÇÃO DO SALDO)" data={formData.tabelaAquisicao || []} icon={FileText} value={totals.aq} />

            {/* SESSÃO 05 - SALDO LEGADO CONSOLIDADO (REF) */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
                  <div className="flex flex-col">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">SALDO LEGADO CONSOLIDADO</h3>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">CONSOLIDADO: <span className="font-black">{totals.legadoTotal.toLocaleString()} UCS</span></p>
                  </div>
                </div>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 gap-2 hover:bg-slate-50 shadow-sm">
                  <Calculator className="w-3.5 h-3.5" /> COLAGEM VIA CALCULADORA
                </Button>
              </div>

              <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Atualização</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plataforma</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Disponível</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Reservado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.tabelaLegado || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-24 opacity-30">
                          <div className="flex flex-col items-center gap-2">
                            <Layers className="w-8 h-8 text-slate-300" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Aguardando inserção técnica de dados...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.tabelaLegado?.map((row, i) => (
                        <TableRow key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-5 text-[11px] font-bold text-slate-600">{row.data}</TableCell>
                          <TableCell className="py-5 text-[10px] font-black uppercase text-slate-500">{row.plataforma || 'N/A'}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-600">{row.disponivel?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-400">{row.reservado?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-mono font-black text-emerald-600 pr-8">
                            {((row.disponivel || 0) + (row.reservado || 0)).toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* RODAPÉ */}
        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 shadow-inner">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 hover:bg-rose-50 px-8 rounded-xl h-14">
            Sair Sem Salvar
          </Button>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={handlePrint} className="h-14 px-10 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[11px] tracking-widest text-slate-700 hover:bg-white transition-all">
              <Printer className="w-4 h-4 mr-2" /> Gerar Relatório PDF
            </Button>
            <Button onClick={handleSave} className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
              <Save className="w-4 h-4 mr-2" /> Salvar no Ledger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAccent, isReference, isPending, percentage }: any) {
  return (
    <div className={cn(
      "border rounded-2xl p-5 flex flex-col justify-between h-[100px] transition-all group relative",
      isReference ? "bg-amber-500/10 border-amber-500/20" : 
      isPending ? "bg-indigo-500/10 border-indigo-500/20" :
      "bg-[#161B2E] border-white/5 hover:bg-[#1C2237]"
    )}>
      <div className="flex justify-between items-start w-full">
        <p className={cn(
          "text-[9px] font-black uppercase tracking-widest leading-none",
          isReference ? "text-amber-500" : isPending ? "text-indigo-400" : "text-slate-500"
        )}>
          {label} {isReference && "(REF)"} {isPending && "(PENDÊNCIA)"}
        </p>
        {percentage !== undefined && (
          <span className={cn(
            "text-[8px] font-black px-1.5 py-0.5 rounded-md",
            value < 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {percentage}%
          </span>
        )}
      </div>
      <p className={cn(
        "text-[20px] font-black font-mono leading-none tracking-tight",
        isNegative ? "text-rose-500" : 
        isHighlight ? "text-emerald-400" : 
        isAccent ? "text-primary" : 
        isReference ? "text-amber-500" : 
        isPending ? "text-indigo-400" :
        "text-white"
      )}>
        {value === 0 ? "0" : value.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function Section({ title, data, icon: Icon, value }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
          <div className="flex flex-col">
            <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
            {value !== undefined && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">CONSOLIDADO: <span className="text-primary">{Math.abs(value).toLocaleString()} UCS</span></p>}
          </div>
        </div>
        <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 gap-2 hover:bg-slate-50">
          <Calculator className="w-3.5 h-3.5" /> COLAGEM VIA CALCULADORA
        </Button>
      </div>

      <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referência</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destino/Histórico</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Volume (UCS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-24">
                  <div className="flex flex-col items-center gap-4 opacity-30">
                    <Layers className="w-12 h-12 text-slate-300" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Aguardando inserção técnica de dados...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row: any, i: number) => (
                <TableRow key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-4 text-[11px] font-bold text-slate-600 font-mono">{row.dist || row.id || '-'}</TableCell>
                  <TableCell className="py-4 text-[11px] text-slate-400">{row.data}</TableCell>
                  <TableCell className="py-4 text-[10px] text-slate-600 font-bold truncate max-w-[300px]">{row.destino || row.tipo || '-'}</TableCell>
                  <TableCell className={cn(
                    "py-4 text-right font-mono font-black pr-8",
                    (row.valor || row.quantidade) < 0 ? "text-rose-500" : "text-slate-900"
                  )}>
                    {(row.valor || row.quantidade)?.toLocaleString('pt-BR')}
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
