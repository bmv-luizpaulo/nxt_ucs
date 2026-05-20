"use client"

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLegacyData } from "@/hooks/useLegacyData";
import { 
  Boxes, 
  Search, 
  RefreshCw, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Database
} from "lucide-react";

export default function AbastecimentoPage() {
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
    domain: "abastecimento",
    pageSize: 50,
  });

  const batches = rows as Record<string, string>[];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Boxes className="w-6 h-6 text-indigo-600" />
              Abastecimento — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_ucs_batch.csv</code> · {pagination.total.toLocaleString('pt-BR')} lotes
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar por ID, ano, distribuição..."
                className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <button 
              onClick={refresh} 
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
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
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">ID Lote</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Ano Safra</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Saldo Inicial</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Saldo Disponível</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">ID Usuário</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Distribuição ID</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Transação ID</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Última Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando lotes...</span>
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-[13px] font-black text-indigo-600">#{b.id}</td>
                        <td className="py-4 px-6 text-[12px] font-bold text-slate-700">{b.harvest_year || "—"}</td>
                        <td className="py-4 px-6 text-[13px] font-black text-emerald-600">
                          {parseFloat(b.initial_amount || "0").toLocaleString("pt-BR")} <span className="text-[9px] text-slate-400 font-bold">UCS</span>
                        </td>
                        <td className="py-4 px-6 text-[13px] font-black text-slate-900">
                          {parseFloat(b.available_balance || "0").toLocaleString("pt-BR")} <span className="text-[9px] text-slate-400 font-bold">UCS</span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 font-mono">RU-{b.user_id}</td>
                        <td className="py-4 px-6">
                          {b.distribution_id ? (
                            <Link href={`/movimentacoes?distId=${b.distribution_id}`} className="inline-block bg-slate-900 hover:bg-indigo-600 hover:scale-105 transition-all text-white text-[9px] font-black px-2 py-1 rounded">
                              {b.distribution_id}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {b.transaction_id ? (
                            <span className="inline-block bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-1 rounded">
                              {b.transaction_id}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{b.updated_on || "—"}</td>
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
                  Mostrando {batches.length} de {pagination.total} registros
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
