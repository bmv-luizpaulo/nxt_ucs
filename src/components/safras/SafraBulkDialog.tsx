"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc, increment, getDocs } from "firebase/firestore";
import { 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  Calculator, 
  Table as TableIcon,
  Trash2,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Fazenda } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { imeiEngine } from "@/domain/calculos/imeiEngine";

// Mapa de Governança para Depósito Automático
const governanceMap: Record<string, string> = {
  "XINGU MATA VIVA": "10.175.886/0001-68",
  "TELES PIRES MATA VIVA": "11.271.788/0001-97",
  "MADEIRA MATA VIVA": "12.741.679/0001-59",
  "APRRIMA": "12.741.679/0001-59",
  "ARINOS MATA VIVA": "11.952.411/0001-01"
};

// Remove acentos e minúsculas para encontrar as colunas no Excel
const normalizeText = (str: string) => {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

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

  // ── LÓGICA DE PROCESSAMENTO DE COLAGEM INTELIGENTE ──
  const handleProcessPaste = async () => {
    if (!rawText.trim() || !firestore) return;
    setLoading(true);

    try {
      const lines = rawText.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        toast({ variant: "destructive", title: "Dados Insuficientes", description: "Copie pelo menos o cabeçalho e uma linha de dados." });
        setLoading(false);
        return;
      }

      // Identifica delimitador (Tab do Excel ou Ponto e Vírgula do CSV)
      const delimiter = lines[0].includes('\t') ? '\t' : ';';
      
      const rawHeaders = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, '').trim());
      const normHeaders = rawHeaders.map(normalizeText);

      // Mapeamento dinâmico de colunas
      const findCol = (names: string[]) => {
        const normNames = names.map(normalizeText);
        return normHeaders.findIndex(h => normNames.some(n => h.includes(n)));
      };

      const idx = {
        data: findCol(['data', 'registro', 'emissao']),
        idf: findCol(['idf', 'matricula']),
        fazenda: findCol(['fazenda', 'propriedade', 'imovel']),
        nucleo: findCol(['nucleo', 'polo']),
        ucs: findCol(['ucs', 'saldo', 'volume', 'total']),
        pNome: findCol(['produtor', 'titular', 'nome']),
        pDoc: findCol(['cpf', 'cnpj', 'documento'])
      };

      if (idx.ucs === -1) {
        toast({ variant: "destructive", title: "Erro na leitura", description: "Não encontrei a coluna de 'UCS' ou 'Saldo'. Verifique o cabeçalho colado." });
        setLoading(false);
        return;
      }

      // Busca fazendas do DB para cruzar
      const fazendasSnap = await getDocs(collection(firestore, "fazendas"));
      const allFazendas = fazendasSnap.docs.map(d => ({ id: d.id, ...d.data() } as Fazenda));
      const rows: ProcessedRow[] = [];

      // Pula a linha 0 (cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        // Divide lidando com possíveis aspas do Excel
        const parts = lines[i].split(new RegExp(`\\s*${delimiter}\\s*(?=(?:[^"]*"[^"]*")*[^"]*$)`))
                              .map(c => c.replace(/^"|"$/g, '').trim());

        const parseVal = (str: string | undefined) => {
          if (!str) return 0;
          const clean = str.replace(/\s/g, "");
          if (clean.includes(',')) return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0;
          return parseFloat(clean.replace(/\./g, "").replace(/[^\d.-]/g, "")) || 0;
        };

        const ucsTotal = parseVal(parts[idx.ucs]);
        if (ucsTotal <= 0) continue; // Ignora saldos zerados

        const idfRaw = idx.idf !== -1 ? parts[idx.idf] : "";
        const idf = idfRaw.replace(/^0+/, ''); // Remove zeros à esquerda
        
        let dataRegistro = idx.data !== -1 ? parts[idx.data] : "";
        // Se a data não foi encontrada ou não parece uma data, usa a data atual
        if (!/^\d{2}\/\d{2}\/\d{4}/.test(dataRegistro)) {
           const d = new Date();
           dataRegistro = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        }

        const farmName = idx.fazenda !== -1 ? parts[idx.fazenda] : "";
        const nucleoRaw = idx.nucleo !== -1 ? parts[idx.nucleo]?.toUpperCase() : "";
        const sheetProdutor = idx.pNome !== -1 ? parts[idx.pNome] : "";
        const sheetDoc = idx.pDoc !== -1 ? parts[idx.pDoc]?.replace(/\D/g, '') : "";

        // Motor Determinístico (Particiona os 33% exatos com resto no IMEI)
        const { produtor: p1, associacao: p2, imei: p3 } = imeiEngine.partitionSafra(ucsTotal);

        // Cruza os dados com o DB (Por IDF prioritariamente, depois por Nome)
        const matchedFarm = allFazendas.find(f => 
          (idf && f.idf === idf) || 
          (farmName && f.nome?.toLowerCase() === farmName.toLowerCase())
        );

        rows.push({
          id: Math.random().toString(36).substr(2, 6).toUpperCase(),
          idf: idf || (matchedFarm?.idf || "---"),
          fazendaNome: farmName || (matchedFarm?.nome || "NÃO IDENTIFICADA"),
          nucleo: nucleoRaw || (matchedFarm?.nucleo || "SEM NÚCLEO"),
          proprietario: sheetProdutor || (matchedFarm?.proprietarios?.[0]?.nome || "Não Informado"),
          documento: sheetDoc || (matchedFarm?.proprietarios?.[0]?.documento || ""),
          ucsTotal,
          data: dataRegistro,
          p1, p2, p3,
          matched: !!matchedFarm,
          farmRef: matchedFarm
        });
      }

      setProcessedData(rows);
      setStep(2);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro de Processamento", description: "O formato colado não pôde ser lido." });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGeneration = async () => {
    if (!firestore || processedData.length === 0) return;
    setLoading(true);

    try {
      let successCount = 0;
      const CHUNK_SIZE = 400; // Limite do Firestore é 500
      
      for (let i = 0; i < processedData.length; i += CHUNK_SIZE) {
        const batch = writeBatch(firestore);
        const chunk = processedData.slice(i, i + CHUNK_SIZE);

        for (const row of chunk) {
          if (!row.matched || !row.farmRef) continue;

          const nucleoNormalizado = row.nucleo.toUpperCase();
          const assocCnpj = governanceMap[nucleoNormalizado] || row.farmRef.nucleoCnpj || "00.000.000/0001-00";

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
            associacaoCnpj: assocCnpj,
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
            { nome: row.nucleo, doc: assocCnpj, valor: row.p2 },
            { nome: "INSTITUTO MATA VIVA", doc: "00.000.000/0001-00", valor: row.p3 }
          ].filter(e => e.doc && e.valor > 0);

          for (const ent of distribution) {
            const entId = ent.doc.replace(/[^\d]/g, '');
            if (!entId) continue;
            const entRef = doc(firestore, "produtores", entId);

            batch.set(entRef, {
              id: entId,
              nome: ent.nome,
              documento: ent.doc,
              status: 'disponivel',
              originacao: increment(ent.valor),
              saldoFinalAtual: increment(ent.valor),
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
                       Arredondamento: <span className="font-black underline">Matemático no IMEI</span>
                     </p>
                  </div>
               </div>
               <div className="flex-1 flex flex-col space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colar Tabela (Excel/Sheets)</label>
                    <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">Exige Cabeçalho na 1ª Linha</Badge>
                  </div>
                  <textarea 
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Copie no Excel e cole aqui. Certifique-se de copiar a linha de cabeçalho junto (Ex: Data | IDF | Fazenda | UCS)..."
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-[2rem] p-8 font-mono text-[11px] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none resize-none transition-all custom-scrollbar"
                  />
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
               <div className="rounded-[2rem] border border-slate-100 overflow-hidden flex-1 flex flex-col">
                  <ScrollArea className="flex-1">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">IDF / Fazenda / Data</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">Volume Original</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">Particionamento Automático</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status de Banco</th>
                          <th className="py-4 px-6 text-right pr-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedData.map((row) => (
                          <tr key={row.id} className={cn(
                            "border-b border-slate-50 group hover:bg-slate-50/50 transition-colors",
                            !row.matched && "bg-rose-50/30 hover:bg-rose-50/50"
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
                                  <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50">
                                    <p className="text-[8px] font-black text-emerald-500 uppercase leading-none mb-1">Produtor</p>
                                    <p className="text-[11px] font-black text-emerald-700">{row.p1.toLocaleString('pt-BR')}</p>
                                  </div>
                                  <div className="bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100/50">
                                    <p className="text-[8px] font-black text-indigo-500 uppercase leading-none mb-1">Assoc</p>
                                    <p className="text-[11px] font-black text-indigo-700">{row.p2.toLocaleString('pt-BR')}</p>
                                  </div>
                                  <div className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50">
                                    <p className="text-[8px] font-black text-slate-500 uppercase leading-none mb-1">IMEI</p>
                                    <p className="text-[11px] font-black text-slate-700">{row.p3.toLocaleString('pt-BR')}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="py-5 px-6">
                               {row.matched ? (
                                 <div className="flex items-center gap-2 text-emerald-600">
                                   <CheckCircle2 className="w-3.5 h-3.5" />
                                   <span className="text-[10px] font-black uppercase">Pronto p/ Lançamento</span>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-2 text-rose-500">
                                   <AlertTriangle className="w-3.5 h-3.5" />
                                   <span className="text-[10px] font-black uppercase text-rose-400">Fazenda Desconhecida</span>
                                 </div>
                               )}
                            </td>
                            <td className="py-5 px-6 text-right pr-10">
                              <button onClick={() => setProcessedData(prev => prev.filter(p => p.id !== row.id))} className="text-slate-300 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50">
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
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-10 h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-400 hover:text-slate-600">
                Cancelar
              </Button>
              <Button 
                onClick={handleProcessPaste}
                disabled={loading || !rawText.trim()}
                className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/20 gap-2 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TableIcon className="w-4 h-4" />}
                Ler e Particionar Safra
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} className="px-10 h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-400 hover:text-slate-600">
                Voltar e Editar
              </Button>
              <Button 
                onClick={handleConfirmGeneration}
                disabled={loading || processedData.length === 0 || !processedData.some(r => r.matched)}
                className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/20 gap-3 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Registrar {processedData.filter(r => r.matched).length} Safra(s) Auditada(s)
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}