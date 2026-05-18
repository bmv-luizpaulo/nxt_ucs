'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import {
  ShoppingBag, Search, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  GitBranch, FileText, ArrowRight, Eye, Layers, DollarSign,
  TrendingUp, Award, AwardIcon, Compass, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type SubCategory =
  | 'akses_cert_distribuidor'
  | 'akses_cert_cliente'
  | 'akses_living_carbon'
  | 'akses_transferencia'
  | 'akses_compra'
  | 'tv_pedidos_selo'
  | 'tv_dare_royalties'
  | 'tv_compensacao'
  | 'tv_programas';

const STATUS_COLORS: Record<string, string> = {
  PROCESSED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED:  'bg-slate-100 text-slate-500',
  PENDING:   'bg-amber-100 text-amber-700',
  CANCELED:  'bg-red-100 text-red-600',
  FINISHED:  'bg-blue-100 text-blue-700',
};

const PAYMENT_LABELS: Record<string, string> = {
  ELECTRONIC_TRANSFER: 'TED/PIX',
  BILLET:              'Boleto',
  COMPENSATION:        'Compensação',
  PURCHASE:            'Compra',
};

const SUB_CATEGORIES: { value: SubCategory; label: string; platform: 'akses' | 'tv'; icon: any }[] = [
  // Akses
  { value: 'akses_compra', label: 'Pedidos Compra', platform: 'akses', icon: ShoppingBag },
  { value: 'akses_cert_distribuidor', label: 'Pedidos de Certificado (Dist.)', platform: 'akses', icon: FileText },
  { value: 'akses_cert_cliente', label: 'Pedidos de Certificado (Cli.)', platform: 'akses', icon: FileText },
  { value: 'akses_transferencia', label: 'Pedidos de Transferência', platform: 'akses', icon: GitBranch },
  { value: 'akses_living_carbon', label: 'Living Carbon', platform: 'akses', icon: Award },
  // Tesouro Verde
  { value: 'tv_pedidos_selo', label: 'Pedidos Selo', platform: 'tv', icon: Award },
  { value: 'tv_dare_royalties', label: 'DARE/Royalties', platform: 'tv', icon: DollarSign },
  { value: 'tv_compensacao', label: 'Intenções de Compensação', platform: 'tv', icon: Compass },
  { value: 'tv_programas', label: 'Programas / Campanhas', platform: 'tv', icon: Layers },
];

