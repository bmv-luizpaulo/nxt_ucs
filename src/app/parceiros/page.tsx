'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import { Building2, Search, ChevronLeft, ChevronRight, Loader2, RefreshCw, UserCheck } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

export default function ParceirosLegadoPage() {
  const { rows, pagination, loading, error, search, handleSearch, handlePageChange, refresh } = useLegacyData({
    domain: 'partners',
    pageSize: 50,
  });

  const partners = rows as Record<string, string>[];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-indigo-600" />
              Parceiros — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">plat_tesouro_verde_partners.csv</code> · {pagination.total.toLocaleString('pt-BR')} parceiros
            </p>
          </div>
          <button onClick={refresh} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><RefreshCw size={16} /></button>
        </header>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nome ou documento..."
              className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['ID', 'Nome/Razão Social', 'Documento', 'Tipo', 'Email', 'Status'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-blue-500 font-bold">{p.id}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-[12px] font-bold text-slate-800">{p.name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{p.document || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.document_type === 'CNPJ' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                            {p.document_type || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">{p.email || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-400'}`}>
                            {p.status || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pagination.totalPages > 1 && (
              <div className="h-14 flex items-center justify-between px-8 border-t border-slate-100 bg-slate-50/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Página {pagination.page}/{pagination.totalPages} · {pagination.total} parceiros</p>
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
