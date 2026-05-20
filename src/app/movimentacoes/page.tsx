"use client"

import { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLegacyData } from "@/hooks/useLegacyData";
import { useSearchParams } from "next/navigation";
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

function MovimentacoesContent() {
  const searchParams = useSearchParams();
  const initialDistId = searchParams?.get("distId") || "";

  // Tab State
  const [activeTab, setActiveTab] = useState<"movimentacoes" | "saldos">("movimentacoes");

  // Movimentacoes Filter States
  const [dateInicio, setDateInicio] = useState("");
  const [dateFim, setDateFim] = useState("");
  const [userOrigem, setUserOrigem] = useState("");
  const [userDestino, setUserDestino] = useState("");
  const [distId, setDistId] = useState(initialDistId);
  const [platOrigem, setPlatOrigem] = useState("");
  const [platDestino, setPlatDestino] = useState("");
  const [saldoOrigem, setSaldoOrigem] = useState("");
  const [saldoDestino, setSaldoDestino] = useState("");

  // Sync distId state when URL query parameter changes
  useEffect(() => {
    setDistId(initialDistId);
  }, [initialDistId]);

  // Saldos Filter States
  const [balancePlatform, setBalancePlatform] = useState("");

  const { 
    rows, 
    pagination, 
    loading, 
    error, 
    handlePageChange, 
    refresh,
    handleSearch,
    search
  } = useLegacyData({
    domain: activeTab,
    params: activeTab === "movimentacoes" 
      ? {
          dateInicio,
          dateFim,
          userOrigem,
          userDestino,
          distId,
          platOrigem,
          platDestino,
          saldoOrigem,
          saldoDestino,
        }
      : {
          platform: balancePlatform,
        },
    pageSize: 50,
  });

  const handleTabChange = (tab: "movimentacoes" | "saldos") => {
    setActiveTab(tab);
    handleSearch(""); // Reset search parameter
    handleClearFilters();
  };

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
    setBalancePlatform("");
    handleSearch("");
  };

  const translateBalance = (code: string) => {
    switch (code) {
      case 'A': return 'DIS';
      case 'B': return 'RES';
      case 'R': return 'APO';
      default: return code || '—';
    }
  };

  const formatDocument = (doc: string) => {
    if (!doc || doc === '—') return '—';
    let clean = doc.replace(/\D/g, '');
    if (clean.length > 0 && clean.length <= 11) {
      clean = clean.padStart(11, '0');
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length > 11 && clean.length <= 14) {
      clean = clean.padStart(14, '0');
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const formatUcs = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === '') return '0';
    const num = parseFloat(String(val).replace(',', '.') || '0');
    return isNaN(num) ? '0' : num.toLocaleString('pt-BR');
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

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'imei':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      case 'governo':
        return 'bg-blue-50 text-blue-700 border-blue-200/60';
      case 'cliente':
        return 'bg-orange-50 text-orange-700 border-orange-200/60';
      case 'produtor':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'parceiro':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      case 'distribuidor':
        return 'bg-rose-50 text-rose-700 border-rose-200/60';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200/60';
    }
  };

  const handleDownloadCSV = () => {
    if (!rows || rows.length === 0) return;
    let csvContent = "";
    if (activeTab === "movimentacoes") {
      const headers = ["ID", "Distribuicao", "Data Inicio", "Data Fim", "Plat. Origem", "Usuario Origem", "Documento Origem", "Plat. Destino", "Usuario Destino", "Documento Destino", "Quantidade"];
      csvContent += headers.join(",") + "\n";
      for (const t of (rows as any[])) {
        const row = [
          t.id,
          t.distribution_id || "",
          t.created_on,
          t.finished_on,
          t.origin_platform,
          t.issuer_name,
          t.issuer_document || "",
          t.recipient_platform,
          t.recipient_name,
          t.recipient_document || "",
          t.amount
        ];
        csvContent += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
      }
    } else {
      const headers = ["ID", "Data Atualizacao", "Plataforma", "Nome", "Documento", "Papel", "Disponivel", "Reservado", "Bloqueado", "Aposentado"];
      csvContent += headers.join(",") + "\n";
      for (const b of (rows as any[])) {
        const row = [
          b.id,
          b.updated_on,
          b.platform_alias,
          b.user_name,
          b.user_document,
          b.user_role,
          b.available_balance,
          b.reserved_balance,
          b.blocked_balance,
          b.retired_balance
        ];
        csvContent += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
      }
    }

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab === "movimentacoes" ? "movimentacoes" : "saldos"}_legado.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Block (Light Mode) */}
        <header className="px-10 py-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <History className="w-6 h-6 text-indigo-600" />
              {activeTab === "movimentacoes" ? "Movimentações" : "Saldos"} — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">
                {activeTab === "movimentacoes" ? "dbo_transaction.csv" : "dbo_consolidated_balance.csv"}
              </code>{" "}
              · {pagination.total.toLocaleString("pt-BR")}{" "}
              {activeTab === "movimentacoes" ? "movimentações" : "registros de saldos"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleTabChange("movimentacoes")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-lg transition-colors ${
                activeTab === "movimentacoes" 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              <History size={14} />
              Movimentações
            </button>
            <button 
              onClick={() => handleTabChange("saldos")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-lg transition-colors ${
                activeTab === "saldos" 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              <Wallet size={14} />
              Saldos
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-lg transition-colors border border-slate-200 opacity-60 cursor-not-allowed">
              <BookOpen size={14} />
              Livro de Ofertas
            </button>
            <button 
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-colors shadow-lg shadow-indigo-100"
            >
              <Download size={14} />
              {activeTab === "movimentacoes" ? "Baixar Movimentações" : "Baixar Saldos"}
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
          {activeTab === "movimentacoes" ? (
            <>
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
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Buscar Usuário</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Procure pelo nome ou documento..."
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plataforma</label>
                <select
                  value={balancePlatform}
                  onChange={e => setBalancePlatform(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                >
                  <option value="">Todas as plataformas</option>
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
          )}
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
                {activeTab === "movimentacoes" ? (
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
                ) : (
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">ID</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Data Atualização</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Plataforma</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Nome</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Documento</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right">Disponível</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right">Reservado</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right">Bloqueado</th>
                      <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right">Aposentado</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={activeTab === "movimentacoes" ? 11 : 9} className="py-16 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {activeTab === "movimentacoes" ? "Carregando transações legadas..." : "Carregando saldos legados..."}
                        </span>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "movimentacoes" ? 11 : 9} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        {activeTab === "movimentacoes" ? "Nenhuma movimentação encontrada" : "Nenhum saldo encontrado"}
                      </td>
                    </tr>
                  ) : activeTab === "movimentacoes" ? (
                    (rows as any[]).map((t) => {
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
                  ) : (
                    (rows as any[]).map((b) => {
                      const updatedDate = formatDateTime(b.updated_on);
                      return (
                        <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-slate-700">
                          <td className="py-4 px-6 text-[13px] font-black text-indigo-600">
                            {b.id}
                          </td>
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-700 leading-normal">
                            <div>{updatedDate.date}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{updatedDate.time}</div>
                          </td>
                          <td className="py-4 px-6 text-[12px] font-black text-slate-800">
                            {b.platform_alias}
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 uppercase border ${getRoleBadgeColor(b.user_role)}`}>
                              {b.user_role}
                            </span>
                            <div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate" title={b.user_name}>
                              {b.user_name}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-[11px] font-mono text-slate-600">
                            {formatDocument(b.user_document)}
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-slate-900 text-right">
                            {formatUcs(b.available_balance)} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-slate-500 text-right">
                            {formatUcs(b.reserved_balance)} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-slate-500 text-right">
                            {formatUcs(b.blocked_balance)} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-slate-500 text-right">
                            {formatUcs(b.retired_balance)} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
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
                  Mostrando {rows.length} de {pagination.total} registros
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

export default function MovimentacoesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-[#F8FAFC]" />}>
      <MovimentacoesContent />
    </Suspense>
  );
}
