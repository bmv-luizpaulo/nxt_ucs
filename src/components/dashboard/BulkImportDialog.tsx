import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Layers, AlertCircle, Check } from "lucide-react";
import { OrderCategory } from "@/lib/types";
import { parse } from "date-fns";

interface BulkImportDialogProps {
  onImport: (orders: any[]) => void;
  category: OrderCategory;
}

export function BulkImportDialog({ onImport, category }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const getCategoryName = (cat: OrderCategory) => {
    switch(cat) {
      case 'selo': return 'Selo Tesouro Verde';
      case 'certificado_sas': return 'Saas Tesouro Verde';
      case 'sas_dmv': return 'SAS DMV';
      default: return cat;
    }
  }

  const handleImport = async () => {
    setIsProcessing(true);
    const lines = raw.split('\n').filter(l => l.trim());
    const parsedOrders: any[] = [];

    lines.forEach(line => {
      // Divide por tabs (comum em copiar/colar de planilhas)
      const parts = line.split('\t');
      if (parts.length < 5) return;

      const id = parts[0].trim();
      const dataStr = parts[1].trim();
      const originRaw = parts[2].replace(/"/g, '').trim();
      const programa = parts[3]?.trim() || "";
      const uf = parts[4]?.trim() || "";
      const doFlag = parts[5]?.trim().toLowerCase() === 'sim';
      
      // Quantidade (Remove " UCS" e converte)
      const quantidade = parseInt(parts[6]?.replace(/[^\d]/g, '') || "0");
      
      // Valores (Converte formato R$ 0,00)
      const parseBRL = (val: string) => {
        if (!val) return 0;
        return parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      };

      const taxa = parseBRL(parts[7]);
      const total = parseBRL(parts[8]);

      // Separa Empresa e CNPJ (Geralmente separados por quebra de linha ou espaço longo)
      const originParts = originRaw.split(/\n/);
      const empresa = originParts[0]?.trim() || originRaw;
      const cnpj = originParts.length > 1 ? originParts[originParts.length - 1]?.trim() : "";

      // Converte Data para ISO
      let isoDate = new Date().toISOString();
      try {
        const parsedDate = parse(dataStr, "dd/MM/yyyy HH:mm:ss", new Date());
        if (!isNaN(parsedDate.getTime())) {
          isoDate = parsedDate.toISOString();
        }
      } catch (e) {
        // Fallback para data atual se falhar
      }

      parsedOrders.push({
        id,
        data: isoDate,
        empresa,
        cnpj,
        programa,
        uf,
        do: doFlag,
        quantidade,
        taxa,
        valorTotal: total,
        auditado: false,
        status: 'pendente',
        hashPedido: "",
        linkNxt: "",
        categoria: category,
        createdAt: new Date().toISOString()
      });
    });

    if (parsedOrders.length > 0) {
      await onImport(parsedOrders);
      setRaw("");
      setOpen(false);
    }
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-[10px] font-bold uppercase tracking-widest border-primary/20 hover:bg-primary/5 h-12 px-6 rounded-full">
          <Layers className="w-3.5 h-3.5" /> Importar em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-[2rem] p-8">
        <DialogHeader>
          <DialogTitle className="text-slate-900 font-black uppercase text-xl tracking-tight flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary" /> 
            Importação em Lote: {getCategoryName(category).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Instruções:</p>
            <ul className="text-[9px] text-slate-400 space-y-1 font-medium uppercase">
              <li>• Cole as linhas copiadas diretamente da sua tabela de auditoria.</li>
              <li>• O sistema espera colunas separadas por TAB (padrão Excel/Sheets).</li>
              <li>• Pedido, Data, Origem, Programa, UF, D.O, Qtd, Taxa, Total.</li>
            </ul>
          </div>

          <Textarea 
            value={raw} 
            onChange={e => setRaw(e.target.value)}
            placeholder="Cole aqui os dados da tabela..."
            className="min-h-[350px] font-mono text-[10px] bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-primary focus:border-primary"
          />

          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 flex-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-[9px] font-bold uppercase leading-tight">
                Atenção: Serão criados {raw.split('\n').filter(l => l.trim()).length} novos registros permanentes no sistema.
              </p>
            </div>
            <Button 
              onClick={handleImport} 
              disabled={isProcessing || !raw.trim()}
              className="h-14 px-10 font-black uppercase text-xs rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              {isProcessing ? "Processando..." : "Confirmar e Salvar no Banco"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
