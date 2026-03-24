import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Layers, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { OrderCategory, Pedido } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkImportDialogProps {
  onImport: (orders: any[]) => void;
  category: OrderCategory;
}

export function BulkImportDialog({ onImport, category }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const getCategoryName = (cat: OrderCategory) => {
    switch(cat) {
      case 'selo': return 'Selo Tesouro Verde';
      case 'Saas_Tesouro_Verde': return 'Saas Tesouro Verde';
      case 'Saas_BMV': return 'SaaS BMV';
      default: return cat;
    }
  }

  // Função robusta para parse de TSV respeitando aspas e quebras de linha internas
  const parseTSV = (text: string) => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\t' && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentField);
        if (currentRow.some(f => f.trim())) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim())) rows.push(currentRow);
    }
    return rows;
  };

  const processRawData = (text: string) => {
    if (!text.trim()) {
      setPreviewData([]);
      return;
    }

    const parsedRows = parseTSV(text);
    const results: any[] = [];

    // Ignorar cabeçalho se existir
    const startIdx = parsedRows[0]?.[0]?.toLowerCase().includes('pedido') ? 1 : 0;

    for (let i = startIdx; i < parsedRows.length; i++) {
      const parts = parsedRows[i];
      if (parts.length < 5) continue;

      // Heurística para detectar a nova estrutura: 
      // Se a coluna 5 (index 4) contiver "UCS", é a nova estrutura
      // Ou se houver o cabeçalho "Cliente"
      const isNewStructure = parts[4]?.toLowerCase().includes('ucs') || 
                            parsedRows[0]?.some(h => h.toLowerCase().includes('cliente'));

      let id, dataStr, originRaw, clienteRaw, programa, uf, doFlag, quantidadeStr, taxaRaw, totalRaw, modo, linkNxt;

      if (isNewStructure) {
        // Nova Estrutura: Pedido(0), Data(1), Origem(2), Cliente(3), Quantidade(4), Taxa(5), Total(6), Modo(7), Nxt(8)
        id = parts[0].trim();
        dataStr = parts[1].trim();
        originRaw = parts[2].trim();
        clienteRaw = parts[3].trim();
        programa = originRaw; // Mapeamos Origem para Programa para retrocompatibilidade
        uf = ""; // Não tem na nova estrutura
        doFlag = false; 
        quantidadeStr = parts[4]?.replace(/[^\d]/g, '') || "0";
        taxaRaw = parts[5];
        totalRaw = parts[6];
        modo = parts[7]?.trim();
        linkNxt = parts[8]?.trim() || "";
      } else {
        // Estrutura Padrão: Pedido(0), Data(1), Empresa(2), Prog(3), UF(4), D.O(5), Qtd(6), Taxa(7), Total(8)
        id = parts[0].trim();
        dataStr = parts[1].trim();
        clienteRaw = parts[2].trim();
        programa = parts[3]?.trim() || "";
        uf = parts[4]?.trim() || "";
        doFlag = parts[5]?.trim().toLowerCase() === 'sim' || parts[5]?.trim().toLowerCase() === 's';
        quantidadeStr = parts[6]?.replace(/[^\d]/g, '') || "0";
        taxaRaw = parts[7];
        totalRaw = parts[8];
        modo = "Fila";
        linkNxt = "";
      }
      
      const quantidade = parseInt(quantidadeStr);
      
      const parseBRL = (val: string) => {
        if (!val) return 0;
        return parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      };

      const taxa = parseBRL(taxaRaw);
      const total = parseBRL(totalRaw);

      // Extração inteligente de Empresa e CNPJ (Cliente)
      const clienteLines = clienteRaw.split(/\n/);
      let empresa = clienteLines[0]?.trim() || clienteRaw;
      let cnpj = "";

      const cnpjMatch = clienteRaw.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (cnpjMatch) {
        cnpj = cnpjMatch[0];
        empresa = empresa.replace(cnpj, '').trim();
      } else if (clienteLines.length > 1) {
        cnpj = clienteLines[clienteLines.length - 1]?.trim();
      }

      // Extração inteligente de Origem e CNPJ
      let finalOrigem = originRaw || "";
      let originCnpj = "";
      const oCnpjMatch = (originRaw || "").match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
      if (oCnpjMatch) {
        originCnpj = oCnpjMatch[0];
        finalOrigem = finalOrigem.replace(originCnpj, '').trim();
      }

      let isoDate = new Date().toISOString();
      try {
        const datePart = dataStr.split(' ')[0];
        const timePart = dataStr.split(' ')[1] || "00:00:00";
        const [day, month, year] = datePart.split('/').map(Number);
        const [hour, min, sec] = timePart.split(':').map(Number);
        
        if (day && month && year) {
          const d = new Date(year, month - 1, day, hour, min, sec);
          if (!isNaN(d.getTime())) {
            isoDate = d.toISOString();
          }
        }
      } catch (e) {}

      results.push({
        id,
        data: isoDate,
        empresa,
        cnpj,
        programa: finalOrigem, // Guardamos o nome limpo aqui também
        uf,
        origem: finalOrigem,
        origemCnpj: originCnpj,
        modo,
        do: doFlag,
        quantidade,
        taxa,
        valorTotal: total,
        auditado: false,
        status: 'pendente',
        hashPedido: "",
        linkNxt: linkNxt,
        categoria: category,
        createdAt: new Date().toISOString()
      });
    }
    setPreviewData(results);
  };

  useEffect(() => {
    processRawData(raw);
  }, [raw]);

  const handleImport = async () => {
    if (previewData.length === 0) return;
    setIsProcessing(true);
    await onImport(previewData);
    setRaw("");
    setPreviewData([]);
    setOpen(false);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-[10px] font-bold uppercase tracking-widest border-primary/20 hover:bg-primary/5 h-12 px-6 rounded-full">
          <Layers className="w-3.5 h-3.5" /> Importar em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
        <div className="flex flex-col h-[90vh]">
          <DialogHeader className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-slate-900 font-black uppercase text-xl tracking-tight flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-primary" /> 
                Processamento Inteligente: {getCategoryName(category).toUpperCase()}
              </DialogTitle>
              {previewData.length > 0 && (
                <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in fade-in zoom-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {previewData.length} registros detectados
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {/* Coluna de Entrada */}
            <div className="p-8 space-y-6 flex flex-col border-r border-slate-100">
              <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Estrutura de Colunas Detectada:</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Pedido', 'Data', 'Empresa/CNPJ', 'Prog/UF', 'D.O/Qtd', 'Taxa/Total'].map(label => (
                    <div key={label} className="bg-white p-2 rounded-lg border border-slate-200 text-[8px] font-black text-center text-slate-400 uppercase">{label}</div>
                  ))}
                </div>
              </div>

              <Textarea 
                value={raw} 
                onChange={e => setRaw(e.target.value)}
                placeholder="Copie os dados do Excel/Sheets e cole aqui..."
                className="flex-1 font-mono text-[10px] bg-slate-50 border-slate-200 rounded-2xl p-6 focus:ring-primary focus:border-primary resize-none shadow-inner"
              />
            </div>

            {/* Coluna de Visualização (Máscara) */}
            <div className="p-8 bg-slate-50 flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Layers className="w-3 h-3" /> Visualização do Banco de Dados
              </h4>
              
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
                {previewData.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4 opacity-40">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aguardando dados para mapeamento...</p>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow className="border-b border-slate-100 bg-slate-50/50">
                          <TableHead className="text-[9px] font-black uppercase text-slate-400">ID</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-slate-400">Origem</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right">Qtd</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((item, idx) => (
                          <TableRow key={idx} className="border-b border-slate-50 hover:bg-emerald-50/20 transition-colors">
                            <TableCell className="font-mono text-[10px] font-bold text-primary">{item.id}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-black text-[9px] uppercase truncate max-w-[140px] text-slate-900">{item.empresa}</span>
                                <span className="text-[8px] text-slate-400 font-mono">{item.cnpj}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{item.quantidade} UCS</TableCell>
                            <TableCell className="text-right font-mono text-[10px] font-black text-primary">
                              {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 flex-1 max-w-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-[10px] font-bold uppercase leading-tight tracking-tight">
                Verifique a prévia ao lado. Se os campos estiverem deslocados, ajuste os dados colados.
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[10px] font-bold uppercase tracking-widest px-8">Cancelar</Button>
              <Button 
                onClick={handleImport} 
                disabled={isProcessing || previewData.length === 0}
                className="h-14 px-12 font-black uppercase text-xs rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:grayscale"
              >
                {isProcessing ? "Sincronizando..." : `Confirmar Importação de ${previewData.length} Pedidos`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
