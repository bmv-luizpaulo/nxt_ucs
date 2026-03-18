"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Database, ShieldCheck, Table as TableIcon, Calculator, Plus, X, AlertCircle, Layers, History, Download, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

  // Cálculo automático do Saldo Final Auditado conforme a regra de negócio
  useEffect(() => {
    const final = 
      (formData.originacao || 0) + 
      (formData.movimentacao || 0) + 
      (formData.aposentado || 0) + 
      (formData.bloqueado || 0) + 
      (formData.aquisicao || 0) +
      (formData.saldoAjustarImei || 0) +
      (formData.saldoLegadoTotal || 0);
    
    if (final !== formData.saldoFinalAtual) {
      setFormData(prev => ({ ...prev, saldoFinalAtual: final }));
    }
  }, [formData.originacao, formData.movimentacao, formData.aposentado, formData.bloqueado, formData.aquisicao, formData.saldoAjustarImei, formData.saldoLegadoTotal]);

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

      const headerKeywords = ['dist', 'data', 'usuário', 'disponível', 'total', 'nome', 'documento', 'plataforma', 'originação'];
      if (headerKeywords.some(key => line.toLowerCase().includes(key))) return;

      if (activePasteField === 'saldoLegadoTotal') {
        if (parts.length >= 8) {
          const disp = parseFloat(parts[4]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
          const res = parseFloat(parts[5]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
          results.push({
            data: parts[0]?.trim(),
            plataforma: parts[1]?.trim(),
            nome: parts[2]?.trim(),
            documento: parts[3]?.trim(),
            disponivel: disp,
            reservado: res,
            bloqueado: parseFloat(parts[6]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            aposentado: parseFloat(parts[7]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            valor: disp + res,
          });
        }
      } else if (activePasteField === 'originacao') {
        const valor = parseFloat(parts[parts.length - 2]?.replace(/[R$\s.]/g, '').replace(',', '.') || parts[parts.length - 1]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        results.push({ dist: parts[0]?.trim(), data: parts[1]?.trim(), destino: parts[2]?.trim(), valor });
      } else if (activePasteField === 'saldoAjustarImei') {
        const cred = parseFloat(parts[parts.length - 2]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        const deb = parseFloat(parts[parts.length - 1]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        results.push({ dist: parts[0]?.trim(), data: parts[1]?.trim(), destino: parts[2]?.trim(), valor: cred - deb, valorCredito: cred, valorDebito: deb });
      } else if (activePasteField === 'aquisicao') {
        const val = parseFloat(parts[parts.length - 1]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        results.push({ nome: parts[0]?.trim() || "Aquisição", ano: parts[parts.length - 3] || "N/A", valor: -val });
      } else {
        const val = parseFloat(parts[parts.length - 2]?.replace(/[R$\s.]/g, '').replace(',', '.') || "0") || 0;
        results.push({ dist: parts[0]?.trim(), data: parts[1]?.trim(), destino: parts[2]?.trim(), valor: -val, situacao: parts[parts.length - 1]?.trim() });
      }
    });

    setPreviewRows(results);
  }, [pasteBuffer, activePasteField]);

  const consolidateField = () => {
    if (!activePasteField || previewRows.length === 0) return;

    const total = previewRows.reduce((acc, row) => acc + (row.valor || 0), 0);
    const tableMap: Record<string, keyof EntidadeSaldo> = {
      originacao: 'tabelaOriginacao',
      movimentacao: 'tabelaMovimentacao',
      aposentado: 'tabelaMovimentacao',
      bloqueado: 'tabelaMovimentacao',
      aquisicao: 'tabelaAquisicao',
      saldoAjustarImei: 'tabelaImei',
      saldoLegadoTotal: 'tabelaLegado'
    };

    setFormData(prev => ({ 
      ...prev, 
      [activePasteField]: total,
      [tableMap[activePasteField as string]]: previewRows
    }));
    
    setPasteBuffer("");
    setPreviewRows([]);
    setActivePasteField(null);
    toast({ title: "Dados Consolidados", description: "O Ledger foi atualizado com o histórico importado." });
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[1100px] h-[92vh] flex flex-col p-0 border-none bg-white shadow-2xl overflow-hidden rounded-[2rem]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-10 py-6 border-b border-slate-100 bg-white sticky top-0 z-20 flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">Auditoria de Produtor - {entity.nome}</DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Painel de conformidade e rastreabilidade LedgerTrust
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-slate-50/20">
          <div className="p-10 space-y-12">
            
            {/* CABEÇALHO EXECUTIVO DE SALDOS */}
            <div className="bg-[#0F172A] rounded-[2.5rem] p-10 flex justify-between items-end shadow-2xl shadow-slate-200/50">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Saldo Atualizado Ledger</span>
                </div>
                <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-white">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Documento</span>
                    <span className="text-sm font-mono font-bold tracking-tight">{entity.documento}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Localização</span>
                    <span className="text-sm font-bold">{entity.uf || "MT"} - Brasil</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Saldo Final Auditado</span>
                <div className="flex items-baseline justify-end gap-3 text-primary">
                  <span className="text-5xl font-black tracking-tighter">{(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')}</span>
                  <span className="text-lg font-black opacity-40">UCS</span>
                </div>
              </div>
            </div>

            {/* SEÇÕES TÉCNICAS */}
            <div className="space-y-16">
              
              <TechnicalSection 
                title="Sessão de Originação"
                activeField="originacao"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaOriginacao || []}
                currentValue={formData.originacao || 0}
                columns={[
                  { label: "Dist.", key: "dist" },
                  { label: "Data Inicio", key: "data" },
                  { label: "Usuário Destino", key: "destino" },
                  { label: "Crédito (UCS)", key: "valor", align: "right", color: "text-emerald-600 font-bold" }
                ]}
              />

              <TechnicalSection 
                title="Sessão de Movimentações"
                activeField="movimentacao"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaMovimentacao || []}
                currentValue={formData.movimentacao || 0}
                columns={[
                  { label: "Dist.", key: "dist" },
                  { label: "Data Inicio", key: "data" },
                  { label: "Usuário Destino", key: "destino" },
                  { label: "Débito (UCS)", key: "valor", align: "right", color: "text-rose-500 font-bold" }
                ]}
              />

              <TechnicalSection 
                title="Transferências IMEI (Ajuste)"
                activeField="saldoAjustarImei"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaImei || []}
                currentValue={formData.saldoAjustarImei || 0}
                columns={[
                  { label: "Dist.", key: "dist" },
                  { label: "Crédito", key: "valorCredito", color: "text-emerald-600" },
                  { label: "Débito", key: "valorDebito", color: "text-rose-500" },
                  { label: "Líquido (UCS)", key: "valor", align: "right", font: "mono", color: "text-primary font-bold" }
                ]}
              />

              <TechnicalSection 
                title="Aquisição de UCs (Empresa)"
                activeField="aquisicao"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaAquisicao || []}
                currentValue={formData.aquisicao || 0}
                columns={[
                  { label: "Usuário", key: "nome" },
                  { label: "Ano", key: "ano", align: "center" },
                  { label: "Volume (UCS)", key: "valor", align: "right", color: "text-rose-500 font-bold" }
                ]}
              />

              <TechnicalSection 
                title="Saldo Legado Auditado"
                activeField="saldoLegadoTotal"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaLegado || []}
                currentValue={formData.saldoLegadoTotal || 0}
                variant="amber"
                columns={[
                  { label: "Data Atualização", key: "data" },
                  { label: "Plataforma", key: "plataforma" },
                  { label: "Disponível", key: "disponivel", align: "right" },
                  { label: "Reservado", key: "reservado", align: "right" },
                  { label: "Total Linha (UCS)", key: "valor", align: "right", color: "text-primary font-bold" }
                ]}
              />

            </div>
          </div>
        </ScrollArea>

        <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center sticky bottom-0 z-20 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 tracking-widest">
            Descartar Alterações
          </Button>
          <div className="flex gap-4">
             <Button variant="outline" className="gap-2 font-black uppercase text-[10px] h-12 px-8 rounded-2xl border-slate-200 tracking-widest text-slate-600">
                <Download className="w-4 h-4" /> Exportar Relatório
             </Button>
             <Button onClick={() => { onUpdate(entity.id, formData); onOpenChange(false); }} className="bg-primary hover:bg-primary/90 text-white px-14 h-14 rounded-2xl font-black uppercase text-[11px] shadow-2xl shadow-primary/20 flex gap-3 transition-all active:scale-95 tracking-widest">
               <Save className="w-5 h-5" /> Gravar Auditoria Permanente
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TechnicalSection({ title, activeField, setActiveField, pasteBuffer, setPasteBuffer, previewRows, onImport, data, columns, variant, currentValue }: any) {
  const saldoASerAplicado = previewRows.reduce((acc: number, r: any) => acc + (r.valor || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-1.5 h-8 rounded-full",
            variant === 'amber' ? "bg-amber-500" : "bg-primary"
          )} />
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1.5">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Consolidação Ledger: <span className={cn("font-black", currentValue < 0 ? "text-rose-500" : "text-emerald-600")}>{currentValue.toLocaleString('pt-BR')} UCS</span>
            </p>
          </div>
        </div>

        <Popover onOpenChange={(open) => {
          if (!open) { setPasteBuffer(""); setActiveField(null); }
          else { setActiveField(activeField); }
        }}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-primary/20 text-primary h-10 px-6 rounded-full font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-primary/5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Colagem via Calculadora
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[520px] p-0 rounded-[2.5rem] bg-white border-slate-200 shadow-3xl overflow-hidden" 
            side="top" 
            align="end"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="flex flex-col">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                  <Calculator className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">
                  Processador Excel: {title}
                </h4>
              </div>

              <div className="p-8">
                <Textarea 
                  value={pasteBuffer} 
                  onChange={e => setPasteBuffer(e.target.value)}
                  placeholder="Copie as colunas da planilha e cole aqui..."
                  className="bg-slate-50/50 border-slate-100 text-slate-900 font-mono text-[10px] h-48 resize-none rounded-2xl p-6 focus:ring-primary shadow-inner"
                />
              </div>

              <div className="px-8 pb-8">
                <div className="bg-[#F8FAFC] rounded-3xl border border-slate-100 p-8 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo a ser aplicado</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-primary tracking-tight">{saldoASerAplicado.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] font-black text-primary opacity-40 uppercase">UCS</span>
                    </div>
                  </div>
                  <Button 
                    onClick={onImport} 
                    disabled={previewRows.length === 0} 
                    className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] h-12 px-12 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 tracking-widest"
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="h-14 border-b border-slate-100 hover:bg-transparent">
                {columns.map((col: any) => (
                  <TableHead key={col.label} className={cn("text-[9px] font-black uppercase tracking-widest text-slate-400 px-8", col.align === 'right' && "text-right", col.align === 'center' && "text-center")}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center hover:bg-transparent">
                    <div className="flex flex-col items-center justify-center opacity-30 gap-3">
                      <History className="w-8 h-8 text-slate-300" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Histórico de Auditoria Vazio</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row: any, i: number) => (
                  <TableRow key={i} className="group border-b border-slate-50 last:border-0 hover:bg-emerald-50/30 transition-colors">
                    {columns.map((col: any) => (
                      <TableCell key={col.label} className={cn("py-5 px-8 text-[11px] font-bold text-slate-600 tracking-tight", col.align === 'right' && "text-right", col.align === 'center' && "text-center", col.color, col.font === 'mono' && "font-mono")}>
                        {typeof row[col.key] === 'number' ? Math.abs(row[col.key]).toLocaleString('pt-BR') : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
