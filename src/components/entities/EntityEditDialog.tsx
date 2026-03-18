"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela, AuditoriaStatus } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ShieldCheck, Calculator, History, TrendingUp, ArrowRightLeft, Database, X, Printer, Link as LinkIcon, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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

  // Inicializa o formulário quando a entidade muda
  useEffect(() => {
    if (entity) {
      setFormData(entity);
    }
  }, [entity]);

  // Cálculos em tempo real para exibição (sem atualizar o estado continuamente)
  const stats = useMemo(() => {
    const sumTable = (table?: RegistroTabela[]) => (table || []).reduce((acc, row) => acc + (row.valor || 0), 0);
    
    const movTable = formData.tabelaMovimentacao || [];
    const totalMov = sumTable(movTable);
    
    const pagas = movTable.filter(m => m.statusAuditoria === 'Pago').length;
    const percPago = movTable.length > 0 ? (pagas / movTable.length) * 100 : 0;

    const totalOrig = sumTable(formData.tabelaOriginacao);
    const totalAq = sumTable(formData.tabelaAquisicao);

    const totalCreditoImei = (formData.tabelaImei || []).reduce((acc, row) => acc + (row.valorCredito || 0), 0);
    const totalDebitoImei = (formData.tabelaImei || []).reduce((acc, row) => acc + (row.valorDebito || 0), 0);
    const ajusteImei = Math.max(0, totalDebitoImei - totalCreditoImei);

    const legadoTotal = (formData.tabelaLegado || []).reduce((acc, row) => acc + ((row.disponivel || 0) + (row.reservado || 0)), 0);
    const totalAposentado = (formData.tabelaLegado || []).reduce((acc, row) => acc + (row.bloqueado || 0), 0);
    const totalBloqueado = (formData.tabelaLegado || []).reduce((acc, row) => acc + (row.aposentado || 0), 0);
    
    const finalAuditado = totalOrig + totalMov - totalAq;

    return {
      percPago,
      totalMov,
      totalOrig,
      totalAq,
      ajusteImei,
      legadoTotal,
      totalAposentado,
      totalBloqueado,
      finalAuditado
    };
  }, [formData]);

  // Handler para processar dados colados
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

      if (activePasteField === 'tabelaImei') {
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
      } else if (activePasteField === 'tabelaLegado') {
        if (parts.length < 8) return;
        results.push({
          data: parts[0] || "N/A",
          plataforma: parts[1] || "N/A",
          nome: parts[2] || "N/A",
          documento: parts[3] || "N/A",
          disponivel: parseBRL(parts[4]),
          reservado: parseBRL(parts[5]),
          bloqueado: parseBRL(parts[6]),
          aposentado: parseBRL(parts[7]),
          valor: parseBRL(parts[4]) + parseBRL(parts[5]),
        });
      } else {
        const lastPart = parts[parts.length - 1];
        const valor = parseBRL(lastPart);
        const isNegative = activePasteField === 'tabelaMovimentacao' || activePasteField === 'tabelaAquisicao';
        results.push({ 
          dist: parts[0], 
          data: parts[1], 
          destino: parts[2], 
          situacao: "Processado",
          statusAuditoria: 'Pendente',
          valor: isNegative ? -Math.abs(valor) : valor,
        });
      }
    });

    setPreviewRows(results);
  }, [pasteBuffer, activePasteField]);

  if (!entity) return null;

  const handleUpdateRow = (field: keyof EntidadeSaldo, index: number, updates: Partial<RegistroTabela>) => {
    setFormData(prev => {
      const currentTable = [...((prev[field] as any[]) || [])];
      currentTable[index] = { ...currentTable[index], ...updates };
      return { ...prev, [field]: currentTable };
    });
  };

  const handleSaveFinal = () => {
    // Consolida todos os cálculos no momento do save para evitar loops de render
    const finalData: Partial<EntidadeSaldo> = {
      ...formData,
      originacao: stats.totalOrig,
      movimentacao: stats.totalMov,
      aquisicao: stats.totalAq,
      aposentado: stats.totalAposentado,
      bloqueado: stats.totalBloqueado,
      saldoAjustarImei: stats.ajusteImei,
      saldoLegadoTotal: stats.legadoTotal,
      saldoFinalAtual: stats.finalAuditado
    };
    onUpdate(entity.id, finalData);
    onOpenChange(false);
  };

  const formatUCS = (val?: number) => (val || 0).toLocaleString('pt-BR');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[1300px] h-[90vh] flex flex-col p-0 border-none bg-white shadow-2xl overflow-hidden rounded-[2.5rem]"
        onPointerDownOutside={(e) => { if (activePasteField) e.preventDefault(); }}
        onInteractOutside={(e) => { if (activePasteField) e.preventDefault(); }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Auditoria BMV: {entity.nome}</DialogTitle>
          <DialogDescription>Console de auditoria técnica LedgerTrust.</DialogDescription>
        </DialogHeader>

        {activePasteField && (
          <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-5 flex justify-between items-center border-b">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Processador de Colagem Técnica</h3>
                <Button variant="ghost" size="icon" onClick={() => { setActivePasteField(null); setPasteBuffer(""); }} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 flex-1">
                <Textarea 
                  autoFocus
                  value={pasteBuffer}
                  onChange={e => setPasteBuffer(e.target.value)}
                  placeholder="Cole os dados do Excel aqui..."
                  className="w-full h-64 bg-slate-50 border-slate-200 font-mono text-[11px] p-4 rounded-xl resize-none text-slate-900"
                />
              </div>
              <div className="p-5 bg-slate-50 flex justify-between items-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {previewRows.length} Registros Detectados
                </div>
                <Button 
                  onClick={() => { 
                    setFormData(prev => ({ ...prev, [activePasteField]: previewRows })); 
                    setActivePasteField(null); 
                    setPasteBuffer(""); 
                  }} 
                  disabled={!pasteBuffer.trim()} 
                  className="px-10 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest"
                >
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CABEÇALHO CONSOLE TÉCNICO */}
        <div className="bg-[#0F172A] p-8 shrink-0 text-white relative">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Auditoria BMV • Console Técnico</span>
          </div>

          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight uppercase text-white">
                {entity.nome}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Documento:</span>
                <span className="text-sm font-mono text-slate-300">{entity.documento}</span>
              </div>
            </div>
            
            <div className="bg-primary px-6 py-4 rounded-2xl shadow-xl shadow-primary/20 border border-white/10 min-w-[220px] transition-all">
              <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">Saldo Final Auditado</p>
              <div className="flex items-baseline gap-1.5 text-2xl font-black tracking-tight text-white">
                {formatUCS(stats.finalAuditado)}
                <span className="text-xs font-medium opacity-80">UCS</span>
              </div>
            </div>
          </div>

          {/* Grade de 8 Colunas de Indicadores Técnicos */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4 pt-6 border-t border-white/10">
            <StatColumn label="Originação" value={formatUCS(stats.totalOrig)} color="white" />
            <StatColumn 
              label="Movimentação" 
              value={formatUCS(stats.totalMov)} 
              color="rose" 
              subValue={`${stats.percPago.toFixed(0)}% Pago`}
            />
            <StatColumn label="Aposentado" value={formatUCS(stats.totalAposentado)} color="white" />
            <StatColumn label="Bloqueado" value={formatUCS(stats.totalBloqueado)} color="rose" />
            <StatColumn label="Aquisição" value={formatUCS(stats.totalAq)} color="rose" />
            <StatColumn label="Ajuste IMEI" value={formatUCS(stats.ajusteImei)} color="indigo" />
            <StatColumn label="Saldo Legado" value={formatUCS(stats.legadoTotal)} color="amber" />
            <StatColumn label="Saldo Auditado" value={formatUCS(stats.finalAuditado)} color="emerald" />
          </div>
        </div>

        {/* ÁREA DE TABELAS */}
        <ScrollArea className="flex-1 bg-white">
          <div className="p-8 space-y-12 pb-20">
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
              onUpdateRow={(idx: number, updates: any) => handleUpdateRow('tabelaMovimentacao', idx, updates)}
              columns={[
                { label: "Ref. Dist.", key: "dist" },
                { label: "Data", key: "data" },
                { label: "Destinatário", key: "destino" },
                { label: "Status", key: "statusAuditoria", type: "status" },
                { label: "Comprovante", key: "linkComprovante", type: "link" },
                { label: "Volume", key: "valor", align: "right", variant: "rose" }
              ]}
            />

            <SectionTechnical 
              title="Aquisições (Deduções)"
              icon={Database}
              color="rose"
              onImport={() => setActivePasteField('tabelaAquisicao')}
              data={formData.tabelaAquisicao || []}
              columns={[
                { label: "Ano/Referência", key: "data" },
                { label: "Volume a Retirar", key: "valor", align: "right", variant: "rose" }
              ]}
            />

            <SectionTechnical 
              title="Transferências IMEI"
              icon={Calculator}
              color="indigo"
              onImport={() => setActivePasteField('tabelaImei')}
              data={formData.tabelaImei || []}
              columns={[
                { label: "Ref. Dist.", key: "dist" },
                { label: "Data", key: "data" },
                { label: "Destinatário", key: "destino" },
                { label: "Crédito", key: "valorCredito", align: "right" },
                { label: "Débito", key: "valorDebito", align: "right" },
                { label: "Líquido", key: "valor", align: "right", variant: "indigo" }
              ]}
            />

            <SectionTechnical 
              title="Saldo Legado"
              icon={History}
              color="amber"
              onImport={() => setActivePasteField('tabelaLegado')}
              data={formData.tabelaLegado || []}
              columns={[
                { label: "Atualização", key: "data" },
                { label: "Plataforma", key: "plataforma" },
                { label: "Disponível", key: "disponivel", align: "right" },
                { label: "Reservado", key: "reservado", align: "right" },
                { label: "Total", key: "valor", align: "right", variant: "amber" }
              ]}
            />
          </div>
        </ScrollArea>

        {/* RODAPÉ DE AÇÕES */}
        <div className="p-6 border-t bg-slate-50 flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-bold uppercase text-slate-400 tracking-widest hover:bg-rose-50 hover:text-rose-600 h-12 rounded-xl px-8">
            Descartar Alterações
          </Button>
          <div className="flex gap-4">
            <Button onClick={() => window.print()} variant="outline" className="h-12 px-8 rounded-xl border-slate-200 bg-white font-bold uppercase text-[10px] tracking-widest gap-2">
              <Printer className="w-4 h-4" /> Relatório
            </Button>
            <Button onClick={handleSaveFinal} className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 gap-2">
              <Save className="w-4 h-4" /> Gravar no Ledger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatColumn({ label, value, color, subValue }: { label: string, value: string, color: string, subValue?: string }) {
  const colorClasses = {
    white: "text-white",
    rose: "text-rose-500",
    amber: "text-amber-500",
    indigo: "text-indigo-400",
    emerald: "text-primary-foreground bg-primary/20 px-2 py-1 rounded-lg"
  };

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest truncate">{label}</p>
      <div className={cn("flex items-baseline gap-0.5 text-base font-black tracking-tight", colorClasses[color as keyof typeof colorClasses])}>
        {value}
        <span className="text-[9px] font-medium opacity-60">UCS</span>
      </div>
      {subValue && (
        <span className="text-[8px] font-bold text-slate-500 uppercase flex items-center gap-1 truncate">
          {subValue.includes('Pago') ? <CheckCircle2 className="w-2.5 h-2.5 text-primary" /> : <Clock className="w-2.5 h-2.5" />}
          {subValue}
        </span>
      )}
    </div>
  );
}

function SectionTechnical({ title, icon: Icon, color = "emerald", onImport, data, columns, onUpdateRow }: any) {
  const currentTotal = (data || []).reduce((acc: number, r: any) => acc + (r.valor || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-3">
          <div className={cn("w-1 h-5 rounded-full", 
            color === "amber" ? "bg-amber-500" : 
            color === "rose" ? "bg-rose-500" : 
            color === "indigo" ? "bg-indigo-500" : "bg-primary"
          )} />
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 leading-none">{title}</h3>
            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mt-1">
              Volume: <span className={cn("font-bold", color === 'rose' ? "text-rose-500" : "text-emerald-600")}>
                {Math.abs(currentTotal).toLocaleString('pt-BR')} UCS
              </span>
            </p>
          </div>
        </div>
        <Button onClick={onImport} variant="outline" className="h-8 px-4 rounded-lg border-slate-200 text-slate-600 font-bold uppercase text-[9px] tracking-widest gap-2 hover:bg-slate-50 border shadow-sm">
          <Calculator className="w-3 h-3" /> Importar
        </Button>
      </div>

      <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
        {data.length === 0 ? (
          <div className="py-8 text-center opacity-30 flex flex-col items-center gap-1">
            <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400">Nenhum registro para auditoria</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-8">
                {columns.map((col: any) => (
                  <TableHead key={col.label} className={cn("text-[8px] font-bold uppercase tracking-widest text-slate-400 px-4 h-8", col.align === 'right' && "text-right")}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, i: number) => (
                <TableRow key={i} className="h-10 hover:bg-slate-50/40 transition-colors border-b border-slate-50 last:border-0">
                  {columns.map((col: any) => (
                    <TableCell key={col.label} className={cn(
                      "px-4 py-2 text-[10px] font-medium text-slate-600",
                      col.align === 'right' && "text-right",
                      col.variant === 'emerald' && "text-emerald-600 font-bold",
                      col.variant === 'rose' && "text-rose-500 font-bold",
                      col.variant === 'amber' && "text-amber-600 font-bold",
                      col.variant === 'indigo' && "text-indigo-600 font-bold"
                    )}>
                      {col.type === 'status' ? (
                        <Select 
                          value={row[col.key] || 'Pendente'} 
                          onValueChange={(v) => onUpdateRow?.(i, { [col.key]: v as AuditoriaStatus })}
                        >
                          <SelectTrigger className="h-7 w-28 text-[9px] font-bold uppercase tracking-widest rounded-lg border-slate-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="Pendente" className="text-[9px] font-bold uppercase">Pendente</SelectItem>
                            <SelectItem value="Pago" className="text-[9px] font-bold uppercase text-emerald-600">Pago</SelectItem>
                            <SelectItem value="Não Pago" className="text-[9px] font-bold uppercase text-rose-500">Não Pago</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : col.type === 'link' ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={row[col.key] || ''} 
                            placeholder="Link do comprovante..."
                            onChange={(e) => onUpdateRow?.(i, { [col.key]: e.target.value })}
                            className="h-7 w-40 text-[9px] font-mono border-slate-200 rounded-lg bg-white"
                          />
                          {row[col.key] ? (
                            <a href={row[col.key]} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                              <LinkIcon className="w-3 h-3" />
                            </a>
                          ) : (
                            <AlertCircle className="w-3 h-3 text-slate-200" />
                          )}
                        </div>
                      ) : (
                        typeof row[col.key] === 'number' ? Math.abs(row[col.key]).toLocaleString('pt-BR') : row[col.key]
                      )}
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