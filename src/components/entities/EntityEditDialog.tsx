
"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ShieldCheck, Calculator, History, Download, TrendingUp, ArrowRightLeft, CreditCard, X, Database, CheckCircle2, AlertCircle, Clock, FileText, Printer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

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
    const sumField = (table?: RegistroTabela[], field: keyof RegistroTabela) => 
      (table || []).reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
    
    const operationsTotal = 
      sumTable(formData.tabelaOriginacao) + 
      sumTable(formData.tabelaMovimentacao) - 
      sumTable(formData.tabelaAquisicao);
    
    const totalCreditoImei = sumField(formData.tabelaImei, 'valorCredito');
    const totalDebitoImei = sumField(formData.tabelaImei, 'valorDebito');
    const ajusteImei = Math.max(0, totalDebitoImei - totalCreditoImei);

    const legadoTotal = sumTable(formData.tabelaLegado);
    const totalAposentado = sumField(formData.tabelaLegado, 'aposentado');
    const totalBloqueado = sumField(formData.tabelaLegado, 'bloqueado');
    
    setFormData(prev => ({ 
      ...prev, 
      saldoFinalAtual: operationsTotal,
      saldoLegadoTotal: legadoTotal,
      aposentado: totalAposentado,
      bloqueado: totalBloqueado,
      aquisicao: sumTable(formData.tabelaAquisicao),
      movimentacao: sumTable(formData.tabelaMovimentacao),
      saldoAjustarImei: ajusteImei
    }));
  }, [
    formData.tabelaOriginacao, 
    formData.tabelaMovimentacao, 
    formData.tabelaImei, 
    formData.tabelaAquisicao, 
    formData.tabelaLegado
  ]);

  useEffect(() => {
    if (!pasteBuffer.trim()) {
      setPreviewRows([]);
      return;
    }

    const lines = pasteBuffer.split('\n').filter(l => l.trim());
    const results: RegistroTabela[] = [];

    const parseBRL = (val: string) => {
      if (!val) return 0;
      const clean = val.replace(/[R$\s.]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    lines.forEach((line, index) => {
      const parts = line.split(/[\t]{1,}/).map(p => p.trim()).filter(p => p !== "");
      if (parts.length === 0) return;

      const isHeader = (line.toLowerCase().includes('data') || line.toLowerCase().includes('dist') || line.toLowerCase().includes('usuário')) && !/^\d+/.test(line);
      if (isHeader && index === 0) return;

      if (activePasteField === 'tabelaAquisicao') {
        const match = line.match(/(\d{4})[^\d]+(\d+)/);
        if (match) {
          results.push({
            data: match[1],
            destino: `Dedução de Aquisição ${match[1]}`,
            valor: parseInt(match[2]) || 0
          });
        }
      } else if (activePasteField === 'tabelaLegado') {
        if (parts.length < 8) return;
        const disp = parseBRL(parts[4]);
        const res = parseBRL(parts[5]);
        const bloq = parseBRL(parts[6]);
        const apos = parseBRL(parts[7]);
        
        results.push({
          data: parts[0] || "N/A",
          plataforma: parts[1] || "N/A",
          nome: parts[2] || "N/A",
          documento: parts[3] || "N/A",
          disponivel: disp,
          reservado: res,
          bloqueado: bloq,
          aposentado: apos,
          valor: disp + res,
        });
      } else if (activePasteField === 'tabelaImei') {
        if (parts.length < 5) return;
        const deb = parseBRL(parts[parts.length - 1]);
        const cred = parseBRL(parts[parts.length - 2]);
        results.push({ 
          dist: parts[0], 
          data: parts[1], 
          destino: parts[2], 
          valor: cred - deb, 
          valorCredito: cred, 
          valorDebito: deb 
        });
      } else {
        const valorRaw = parts[parts.length - 1];
        const valor = parseBRL(valorRaw);
        const isNegative = activePasteField === 'tabelaMovimentacao';
        
        results.push({ 
          dist: parts[0], 
          data: parts[1], 
          destino: parts[2], 
          situacao: "Processado",
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
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Relatorio_Auditoria_${entity?.nome.replace(/\s+/g, '_')}`;
    window.print();
    document.title = originalTitle;
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[1200px] h-[95vh] flex flex-col p-0 border-none bg-white shadow-2xl overflow-hidden rounded-[2.5rem] print:bg-white print:max-h-none print:h-auto print:rounded-none print:shadow-none"
        onPointerDownOutside={(e) => { if (activePasteField) e.preventDefault(); }}
        onInteractOutside={(e) => { if (activePasteField) e.preventDefault(); }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Auditoria de Produtor: {entity.nome}</DialogTitle>
          <DialogDescription>Console executivo para conciliação de ativos e rastreabilidade total.</DialogDescription>
        </DialogHeader>

        {activePasteField && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-12 animate-in fade-in zoom-in duration-200 print:hidden">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-10 flex justify-between items-start">
                <div className="flex gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                    <Calculator className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Entrada Técnica</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {activePasteField === 'tabelaAquisicao' ? 'FORMATO: ANO - VALOR' : `PROCESSADOR: ${activePasteField.replace('tabela', '').toUpperCase()}`}
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
                  placeholder="Cole aqui os dados copiados..."
                  className="w-full h-64 bg-slate-50/50 border-slate-200 text-slate-900 font-mono text-sm p-8 rounded-3xl resize-none shadow-inner"
                />
              </div>
              <div className="p-10">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Detectado</p>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-5xl font-black tracking-tighter", (activePasteField === 'tabelaAquisicao' || previewRows.reduce((a, r) => a + (r.valor || 0), 0) < 0) ? "text-rose-500" : "text-emerald-500")}>
                        {Math.abs(previewRows.reduce((a, r) => a + (r.valor || 0), 0)).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <Button onClick={handleConfirmSection} disabled={!pasteBuffer.trim()} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary hover:bg-primary/90 text-white">
                    Confirmar e Consolidar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#0F172A] px-12 py-10 shrink-0 print:bg-white print:text-slate-900 print:px-0 print:py-8 print:border-b-2 print:border-slate-900">
          <div className="flex items-center gap-2 mb-6 print:hidden">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Auditoria de Rastreabilidade BMV</span>
          </div>

          <div className="flex justify-between items-end print:items-start">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-white tracking-tight leading-tight uppercase max-w-[400px] print:text-slate-900 print:text-3xl">
                {entity.nome}
              </h2>
              <div className="flex gap-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1 print:text-slate-400">Documento</span>
                  <span className="text-base font-mono font-bold text-slate-300 tracking-tighter print:text-slate-600">{entity.documento}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1 print:text-slate-400">UF</span>
                  <span className="text-base font-bold text-slate-300 print:text-slate-600">{entity.uf || "MT"}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-12 text-right print:gap-8 print:text-left print:mt-4">
              <div className="flex flex-col items-end print:items-start">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block print:text-slate-400">Saldo Legado (REF)</span>
                <div className="flex items-baseline justify-end gap-2 text-amber-500 print:text-amber-600">
                  <span className="text-5xl font-black tracking-tighter leading-none print:text-4xl">{(formData.saldoLegadoTotal || 0).toLocaleString('pt-BR')}</span>
                  <span className="text-sm font-black opacity-30">UCS</span>
                </div>
              </div>
              <div className="flex flex-col items-end print:items-start">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block print:text-slate-400">Ajuste IMEI (PENDÊNCIA)</span>
                <div className="flex items-baseline justify-end gap-2 text-indigo-400/80 print:text-indigo-600">
                  <span className="text-5xl font-black tracking-tighter leading-none print:text-4xl">{(formData.saldoAjustarImei || 0).toLocaleString('pt-BR')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end print:items-start">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block print:text-slate-400">Saldo Auditado</span>
                <div className="flex items-baseline justify-end gap-3 text-primary print:text-emerald-600">
                  <span className="text-7xl font-black tracking-tighter leading-none print:text-5xl">{(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')}</span>
                  <span className="text-2xl font-black opacity-30">UCS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 print:overflow-visible">
          <div className="p-12 space-y-16 print:p-0 print:space-y-10 print:mt-10">
            <SectionTechnical 
              title="Originação de Ativos"
              icon={TrendingUp}
              onImport={() => setActivePasteField('tabelaOriginacao')}
              data={formData.tabelaOriginacao || []}
              columns={[
                { label: "Ref. Dist.", key: "dist" },
                { label: "Data Início", key: "data" },
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
                { label: "Situação", key: "situacao", variant: "status" },
                { label: "Débito", key: "valor", align: "right", variant: "rose" }
              ]}
            />

            <SectionTechnical 
              title="Transferências IMEI (Balanceamento)"
              icon={CreditCard}
              color="indigo"
              onImport={() => setActivePasteField('tabelaImei')}
              data={formData.tabelaImei || []}
              columns={[
                { label: "Dist.", key: "dist" },
                { label: "Data Operação", key: "data" },
                { label: "Crédito (UCS)", key: "valorCredito", align: "right", variant: "emerald" },
                { label: "Débito (UCS)", key: "valorDebito", align: "right", variant: "rose" },
                { label: "Líquido", key: "valor", align: "right", variant: "primary" }
              ]}
            />

            <SectionTechnical 
              title="Aquisições a Deduzir (Auditoria)"
              icon={Database}
              color="rose"
              onImport={() => setActivePasteField('tabelaAquisicao')}
              data={formData.tabelaAquisicao || []}
              columns={[
                { label: "Ano", key: "data" },
                { label: "Status de Auditoria", key: "destino" },
                { label: "Volume a Retirar", key: "valor", align: "right", variant: "rose" }
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
                { label: "Disp.", key: "disponivel", align: "right" },
                { label: "Res.", key: "reservado", align: "right" },
                { label: "Bloq.", key: "bloqueado", align: "right", variant: "rose" },
                { label: "Apos.", key: "aposentado", align: "right", variant: "slate" },
                { label: "Total (D+R)", key: "valor", align: "right", variant: "emerald" }
              ]}
            />

            <div className="hidden print:block pt-10 border-t-2 border-slate-200">
               <div className="flex justify-between items-end">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black uppercase text-slate-400">Autenticação do Ledger</p>
                     <div className="flex gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                           <ShieldCheck className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                           <p className="text-[12px] font-black text-slate-900 uppercase">Integridade Verificada</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Protocolo de Auditoria BMV-#{entity.id}</p>
                        </div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="w-64 border-b-2 border-slate-900 mb-2"></div>
                     <p className="text-[10px] font-black uppercase text-slate-900">Auditor Responsável LedgerTrust</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase">Documento assinado digitalmente para conformidade UCS</p>
                  </div>
               </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center shrink-0 print:hidden">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-8">
            Descartar Alterações
          </Button>
          <div className="flex gap-4">
            <Button onClick={handlePrint} variant="outline" className="h-12 px-8 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest text-slate-600 gap-2 hover:bg-slate-50">
              <Printer className="w-4 h-4" /> Imprimir Relatório Auditado
            </Button>
            <Button onClick={() => { onUpdate(entity.id, formData); onOpenChange(false); }} className="h-12 px-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3">
              <Save className="w-5 h-5" /> Gravar no Ledger Permanente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTechnical({ title, icon: Icon, color = "emerald", onImport, data, columns }: any) {
  const currentTotal = (data || []).reduce((acc: number, r: any) => acc + (r.valor || 0), 0);
  const displayTotal = title.toLowerCase().includes('imei') 
    ? (data || []).reduce((acc: number, r: any) => acc + (Math.max(0, (r.valorDebito || 0) - (r.valorCredito || 0))), 0)
    : currentTotal;

  return (
    <div className="space-y-6 print:space-y-4 print:break-inside-avoid">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("w-1.5 h-10 rounded-full print:h-8 print:w-1", 
            color === "amber" ? "bg-amber-500" : 
            color === "rose" ? "bg-rose-500" : 
            color === "indigo" ? "bg-indigo-500" : "bg-primary"
          )} />
          <div>
            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1 print:text-[11px]">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase print:text-[9px]">
              {title.toLowerCase().includes('imei') ? 'Pendência de Estorno: ' : 'Consolidado: '} 
              <span className={cn("font-black", (displayTotal < 0 || color === 'rose') ? "text-rose-500" : (color === 'indigo' ? "text-indigo-600" : "text-emerald-600"))}>
                {Math.abs(displayTotal).toLocaleString('pt-BR')} UCS
              </span>
            </p>
          </div>
        </div>

        <Button onClick={onImport} variant="outline" className="h-11 px-8 rounded-2xl border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-slate-50 shadow-sm transition-all print:hidden">
          <Calculator className="w-4 h-4" /> Colagem Técnica
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[100px] flex flex-col print:rounded-none print:border-slate-900 print:border-t-2 print:border-x-0 print:border-b-0 print:min-h-0">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 opacity-30 gap-3 print:hidden">
            <Database className="w-8 h-8 text-slate-200" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sem registros vinculados</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 sticky top-0 print:bg-slate-100">
              <TableRow className="h-14 border-b border-slate-100 print:h-10 print:border-slate-900">
                {columns.map((col: any) => (
                  <TableHead key={col.label} className={cn("text-[9px] font-black uppercase tracking-widest text-slate-400 px-8 print:px-2 print:text-slate-900 print:text-[8px]", col.align === 'right' && "text-right")}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, i: number) => {
                const isTransfer = title.toLowerCase().includes('movimentação') && 
                  (row.destino?.toLowerCase().includes('transferência') || row.destino?.toLowerCase().includes('cliente'));

                return (
                  <TableRow 
                    key={i} 
                    className={cn(
                      "border-b border-slate-50 last:border-0 h-14 hover:bg-slate-50/30 transition-colors print:h-8 print:border-slate-200",
                      isTransfer && "bg-indigo-50/40 border-l-4 border-l-indigo-400 print:bg-white print:border-l-0"
                    )}
                  >
                    {columns.map((col: any) => (
                      <TableCell key={col.label} className={cn(
                        "px-8 text-[11px] font-bold text-slate-600 tracking-tight print:px-2 print:text-[9px] print:text-slate-900",
                        col.align === 'right' && "text-right",
                        col.variant === 'emerald' && "text-emerald-600 print:text-emerald-700",
                        col.variant === 'rose' && "text-rose-500 print:text-rose-600",
                        col.variant === 'primary' && "text-primary font-black print:text-slate-900"
                      )}>
                        {col.variant === 'status' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase">{row[col.key] || 'Processado'}</span>
                          </div>
                        ) : (
                          typeof row[col.key] === 'number' ? Math.abs(row[col.key]).toLocaleString('pt-BR') : row[col.key]
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
