"use client"

import { useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { EntidadeSaldo } from "@/lib/types";
import { Loader2, Plus, Calendar, ArrowRight, Leaf, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AddSafraDialog } from "@/components/entities/AddSafraDialog";
import { SafraGenerationDialog } from "@/components/safras/SafraGenerationDialog";
import { SafraBulkDialog } from "@/components/safras/SafraBulkDialog";
import { useState, useEffect } from "react";
interface SafraMetadata {
  id: string;
  year: string;
  status: string;
  totalProdutores?: number;
  totalUCS?: number;
}

export default function SafrasPage() {
  const [isAddSafraOpen, setIsAddSafraOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // Busca a coleção oficial de safras (mais performático que varrer todos os produtores)
  const safrasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "safras"), orderBy("year", "desc"));
  }, [firestore, user]);

  const { data: safrasDb, isLoading } = useCollection<SafraMetadata>(safrasQuery);

  // Busca rápida para detecção de safras sem documento (retrocompatibilidade)
  const allProdutoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"));
  }, [firestore, user]);

  const { data: allProdutores } = useCollection<EntidadeSaldo>(allProdutoresQuery);
  
  const fazendasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "fazendas"));
  }, [firestore, user]);
  const { data: allFazendas } = useCollection<any>(fazendasQuery);

  const safras = useMemo(() => {
    const listFromDb = safrasDb || [];
    const listFromProdutores = Array.from(new Set((allProdutores || []).map(p => p.safra).filter(Boolean)));

    // Mesclar as duas fontes para não perder dados legados
    const combinedYears = Array.from(new Set([...listFromDb.map(s => s.year), ...listFromProdutores])).sort((a, b) => String(b).localeCompare(String(a)));

    return combinedYears.map(year => {
      const dbEntry = listFromDb.find(s => s.year === year);
      const producersOfYear = (allProdutores || []).filter(p => p.safra === year);
      
      return {
        year,
        count: producersOfYear.length || dbEntry?.totalProdutores || 0,
        totalUCS: producersOfYear.reduce((sum, p) => sum + (p.saldoFinalAtual || 0), 0) || dbEntry?.totalUCS || 0,
        status: dbEntry?.status || 'ativo'
      };
    });
  }, [safrasDb, allProdutores]);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
             </div>
             <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">Portal de Safras</h1>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsGenerateOpen(true)}
              variant="outline"
              className="h-12 px-6 rounded-full border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest shadow-sm transition-all hover:bg-primary/5 active:scale-95"
            >
              <Leaf className="w-4 h-4 mr-2" /> Geração Manual
            </Button>
            <Button 
              onClick={() => setIsBulkOpen(true)}
              variant="outline"
              className="h-12 px-6 rounded-full border-emerald-500/20 text-emerald-600 font-black uppercase text-[10px] tracking-widest shadow-sm transition-all hover:bg-emerald-50 active:scale-95"
            >
              <Layers className="w-4 h-4 mr-2" /> Geração em Lote
            </Button>
            <Button 
              onClick={() => setIsAddSafraOpen(true)}
              className="h-12 px-6 rounded-full bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> Nova Safra
            </Button>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {safras.map((safra) => (
                <Link key={safra.year} href={`/safras/${safra.year}`}>
                  <div className="group bg-white rounded-[2.5rem] p-1 border border-slate-100 shadow-sm transition-all hover:shadow-2xl hover:shadow-emerald-100 hover:-translate-y-2 cursor-pointer">
                    <div className="bg-[#0B0F1A] rounded-[2.25rem] p-10 text-white relative overflow-hidden h-full flex flex-col justify-between min-h-[300px]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/20 transition-all"></div>
                      
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-primary/50 transition-all">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter mb-2">SAFRA {safra.year}</h2>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ativo / Consolidado</span>
                        </div>
                      </div>

                      <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Produtores</p>
                            <p className="text-xl font-black">{safra.count}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Volume Total</p>
                            <p className="text-xl font-black text-primary">{Math.floor(safra.totalUCS).toLocaleString('pt-BR')} <span className="text-[10px] uppercase font-bold text-slate-500">UCS</span></p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[9px] font-black text-slate-400">Ver detalhes técnicos</span>
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform duration-500">
                             <ArrowRight className="w-4 h-4 text-[#0B0F1A]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {/* Card de Adição */}
              <div 
                onClick={() => setIsAddSafraOpen(true)}
                className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center gap-4 text-center group cursor-pointer hover:border-primary/50 hover:bg-emerald-50/30 transition-all min-h-[300px]"
              >
                <div className="w-16 h-16 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                  <Plus className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest mb-1">Cadastrar Nova SAFRA</h3>
                  <p className="text-[11px] font-bold text-slate-400 px-4">Inicie o registro de originação de um novo ciclo produtivo.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <AddSafraDialog open={isAddSafraOpen} onOpenChange={setIsAddSafraOpen} />
      <SafraGenerationDialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen} />
      <SafraBulkDialog 
        open={isBulkOpen} 
        onOpenChange={setIsBulkOpen} 
        selectedFarms={allFazendas || []} 
        onSuccess={() => setIsBulkOpen(false)} 
      />
    </div>
  );
}
