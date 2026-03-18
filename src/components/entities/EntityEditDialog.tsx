
"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ShieldCheck, Calculator, History, TrendingUp, ArrowRightLeft, Database, X, Printer } from "lucide-react";
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

  useEffect(() => {
    const sumTable = (table?: RegistroTabela[]) => (table || []).reduce((acc, row) => acc + (row.valor || 0), 0);
    const sumField = (table?: RegistroTabela[], field: keyof RegistroTabela) => 
      (table || []).reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
    
    const totalOriginacao = sumTable(formData.tabelaOriginacao);
    const totalMovimentacao = sumTable(formData.tabelaMovimentacao);
    const totalAquisicao = sumTable(formData.tabelaAquisicao);
    
    const totalCreditoImei = sumField(formData.tabelaImei, 'valorCredito');
    const totalDebitoImei = sumField(formData.tabelaImei, 'valorDebito');
    const ajusteImei = Math.max(0, totalDebitoImei - totalCreditoImei);

    const legadoTotal = (formData.tabelaLegado || []).reduce((acc, row) => acc + ((row.disponivel || 0) + (row.reservado || 0)), 0);
    const totalAposentado = sumField(formData.tabelaLegado, 'aposentado');
    const totalBloqueado = sumField(formData.tabelaLegado, 'bloqueado');
    
    const saldoFinal = totalOriginacao + totalMovimentacao - totalAquisicao;

    setFormData(prev => ({ 
      ...prev, 
      originacao: totalOriginacao,
      movimentacao: totalMovimentacao,
      aquisicao: totalAquisicao,
      aposentado: totalAposentado,
      bloqueado: totalBloqueado,
      saldoAjustarImei: ajusteImei,
      saldoLegadoTotal: legadoTotal,
      saldoFinalAtual: saldoFinal
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

      const isHeader = (line.toLowerCase().includes('data') || line.toLowerCase().includes('dist')) && !/^\d+/.test(line);
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
        results.push({
          data: parts[0] || "N/A",
          plataforma: parts[1] || "N/A",
          nome: parts[2] || "N/A",
          documento: parts[3] || "N/A",
          disponivel: disp,
          reservado: res,
          bloqueado: parseBRL(parts[6]),
          aposentado: parseBRL(parts[7]),
          valor: disp + res,
        });
      } else if (activePasteField === 'tabelaImei') {
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
        const lastPart = parts[parts.length - 1];
        const valor = parseBRL(lastPart);
        const isNegative = activePasteField === 'tabelaMovimentacao';
        results.push({ 
          dist: parts[0], 
          data: parts[1], 
          destino: parts[2], 
          situacao: "Processado",
          valor: isNegative ? -Math.abs(valor) : valor,
        });
      }
    });

    setPreviewRows(results);
  }, [pasteBuffer, activePasteField]);

  if (!entity) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatUCS = (val?: number) => (val || 0).toLocaleString('pt-BR');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[1280px] h-[95vh] flex flex-col p-0 border-none bg-white shadow-2xl overflow-hidden rounded-[1.5rem]"
        onPointerDownOutside={(e) => { if (activePasteField) e.preventDefault(); }}
        onInteractOutside={(e) => { if (activePasteField) e.preventDefault(); }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Auditoria: {entity.nome}</DialogTitle>
          <DialogDescription>Console de conformidade técnica LedgerTrust.</DialogDescription>
        </DialogHeader>

        {activePasteField && (
          <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-8 flex justify-between items-center border-b">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Processador de Colagem</h3>
                <Button variant="ghost" size="icon" onClick={() => { setActivePasteField(null); setPasteBuffer(""); }} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-8 flex-1">
                <Textarea 
                  autoFocus
                  value={pasteBuffer}
                  onChange={e => setPasteBuffer(e.target.value)}
                  placeholder="Cole os dados do Excel aqui..."
                  className="w-full h-64 bg-slate-50 border-slate-200 font-mono text-sm p-4 rounded-xl resize-none"
                />
              </div>
              <div className="p-8 bg-slate-50 flex justify-between items-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Registros Detectados: {previewRows.length}
                </div>
                <Button onClick={() => { setFormData(prev => ({ ...prev, [activePasteField]: previewRows })); setActivePasteField(null); setPasteBuffer(""); }} disabled={!pasteBuffer.trim()} className="px-10 h-12 rounded-xl font-black uppercase text-xs">
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER - ALTA FIDELIDADE EXECUTIVA */}
        <div className="bg-[#0F172A] p-10 shrink-0 text-white relative">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">SISTEMA LEDGERTRUST BMV</span>
          </div>

          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <h2 className="text-3xl font-black leading-none tracking-tighter uppercase max-w-[800px]">
                {entity.nome}
              </h2>
              <div className="text-right space-y-0.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">DOCUMENTO</p>
                <p className="text-base font-bold tracking-tight text-slate-200 font-mono">{entity.documento}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 lg:grid-cols-8 gap-4 pt-6 border-t border-slate-800/50">
              <StatColumn label="ORIGINAÇÃO" value={formatUCS(formData.originacao)} color="slate" />
              <StatColumn label="MOVIMENTAÇÃO" value={formatUCS(formData.movimentacao)} color="rose" prefix="-" />
              <StatColumn label="APOSENTADO" value={formatUCS(formData.aposentado)} color="slate" />
              <StatColumn label="BLOQUEADO" value={formatUCS(formData.bloqueado)} color="rose" />
              <StatColumn label="AQUISIÇÃO" value={formatUCS(formData.aquisicao)} color="rose" />
              <StatColumn label="AJUSTE IMEI" value={formatUCS(formData.saldoAjustarImei)} color="indigo" />
              <StatColumn label="LEGADO (REF)" value={formatUCS(formData.saldoLegadoTotal)} color="amber" />
              <StatColumn label="SALDO AUDITADO" value={formatUCS(formData.saldoFinalAtual)} color="emerald" />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-10 space-y-12 pb-24">
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
                { label: "Débito", key: "valor", align: "right", variant: "rose" }
              ]}
            />

            <SectionTechnical 
              title="Aquisições (Deduções)"
              icon={Database}
              color="rose"
              onImport={() => setActivePasteField('tabelaAquisicao')}
              data={formData.tabelaAquisicao || []}
              columns={[
                { label: "Ano", key: "data" },
                { label: "Volume a Retirar", key: "valor", align: "right", variant: "rose" }
              ]}
            />

            <SectionTechnical 
              title="Saldo Legado (Referência)"
              icon={History}
              color="amber"
              onImport={() => setActivePasteField('tabelaLegado')}
              data={formData.tabelaLegado || []}
              columns={[
                { label: "Atualização", key: "data" },
                { label: "Plataforma", key: "plataforma" },
                { label: "Disponível", key: "disponivel", align: "right" },
                { label: "Reservado", key: "reservado", align: "right" },
                { label: "Total (REF)", key: "valor", align: "right", variant: "amber" }
              ]}
            />
          </div>
        </ScrollArea>

        <div className="p-8 border-t bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:bg-transparent hover:text-rose-500">
            Descartar Alterações
          </Button>
          <div className="flex gap-4">
            <Button onClick={handlePrint} variant="outline" className="h-12 px-6 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-slate-50 transition-all">
              <Printer className="w-4 h-4" /> Imprimir Relatório Auditado
            </Button>
            <Button onClick={() => { onUpdate(entity.id, formData); onOpenChange(false); }} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-2 transition-all active:scale-95">
              <Save className="w-4 h-4" /> Gravar no Ledger Permanente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatColumn({ label, value, color, prefix }: { label: string, value: string, color: string, prefix?: string }) {
  const colorClasses = {
    slate: "text-slate-100",
    rose: "text-rose-500",
    amber: "text-amber-500",
    indigo: "text-indigo-400",
    emerald: "text-primary"
  };

  return (
    <div className="space-y-1">
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <div className={cn(
        "flex items-baseline gap-0.5 font-black tracking-tighter transition-all text-xl",
        colorClasses[color as keyof typeof colorClasses]
      )}>
        {prefix}{value}
        <span className="text-[7px] opacity-40 uppercase ml-0.5 tracking-tighter">UCS</span>
      </div>
    </div>
  );
}

