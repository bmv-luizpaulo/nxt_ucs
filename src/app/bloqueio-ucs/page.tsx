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
  MapPin,
  MoreVertical,
  Lock,
  Eye,
  Info,
  Ban,
  X
} from "lucide-react";

export default function BloqueioUcsPage() {
  const [blockId, setBlockId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [perfil, setPerfil] = useState("");
  const [status, setStatus] = useState("");
  const [areaQuery, setAreaQuery] = useState("");

  // Action Menu and Modal states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState<any | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { 
    rows, 
    pagination, 
    loading, 
    error, 
    handlePageChange, 
    refresh 
  } = useLegacyData({
    domain: "bloqueio-ucs",
    params: {
      blockId,
      userQuery,
      perfil,
      status,
      areaQuery,
    },
    pageSize: 50,
  });

  const records = rows as any[];
  const visibleRecords = records.filter(r => !deletedIds.includes(r.id));

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleClearFilters = () => {
    setBlockId("");
    setUserQuery("");
    setPerfil("");
    setStatus("");
    setAreaQuery("");
  };

  // Helper to format timestamps to Brazilian format DD/MM/YYYY HH:MM
  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return "—";
    try {
      const parts = dtStr.split(" ");
      const datePart = parts[0];
      const timePart = parts[1] ? parts[1].split(".")[0].substring(0, 5) : "";
      
      const dateSubparts = datePart.split("-");
      if (dateSubparts.length === 3) {
        return `${dateSubparts[2]}/${dateSubparts[1]}/${dateSubparts[0]} ${timePart}`;
      }
      return `${datePart} ${timePart}`;
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Block */}
        <header className="px-10 py-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Lock className="w-6 h-6 text-indigo-600" />
              Bloqueio de UCS — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_blocked_ucs.csv</code> · {pagination.total.toLocaleString('pt-BR')} bloqueios
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

        {/* Filters Panel (Matching legacy inputs) */}
        <div className="px-10 py-6 bg-white border-b border-slate-200/80 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">ID do bloqueio</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID do bloqueio"
                  value={blockId}
                  onChange={e => setBlockId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filtrar por usuário</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por usuário"
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filtrar pelo perfil</label>
              <select
                value={perfil}
                onChange={e => setPerfil(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              >
                <option value="">Filtrar pelo perfil</option>
                <option value="IMEI">IMEI</option>
                <option value="Governo">Governo</option>
                <option value="Cliente">Cliente</option>
                <option value="Produtor">Produtor</option>
                <option value="Parceiro">Parceiro</option>
                <option value="Distribuidor">Distribuidor</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filtrar pelo status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
              >
                <option value="">Filtrar pelo status</option>
                <option value="FINISHED">Processado</option>
                <option value="PENDING">Pendente</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filtrar por área</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por área"
                  value={areaQuery}
                  onChange={e => setAreaQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <button
              onClick={handleClearFilters}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 text-slate-600 transition-colors"
            >
              <Trash2 size={14} />
              Limpar
            </button>
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
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Data Criação</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Usuário</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Área</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                    <th className="py-5 px-6 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando bloqueios...</span>
                      </td>
                    </tr>
                  ) : visibleRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Nenhum registro de bloqueio encontrado
                      </td>
                    </tr>
                  ) : (
                    visibleRecords.map((t) => {
                      return (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-slate-700">
                          <td className="py-4 px-6 text-[13px] font-black text-indigo-600 hover:underline cursor-pointer">
                            #{t.id}
                          </td>
                          <td className="py-4 px-6 text-[12px] font-semibold text-slate-750">
                            {formatDateTime(t.created_date)}
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <User size={16} />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold text-slate-800">{t.user_name}</div>
                                <div className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">{t.user_role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 leading-tight">
                            <div>
                              <div className="text-[12px] font-bold text-slate-800">{t.area_name}</div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-1">
                                <MapPin size={10} className="text-slate-400" />
                                {t.area_code}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {t.status === "FINISHED" ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                ✓ Processado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === t.id ? null : t.id);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            
                            {activeMenuId === t.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <div className="absolute right-6 top-11 w-32 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1 z-20 text-left overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                  <button
                                    onClick={() => {
                                      setSelectedBlock(t);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-start"
                                  >
                                    Visualizar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setConfirmDeleteBlock(t);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-start"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </>
                            )}
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
                  Mostrando {visibleRecords.length} de {pagination.total} registros
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

      {/* Details Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <h2 className="text-base font-black text-slate-800 tracking-tight">
                Detalhes do bloqueio #{selectedBlock.id}
              </h2>
              <button 
                onClick={() => setSelectedBlock(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Informações Gerais */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Info size={14} className="text-indigo-600" />
                  Informações Gerais
                </h3>
                <div className="grid grid-cols-3 gap-y-3.5 text-xs">
                  <span className="font-semibold text-slate-400 col-span-1">Nome:</span>
                  <span className="font-bold text-slate-800 col-span-2">{selectedBlock.user_name}</span>

                  <span className="font-semibold text-slate-400 col-span-1">Perfil:</span>
                  <span className="font-bold text-slate-800 col-span-2">{selectedBlock.user_role}</span>

                  <span className="font-semibold text-slate-400 col-span-1">Área:</span>
                  <span className="font-bold text-slate-800 col-span-2">{selectedBlock.area_name}</span>

                  <span className="font-semibold text-slate-400 col-span-1">Status:</span>
                  <span className="font-bold text-slate-800 col-span-2">
                    {selectedBlock.status === "FINISHED" ? "Finalizado" : "Pendente"}
                  </span>
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Ban size={14} className="text-indigo-600" />
                  Motivo
                </h3>
                <div className="text-xs font-bold text-slate-800 pl-6 leading-relaxed">
                  <div>{selectedBlock.reason || "Outros"}</div>
                  {selectedBlock.description && selectedBlock.description !== "—" && (
                    <div className="text-slate-500 font-normal mt-2 leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-lg">
                      {selectedBlock.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteBlock && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800">Confirmar Remoção</h3>
                <p className="text-xs text-slate-400">
                  Tem certeza que deseja remover o bloqueio #{confirmDeleteBlock.id}? Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-100">
              <button
                onClick={() => setConfirmDeleteBlock(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setDeletedIds(prev => [...prev, confirmDeleteBlock.id]);
                  triggerToast(`Bloqueio #${confirmDeleteBlock.id} removido com sucesso!`);
                  setConfirmDeleteBlock(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-650 hover:bg-red-750 rounded-lg shadow-lg shadow-red-100 transition-colors"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-4 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
