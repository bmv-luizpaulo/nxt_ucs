"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, ClipboardPaste, User, FileText, Database, ShieldCheck, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EntityEditDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityEditDialog({ entity, open, onOpenChange, onUpdate }: EntityEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [rawRow, setRawRow] = useState("");

  useEffect(() => {
    if (entity) {
      setFormData(entity);
      setRawRow("");
    }
  }, [entity]);

  const handleIndividualSave = () => {
    if (!entity) return;
    onUpdate(entity.id, formData);
    onOpenChange(false);
  };

  const handlePasteProcess = () => {
    if (!rawRow.trim() || !entity) return;
    
    // Suporta TAB (Excel) ou ponto e vírgula
    const separator = rawRow.includes('\t') ? '\t' : ';';
    const parts = rawRow.split(separator);
    
    if (parts.length < 5) {
      toast({ 
        variant: "destructive", 
        title: "Formato incompatível", 
        description: "A linha colada não possui colunas suficientes para o mapeamento." 
      });
      return;
    }

    const parseNum = (v: string) => {
      if (!v) return 0;
      // Remove R$, pontos de milhar e converte vírgula decimal
      const clean = v.replace(/[R$\s.]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    // Mapeamento baseado na ordem solicitada:
    // 0:Usuário 1:Documento 2:ORIGINAÇÃO 3:Débito 4:APOSENTADAS 5:BLOQUEADAS 6:Aquisição
    // 7:TRANSF IMEI 8:ESTORNO IMEI 9:Ajuste IMEI 10:Legado 11:CPRs 12:BMTCA 13:Status 
    // 14:Desmate 15:SALDO FINAL 16:VALOR AJUSTAR
    const updates: Partial<EntidadeSaldo> = {
      nome: parts[0]?.trim() || entity.nome,
      documento: parts[1]?.trim() || entity.documento,
      originacao: parseNum(parts[2]),
      debito: parseNum(parts[3]),
      aposentadas: parseNum(parts[4]),
      bloqueadas: parseNum(parts[5]),
      aquisicao: parseNum(parts[6]),
      transferenciaImei: parseNum(parts[7]),
      estornoImei: parseNum(parts[8]),
      saldoAjustarImei: parseNum(parts[9]),
      saldoLegado: parseNum(parts[10]),
      cprs: parts[11]?.trim() || "",
      bmtca: parts[12]?.trim() || "",
      statusBmtca: parts[13]?.trim() || "",
      desmate: parts[14]?.trim() || "",
      saldoFinal: parseNum(parts[15]),
      valorAjustar: parseNum(parts[16]),
    };

    setFormData(prev => ({ ...prev, ...updates }));
    toast({ 
      title: "Mapeamento Concluído", 
      description: "Os dados da planilha foram aplicados aos campos de auditoria." 
    });
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden bg-white border-none shadow-2xl rounded-[2.5rem] p-0 flex flex-col">
        {/* Header Principal */}
        <DialogHeader className="p-8 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle className="text-slate-900 font-black uppercase text-xl tracking-tight">
                Auditoria Individual: {entity.nome}
              </DialogTitle>
            </div>
            <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
              ID: {entity.id}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="individual" className="flex-1 overflow-hidden flex flex-col">
          {/* Menu de Tabs estilo Pílula */}
          <div className="px-8 pt-6 shrink-0">
            <TabsList className="bg-slate-100/50 p-1 border border-slate-200 rounded-full h-14 w-fit">
              <TabsTrigger 
                value="individual" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-10 rounded-full text-[10px] font-bold uppercase tracking-widest h-full"
              >
                Formulário
              </TabsTrigger>
              <TabsTrigger 
                value="paste" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-10 rounded-full text-[10px] font-bold uppercase tracking-widest h-full"
              >
                Colagem de Linha (Mascara)
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-8 pb-12">
                <TabsContent value="individual" className="mt-0 space-y-10">
                  {/* Seção Identificação */}
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <User className="w-3.5 h-3.5" /> Identificação e Documentação
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Nome do Usuário</Label>
                        <Input 
                          value={formData.nome || ""} 
                          onChange={e => setFormData({...formData, nome: e.target.value})} 
                          className="rounded-xl border-slate-200 h-12"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Documento (CPF/CNPJ)</Label>
                        <Input 
                          value={formData.documento || ""} 
                          onChange={e => setFormData({...formData, documento: e.target.value})} 
                          className="rounded-xl border-slate-200 h-12 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção Movimentação UCS */}
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Database className="w-3.5 h-3.5" /> Controle de Saldos e Movimentações (UCS)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Originação</Label>
                        <Input 
                          type="number" 
                          value={formData.originacao || 0} 
                          onChange={e => setFormData({...formData, originacao: Number(e.target.value)})} 
                          className="rounded-xl border-slate-200 h-11 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-rose-500">Débito</Label>
                        <Input 
                          type="number" 
                          value={formData.debito || 0} 
                          onChange={e => setFormData({...formData, debito: Number(e.target.value)})} 
                          className="rounded-xl border-rose-100 bg-rose-50/30 h-11 font-mono text-rose-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Aposentadas</Label>
                        <Input 
                          type="number" 
                          value={formData.aposentadas || 0} 
                          onChange={e => setFormData({...formData, aposentadas: Number(e.target.value)})} 
                          className="rounded-xl border-slate-200 h-11 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Bloqueadas</Label>
                        <Input 
                          type="number" 
                          value={formData.bloqueadas || 0} 
                          onChange={e => setFormData({...formData, bloqueadas: Number(e.target.value)})} 
                          className="rounded-xl border-slate-200 h-11 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-emerald-600">Aquisição</Label>
                        <Input 
                          type="number" 
                          value={formData.aquisicao || 0} 
                          onChange={e => setFormData({...formData, aquisicao: Number(e.target.value)})} 
                          className="rounded-xl border-emerald-100 bg-emerald-50/30 h-11 font-mono text-emerald-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Saldo Legado</Label>
                        <Input 
                          type="number" 
                          value={formData.saldoLegado || 0} 
                          onChange={e => setFormData({...formData, saldoLegado: Number(e.target.value)})} 
                          className="rounded-xl border-slate-200 h-11 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção Auditoria Final (Destaque) */}
                  <div className="bg-slate-900 p-8 rounded-[2rem] grid grid-cols-1 md:grid-cols-2 gap-8 shadow-xl">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Saldo Final (Auditado)</Label>
                      <Input 
                        type="number" 
                        value={formData.saldoFinal || 0} 
                        onChange={e => setFormData({...formData, saldoFinal: Number(e.target.value)})} 
                        className="rounded-2xl border-primary/50 bg-slate-800 h-16 text-2xl font-black text-primary font-mono text-center shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor a Ajustar</Label>
                      <Input 
                        type="number" 
                        value={formData.valorAjustar || 0} 
                        onChange={e => setFormData({...formData, valorAjustar: Number(e.target.value)})} 
                        className="rounded-2xl border-slate-700 bg-slate-800 h-16 text-xl font-bold text-white font-mono text-center"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-0">
                  <div className="bg-[#F1F5F9] p-10 rounded-[2.5rem] border border-slate-200 space-y-8 flex flex-col items-center">
                    <div className="flex gap-5 w-full">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                        <ClipboardPaste className="w-7 h-7 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight">Mapeamento Inteligente por Linha</h4>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Cole a linha correspondente do Excel para atualizar todos os campos</p>
                      </div>
                    </div>

                    <div className="w-full space-y-6">
                      <Input 
                        placeholder="Cole aqui a linha completa da planilha..."
                        value={rawRow}
                        onChange={e => setRawRow(e.target.value)}
                        className="h-20 bg-white border-slate-200 rounded-2xl font-mono text-xs px-6 shadow-sm focus:ring-primary focus:border-primary"
                      />
                      
                      <Button 
                        onClick={handlePasteProcess} 
                        variant="outline" 
                        className="w-full h-16 rounded-2xl border-slate-200 hover:bg-white hover:border-primary/30 font-black uppercase text-xs tracking-[0.1em] transition-all shadow-sm active:scale-95"
                      >
                        Processar e Mapear Campos
                      </Button>
                    </div>

                    <div className="flex items-start gap-3 text-slate-400 bg-white/50 p-6 rounded-2xl border border-slate-200/50 w-full">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight">
                        A ordem esperada é: Nome, Documento, Originação, Débito, Aposentadas, Bloqueadas, Aquisição, Transf IMEI, Estorno IMEI, Ajuste IMEI, Legado, CPRs, BMTCA, Status BMTCA, Desmate, Saldo Final e Ajuste.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </div>

          {/* Footer com botões de ação */}
          <div className="p-8 border-t border-slate-100 bg-white shrink-0 flex items-center justify-center gap-6">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="px-10 h-14 font-black uppercase text-[11px] tracking-widest text-slate-600"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleIndividualSave} 
              className="px-16 h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 flex items-center gap-3 transition-all active:scale-95"
            >
              <Save className="w-5 h-5" /> Salvar Auditoria no Ledger
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
