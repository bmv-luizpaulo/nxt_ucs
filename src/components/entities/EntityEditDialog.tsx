"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Database, ShieldCheck, Table as TableIcon, Calculator, CheckCircle2, Trash2, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      setPasteBuffer("");
      setPreviewRows([]);
    }
  }, [entity]);

  // Cálculo do Saldo Final Auditado seguindo a lógica da planilha
  useEffect(() => {
    const final = 
      (formData.originacao || 0) + 
      (formData.movimentacao || 0) + // Movimentação geralmente vem negativa do parser
      (formData.aposentado || 0) + 
      (formData.bloqueado || 0) + 
      (formData.aquisicao || 0); // Aquisição geralmente vem negativa do parser
    
    if (final !== formData.saldoFinalAtual) {
      setFormData(prev => ({ ...prev, saldoFinalAtual: final }));
    }
  }, [formData.originacao, formData.movimentacao, formData.aposentado, formData.bloqueado, formData.aquisicao]);

  useEffect(() => {
    if (!pasteBuffer.trim()) {
      setPreviewRows([]);
      return;
    }

    const lines = pasteBuffer.split('\n').filter(l => l.trim());
    const results: RegistroTabela[] = [];

    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length < 2) return;

      // Ignorar cabeçalhos
      const headerKeywords = ['dist', 'data', 'usuário', 'disponível', 'total', 'nome', 'documento', 'plataforma', 'originação'];
      if (headerKeywords.some(key => line.toLowerCase().includes(key))) return;

      if (activePasteField === 'saldoLegadoTotal') {
        if (parts.length >= 5) {
          results.push({
            data: parts[0]?.trim(),
            plataforma: parts[1]?.trim(),
            nome: parts[2]?.trim(),
            documento: parts[3]?.trim(),
            disponivel: parseFloat(parts[4]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            reservado: parseFloat(parts[5]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            bloqueado: parseFloat(parts[6]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            aposentado: parseFloat(parts[7]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            valor: parseFloat(parts[4]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
          });
        }
      } else if (activePasteField === 'originacao') {
        const valor = parseFloat(parts[parts.length - 2]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        results.push({ 
          dist: parts[0]?.trim(), 
          data: parts[1]?.trim(), 
          destino: parts[2]?.trim(), 
          valor 
        });
      } else if (activePasteField === 'saldoAjustarImei') {
        const credito = parseFloat(parts[parts.length - 2]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        const debito = parseFloat(parts[parts.length - 1]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        results.push({
          dist: parts[0]?.trim(),
          data: parts[1]?.trim(),
          destino: parts[2]?.trim(),
          valor: credito - debito,
          valorCredito: credito,
          valorDebito: debito
        });
      } else if (activePasteField === 'aquisicao') {
        const valor = parseFloat(parts[parts.length - 1]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        results.push({
          nome: parts[0]?.trim() || "Aquisição BMTCA",
          ano: parts.length > 3 ? parts[parts.length - 3]?.trim() : "N/A",
          valor: -valor // Débito pois sai da conta do produtor
        });
      } else {
        // Movimentação, Aposentado, Bloqueado
        const valorRaw = parts[parts.length - 2]?.replace(/[R$\s.]/g, '').replace(',', '.') || "0";
        const valor = parseFloat(valorRaw) || 0;
        results.push({ 
          dist: parts[0]?.trim(), 
          data: parts[1]?.trim(), 
          destino: parts[2]?.trim(), 
          valor: -valor, // Sempre negativo para retiradas
          situacao: parts[parts.length - 1]?.trim()
        });
      }
    });

    setPreviewRows(results);
  }, [pasteBuffer, activePasteField]);

  const consolidateField = () => {
    if (!activePasteField || previewRows.length === 0) return;

    const totalCalculated = previewRows.reduce((acc, row) => acc + (row.valor || 0), 0);
    
    const tableMapping: Record<string, keyof EntidadeSaldo> = {
      originacao: 'tabelaOriginacao',
      movimentacao: 'tabelaMovimentacao',
      aposentado: 'tabelaMovimentacao',
      bloqueado: 'tabelaMovimentacao',
      aquisicao: 'tabelaAquisicao',
      saldoAjustarImei: 'tabelaImei',
      saldoLegadoTotal: 'tabelaLegado'
    };

    const targetTable = tableMapping[activePasteField as string];
    
    setFormData(prev => ({ 
      ...prev, 
      [activePasteField]: totalCalculated,
      [targetTable]: previewRows
    }));
    
    setPasteBuffer("");
    setPreviewRows([]);
    setActivePasteField(null);
    
    toast({ 
      title: "Consolidação Concluída", 
      description: `Tabela e Saldo de ${activePasteField.toString().toUpperCase()} atualizados no Ledger.` 
    });
  };

  const handleIndividualSave = () => {
    if (!entity) return;
    onUpdate(entity.id, formData);
    onOpenChange(false);
  };

  const clearTable = (tableField: keyof EntidadeSaldo, balanceField: keyof EntidadeSaldo) => {
    setFormData(prev => ({ 
      ...prev, 
      [tableField]: [],
      [balanceField]: 0 
    }));
    toast({ variant: "destructive", title: "Registros e saldo removidos" });
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[95vh] overflow-hidden bg-[#F8FAFC] border-none shadow-2xl rounded-[3rem] p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Auditoria Permanente LedgerTrust - {entity.nome}</DialogTitle>
          <DialogDescription>Gestão de auditoria para produtores e associações.</DialogDescription>
        </DialogHeader>
        
        {/* Cabeçalho Escuro Estilo Screenshot */}
        <div className="bg-[#111827] px-10 py-10 text-white shrink-0 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)} 
            className="absolute right-8 top-8 text-slate-500 hover:text-white"
          >
            <X className="w-6 h-6" />
          </Button>
          
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Auditoria Permanente LedgerTrust</p>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-white">{entity.nome}</h2>
              <div className="flex gap-6 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOC: <span className="text-white font-mono">{entity.documento}</span></p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF: <span className="text-white">{entity.uf}</span></p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Saldo Final Auditado</p>
              <div className="flex items-baseline justify-end gap-3 text-[#10B981]">
                <span className="text-6xl font-black tracking-tighter">{(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')}</span>
                <span className="text-sm font-black opacity-60 uppercase">UCS</span>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-10 space-y-12">
            
            {/* Sessão: Resumo Ledger */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TableIcon className="w-5 h-5 text-slate-400" />
                  <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Consolidação de Saldos (Resumo Ledger)</h3>
                </div>
                <div className="bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saldos atualizados conforme colagem nas tabelas abaixo</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                {[
                  { label: "Originação", val: formData.originacao, color: "text-slate-900" },
                  { label: "Movimentação", val: formData.movimentacao, color: "text-rose-600" },
                  { label: "Aposentado", val: formData.aposentado, color: "text-slate-600" },
                  { label: "Bloqueado", val: formData.bloqueado, color: "text-amber-600" },
                  { label: "Aquisição", val: formData.aquisicao, color: "text-emerald-600" },
                  { label: "Ajuste IMEI", val: formData.saldoAjustarImei, color: "text-indigo-600" },
                  { label: "Legado", val: formData.saldoLegadoTotal, color: "text-slate-400" }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white p-6 space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">{s.label}</Label>
                    <div className={cn("text-lg font-black font-mono", s.color)}>
                      {(s.val || 0).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid de Tabelas Técnicas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Histórico de Originação */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-300" />
                    <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Histórico de Originação</h3>
                  </div>
                  <ImportButton 
                    title="Originação" 
                    onImport={consolidateField} 
                    activeField="originacao" 
                    setActiveField={setActivePasteField}
                    setPasteBuffer={setPasteBuffer}
                    pasteBuffer={pasteBuffer}
                    previewRows={previewRows}
                  />
                </div>
                <div className="flex-1 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-12">
                        <TableHead className="text-[9px] font-black uppercase">Dist.</TableHead>
                        <TableHead className="text-[9px] font-black uppercase">Data Inicio</TableHead>
                        <TableHead className="text-[9px] font-black uppercase">Usuário Destino</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-right">Crédito (UCS)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!formData.tabelaOriginacao || formData.tabelaOriginacao.length === 0) ? (
                        <TableRow><TableCell colSpan={4} className="h-64 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aguardando colagem de dados na calculadora de originação</TableCell></TableRow>
                      ) : (
                        formData.tabelaOriginacao.map((row, i) => (
                          <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-emerald-50/20">
                            <TableCell className="py-2 text-[10px] font-mono">{row.dist}</TableCell>
                            <TableCell className="py-2 text-[10px] text-slate-500">{row.data}</TableCell>
                            <TableCell className="py-2 text-[10px] truncate max-w-[150px]">{row.destino}</TableCell>
                            <TableCell className="py-2 text-right font-mono text-[10px] font-black text-emerald-600">{row.valor?.toLocaleString('pt-BR')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Histórico de Movimentações */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-300" />
                    <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Histórico de Movimentações</h3>
                  </div>
                  <ImportButton 
                    title="Movimentação" 
                    onImport={consolidateField} 
                    activeField="movimentacao" 
                    setActiveField={setActivePasteField}
                    setPasteBuffer={setPasteBuffer}
                    pasteBuffer={pasteBuffer}
                    previewRows={previewRows}
                  />
                </div>
                <div className="flex-1 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-12">
                        <TableHead className="text-[9px] font-black uppercase">Dist.</TableHead>
                        <TableHead className="text-[9px] font-black uppercase">Data Inicio</TableHead>
                        <TableHead className="text-[9px] font-black uppercase">Usuário Destino</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-right">Débito (UCS)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!formData.tabelaMovimentacao || formData.tabelaMovimentacao.length === 0) ? (
                        <TableRow><TableCell colSpan={4} className="h-64 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aguardando colagem de dados na calculadora de movimentação</TableCell></TableRow>
                      ) : (
                        formData.tabelaMovimentacao.map((row, i) => (
                          <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-rose-50/20">
                            <TableCell className="py-2 text-[10px] font-mono">{row.dist}</TableCell>
                            <TableCell className="py-2 text-[10px] text-slate-500">{row.data}</TableCell>
                            <TableCell className="py-2 text-[10px] truncate max-w-[150px]">{row.destino}</TableCell>
                            <TableCell className="py-2 text-right font-mono text-[10px] font-black text-rose-500">{Math.abs(row.valor || 0)?.toLocaleString('pt-BR')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Detalhamento IMEI */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-300" />
                    <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Detalhamento IMEI</h3>
                  </div>
                  <ImportButton 
                    title="Saldo IMEI" 
                    onImport={consolidateField} 
                    activeField="saldoAjustarImei" 
                    setActiveField={setActivePasteField}
                    setPasteBuffer={setPasteBuffer}
                    pasteBuffer={pasteBuffer}
                    previewRows={previewRows}
                  />
                </div>
                <div className="flex-1 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-12">
                        <TableHead className="text-[9px] font-black uppercase">Dist.</TableHead>
                        <TableHead className="text-[9px] font-black uppercase">Crédito (Depósito)</TableHead>
                        <TableHead className="text-[9px] font-black uppercase">Débito (Estorno)</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-right">Ajuste</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!formData.tabelaImei || formData.tabelaImei.length === 0) ? (
                        <TableRow><TableCell colSpan={4} className="h-64 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aguardando dados de transferências e estornos IMEI</TableCell></TableRow>
                      ) : (
                        formData.tabelaImei.map((row, i) => (
                          <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-indigo-50/20">
                            <TableCell className="py-2 text-[10px] font-mono">{row.dist}</TableCell>
                            <TableCell className="py-2 text-[10px] text-emerald-600 font-bold">{row.valorCredito?.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="py-2 text-[10px] text-rose-500 font-bold">{row.valorDebito?.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="py-2 text-right font-mono text-[10px] font-black text-indigo-600">{row.valor?.toLocaleString('pt-BR')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Aquisição de UCs */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-300" />
                    <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Aquisição de UCs (BMTCA)</h3>
                  </div>
                  <ImportButton 
                    title="Aquisição" 
                    onImport={consolidateField} 
                    activeField="aquisicao" 
                    setActiveField={setActivePasteField}
                    setPasteBuffer={setPasteBuffer}
                    pasteBuffer={pasteBuffer}
                    previewRows={previewRows}
                  />
                </div>
                <div className="flex-1 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-12">
                        <TableHead className="text-[9px] font-black uppercase">Usuário/Descrição</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-center">Ano</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-right">Volume (UCS)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!formData.tabelaAquisicao || formData.tabelaAquisicao.length === 0) ? (
                        <TableRow><TableCell colSpan={3} className="h-64 text-center text-[10px] font-bold text-slate-300 uppercase italic">Nenhuma aquisição antecipada registrada</TableCell></TableRow>
                      ) : (
                        formData.tabelaAquisicao.map((row, i) => (
                          <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-emerald-50/20">
                            <TableCell className="py-2 text-[10px] font-bold text-slate-700">{row.nome}</TableCell>
                            <TableCell className="py-2 text-[10px] text-center text-slate-500">{row.ano}</TableCell>
                            <TableCell className="py-2 text-right font-mono text-[10px] font-black text-emerald-600">{Math.abs(row.valor || 0)?.toLocaleString('pt-BR')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Sessão: Extrato Legado */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-slate-300" />
                  <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Extrato Legado Auditado</h3>
                </div>
                <ImportButton 
                  title="Legado" 
                  onImport={consolidateField} 
                  activeField="saldoLegadoTotal" 
                  setActiveField={setActivePasteField}
                  setPasteBuffer={setPasteBuffer}
                  pasteBuffer={pasteBuffer}
                  previewRows={previewRows}
                />
              </div>
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-12">
                      <TableHead className="text-[9px] font-black uppercase">Data Atualização</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Plataforma</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Nome/Documento</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-right">Disponível</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-right">Reservado</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-right">Aposentado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!formData.tabelaLegado || formData.tabelaLegado.length === 0) ? (
                      <TableRow><TableCell colSpan={6} className="h-48 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aguardando colagem de extrato consolidado das carteiras</TableCell></TableRow>
                    ) : (
                      formData.tabelaLegado.map((row, i) => (
                        <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-slate-100/50">
                          <TableCell className="py-2 text-[10px] font-mono text-slate-400">{row.data}</TableCell>
                          <TableCell className="py-2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">{row.plataforma}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase">{row.nome}</span>
                              <span className="text-[8px] font-mono text-slate-400">{row.documento}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-[11px] font-black text-primary">{row.disponivel?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="py-2 text-right font-mono text-[10px] text-amber-500">{row.reservado?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="py-2 text-right font-mono text-[10px] text-rose-400">{row.aposentado?.toLocaleString('pt-BR')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Rodapé de Ações Fixo */}
        <div className="p-8 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-12 h-16 font-black uppercase text-[10px] text-slate-400 hover:text-rose-500 transition-colors">
            Descartar Alterações
          </Button>
          <Button 
            onClick={handleIndividualSave} 
            className="px-20 h-20 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 bg-[#10B981] hover:bg-[#059669] text-white transition-all active:scale-95 flex gap-4"
          >
            <Save className="w-6 h-6" /> Gravar Auditoria Permanente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente auxiliar para o botão de importação nos cabeçalhos
function ImportButton({ title, onImport, activeField, setActiveField, setPasteBuffer, pasteBuffer, previewRows }: any) {
  return (
    <Popover 
      open={pasteBuffer !== "" || activeField === activeField} 
      onOpenChange={(open) => !open && (setPasteBuffer(""), setActiveField(null))}
    >
      <PopoverTrigger asChild>
        <Button 
          onClick={() => setActiveField(activeField)}
          className="h-10 px-6 font-black uppercase text-[10px] tracking-widest bg-[#10B981] hover:bg-[#059669] text-white rounded-full flex gap-2 shadow-lg shadow-emerald-100"
        >
          <Plus className="w-4 h-4" /> Importar Dados (Excel)
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0 rounded-[2.5rem] shadow-2xl border-none bg-[#111827] overflow-hidden" side="top">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-[#10B981]" />
              <p className="text-[11px] font-black uppercase tracking-widest">Processador Inteligente: {title}</p>
            </div>
            {previewRows.length > 0 && (
              <span className="text-[10px] font-black text-[#10B981] bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                LÍQUIDO: {previewRows.reduce((a: number, b: any) => a + (b.valor || 0), 0).toLocaleString('pt-BR')} UCS
              </span>
            )}
          </div>
          <Textarea 
            value={pasteBuffer}
            onChange={e => setPasteBuffer(e.target.value)}
            placeholder={`Cole as colunas de ${title} aqui...`}
            className="bg-[#1F2937] border-slate-700 text-[10px] font-mono h-48 resize-none text-slate-300 rounded-2xl focus:ring-[#10B981] focus:border-[#10B981] p-6 shadow-inner"
          />
          <div className="flex gap-4">
            <Button 
              onClick={onImport} 
              disabled={previewRows.length === 0} 
              className="flex-1 h-14 font-black uppercase text-xs bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl shadow-xl shadow-emerald-900/20"
            >
              Confirmar e Sincronizar Tabela
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
