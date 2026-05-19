'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  GitBranch, Eye, DollarSign, X, HelpCircle, Calendar, Trash2,
  Clock, CreditCard, CheckCircle, AlertCircle, Slash, Archive
} from 'lucide-react';

type SubCategory =
  | 'akses_compra'
  | 'akses_venda'
  | 'akses_transferencia'
  | 'akses_cert_cliente'
  | 'akses_cert_distribuidor_financeiro'
  | 'akses_cert_distribuidor_geral'
  | 'akses_cert_distribuidor_credenciado'
  | 'akses_living_carbon'
  | 'akses_cde'
  | 'akses_intencao_movimentacao'
  | 'tv_pedidos_selo'
  | 'tv_dare_royalties'
  | 'tv_compensacao'
  | 'tv_programas';

const CATEGORY_INFO: Record<SubCategory, { title: string; parent: string; label: string }> = {
  akses_compra: { title: 'PEDIDOS DE COMPRA', parent: 'AKSES', label: 'Pedidos Compra' },
  akses_venda: { title: 'PEDIDOS DE VENDA', parent: 'AKSES', label: 'Pedidos de Venda' },
  akses_transferencia: { title: 'PEDIDOS DE TRANSFERÊNCIA', parent: 'AKSES', label: 'Pedidos de Transferência' },
  akses_cert_cliente: { title: 'PEDIDOS DE CERTIFICADO (CLIENTE)', parent: 'AKSES', label: 'Pedidos de Certificado (Cli.)' },
  akses_cert_distribuidor_financeiro: { title: 'CERTIFICADOS - DISTRIBUIÇÃO FINANCEIRA', parent: 'AKSES', label: 'Cert. Dist. Financeira' },
  akses_cert_distribuidor_geral: { title: 'CERTIFICADOS - DISTRIBUIÇÃO GERAL', parent: 'AKSES', label: 'Cert. Dist. Geral' },
  akses_cert_distribuidor_credenciado: { title: 'CERTIFICADOS - SAAS TESOURO VERDE', parent: 'AKSES', label: 'Cert. Saas Tesouro Verde' },
  akses_living_carbon: { title: 'CERTIFICADOS - SAAS BMV (LIVING CARBON)', parent: 'AKSES', label: 'Cert. SaaS BMV (Living Carbon)' },
  akses_cde: { title: 'CERTIFICADOS - CDE (STOCK)', parent: 'AKSES', label: 'Cert. CDE (Stock)' },
  akses_intencao_movimentacao: { title: 'INTENÇÕES DE MOVIMENTAÇÃO', parent: 'AKSES', label: 'Intenção de Movimentação' },
  tv_pedidos_selo: { title: 'PEDIDOS SELO', parent: 'TESOURO VERDE', label: 'Pedidos Selo' },
  tv_dare_royalties: { title: 'DARE / ROYALTIES', parent: 'TESOURO VERDE', label: 'DARE/Royalties' },
  tv_compensacao: { title: 'INTENÇÕES DE COMPENSAÇÃO', parent: 'TESOURO VERDE', label: 'Intenções de Compensação' },
  tv_programas: { title: 'PROGRAMAS / CAMPANHAS', parent: 'TESOURO VERDE', label: 'Programas / Campanhas' },
};

const TABS = [
  { key: 'PENDING_APPROVAL', label: 'Pend. de Aprovação', color: 'text-amber-500 hover:text-amber-600', icon: Clock },
  { key: 'PENDING_PAYMENT', label: 'Pend. de Pagamento', color: 'text-blue-500 hover:text-blue-600', icon: CreditCard },
  { key: 'PAID', label: 'Pag. Efetuados', color: 'text-indigo-500 hover:text-indigo-600', icon: CheckCircle },
  { key: 'PRE_PROCESSED', label: 'Pré-processados', color: 'text-violet-500 hover:text-violet-600', icon: RefreshCw },
  { key: 'PROCESSED', label: 'Processados', color: 'text-emerald-600 hover:text-emerald-700', icon: CheckCircle },
  { key: 'FAILED', label: 'Falhas', color: 'text-red-500 hover:text-red-600', icon: AlertCircle },
  { key: 'DENIED', label: 'Negados', color: 'text-rose-500 hover:text-rose-600', icon: Slash },
  { key: 'ARCHIVED', label: 'Arquivados', color: 'text-slate-500 hover:text-slate-600', icon: Archive },
];

