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

export function PedidosContent() {
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
        {/* Page Top Header */}
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

        {/* Filter Bar */}
        <div className="px-8 pt-8 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Busque pelo ID do pedido..."
                className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
              />
            </div>
            <button onClick={handleClearFilters} className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
              <Trash2 size={14} /> Limpar
            </button>
            <button onClick={refresh} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl border border-slate-200 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex-1 p-8 space-y-6 flex flex-col min-h-0">
          <div className="flex flex-wrap gap-1 border-b border-slate-200/80 pb-px shrink-0">
            {TABS.map(tab => {
              const count = statusCounts[tab.key] ?? 0;
              const isActive = statusFilter === tab.key;
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setStatusFilter(tab.key)} className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${isActive ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  <Icon size={14} /> {tab.label} <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center min-h-[350px]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center text-red-500 text-xs font-bold uppercase">{error}</div>
            ) : orders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold uppercase">Nenhum registro encontrado</div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 h-12">
                        {getHeaders().map(h => (
                          <th key={h} className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6"><span className="text-[13px] font-black text-blue-600">#{o.id}</span></td>
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{formatDate(o.created_date || '')}</td>
                          <td className="py-4 px-6"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarBg(o.issuerName || '')}`}>{getInitials(o.issuerName || '')}</div><div className="text-[12px] font-bold text-slate-800 max-w-[200px] truncate">{o.issuerName || '—'}</div></div></td>
                          <td className="py-4 px-6 text-right"><span className="text-slate-800 font-black text-[13px]">{parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')}</span></td>
                          <td className="py-4 px-6 text-right font-black text-blue-600 text-[13px]">R$ {parseFloat(o.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6"><button className="h-8 px-3 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-1 transition-colors border border-slate-200 bg-white rounded-lg"><Eye size={12}/>Ver</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="h-16 flex items-center justify-between px-8 border-t border-slate-150 bg-slate-50/50">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3.5 h-9 rounded-xl border border-slate-200 hover:bg-white bg-slate-50 flex items-center gap-1 text-[11px] font-bold text-slate-500 disabled:opacity-40">
                      <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                    </button>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3.5 h-9 rounded-xl border border-slate-200 hover:bg-white bg-slate-50 flex items-center gap-1 text-[11px] font-bold text-slate-500 disabled:opacity-40">
                      Próximo <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
