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
  MoreVertical
} from "lucide-react";

export default function BloqueioUcsPage() {
  const [blockId, setBlockId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [perfil, setPerfil] = useState("");
  const [status, setStatus] = useState("");
  const [areaQuery, setAreaQuery] = useState("");

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
            <h1 className="text-xl font-bold tracking-wider text-slate-900 uppercase">Bloqueio de UCS</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
              <span>Home</span>
              <span>&gt;</span>
              <span>Estoque</span>
              <span>&gt;</span>
              <span className="text-indigo-600">Bloqueio de UCS</span>
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
                    <th className="py-5 px-6 w-12"></th>
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
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Nenhum registro de bloqueio encontrado
                      </td>
                    </tr>
                  ) : (
                    records.map((t) => {
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
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                ✓ Processado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded">
                                <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                Pendente
                              </span>
                            )}
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
                  Mostrando {records.length} de {pagination.total} registros
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
