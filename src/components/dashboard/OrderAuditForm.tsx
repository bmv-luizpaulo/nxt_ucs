import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Database, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OrderAuditFormProps {
  onAdd: (raw: string) => void;
}

export function OrderAuditForm({ onAdd }: OrderAuditFormProps) {
  const [raw, setRaw] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!raw.trim()) return;
    onAdd(raw);
    setRaw("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid w-full gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="movement-raw" className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Database className="w-3 h-3" /> Importar Extrato de Movimentação
          </Label>
        </div>
        
        <Textarea
          id="movement-raw"
          placeholder="Cole aqui os dados da tabela de movimentação...&#10;Ex: Hash | Origem | Destino | Qtd"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="min-h-[150px] font-mono text-[10px] bg-background/50 border-primary/20 focus:border-primary/50"
        />
        
        <Alert variant="default" className="bg-muted/30 border-none py-2 px-3">
          <AlertCircle className="h-3 w-3 text-muted-foreground" />
          <AlertDescription className="text-[9px] text-muted-foreground leading-tight">
            O sistema realizará o parse automático das linhas coladas. Cada linha será tratada como um novo registro de rastreabilidade vinculado a este pedido.
          </AlertDescription>
        </Alert>
      </div>
      
      <Button type="submit" size="sm" className="w-full gap-2 font-black uppercase text-[10px] h-10 shadow-lg shadow-primary/10" disabled={!raw.trim()}>
        <Plus className="w-4 h-4" /> Registrar Movimentações no Sistema
      </Button>
    </form>
  );
}
