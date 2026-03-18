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

  useEffect(() => {
    const final = 
      (formData.originacao || 0) + 
      (formData.movimentacao || 0) + 
      (formData.aposentado || 0) + 
      (formData.bloqueado || 0) + 
      (formData.aquisicao || 0) +
      (formData.saldoAjustarImei || 0);
    
    if (final !== formData.saldoFinalAtual) {
      setFormData(prev => ({ ...prev, saldoFinalAtual: final }));
    }
  }, [formData.originacao, formData.movimentacao, formData.aposentado, formData.bloqueado, formData.aquisicao, formData.saldoAjustarImei]);

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
        const valorRaw = parts[parts.length - 2] || parts[parts.length - 1];
        const valor = parseFloat(valorRaw?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
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
          valor: -valor 
        });
      } else {
        const valorRaw = parts[parts.length - 2]?.replace(/[R$\s.]/g, '').replace(',', '.') || "0";
        const valor = parseFloat(valorRaw) || 0;
        results.push({ 
          dist: parts[0]?.trim(), 
          data: parts[1]?.trim(), 
          destino: parts[2]?.trim(), 
          valor: -valor,
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
      description: `Tabela e Saldo de ${activePasteField.toString().toUpperCase()} atualizados.` 
    });
  };

  const handleIndividualSave = () => {
    if (!entity) return;
    onUpdate(entity.id, formData);
    onOpenChange(false);
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[95vh] overflow-hidden bg-[#F8FAFC] border-none shadow-2xl rounded-[2.5rem] p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Auditoria Permanente LedgerTrust - {entity.nome}</DialogTitle>
          <DialogDescription>Gestão de auditoria para produtores e associações.</DialogDescription>
        </DialogHeader>
        
        <div className="bg-[#0F172A] px-10 py-10 text-white shrink-0 relative">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute right-8 top-8 text-slate-500 hover:text-white">
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
              <div className="flex items-baseline justify-end gap-3 text-emerald-400">
                <span className="text-6xl font-black tracking-tighter">{(formData.saldoFinalAtual || 0).toLocaleString('pt-BR')}</span>
                <span className="text-sm font-black opacity-60 uppercase">UCS</span>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-10 space-y-12 pb-32">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TableIcon className="w-5 h-5 text-slate-400" />
                  <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Consolidação de Saldos</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                {[
                  { label: "Originação", val: formData.originacao, color: "text-slate-900" },
                  { label: "Movimentação", val: formData.movimentacao, color: "text-rose-600" },
                  { label: "Aposentado", val: formData.aposentado, color: "text-slate-600" },
                  { label: "Bloqueado", val: formData.bloqueado, color: "text-amber-600" },
                  { label: "Aquisição", val: formData.aquisicao, color: "text-emerald-600" },
                  { label: "Ajuste IMEI", val: formData.saldoAjustarImei, color: "text-indigo-600" },
                  { label: "Legado", val: formData.saldoLegadoTotal, color: "text-slate-400" }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white p-6 space-y-1">
                    <Label className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">{s.label}</Label>
                    <div className={cn("text-lg font-black font-mono", s.color)}>
                      {(s.val || 0).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <TableSection 
                title="Histórico de Originação" 
                activeField="originacao"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaOriginacao || []}
                columns={[
                  { label: "Dist.", key: "dist" },
                  { label: "Data Inicio", key: "data" },
                  { label: "Usuário Destino", key: "destino" },
                  { label: "Crédito (UCS)", key: "valor", align: "right", color: "text-emerald-600 font-black" }
                ]}
              />

              <TableSection 
                title="Histórico de Movimentações" 
                activeField="movimentacao"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaMovimentacao || []}
                columns={[
                  { label: "Dist.", key: "dist" },
                  { label: "Data Inicio", key: "data" },
                  { label: "Usuário Destino", key: "destino" },
                  { label: "Débito (UCS)", key: "valor", align: "right", color: "text-rose-500 font-black" }
                ]}
              />

              <TableSection 
                title="Detalhamento IMEI" 
                activeField="saldoAjustarImei"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaImei || []}
                columns={[
                  { label: "Dist.", key: "dist" },
                  { label: "Crédito", key: "valorCredito", color: "text-emerald-600" },
                  { label: "Débito", key: "valorDebito", color: "text-rose-500" },
                  { label: "Ajuste", key: "valor", align: "right", color: "text-indigo-600 font-black" }
                ]}
              />

              <TableSection 
                title="Aquisição de UCs (BMTCA)" 
                activeField="aquisicao"
                setActiveField={setActivePasteField}
                pasteBuffer={pasteBuffer}
                setPasteBuffer={setPasteBuffer}
                previewRows={previewRows}
                onImport={consolidateField}
                data={formData.tabelaAquisicao || []}
                columns={[
                  { label: "Usuário", key: "nome" },
                  { label: "Ano", key: "ano", align: "center" },
                  { label: "Volume (UCS)", key: "valor", align: "right", color: "text-emerald-600 font-black" }
                ]}
              />
            </div>

            <TableSection 
              title="Extrato Legado Auditado" 
              activeField="saldoLegadoTotal"
              setActiveField={setActivePasteField}
              pasteBuffer={pasteBuffer}
              setPasteBuffer={setPasteBuffer}
              previewRows={previewRows}
              onImport={consolidateField}
              data={formData.tabelaLegado || []}
              columns={[
                { label: "Data", key: "data" },
                { label: "Plataforma", key: "plataforma" },
                { label: "Nome", key: "nome" },
                { label: "Disponível", key: "disponivel", align: "right", color: "text-emerald-600 font-black" },
                { label: "Reservado", key: "reservado", align: "right", color: "text-amber-500" },
                { label: "Aposentado", key: "aposentado", align: "right", color: "text-rose-400" }
              ]}
              fullWidth
            />
          </div>
        </ScrollArea>

        <div className="p-8 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-12 h-16 font-black uppercase text-[10px] text-slate-400 hover:text-rose-500">
            Descartar Alterações
          </Button>
          <Button onClick={handleIndividualSave} className="px-20 h-20 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-emerald-200 bg-emerald-500 hover:bg-emerald-600 text-white flex gap-4">
            <Save className="w-6 h-6" /> Gravar Auditoria Permanente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TableSection({ title, activeField, setActiveField, pasteBuffer, setPasteBuffer, previewRows, onImport, data, columns, fullWidth }: any) {
  const isCurrentActive = activeField === activeField; // This should be controlled better

  return (
    <div className={cn("bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col min-h-[400px]", fullWidth && "lg:col-span-2")}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-4 h-4 text-slate-300" />
          <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">{title}</h3>
        </div>
        <Popover onOpenChange={(open) => {
          if (!open) {
            setPasteBuffer("");
            setActiveField(null);
          } else {
            setActiveField(activeField);
          }
        }}>
          <PopoverTrigger asChild>
            <Button className="h-9 px-5 font-black uppercase text-[9px] tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex gap-2">
              <Plus className="w-3.5 h-3.5" /> Importar Excel
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0 rounded-[1.5rem] shadow-3xl border-none bg-[#0F172A] overflow-hidden" side="top">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{title}</p>
                </div>
              </div>
              <Textarea 
                value={pasteBuffer}
                onChange={e => setPasteBuffer(e.target.value)}
                placeholder="Cole os dados aqui..."
                className="bg-slate-800 border-slate-700 text-[10px] font-mono h-32 resize-none text-slate-200 rounded-xl focus:ring-emerald-500"
              />
              <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-700">
                <Table>
                  <TableBody>
                    {previewRows.slice(0, 5).map((r: any, i: number) => (
                      <TableRow key={i} className="border-slate-700 bg-slate-900/50">
                        <TableCell className="text-[8px] text-slate-400 py-1">{r.data || r.nome}</TableCell>
                        <TableCell className="text-[8px] text-emerald-400 text-right py-1 font-mono">{r.valor?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={onImport} disabled={previewRows.length === 0} className="w-full h-12 font-black uppercase text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                Confirmar e Sincronizar ({previewRows.length})
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex-1 rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50">
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader className="bg-slate-100/50 sticky top-0 z-10">
              <TableRow className="h-10">
                {columns.map((col: any) => (
                  <TableHead key={col.label} className={cn("text-[8px] font-black uppercase", col.align === 'right' && "text-right", col.align === 'center' && "text-center")}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center text-[9px] font-bold text-slate-300 uppercase italic">Aguardando importação de dados</TableCell>
                </TableRow>
              ) : (
                data.map((row: any, i: number) => (
                  <TableRow key={i} className="h-9 border-b border-slate-50 hover:bg-white transition-colors">
                    {columns.map((col: any) => (
                      <TableCell key={col.label} className={cn("py-1 text-[9px]", col.align === 'right' && "text-right", col.align === 'center' && "text-center", col.color)}>
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
