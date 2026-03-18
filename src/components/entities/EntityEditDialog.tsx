"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ShieldCheck, Calculator, History, Download, TrendingUp, ArrowRightLeft, CreditCard, X, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
    }
  }, [entity]);

  // Cálculo Dinâmico de Saldos
  useEffect(() => {
    const sumTable = (table?: RegistroTabela[]) => (table || []).reduce((acc, row) => acc + (row.valor || 0), 0);
    
    // Saldo Final Auditado: Apenas operações ativas
    const operationsTotal = 
      sumTable(formData.tabelaOriginacao) + 
      sumTable(formData.tabelaMovimentacao) + 
      sumTable(formData.tabelaImei) + 
      sumTable(formData.tabelaAquisicao);
    
    // Saldo Legado: Valor de Referência (Independente)
    const legadoTotal = sumTable(formData.tabelaLegado);
    
    setFormData(prev => ({ 
      ...prev, 
      saldoFinalAtual: operationsTotal,
      saldoLegadoTotal: legadoTotal 
    }));
  }, [
    formData.tabelaOriginacao, 
    formData.tabelaMovimentacao, 
    formData.tabelaImei, 
    formData.tabelaAquisicao, 
    formData.tabelaLegado
  ]);

  // Parser Heurístico para os dados colados
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
      if (line.toLowerCase().includes('data') || line.toLowerCase().includes('usuário')) return;

      const parseBRL = (val: string) => {
        if (!val) return 0;
        return parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      };

      if (activePasteField === 'tabelaLegado') {
        const disp = parseBRL(parts[2] || parts[4]); // Suporte a colunas variáveis
        const res = parseBRL(parts[3] || parts[5]);
        
        results.push({
          data: parts[0]?.trim() || "N/A",
          plataforma: parts[1]?.trim() || "N/A",
          disponivel: disp,
          reservado: res,
          valor: disp + res, // Total consolidado por linha
        });
      } else if (activePasteField === 'tabelaImei') {
        const cred = parseBRL(parts[parts.length - 2]);
        const deb = parseBRL(parts[parts.length - 1]);
        results.push({ dist: parts[0]?.trim(), data: parts[1]?.trim(), destino: parts[2]?.trim(), valor: cred - deb, valorCredito: cred, valorDebito: deb });
      } else {
        const valor = parseBRL(parts[parts.length - 1]);
        const isNegative = activePasteField === 'tabelaMovimentacao' || activePasteField === 'tabelaAquisicao';
        results.push({ 
          dist: parts[0]?.trim(), 
          data: parts[1]?.trim(), 
          destino: parts[2]?.trim(), 
          valor: isNegative ? -valor : valor,
        });
      }
    });

    setPreviewRows(results);
  }, [pasteBuffer, activePasteField]);

  const handleConfirmSection = () => {
    if (!activePasteField) return;
    setFormData(prev => ({ ...prev, [activePasteField]: previewRows }));
    setPasteBuffer("");
    setPreviewRows([]);
    setActivePasteField(null);
    toast({ title: "Dados Consolidados", description: "O histórico foi atualizado no Ledger." });
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[1100px] h-[95vh] flex flex-col p-0 border-none bg-white shadow-2xl overflow-hidden rounded-[2.5rem]"
        onPointerDownOutside={(e) => { if (activePasteField) e.preventDefault(); }}
        onInteractOutside={(e) => { if (activePasteField) e.preventDefault(); }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Auditoria de Produtor: {entity.nome}</DialogTitle>
          <DialogDescription>Console executivo para conciliação de ativos e rastreabilidade.</DialogDescription>
        </DialogHeader>

        {/* PROCESSADOR DE DADOS */}
        {activePasteField && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-12 animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-10 flex justify-between items-start">
                <div className="flex gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                    <Calculator className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Processador de Dados</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      IMPORTAÇÃO TÉCNICA: {activePasteField.replace('tabela', '').toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setActivePasteField(null); setPasteBuffer(""); }} className="rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </Button>
              </div>

              <div className="px-10 flex-1">
                <Textarea 
                  autoFocus
                  value={pasteBuffer}
                  onChange={e => setPasteBuffer(e.target.value)}
                  placeholder="Cole as colunas aqui..."
                  className="w-full h-64 bg-slate-50/50 border-slate-200 text-slate-900 font-mono text-sm p-8 rounded-3xl resize-none shadow-inner"
                />
              </div>

              <div className="p-10">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Identificado</p>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-5xl font-black tracking-tighter",
                        previewRows.reduce((a, r) => a + (r.valor || 0), 0) < 0 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {previewRows.reduce((a, r) => a + (r.valor || 0), 0).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs font-black text-slate-300 uppercase">UCS</span>
                    </div>
                  </div>
                  <Button onClick={handleConfirmSection} disabled={!pasteBuffer.trim()} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CABEÇALHO EXECUTIVO */}
        <div className="bg-[#0F172A] px-12 py-10 shrink-0 flex justify-between items-end">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Relatório de Rastreabilidade BMV</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-3">{entity.nome}</h2>
              <div className="flex gap-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Registro Único</span>
                  <span className="text-sm font-mono font-bold text-slate-300 tracking-tighter">{entity.documento}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Localidade</span>
                  <span className="text-sm font-bold text-slate-300">{entity.uf || "MT"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-12 text-right">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Saldo Legado (REF)</span>
              <div className="flex items-baseline justify-end gap-3 text-amber-500">
                <span className="text-4xl font-black tracking-tighter">{(formData.saldoLegadoTotal || 0).toLocaleString('pt-BR')}</span>
                <span className="text-xl font-black opacity-30">UCS</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Saldo Final Auditado</span>
              <div className="flex items-baseline justify-end gap-3 text-primary">
                <span className="text-6xl font-black tracking-tighter">{(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')}</span>
                <span className="text-2xl font-black opacity-30">UCS</span>
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA DE AUDITORIA */}
        <ScrollArea className="flex-1">
          <div className="p-12 space-y-12">
            <SectionTechnical 
              title="Originação de Ativos"
              icon={TrendingUp}
              onImport={() => setActivePasteField('tabelaOriginacao')}
              data={formData.tabelaOriginacao || []}
              columns={[
                { label: "Ref. Dist.", key: "dist" },
                { label: "Data Início", key: "data" },
                { label: "Destino", key: "destino" },
                { label: "Volume", key: "valor", align: "right", variant: "emerald" }
              ]}
            />

            <SectionTechnical 
              title="Movimentações / Retiradas"
              icon={ArrowRightLeft}
              onImport={() => setActivePasteField('tabelaMovimentacao')}
              data={formData.tabelaMovimentacao || []}
              columns={[
                { label: "Ref. Dist.", key: "dist" },
                { label: "Data Operação", key: "data" },
                { label: "Destinatário", key: "destino" },
                { label: "Débito", key: "valor", align: "right", variant: "rose" }
              ]}
            />

            <SectionTechnical 
              title="Transferências IMEI"
              icon={CreditCard}
              onImport={() => setActivePasteField('tabelaImei')}
              data={formData.tabelaImei || []}
              columns={[
                { label: "Dist.", key: "dist" },
                { label: "Crédito", key: "valorCredito", variant: "emerald" },
                { label: "Débito", key: "valorDebito", variant: "rose" },
                { label: "Líquido", key: "valor", align: "right", variant: "primary" }
              ]}
            />

            <SectionTechnical 
              title="Aquisição de UCs"
              icon={Database}
              onImport={() => setActivePasteField('tabelaAquisicao')}
              data={formData.tabelaAquisicao || []}
              columns={[
                { label: "Data", key: "data" },
                { label: "Descrição", key: "destino" },
                { label: "Volume Adquirido", key: "valor", align: "right", variant: "primary" }
              ]}
            />

            <SectionTechnical 
              title="Saldo Legado Consolidado"
              icon={History}
              color="amber"
              onImport={() => setActivePasteField('tabelaLegado')}
              data={formData.tabelaLegado || []}
              columns={[
                { label: "Atualização", key: "data" },
                { label: "Plataforma", key: "plataforma" },
                { label: "Disponível", key: "disponivel", align: "right", variant: "slate" },
                { label: "Reservado", key: "reservado", align: "right", variant: "slate" },
                { label: "Total (D+R)", key: "valor", align: "right", variant: "emerald" }
              ]}
            />
          </div>
        </ScrollArea>

        {/* RODAPÉ FIXO */}
        <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-8">
            Cancelar Auditoria
          </Button>
          <div className="flex gap-4">
            <Button variant="outline" className="h-12 px-8 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest text-slate-600 gap-2">
              <Download className="w-4 h-4" /> Relatório Técnico
            </Button>
            <Button onClick={() => { onUpdate(entity.id, formData); onOpenChange(false); }} className="h-12 px-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3">
              <Save className="w-5 h-5" /> Gravar Registro Permanente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTechnical({ title, icon: Icon, color = "emerald", onImport, data, columns }: any) {
  const currentTotal = (data || []).reduce((acc: number, r: any) => acc + (r.valor || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("w-1.5 h-10 rounded-full", color === "amber" ? "bg-amber-500" : "bg-primary")} />
          <div>
            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Consolidado: <span className={cn("font-black", currentTotal < 0 ? "text-rose-500" : "text-emerald-600")}>
                {currentTotal.toLocaleString('pt-BR')} UCS
              </span>
            </p>
          </div>
        </div>

        <Button onClick={onImport} variant="outline" className="h-11 px-8 rounded-2xl border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-slate-50 transition-all shadow-sm">
          <Calculator className="w-4 h-4" /> Colagem via Calculadora
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[140px] flex flex-col">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-3">
            <Database className="w-8 h-8 text-slate-200" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando importação de dados...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 sticky top-0">
              <TableRow className="h-14 border-b border-slate-100">
                {columns.map((col: any) => (
                  <TableHead key={col.label} className={cn("text-[9px] font-black uppercase tracking-widest text-slate-400 px-8", col.align === 'right' && "text-right")}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, i: number) => (
                <TableRow key={i} className="border-b border-slate-50 last:border-0 h-14 hover:bg-slate-50/30 transition-colors">
                  {columns.map((col: any) => (
                    <TableCell key={col.label} className={cn(
                      "px-8 text-[11px] font-bold text-slate-600 tracking-tight",
                      col.align === 'right' && "text-right",
                      col.variant === 'emerald' && "text-emerald-600",
                      col.variant === 'rose' && "text-rose-500",
                      col.variant === 'amber' && "text-amber-500",
                      col.variant === 'primary' && "text-primary font-black",
                      col.variant === 'slate' && "text-slate-400"
                    )}>
                      {typeof row[col.key] === 'number' ? Math.abs(row[col.key]).toLocaleString('pt-BR') : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
