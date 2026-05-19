"use client"

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLegacyData } from "@/hooks/useLegacyData";
import { 
  Settings, 
  Search, 
  RefreshCw, 
  Loader2, 
  ChevronLeft, 
  ChevronRight
} from "lucide-react";

export default function ConfigDistribuicaoPage() {
  const { 
    rows, 
    pagination, 
    loading, 
    error, 
    search, 
    handleSearch, 
    handlePageChange, 
    refresh 
  } = useLegacyData({
    domain: "config-distribuicao",
    pageSize: 50,
  });

  const configs = rows as Record<string, string>[];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-24 bg-[#080C11] px-10 flex items-center justify-between border-b border-white/5 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/4 h-full bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-white/5">
              <Settings className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Config. de Distribuição</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Configuração de Distribuição de UCS (dbo_distribution_configuration.csv)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar por descrição, tipo..."
                className="w-full pl-10 pr-4 h-11 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/50"
              />
            </div>
            <button 
              onClick={refresh} 
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Content Table */}
        <div className="flex-1 p-10 overflow-y-auto space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-xs font-semibold">
              Erro ao carregar dados: {error}
            </div>
          )}

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">ID Config</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando configurações...</span>
                      </td>
                    </tr>
                  ) : configs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    configs.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-[13px] font-black text-indigo-600">#{c.id}</td>
                        <td className="py-4 px-6 text-[12px] font-bold text-slate-800">{c.description || "—"}</td>
                        <td className="py-4 px-6">
                          <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                            {c.type || "—"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {c.status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                <span className="text-xs font-bold text-slate-400">
                  Mostrando {configs.length} de {pagination.total} registros
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-700 flex items-center px-3 bg-white border border-slate-200 rounded-lg">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
