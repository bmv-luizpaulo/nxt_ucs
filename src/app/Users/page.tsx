'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import { useToast } from '@/hooks/use-toast';
import {
  Search, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  Download, Plus, Copy, MoreHorizontal, Calendar, X,
  Users, UserCheck, UserMinus, FileText
} from 'lucide-react';

export default function GerenciarUsuariosPage() {
  const { toast } = useToast();
  
  // Filter states
  const [profileId, setProfileId] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateInicio, setDateInicio] = useState('');
  const [dateFim, setDateFim] = useState('');

  // Assemble current query params
  const params: Record<string, string> = {};
  if (profileId) params.profileId = profileId;
  if (roleFilter) params.role = roleFilter;
  if (statusFilter) params.status = statusFilter;
  if (dateInicio) params.dateInicio = dateInicio;
  if (dateFim) params.dateFim = dateFim;

  const { rows, pagination, extra, loading, error, search, handleSearch, handlePageChange, refresh } = useLegacyData({
    domain: 'users',
    params,
    pageSize: 10,
  });

  const users = rows as Record<string, any>[];
  const allRoles = (extra?.allRoles as string[]) || [];
  const summary = (extra?.summary as Record<string, number>) || { totalUsers: 1803, activeUsers: 1583, inactiveUsers: 220 };

  const handleCopy = (text: string, type: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${type} copiado para a área de transferência.`,
      duration: 2000,
    });
  };

  const handleClear = () => {
    handleSearch('');
    setProfileId('');
    setRoleFilter('');
    setStatusFilter('');
    setDateInicio('');
    setDateFim('');
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] text-slate-700 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-600" />
              Usuários — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">dbo_user.csv</code> · {pagination.total.toLocaleString('pt-BR')} usuários
            </p>
          </div>
          <button 
            onClick={refresh}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card Total */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total</p>
                <h3 className="text-2xl font-black text-slate-850">
                  {summary.totalUsers?.toLocaleString('pt-BR') || '1.803'}
                </h3>
              </div>
            </div>

            {/* Card Ativos */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ativos</p>
                <h3 className="text-2xl font-black text-slate-850 text-emerald-600">
                  {summary.activeUsers?.toLocaleString('pt-BR') || '1.583'}
                </h3>
              </div>
            </div>

            {/* Card Inativos */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <UserMinus className="w-6 h-6 text-red-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Inativos</p>
                <h3 className="text-2xl font-black text-slate-850 text-red-500">
                  {summary.inactiveUsers?.toLocaleString('pt-BR') || '220'}
                </h3>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button className="h-11 px-5 border border-purple-200 text-purple-600 hover:bg-purple-50 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm">
              <Download size={14} />
              Baixar CSV
            </button>
            <button className="h-11 px-5 bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm">
              <Plus size={14} />
              Novo
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Text Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Busque pelo ID, nome ou documento..."
                  className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
                />
              </div>

              {/* Profile ID Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={profileId}
                  onChange={e => setProfileId(e.target.value)}
                  placeholder="Busque pelo ID do perfil..."
                  className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
                />
              </div>

              {/* Roles Dropdown */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-purple-400 transition-all cursor-pointer"
              >
                <option value="">Todos perfis</option>
                {allRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-purple-400 transition-all cursor-pointer"
              >
                <option value="">Todos status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>

              {/* Date Inicio */}
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateInicio}
                  onChange={e => setDateInicio(e.target.value)}
                  placeholder="Data início"
                  className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
                />
              </div>

              {/* Date Fim */}
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateFim}
                  onChange={e => setDateFim(e.target.value)}
                  placeholder="Data fim"
                  className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
                />
              </div>

              {/* Clear Button */}
              <button
                onClick={handleClear}
                className="h-11 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <X size={14} />
                Limpar
              </button>

            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-red-500 text-sm font-semibold">
                {error}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                <FileText size={32} className="opacity-40" />
                <p className="text-xs font-bold uppercase tracking-wider">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9FAF8] border-b border-slate-100">
                    <tr>
                      {['ID', 'Documento', 'Nome', 'Data Cadastro', 'Email', 'Situação', 'Ações'].map(h => (
                        <th 
                          key={h} 
                          className="text-left py-3.5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => {
                      const fullName = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
                      const createdDate = u.created_on ? u.created_on.split(' ')[0] : '—';
                      const createdTime = u.created_on ? u.created_on.split(' ')[1] : '';

                      return (
                        <tr 
                          key={u.id} 
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          {/* ID */}
                          <td className="py-4 px-6 font-mono text-[11px] font-extrabold text-blue-500">
                            #{u.id}
                          </td>

                          {/* Documento */}
                          <td className="py-4 px-6 font-mono text-[11px] text-slate-500">
                            {u.document ? (
                              <div className="flex items-center gap-1.5 group">
                                <span>{u.document}</span>
                                <button 
                                  onClick={() => handleCopy(u.document, 'Documento')}
                                  className="text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            ) : '—'}
                          </td>

                          {/* Nome */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black uppercase tracking-wider shrink-0 border border-slate-200">
                                {fullName.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[12px] font-black text-slate-800">{fullName}</span>
                                {u.primaryRole && (
                                  <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">{u.primaryRole}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Data Cadastro */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-700">{createdDate}</span>
                              {createdTime && (
                                <span className="text-[9px] font-medium text-slate-400 mt-0.5">{createdTime}</span>
                              )}
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-4 px-6 text-[11px] font-semibold text-slate-500">
                            {u.email ? (
                              <div className="flex items-center gap-1.5 group">
                                <span className="max-w-[200px] truncate">{u.email}</span>
                                <button 
                                  onClick={() => handleCopy(u.email, 'E-mail')}
                                  className="text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            ) : '—'}
                          </td>

                          {/* Situação */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                              u.status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : 'bg-red-50 text-red-500 border border-red-100'
                            }`}>
                              {u.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="py-4 px-6">
                            <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
                              <MoreHorizontal size={14} />
                            </button>
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
              <div className="h-16 flex items-center justify-between px-8 border-t border-slate-100 bg-[#F9FAF8]">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePageChange(pagination.page - 1)} 
                    disabled={pagination.page <= 1}
                    className="h-9 px-4 rounded-xl border border-slate-200 font-bold text-xs flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-transparent hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      // Centering logic if pages get large
                      if (pagination.page > 3 && pagination.totalPages > 5) {
                        pageNum = pagination.page - 3 + i;
                        if (pageNum + (4 - i) > pagination.totalPages) {
                          pageNum = pagination.totalPages - 4 + i;
                        }
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                            pagination.page === pageNum
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-100'
                              : 'hover:bg-slate-50 text-slate-500'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                      <>
                        <span className="text-slate-450 px-1 font-bold">...</span>
                        <button
                          onClick={() => handlePageChange(pagination.totalPages)}
                          className={`w-9 h-9 rounded-xl font-bold text-xs hover:bg-slate-50 text-slate-500`}
                        >
                          {pagination.totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  <button 
                    onClick={() => handlePageChange(pagination.page + 1)} 
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-9 px-4 rounded-xl border border-slate-200 font-bold text-xs flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-transparent hover:bg-slate-50 transition-colors"
                  >
                    Próximo
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros · 10 itens por página
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
