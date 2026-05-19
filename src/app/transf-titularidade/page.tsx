"use client"

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLegacyData } from "@/hooks/useLegacyData";
import { 
  ArrowRightLeft, 
  Search, 
  RefreshCw, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  RefreshCcw,
  Trash2
} from "lucide-react";

export default function TransfTitularidadePage() {
  const [selectedTab, setSelectedTab] = useState("PROCESSED");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateInicio, setDateInicio] = useState("");
  const [dateFim, setDateFim] = useState("");

  const { 
    rows, 
    pagination, 
    loading, 
    error, 
    handlePageChange, 
    refresh,
    extra // Raw API result to access statusCounts
  } = useLegacyData({
    domain: "transf-titularidade",
    params: {
      status: selectedTab,
      search: searchQuery,
      dateInicio,
      dateFim,
    },
    pageSize: 50,
  });

  const transfers = rows as any[];
  const statusCounts = (extra as any)?.statusCounts || {
    PENDING: 0,
    PRE_PROCESSED: 0,
    PROCESSED: 0,
    FAILED: 0,
    DENIED: 0,
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateInicio("");
    setDateFim("");
  };

  // Helper to format timestamps to Brazilian format
  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return { date: "—", time: "" };
    try {
      const parts = dtStr.split(" ");
      const datePart = parts[0];
      const timePart = parts[1] ? parts[1].split(".")[0] : "";
      
      const dateSubparts = datePart.split("-");
      if (dateSubparts.length === 3) {
        return {
          date: `${dateSubparts[2]}/${dateSubparts[1]}/${dateSubparts[0]}`,
          time: timePart
        };
      }
      return { date: datePart, time: timePart };
    } catch {
      return { date: dtStr, time: "" };
    }
  };

  // Status mapping to legacy tabs
  const tabs = [
    { label: "Pend. de Aprovação", key: "PENDING", count: statusCounts.PENDING || 0 },
    { label: "Pré-processados", key: "PRE_PROCESSED", count: statusCounts.PRE_PROCESSED || 0 },
    { label: "Processados", key: "PROCESSED", count: statusCounts.PROCESSED || 0 },
    { label: "Falhas", key: "FAILED", count: statusCounts.FAILED || 0 },
    { label: "Negados", key: "DENIED", count: statusCounts.DENIED || 0 },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Block */}
        <header className="px-10 py-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-wider text-slate-900 uppercase">Gerenciar Transferência de Titularidade</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
              <span>Home</span>
              <span>&gt;</span>
              <span>Transferência de Titularidade</span>
              <span>&gt;</span>
              <span className="text-indigo-600">Gerenciar Transferência de Titularidade</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-colors shadow-lg shadow-indigo-100">
              <Plus size={14} />
              Novo
            </button>
            <button 
              onClick={refresh}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Filters Panel */}
        <div className="px-10 py-6 bg-white border-b border-slate-200/80 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Buscar por pedido ou responsável</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Busque pelo ID do pedido, nome do responsável do pedido..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="w-48 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data início</label>
              <input
                type="date"
                value={dateInicio}
                onChange={e => setDateInicio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              />
            </div>

            <div className="w-48 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data fim</label>
              <input
                type="date"
                value={dateFim}
                onChange={e => setDateFim(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              />
            </div>

            <button
              onClick={handleClearFilters}
              className="h-[42px] px-6 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 text-slate-600 transition-colors"
            >
              <Trash2 size={14} />
              Limpar
            </button>
          </div>
        </div>

        {/* Tabs and Sync section */}
        <div className="px-10 py-4 bg-white border-b border-slate-150 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4">
          <div className="flex border-b border-slate-200 overflow-x-auto w-full md:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`py-3 px-6 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  selectedTab === tab.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  selectedTab === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-colors shadow-lg shadow-indigo-100 self-end md:self-auto">
            <RefreshCcw size={14} />
            Sincronizar Nxt
          </button>
        </div>

        {/* Content Table Block */}
        <div className="flex-1 p-10 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-xs font-bold mb-6">
              Erro ao carregar dados: {error}
            </div>
          )}

          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                    <th className="py-5 px-6 w-12 text-center">
                      <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    </th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Pedido</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Data</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Solicitante</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Origem (Seller)</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Destino (Buyer)</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Plataforma</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-center">Ano Safra</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right">Quantidade</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Tipo</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Status</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Nxt</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando transferências...</span>
                      </td>
                    </tr>
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Nenhum registro encontrado nesta aba
                      </td>
                    </tr>
                  ) : (
                    transfers.map((t) => {
                      const dt = formatDateTime(t.created_date);

                      return (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-slate-700">
                          <td className="py-4 px-6 text-center">
                            <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-indigo-600 hover:underline cursor-pointer">
                            #{t.id}
                          </td>
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-700 leading-normal">
                            <div>{dt.date}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{dt.time}</div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div className="text-[12px] font-bold text-slate-800">{t.requester_name || "—"}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.requester_document || "—"}</div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <span className="inline-block bg-amber-50 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 uppercase border border-amber-100">
                              {t.seller_role}
                            </span>
                            <div className="text-[12px] font-bold text-slate-800 max-w-[140px] truncate" title={t.seller_name}>
                              {t.seller_name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{t.seller_document}</div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <span className="inline-block bg-amber-50 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 uppercase border border-amber-100">
                              {t.buyer_role}
                            </span>
                            <div className="text-[12px] font-bold text-slate-800 max-w-[140px] truncate" title={t.buyer_name}>
                              {t.buyer_name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{t.buyer_document}</div>
                          </td>
                          <td className="py-4 px-6 text-[12px] font-black text-slate-800">
                            {t.platform}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-700 font-bold text-center">
                            {t.year}
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-slate-900 text-right">
                            {parseFloat(t.ucs_transfer_amount || "0").toLocaleString("pt-BR")} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
                          </td>
                          <td className="py-4 px-6 text-[12px] text-slate-500 font-medium max-w-[150px] truncate" title={t.type_reason}>
                            {t.type_reason}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${
                              t.status === "PROCESSED" 
                                ? "bg-emerald-100 text-emerald-700" 
                                : t.status === "DENIED"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-slate-400 font-mono">
                            {t.nxt_id}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400">
                  Mostrando {transfers.length} de {pagination.total} registros
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 text-slate-600 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-700 flex items-center px-4 bg-white border border-slate-200 rounded-lg">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 text-slate-600 transition-colors"
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
