'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import {
  Search, Building2, MapPin, ChevronLeft, ChevronRight,
  Loader2, Lock, Globe, RefreshCw, Filter
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

export default function FazendasLegadoPage() {
  const [isPrivate, setIsPrivate] = useState<'true' | 'false' | ''>('');

  const { rows, pagination, loading, error, search, handleSearch, handlePageChange, refresh } = useLegacyData({
    domain: 'areas',
    params: isPrivate !== '' ? { private: isPrivate } : {},
    pageSize: 50,
  });

  const areas = rows as Record<string, string & { latestYearlyInfo: Record<string, string> | null }>[];
  const totalHA = areas.reduce((s, a) => s + parseFloat((a.latestYearlyInfo as unknown as Record<string,string>)?.total_area || '0'), 0);
  const totalVeg = areas.reduce((s, a) => s + parseFloat((a.latestYearlyInfo as unknown as Record<string,string>)?.total_vegetation_area || '0'), 0);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Building2 className="w-6 h-6 text-emerald-600" />
              Fazendas — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_area.csv</code> · {pagination.total.toLocaleString('pt-BR')} fazendas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-bold">
              {pagination.total} propriedades
            </span>
            <button onClick={refresh} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total de Áreas', value: pagination.total, unit: 'registros', color: 'emerald' },
              { label: 'Total de Hectares', value: Math.round(totalHA).toLocaleString('pt-BR'), unit: 'ha', color: 'teal' },
              { label: 'Área de Vegetação', value: Math.round(totalVeg).toLocaleString('pt-BR'), unit: 'ha', color: 'green' },
              { label: 'Privadas', value: areas.filter(a => a.private === 't').length, unit: 'fazendas', color: 'indigo' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-5 bg-${s.color}-50 border-${s.color}-100`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
                <p className="text-2xl font-black text-slate-800">{s.value}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              {([['', 'Todas'], ['true', 'Privadas'], ['false', 'Públicas']] as [string, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setIsPrivate(v as '' | 'true' | 'false')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${isPrivate === v ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                  {l}
                </button>
              ))}
            </div>
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
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['ID', 'Código', 'Propriedade', 'Tipo', 'Área Total (ha)', 'Vegetação (ha)', 'UF', 'Associação'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {areas.map(area => (
                      <tr key={area.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-blue-500 font-bold">{area.id}</td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{area.code}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-[13px] font-bold text-slate-800">{area.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${area.private === 't' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                            {area.private === 't' ? <><Lock size={9}/>Privada</> : <><Globe size={9}/>Pública</>}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[13px] font-black text-slate-800">
                          {(area.latestYearlyInfo as unknown as Record<string,string>)?.total_area
                            ? parseFloat((area.latestYearlyInfo as unknown as Record<string,string>).total_area).toLocaleString('pt-BR')
                            : '—'} ha
                        </td>
                        <td className="py-3 px-4 text-[12px] text-emerald-600 font-bold">
                          {(area.latestYearlyInfo as unknown as Record<string,string>)?.total_vegetation_area
                            ? parseFloat((area.latestYearlyInfo as unknown as Record<string,string>).total_vegetation_area).toLocaleString('pt-BR')
                            : '—'} ha
                        </td>
                        <td className="py-3 px-4 text-[12px] text-slate-500">{area.uf || '—'}</td>
                        <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">{area.association_id || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="h-14 flex items-center justify-between px-8 border-t border-slate-100 bg-slate-50/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Página {pagination.page}/{pagination.totalPages} · {pagination.total} fazendas
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50 transition-colors">
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