export default function PedidosLegadoPage() {
  const [platform, setPlatform] = useState<'akses' | 'tv'>('akses');
  const [subCategory, setSubCategory] = useState<SubCategory>('akses_compra');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDareRoyalties, setSelectedDareRoyalties] = useState<any | null>(null);

  const currentMenu = SUB_CATEGORIES.filter(s => s.platform === platform);

  const { rows, pagination, extra, loading, error, search, handleSearch, handlePageChange, refresh } =
    useLegacyData({
      domain: 'orders',
      params: { category: subCategory, ...(statusFilter ? { status: statusFilter } : {}) },
      pageSize: 50,
    });

  const orders = rows as Record<string, string>[];
  const allStatuses = (extra?.allStatuses as string[]) || [];
  const statusCounts = (extra?.statusCounts as Record<string, number>) || {};
  const totals = (extra?.totals as { ucs: number; value: number }) || { ucs: 0, value: 0 };

  const handlePlatformChange = (plat: 'akses' | 'tv') => {
    setPlatform(plat);
    setStatusFilter('');
    const firstSub = SUB_CATEGORIES.find(s => s.platform === plat);
    if (firstSub) setSubCategory(firstSub.value);
  };

  // Dynamic headers config depending on subCategory
  const getHeaders = () => {
    if (subCategory === 'akses_transferencia') {
      return ['#', 'Data', 'Origem (Distribuidor)', 'Destinatário / Recipiente', 'Dist.', 'UCS', 'Status', 'Ações'];
    }
    if (subCategory === 'akses_living_carbon') {
      return ['#', 'Data', 'Beneficiário', 'Pagador / Payer', 'Dist.', 'UCS', 'Total R$', 'Status', 'Ações'];
    }
    if (subCategory === 'tv_programas') {
      return ['#', 'Data', 'Nome do Programa', 'Criado Por', 'UCS', 'Total R$', 'Status', 'Ações'];
    }
    if (subCategory === 'tv_dare_royalties') {
      return ['Pedido', 'Data', 'UCS', 'Cliente', 'Total Pedido', 'UCS PUB', 'TOTAL PUB', 'UCS PRI', 'TOTAL PRI', 'DARE', 'Royalties', 'Ações'];
    }
    return ['#', 'Data', 'Origem (Distribuidor)', 'Responsável / Cliente', 'Dist.', 'UCS', 'Total R$', 'Pagamento', 'Status', 'Ações'];
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Header */}
        <header className="h-24 bg-[#080C11] px-10 flex items-center justify-between border-b border-white/5 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/4 h-full bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-white/5">
              <ShoppingBag className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Módulos de Pedidos — Banco Legado</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Diretório Integrado Akses & Tesouro Verde (CSVs)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar por nome, documento, ID..."
                className="w-full pl-10 pr-4 h-11 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50"
              />
            </div>
            <button onClick={refresh} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {/* Content Area with Sub-sidebar */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sub Sidebar Navigation */}
          <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0">
            
            {/* Platform Toggle */}
            <div className="p-5 border-b border-slate-100 flex gap-2">
              <button
                onClick={() => handlePlatformChange('akses')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                  platform === 'akses' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200/60 hover:text-slate-700'
                }`}
              >
                Akses
              </button>
              <button
                onClick={() => handlePlatformChange('tv')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                  platform === 'tv' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200/60 hover:text-slate-700'
                }`}
              >
                Tesouro Verde
              </button>
            </div>

            {/* Menu options */}
            <div className="p-4 flex-1 overflow-y-auto space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Sub-módulos Legados</p>
              {currentMenu.map(sub => {
                const Icon = sub.icon;
                const isSelected = subCategory === sub.value;
                return (
                  <button
                    key={sub.value}
                    onClick={() => { setSubCategory(sub.value); setStatusFilter(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left text-xs font-bold ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={14} className={isSelected ? (platform === 'akses' ? 'text-indigo-600' : 'text-emerald-500') : 'text-slate-400'} />
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Table Container */}
          <div className="flex-1 p-8 space-y-6 overflow-y-auto flex flex-col min-w-0">

            {/* Header / Stats Info */}
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {SUB_CATEGORIES.find(s => s.value === subCategory)?.label}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Arquivo: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">
                    {SUB_CATEGORIES.find(s => s.value === subCategory)?.value}.csv
                  </code>
                </p>
              </div>

              <div className="flex items-center gap-6 bg-white border border-slate-200/60 px-6 py-3 rounded-2xl shadow-sm text-xs font-bold">
                <span className="text-slate-400">Total: <strong className="text-slate-800 font-black">{pagination.total}</strong></span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <span className="text-slate-400">Soma UCS: <strong className="text-emerald-600 font-black">{Math.round(totals.ucs).toLocaleString('pt-BR')}</strong></span>
                {totals.value > 0 && (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span className="text-slate-400">Soma Financeira: <strong className="text-slate-800 font-black">R$ {totals.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* Status chips */}
            {allStatuses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <button onClick={() => setStatusFilter('')}
                  className={`px-3.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border ${
                    !statusFilter ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
                  Todos ({Object.values(statusCounts).reduce((s, v) => s + v, 0)})
                </button>
                {allStatuses.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3.5 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border ${
                      statusFilter === s ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : `bg-white border-slate-200 hover:border-slate-300 ${STATUS_COLORS[s]?.split(' ')[1] || 'text-slate-500'}`
                    }`}>
                    {s} {statusCounts[s] ? `(${statusCounts[s]})` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="flex-1 flex items-center justify-center min-h-[300px]">
                  <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center min-h-[300px] text-red-500 text-xs font-bold uppercase">{error}</div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 h-12">
                        {getHeaders().map(h => (
                          <th key={h} className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {orders.map(o => {
                        const dateVal = o.created_date?.split(' ')[0] || o.original_created_at?.split('T')[0] || '—';
                        if (subCategory === 'tv_dare_royalties') {
                          return (
                            <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                              {/* Pedido */}
                              <td className="py-4 px-6">
                                <span className="text-[13px] font-black text-emerald-600">#{o.order_id || '—'}</span>
                              </td>
                              
                              {/* Data */}
                              <td className="py-4 px-6 text-[11px] font-bold text-slate-400 whitespace-nowrap">
                                {o.order_date?.split(' ')[0] || '—'}
                              </td>

                              {/* UCS */}
                              <td className="py-4 px-6">
                                <span className="text-slate-800 font-black text-[13px]">{o.ucs_amount || '0'}</span>
                                <span className="text-[9px] text-slate-400 ml-1">UCS</span>
                              </td>

                              {/* Cliente */}
                              <td className="py-4 px-6">
                                <div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate" title={o.responsible_name}>
                                  {o.responsible_name || '—'}
                                </div>
                                {o.responsible_document && (
                                  <div className="text-[9px] text-slate-400 font-mono">{o.responsible_document}</div>
                                )}
                              </td>

                              {/* Total Pedido */}
                              <td className="py-4 px-6 text-[12px] font-bold text-slate-800 whitespace-nowrap">
                                R$ {parseFloat(o.order_total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              {/* UCS PUB */}
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium">
                                {o.ucs_pub || '0'}
                              </td>

                              {/* TOTAL PUB */}
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium whitespace-nowrap">
                                R$ {parseFloat(o.total_pub || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              {/* UCS PRI */}
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium">
                                {o.ucs_pri || '0'}
                              </td>

                              {/* TOTAL PRI */}
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium whitespace-nowrap">
                                R$ {parseFloat(o.total_pri || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              {/* DARE */}
                              <td className="py-4 px-6">
                                <div className="text-[12px] font-bold text-slate-800">
                                  R$ {parseFloat(o.dare_total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                {parseFloat(o.dare_total || '0') > 0 && (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                    o.dare_status === 'EMITIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {o.dare_status}
                                  </span>
                                )}
                              </td>

                              {/* Royalties */}
                              <td className="py-4 px-6">
                                <div className="text-[12px] font-bold text-slate-800">
                                  R$ {parseFloat(o.royalties_total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                {parseFloat(o.royalties_total || '0') > 0 && (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                    o.royalties_status === 'EMITIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {o.royalties_status}
                                  </span>
                                )}
                              </td>

                              {/* Ações */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedDareRoyalties(o)}
                                    className="h-8 px-3 text-[10px] font-bold rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center gap-1 transition-colors"
                                  >
                                    <Eye size={12}/>Visualizar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                            {/* # ID */}
                            <td className="py-4 px-6">
                              <span className={`text-[13px] font-black ${platform === 'akses' ? 'text-indigo-600' : 'text-emerald-600'}`}>#{o.id}</span>
                            </td>

                            {/* Data */}
                            <td className="py-4 px-6 text-[11px] font-bold text-slate-400 whitespace-nowrap">{dateVal}</td>

                            {/* Column 3: Primary Party / Name */}
                            <td className="py-4 px-6">
                              {subCategory === 'tv_programas' ? (
                                <span className="text-[13px] font-bold text-slate-800">{o.name || o.campaign_name || '—'}</span>
                              ) : (
                                <div>
                                  <div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate" title={o.issuerName}>{o.issuerName || '—'}</div>
                                  {o.issuerDocument && <div className="text-[9px] text-slate-400 font-mono">{o.issuerDocument}</div>}
                                  {o.issuerRole && o.issuerRole !== '—' && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{o.issuerRole}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Column 4: Secondary Party / Doc / Creator */}
                            <td className="py-4 px-6">
                              {subCategory === 'tv_programas' ? (
                                <span className="text-[11px] font-bold text-slate-500">{(o as any).createdByUser?.name || '—'}</span>
                              ) : o.responsibleName && o.responsibleName !== '—' ? (
                                <div>
                                  <div className="text-[12px] font-bold text-slate-700 max-w-[200px] truncate">{o.responsibleName}</div>
                                  <div className="text-[9px] font-mono text-slate-400">{o.responsibleDocument}</div>
                                </div>
                              ) : <span className="text-slate-400 text-xs">—</span>}
                            </td>

                            {/* Distribution ID Link */}
                            {subCategory !== 'tv_programas' && (
                              <td className="py-4 px-6">
                                {o.distribution_id ? (
                                  <button
                                    onClick={() => window.open(`/legado#trace=${o.distribution_id}`, '_blank')}
                                    className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded transition-colors"
                                  >
                                    <GitBranch size={9} />{o.distribution_id}
                                  </button>
                                ) : <span className="text-slate-400">—</span>}
                              </td>
                            )}

                            {/* UCS Amount */}
                            <td className="py-4 px-6">
                              <span className="text-emerald-600 font-black text-[13px]">{parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')}</span>
                              <span className="text-[9px] text-slate-400 ml-1">UCS</span>
                            </td>

                            {/* Total Value */}
                            {subCategory !== 'akses_transferencia' && (
                              <td className="py-4 px-6 font-bold text-slate-800 text-[12px] whitespace-nowrap">
                                {o.total || o.royalties_total ? `R$ ${parseFloat(o.total || o.royalties_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '—'}
                              </td>
                            )}

                            {/* Payment Type */}
                            {subCategory !== 'akses_transferencia' && subCategory !== 'akses_living_carbon' && subCategory !== 'tv_programas' && (
                              <td className="py-4 px-6">
                                <span className="text-[10px] text-slate-500">{PAYMENT_LABELS[o.payment_type] || o.payment_type || '—'}</span>
                              </td>
                            )}

                            {/* Status */}
                            <td className="py-4 px-6">
                              <span className={`text-[9px] font-black px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-500'}`}>
                                {o.status || '—'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                {o.distribution_id && (
                                  <a href={`/legado#trace=${o.distribution_id}`} target="_blank"
                                    className="h-8 px-3 text-[10px] font-bold rounded-lg text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors">
                                    <Eye size={12}/>Ver
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination footer */}
              {pagination.totalPages > 1 && (
                <div className="h-14 flex items-center justify-between px-8 border-t border-slate-100 bg-slate-50/30">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}
                      className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-white bg-slate-50/50">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                      className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-white bg-slate-50/50">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Modal de Detalhes de DARE / Royalties */}
      {selectedDareRoyalties && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-[#0B0F19] text-white rounded-[2rem] border border-slate-800 shadow-2xl max-w-2xl w-full p-10 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-white/5">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Detalhamento de DARE e Royalties</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedido #{selectedDareRoyalties.order_id} • Dist. {selectedDareRoyalties.distribution_id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDareRoyalties(null)} 
                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              {/* Cliente info */}
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dados do Cliente / Adquirente</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-slate-400 font-semibold block">Razão Social:</span>
                    <span className="text-slate-200 text-sm uppercase">{selectedDareRoyalties.responsible_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">CNPJ / CPF:</span>
                    <span className="text-slate-200 font-mono">{selectedDareRoyalties.responsible_document}</span>
                  </div>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-center shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">UCS Total</span>
                  <span className="text-xl font-black text-white">{selectedDareRoyalties.ucs_amount} UCS</span>
                </div>
                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-center shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Preço Unitário</span>
                  <span className="text-xl font-black text-white">R$ {parseFloat(selectedDareRoyalties.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-center shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Total Pedido</span>
                  <span className="text-xl font-black text-emerald-400">R$ {parseFloat(selectedDareRoyalties.order_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Fraction splits */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* Fraction Public */}
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h5 className="text-[11px] font-black text-slate-200 uppercase tracking-widest">Fração Pública (Livro PUB)</h5>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">UCS Públicas:</span>
                      <span className="text-slate-200">{selectedDareRoyalties.ucs_pub} UCS</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">Total Financeiro PUB:</span>
                      <span className="text-slate-200">R$ {parseFloat(selectedDareRoyalties.total_pub).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-white/5">
                      <span className="text-slate-400">Taxa Estadual DARE:</span>
                      <span className="text-slate-200">R$ {parseFloat(selectedDareRoyalties.dare_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {selectedDareRoyalties.dare_code && (
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Código de DARE:</span>
                        <span className="text-slate-200 font-mono">{selectedDareRoyalties.dare_code}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold items-center">
                      <span className="text-slate-400">Status DARE:</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                        selectedDareRoyalties.dare_status === 'EMITIDO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>{selectedDareRoyalties.dare_status}</span>
                    </div>
                  </div>
                </div>

                {/* Fraction Private */}
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <h5 className="text-[11px] font-black text-slate-200 uppercase tracking-widest">Fração Privada (Livro PRI)</h5>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">UCS Privadas:</span>
                      <span className="text-slate-200">{selectedDareRoyalties.ucs_pri} UCS</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">Total Financeiro PRI:</span>
                      <span className="text-slate-200">R$ {parseFloat(selectedDareRoyalties.total_pri).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-white/5">
                      <span className="text-slate-400">Royalties (0.05%):</span>
                      <span className="text-slate-200">R$ {parseFloat(selectedDareRoyalties.royalties_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {selectedDareRoyalties.royalties_code && (
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Código de Royalties:</span>
                        <span className="text-slate-200 font-mono">{selectedDareRoyalties.royalties_code}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold items-center">
                      <span className="text-slate-400">Status Royalties:</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                        selectedDareRoyalties.royalties_status === 'EMITIDO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>{selectedDareRoyalties.royalties_status}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Rastreio button */}
              <div className="flex justify-end pt-4 gap-3">
                <button
                  onClick={() => {
                    window.open(`/legado#trace=${selectedDareRoyalties.distribution_id}`, '_blank');
                  }}
                  className="px-5 h-11 text-xs font-black uppercase tracking-wider rounded-xl bg-white hover:bg-slate-100 text-slate-900 flex items-center gap-2 transition-all shadow-sm"
                >
                  <GitBranch size={14} /> Rastrear Alocação no Legado
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