function SectionTechnical({ title, icon: Icon, color = "emerald", onImport, data, columns }: any) {
  const currentTotal = (data || []).reduce((acc: number, r: any) => acc + (r.valor || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn("w-1 h-8 rounded-full", 
            color === "amber" ? "bg-amber-500" : 
            color === "rose" ? "bg-rose-500" : "bg-primary"
          )} />
          <div>
            <h3 className="text-base font-black uppercase tracking-widest text-slate-900 leading-none">{title}</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              Consolidado da Seção: <span className={cn("font-black", color === 'rose' ? "text-rose-500" : (color === 'amber' ? "text-amber-600" : "text-emerald-600"))}>
                {Math.abs(currentTotal).toLocaleString('pt-BR')} UCS
              </span>
            </p>
          </div>
        </div>
        <Button onClick={onImport} variant="outline" className="h-10 px-4 rounded-xl border-primary text-primary font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-emerald-50 transition-all">
          <Calculator className="w-3.5 h-3.5" /> Colagem Técnica
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
        {data.length === 0 ? (
          <div className="py-8 text-center opacity-30">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sem registros processados</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-10">
                {columns.map((col: any) => (
                  <TableHead key={col.label} className={cn("text-[8px] font-black uppercase tracking-widest text-slate-400 px-6", col.align === 'right' && "text-right")}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, i: number) => (
                <TableRow key={i} className="h-10 hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                  {columns.map((col: any) => (
                    <TableCell key={col.label} className={cn(
                      "px-6 text-[10px] font-bold text-slate-600",
                      col.align === 'right' && "text-right",
                      col.variant === 'emerald' && "text-emerald-600",
                      col.variant === 'rose' && "text-rose-500",
                      col.variant === 'amber' && "text-amber-600 font-black"
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
