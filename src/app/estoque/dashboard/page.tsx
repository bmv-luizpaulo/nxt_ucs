"use client"

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { 
  Boxes, 
  Zap, 
  ShieldAlert, 
  ArrowRightLeft, 
  Cpu, 
  RefreshCw, 
  Loader2,
  TrendingUp,
  FileText
} from "lucide-react";

interface Summary {
  totalInitial: number;
  totalAvailable: number;
  totalBlocked: number;
  totalTransactionsCount: number;
  totalTransfers: number;
  totalAdjustments: number;
}

interface HarvestStat {
  initial: number;
  available: number;
}

interface DashboardData {
  summary: Summary;
  harvestStats: Record<string, HarvestStat>;
}

export default function EstoqueDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/legado/domain?domain=estoque-dashboard");
      if (!res.ok) throw new Error("Erro ao buscar dados do dashboard de estoque");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-24 bg-[#080C11] px-10 flex items-center justify-between border-b border-white/5 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/4 h-full bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-white/5">
              <Boxes className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Painel de Estoque</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Consolidado Geral de UCS (Banco Legado)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <button 
              onClick={fetchData} 
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-10 space-y-8 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] gap-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando métricas de estoque...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
              <h3 className="font-bold text-sm">Erro ao carregar dados</h3>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Key Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Available Balance */}
                <div className="bg-indigo-600 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-indigo-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
                  <div className="space-y-1 relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Saldo de UCS Disponível</p>
                    <p className="text-4xl font-black tracking-tight">
                      {data.summary.totalAvailable.toLocaleString("pt-BR")} 
                      <span className="text-sm font-medium opacity-60 uppercase ml-1">ucs</span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs opacity-80">
                    <span>Total Originado: {data.summary.totalInitial.toLocaleString("pt-BR")} UCS</span>
                  </div>
                </div>

                {/* Blocked UCS */}
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16" />
                  <div className="space-y-1 relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Volume Bloqueado</p>
                    <p className="text-4xl font-black tracking-tight text-amber-500">
                      {data.summary.totalBlocked.toLocaleString("pt-BR")} 
                      <span className="text-sm font-medium opacity-60 uppercase ml-1">ucs</span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs opacity-80">
                    <span>Bloqueios Ativos no Banco Legado</span>
                  </div>
                </div>

                {/* Activity Counts */}
                <div className="bg-white rounded-[2rem] p-8 space-y-6 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de Transações (Movimentações)</p>
                    <p className="text-4xl font-black tracking-tight text-slate-900">
                      {data.summary.totalTransactionsCount.toLocaleString("pt-BR")} 
                      <span className="text-sm font-bold text-slate-400 uppercase ml-1">ações</span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Transferências</span>
                      <span className="font-bold text-slate-800">{data.summary.totalTransfers.toLocaleString("pt-BR")} UCS</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Ajustes</span>
                      <span className="font-bold text-slate-800">{data.summary.totalAdjustments.toLocaleString("pt-BR")} UCS</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Harvest breakdowns */}
              <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Saldos de Lotes por Safra</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(data.harvestStats)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([year, stats]) => (
                      <div key={year} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black px-2 py-1 rounded bg-indigo-50 text-indigo-700 uppercase">Safra {year}</span>
                            <span className="text-[10px] font-bold text-slate-400">Lote Legado</span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Disponível</span>
                              <span className="text-lg font-black text-indigo-600">{stats.available.toLocaleString("pt-BR")} UCS</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Total Inicial</span>
                              <span className="text-sm font-bold text-slate-700">{stats.initial.toLocaleString("pt-BR")} UCS</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">Percentual Restante</span>
                          <span className="text-[11px] font-black text-slate-800">
                            {stats.initial > 0 ? Math.round((stats.available / stats.initial) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
