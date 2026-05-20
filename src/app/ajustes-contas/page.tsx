"use client"

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useLegacyData } from "@/hooks/useLegacyData";
import { useRouter } from "next/navigation";
import { 
  ArrowRightLeft, 
  Search, 
  RefreshCw, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Trash2,
  User,
  Eye,
  GitBranch,
  MoreVertical,
  X,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

export default function AjustesContasPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("PROCESSED");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateInicio, setDateInicio] = useState("");
  const [dateFim, setDateFim] = useState("");
  const [viewingAdjustment, setViewingAdjustment] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { 
    rows, 
    pagination, 
    loading, 
    error, 
    handlePageChange, 
    refresh,
    extra // Raw API result to access statusCounts
  } = useLegacyData({
    domain: "ajustes-contas",
    params: {
      status: selectedTab,
      search: searchQuery,
      dateInicio,
      dateFim,
    },
    pageSize: 50,
  });

  const adjustments = rows as any[];
  const statusCounts = (extra as any)?.statusCounts || {
    PENDING_VALIDATION: 0,
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

  const getDocumentLabel = (doc?: string) => {
    if (!doc) return "Documento :";
    const clean = doc.replace(/\D/g, "");
    return clean.length <= 11 ? "Cpf :" : "Cnpj :";
  };

  const formatDocument = (doc: string) => {
    if (!doc || doc === '—') return '—';
    let clean = doc.replace(/\D/g, '');
    if (clean.length > 0 && clean.length <= 9) {
      clean = clean.padStart(11, '0');
    }
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

  // Status mapping to legacy tabs
  const tabs = [
    { label: "Pend. de Aprovação", key: "PENDING_VALIDATION", count: statusCounts.PENDING_VALIDATION || 0 },
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
              Ajuste entre Contas — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_account_adjustments_order.csv</code> · {pagination.total.toLocaleString('pt-BR')} registros
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

        {/* Tabs section */}
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
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Origem</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest">Destino</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right">Quantidade</th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-right w-20">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando ajustes...</span>
                      </td>
                    </tr>
                  ) : adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Nenhum registro encontrado nesta aba
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((t) => {
                      const dt = formatDateTime(t.created_date);

                      return (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-slate-700">
                          <td className="py-4 px-6 text-center">
                            <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          </td>
                          <td 
                            onClick={() => setViewingAdjustment(t)}
                            className="py-4 px-6 text-[13px] font-black text-indigo-600 hover:underline cursor-pointer"
                          >
                            #{t.id}
                          </td>
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-700 leading-normal">
                            <div>{dt.date}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{dt.time}</div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <User size={12} />
                              </div>
                              <span className="text-[12px] font-bold text-slate-800">{t.requester_name || "—"}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div className="flex items-start gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mt-0.5 shrink-0">
                                <User size={12} />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate" title={t.sender_name}>
                                  {t.sender_name}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1 items-center">
                                  <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    {t.sender_platform}
                                  </span>
                                  <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    {t.sender_role}
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-1">{formatDocument(t.sender_document)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div className="flex items-start gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mt-0.5 shrink-0">
                                <User size={12} />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate" title={t.receiver_name}>
                                  {t.receiver_name}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1 items-center">
                                  <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    {t.receiver_platform}
                                  </span>
                                  <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    {t.receiver_role}
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-1">{formatDocument(t.receiver_document)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-[13px] font-black text-slate-900 text-right">
                            {parseFloat(t.ucs_transfer_amount || "0").toLocaleString("pt-BR")} <span className="text-[9px] text-slate-400 font-bold uppercase ml-0.5">ucs</span>
                          </td>
                          <td className="py-4 px-6 text-right relative">
                            <div className="flex items-center justify-end gap-2">
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === t.id ? null : t.id);
                                  }} 
                                  className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 bg-white"
                                >
                                  <MoreVertical size={13} />
                                </button>
                                {openMenuId === t.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                    <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1.5 z-20 text-left font-semibold text-xs text-slate-700">
                                      <button 
                                        onClick={() => { 
                                          setViewingAdjustment(t); 
                                          setOpenMenuId(null); 
                                        }} 
                                        className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                      >
                                        <Eye size={13} className="text-slate-400" /> Visualizar
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (t.distribution_id) {
                                            router.push(`/movimentacoes?distId=${t.distribution_id}`);
                                          } else {
                                            alert('Nenhuma movimentação (DIST) registrada para este ajuste.');
                                          }
                                          setOpenMenuId(null);
                                        }} 
                                        className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                      >
                                        <GitBranch size={13} className="text-indigo-500" /> Visualizar movimentações
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
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
                  Mostrando {adjustments.length} de {pagination.total} registros
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
      {viewingAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Detalhes do Pedido de Ajustes Entre Contas
              </h2>
              <button 
                onClick={() => setViewingAdjustment(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-10 grid grid-cols-1 md:grid-cols-12 gap-10">
              {/* Left Column: Stepper/Timeline */}
              <div className="md:col-span-5 flex flex-col pt-4">
                <div className="relative pl-10 border-l-2 border-indigo-100 space-y-12 ml-4">
                  {/* Step 1: Aguardando validação */}
                  <div className="relative">
                    <div className="absolute -left-[51px] top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm bg-indigo-600">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Aguardando validação</h4>
                      <p className="text-xs text-slate-500 font-medium">Ajuste aguardando validação</p>
                    </div>
                  </div>

                  {/* Step 2: Pré-processado */}
                  <div className="relative">
                    <div className={`absolute -left-[51px] top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${
                      (viewingAdjustment.status === 'PRE_PROCESSED' || viewingAdjustment.status === 'PROCESSED') 
                        ? "bg-indigo-600" 
                        : "bg-white border-2 border-indigo-200"
                    }`}>
                      {(viewingAdjustment.status === 'PRE_PROCESSED' || viewingAdjustment.status === 'PROCESSED') && (
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Pré-processado</h4>
                      <p className="text-xs text-slate-500 font-medium">Ajuste pré-processado</p>
                    </div>
                  </div>

                  {/* Step 3: Processado / Finalizado */}
                  <div className="relative">
                    <div className={`absolute -left-[51px] top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${
                      viewingAdjustment.status === 'PROCESSED' 
                        ? "bg-indigo-600" 
                        : (viewingAdjustment.status === 'DENIED' || viewingAdjustment.status === 'FAILED')
                        ? "bg-rose-500"
                        : "bg-white border-2 border-indigo-200"
                    }`}>
                      {viewingAdjustment.status === 'PROCESSED' && (
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      )}
                      {(viewingAdjustment.status === 'DENIED' || viewingAdjustment.status === 'FAILED') && (
                        <X className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        {viewingAdjustment.status === 'DENIED' 
                          ? 'Negado' 
                          : viewingAdjustment.status === 'FAILED' 
                          ? 'Falha' 
                          : 'Processado'}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {viewingAdjustment.status === 'DENIED' 
                          ? 'Ajuste negado' 
                          : viewingAdjustment.status === 'FAILED' 
                          ? 'Falha no processamento' 
                          : 'Ajuste processado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Information Cards */}
              <div className="md:col-span-7 space-y-6">
                
                {/* INFORMAÇÕES DO PEDIDO */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-[1.5rem] p-6 space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-indigo-600">
                    <FileText className="w-4 h-4" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Informações do Pedido</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Pedido:</span>
                      <span className="font-black text-slate-800">#{viewingAdjustment.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Data:</span>
                      <span className="font-bold text-slate-700">
                        {formatDateTime(viewingAdjustment.created_date).date} <span className="text-slate-400 font-normal text-[10px]">{formatDateTime(viewingAdjustment.created_date).time}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Quantidade:</span>
                      <span className="font-black text-slate-950">{parseFloat(viewingAdjustment.ucs_transfer_amount || "0").toLocaleString("pt-BR")} UCS</span>
                    </div>
                    {viewingAdjustment.type_reason && viewingAdjustment.type_reason !== '—' && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">Motivo / Tipo:</span>
                        <span className="font-bold text-slate-700">{viewingAdjustment.type_reason}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold block mb-0.5">Observações:</span>
                      <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-slate-100/50 p-3 rounded-xl border border-slate-200/40 text-[11px] break-words">
                        {viewingAdjustment.observations}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ORIGEM */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-[1.5rem] p-6 space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-indigo-600">
                    <ArrowUpCircle className="w-4 h-4" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Origem</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold block mb-0.5">Nome:</span>
                      <span className="font-black text-slate-800 uppercase leading-tight block">{viewingAdjustment.sender_name}</span>
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-1">
                        {viewingAdjustment.sender_role}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">{getDocumentLabel(viewingAdjustment.sender_document)}</span>
                      <span className="font-mono text-slate-700 font-bold">{formatDocument(viewingAdjustment.sender_document)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Plataforma:</span>
                      <span className="font-bold text-slate-700">{viewingAdjustment.sender_platform}</span>
                    </div>
                  </div>
                </div>

                {/* DESTINO */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-[1.5rem] p-6 space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-indigo-600">
                    <ArrowDownCircle className="w-4 h-4" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Destino</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold block mb-0.5">Nome:</span>
                      <span className="font-black text-slate-800 uppercase leading-tight block">{viewingAdjustment.receiver_name}</span>
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-1">
                        {viewingAdjustment.receiver_role}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">{getDocumentLabel(viewingAdjustment.receiver_document)}</span>
                      <span className="font-mono text-slate-700 font-bold">{formatDocument(viewingAdjustment.receiver_document)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Plataforma:</span>
                      <span className="font-bold text-slate-700">{viewingAdjustment.receiver_platform}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
