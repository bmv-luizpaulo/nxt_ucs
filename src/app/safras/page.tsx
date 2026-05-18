'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import { Leaf, Search, ChevronLeft, ChevronRight, Loader2, RefreshCw, Calendar, BarChart2, TreePine } from 'lucide-react';

export default function SafrasLegadoPage() {
  const [selectedYear, setSelectedYear] = useState('');

  const { rows, pagination, extra, loading, error, search, handleSearch, handlePageChange, refresh } = useLegacyData({
    domain: 'harvests',
    params: selectedYear ? { year: selectedYear } : {},
    pageSize: 50,
  });

  const harvests = rows as Record<string, string & { area: Record<string, string> | null }>[];
  const byYear = (extra?.byYear as Record<string, { count: number; totalUcs: number }>) || {};
  const years = (extra?.years as string[]) || [];

  const totalUcs = Object.values(byYear).reduce((s, y) => s + y.totalUcs, 0);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Leaf className="w-6 h-6 text-emerald-600" />
              Safras — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_harvest.csv</code> · {pagination.total.toLocaleString('pt-BR')} safras
            </p>
          </div>
          <button onClick={refresh} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><RefreshCw size={16} /></button>
        </header>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto">

          {/* Stats cards by year */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Safras', value: pagination.total, unit: 'registros', icon: <Calendar size={18}/>, color: 'emerald' },
              { label: 'Total UCS (all)', value: Math.round(totalUcs).toLocaleString('pt-BR'), unit: 'UCS emitidas', icon: <BarChart2 size={18}/>, color: 'teal' },
              { label: 'Anos distintos', value: years.length, unit: 'ciclos', icon: <TreePine size={18}/>, color: 'green' },
              { label: 'Média por safra', value: pagination.total > 0 ? Math.round(totalUcs / pagination.total).toLocaleString('pt-BR') : '—', unit: 'UCS/safra', icon: <Leaf size={18}/>, color: 'amber' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-5 bg-white border-slate-100 shadow-sm`}>
                <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-600 mb-3`}>{s.icon}</div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                <p className="text-xl font-black text-slate-800">{s.value}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>

          {/* Year selector chips */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedYear('')}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all border ${!selectedYear ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400'}`}>
              Todos os anos
            </button>
            {years.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all border ${selectedYear === y ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-400'}`}>
                {y}
                {byYear[y] && <span className="ml-1.5 text-[9px] opacity-70">({Math.round(byYear[y].totalUcs / 1e6).toLocaleString('pt-BR')}M UCS)</span>}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['ID', 'Ano', 'Fazenda', 'Código', 'UCS Emitidas', 'Data Registro', 'Plataforma'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {harvests.map(h => {
                      const area = h.area as unknown as Record<string, string> | null;
                      return (
                        <tr key={h.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-blue-500 font-bold">{h.id}</td>
                          <td className="py-3 px-4">
                            <span className="bg-emerald-100 text-emerald-700 text-[11px] font-black px-3 py-1 rounded-full">{h.year}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <span className="text-[12px] font-bold text-slate-800">{area?.name || `Área ${h.area_id}`}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{area?.code || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="text-[13px] font-black text-slate-800">
                              {parseInt(h.amount || '0').toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[9px] text-slate-400 ml-1">UCS</span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-400">{h.registered_on?.split(' ')[0] || '—'}</td>
                          <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">{h.platform_id || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pagination.totalPages > 1 && (
              <div className="h-14 flex items-center justify-between px-8 border-t border-slate-100 bg-slate-50/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Página {pagination.page}/{pagination.totalPages} · {pagination.total} safras</p>
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