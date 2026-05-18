'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import {
  Users, Search, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  Building2, MapPin, Eye, ShieldAlert, Award
} from 'lucide-react';

export default function ProdutoresLegadoPage() {
  const { rows, pagination, extra, loading, error, search, handleSearch, handlePageChange, refresh } = useLegacyData({
    domain: 'produtores',
    pageSize: 50,
  });

  const producers = rows as Record<string, any>[];
  const stats = (extra as any)?.stats || { total: 0, totalAreaHa: 0, totalVegHa: 0, totalProperties: 0 };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users className="w-6 h-6 text-emerald-600" />
              Produtores — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Consolidado de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_user.csv</code> + <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_area.csv</code>
            </p>
          </div>
          <button onClick={refresh} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <RefreshCw size={16} />
          </button>
        </header>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto">

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Produtores Ativos', value: stats.total, unit: 'stakeholders', icon: <Users size={20}/>, gradient: 'from-emerald-500 to-emerald-600' },
              { label: 'Área Total Preservada', value: Math.round(stats.totalAreaHa).toLocaleString('pt-BR'), unit: 'hectares registrados', icon: <MapPin size={20}/>, gradient: 'from-slate-700 to-slate-900' },
              { label: 'Área Vegetação', value: Math.round(stats.totalVegHa).toLocaleString('pt-BR'), unit: 'ha floresta nativa', icon: <Award size={20}/>, gradient: 'from-teal-500 to-teal-600' },
              { label: 'Propriedades Rurais', value: stats.totalProperties, unit: 'fazendas vinculadas', icon: <Building2 size={20}/>, gradient: 'from-indigo-500 to-indigo-600' },
            ].map(s => (
              <div key={s.label} className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/60 p-6 flex flex-col group hover:shadow-lg hover:border-emerald-200 transition-all duration-300 min-h-[140px]">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${s.gradient} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 rounded-full blur-2xl -mr-10 -mt-10`} />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${s.gradient}`}>
                    {s.icon}
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</p>
                </div>
                <div className="relative z-10 mt-auto">
                  <p className="text-3xl font-black text-slate-900 leading-none tracking-tight mb-2">{s.value}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{s.unit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ, fazenda..."
              className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome / Identificação</th>
                      <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Propriedades Vinculadas</th>
                      <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Área Monitorada</th>
                      <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {producers.map(p => {
                      const fullName = [p.name, p.surname].filter(Boolean).join(' ').trim() || '—';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${p.type === 'PJ' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                                {fullName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-slate-900">{fullName}</p>
                                <p className="text-[10px] font-mono text-slate-400">{p.document || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.type === 'PJ' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {p.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {p.areas?.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {p.areas.slice(0, 2).map((a: any) => (
                                  <span key={a.id} className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                    <Building2 size={10} className="text-emerald-500" />
                                    {a.name} <span className="text-[9px] text-slate-400 font-mono">(IDF: {a.code})</span>
                                  </span>
                                ))}
                                {p.areas.length > 2 && (
                                  <span className="text-[9px] font-bold text-slate-400">+{p.areas.length - 2} mais</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-black text-slate-800">{Math.round(p.totalAreaHa).toLocaleString('pt-BR')} ha</span>
                              {p.totalVegHa > 0 && (
                                <span className="text-[9px] text-emerald-500 font-bold">Reserva: {Math.round(p.totalVegHa).toLocaleString('pt-BR')} ha</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                              {p.status || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="h-14 flex items-center justify-between px-8 border-t border-slate-100 bg-slate-50/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Página {pagination.page}/{pagination.totalPages} · {pagination.total} produtores</p>
                <div className="flex gap-2">
                  <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50">
                    <ChevronRight className="w-4 h-4" />
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