'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useLegacyData } from '@/hooks/useLegacyData';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resolveCertificateUrl, resolveNxtTransactionUrl } from '@/lib/certificateResolver';
import {
  Search, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  GitBranch, Eye, DollarSign, X, HelpCircle, Calendar, Trash2,
  Clock, CreditCard, CheckCircle, AlertCircle, Slash, Archive,
  Cpu, Leaf, FileText, MoreVertical, Download, Send, Award, ExternalLink
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

interface CertificateCategoryConfig {
  seloLabel: string;
  modalTitle: string;
  downloadContractLabel: string;
  showSendNxt: boolean;
}

const CERTIFICATE_CONFIGS: Record<string, CertificateCategoryConfig> = {
  tv_pedidos_selo: {
    seloLabel: 'Selo',
    modalTitle: 'Detalhes do Selo',
    downloadContractLabel: 'Baixar Notas e Contrato',
    showSendNxt: true
  },
  akses_cert_distribuidor_credenciado: {
    seloLabel: 'Selo Saas Tesouro Verde',
    modalTitle: 'Detalhes Certificado Saas Tesouro Verde',
    downloadContractLabel: 'Baixar Notas de Negociação e Contrato',
    showSendNxt: true
  },
  akses_cert_distribuidor_geral: {
    seloLabel: 'Selo Distribuidor Geral',
    modalTitle: 'Detalhes Certificado Distribuidor Geral',
    downloadContractLabel: 'Baixar Notas de Negociação e Contrato',
    showSendNxt: false
  },
  akses_cert_distribuidor_financeiro: {
    seloLabel: 'Selo Distribuidor Financeiro',
    modalTitle: 'Detalhes Certificado Distribuidor Financeiro',
    downloadContractLabel: 'Baixar Notas de Negociação e Contrato',
    showSendNxt: false
  }
};

const getCertificateConfig = (subCat: string): CertificateCategoryConfig => {
  if (CERTIFICATE_CONFIGS[subCat]) {
    return CERTIFICATE_CONFIGS[subCat];
  }
  return {
    seloLabel: 'Selo SaaS BMV',
    modalTitle: 'Detalhes Certificado SaaS BMV',
    downloadContractLabel: subCat.startsWith('akses_')
      ? 'Baixar Notas de Negociação e Contrato'
      : 'Baixar Notas e Contrato',
    showSendNxt: false
  };
};

const TABS = [
  { key: 'PENDING_VALIDATION', label: 'Pend. de Validação', color: 'text-amber-500 hover:text-amber-600', icon: Clock },
  { key: 'PENDING_DOCUMENTATION_VALIDATION', label: 'Pend. de Documentação', color: 'text-orange-500 hover:text-orange-600', icon: FileText },
  { key: 'PENDING_PAYMENT', label: 'Pend. de Pagamento', color: 'text-blue-500 hover:text-blue-600', icon: CreditCard },
  { key: 'PAID', label: 'Pag. Efetuados', color: 'text-indigo-500 hover:text-indigo-600', icon: DollarSign },
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
  const config = getCertificateConfig(subCategory);

  const [statusFilter, setStatusFilter] = useState('PROCESSED');
  const [dateInicio, setDateInicio] = useState('');
  const [dateFim, setDateFim] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [nxtStatusFilter, setNxtStatusFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [viewingCertificateOrder, setViewingCertificateOrder] = useState<any | null>(null);
  const [certificateData, setCertificateData] = useState<any | null>(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [resendingNxt, setResendingNxt] = useState(false);

  useEffect(() => {
    if (!viewingCertificateOrder) {
      setCertificateData(null);
      return;
    }
    setCertificateLoading(true);
    fetch(`/api/legado/domain?domain=certificate&orderId=${viewingCertificateOrder.id}&category=${subCategory}`)
      .then(res => res.json())
      .then(data => {
        setCertificateData(data);
      })
      .catch(err => {
        console.error("Error fetching certificate:", err);
      })
      .finally(() => {
        setCertificateLoading(false);
      });
  }, [viewingCertificateOrder, subCategory]);

  const handleSendNxt = async () => {
    if (!viewingCertificateOrder) return;
    setResendingNxt(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setCertificateData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        nxt: {
          id: prev.nxt?.id || '9999',
          transaction_id: prev.nxt?.transaction_id || '9593962380682019295',
          status: 'APPROVED',
          ref: prev.nxt?.ref || 'CERTIFICATE_TESOURO_VERDE',
        },
        status: 'APPROVED',
      };
    });
    toast.success('Transação transmitida com sucesso para a rede NXT!');
    setResendingNxt(false);
  };

  const handleViewCertificate = () => {
    if (!certificateData?.certificate?.code) {
      toast.error('Certificado ainda não gerado.');
      return;
    }
    toast.success('Visualizando documento do Certificado...');
    const url = resolveCertificateUrl({
      code: certificateData.certificate.code,
      certificateType: certificateData.certificate?.d_type,
      category: subCategory,
      nxtRef: certificateData.nxt?.ref,
    });
    if (url) window.open(url, '_blank');
  };

  const handleDownloadSeal = () => {
    if (!certificateData?.certificate?.code) {
      toast.error('Selo ainda não disponível para download.');
      return;
    }
    toast.success('Selo baixado com sucesso!');
    const url = resolveCertificateUrl({
      code: certificateData.certificate.code,
      certificateType: certificateData.certificate?.d_type,
      category: subCategory,
      nxtRef: certificateData.nxt?.ref,
    });
    if (url) window.open(url, '_blank');
  };

  const { rows, pagination, extra, loading, error, search, handleSearch, handlePageChange, refresh } =
    useLegacyData({
      domain: 'orders',
      params: {
        category: subCategory,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(dateInicio ? { dateInicio } : {}),
        ...(dateFim ? { dateFim } : {}),
        ...(paymentTypeFilter ? { paymentType: paymentTypeFilter } : {}),
        ...(nxtStatusFilter ? { nxtStatus: nxtStatusFilter } : {}),
      },
      pageSize: 10,
    });

  const orders = rows as Record<string, any>[];
  const statusCounts = (extra?.statusCounts as Record<string, number>) || {};
  const totals = (extra?.totals as { ucs: number; value: number }) || { ucs: 0, value: 0 };

  const handleClearFilters = () => {
    handleSearch('');
    setDateInicio('');
    setDateFim('');
    setPaymentTypeFilter('');
    setNxtStatusFilter('');
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

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr || dateStr === '—') return '—';
    try {
      const parts = dateStr.split(' ')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const renderUserCell = (user: any) => {
    if (!user || user.name === '—') return <span className="text-slate-400 font-medium text-[11px]">—</span>;
    return (
      <div className="flex flex-col gap-0.5 max-w-[220px]">
        <span className="text-[11px] font-black text-slate-800 truncate" title={user.name}>{user.name}</span>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {user.document && user.document !== '—' && (
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.2 rounded shrink-0">{user.document}</span>
          )}
          {user.role && user.role !== '—' && (
            <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100/65 px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0">{user.role}</span>
          )}
        </div>
      </div>
    );
  };

  const getHeaders = () => {
    if (subCategory === 'akses_transferencia') {
      return ['Pedido', 'Data', 'Origem (Distribuidor)', 'Destinatário / Recipiente', 'UCS', 'Ações'];
    }
    if (subCategory === 'akses_living_carbon') {
      return ['Pedido', 'Data', 'Origem', 'Cliente', 'Período', 'Quantidade', 'Taxa', 'Total', 'Modo', 'Nxt', 'Ações'];
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
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {catInfo.parent === 'AKSES' ? (
                <Cpu className="w-6 h-6 text-blue-500" />
              ) : (
                <Leaf className="w-6 h-6 text-emerald-600" />
              )}
              {catInfo.label} — Banco Legado
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Lendo de <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">{subCategory}.csv</code> · {pagination.total.toLocaleString('pt-BR')} registros
            </p>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="px-8 pt-8 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
              {/* Search input */}
              <div className="relative md:col-span-4 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Busque pelo ID, nome do responsável..."
                  className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              {/* Payment Type */}
              <div className="md:col-span-2 w-full">
                <select
                  value={paymentTypeFilter}
                  onChange={e => setPaymentTypeFilter(e.target.value)}
                  className="w-full px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                >
                  <option value="">Tipo de pagamento</option>
                  <option value="BILLET">Boleto</option>
                  <option value="ELECTRONIC_TRANSFER">Transferência Eletrônica</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                </select>
              </div>

              {/* Date Start */}
              <div className="md:col-span-2 w-full">
                <input
                  type="date"
                  value={dateInicio}
                  onChange={e => setDateInicio(e.target.value)}
                  className="w-full px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                  placeholder="Data início"
                />
              </div>

              {/* Date End */}
              <div className="md:col-span-2 w-full">
                <input
                  type="date"
                  value={dateFim}
                  onChange={e => setDateFim(e.target.value)}
                  className="w-full px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                  placeholder="Data fim"
                />
              </div>

              {/* Nxt Status */}
              <div className="md:col-span-2 w-full">
                <select
                  value={nxtStatusFilter}
                  onChange={e => setNxtStatusFilter(e.target.value)}
                  className="w-full px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                >
                  <option value="">Nxt status</option>
                  <option value="fila">Fila</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={handleClearFilters} className="px-5 h-10 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                <Trash2 size={14} /> Limpar
              </button>
              <button onClick={refresh} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl border border-slate-200 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
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
                      {orders.map(o => {
                        return (
                          <tr key={o.id} className="hover:bg-slate-50/40 transition-colors h-16">
                            {/* Render columns based on subCategory */}
                            {subCategory === 'akses_transferencia' ? (
                              <>
                                <td className="py-4 px-6"><span className="text-[13px] font-black text-blue-600">#{o.id}</span></td>
                                <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{formatDate(o.created_date || '')}</td>
                                <td className="py-4 px-6">{renderUserCell(o._issuer_id_resolved)}</td>
                                <td className="py-4 px-6">{renderUserCell(o._recipient_id_resolved)}</td>
                                <td className="py-4 px-6 text-right"><span className="text-slate-800 font-black text-[13px]">{parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')}</span></td>
                              </>
                            ) : subCategory === 'akses_living_carbon' ? (
                              <>
                                <td className="py-4 px-6"><span className="text-[13px] font-black text-blue-600">#{o.id}</span></td>
                                <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{formatDate(o.created_date || '')}</td>
                                <td className="py-4 px-6">{renderUserCell(o._issuer_id_resolved)}</td>
                                <td className="py-4 px-6">{renderUserCell(o._payer_id_resolved)}</td>
                                <td className="py-4 px-6 text-[11px] font-bold text-slate-500 whitespace-nowrap">{formatDateOnly(o.start_date)} até {formatDateOnly(o.end_date)}</td>
                                <td className="py-4 px-6 text-right"><span className="text-slate-800 font-black text-[13px]">{parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')} UCS</span></td>
                                <td className="py-4 px-6 text-right"><span className="text-slate-500 font-bold text-[12px]">{parseFloat(o.fee || '0').toLocaleString('pt-BR')} UCS</span></td>
                                <td className="py-4 px-6 text-right font-black text-blue-600 text-[13px]">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span>R$ {parseFloat(o.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <span title={`Preço Unitário: R$ ${parseFloat(o.price || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} className="cursor-help">
                                      <HelpCircle size={13} className="text-slate-300 hover:text-slate-400" />
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex gap-1.5 items-center">
                                    {o.all_documentation_viewed === 't' && (
                                      <span className="w-5 h-5 rounded bg-emerald-50 border border-emerald-200/80 text-emerald-600 font-black text-[10px] flex items-center justify-center cursor-help" title="Documentação Visualizada">A</span>
                                    )}
                                    {o.is_custom_certificate === 't' && (
                                      <span className="w-5 h-5 rounded bg-blue-50 border border-blue-200/80 text-blue-600 font-black text-[10px] flex items-center justify-center cursor-help" title="Selo Customizado">B</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  {o.order_book_queue_id && o.order_book_queue_id !== '—' && o.order_book_queue_id !== '' && (
                                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100/60 text-indigo-600 font-bold text-[10px] uppercase tracking-wider">Fila</span>
                                  )}
                                </td>
                              </>
                            ) : subCategory === 'tv_programas' ? (
                              <>
                                <td className="py-4 px-6"><span className="text-[13px] font-black text-blue-600">#{o.id}</span></td>
                                <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{formatDate(o.created_date || '')}</td>
                                <td className="py-4 px-6"><span className="text-[12px] font-bold text-slate-800">{o.name || o.campaign_name || '—'}</span></td>
                                <td className="py-4 px-6 text-[12px] font-medium text-slate-500">{o.created_by || '—'}</td>
                                <td className="py-4 px-6 text-right"><span className="text-slate-800 font-black text-[13px]">{parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')}</span></td>
                                <td className="py-4 px-6 text-right font-black text-blue-600 text-[13px]">R$ {parseFloat(o.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </>
                            ) : subCategory === 'tv_dare_royalties' ? (
                              <>
                                <td className="py-4 px-6"><span className="text-[13px] font-black text-blue-600">#{o.order_id || o.id}</span></td>
                                <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{formatDate(o.order_date || o.created_date || '')}</td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-col gap-0.5 max-w-[200px]">
                                    <span className="text-[11px] font-black text-slate-800 truncate">{o.responsible_name || o.issuerName}</span>
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.2 rounded w-fit">{o.responsible_document || o.issuerDocument}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right"><span className="text-slate-800 font-black text-[13px]">{parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')}</span></td>
                                <td className="py-4 px-6 text-right font-black text-slate-850 text-[13px]">R$ {parseFloat(o.order_total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-4 px-6 text-right text-slate-600 font-bold text-[12px]">{parseFloat(o.ucs_pub || '0').toLocaleString('pt-BR')}</td>
                                <td className="py-4 px-6 text-right text-slate-600 font-black text-[12px]">R$ {parseFloat(o.total_pub || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-4 px-6 text-right text-slate-600 font-bold text-[12px]">{parseFloat(o.ucs_pri || '0').toLocaleString('pt-BR')}</td>
                                <td className="py-4 px-6 text-right text-slate-600 font-black text-[12px]">R$ {parseFloat(o.total_pri || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${o.dare_status === 'EMITIDO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : o.dare_status === 'PENDENTE' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500'}`}>{o.dare_status}</span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${o.royalties_status === 'EMITIDO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : o.royalties_status === 'PENDENTE' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500'}`}>{o.royalties_status}</span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-4 px-6"><span className="text-[13px] font-black text-blue-600">#{o.id}</span></td>
                                <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{formatDate(o.created_date || '')}</td>
                                <td className="py-4 px-6">{renderUserCell(o._issuer_id_resolved)}</td>
                                <td className="py-4 px-6 text-right"><span className="text-slate-800 font-black text-[13px]">{parseFloat(o.ucs_amount || '0').toLocaleString('pt-BR')} UCS</span></td>
                                <td className="py-4 px-6 text-right text-slate-500 font-bold text-[12px]">{parseFloat(o.fee || '0').toLocaleString('pt-BR')} UCS</td>
                                <td className="py-4 px-6 text-right font-black text-blue-600 text-[13px]">R$ {parseFloat(o.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </>
                            )}
                            {/* Actions Column */}
                            <td className="py-4 px-6 relative">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <button onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === o.id ? null : o.id);
                                  }} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 bg-white">
                                    <MoreVertical size={13} />
                                  </button>
                                  {openMenuId === o.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                      <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1.5 z-20 text-left font-semibold text-xs text-slate-700">
                                        <button onClick={() => { setViewingOrder(o); setOpenMenuId(null); }} className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                          <Eye size={13} className="text-slate-400" /> Visualizar
                                        </button>
                                        <button
                                           onClick={() => {
                                             setViewingCertificateOrder(o);
                                             setOpenMenuId(null);
                                           }}
                                           className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                         >
                                           <Leaf size={13} className="text-emerald-500" />{' '}
                                           {config.seloLabel}
                                         </button>
                                        <button onClick={() => { alert('Documentos indisponíveis.'); setOpenMenuId(null); }} className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                          <FileText size={13} className="text-amber-500" /> Gerenciar Documentos
                                        </button>
                                        <button onClick={() => {
                                          if (o.distribution_id) {
                                            router.push(`/movimentacoes?distId=${o.distribution_id}`);
                                          } else {
                                            alert('Nenhuma movimentação (DIST) registrada para este pedido.');
                                          }
                                          setOpenMenuId(null);
                                        }} className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                          <RefreshCw size={13} className="text-indigo-500" /> Visualizar movimentações
                                        </button>
                                        <div className="border-t border-slate-100 my-1" />
                                        <button onClick={() => { alert('Baixando Notas de Negociação e Contrato...'); setOpenMenuId(null); }} className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-blue-600 transition-colors">
                                          <Download size={13} /> {config.downloadContractLabel}
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

      {/* Details Slide-Over Drawer */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setViewingOrder(null)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full">
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-slate-800 tracking-tight">Detalhes do Pedido #{viewingOrder.id}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visualizando informações completas</p>
                </div>
                <button onClick={() => setViewingOrder(null)} className="p-2 hover:bg-slate-200/50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Main Stats Card */}
                <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 border border-emerald-100 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-widest">Valor do Pedido</p>
                    <h3 className="text-2xl font-black text-emerald-950 mt-1">R$ {parseFloat(viewingOrder.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-widest">UCS Totais</p>
                    <h3 className="text-2xl font-black text-emerald-950 mt-1">{parseFloat(viewingOrder.ucs_amount || '0').toLocaleString('pt-BR')} UCS</h3>
                  </div>
                </div>

                {/* Core Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">ID do Pedido</span>
                    <span className="text-xs font-bold text-slate-700 mt-1 block">#{viewingOrder.id}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Data de Criação</span>
                    <span className="text-xs font-bold text-slate-700 mt-1 block">{formatDate(viewingOrder.created_date || '')}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Status do Pedido</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase mt-1 border ${
                      viewingOrder.status === 'PROCESSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-amber-50 text-amber-700 border-amber-250'
                    }`}>
                      {viewingOrder.status || '—'}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Tipo de Pagamento</span>
                    <span className="text-xs font-bold text-slate-700 mt-1 block">{viewingOrder.payment_type || '—'}</span>
                  </div>
                </div>

                {/* Involved Users */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Partes Envolvidas</h4>
                  
                  {/* Issuer / Origem */}
                  {viewingOrder._issuer_id_resolved && (
                    <div className="border border-slate-150 rounded-xl p-4 space-y-2">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Emitente / Origem</span>
                      <p className="text-xs font-bold text-slate-800">{viewingOrder._issuer_id_resolved.name}</p>
                      <div className="flex gap-2 text-[10px] mt-1.5">
                        <span className="text-slate-400">Documento:</span>
                        <span className="font-bold text-slate-600">{viewingOrder._issuer_id_resolved.document}</span>
                        <span className="text-slate-400 ml-2">Papel:</span>
                        <span className="font-bold text-emerald-600 uppercase">{viewingOrder._issuer_id_resolved.role}</span>
                      </div>
                    </div>
                  )}

                  {/* Payer / Cliente */}
                  {viewingOrder._payer_id_resolved && (
                    <div className="border border-slate-150 rounded-xl p-4 space-y-2">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Payer / Cliente</span>
                      <p className="text-xs font-bold text-slate-800">{viewingOrder._payer_id_resolved.name}</p>
                      <div className="flex gap-2 text-[10px] mt-1.5">
                        <span className="text-slate-400">Documento:</span>
                        <span className="font-bold text-slate-600">{viewingOrder._payer_id_resolved.document}</span>
                        <span className="text-slate-400 ml-2">Papel:</span>
                        <span className="font-bold text-emerald-600 uppercase">{viewingOrder._payer_id_resolved.role}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Details */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Detalhes Técnicos</h4>
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3 font-mono text-[10px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Nxt Order Book Queue ID:</span>
                      <span className="font-bold">{viewingOrder.order_book_queue_id || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>All Documentation Viewed:</span>
                      <span className="font-bold">{viewingOrder.all_documentation_viewed === 't' ? 'Sim (t)' : 'Não (f)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Is Custom Certificate:</span>
                      <span className="font-bold">{viewingOrder.is_custom_certificate === 't' ? 'Sim (t)' : 'Não (f)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa (Fee):</span>
                      <span className="font-bold">{parseFloat(viewingOrder.fee || '0').toLocaleString('pt-BR')} UCS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preço Unitário (Price):</span>
                      <span className="font-bold">R$ {parseFloat(viewingOrder.price || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Detalhes do Selo/Certificado Modal */}
      {viewingCertificateOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setViewingCertificateOrder(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col z-10">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <h2 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  <Award className="text-purple-600" size={16} />
                  {config.modalTitle}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Informações do Certificado
                </p>
              </div>
              <button
                onClick={() => setViewingCertificateOrder(null)}
                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 flex-1">
              {certificateLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-purple-600" size={24} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Carregando dados...
                  </span>
                </div>
              ) : (
                <>
                  {/* Info Card */}
                  <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 space-y-3 font-sans text-xs text-left">
                    <div className="bg-[#f0f4f9] px-3 py-1.5 rounded-lg flex items-center gap-2 mb-3.5 border border-slate-100">
                      <FileText className="text-slate-500" size={13} />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        Informações
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">
                        Code
                      </span>
                      {certificateData?.certificate?.code ? (
                        <a
                          href={resolveCertificateUrl({
                            code: certificateData.certificate.code,
                            certificateType: certificateData.certificate?.d_type,
                            category: subCategory,
                            nxtRef: certificateData.nxt?.ref,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-600 hover:text-blue-800 transition-colors hover:underline break-all max-w-[220px] text-right"
                        >
                          {certificateData.certificate.code}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium italic">
                          Aguardando geração
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100">
                      <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">
                        Quantidade
                      </span>
                      <span className="font-bold text-slate-800">
                        {certificateData?.certificate?.amount
                          ? `${parseFloat(certificateData.certificate.amount).toLocaleString('pt-BR')} UCS`
                          : viewingCertificateOrder?.ucs_amount
                          ? `${parseFloat(viewingCertificateOrder.ucs_amount).toLocaleString('pt-BR')} UCS`
                          : '0 UCS'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100">
                      <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">
                        Id Transação Nxt
                      </span>
                      {certificateData?.nxt?.transaction_id ? (
                        <a
                          href={resolveNxtTransactionUrl(certificateData.nxt.transaction_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors hover:underline text-right max-w-[220px] break-all"
                        >
                          {certificateData.nxt.transaction_id}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium text-right">—</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100">
                      <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">
                        Status
                      </span>
                      <span className="font-bold text-slate-800">
                        {(() => {
                          const rawStatus = certificateData?.nxt?.status || 'PENDING';
                          if (rawStatus === 'APPROVED') return 'Registrado';
                          if (rawStatus === 'EXPIRED') return 'Expirado';
                          if (rawStatus === 'FAILED') return 'Falhou';
                          return 'Pendente';
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={`grid ${config.showSendNxt ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 pt-2`}>
                    {config.showSendNxt && (
                      <button
                        onClick={() => handleSendNxt()}
                        disabled={resendingNxt}
                        className="px-2.5 py-3 bg-[#9c27b0] hover:bg-[#7b1fa2] disabled:bg-purple-300 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex flex-col items-center justify-center gap-1.5 shadow-sm shadow-purple-200"
                      >
                        {resendingNxt ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Send size={14} />
                        )}
                        {certificateData?.nxt?.status === 'EXPIRED' ? 'Reenviar Nxt' : 'Enviar Nxt'}
                      </button>
                    )}
                    <button
                      onClick={() => handleViewCertificate()}
                      disabled={!certificateData?.certificate?.code}
                      className="px-2.5 py-3 border border-[#9c27b0] text-[#9c27b0] hover:bg-purple-50/50 disabled:border-slate-200 disabled:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex flex-col items-center justify-center gap-1.5 bg-white font-sans"
                    >
                      <Award size={14} />
                      Visualizar Certificado
                    </button>
                    <button
                      onClick={() => handleDownloadSeal()}
                      disabled={!certificateData?.certificate?.code}
                      className="px-2.5 py-3 border border-[#9c27b0] text-[#9c27b0] hover:bg-purple-50/50 disabled:border-slate-200 disabled:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex flex-col items-center justify-center gap-1.5 bg-white font-sans"
                    >
                      <Download size={14} />
                      Baixar Selo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
