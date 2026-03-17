import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Database, AlertCircle, CheckCircle2, Table as TableIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderAuditFormProps {
  onAdd: (movements: any[]) => void;
}

export function OrderAuditForm({ onAdd }: OrderAuditFormProps) {
  const [raw, setRaw] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Função para parse de movimentações com campos complexos
  const parseMovements = (text: string) => {
    if (!text.trim()) return [];
    
    // Divide por quebras de linha mas tenta agrupar registros se estiverem espalhados
    // Se houver tabs (\t), tratamos como linha de planilha. Se não, tentamos parse por blocos.
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const results: any[] = [];

    // Lógica para dados tabulares (Excel/Sheets)
    if (text.includes('\t')) {
      const rows = text.split('\n').filter(r => r.trim());
      const startIdx = rows[0]?.toLowerCase().includes('tipo') ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const parts = rows[i].split('\t');
        if (parts.length < 5) continue;

        const tipoRaw = parts[0]?.toLowerCase() || "";
        const id = parts[1] || "";
        const origem = parts[6] || parts[5] || "N/A"; // Usuário Origem
        const destino = parts[8] || parts[7] || "N/A"; // Usuário Destino
        const qtdStr = parts[10] || parts[parts.length - 1] || "0";
        const quantidade = parseInt(qtdStr.replace(/[^\d]/g, '')) || 0;

        results.push({
          tipo: tipoRaw.includes('gov') ? 'gov' : (tipoRaw.includes('trading') ? 'cliente' : 'outro'),
          hashMovimento: `ID-${id}`,
          origem: origem.replace(/"/g, '').split('\n')[0],
          destino: destino.replace(/"/g, '').split('\n')[0],
          quantidade,
          raw: rows[i]
        });
      }
    } else {
      // Fallback para parse linear se os dados vierem em blocos de texto
      // (Útil para o formato "vertical" enviado no exemplo)
      // Aqui agrupamos a cada N linhas ou procuramos padrões
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^\d{5,}/)) { // Detecta o Tipo/ID começando com números longos
          results.push({
            tipo: lines[i+4]?.toLowerCase().includes('gov') ? 'gov' : 'cliente',
            hashMovimento: `ID-${lines[i+1]}`,
            origem: lines[i+6] || "N/A",
            destino: lines[i+8] || "N/A",
            quantidade: parseInt(lines[i+12]) || 1,
            raw: lines.slice(i, i+13).join(' | ')
          });
          i += 12; // Pula o bloco processado
        }
      }
    }

    return results;
  };

  useEffect(() => {
    setPreviewData(parseMovements(raw));
  }, [raw]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (previewData.length === 0) return;
    onAdd(previewData);
    setRaw("");
    setPreviewData([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="movement-raw" className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Database className="w-3 h-3" /> Colar Dados de Rastreabilidade
            </Label>
            {previewData.length > 0 && (
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md animate-in fade-in zoom-in">
                {previewData.length} REGISTROS DETECTADOS
              </span>
            )}
          </div>
          
          <Textarea
            id="movement-raw"
            placeholder="Tipo	ID	Dist.	Data Inicio	Data Fim	Origem	Usuário Origem..."
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="min-h-[120px] font-mono text-[9px] bg-slate-50 border-slate-200 focus:ring-primary rounded-xl resize-none shadow-inner"
          />
        </div>

        {/* Máscara de Visualização */}
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <TableIcon className="w-3 h-3" /> Prévia do Mapeamento
          </Label>
          <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
            <ScrollArea className="h-[200px]">
              {previewData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[180px] opacity-30 text-center p-4">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-tighter">Aguardando dados para processamento...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[8px] font-black uppercase h-8">Tipo</TableHead>
                      <TableHead className="text-[8px] font-black uppercase h-8">Origem/Destino</TableHead>
                      <TableHead className="text-[8px] font-black uppercase h-8 text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((mov, idx) => (
                      <TableRow key={idx} className="border-b border-slate-50">
                        <TableCell className="py-2">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                            mov.tipo === 'gov' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {mov.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-slate-700 truncate max-w-[150px]">{mov.origem}</span>
                            <span className="text-[8px] text-slate-400 italic">para {mov.destino}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-[9px] font-black text-primary">
                          {mov.quantidade} UCS
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <Alert variant="default" className="bg-emerald-50/50 border-emerald-100 py-2 px-3">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <AlertDescription className="text-[9px] text-emerald-700 leading-tight font-medium">
            Confira a tabela acima. Se o mapeamento estiver correto, clique abaixo para gravar permanentemente no Ledger.
          </AlertDescription>
        </Alert>
        
        <Button 
          type="submit" 
          className="w-full gap-2 font-black uppercase text-[10px] h-12 shadow-lg shadow-primary/20 rounded-xl" 
          disabled={previewData.length === 0}
        >
          <Plus className="w-4 h-4" /> Gravar {previewData.length} Movimentações no Sistema
        </Button>
      </div>
    </form>
  );
}
