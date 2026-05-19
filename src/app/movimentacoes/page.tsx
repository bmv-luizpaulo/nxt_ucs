"use client"

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLegacyData } from "@/hooks/useLegacyData";
import { 
  History, 
  Search, 
  RefreshCw, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  Wallet,
  Download,
  Trash2,
  Coins,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

export default function MovimentacoesPage() {
  // Filter States
  const [dateInicio, setDateInicio] = useState("");
  const [dateFim, setDateFim] = useState("");
  const [userOrigem, setUserOrigem] = useState("");
  const [userDestino, setUserDestino] = useState("");
  const [distId, setDistId] = useState("");
  const [platOrigem, setPlatOrigem] = useState("");
  const [platDestino, setPlatDestino] = useState("");
  const [saldoOrigem, setSaldoOrigem] = useState("");
  const [saldoDestino, setSaldoDestino] = useState("");

  const { 
    rows, 
    pagination, 
    loading, 
    error, 
    handlePageChange, 
    refresh 
  } = useLegacyData({
    domain: "movimentacoes",
    params: {
      dateInicio,
      dateFim,
      userOrigem,
      userDestino,
      distId,
      platOrigem,
      platDestino,
      saldoOrigem,
      saldoDestino,
    },
    pageSize: 50,
  });

  const transactions = rows as any[];

  const handleClearFilters = () => {
    setDateInicio("");
    setDateFim("");
    setUserOrigem("");
    setUserDestino("");
    setDistId("");
    setPlatOrigem("");
    setPlatDestino("");
    setSaldoOrigem("");
    setSaldoDestino("");
  };

  const translateBalance = (code: string) => {
    switch (code) {
      case 'A': return 'DIS';
      case 'B': return 'RES';
      case 'R': return 'APO';
      default: return code || '—';
    }
  };

  // Helper to format timestamps to Brazilian format DD/MM/YYYY HH:MM:SS on two lines
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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Block (Light Mode) */}
        <header className="px-10 py-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-wider text-slate-900 uppercase">Movimentações</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
              <span>Home</span>
              <span>&gt;</span>
              <span>Estoque</span>
              <span>&gt;</span>
              <span className="text-indigo-600">Extratos</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-colors shadow-lg shadow-indigo-100">
              <BookOpen size={14} />
              Livro de Ofertas
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-colors shadow-lg shadow-indigo-100">
              <Wallet size={14} />
              Saldos
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-colors shadow-lg shadow-indigo-100">
              <Download size={14} />
              Baixar Movimentações
            </button>
            <button 
              onClick={refresh}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Filters Panel (Light Mode) */}
        <div className="px-10 pt-8 pb-6 bg-white border-b border-slate-200/80">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data início</label>
              <input
                type="date"
                value={dateInicio}
                onChange={e => setDateInicio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data fim</label>
              <input
                type="date"
                value={dateFim}
                onChange={e => setDateFim(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Usuário origem</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Usuário origem"
                  value={userOrigem}
                  onChange={e => setUserOrigem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Usuário destino</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Usuário destino"
                  value={userDestino}
                  onChange={e => setUserDestino(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">ID da Distribuição</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID da Distribuição"
                  value={distId}
                  onChange={e => setDistId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plataforma de origem</label>
              <select
                value={platOrigem}
                onChange={e => setPlatOrigem(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              >
                <option value="">Selecione...</option>
                <option value="MATEUS">Plataforma Mateus</option>
                <option value="CUSTODIA">Plataforma Custodia</option>
                <option value="TRADING">Plataforma de Trading</option>
                <option value="INVESTMENT">Plataforma de Investimento</option>
                <option value="CPR_VERDE">Plataforma CPR Verde</option>
                <option value="MUNDI">Plataforma Mundi</option>
                <option value="GOV">Plataforma Governo</option>
                <option value="MOV">Plataforma de Movimentação</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plataforma de destino</label>
              <select
                value={platDestino}
                onChange={e => setPlatDestino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              >
                <option value="">Selecione...</option>
                <option value="MATEUS">Plataforma Mateus</option>
                <option value="CUSTODIA">Plataforma Custodia</option>
                <option value="TRADING">Plataforma de Trading</option>
                <option value="INVESTMENT">Plataforma de Investimento</option>
                <option value="CPR_VERDE">Plataforma CPR Verde</option>
                <option value="MUNDI">Plataforma Mundi</option>
                <option value="GOV">Plataforma Governo</option>
                <option value="MOV">Plataforma de Movimentação</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Saldo Origem</label>
              <select
                value={saldoOrigem}
                onChange={e => setSaldoOrigem(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              >
                <option value="">Selecione...</option>
                <option value="A">DIS - Disponível</option>
                <option value="B">RES - Reservado</option>
                <option value="R">APO - Aposentado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Saldo Destino</label>
              <select
                value={saldoDestino}
                onChange={e => setSaldoDestino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              >
                <option value="">Selecione...</option>
                <option value="A">DIS - Disponível</option>
                <option value="B">RES - Reservado</option>
                <option value="R">APO - Aposentado</option>
              </select>
            </div>

            <div>
              <button
                onClick={handleClearFilters}
                className="w-full h-[46px] bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 text-slate-600 transition-colors"
              >
                <Trash2 size={14} />
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Content Table Block (Light Mode) */}
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
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Tipo</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">ID</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Dist.</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Data Inicio</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Data Fim</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Origem</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Usuário Origem</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Destino</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Usuário Destino</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Saldos</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando transações legadas...</span>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Nenhuma movimentação encontrada
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => {
                      const dateIni = formatDateTime(t.created_on);
                      const dateEnd = formatDateTime(t.finished_on);
                      
                      // Check for specific type representation
                      const isGovernment = t.origin_platform === "GOV" || t.recipient_platform === "GOV";

                      return (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-slate-700">
                          <td className="py-4 px-6">
                            {isGovernment ? (
                              <ShieldCheck className="w-5 h-5 text-amber-500" />
                            ) : (
                              <Coins className="w-5 h-5 text-amber-500" />
                            )}
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-indigo-600 hover:underline cursor-pointer">
                            {t.id}
                          </td>
                          <td className="py-4 px-6">
                            {t.distribution_id ? (
                              <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-black px-2 py-1 rounded">
                                {t.distribution_id}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-700 leading-normal">
                            <div>{dateIni.date}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{dateIni.time}</div>
                          </td>
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-700 leading-normal">
                            <div>{dateEnd.date}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{dateEnd.time}</div>
                          </td>
                          <td className="py-4 px-6 text-[12px] font-black text-slate-800">
                            {t.origin_platform}
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <span className="inline-block bg-amber-50 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 uppercase border border-amber-100">
                              {t.issuer_role}
                            </span>
                            <div className="text-[12px] font-bold text-slate-800 max-w-[140px] truncate" title={t.issuer_name}>
                              {t.issuer_name}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-[12px] font-black text-slate-800">
                            {t.recipient_platform}
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <span className="inline-block bg-amber-50 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 uppercase border border-amber-100">
                              {t.recipient_role}
                            </span>
                            <div className="text-[12px] font-bold text-slate-800 max-w-[140px] truncate" title={t.recipient_name}>
                              {t.recipient_name}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-slate-700">{translateBalance(t.origin_balance)}</span>
                              <div className="w-4 h-4 rounded-full border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                                <ArrowRight size={10} strokeWidth={3} />
                              </div>
                              <span className="font-black text-xs text-slate-700">{translateBalance(t.target_balance)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-slate-900 text-right">
                            {parseFloat(t.amount || "0").toLocaleString("pt-BR")} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
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
                  Mostrando {transactions.length} de {pagination.total} registros
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
