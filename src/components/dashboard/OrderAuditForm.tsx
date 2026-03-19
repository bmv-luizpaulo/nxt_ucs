
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

  const parseMovements = (text: string) => {
    if (!text.trim()) return [];
    
    // 1. Tokenização Inteligente: divide o texto por qualquer sequência de espaços, tabs ou quebras de linha
    // Filtramos tokens vazios.
    const allTokens = text.split(/[\t\n\r]+/).map(t => t.trim()).filter(t => t);
    
    if (allTokens.length === 0) return [];

    // 2. Identificação e remoção de cabeçalhos dinâmicos
    const headerKeywords = ['tipo', 'id', 'dist', 'data', 'origem', 'destino', 'usuário', 'quantidade', 'saldos'];
    const isHeader = headerKeywords.some(kw => allTokens[0].toLowerCase().includes(kw));
    
    let startIdx = 0;
    if (isHeader) {
      // Procuramos o primeiro token que pareça um código numérico ou uma data para marcar o início dos dados reais
      for (let i = 0; i < Math.min(25, allTokens.length); i++) {
        if (allTokens[i].match(/^\d{4,}/) || allTokens[i].includes('/')) {
          startIdx = i;
          break;
        }
      }
    }

    const tokens = allTokens.slice(startIdx);
    const results: any[] = [];

    // 3. Agrupamento por Registros baseado no delimitador "UCS"
    let currentPos = 0;
    while (currentPos < tokens.length) {
      // Procuramos o próximo token que contém a unidade de medida para encerrar o registro
      let endIdx = -1;
      for (let i = currentPos; i < Math.min(currentPos + 35, tokens.length); i++) {
        if (tokens[i].toLowerCase().includes('ucs')) {
          endIdx = i;
          break;
        }
      }

      if (endIdx !== -1) {
        const record = tokens.slice(currentPos, endIdx + 1);
        
        // Mapeamento por Posição Relativa (Baseado na máscara NXT fornecida)
        // [0]: TipoID, [1]: ID Sec, [2]: Data, [3]: DataFim, [4]: Categoria (GOV/TRADING), [5]: Papel, [6]: NomeOrigem, [7]: DestinoCat, [8]: PapelDest, [9]: NomeDestino
        
        const qtyToken = tokens[endIdx];
        const quantidade = parseInt(qtyToken.replace(/[^\d]/g, '')) || 1;

        results.push({
          tipo: record[4] || 'CLIENTE',
          hashMovimento: `ID-${record[1] || record[0] || Math.random().toString(36).substr(2, 9)}`,
          origem: record[6] || record[5] || "N/A",
          destino: record[9] || record[8] || "N/A",
          quantidade,
          raw: record.join(' | ')
        });

        currentPos = endIdx + 1;
      } else {
        // Fallback: tenta blocos fixos se o "UCS" não for encontrado (segurança)
        if (tokens.length - currentPos >= 10) {
          const block = tokens.slice(currentPos, currentPos + 11);
          results.push({
            tipo: block[4] || 'OUTRO',
            hashMovimento: `ID-${block[1] || block[0]}`,
            origem: block[6] || "N/A",
            destino: block[9] || "N/A",
            quantidade: parseInt(block[10]) || 0,
            raw: block.join(' | ')
          });
          currentPos += 11;
        } else {
          break;
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
              <Database className="w-3 h-3" /> Colar Dados de Rastreabilidade (Máscara Inteligente)
            </Label>
            {previewData.length > 0 && (
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md animate-in fade-in zoom-in">
                {previewData.length} REGISTROS DETECTADOS
              </span>
            )}
          </div>
          
          <Textarea
            id="movement-raw"
            placeholder="Cole aqui os dados do sistema (Tipo, ID, Data, Origem, Destino, Quantidade...)"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="min-h-[140px] font-mono text-[9px] bg-slate-50 border-slate-200 focus:ring-primary rounded-xl resize-none shadow-inner p-6"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <TableIcon className="w-3 h-3" /> Detalhamento do Mapeamento
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
                      <TableHead className="text-[8px] font-black uppercase h-8">Categoria</TableHead>
                      <TableHead className="text-[8px] font-black uppercase h-8">Origem do Ativo</TableHead>
                      <TableHead className="text-[8px] font-black uppercase h-8 text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((mov, idx) => (
                      <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <TableCell className="py-2">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">
                            {mov.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-[9px] text-slate-700 truncate max-w-[180px] uppercase">{mov.origem}</span>
                            <span className="text-[8px] text-slate-400 italic">Destino: {mov.destino}</span>
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
        {previewData.length > 0 && (
          <Alert variant="default" className="bg-emerald-50/50 border-emerald-100 py-2 px-3 animate-in slide-in-from-top-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <AlertDescription className="text-[9px] text-emerald-700 leading-tight font-medium uppercase tracking-tight">
              Mapeamento de {previewData.length} registros concluído. Clique abaixo para gravar permanentemente.
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          type="submit" 
          className="w-full gap-2 font-black uppercase text-[10px] h-14 shadow-xl shadow-primary/20 rounded-xl transition-all active:scale-95" 
          disabled={previewData.length === 0}
        >
          <Plus className="w-4 h-4" /> Gravar Rastreabilidade no Ledger
        </Button>
      </div>
    </form>
  );
}
