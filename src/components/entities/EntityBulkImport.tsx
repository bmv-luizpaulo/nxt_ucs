"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Layers, CheckCircle2, FileSpreadsheet, AlertCircle } from "lucide-react";
import { EntityStatus, EntidadeSaldo } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EntityBulkImportProps {
  onImport: (data: any[]) => void;
  type: 'produtor' | 'associacao';
}

export function EntityBulkImport({ onImport, type }: EntityBulkImportProps) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<any[]>([]);

  const parseNumber = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/[^\d,.-]/g, '').trim();
    if (!clean) return 0;

    // Identifica o último separador (ponto ou vírgula)
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    
    // Se não houver separadores, é um inteiro
    if (lastComma === -1 && lastDot === -1) return parseFloat(clean) || 0;

    // Define qual é o separador decimal (o último que aparecer)
    const decimalIdx = Math.max(lastComma, lastDot);
    const decimalSeparator = clean[decimalIdx];
    
    // Regra de Resolução de Ambiguidade para Brasil:
    // Se houver apenas um "." e ele tiver exatamente 3 dígitos depois, tratamos como milhar (1.000 -> 1000)
    // Exceto se houver uma vírgula em algum lugar.
    if (decimalSeparator === '.' && lastComma === -1) {
      const fractionalPart = clean.substring(decimalIdx + 1);
      if (fractionalPart.length === 3) {
        return parseFloat(clean.replace(/\./g, '')) || 0;
      }
    }
    
    // Caso contrário, seguimos a regra do último separador ser decimal
    const integerPart = clean.substring(0, decimalIdx).replace(/[,.]/g, '');
    const fractionalPart = clean.substring(decimalIdx + 1);
    
    return parseFloat(`${integerPart}.${fractionalPart}`) || 0;
  };

  const parseTSV = (text: string) => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').filter(l => l.trim());
    const results: any[] = [];
    
    const isSafraFormat = lines[0]?.toLowerCase().includes('safra');
    const headers = lines[0].toLowerCase().split('\t');
    const getIdx = (patterns: string[]) => headers.findIndex(h => patterns.some(p => h.includes(p.toLowerCase())));

    const idx = {
      safra: getIdx(['safra']),
      data: getIdx(['data registro', 'data']),
      idf: getIdx(['idf']),
      prop: getIdx(['propriedade']),
      produtor: getIdx(['produtor']),
      doc: getIdx(['cpf', 'cnpj']),
      ucs: getIdx(['ucs', 'unidade']),
      partProd: getIdx(['saldo do (particionado)', 'saldo particionado']),
      assocNome: getIdx(['associação']),
      assocSaldo: getIdx(['saldo da associação', 'saldo assoc']),
      imeiNome: getIdx(['imei']),
      imeiSaldo: getIdx(['saldo da imei', 'saldo imei']),
    };
    const startIdx = 1;
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length < 5) continue;

      if (isSafraFormat) {
        // Fallbacks para índices não encontrados ou formatos variáveis
        const safeGet = (index: number, fallback: string = "") => (index !== -1 ? parts[index]?.trim() : fallback);

        const doc = (safeGet(idx.doc) || `ID-${Math.random().toString(36).substr(2, 5)}`).replace(/[^\d.xXyY-]/g, '');
        const safra = safeGet(idx.safra) || "2010";
        const produtorNome = safeGet(idx.produtor) || safeGet(idx.prop) || "Sem Nome";

        results.push({
          id: `${doc}_${safra}`.replace(/[^\w]/g, '_'),
          nome: produtorNome,
          documento: doc,
          safra: safra,
          propriedade: safeGet(idx.prop),
          idf: safeGet(idx.idf),
          originacao: parseNumber(safeGet(idx.ucs)),
          dataRegistro: safeGet(idx.data),
          
          associacaoNome: safeGet(idx.assocNome),
          associacaoSaldo: parseNumber(safeGet(idx.assocSaldo)),
          
          imeiNome: safeGet(idx.imeiNome),
          imeiSaldo: parseNumber(safeGet(idx.imeiSaldo)),

          // Consolidados e Saldos de Referência
          saldoParticionado: parseNumber(safeGet(idx.partProd)), 
          saldoFinalAtual: parseNumber(safeGet(idx.partProd)),
          status: 'disponivel',
          createdAt: new Date().toISOString(),
          
          // Campos técnicos adicionais (opcionais na planilha)
          nucleo: safeGet(getIdx(['núcleo', 'região'])),
          lat: safeGet(getIdx(['lat'])),
          long: safeGet(getIdx(['long'])),
          isin: safeGet(getIdx(['isin'])),
          hashOriginacao: safeGet(getIdx(['hash'])),
        });
      } else {
        // Formato Padrão
        results.push({
          id: `ID-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          nome: parts[0]?.trim() || "N/A",
          documento: parts[1]?.trim() || "N/A",
          safra: "N/A",
          originacao: parseNumber(parts[2]),
          movimentacao: parseNumber(parts[3]) * -1,
          aposentado: parseNumber(parts[4]),
          bloqueado: parseNumber(parts[5]),
          aquisicao: parseNumber(parts[6]),
          saldoAjustarImei: parseNumber(parts[9]),
          saldoLegadoTotal: parseNumber(parts[10]),
          saldoFinalAtual: parseNumber(parts[15]),
          status: (parts[17]?.trim().toLowerCase() as EntityStatus) || 'disponivel',
          createdAt: new Date().toISOString()
        });
      }
    }
    return results;
  };

  useEffect(() => {
    setPreview(parseTSV(raw));
  }, [raw]);

  const handleConfirm = () => {
    onImport(preview);
    setRaw("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-12 px-8 rounded-full border-[#10B981]/20 bg-white hover:bg-[#10B981]/5 text-slate-900 font-black uppercase text-[10px] tracking-widest gap-3 shadow-none transition-all"
        >
          <Layers className="w-4 h-4 text-slate-900" /> IMPORTAR {type === 'produtor' ? 'PRODUTORES' : 'ASSOCIAÇÕES'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
        <div className="flex flex-col h-[85vh]">
          <DialogHeader className="p-8 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-slate-900 font-black uppercase text-xl flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-primary" /> 
              Importação Avançada de Saldos: {type.toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            <div className="p-8 border-r flex flex-col gap-4 overflow-hidden">
              <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Estrutura Esperada (17+ Colunas):</p>
                <p className="text-[8px] text-slate-400 leading-tight">
                  Usuário, Doc, Originação, Débito, Aposentadas, Bloqueadas, Aquisição, Transf IMEI, Estorno IMEI, Ajuste IMEI, Legado, CPRs, BMTCA, Status BMTCA, Desmate, Saldo Final, Valor Ajustar.
                </p>
              </div>
              <Textarea 
                value={raw} 
                onChange={e => setRaw(e.target.value)} 
                placeholder="Copie as colunas do Excel e cole aqui..."
                className="flex-1 font-mono text-[10px] bg-slate-50 border-slate-200 p-6 resize-none rounded-2xl focus:ring-primary shadow-inner"
              />
            </div>

            <div className="p-8 bg-slate-50 flex flex-col overflow-hidden">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary" /> Mapeamento para o Ledger ({preview.length} itens)
              </p>
              <div className="flex-1 rounded-2xl border bg-white overflow-hidden shadow-sm flex flex-col">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="bg-slate-50/50 sticky top-0">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase">Usuário</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-right">Saldo Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="h-32 text-center text-[9px] font-bold text-slate-300 uppercase">Aguardando colagem...</TableCell>
                        </TableRow>
                      ) : (
                        preview.map((p, i) => (
                          <TableRow key={i} className="border-b border-slate-50">
                            <TableCell className="font-bold text-[10px] uppercase truncate max-w-[150px]">{p.nome}</TableCell>
                            <TableCell className="text-right font-mono font-black text-primary">{(p.saldoFinalAtual || 0).toLocaleString('pt-BR')} UCS</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="p-8 border-t flex items-center justify-between gap-6 bg-white">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 flex-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-tight">Certifique-se de que a ordem das colunas no Excel segue o padrão técnico do LedgerTrust.</p>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[10px] font-bold uppercase tracking-widest px-8">Cancelar</Button>
              <Button 
                onClick={handleConfirm} 
                disabled={preview.length === 0}
                className="h-14 px-12 font-black uppercase text-xs rounded-2xl shadow-xl shadow-primary/20"
              >
                Sincronizar {preview.length} Saldos no Ledger
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
