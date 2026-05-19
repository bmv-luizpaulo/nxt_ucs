'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import {
  Search, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  Plus, MoreHorizontal, FileText, Building2, X
} from 'lucide-react';

export default function GerenciarParceirosPage() {
  const { rows, pagination, loading, error, search, handleSearch, handlePageChange, refresh } = useLegacyData({
    domain: 'partners',
    pageSize: 10,
  });

  const partners = rows as Record<string, any>[];

  const handleClear = () => {
    handleSearch('');
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] text-slate-700 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="bg-white h-20 px-8 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">
              Gerenciar Parceiros
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-0.5">
              <span>Home</span>
              <span className="opacity-50">/</span>
              <span>Tesouro Verde</span>
              <span className="opacity-50">/</span>
              <span className="text-slate-500 font-bold">Gerenciar Parceiros</span>
            </div>
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
          
          {/* Action Button Card */}
          <div className="flex justify-end">
            <button className="h-11 px-5 bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm">
              <Plus size={14} />
              Novo
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar Parceiros"
                className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
              />
            </div>
            
            <button
              onClick={handleClear}
              className="h-11 px-6 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <X size={14} />
              Limpar
            </button>
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
            ) : partners.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                <FileText size={32} className="opacity-40" />
                <p className="text-xs font-bold uppercase tracking-wider">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9FAF8] border-b border-slate-100">
                    <tr>
                      {['ID', 'Nome', 'Data de Criação', 'Status', 'Ações'].map(h => (
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
                    {partners.map(p => {
                      const name = p.name || '—';
                      const logoPath = p.logo_file_path || '';
                      
                      // Split date and time from created_on (format is typically YYYY-MM-DD HH:MM:SS)
                      let createdDate = '—';
                      let createdTime = '';
                      if (p.created_on) {
                        const parts = p.created_on.split(' ');
                        // Try to convert YYYY-MM-DD to DD/MM/YYYY
                        const rawDate = parts[0];
                        if (rawDate && rawDate.includes('-')) {
                          const [y, m, d] = rawDate.split('-');
                          createdDate = `${d}/${m}/${y}`;
                        } else {
                          createdDate = rawDate;
                        }
                        // Remove milliseconds if present from time
                        if (parts[1]) {
                          createdTime = parts[1].split('.')[0];
                        }
                      }

                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          {/* ID */}
                          <td className="py-4 px-6 font-mono text-[11px] font-extrabold text-blue-500">
                            #{p.id}
                          </td>

                          {/* Nome */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-650 flex items-center justify-center text-xs font-black uppercase shrink-0 border border-slate-200 overflow-hidden">
                                {logoPath ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={`https://legado-backoffice.bmv.global${logoPath}`}
                                    alt={name}
                                    className="w-full h-full object-contain p-1"
                                    onError={(e) => {
                                      // Fallback if image fails to load
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Building2 className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <span className="text-[12px] font-black text-slate-800">{name}</span>
                            </div>
                          </td>

                          {/* Data de Criação */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-700">{createdDate}</span>
                              {createdTime && (
                                <span className="text-[9px] font-medium text-slate-400 mt-0.5">{createdTime}</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                              p.status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : 'bg-red-50 text-red-500 border border-red-100'
                            }`}>
                              {p.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
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
