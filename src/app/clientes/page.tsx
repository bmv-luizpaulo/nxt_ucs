'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import { Users, Search, ChevronLeft, ChevronRight, Loader2, RefreshCw, User, Building2, Hash, Phone } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER:    'bg-teal-100 text-teal-700',
  UNIT:        'bg-emerald-100 text-emerald-700',
  DISTRIBUTOR: 'bg-purple-100 text-purple-700',
  MASTER:      'bg-amber-100 text-amber-700',
  BROKER:      'bg-blue-100 text-blue-700',
  ADMIN:       'bg-rose-100 text-rose-700',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
  BLOCKED:  'bg-red-100 text-red-700',
};

export default function ClientesLegadoPage() {
  const [roleFilter, setRoleFilter] = useState('');

  const { rows, pagination, extra, loading, error, search, handleSearch, handlePageChange, refresh } = useLegacyData({
    domain: 'users',
    params: roleFilter ? { role: roleFilter } : {},
    pageSize: 50,
  });

  const users = rows as Record<string, string>[];
  const allRoles = (extra?.allRoles as string[]) || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users className="w-6 h-6 text-teal-600" />
              Clientes / Usuários — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_user.csv</code> + <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_role_user.csv</code> · {pagination.total.toLocaleString('pt-BR')} usuários
            </p>
          </div>
          <button onClick={refresh} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><RefreshCw size={16} /></button>
        </header>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto">

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar por nome, documento..."
                className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-teal-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setRoleFilter('')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${!roleFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                Todos
              </button>
              {allRoles.map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${roleFilter === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['ID', 'Nome', 'Documento', 'Tipo', 'Perfil (Role)', 'Status', 'Telefone', 'Desde'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const roles = u.roles as unknown as Record<string,string>[];
                      const primaryRole = (roles?.[0] as Record<string,string>)?.role || '—';
                      const fullName = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
                      return (
                        <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-blue-500 font-bold">{u.id}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center shrink-0">
                                {u.type === 'PJ' ? <Building2 className="w-4 h-4 text-teal-600" /> : <User className="w-4 h-4 text-teal-600" />}
                              </div>
                              <div>
                                <div className="text-[12px] font-bold text-slate-800">{fullName}</div>
                                {roles?.length > 1 && (
                                  <div className="text-[9px] text-slate-400">{roles.length} perfis</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{u.document || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${u.type === 'PJ' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                              {u.type === 'PJ' ? 'Jurídica' : 'Física'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[primaryRole] || 'bg-slate-100 text-slate-500'}`}>
                              {primaryRole}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[u.status] || 'bg-slate-100 text-slate-400'}`}>
                              {u.status || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-400">{u.cell_phone || u.phone || '—'}</td>
                          <td className="py-3 px-4 text-[10px] text-slate-400">{u.created_on?.split(' ')[0] || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pagination.totalPages > 1 && (
              <div className="h-14 flex items-center justify-between px-8 border-t border-slate-100 bg-slate-50/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Página {pagination.page}/{pagination.totalPages} · {pagination.total} usuários</p>
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
