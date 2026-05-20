"use client"

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLegacyData } from "@/hooks/useLegacyData";
import { 
  Search, 
  RefreshCw, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Trash2,
  User,
  Calendar,
  MoreVertical,
  FileText
} from "lucide-react";

export default function CprVerdePage() {
  const [selectedTab, setSelectedTab] = useState("REVOKED");
  const [nameOrIsin, setNameOrIsin] = useState("");
  const [userName, setUserName] = useState("");
  const [endorsedName, setEndorsedName] = useState("");
  const [emissionDate, setEmissionDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  const { 
    rows, 
    pagination, 
    loading, 
    error, 
    handlePageChange, 
    refresh,
    extra // Raw API result to access statusCounts
  } = useLegacyData({
    domain: "cpr-verde",
    params: {
      status: selectedTab,
      nameOrIsin,
      userName,
      endorsedName,
      emissionDate,
      expirationDate,
    },
    pageSize: 50,
  });

  const cprs = rows as any[];
  const statusCounts = (extra as any)?.statusCounts || {
    PENDING_APPROVAL: 0,
    PENDING_PAYMENT: 0,
    PAID: 0,
    PRE_PROCESSED: 0,
    PROCESSED: 0,
    EXECUTED: 0,
    REVOKED: 0,
    DENIED: 0,
    FAILED: 0,
  };

  const handleClearFilters = () => {
    setNameOrIsin("");
    setUserName("");
    setEndorsedName("");
    setEmissionDate("");
    setExpirationDate("");
  };

  // Helper to format dates to Brazilian format DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const datePart = dateStr.split(" ")[0];
      const parts = datePart.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return datePart;
    } catch {
      return dateStr;
    }
  };

  // Helper to format currency
  const formatCurrency = (val: string | number) => {
    const numeric = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(numeric)) return "R$ 0,00";
    return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Status mapping to legacy tabs
  const tabs = [
    { label: "Pend. de Aprovação", key: "PENDING_APPROVAL", count: statusCounts.PENDING_APPROVAL || 0 },
    { label: "Pend. de Pagamento", key: "PENDING_PAYMENT", count: statusCounts.PENDING_PAYMENT || 0 },
    { label: "Pago", key: "PAID", count: statusCounts.PAID || 0 },
    { label: "Pré-processados", key: "PRE_PROCESSED", count: statusCounts.PRE_PROCESSED || 0 },
    { label: "Processados", key: "PROCESSED", count: statusCounts.PROCESSED || 0 },
    { label: "Executado", key: "EXECUTED", count: statusCounts.EXECUTED || 0 },
    { label: "Revogados", key: "REVOKED", count: statusCounts.REVOKED || 0 },
    { label: "Negados", key: "DENIED", count: statusCounts.DENIED || 0 },
    { label: "Falha", key: "FAILED", count: statusCounts.FAILED || 0 },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Block */}
        <header className="px-10 py-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-600" />
              CPR Verde — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_cpr.csv</code> · {pagination.total.toLocaleString('pt-BR')} registros
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Procure pelo nome ou ISIN</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Procure pelo nome ou ISIN"
                  value={nameOrIsin}
                  onChange={e => setNameOrIsin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Procure pelo nome do usuário</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Procure pelo nome do usuário"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Procure pelo nome do endossado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Procure pelo nome do endossado"
                  value={endorsedName}
                  onChange={e => setEndorsedName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-64 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data de emissão</label>
              <input
                type="date"
                value={emissionDate}
                onChange={e => setEmissionDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              />
            </div>

            <div className="w-full md:w-64 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data de expiração</label>
              <input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              />
            </div>

            <button
              onClick={handleClearFilters}
              className="h-[42px] px-6 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 text-slate-600 transition-colors shrink-0"
            >
              <Trash2 size={14} />
              Limpar
            </button>
          </div>
        </div>

        {/* Tabs section */}
        <div className="px-10 py-4 bg-white border-b border-slate-150 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4">
          <div className="flex border-b border-slate-200 overflow-x-auto w-full">
            {tabs.map((tab) => {
              const isActive = selectedTab === tab.key;
              let activeColorClasses = "border-indigo-600 text-indigo-600";
              let badgeColorClasses = "bg-indigo-100 text-indigo-700";
              
              if (tab.key === "REVOKED") {
                activeColorClasses = isActive ? "border-emerald-600 text-emerald-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800";
                badgeColorClasses = isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500";
              } else {
                activeColorClasses = isActive ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800";
              }

              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key)}
                  className={`py-3 px-5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeColorClasses}`}
                >
                  {tab.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${badgeColorClasses}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
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
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">ID</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">ISIN</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Usuário</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Endossado</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-right">Valor Nominal</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-right">Qnt. UCS</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-right">Taxa</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Emissão</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Expiração</th>
                    <th className="py-5 px-6 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando CPRs...</span>
                      </td>
                    </tr>
                  ) : cprs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Nenhum registro encontrado nesta aba
                      </td>
                    </tr>
                  ) : (
                    cprs.map((t) => {
                      return (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-slate-700">
                          <td className="py-4 px-6 text-[13px] font-black text-indigo-600 hover:underline cursor-pointer">
                            #{t.id}
                          </td>
                          <td className="py-4 px-6 text-[12px] font-bold text-slate-800">
                            {t.isin}
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-450 shrink-0">
                                <User size={14} />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold text-slate-800 max-w-[140px] truncate" title={t.user_name}>
                                  {t.user_name}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">{t.user_document}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-450 shrink-0">
                                <User size={14} />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold text-slate-800 max-w-[145px] truncate" title={t.endorsed_name}>
                                  {t.endorsed_name}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">{t.endorsed_document}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-[12px] font-bold text-slate-800 text-right">
                            {formatCurrency(t.nominal_value)}
                          </td>
                          <td className="py-4 px-6 text-[12px] text-slate-800 text-right">
                            <span className="font-extrabold">{parseFloat(t.ucs_amount || "0").toLocaleString("pt-BR")}</span> <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
                          </td>
                          <td className="py-4 px-6 text-[12px] text-slate-800 text-right">
                            {formatCurrency(t.fee)}
                          </td>
                          <td className="py-4 px-6 text-[11px] font-semibold text-slate-600">
                            {formatDate(t.emission_date)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded w-fit">
                              <Calendar size={11} />
                              {formatDate(t.expiration_date)}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                              <MoreVertical size={16} />
                            </button>
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
                  Mostrando {cprs.length} de {pagination.total} registros
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
