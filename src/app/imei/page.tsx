"use client"

import React, { useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Calculator, Download, 
  Wallet, RefreshCcw, TrendingUp,
  Receipt
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { EntidadeSaldo } from "@/lib/types";
import { imeiEngine } from "@/domain/calculos/imeiEngine";

// Componentes da Página
import { 
  IMEISummaryCard, 
  IMEIPartitionTable, 
  IMEITransactionTable 
} from "./components/IMEIPageComponents";

export default function IMEIPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // 1. Busca todos os registros de produtores para consolidar originado IMEI
  const auditQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "produtores"));
  }, [firestore]);
  
  const { data: allRecords, isLoading: isAuditLoading } = useCollection<EntidadeSaldo>(auditQuery);

  // 2. Busca Movimentações da IMEI (Consumo/Transferências)
  const txQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "movimentacoes_imei"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const { data: transactions, isLoading: isTxLoading } = useCollection<any>(txQuery);

  // 3. Processamento de Dados (Motor de Cálculo)
  const consolidated = useMemo(() => {
    if (!allRecords) return { 
      totalOriginado: 0, 
      partitionHistory: [], 
      consumoTotal: 0,
      transferenciaEntrada: 0,
      transferenciaSaida: 0,
      saldoFinal: 0
    };

    // Agrupar por Safra para mostrar o particionamento histórico
    const safrasMap = new Map<string, number>();
    allRecords.forEach(r => {
      if (r.safra) {
        safrasMap.set(r.safra, (safrasMap.get(r.safra) || 0) + (r.originacao || 0));
      }
    });

    const partitionHistory = Array.from(safrasMap.entries()).map(([safra, total]) => {
      const parts = imeiEngine.partitionSafra(total);
      return {
        safra,
        total,
        ...parts,
        timestamp: new Date().toISOString() // Placeholder para o histórico
      };
    }).sort((a, b) => b.safra.localeCompare(a.safra));

    // Totais de Movimentação
    const txs = transactions || [];
    const consumoTotal = txs.filter(t => t.tipo === 'consumo').reduce((acc, t) => acc + (t.valor || 0), 0);
    const transferenciaEntrada = txs.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + (t.valor || 0), 0);
    const transferenciaSaida = txs.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + (t.valor || 0), 0);
    
    // Total de Originação que pertence à IMEI (baseado no engine)
    const totalOriginadoIMEI = partitionHistory.reduce((acc, curr) => acc + curr.imei, 0);

    return {
      totalOriginado: totalOriginadoIMEI,
      partitionHistory,
      consumoTotal,
      transferenciaEntrada,
      transferenciaSaida,
      saldoFinal: imeiEngine.calculateFinalBalance(
        totalOriginadoIMEI,
        consumoTotal,
        transferenciaSaida,
        transferenciaEntrada
      )
    };
  }, [allRecords, transactions]);

  if (isUserLoading || isAuditLoading || isTxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C11]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-[10px] font-black text-indigo-500/50 uppercase tracking-[0.3em]">Consolidando Livro Razão IMEI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* HEADER CONTROLLER */}
        <header className="bg-[#080C11] p-10 shrink-0 relative overflow-hidden group border-b border-white/5">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-white/5">
                <Calculator className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <h1 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none">Controladoria IMEI</h1>
                <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-[0.2em]">Administração Geral do Projeto & Gestão de Resíduos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <Button variant="outline" className="h-11 px-6 rounded-2xl border-white/10 text-white text-[10px] font-black uppercase tracking-widest gap-2 bg-white/5 hover:bg-white/10 transition-all shadow-xl">
                  <Download className="w-4 h-4 text-indigo-400" /> Exportar Auditoria (JSON/XLSX)
               </Button>
               <Button className="h-11 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95">
                  <RefreshCcw className="w-4 h-4 mr-2" /> Forçar Recálculo
               </Button>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-10 space-y-10">
            
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
               <IMEISummaryCard 
                 label="Saldo Final IMEI" 
                 value={consolidated?.saldoFinal ?? 0} 
                 icon={Wallet} 
                 subtext="Volume em Custódia" 
               />
               <IMEISummaryCard 
                 label="Originado Total" 
                 value={consolidated?.totalOriginado ?? 0} 
                 icon={TrendingUp} 
                 subtext="Receita por Safra" 
               />
               <IMEISummaryCard 
                 label="Consumo Acumulado" 
                 value={consolidated?.consumoTotal ?? 0} 
                 icon={Receipt} 
                 subtext="Saídas de Sistema" 
                 trend="down"
               />
               <IMEISummaryCard 
                 label="Transf. Entradas" 
                 value={consolidated?.transferenciaEntrada ?? 0} 
                 icon={TrendingUp} 
                 subtext="Créditos Recebidos" 
                 trend="up"
               />
               <IMEISummaryCard 
                 label="Transf. Saídas" 
                 value={consolidated?.transferenciaSaida ?? 0} 
                 icon={TrendingUp} 
                 subtext="Créditos Enviados" 
                 trend="down"
               />
            </div>

            {/* PARTITION HISTORY */}
            <div className="space-y-4">
               <IMEIPartitionTable data={consolidated.partitionHistory} />
            </div>

            {/* TRANSACTION EXTRATO */}
            <div className="space-y-4">
               <IMEITransactionTable data={transactions || []} />
            </div>

          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