export default function PedidosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const subCategory = (searchParams?.get('category') as SubCategory) || 'akses_compra';
  const catInfo = CATEGORY_INFO[subCategory] || CATEGORY_INFO.akses_compra;

  const [statusFilter, setStatusFilter] = useState('PROCESSED');
  const [dateInicio, setDateInicio] = useState('');
  const [dateFim, setDateFim] = useState('');
  const [selectedDareRoyalties, setSelectedDareRoyalties] = useState<any | null>(null);

  const { rows, pagination, extra, loading, error, search, handleSearch, handlePageChange, refresh } =
    useLegacyData({
      domain: 'orders',
      params: {
        category: subCategory,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(dateInicio ? { dateInicio } : {}),
        ...(dateFim ? { dateFim } : {}),
      },
      pageSize: 10,
    });

  const orders = rows as Record<string, string>[];
  const statusCounts = (extra?.statusCounts as Record<string, number>) || {};
  const totals = (extra?.totals as { ucs: number; value: number }) || { ucs: 0, value: 0 };

  const handleClearFilters = () => {
    handleSearch('');
    setDateInicio('');
    setDateFim('');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarBg = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
    ];
    return colors[hash % colors.length];
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '—') return '—';
    if (dateStr.includes('/')) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateStr;
    }
  };

  // Dynamic headers config depending on subCategory
  const getHeaders = () => {
    if (subCategory === 'akses_transferencia') {
      return ['Pedido', 'Data', 'Origem (Distribuidor)', 'Destinatário / Recipiente', 'UCS', 'Ações'];
    }
    if (subCategory === 'akses_living_carbon') {
      return ['Pedido', 'Data', 'Beneficiário', 'Pagador / Payer', 'UCS', 'Total', 'Ações'];
    }
    if (subCategory === 'tv_programas') {
      return ['Pedido', 'Data', 'Nome do Programa', 'Criado Por', 'UCS', 'Total', 'Ações'];
    }
    if (subCategory === 'tv_dare_royalties') {
      return ['Pedido', 'Data', 'Cliente', 'UCS', 'Total Pedido', 'UCS PUB', 'TOTAL PUB', 'UCS PRI', 'TOTAL PRI', 'DARE', 'Royalties', 'Ações'];
    }
    return ['Pedido', 'Data', 'Origem', 'Quantidade', 'Taxa', 'Total', 'Ações'];
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Page Top Header with Title and Breadcrumbs */}
        <div className="bg-white border-b border-slate-200/80 px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">
              {catInfo.title}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
              Arquivo: <code className="bg-slate-50 px-1 py-0.5 rounded text-emerald-600">{subCategory}.csv</code>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Home &nbsp;&gt;&nbsp; {catInfo.parent} &nbsp;&gt;&nbsp; <strong className="text-slate-600">{catInfo.label}</strong>
            </span>
          </div>
        </div>

        {/* Filter and Search Panel */}
        <div className="px-8 pt-8 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
            
            {/* General Text Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Busque pelo ID do pedido, nome do responsável do pedido..."
                className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
              />
            </div>

            {/* Date Picker Start */}
            <div className="relative w-full md:w-44">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateInicio}
                onChange={e => setDateInicio(e.target.value)}
                className="w-full pl-10 pr-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                placeholder="Data início"
              />
            </div>

            {/* Date Picker End */}
            <div className="relative w-full md:w-44">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFim}
                onChange={e => setDateFim(e.target.value)}
                className="w-full pl-10 pr-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                placeholder="Data fim"
              />
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={handleClearFilters}
              className="w-full md:w-auto px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              Limpar
            </button>

            {/* Manual Refresh */}
            <button
              onClick={refresh}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-8 space-y-6 flex flex-col min-h-0">
          
          {/* Status Tabs Header */}
          <div className="flex flex-wrap gap-1 border-b border-slate-200/80 pb-px shrink-0">
            {TABS.map(tab => {
              const count = statusCounts[tab.key] ?? 0;
              const isActive = statusFilter === tab.key;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
                    isActive
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Content Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center min-h-[350px]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center min-h-[350px] text-red-500 text-xs font-bold uppercase">
                {error}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[350px] text-slate-400 text-xs font-bold uppercase">
                Nenhum registro encontrado
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 h-12">
                        {getHeaders().map((h, i) => (
                          <th
                            key={h}
                            className={`py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap ${
                              i >= getHeaders().length - 3 && h !== 'Ações' && subCategory !== 'tv_dare_royalties' ? 'text-right' : 'text-left'
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map(o => {
                        const dateVal = formatDate(o.created_date || o.original_created_at || o.order_date || '—');
                        
                        // For DARE / Royalties subcategory
                        if (subCategory === 'tv_dare_royalties') {
                          return (
                            <tr key={o.id} className="hover:bg-slate-50/40 transition-colors group">
                              <td className="py-4 px-6">
                                <span className="text-[13px] font-black text-emerald-600">#{o.order_id || '—'}</span>
                              </td>
                              <td className="py-4 px-6 text-[11px] font-bold text-slate-400 whitespace-nowrap">
                                {o.order_date?.split(' ')[0] || '—'}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarBg(o.responsible_name)}`}>
                                    {getInitials(o.responsible_name)}
                                  </div>
                                  <div>
                                    <div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate" title={o.responsible_name}>
                                      {o.responsible_name || '—'}
                                    </div>
                                    {o.responsible_document && (
                                      <div className="text-[9px] text-slate-400 font-mono">{o.responsible_document}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="text-slate-800 font-black text-[13px]">{o.ucs_amount || '0'}</span>
                                <span className="text-[9px] text-slate-400 ml-1 font-bold">UCS</span>
                              </td>
                              <td className="py-4 px-6 text-[12px] font-bold text-slate-800 whitespace-nowrap">
                                R$ {parseFloat(o.order_total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium">
                                {o.ucs_pub || '0'}
                              </td>
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium whitespace-nowrap">
                                R$ {parseFloat(o.total_pub || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium">
                                {o.ucs_pri || '0'}
                              </td>
                              <td className="py-4 px-6 text-[12px] text-slate-600 font-medium whitespace-nowrap">
                                R$ {parseFloat(o.total_pri || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
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
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => setSelectedDareRoyalties(o)}
                                  className="h-8 px-3 text-[10px] font-bold rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center gap-1 transition-colors border border-slate-200 bg-white"
                                >
                                  <Eye size={12}/>Visualizar
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        // For normal order list
                        return (
                          <tr key={o.id} className="hover:bg-slate-50/40 transition-colors group">
                            
                            {/* Column 1: Order ID */}
                            <td className="py-4 px-6">
                              <span className="text-[13px] font-black text-blue-600 hover:underline cursor-pointer">
                                #{o.id}
                              </span>
                            </td>

                            {/* Column 2: Date */}
                            <td className="py-4 px-6 text-[11px] font-bold text-slate-400 whitespace-nowrap">
                              {dateVal}
                            </td>

                            {/* Column 3: Primary Party / Name */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {subCategory !== 'tv_programas' && (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarBg(o.issuerName || o.name || 'P')}`}>
                                    {getInitials(o.issuerName || o.name || 'P')}
                                  </div>
                                )}
                                <div>
                                  {subCategory === 'tv_programas' ? (
                                    <span className="text-[13px] font-bold text-slate-800">{o.name || o.campaign_name || '—'}</span>
                                  ) : (
                                    <>
                                      <div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate" title={o.issuerName}>
                                        {o.issuerName || '—'}
                                      </div>
                                      {o.issuerDocument && <div className="text-[9px] text-slate-400 font-mono">{o.issuerDocument}</div>}
                                      {o.issuerRole && o.issuerRole !== '—' && (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">{o.issuerRole}</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Column 4: Quantity (UCS) */}
                            <td className="py-4 px-6 text-right">
                              <span className="text-slate-800 font-black text-[13px]">
                                {parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold ml-1 font-bold">UCS</span>
                            </td>

                            {/* Column 5: Fee (Taxa) */}
                            {subCategory !== 'akses_transferencia' && (
                              <td className="py-4 px-6 text-right text-[12px] font-bold text-slate-400">
                                R$ {parseFloat(o.fee || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            )}

                            {/* Column 6: Total (BRL) */}
                            {subCategory !== 'akses_transferencia' && (
                              <td className="py-4 px-6 text-right font-black text-blue-600 text-[13px] whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span>
                                    {o.total || o.royalties_total
                                      ? `R$ ${parseFloat(o.total || o.royalties_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                      : '—'}
                                  </span>
                                  <HelpCircle size={12} className="text-slate-300 cursor-help" />
                                </div>
                              </td>
                            )}

                            {/* Column 7: Actions */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1.5">
                                {o.distribution_id && (
                                  <button
                                    onClick={() => window.open(`/legado#trace=${o.distribution_id}`, '_blank')}
                                    className="h-8 px-3 text-[10px] font-bold rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors border border-slate-200 bg-white"
                                  >
                                    <GitBranch size={12} />
                                    <span>#{o.distribution_id}</span>
                                  </button>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="h-16 flex items-center justify-between px-8 border-t border-slate-150 bg-slate-50/50">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Página {pagination.page} de {pagination.totalPages} de {pagination.total} registros. &nbsp;&nbsp;&nbsp; 10 itens por página.
                  </p>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Anterior Button */}
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-3.5 h-9 rounded-xl border border-slate-200 hover:bg-white bg-slate-50 flex items-center gap-1 text-[11px] font-bold text-slate-500 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Anterior
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pNum = i + 1;
                      const isCurrent = pagination.page === pNum;
                      return (
                        <button
                          key={pNum}
                          onClick={() => handlePageChange(pNum)}
                          className={`w-9 h-9 rounded-xl border text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100'
                              : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-600'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    {/* Próximo Button */}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-3.5 h-9 rounded-xl border border-slate-200 hover:bg-white bg-slate-50 flex items-center gap-1 text-[11px] font-bold text-slate-500 disabled:opacity-40 transition-colors"
                    >
                      Próximo
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
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
