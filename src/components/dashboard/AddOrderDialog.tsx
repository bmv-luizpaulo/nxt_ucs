
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { OrderCategory } from "@/lib/types";

export function AddOrderDialog({ onAdd }: { onAdd: (order: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    data: new Date().toISOString().split('T')[0],
    empresa: "",
    cnpj: "",
    programa: "",
    uf: "",
    do: "sim",
    quantidade: "",
    taxa: "0",
    valorTotal: "",
    categoria: "selo" as OrderCategory,
    origem: "",
    origemCnpj: "",
    modo: "Fila"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.empresa) return;

    onAdd({
      ...formData,
      do: formData.do === "sim",
      quantidade: Number(formData.quantidade),
      taxa: Number(formData.taxa),
      valorTotal: Number(formData.valorTotal),
      auditado: false,
      status: 'pendente',
      hashPedido: "",
      linkNxt: ""
    });
    
    setFormData({
      id: "",
      data: new Date().toISOString().split('T')[0],
      empresa: "",
      cnpj: "",
      programa: "",
      uf: "",
      do: "sim",
      quantidade: "",
      taxa: "0",
      valorTotal: "",
      categoria: "selo",
      origem: "",
      origemCnpj: "",
      modo: "Fila"
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-[10px] font-bold uppercase tracking-widest bg-primary hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white border-none shadow-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 font-black uppercase text-lg">Novo Registro de Pedido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID do Pedido</Label>
            <Input 
              value={formData.id} 
              onChange={e => setFormData({...formData, id: e.target.value})} 
              placeholder="#000" 
              className="bg-slate-50 border-slate-200 rounded-xl"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Data do Pedido</Label>
            <Input 
              type="date" 
              value={formData.data} 
              onChange={e => setFormData({...formData, data: e.target.value})} 
              className="bg-slate-50 border-slate-200 rounded-xl"
              required 
            />
          </div>
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Empresa / Razão Social</Label>
            <Input 
              value={formData.empresa} 
              onChange={e => setFormData({...formData, empresa: e.target.value})} 
              placeholder="Ex: ECO SUL SOLUCOES LTDA" 
              className="bg-slate-50 border-slate-200 rounded-xl"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CNPJ</Label>
            <Input 
              value={formData.cnpj} 
              onChange={e => setFormData({...formData, cnpj: e.target.value})} 
              placeholder="00.000.000/0001-00" 
              className="bg-slate-50 border-slate-200 rounded-xl font-mono text-xs"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Categoria da Tabela</Label>
            <Select value={formData.categoria} onValueChange={v => setFormData({...formData, categoria: v as OrderCategory})}>
              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selo">Selo Tesouro Verde</SelectItem>
                <SelectItem value="Saas_Tesouro_Verde">Saas Tesouro Verde</SelectItem>
                <SelectItem value="Saas_BMV">SaaS BMV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quantidade (UCS)</Label>
            <Input 
              type="number" 
              value={formData.quantidade} 
              onChange={e => setFormData({...formData, quantidade: e.target.value})} 
              placeholder="0"
              className="bg-slate-50 border-slate-200 rounded-xl font-mono"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Valor Total (R$)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={formData.valorTotal} 
              onChange={e => setFormData({...formData, valorTotal: e.target.value})} 
              placeholder="0,00"
              className="bg-slate-50 border-slate-200 rounded-xl font-mono"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Programa / Projeto</Label>
            <Input 
              value={formData.programa} 
              onChange={e => setFormData({...formData, programa: e.target.value})} 
              placeholder="Ex: Maricá (Mumbuca Verde)" 
              className="bg-slate-50 border-slate-200 rounded-xl"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Origem do Pedido</Label>
            <Input 
              value={formData.origem} 
              onChange={e => setFormData({...formData, origem: e.target.value})} 
              placeholder="Ex: IMEI" 
              className="bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Modo</Label>
            <Input 
              value={formData.modo} 
              onChange={e => setFormData({...formData, modo: e.target.value})} 
              placeholder="Fila / Customizado" 
              className="bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estado (UF)</Label>
            <Input 
              value={formData.uf} 
              onChange={e => setFormData({...formData, uf: e.target.value})} 
              placeholder="RJ" 
              maxLength={2}
              className="bg-slate-50 border-slate-200 rounded-xl uppercase"
            />
          </div>
          <Button type="submit" className="col-span-1 md:col-span-2 mt-4 font-black uppercase text-[10px] h-12 rounded-2xl shadow-lg shadow-primary/20">
            Criar Registro Permanente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
