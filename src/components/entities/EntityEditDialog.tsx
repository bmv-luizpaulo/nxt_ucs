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
  Layers,
  Plus,
  Trash2,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface EntityEditDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityEditDialog({ entity, open, onOpenChange, onUpdate }: EntityEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [pasteData, setPasteData] = useState<{ section: string; raw: string } | null>(null);
  
  // States for Acquisitions
  const [newAqYear, setNewAqYear] = useState("");
  const [newAqValue, setNewAqValue] = useState("");

  // States for IMEI
  const [newImeiDist, setNewImeiDist] = useState("");
  const [newImeiDate, setNewImeiDate] = useState("");
  const [newImeiDest, setNewImeiDest] = useState("");
  const [newImeiCred, setNewImeiCred] = useState("");
  const [newImeiDeb, setNewImeiDeb] = useState("");

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
    
    // IMEI Adjustment: Débito - Crédito (Neutral in final balance)
    const imeiCredits = sumCredits(formData.tabelaImei);
    const imeiDebits = sumDebits(formData.tabelaImei);
    const imeiPending = imeiDebits - imeiCredits;

    // Saldo Legado: Soma de Disponível + Reservado
    const legDisp = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.disponivel || 0), 0);
    const legRes = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.reservado || 0), 0);
    const legadoTotal = legDisp + legRes;

    const aposentado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.aposentado || 0), 0);
    const bloqueado = (formData.tabelaLegado || []).reduce((acc, c) => acc + (c.bloqueado || 0), 0);

    // EQUAÇÃO: Saldo = Originação + Movimentação - Aquisição
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

  const handleAddAq = () => {
    if (!newAqYear || !newAqValue) return;
    const newItem: RegistroTabela = {
      id: `AQ-${Date.now()}`,
      data: newAqYear,
      destino: `Aquisição Antecipada ${newAqYear}`,
      valor: parseInt(newAqValue) || 0,
    };
    setFormData({
      ...formData,
      tabelaAquisicao: [...(formData.tabelaAquisicao || []), newItem]
    });
    setNewAqYear("");
    setNewAqValue("");
  };

  const handleAddImei = () => {
    if (!newImeiDist || (!newImeiCred && !newImeiDeb)) return;
    const cred = parseInt(newImeiCred) || 0;
    const deb = parseInt(newImeiDeb) || 0;
    const newItem: RegistroTabela = {
      id: `IMEI-${Date.now()}`,
      dist: newImeiDist,
      data: newImeiDate || new Date().toLocaleDateString('pt-BR'),
      destino: newImeiDest || "Transferência IMEI",
      valorCredito: cred,
      valorDebito: deb,
      valor: deb - cred, // Líquido
    };
    setFormData({
      ...formData,
      tabelaImei: [...(formData.tabelaImei || []), newItem]
    });
    setNewImeiDist("");
    setNewImeiDate("");
    setNewImeiDest("");
    setNewImeiCred("");
    setNewImeiDeb("");
  };

  const handleDeleteItem = (section: keyof EntidadeSaldo, id: string) => {
    setFormData({
      ...formData,
      [section]: (formData[section] as any[] || []).filter(item => item.id !== id && item.dist !== id)
    });
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
            data: parts[0]?.trim() || '',
            plataforma: parts[1]?.trim() || '',
            nome: parts[2]?.trim() || '',
            disponivel: parseVal(parts[4]),
            reservado: parseVal(parts[5]),
            bloqueado: parseVal(parts[6]),
            aposentado: parseVal(parts[7]),
          };
        
        case 'tabelaImei':
          const cred = parseVal(parts[3]);
          const deb = parseVal(parts[4]);
          return {
            dist: parts[0]?.trim() || '',
            data: parts[1]?.trim() || '',
            destino: parts[2]?.trim() || '',
            valorCredito: cred,
            valorDebito: deb,
            valor: deb - cred,
          };

        case 'tabelaOriginacao':
          let volOrig = 0;
          for (let j = parts.length - 1; j >= 0; j--) {
            const val = parseVal(parts[j]);
            if (val !== 0) {
              volOrig = val;
              break;
            }
          }
          return {
            dist: parts[0]?.trim() || '',
            data: parts[1]?.trim() || '',
            destino: parts[2]?.trim() || '',
            valor: volOrig,
          };

        default:
          return {
            dist: parts[0]?.trim() || '',
            data: parts[1]?.trim() || '',
            destino: parts[2]?.trim() || '',
            valor: parseVal(parts[parts.length - 1]),
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
          <DialogTitle>Console de Auditoria Técnica - {entity.nome}</DialogTitle>
          <DialogDescription>Detalhamento de conferência e rastreabilidade Ledger.</DialogDescription>
        </DialogHeader>

        <div className="bg-[#0B0F1A] p-10 shrink-0 text-white relative">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-primary">AUDITORIA TÉCNICA BMV</p>
              </div>
              <h1 className="text-[30px] font-black tracking-tight uppercase leading-none">{entity.nome}</h1>
              <p className="text-[14px] font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
            </div>

            <div className="bg-[#161B2E] border border-white/5 rounded-[2rem] p-8 min-w-[340px] shadow-2xl flex flex-col items-end relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-3xl -mr-20 -mt-20"></div>
               <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10">Saldo Final Auditado</p>
               <div className="flex items-baseline gap-3 relative z-10">
                  <span className="text-[42px] font-black text-white tracking-tighter">{totals.final.toLocaleString('pt-BR')}</span>
                  <span className="text-[12px] font-black text-primary uppercase tracking-widest">UCS</span>
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
            <div className="space-y-6">
              <SectionHeader 
                title="LANÇAMENTOS DE ORIGINAÇÃO" 
                value={totals.orig} 
                onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })}
              />
              <SectionTable data={formData.tabelaOriginacao || []} type="originacao" />
            </div>

            <div className="space-y-6">
              <SectionHeader 
                title="MOVIMENTAÇÕES / RETIRADAS" 
                value={totals.mov} 
                isNegative 
                onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })}
              />
              <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Referência</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Data</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Destino/Histórico</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Volume (UCS)</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-center pr-8">Status Auditoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.tabelaMovimentacao || []).length === 0 ? (
                      <EmptyState message="AGUARDANDO INSERÇÃO TÉCNICA DE DADOS..." />
                    ) : (
                      formData.tabelaMovimentacao?.map((row, i) => {
                        const isTransfer = row.destino?.toLowerCase().includes('transferência') || row.destino?.toLowerCase().includes('cliente');
                        return (
                          <TableRow key={i} className={cn(
                            "border-b border-slate-50 last:border-0 group transition-colors",
                            isTransfer ? "bg-indigo-50/50 hover:bg-indigo-50/80" : "hover:bg-slate-50/50"
                          )}>
                            <TableCell className="py-4 text-[12px] font-bold text-slate-600 font-mono">{row.dist || row.id || '-'}</TableCell>
                            <TableCell className="py-4 text-[12px] text-slate-400">{row.data}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[12px] font-bold text-slate-700 truncate max-w-[300px]">{row.destino || row.tipo || '-'}</span>
                                {isTransfer && <Badge className="w-fit bg-indigo-100 text-indigo-600 border-indigo-200 text-[9px] font-black h-4 px-1">TRANSFERÊNCIA ENTRE CLIENTES</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-right font-mono font-black pr-4 text-[12px] text-rose-500">
                              {row.valor?.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-center pr-8">
                              <Select value={row.statusAuditoria || "pago"}>
                                <SelectTrigger className="h-9 text-[10px] font-black uppercase rounded-lg border-none shadow-none bg-slate-100">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pago" className="text-[11px] font-bold">PAGO / PROCESSADO</SelectItem>
                                  <SelectItem value="nao_pago" className="text-[11px] font-bold">NÃO PAGO / ERRO</SelectItem>
                                  <SelectItem value="a_conferir" className="text-[11px] font-bold">A CONFERIR / PENDENTE</SelectItem>
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

            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-[#10B981] rounded-full" />
                  <div className="flex flex-col">
                    <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900">TRANSFERÊNCIAS IMEI</h3>
                    <p className="text-[11px] font-bold uppercase tracking-tighter text-slate-400">
                      AJUSTE LÍQUIDO: <span className="font-black text-indigo-600">
                        {totals.imeiPending.toLocaleString()} UCS
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Dist" value={newImeiDist} onChange={e => setNewImeiDist(e.target.value)} className="h-10 w-20 text-[11px] font-bold rounded-xl" />
                  <Input placeholder="Data" value={newImeiDate} onChange={e => setNewImeiDate(e.target.value)} className="h-10 w-28 text-[11px] font-bold rounded-xl" />
                  <Input placeholder="Destino" value={newImeiDest} onChange={e => setNewImeiDest(e.target.value)} className="h-10 w-40 text-[11px] font-bold rounded-xl" />
                  <Input type="number" placeholder="Crédito" value={newImeiCred} onChange={e => setNewImeiCred(e.target.value)} className="h-10 w-24 text-[11px] font-bold rounded-xl text-emerald-600" />
                  <Input type="number" placeholder="Débito" value={newImeiDeb} onChange={e => setNewImeiDeb(e.target.value)} className="h-10 w-24 text-[11px] font-bold rounded-xl text-rose-500" />
                  <Button onClick={handleAddImei} className="h-10 px-4 rounded-full bg-primary text-white text-[10px] font-black uppercase gap-2"><Plus className="w-4 h-4"/> Add</Button>
                  <Button variant="outline" onClick={() => setPasteData({ section: 'tabelaImei', raw: '' })} className="h-10 px-4 rounded-full border-slate-200 text-[10px] font-black uppercase gap-2"><Calculator className="w-4 h-4"/> Calc</Button>
                </div>
              </div>
              <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Dist.</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Data Inicio</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Usuário Destino</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Crédito (UCS)</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Débito (UCS)</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Ajuste Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.tabelaImei || []).length === 0 ? (
                      <EmptyState message="AGUARDANDO INSERÇÃO TÉCNICA DE DADOS..." />
                    ) : (
                      formData.tabelaImei?.map((row, i) => (
                        <TableRow key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <TableCell className="py-4 text-[12px] font-bold text-slate-600 font-mono">{row.dist || '-'}</TableCell>
                          <TableCell className="py-4 text-[12px] text-slate-400">{row.data}</TableCell>
                          <TableCell className="py-4 text-[11px] text-slate-600 font-bold truncate max-w-[350px]">{row.destino}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-[12px] text-emerald-600">{row.valorCredito?.toLocaleString('pt-BR') || '0'}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-[12px] text-rose-500">{row.valorDebito?.toLocaleString('pt-BR') || '0'}</TableCell>
                          <TableCell className={cn(
                            "text-right font-mono font-black pr-8 text-[12px]",
                            (row.valor || 0) > 0 ? "text-indigo-500" : "text-emerald-600"
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

            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-[#10B981] rounded-full" />
                  <div className="flex flex-col">
                    <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900">AQUISIÇÃO DE UCS</h3>
                    <p className="text-[11px] font-bold uppercase tracking-tighter text-slate-400">
                      CONSOLIDADO: <span className="font-black text-emerald-600">
                        {Math.abs(totals.aq || 0).toLocaleString()} UCS
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input placeholder="Ano" value={newAqYear} onChange={e => setNewAqYear(e.target.value)} className="h-11 w-24 rounded-xl text-[11px] font-bold" />
                  <Input type="number" placeholder="Volume UCS" value={newAqValue} onChange={e => setNewAqValue(e.target.value)} className="h-11 w-32 rounded-xl text-[11px] font-bold" />
                  <Button onClick={handleAddAq} className="h-11 px-6 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest gap-2">
                    <Plus className="w-4 h-4" /> Adicionar
                  </Button>
                </div>
              </div>
              <SectionTable data={formData.tabelaAquisicao || []} type="aquisicao" />
            </div>

            <div className="space-y-6">
              <SectionHeader 
                title="SALDO LEGADO CONSOLIDADO" 
                value={totals.legadoTotal} 
                isLegado 
                onPaste={() => setPasteData({ section: 'tabelaLegado', raw: '' })}
              />
              <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Atualização</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Plataforma</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Disponível</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Reservado</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Bloqueado</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Aposentado</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Total (REF)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.tabelaLegado || []).length === 0 ? (
                      <EmptyState message="AGUARDANDO INSERÇÃO TÉCNICA DE DADOS..." />
                    ) : (
                      formData.tabelaLegado?.map((row, i) => (
                        <TableRow key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-5 text-[12px] font-bold text-slate-600 whitespace-nowrap">{row.data}</TableCell>
                          <TableCell className="py-5 text-[11px] font-black uppercase text-slate-500">{row.plataforma}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-[12px] text-emerald-600">{row.disponivel?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-[12px] text-emerald-600">{row.reservado?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-[12px] text-rose-500">{row.bloqueado?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-[12px] text-slate-400">{row.aposentado?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-mono font-black text-[12px] text-emerald-600 pr-8">
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

        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[12px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 hover:bg-rose-50 px-8 rounded-xl h-14">
            Sair Sem Salvar
          </Button>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handlePrint} className="h-14 px-10 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[12px] tracking-widest text-slate-700 hover:bg-white">
              <Printer className="w-5 h-5 mr-2" /> Gerar Relatório PDF
            </Button>
            <Button onClick={handleSave} className="h-14 px-12 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-200">
              <Save className="w-5 h-5 mr-2" /> Salvar no Ledger
            </Button>
          </div>
        </div>

        {pasteData && (
          <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
            <DialogContent className="max-w-xl rounded-3xl p-8 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase text-slate-900 flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-primary" /> Colagem de Dados: {pasteData.section.replace('tabela', '').toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-400">
                  Copie as colunas do seu Excel e cole no campo abaixo para processamento automático.
                </DialogDescription>
              </DialogHeader>
              <Textarea 
                value={pasteData.raw} 
                onChange={e => setPasteData({ ...pasteData, raw: e.target.value })}
                placeholder="Cole os dados aqui..."
                className="min-h-[250px] font-mono text-[11px] bg-slate-50 border-slate-200 rounded-2xl p-6 focus:ring-primary"
              />
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setPasteData(null)} className="flex-1 rounded-xl font-bold uppercase text-[11px]">Cancelar</Button>
                <Button onClick={handleProcessPaste} className="flex-1 rounded-xl font-black uppercase text-[11px]">Processar e Importar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isReference, isPending, percentage }: any) {
  return (
    <div className={cn(
      "border rounded-2xl p-5 flex flex-col justify-between h-[110px] transition-all group relative",
      isReference ? "bg-amber-500/10 border-amber-500/20" : 
      isPending ? "bg-indigo-500/10 border-indigo-500/20" :
      "bg-[#161B2E] border-white/5 hover:bg-[#1C2237]"
    )}>
      <div className="flex justify-between items-start w-full">
        <p className={cn(
          "text-[12px] font-black uppercase tracking-widest leading-none",
          isReference ? "text-amber-500" : isPending ? "text-indigo-400" : "text-slate-500"
        )}>
          {label} {isReference && "(REF)"} {isPending && "(PENDÊNCIA)"}
        </p>
        {percentage !== undefined && (
          <span className={cn(
            "text-[10px] font-black px-1.5 py-0.5 rounded-md",
            value < 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {percentage}%
          </span>
        )}
      </div>
      <p className={cn(
        "text-[30px] font-black font-mono leading-none tracking-tight",
        isNegative ? "text-rose-500" : 
        isHighlight ? "text-emerald-400" : 
        isReference ? "text-amber-500" : 
        isPending ? "text-indigo-400" :
        "text-white"
      )}>
        {value === 0 ? "0" : value.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function SectionHeader({ title, value, isNegative, isLegado, isImei, onPaste }: any) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 pb-5">
      <div className="flex items-center gap-4">
        <div className="w-1.5 h-8 bg-[#10B981] rounded-full" />
        <div className="flex flex-col">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900">{title}</h3>
          <p className={cn(
            "text-[11px] font-bold uppercase tracking-tighter",
            isLegado || isImei ? "text-emerald-600" : "text-slate-400"
          )}>
            CONSOLIDADO: <span className={cn("font-black", !isLegado && !isImei && "text-primary")}>
              {Math.abs(value || 0).toLocaleString()} UCS
            </span>
          </p>
        </div>
      </div>
      <Button 
        variant="outline" 
        onClick={onPaste}
        className="h-11 px-6 rounded-3xl border-slate-200 bg-white text-[11px] font-black uppercase tracking-widest text-slate-500 gap-2.5 hover:bg-slate-50 shadow-sm"
      >
        <Calculator className="w-4 h-4 text-slate-400" /> COLAGEM VIA CALCULADORA
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={10} className="py-24 text-center">
        <div className="flex flex-col items-center gap-4 opacity-10">
          <Layers className="w-14 h-14 text-slate-300" />
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-500">{message}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SectionTable({ data, type }: { data: any[], type: string }) {
  return (
    <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white shadow-sm mb-12">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-b border-slate-100">
            <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Referência</TableHead>
            <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Data</TableHead>
            <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Destino/Histórico</TableHead>
            <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Volume (UCS)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <EmptyState message="AGUARDANDO INSERÇÃO TÉCNICA DE DADOS..." />
          ) : (
            data.map((row: any, i: number) => (
              <TableRow key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <TableCell className="py-4 text-[12px] font-bold text-slate-600 font-mono">{row.dist || row.id || '-'}</TableCell>
                <TableCell className="py-4 text-[12px] text-slate-400">{row.data}</TableCell>
                <TableCell className="py-4 text-[12px] text-slate-600 font-bold truncate max-w-[300px]">{row.destino || row.tipo || '-'}</TableCell>
                <TableCell className="py-4 text-right font-mono font-black pr-8 text-[12px] text-slate-900">
                  {row.valor?.toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
