
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

  // Cálculo Dinâmico de Saldos baseados nos históricos
  useEffect(() => {
    const sumTable = (table?: RegistroTabela[]) => (table || []).reduce((acc, row) => acc + (row.valor || 0), 0);
    const sumField = (table?: RegistroTabela[], field: keyof RegistroTabela) => 
      (table || []).reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
    
    // Saldo Final Auditado: 
    // (+) Originação
    // (+) Movimentação (já vem negativa do parser)
    // (-) Aquisição (VOLUME A SER RETIRADO conforme regra de auditoria 2018/2019)
    // IMEI não entra no saldo, é apenas controle.
    const operationsTotal = 
      sumTable(formData.tabelaOriginacao) + 
      sumTable(formData.tabelaMovimentacao) - 
      sumTable(formData.tabelaAquisicao);
    
    // Ajuste IMEI: Débito - Crédito (Pendência de estorno)
    const totalCreditoImei = sumField(formData.tabelaImei, 'valorCredito');
    const totalDebitoImei = sumField(formData.tabelaImei, 'valorDebito');
    const ajusteImei = Math.max(0, totalDebitoImei - totalCreditoImei);

    // Saldo Legado: Valor de Referência (Disponível + Reservado)
    const legadoTotal = sumTable(formData.tabelaLegado);
    
    // Bloqueado e Aposentado vêm da tabela de legado
    const totalAposentado = sumField(formData.tabelaLegado, 'aposentado');
    const totalBloqueado = sumField(formData.tabelaLegado, 'bloqueado');
    const totalAquisicao = sumTable(formData.tabelaAquisicao);
    
    setFormData(prev => ({ 
      ...prev, 
      saldoFinalAtual: operationsTotal,
      saldoLegadoTotal: legadoTotal,
      aposentado: totalAposentado,
      bloqueado: totalBloqueado,
      aquisicao: totalAquisicao,
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

  // Parser Heurístico para entrada de dados (Calculadora)
  useEffect(() => {
    if (!pasteBuffer.trim()) {
      setPreviewRows([]);
      return;
    }

    const lines = pasteBuffer.split('\n').filter(l => l.trim());
    const results: RegistroTabela[] = [];

    lines.forEach(line => {
      // Ignorar cabeçalhos
      if (line.toLowerCase().includes('data') || line.toLowerCase().includes('usuário') || line.toLowerCase().includes('ano')) return;

      const parseBRL = (val: string) => {
        if (!val) return 0;
        return parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      };

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
        const parts = line.split('\t');
        if (parts.length < 5) return;
        const disp = parseBRL(parts[4]);
        const res = parseBRL(parts[5]);
        const bloq = parseBRL(parts[6]);
        const apos = parseBRL(parts[7]);
        
        results.push({
          data: parts[0]?.trim() || "N/A",
          plataforma: parts[1]?.trim() || "N/A",
          nome: parts[2]?.trim() || "N/A",
          documento: parts[3]?.trim() || "N/A",
          disponivel: disp,
          reservado: res,
          bloqueado: bloq,
          aposentado: apos,
          valor: disp + res,
        });
      } else if (activePasteField === 'tabelaImei') {
        const parts = line.split('\t');
        if (parts.length < 5) return;
        // Estrutura esperada: Dist | Data | Usuário Destino | [Vazio/Outros] | Crédito | Débito
        // Frequentemente as colunas variam, buscamos os últimos 2 campos numéricos
        const cred = parseBRL(parts[parts.length - 2]);
        const deb = parseBRL(parts[parts.length - 1]);
        results.push({ 
          dist: parts[0]?.trim(), 
          data: parts[1]?.trim(), 
          destino: parts[2]?.trim(), 
          valor: cred - deb, 
          valorCredito: cred, 
          valorDebito: deb 
        });
      } else {
        const parts = line.split('\t');
        const valor = parseBRL(parts[parts.length - 1]);
        const isNegative = activePasteField === 'tabelaMovimentacao';
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
    toast({ title: "Auditado", description: "Os volumes foram consolidados no Ledger." });
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
          <DialogTitle>Auditoria Executiva: {entity.nome}</DialogTitle>
          <DialogDescription>Console para conciliação de ativos UCS.</DialogDescription>
        </DialogHeader>

        {/* PROCESSADOR DE ENTRADA (CALCULADORA) */}
        {activePasteField && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-12 animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-10 flex justify-between items-start">
                <div className="flex gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                    <Calculator className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Entrada Técnica</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {activePasteField === 'tabelaAquisicao' ? 'VOLUMES A SEREM RETIRADOS (EX: 2019 - 9)' : `COLAGEM: ${activePasteField.replace('tabela', '').toUpperCase()}`}
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
                  placeholder={activePasteField === 'tabelaAquisicao' ? "Insira no formato: Ano - Valor\n2019 - 9\n2018 - 90" : "Cole as colunas do site legado ou Excel aqui..."}
                  className="w-full h-64 bg-slate-50/50 border-slate-200 text-slate-900 font-mono text-sm p-8 rounded-3xl resize-none shadow-inner"
                />
              </div>

              <div className="p-10">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {activePasteField === 'tabelaAquisicao' ? 'Total a Deduzir' : 
                       activePasteField === 'tabelaImei' ? 'Saldo Identificado (Líquido)' : 'Total Identificado'}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-5xl font-black tracking-tighter",
                        (activePasteField === 'tabelaAquisicao' || previewRows.reduce((a, r) => a + (r.valor || 0), 0) < 0) ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {Math.abs(previewRows.reduce((a, r) => a + (r.valor || 0), 0)).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs font-black text-slate-300 uppercase">UCS</span>
                    </div>
                  </div>
                  <Button onClick={handleConfirmSection} disabled={!pasteBuffer.trim()} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                    Confirmar e Consolidar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CABEÇALHO EXECUTIVO BMV STYLE */}
        <div className="bg-[#0F172A] px-12 py-10 shrink-0 flex justify-between items-end">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Auditoria de Rastreabilidade BMV</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-3">{entity.nome}</h2>
              <div className="flex gap-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Documento de Origem</span>
                  <span className="text-sm font-mono font-bold text-slate-300 tracking-tighter">{entity.documento}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estado (UF)</span>
                  <span className="text-sm font-bold text-slate-300">{entity.uf || "MT"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-10 text-right">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Saldo Legado (REF)</span>
              <div className="flex items-baseline justify-end gap-2 text-amber-500">
                <span className="text-3xl font-black tracking-tighter">{(formData.saldoLegadoTotal || 0).toLocaleString('pt-BR')}</span>
                <span className="text-sm font-black opacity-30">UCS</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Ajuste IMEI (PENDÊNCIA)</span>
              <div className="flex items-baseline justify-end gap-2 text-indigo-400">
                <span className="text-3xl font-black tracking-tighter">{(formData.saldoAjustarImei || 0).toLocaleString('pt-BR')}</span>
                <span className="text-sm font-black opacity-30">UCS</span>
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

        {/* ÁREA TÉCNICA DE CONCILIAÇÃO */}
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
                { label: "Ano de Referência", key: "data" },
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
          </div>
        </ScrollArea>

        {/* RODAPÉ DE AÇÕES */}
        <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-8">
            Descartar Alterações
          </Button>
          <div className="flex gap-4">
            <Button variant="outline" className="h-12 px-8 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest text-slate-600 gap-2">
              <Download className="w-4 h-4" /> Exportar Registro
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("w-1.5 h-10 rounded-full", 
            color === "amber" ? "bg-amber-500" : 
            color === "rose" ? "bg-rose-500" : 
            color === "indigo" ? "bg-indigo-500" : "bg-primary"
          )} />
          <div>
            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              {title.toLowerCase().includes('imei') ? 'Pendência de Estorno: ' : 'Consolidado: '} 
              <span className={cn("font-black", (displayTotal < 0 || color === 'rose') ? "text-rose-500" : (color === 'indigo' ? "text-indigo-600" : "text-emerald-600"))}>
                {Math.abs(displayTotal).toLocaleString('pt-BR')} UCS
              </span>
            </p>
          </div>
        </div>

        <Button onClick={onImport} variant="outline" className="h-11 px-8 rounded-2xl border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-slate-50 shadow-sm transition-all">
          <Calculator className="w-4 h-4" /> {color === 'rose' ? 'Ajustar Retirada' : 'Colagem via Calculadora'}
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[140px] flex flex-col">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 opacity-30 gap-3">
            <Database className="w-8 h-8 text-slate-200" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando inserção técnica de dados...</p>
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
