"use client"

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, ChevronLeft, Building2, 
  Users2, Database, ShieldAlert,
  Printer, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/layout/Sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Hooks e Componentes Locais
import { useNucleoLogic } from "./hooks/useNucleoLogic";
import { 
  GovernanceHeader, RegionalStatCard, FarmRow 
} from "./components/NucleoPageComponents";

export default function NucleoDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { rows, stats, isLoading, nucleoName } = useNucleoLogic(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C11]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.3em]">Consolidando Região...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <GovernanceHeader name={nucleoName} cnpj={stats.associationCnpj} />

        {/* TOOLBAR */}
        <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
           <div className="flex items-center gap-2">
              <Button onClick={() => router.push('/nucleos')} variant="ghost" className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 tracking-widest gap-2">
                 <ChevronLeft className="w-4 h-4" /> Voltar para Núcleos
              </Button>
           </div>
           
           <div className="flex items-center gap-3">
              <Button 
                onClick={async () => {
                  if (!stats.associationCnpj) return;
                  const { writeBatch, doc } = await import('firebase/firestore');
                  const { useFirestore } = await import('@/firebase');
                  // Nota: Precisamos do firestore bruto aqui para o batch
                  const firestoreRef = (window as any).firestore; 
                  if (!firestoreRef) return;

                  const batch = writeBatch(firestoreRef);
                  const assocRef = doc(firestoreRef, "produtores", `ASSOC_${stats.associationCnpj.replace(/\D/g, '')}`);
                  
                  batch.update(assocRef, {
                    saldoFinalAtual: stats.calculatedPartitioned,
                    updatedAt: new Date().toISOString()
                  });

                  await batch.commit();
                  alert(`Governança Sincronizada! Saldo da Associação atualizado para ${stats.calculatedPartitioned.toLocaleString('pt-BR')} UCS`);
                }}
                variant="outline" 
                className="h-9 rounded-lg border-dashed text-[9px] font-black uppercase tracking-widest gap-2 active:scale-95 transition-all"
              >
                 <RefreshCw className="w-3 h-3" /> Recalcular Governança
              </Button>
              <Button className="h-9 px-6 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest shadow-xl gap-2 hover:opacity-90">
                 <Printer className="w-3 h-3 text-emerald-400" /> Exportar Consolidado
              </Button>
           </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-10 space-y-10">
            
            {/* STATS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RegionalStatCard 
                  label="Carteira PJ Associação" 
                  value={stats.totalSaldoEntidade.toLocaleString('pt-BR')} 
                  unit={stats.totalSaldoEntidade !== stats.calculatedPartitioned ? "SALDO DIVERGENTE" : "UCS Totais Sincronizados"} 
                  color={stats.totalSaldoEntidade !== stats.calculatedPartitioned ? "slate" : "emerald"} 
                  icon={Building2} 
                />
                <RegionalStatCard label="Consolidação Fazendas" value={stats.totalOrig.toLocaleString('pt-BR')} unit="Volume UCS Total" color="indigo" icon={Database} />
                <RegionalStatCard label="Unidades de Produção" value={stats.totalContas} unit="Fazendas no Núcleo" color="slate" icon={Users2} />
                <RegionalStatCard label="Pendências de Auditoria" value={stats.pendentes} unit="Aguardando Validação" color="slate" icon={ShieldAlert} />
            </div>

            {/* MAIN DATA TABLE */}
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <div className="space-y-1">
                     <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Consolidação de Fazendas & Safras</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distribuição técnica de originados por IDF</p>
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden border-b-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 h-14 border-slate-100">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-10">IDF / Fazenda</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Originação Total (UCS)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-emerald-600 text-right">Particionado (Assoc)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Safra</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status Auditoria</TableHead>
                        <TableHead className="text-right pr-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length > 0 ? (
                           rows.map((row) => (
                              <FarmRow key={row.id} item={row} />
                           ))
                        ) : (
                           <TableRow>
                              <TableCell colSpan={6} className="h-64 text-center">
                                 <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Nenhum registro vinculado a este núcleo</p>
                              </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                  </Table>
               </div>
            </div>

          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
