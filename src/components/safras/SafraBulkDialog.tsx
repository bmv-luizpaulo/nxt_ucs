"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc, increment, arrayUnion, getDoc } from "firebase/firestore";
import { Loader2, Zap, ShieldCheck, AlertTriangle, Calculator, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Fazenda } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SafraBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFarms: Fazenda[];
  onSuccess: () => void;
}

export function SafraBulkDialog({ open, onOpenChange, selectedFarms, onSuccess }: SafraBulkDialogProps) {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [ucsBase, setUcsBase] = useState<"vegetacao" | "manual" | "cadastro">("cadastro");
  const [ucsManualValue, setUcsManualValue] = useState("0");

  const cleanDoc = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(cleanDoc);
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, cleanDoc(v)])
      );
    }
    return obj;
  };

  const handleGenerate = async () => {
    if (!firestore || selectedFarms.length === 0) return;
    setLoading(true);

    try {
      let successCount = 0;
      const CHUNK_SIZE = 100; // 4 writes per farm, so 100 farms = 400 writes (well within 500 limit)
      
      for (let i = 0; i < selectedFarms.length; i += CHUNK_SIZE) {
        const batch = writeBatch(firestore);
        const chunk = selectedFarms.slice(i, i + CHUNK_SIZE);

        for (const farm of chunk) {
          // Calcula UCS Total
          const ucsTotal = ucsBase === "vegetacao" 
            ? (farm.areaVegetacao || 0) 
            : ucsBase === "cadastro"
              ? (farm.ucs || 0)
              : parseFloat(ucsManualValue.replace(',', '.'));

          if (ucsTotal <= 0) continue;

          const PART_PCT = 33.3333333 / 100;
          const partitionValue = Number((ucsTotal * PART_PCT).toFixed(9));
          const produtorSaldo = partitionValue;
          const assocSaldo = partitionValue;
          // O último recebe a diferença para garantir que a soma seja exatamente 100%
          const imeiSaldo = Number((ucsTotal - produtorSaldo - assocSaldo).toFixed(9));

          const dataRegistro = new Date().toLocaleDateString('pt-BR');

          // 1. Registro Central de Safra (Auditoria Técnica)
          const safraRef = doc(collection(firestore, "safras_registros"));
          const safraData = {
            id: safraRef.id,
            safra: ano, // SafraGenerationDialog usa 'safra' em vez de 'ano'
            ano: ano,
            idf: farm.idf,
            propriedade: farm.nome, // SafraGenerationDialog usa 'propriedade'
            fazenda: farm.nome,
            nucleo: farm.nucleo,
            ucs: ucsTotal,
            originacao: ucsTotal, // SafraGenerationDialog usa 'originacao'
            ucsTotal: ucsTotal,
            dataRegistro: dataRegistro,
            createdAt: new Date().toISOString(),
            produtor: farm.proprietarios?.[0]?.nome || "Não Informado",
            nome: farm.proprietarios?.[0]?.nome || "Não Informado", // SafraGenerationDialog usa 'nome'
            documento: farm.proprietarios?.[0]?.documento || "", // SafraGenerationDialog usa 'documento'
            produtorDoc: farm.proprietarios?.[0]?.documento || "",
            produtorPct: 33.3333333,
            produtorSaldo: produtorSaldo,
            associacaoNome: farm.nucleo || "SEM NÚCLEO", // SafraGenerationDialog usa 'associacaoNome'
            associacaoCnpj: farm.nucleoCnpj || "",
            associacaoSaldo: assocSaldo,
            assoc: farm.nucleo || "SEM NÚCLEO",
            assocCnpj: farm.nucleoCnpj || "",
            assocPct: 33.3333333,
            assocSaldo: assocSaldo,
            imeiNome: "INSTITUTO MATA VIVA", 
            imeiCnpj: "00.000.000/0001-00", 
            imeiSaldo: imeiSaldo,
            imei: "INSTITUTO MATA VIVA", 
            imeiPct: 33.3333333,
            status: 'valido'
          };
          batch.set(safraRef, cleanDoc(safraData));

          // 2. Distribuição para Entidades (Produtores)
          const entities = [
            { nome: safraData.produtor, doc: safraData.produtorDoc, valor: produtorSaldo },
            { nome: safraData.assoc, doc: safraData.assocCnpj, valor: assocSaldo },
            { nome: safraData.imei, doc: safraData.imeiCnpj, valor: imeiSaldo }
          ].filter(e => e.doc && e.valor > 0);

          for (const ent of entities) {
            const entId = ent.doc.replace(/[^\d]/g, '');
            if (!entId) continue;
            const entRef = doc(firestore, "produtores", entId);

            const newTransaction = {
              id: `ORIG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              data: dataRegistro,
              dist: farm.nome,
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
              tabelaOriginacao: arrayUnion(newTransaction),
              updatedAt: new Date().toISOString(),
              safra: ano,
              nucleo: farm.nucleo || "SEM NÚCLEO"
            }, { merge: true });
          }
          successCount++;
        }
        await batch.commit();
      }

      toast({ 
        title: "Safra Gerada com Sucesso", 
        description: `${successCount} fazendas processadas e saldos particionados (33.33% cada).` 
      });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao gerar safra em lote." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="bg-[#0B0F1A] p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Gerar Safra em Lote</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 font-medium text-xs uppercase tracking-widest">
            {selectedFarms.length} propriedades selecionadas para processamento
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6">
          {/* ANO DA SAFRA */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Ano de Referência (Safra)
            </Label>
            <Input 
              value={ano} 
              onChange={e => setAno(e.target.value)}
              className="h-12 rounded-xl font-black text-lg bg-slate-50 border-slate-100"
              placeholder="Ex: 2024"
            />
          </div>

          {/* MODO DE CALCULOS */}
          <div className="space-y-3">
             <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
               <Calculator className="w-3.5 h-3.5" /> Definição de UCS (Solo)
             </Label>
             <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setUcsBase("cadastro")}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left",
                    ucsBase === "cadastro" 
                      ? "bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-100" 
                      : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <p className={cn("text-[11px] font-black uppercase", ucsBase === "cadastro" ? "text-emerald-700" : "text-slate-400")}>Cadastro</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-1">Usa o valor UCS da planilha original</p>
                </button>
                <button 
                  onClick={() => setUcsBase("vegetacao")}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left",
                    ucsBase === "vegetacao" 
                      ? "bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-100" 
                      : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <p className={cn("text-[11px] font-black uppercase", ucsBase === "vegetacao" ? "text-emerald-700" : "text-slate-400")}>Vegetação</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-1">Usa Area Veg (ha) como total</p>
                </button>
                <button 
                  onClick={() => setUcsBase("manual")}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left",
                    ucsBase === "manual" 
                      ? "bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-100" 
                      : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <p className={cn("text-[11px] font-black uppercase", ucsBase === "manual" ? "text-emerald-700" : "text-slate-400")}>Manual</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-1">Define um valor fixo</p>
                </button>
             </div>
          </div>

          {ucsBase === "manual" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">UCS por Fazenda</Label>
              <Input 
                value={ucsManualValue}
                onChange={e => setUcsManualValue(e.target.value)}
                className="h-12 rounded-xl font-black text-lg bg-emerald-50 border-emerald-100 text-emerald-700"
                placeholder="0.00"
              />
            </div>
          )}

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
              O particionamento de 33.33% (Produtor, Associação e IMEI) será aplicado automaticamente sobre o montante final.
            </p>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-400">
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={loading || selectedFarms.length === 0}
            className="flex-[2] h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-100 gap-2 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Confirmar Geração em Lote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
