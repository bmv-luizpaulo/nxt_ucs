"use client"

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc, increment, arrayUnion, getDocs, query, where } from "firebase/firestore";
import { 
  Loader2, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Calculator, 
  Calendar, 
  Table as TableIcon,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  History
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Fazenda } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SafraBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFarms?: Fazenda[];
  onSuccess: () => void;
}

interface ProcessedRow {
  id: string;
  idf: string;
  fazendaNome: string;
  nucleo: string;
  proprietario: string;
  documento: string;
  ucsTotal: number;
  data: string;
  p1: number; // Produtor
  p2: number; // Associação
  p3: number; // IMEI
  matched: boolean;
  farmRef?: Fazenda;
}

export function SafraBulkDialog({ open, onOpenChange, onSuccess }: SafraBulkDialogProps) {
  const firestore = useFirestore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [rawText, setRawText] = useState("");
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);

  // Lógica de Processamento de Colagem
  const handleProcessPaste = async () => {
    if (!rawText.trim() || !firestore) return;
    setLoading(true);

    const lines = rawText.split('\n').filter(l => l.trim());
    const rows: ProcessedRow[] = [];

    // Busca rápida de fazendas para cruzamento
    const fazendasSnap = await getDocs(collection(firestore, "fazendas"));
    const allFazendas = fazendasSnap.docs.map(d => ({ id: d.id, ...d.data() } as Fazenda));

    for (const line of lines) {
      // Split flexível: tab ou 2+ espaços
      const parts = line.split(/\t+| {2,}/).map(p => p.trim()).filter(p => p !== "");
      if (parts.length < 3) continue;

      // Localização da Data como Âncora
      const dateIdx = parts.findIndex(p => /^\d{2}\/\d{2}\/\d{4}/.test(p));
      if (dateIdx === -1) continue;

      const idf = parts[dateIdx - 1] || "";
      const data = parts[dateIdx];
      const farmName = parts[dateIdx + 3];
      const nucleo = parts[dateIdx + 4];
      const ucsStr = parts[dateIdx + 7];
      
      const parseVal = (str: string | undefined) => {
        if (!str) return 0;
        const clean = str.replace(/\s/g, "");
        if (clean.includes(',')) return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0;
        return parseFloat(clean.replace(/\./g, "").replace(/[^\d.-]/g, "")) || 0;
      };

      const ucsTotal = parseVal(ucsStr);
      if (ucsTotal <= 0) continue;

      // Extração de Produtor da Planilha
      const sheetProdutor = parts[dateIdx + 9] || "";
      const sheetCNPJ = parts[dateIdx + 10] || "";
      const sheetCPF = parts[dateIdx + 11] || "";
      const sheetDoc = (sheetCNPJ || sheetCPF || "").trim();

      // Particionamento 33.33333% com Math.ceil
      const p1 = Math.ceil(ucsTotal * 0.333333333);
      const p2 = Math.ceil(ucsTotal * 0.333333333);
      const p3 = Math.ceil(ucsTotal * 0.333333333);

      // Cruzamento de dados com Fazendas no DB
      const matchedFarm = allFazendas.find(f => 
        f.idf === idf || 
        f.nome?.toLowerCase() === farmName?.toLowerCase()
      );

      rows.push({
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        idf,
        fazendaNome: farmName || (matchedFarm?.nome || "FAZENDA NÃO ENCONTRADA"),
        nucleo: nucleo || (matchedFarm?.nucleo || "SEM NÚCLEO"),
        proprietario: sheetProdutor || (matchedFarm?.proprietarios?.[0]?.nome || "Não Informado"),
        documento: sheetDoc || (matchedFarm?.proprietarios?.[0]?.documento || ""),
        ucsTotal,
        data,
        p1, p2, p3,
        matched: !!matchedFarm,
        farmRef: matchedFarm
      });
    }

    setProcessedData(rows);
    setStep(2);
    setLoading(false);
  };

  const handleConfirmGeneration = async () => {
    if (!firestore || processedData.length === 0) return;
    setLoading(true);

    try {
      let successCount = 0;
      const CHUNK_SIZE = 50; 
      
      for (let i = 0; i < processedData.length; i += CHUNK_SIZE) {
        const batch = writeBatch(firestore);
        const chunk = processedData.slice(i, i + CHUNK_SIZE);

        for (const row of chunk) {
          if (!row.matched || !row.farmRef) continue;

          // 1. Registro Central de Safra
          const safraRef = doc(collection(firestore, "safras_registros"));
          const safraDoc = {
            id: safraRef.id,
            safra: ano,
            idf: row.idf,
            propriedade: row.fazendaNome,
            nucleo: row.nucleo,
            originacao: row.ucsTotal,
            dataRegistro: row.data,
            createdAt: new Date().toISOString(),
            nome: row.proprietario,
            documento: row.documento,
            produtorSaldo: row.p1,
            associacaoNome: row.nucleo,
            associacaoCnpj: row.farmRef.nucleoCnpj || "00.000.000/0001-00",
            associacaoSaldo: row.p2,
            imeiNome: "INSTITUTO MATA VIVA",
            imeiCnpj: "00.000.000/0001-00",
            imeiSaldo: row.p3,
            status: 'valido'
          };
          batch.set(safraRef, safraDoc);

          // 2. Distribuição nas Carteiras
          const distribution = [
            { nome: row.proprietario, doc: row.documento, valor: row.p1 },
            { nome: row.nucleo, doc: safraDoc.associacaoCnpj, valor: row.p2 },
            { nome: "INSTITUTO MATA VIVA", doc: "00.000.000/0001-00", valor: row.p3 }
          ].filter(e => e.doc && e.valor > 0);

          for (const ent of distribution) {
            const entId = ent.doc.replace(/[^\d]/g, '');
            if (!entId) continue;
            const entRef = doc(firestore, "produtores", entId);

            const trans = {
              id: `SAFRA-${ano}-${row.id}`,
              data: row.data,
              dist: row.fazendaNome,
              plataforma: ano,
              valor: ent.valor,
              statusAuditoria: 'valido'
            };

            batch.set(entRef, {
              id: entId,
              nome: ent.nome,
              documento: ent.doc,
              status: 'disponivel',
              originacao: increment(ent.valor),
              saldoFinalAtual: increment(ent.valor),
              tabelaOriginacao: arrayUnion(trans),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          successCount++;
        }
        await batch.commit();
      }

      toast({ 
        title: "Safra Lançada!", 
        description: `${successCount} registros distribuídos nas carteiras com sucesso.` 
      });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro no lançamento." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        <DialogHeader className="bg-[#0B0F1A] p-8 text-white shrink-0 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Geração de Safra em Lote</DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 font-medium text-[10px] uppercase tracking-[0.2em]">
                {step === 1 ? "PASSO 1: IMPORTAÇÃO E COLETAGEM" : "PASSO 2: REVISÃO E PARTICIONAMENTO"}
              </DialogDescription>
            </div>
            {step === 2 && (
               <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                 {processedData.length} Registros Detectados
               </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-8 gap-6">
          {step === 1 ? (
            <div className="flex-1 flex flex-col gap-6">
               <div className="grid grid-cols-2 gap-6 shrink-0">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Safra de Referência</label>
                    <Input 
                      value={ano} 
                      onChange={e => setAno(e.target.value)}
                      className="h-12 rounded-xl font-black text-lg bg-slate-50 border-slate-100"
                    />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                       <Calculator className="w-5 h-5 text-emerald-600" />
                     </div>
                     <p className="text-[10px] font-bold text-emerald-700 uppercase leading-relaxed">
                       Motor de particionamento ativo: 33.33333% por entidade. <br/>
                       Arredondamento: <span className="font-black underline">Math.ceil (Saldos Inteiros)</span>
                     </p>
                  </div>
               </div>
               <div className="flex-1 flex flex-col space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colar Tabela (Excel/Sheets)</label>
                    <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">Formato Robusto Identificado</Badge>
                  </div>
                  <textarea 
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Cole aqui as colunas da planilha de auditoria..."
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-[2rem] p-8 font-mono text-[11px] focus:ring-2 focus:ring-emerald-500/10 focus:outline-none resize-none transition-all"
                  />
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
               <div className="rounded-[2rem] border border-slate-100 overflow-hidden flex-1 flex flex-col">
                  <ScrollArea className="flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">IDF / Fazenda / Safra</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">Volume Original</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">Particionamento 33%</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status / Vínculo</th>
                          <th className="py-4 px-6 text-right pr-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedData.map((row) => (
                          <tr key={row.id} className={cn(
                            "border-b border-slate-50 group hover:bg-slate-50/50 transition-colors",
                            !row.matched && "bg-rose-50/30"
                          )}>
                            <td className="py-5 px-6">
                              <div className="flex flex-col">
                                <span className={cn("text-[11px] font-black uppercase", row.matched ? "text-slate-900" : "text-rose-600")}>{row.fazendaNome}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-mono text-slate-400">IDF: {row.idf}</span>
                                  <Badge variant="outline" className="text-[8px] font-black h-4 px-1">{row.data}</Badge>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-[12px] font-black text-slate-900">
                              {row.ucsTotal.toLocaleString('pt-BR')} <span className="text-[9px] text-slate-400 font-bold">UCS</span>
                            </td>
                            <td className="py-5 px-6">
                               <div className="flex gap-2">
                                  <div className="bg-emerald-50 px-2 py-1 rounded-lg">
                                    <p className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">Produtor</p>
                                    <p className="text-[11px] font-black text-emerald-700">{row.p1}</p>
                                  </div>
                                  <div className="bg-indigo-50 px-2 py-1 rounded-lg">
                                    <p className="text-[8px] font-black text-indigo-400 uppercase leading-none mb-1">Assoc</p>
                                    <p className="text-[11px] font-black text-indigo-700">{row.p2}</p>
                                  </div>
                                  <div className="bg-slate-100 px-2 py-1 rounded-lg">
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">IMEI</p>
                                    <p className="text-[11px] font-black text-slate-600">{row.p3}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="py-5 px-6">
                               {row.matched ? (
                                 <div className="flex items-center gap-2 text-emerald-600">
                                   <CheckCircle2 className="w-3.5 h-3.5" />
                                   <span className="text-[10px] font-black uppercase">Vínculo Ativo</span>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-2 text-rose-500">
                                   <AlertTriangle className="w-3.5 h-3.5" />
                                   <span className="text-[10px] font-black uppercase text-rose-400">Fazenda Desconhecida</span>
                                 </div>
                               )}
                            </td>
                            <td className="py-5 px-6 text-right pr-10">
                              <button onClick={() => setProcessedData(prev => prev.filter(p => p.id !== row.id))} className="text-slate-200 hover:text-rose-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
               </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-4">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-10 h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-400">
                Fechar
              </Button>
              <Button 
                onClick={handleProcessPaste}
                disabled={loading || !rawText.trim()}
                className="flex-1 h-14 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-100 gap-2 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TableIcon className="w-4 h-4" />}
                Processar e Particionar Tabela
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} className="px-10 h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-400">
                Voltar
              </Button>
              <Button 
                onClick={handleConfirmGeneration}
                disabled={loading || processedData.length === 0}
                className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-100 gap-3 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Lançar {processedData.length} Safra(s) em Lote
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
