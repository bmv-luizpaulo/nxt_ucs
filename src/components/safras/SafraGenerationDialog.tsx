"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, Search, Wand2, X, Calendar, Calculator, Landmark } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, where, doc, writeBatch, increment, arrayUnion } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { imeiEngine } from "@/domain/calculos/imeiEngine";

// Mapa de Governança para Depósito Automático
const governanceMap: Record<string, string> = {
  "XINGU MATA VIVA": "10.175.886/0001-68",
  "TELES PIRES MATA VIVA": "11.271.788/0001-97",
  "MADEIRA MATA VIVA": "12.741.679/0001-59",
  "APRRIMA": "12.741.679/0001-59",
  "ARINOS MATA VIVA": "11.952.411/0001-01"
};

interface SafraGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Fazenda {
  id: string;
  nome: string;
  idf: string;
  nucleo?: string;
  nucleoCnpj?: string;
  proprietarios?: { nome: string; documento: string }[];
  isin?: string;
}

export function SafraGenerationDialog({ open, onOpenChange }: SafraGenerationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [selectedFazenda, setSelectedFazenda] = useState<Fazenda | null>(null);
  
  const [isin, setIsin] = useState("");
  const [rule, setRule] = useState("tripartite");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [ucs, setUcs] = useState("");
  const [date, setDate] = useState("");

  const firestore = useFirestore();

  // Busca fazendas ao abrir ou pesquisar
  useEffect(() => {
    if (!open || !firestore) return;

    const fetchFazendas = async () => {
      try {
        const q = query(collection(firestore, "fazendas"));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fazenda));
        setFazendas(list);
      } catch (e) {
        console.error(e);
      }
    };

    fetchFazendas();
  }, [open, firestore]);

  const filteredFazendas = fazendas.filter(f => 
    f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.idf?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const handleGenerateIsin = () => {
    const random = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    setIsin(`BR${random}`);
  };

  const handleConfirm = async () => {
    if (!selectedFazenda || !ucs || !firestore) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Selecione uma fazenda e o total de UCS." });
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(firestore);
      const ucsVal = parseFloat(ucs);
      
      // UTILIZAÇÃO DO MOTOR DETERMINÍSTICO (1/3 com absorção IMEI)
      const { produtor: p1, associacao: p2, imei: p3 } = imeiEngine.partitionSafra(ucsVal);

      const nucleoNormalizado = (selectedFazenda.nucleo || "").toUpperCase();
      const assocCnpj = governanceMap[nucleoNormalizado] || selectedFazenda.nucleoCnpj || "00.000.000/0001-00";

      const mainData = {
        safra: year,
        dataRegistro: date || new Date().toLocaleDateString('pt-BR'),
        idf: selectedFazenda.idf,
        propriedade: selectedFazenda.nome,
        nucleo: selectedFazenda.nucleo || "---",
        originacao: ucsVal,
        isin: isin || selectedFazenda.isin || "PENDENTE",
        hashOriginacao: `HASH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        nome: selectedFazenda.proprietarios?.[0]?.nome || "Sem Nome",
        documento: selectedFazenda.proprietarios?.[0]?.documento || "",
        produtorSaldo: p1,
        associacaoNome: selectedFazenda.nucleo || "ASSOCIAÇÃO MATA VIVA",
        associacaoCnpj: assocCnpj,
        associacaoSaldo: p2,
        imeiNome: "INSTITUTO MATA VIVA",
        imeiCnpj: "00.000.000/0001-00",
        imeiSaldo: p3,
        status: 'valido',
        createdAt: new Date().toISOString()
      };

      // 1. Registro na tabela de auditoria (IMUTÁVEL)
      const safraRef = doc(collection(firestore, "safras_registros"));
      batch.set(safraRef, mainData);

      // 2. Distribuição nas Carteiras
      const entities = [
        { nome: mainData.nome, doc: mainData.documento, valor: p1 },
        { nome: mainData.associacaoNome, doc: assocCnpj, valor: p2 },
        { nome: mainData.imeiNome, doc: "00.000.000/0001-00", valor: p3 }
      ].filter(e => e.doc && e.valor > 0);

      for (const ent of entities) {
        const entId = ent.doc.replace(/[^\d]/g, '');
        if (!entId) continue;

        const entRef = doc(firestore, "produtores", entId);
        
        batch.set(entRef, {
          id: entId,
          nome: ent.nome,
          documento: ent.doc,
          status: 'disponivel',
          originacao: increment(ent.valor),      // Gênese Imutável
          saldoFinalAtual: increment(ent.valor), // Saldo Disponível
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await batch.commit();
      toast({ title: "Safra Gerada!", description: `${ucsVal} UCS foram distribuídas com sucesso.` });
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro na geração", description: "Ocorreu um erro ao processar a geração manual." });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSearchTerm("");
    setSelectedFazenda(null);
    setIsin("");
    setUcs("");
    setDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
        <div className="flex flex-col">
          {/* HEADER (Invisible title for Accessibility) */}
          <DialogHeader className="sr-only">
            <DialogTitle>Gerar Safra Manualmente</DialogTitle>
          </DialogHeader>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 gap-8">
              
              {/* Fazenda Selector */}
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Fazenda</label>
                <div className="relative group">
                  <div className={cn(
                    "relative flex items-center h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 transition-all focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500/50",
                    selectedFazenda ? "border-emerald-500/30 bg-emerald-50/20" : ""
                  )}>
                    <Search className={cn("w-4 h-4 mr-3 transition-colors", selectedFazenda ? "text-emerald-500" : "text-slate-400")} />
                    <input 
                      type="text"
                      value={selectedFazenda ? selectedFazenda.nome : searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (selectedFazenda) setSelectedFazenda(null);
                      }}
                      placeholder="Buscar fazenda por nome ou UUID..."
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium"
                    />
                    {selectedFazenda && (
                      <button onClick={() => setSelectedFazenda(null)} className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-200 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {searchTerm && !selectedFazenda && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {filteredFazendas.length > 0 ? (
                        filteredFazendas.map(f => (
                          <div 
                            key={f.id}
                            onClick={() => {
                              setSelectedFazenda(f);
                              setSearchTerm("");
                            }}
                            className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between group/item border-b border-slate-50 last:border-none"
                          >
                            <div>
                               <p className="text-[13px] font-black text-slate-900 uppercase group-hover/item:text-emerald-600 transition-colors">{f.nome}</p>
                               <p className="text-[10px] font-mono text-slate-400 uppercase">IDF: {f.idf}</p>
                            </div>
                            <Badge variant="outline" className="text-[8px] font-black opacity-0 group-hover/item:opacity-100 transition-all">Selecionar</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-400 font-bold uppercase text-[10px]">Nenhuma fazenda encontrada</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ISIN COde */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Código ISIN</label>
                  <button 
                    onClick={handleGenerateIsin}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-emerald-500 hover:text-white rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-widest transition-all"
                  >
                    <Wand2 className="w-3 h-3" /> Gerar (Dev)
                  </button>
                </div>
                <Input 
                  value={isin}
                  onChange={(e) => setIsin(e.target.value)}
                  placeholder="Ex: BR0000000000"
                  className="h-14 bg-slate-50 border-slate-100 rounded-2xl px-6 font-mono text-[13px] text-slate-700 shadow-none focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>

              {/* Regra & Ano */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Regra de Distribuição</label>
                  <Select value={rule} onValueChange={setRule}>
                    <SelectTrigger className="h-14 bg-slate-50 border-slate-100 rounded-2xl px-6 font-bold text-slate-900 focus:ring-emerald-500/20">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl p-2">
                       <SelectItem value="tripartite" className="rounded-xl font-bold py-3">33% Tripartite (Standard)</SelectItem>
                       <SelectItem value="custom" className="rounded-xl font-bold py-3">Personalizada (Brevemente)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ano de Referência</label>
                  <Input 
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    type="number"
                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl px-6 font-black text-slate-900 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* UCS & Data */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Total UCS a Gerar</label>
                    <div className="relative">
                      <Calculator className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input 
                        value={ucs}
                        onChange={(e) => setUcs(e.target.value)}
                        placeholder="Ex: 500"
                        type="number"
                        className="h-14 bg-slate-50 border-slate-100 rounded-2xl pl-12 pr-6 font-black text-slate-900 focus:ring-emerald-500/20"
                      />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Criação (Opcional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        type="date"
                        className="h-14 bg-slate-50 border-slate-100 rounded-2xl pl-12 pr-6 font-bold text-slate-700 focus:ring-emerald-500/20"
                      />
                    </div>
                 </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 pt-6">
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="flex-1 h-16 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={loading || !selectedFazenda || !ucs}
                className="flex-[1.5] h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                {loading ? <Calculator className="w-4 h-4 animate-spin" /> : <Leaf className="w-4 h-4" />}
                Gerar Safra (Geração)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
