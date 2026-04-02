"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fazenda, FazendaProprietario } from "@/lib/types";
import { Plus, Trash2, MapPin, Building2, Users, Layers, Save, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface FazendaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Fazenda, 'id' | 'createdAt'>) => void;
  initial?: Fazenda | null;
}

const emptyProdutor = (): FazendaProprietario => ({
  nome: "",
  documento: "",
  percentual: 100,
  tipo: "PF",
});

export function FazendaForm({ open, onOpenChange, onSave, initial }: FazendaFormProps) {
  const [form, setForm] = useState<Omit<Fazenda, 'id' | 'createdAt'>>({
    nome: "",
    idf: "",
    isin: "",
    proprietarios: [emptyProdutor()],
    municipio: "",
    uf: "",
    lat: "",
    long: "",
    areaTotal: 0,
    areaVegetacao: undefined,
    areaConsolidada: undefined,
    nucleo: "",
    nucleoCnpj: "",
    status: "ativa",
    observacao: "",
    dataRegistro: new Date().toLocaleDateString('pt-BR'),
  });

  useEffect(() => {
    if (initial) {
      const { id, createdAt, ...rest } = initial;
      setForm(rest);
    } else if (open) {
      setForm({
        nome: "", idf: "", isin: "",
        proprietarios: [emptyProdutor()],
        municipio: "", uf: "", lat: "", long: "",
        areaTotal: 0, areaVegetacao: undefined, areaConsolidada: undefined,
        nucleo: "", nucleoCnpj: "",
        status: "ativa", observacao: "",
        dataRegistro: new Date().toLocaleDateString('pt-BR'),
      });
    }
  }, [initial, open]);

  const totalPercentual = form.proprietarios.reduce((s, p) => s + (p.percentual || 0), 0);
  const isValid = form.nome && form.idf && form.areaTotal > 0 && Math.abs(totalPercentual - 100) < 0.01;

  const updateProprietario = (idx: number, field: keyof FazendaProprietario, value: any) => {
    const updated = form.proprietarios.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    setForm({ ...form, proprietarios: updated });
  };

  const addProdutor = () => {
    const remaining = Math.max(0, 100 - totalPercentual);
    setForm({ ...form, proprietarios: [...form.proprietarios, { ...emptyProdutor(), percentual: remaining }] });
  };

  const removeProdutor = (idx: number) => {
    if (form.proprietarios.length === 1) return;
    setForm({ ...form, proprietarios: form.proprietarios.filter((_, i) => i !== idx) });
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[95vw] h-[92vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{initial ? 'Editar Fazenda' : 'Cadastrar Nova Fazenda'}</DialogTitle>
          <DialogDescription>Formulário de cadastro de propriedade rural.</DialogDescription>
        </DialogHeader>

        {/* HEADER */}
        <div className="bg-[#0B0F1A] px-8 py-6 shrink-0 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  {initial ? 'Editar Propriedade' : 'Nova Propriedade'}
                </p>
              </div>
              <h2 className="text-[20px] font-black uppercase tracking-tight">{form.nome || 'SEM NOME'}</h2>
              <div className="flex items-center gap-3">
                {form.idf && <span className="text-[10px] font-mono text-slate-400">IDF: {form.idf}</span>}
                {form.areaTotal > 0 && <span className="text-[10px] font-bold text-slate-400">{form.areaTotal.toLocaleString('pt-BR')} ha</span>}
                <Badge className={cn(
                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-none",
                  totalPercentual === 100 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                  {totalPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% distribuído
                </Badge>
              </div>
            </div>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white h-10 w-10 p-0 rounded-xl">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-8 space-y-8">

            {/* IDENTIFICAÇÃO */}
            <section className="space-y-4">
              <SectionTitle icon={<Building2 className="w-4 h-4 text-emerald-600" />} label="Identificação da Propriedade" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nome da Propriedade *</Label>
                  <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })}
                    placeholder="FAZENDA SÃO JOÃO" className="h-11 rounded-xl font-bold text-[13px] uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">IDF *</Label>
                  <Input value={form.idf} onChange={e => setForm({ ...form, idf: e.target.value })}
                    placeholder="000000" className="h-11 rounded-xl font-mono font-bold text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">ISIN</Label>
                  <Input value={form.isin || ""} onChange={e => setForm({ ...form, isin: e.target.value })}
                    placeholder="BR0000000000" className="h-10 rounded-xl font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Data de Registro</Label>
                  <Input value={form.dataRegistro || ""} onChange={e => setForm({ ...form, dataRegistro: e.target.value })}
                    placeholder="DD/MM/AAAA" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">ATIVA</SelectItem>
                      <SelectItem value="inativa">INATIVA</SelectItem>
                      <SelectItem value="pendente">PENDENTE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* ÁREA */}
            <section className="space-y-4">
              <SectionTitle icon={<Layers className="w-4 h-4 text-teal-600" />} label="Área" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Área Total (ha) *</Label>
                  <Input type="number" step="0.01" value={form.areaTotal || ""} onChange={e => setForm({ ...form, areaTotal: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00" className="h-10 rounded-xl font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Área Vegetação (ha)</Label>
                  <Input type="number" step="0.01" value={form.areaVegetacao ?? ""} onChange={e => setForm({ ...form, areaVegetacao: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    placeholder="0,00" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Área Consolidada (ha)</Label>
                  <Input type="number" step="0.01" value={form.areaConsolidada ?? ""} onChange={e => setForm({ ...form, areaConsolidada: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    placeholder="0,00" className="h-10 rounded-xl" />
                </div>
              </div>
            </section>

            {/* PROPRIETÁRIOS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle icon={<Users className="w-4 h-4 text-indigo-600" />} label="Produtores (Proprietários)" />
                <div className="flex items-center gap-3">
                  {Math.abs(totalPercentual - 100) > 0.01 && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase">
                      <AlertTriangle className="w-3 h-3" /> Total deve ser 100%
                    </span>
                  )}
                  <Button onClick={addProdutor} size="sm" variant="outline" className="h-8 px-4 rounded-lg text-[10px] font-black uppercase gap-1.5 border-slate-200">
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {form.proprietarios.map((prop, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-[9px] font-black text-indigo-600">{idx + 1}</div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produtor {idx + 1}</span>
                      {form.proprietarios.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeProdutor(idx)}
                          className="ml-auto h-7 w-7 p-0 rounded-lg text-rose-400 hover:bg-rose-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nome do Produtor</Label>
                        <Input value={prop.nome} onChange={e => updateProprietario(idx, 'nome', e.target.value.toUpperCase())}
                          placeholder="NOME DO PRODUTOR" className="h-9 rounded-lg font-bold text-[12px] uppercase bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">CPF / CNPJ</Label>
                        <Input value={prop.documento} onChange={e => updateProprietario(idx, 'documento', e.target.value)}
                          placeholder="000.000.000-00" className="h-9 rounded-lg font-mono text-[12px] bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">% Participação</Label>
                        <div className="relative">
                          <Input type="number" step="0.01" min="0" max="100"
                            value={prop.percentual} onChange={e => updateProprietario(idx, 'percentual', parseFloat(e.target.value) || 0)}
                            className={cn("h-9 rounded-lg font-black text-[13px] pr-8 bg-white", prop.percentual > 0 ? "text-indigo-700" : "")} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* LOCALIZAÇÃO */}
            <section className="space-y-4">
              <SectionTitle icon={<MapPin className="w-4 h-4 text-rose-500" />} label="Localização" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Município</Label>
                  <Input value={form.municipio || ""} onChange={e => setForm({ ...form, municipio: e.target.value })}
                    placeholder="Nome do Município" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">UF</Label>
                  <Input value={form.uf || ""} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                    placeholder="MT" maxLength={2} className="h-10 rounded-xl font-bold uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Núcleo / Associação</Label>
                  <Input value={form.nucleo || ""} onChange={e => setForm({ ...form, nucleo: e.target.value })}
                    placeholder="Nome do Núcleo" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Latitude</Label>
                  <Input value={form.lat || ""} onChange={e => setForm({ ...form, lat: e.target.value })}
                    placeholder="-15.000000" className="h-10 rounded-xl font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Longitude</Label>
                  <Input value={form.long || ""} onChange={e => setForm({ ...form, long: e.target.value })}
                    placeholder="-55.000000" className="h-10 rounded-xl font-mono" />
                </div>
              </div>
            </section>

            {/* OBSERVAÇÕES */}
            <section className="space-y-2">
              <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Observações</Label>
              <textarea
                value={form.observacao || ""}
                onChange={e => setForm({ ...form, observacao: e.target.value })}
                placeholder="Notas técnicas ou apontamentos..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-[12px] font-medium text-slate-700 resize-none focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </section>
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 font-black uppercase text-[10px] tracking-widest h-11 px-6">
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <div className="flex items-center gap-3">
            {!isValid && (
              <span className="text-[10px] text-rose-500 font-bold">
                {!form.nome ? "Nome obrigatório · " : ""}
                {!form.idf ? "IDF obrigatório · " : ""}
                {form.areaTotal <= 0 ? "Área obrigatória · " : ""}
                {Math.abs(totalPercentual - 100) > 0.01 ? `Produtores: ${totalPercentual.toFixed(1)}% (precisa ser 100%)` : ""}
              </span>
            )}
            <Button onClick={handleSave} disabled={!isValid}
              className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-emerald-100 disabled:opacity-40 transition-all active:scale-95">
              <Save className="w-4 h-4" />
              {initial ? 'Salvar Alterações' : 'Cadastrar Fazenda'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
      <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
        {icon}
      </div>
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">{label}</h3>
    </div>
  );
}
