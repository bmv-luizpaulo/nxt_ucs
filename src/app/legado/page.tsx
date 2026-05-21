'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Search, Play, CheckCircle, AlertCircle, Clock, ChevronRight, Table2, ArrowUpDown, RefreshCw, Filter, X, Loader2, Terminal, BarChart3, GitBranch, ArrowRight, Package, Users, Layers, FileText, Hash, ShieldAlert, Trash2, History, Sparkles, Ban, RotateCw, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableMeta {
  name: string;
  file: string;
  domain: string;
  sizeKB: number;
  rows: number;
  columns: string[];
  columnCount: number;
}

interface QueryResult {
  table: string;
  columns: string[];
  rows: Record<string, string>[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface EtlScript {
  command: string;
  label: string;
  tables: string[];
  priority: number;
}

type EtlStatus = 'idle' | 'running' | 'done' | 'error';

interface EnrichedUser {
  roleUserId: string;
  role: string;
  userId: string;
  name: string;
  document: string;
  documentType: string;
  type: string;
}

interface TraceResult {
  distributionId: string;
  summary: {
    distributionType: string;
    distributionStatus: string;
    harvestYear: string;
    totalUcsAmount: number;
    totalUcsInBatches: number;
    availableUcsInBatches: number;
    transactionCount: number;
    ucsBatchCount: number;
    ordersFound: number;
  };
  distribution: Record<string, string> | null;
  harvest: Record<string, string> | null;
  area: Record<string, string> | null;
  transactions: (Record<string, string> & { issuer: EnrichedUser | null; recipient: EnrichedUser | null })[];
  ucsBatches: (Record<string, string> & { owner: EnrichedUser | null })[];
  orders: {
    akses: Record<string, string>[];
    tesouroVerde: Record<string, string>[];
    transfers: Record<string, string>[];
    ownership: Record<string, string>[];
  };
}

const DOMAIN_COLORS: Record<string, string> = {
  'Core':          'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'Financeiro':    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'Tesouro Verde': 'bg-green-500/20 text-green-300 border-green-500/40',
  'Akses':         'bg-purple-500/20 text-purple-300 border-purple-500/40',
  'Mundi':         'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'Sistema':       'bg-slate-500/20 text-slate-300 border-slate-500/40',
  'Outros':        'bg-gray-500/20 text-gray-300 border-gray-500/40',
};

const RUNNERS = [
  {
    key: 'platforms',
    label: 'Plataformas e Tags',
    priority: 1,
    domain: 'Core',
    phase: 'Phase A: Base',
    tables: ['dbo_platform', 'dbo_platform_tags'],
    subImporters: ['platforms', 'platform_tags']
  },
  {
    key: 'users',
    label: 'Usuários e Autenticação',
    priority: 2,
    domain: 'Core',
    phase: 'Phase A: Base',
    tables: ['dbo_user', 'dbo_authentication'],
    subImporters: ['users']
  },
  {
    key: 'distribution_configs',
    label: 'Configurações de Distribuição',
    priority: 3,
    domain: 'Core',
    phase: 'Phase A: Base',
    tables: ['dbo_distribution_config'],
    subImporters: ['distribution_configs']
  },
  {
    key: 'projects',
    label: 'Projetos',
    priority: 4,
    domain: 'Core',
    phase: 'Phase A: Base',
    tables: ['dbo_project'],
    subImporters: ['projects']
  },
  {
    key: 'areas',
    label: 'Áreas e Fazendas',
    priority: 5,
    domain: 'Core',
    phase: 'Phase B: Dependencies',
    tables: ['dbo_area', 'dbo_yearly_area_info'],
    subImporters: ['areas']
  },
  {
    key: 'role_users',
    label: 'Funções de Usuários',
    priority: 6,
    domain: 'Core',
    phase: 'Phase B: Dependencies',
    tables: ['dbo_role_user'],
    subImporters: ['role_users']
  },
  {
    key: 'quotes',
    label: 'Cotações UCS',
    priority: 7,
    domain: 'Core',
    phase: 'Phase B: Dependencies',
    tables: ['dbo_ucs_quote'],
    subImporters: ['quotes']
  },
  {
    key: 'harvests',
    label: 'Safras',
    priority: 8,
    domain: 'Core',
    phase: 'Phase C: Intermediates',
    tables: ['dbo_harvest'],
    subImporters: ['harvests']
  },
  {
    key: 'cprs',
    label: 'CPRs',
    priority: 9,
    domain: 'Core',
    phase: 'Phase C: Intermediates',
    tables: ['dbo_cpr', 'dbo_rl_cpr_areas', 'dbo_rl_cpr_file'],
    subImporters: ['cprs']
  },
  {
    key: 'ucs',
    label: 'Lotes UCS (Particionados)',
    priority: 10,
    domain: 'Sistema',
    phase: 'Phase D: Operational',
    tables: ['dbo_ucs_batch', 'dbo_ucs_batch__2010', 'dbo_ucs_batch__2020', 'dbo_ucs_batch__2022', 'dbo_ucs_batch__2023'],
    subImporters: ['ucs_batches', 'ucs_batches_2010', 'ucs_batches_2020', 'ucs_batches_2022', 'ucs_batches_2023']
  },
  {
    key: 'distributions',
    label: 'Distribuições',
    priority: 11,
    domain: 'Core',
    phase: 'Phase D: Operational',
    tables: ['dbo_distribution'],
    subImporters: ['distributions']
  },
  {
    key: 'balances',
    label: 'Saldos Consolidados',
    priority: 12,
    domain: 'Financeiro',
    phase: 'Phase D: Operational',
    tables: ['dbo_consolidated_balance', 'dbo_consolidated_balance_per_year'],
    subImporters: ['consolidated_balances', 'consolidated_balances_per_year']
  },
  {
    key: 'transactions',
    label: 'Transações de Lotes',
    priority: 13,
    domain: 'Sistema',
    phase: 'Phase D: Operational',
    tables: ['dbo_transaction'],
    subImporters: ['transactions']
  },
  {
    key: 'ownership_transfers',
    label: 'Transferências de Titularidade',
    priority: 14,
    domain: 'Sistema',
    phase: 'Phase D: Operational',
    tables: ['dbo_ownership_transfer'],
    subImporters: ['ownership_transfers']
  },
  {
    key: 'financial',
    label: 'Financeiro (Contas a Pagar)',
    priority: 15,
    domain: 'Financeiro',
    phase: 'Phase D: Operational',
    tables: ['financial_participant', 'financial_bill_to_pay', 'financial_bill_write_off'],
    subImporters: ['financial_participants', 'financial_bills', 'financial_write_offs']
  },
  {
    key: 'tv',
    label: 'Pedidos Tesouro Verde',
    priority: 16,
    domain: 'Tesouro Verde',
    phase: 'Phase D: Operational',
    tables: ['plat_tesouro_verde_certificate_order', 'plat_tesouro_verde_partners', 'plat_tesouro_verde_campaigns'],
    subImporters: ['tv_certificate_orders', 'tv_partners', 'tv_campaigns', 'tv_dare_royalties', 'tv_compensation_intents']
  },
  {
    key: 'akses',
    label: 'Pedidos Akses',
    priority: 17,
    domain: 'Akses',
    phase: 'Phase D: Operational',
    tables: ['plat_akses_distributor_certificate_order', 'plat_akses_transfer_order', 'plat_akses_purchase_order'],
    subImporters: ['akses_distributor_certificate_orders', 'akses_client_certificate_orders', 'akses_transfer_orders', 'akses_purchase_orders', 'akses_living_carbon_orders', 'akses_sale_orders', 'stock_availability_cert_orders', 'movement_intention_orders']
  },
  {
    key: 'adjustments',
    label: 'Ajustes de Lotes',
    priority: 18,
    domain: 'Sistema',
    phase: 'Phase D: Operational',
    tables: ['dbo_adjustment'],
    subImporters: ['adjustments']
  },
  {
    key: 'blocked_ucs',
    label: 'UCS Bloqueadas',
    priority: 19,
    domain: 'Sistema',
    phase: 'Phase D: Operational',
    tables: ['dbo_blocked_ucs'],
    subImporters: ['blocked_ucs']
  }
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LegadoExplorer() {
  const [activeTab, setActiveTab] = useState<'explorer' | 'etl' | 'rastreio'>('rastreio');

  // Rastreio state
  const [traceInput, setTraceInput] = useState('');
  const [traceType, setTraceType] = useState<'distributionId' | 'transactionId' | 'orderId'>('distributionId');
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  // Explorer state
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableMeta | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [search, setSearch] = useState('');
  const [searchCol, setSearchCol] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [domainFilter, setDomainFilter] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ETL state
  const [etlStatusData, setEtlStatusData] = useState<any>(null);
  const [activeLogKey, setActiveLogKey] = useState<string | null>(null);
  const [customVersion, setCustomVersion] = useState<string>('v1');
  const [rollbackVersion, setRollbackVersion] = useState<string>('v1');
  const [dlqViewKey, setDlqViewKey] = useState<string | null>(null);
  const [dlqRecords, setDlqRecords] = useState<any[]>([]);
  const [dlqPagination, setDlqPagination] = useState<{ total: number; page: number; pageSize: number; totalPages: number } | null>(null);
  const [dlqPage, setDlqPage] = useState<number>(1);
  const [dlqLoading, setDlqLoading] = useState<boolean>(false);
  const [isPollRunning, setIsPollRunning] = useState<boolean>(true);
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load table list on mount
  useEffect(() => {
    fetch('/api/legado/tables')
      .then(r => r.json())
      .then(data => { setTables(data.tables || []); setLoadingTables(false); });
  }, []);

  const queryTable = useCallback(async (tableName: string, p = 1, s = search, sc = searchCol) => {
    setLoadingQuery(true);
    setQueryResult(null);
    const params = new URLSearchParams({ table: tableName, page: String(p), pageSize: String(pageSize), search: s, searchCol: sc });
    const res = await fetch(`/api/legado/query?${params}`);
    const data = await res.json();
    setQueryResult(data);
    setLoadingQuery(false);
  }, [search, searchCol, pageSize]);

  const handleSelectTable = (t: TableMeta) => {
    setSelectedTable(t);
    setSearch('');
    setSearchCol('');
    setPage(1);
    setSortCol(null);
    queryTable(t.name, 1, '', '');
  };

  const handleSearch = () => {
    setPage(1);
    if (selectedTable) queryTable(selectedTable.name, 1, search, searchCol);
  };

  const handleSort = (col: string) => {
    const dir = sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortCol(col);
    setSortDir(dir);
  };

  const fetchEtlStatus = useCallback(async (selectedKey?: string) => {
    try {
      const keyToFetch = selectedKey || activeLogKey || (etlStatusData?.activeProcess?.importerKey);
      const url = keyToFetch 
        ? `/api/legado/etl/status?importerKey=${keyToFetch}`
        : '/api/legado/etl/status';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEtlStatusData(data);
      }
    } catch (err) {
      console.error('Error fetching ETL status:', err);
    }
  }, [activeLogKey, etlStatusData?.activeProcess?.importerKey]);

  // Main polling effect
  useEffect(() => {
    if (!isPollRunning) return;
    
    // Check if there is an active running process
    const isRunning = !!(etlStatusData?.activeProcess);
    const intervalTime = isRunning ? 3000 : 10000;

    // Fetch immediately
    fetchEtlStatus();

    const interval = setInterval(() => {
      fetchEtlStatus();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [fetchEtlStatus, isPollRunning, etlStatusData?.activeProcess]);

  const handleRun = async (importerKey: string, options: { dryRun?: boolean; resume?: boolean } = {}) => {
    setRunningActionKey(`${importerKey}-${options.dryRun ? 'dry' : options.resume ? 'resume' : 'live'}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/legado/etl/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importerKey,
          dryRun: !!options.dryRun,
          resume: !!options.resume,
          version: customVersion
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar a importação');
      }
      setSuccessMessage(data.message || `Importação de "${importerKey}" iniciada com sucesso em background.`);
      setActiveLogKey(importerKey);
      // Fetch immediately to capture the running process PID
      fetchEtlStatus(importerKey);
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setRunningActionKey(null);
    }
  };

  const handleStop = async () => {
    setRunningActionKey('stop');
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/legado/etl/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao interromper o processo');
      }
      setSuccessMessage(data.message || 'Processo de importação interrompido com sucesso.');
      fetchEtlStatus();
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setRunningActionKey(null);
    }
  };

  const handleRollback = async (collectionName?: string) => {
    setRunningActionKey(`rollback-${collectionName || 'all'}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/legado/etl/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: rollbackVersion,
          collection: collectionName
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar rollback');
      }
      setSuccessMessage(data.message || 'Processo de rollback em background iniciado.');
      setActiveLogKey('rollback');
      fetchEtlStatus('rollback');
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setRunningActionKey(null);
    }
  };

  const fetchDlqRecords = async (importerKey: string, page = 1) => {
    setDlqLoading(true);
    setDlqViewKey(importerKey);
    setDlqPage(page);
    try {
      const res = await fetch(`/api/legado/etl/dlq?importerKey=${importerKey}&page=${page}&pageSize=10`);
      if (res.ok) {
        const data = await res.json();
        setDlqRecords(data.records || []);
        setDlqPagination(data.pagination || null);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Erro ao carregar registros DLQ');
      }
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setDlqLoading(false);
    }
  };

  const getRunnerState = (runner: typeof RUNNERS[0]) => {
    const isActive = etlStatusData?.activeProcess?.importerKey === runner.key;
    if (isActive) {
      return {
        status: 'running',
        dryRun: etlStatusData?.activeProcess?.dryRun || false,
        resume: etlStatusData?.activeProcess?.resume || false,
      };
    }

    const imports = etlStatusData?.manifest?.imports || {};
    const subStatusList = runner.subImporters.map(key => imports[key]?.status || 'idle');
    const dryRunList = runner.subImporters.map(key => imports[key]?.dryRun || false);

    if (subStatusList.includes('running')) {
      return { status: 'running', dryRun: dryRunList.includes(true), resume: false };
    }
    if (subStatusList.includes('failed')) {
      return { status: 'failed', dryRun: dryRunList.includes(true), resume: false };
    }
    if (subStatusList.every(status => status === 'completed')) {
      return { status: 'completed', dryRun: dryRunList.every(d => d), resume: false };
    }

    return { status: 'idle', dryRun: false, resume: false };
  };

  const getRunnerProgress = (runner: typeof RUNNERS[0]) => {
    const imports = etlStatusData?.manifest?.imports || {};
    const metrics = etlStatusData?.metrics || {};
    
    let processed = 0;
    let success = 0;
    let error = 0;
    let total = 0;
    
    runner.subImporters.forEach(key => {
      const imp = imports[key];
      const met = metrics[key];
      
      processed += met?.processed ?? imp?.processedRows ?? 0;
      success += met?.successCount ?? imp?.successCount ?? 0;
      error += met?.errorCount ?? imp?.errorCount ?? 0;
      total += met?.totalRows ?? 0;
    });

    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
    
    return { processed, success, error, total, percent };
  };

  const PHASES = [
    { id: 'Phase A: Base', label: 'Fase A: Cadastros Base', desc: 'Plataformas, usuários e configurações estruturais.' },
    { id: 'Phase B: Dependencies', label: 'Fase B: Dependências Relações', desc: 'Fazendas, áreas geográficas, permissões de acessos e cotações base.' },
    { id: 'Phase C: Intermediates', label: 'Fase C: Intermediários', desc: 'Lotes de safras associados e contratos/títulos CPR.' },
    { id: 'Phase D: Operational', label: 'Fase D: Operacionais & Saldos', desc: 'Distribuição de lotes UCS, ordens de compras (Akses / Tesouro Verde), ajustes de créditos e transações.' },
  ];

  const handleTrace = async () => {
    if (!traceInput.trim()) return;
    setTraceLoading(true);
    setTraceError(null);
    setTraceResult(null);
    const params = new URLSearchParams({ [traceType]: traceInput.trim() });
    const res = await fetch(`/api/legado/trace?${params}`);
    const data = await res.json();
    if (!res.ok) setTraceError(data.error || 'Erro desconhecido');
    else setTraceResult(data);
    setTraceLoading(false);
  };

  // Derived data
  const domains = [...new Set(tables.map(t => t.domain))].sort();
  const filteredTables = tables.filter(t =>
    (!domainFilter || t.domain === domainFilter) &&
    (!tableSearch || t.name.toLowerCase().includes(tableSearch.toLowerCase()))
  );

  const sortedRows = queryResult?.rows ? [...queryResult.rows].sort((a, b) => {
    if (!sortCol) return 0;
    const va = a[sortCol] || '', vb = b[sortCol] || '';
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  }) : [];

  const totalRows = tables.reduce((s, t) => s + (t.rows || 0), 0);
  const totalSize = tables.reduce((s, t) => s + t.sizeKB, 0);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 font-['Outfit',sans-serif]">

      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0d1428]">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Banco Legado — Explorer</h1>
              <p className="text-xs text-slate-400">Leitura local dos CSVs • Sem consumir Firebase</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-800/60 rounded-lg px-4 py-2">
              <span><span className="text-white font-semibold">{tables.length}</span> tabelas</span>
              <span className="text-slate-600">|</span>
              <span><span className="text-white font-semibold">{totalRows.toLocaleString('pt-BR')}</span> registros</span>
              <span className="text-slate-600">|</span>
              <span><span className="text-white font-semibold">{(totalSize / 1024).toFixed(1)} MB</span></span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1600px] mx-auto px-6 flex gap-1">
          {[
            { id: 'rastreio', icon: <GitBranch size={14}/>, label: 'Rastreio de Pedido' },
            { id: 'explorer', icon: <Table2 size={14}/>,    label: 'Data Explorer'       },
            { id: 'etl',      icon: <Terminal size={14}/>,  label: 'Painel ETL'          },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'explorer' | 'etl' | 'rastreio')}
              className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === id
                  ? 'bg-[#0a0f1e] text-white border border-b-0 border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">{icon}{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Explorer Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'explorer' && (
        <div className="flex h-[calc(100vh-120px)]">

          {/* Sidebar — table list */}
          <aside className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col bg-[#0d1428]">
            <div className="p-3 space-y-2 border-b border-slate-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                  placeholder="Buscar tabela..."
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                />
              </div>
              <select
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/60"
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
              >
                <option value="">Todos os domínios</option>
                {domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingTables ? (
                <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                  <Loader2 size={16} className="animate-spin mr-2" />Carregando...
                </div>
              ) : (
                filteredTables.map(t => (
                  <button
                    key={t.name}
                    onClick={() => handleSelectTable(t)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-800/60 hover:bg-slate-800/40 transition-all group ${
                      selectedTable?.name === t.name ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200 truncate max-w-[170px]" title={t.name}>
                        {t.name.replace(/^dbo_|^financial_|^plat_tesouro_verde_|^plat_akses_|^mundi_/, '')}
                      </span>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[t.domain] || DOMAIN_COLORS['Outros']}`}>
                        {t.domain}
                      </span>
                      <span className="text-[10px] text-slate-500">{t.rows?.toLocaleString('pt-BR') ?? '—'} rows</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Main — table viewer */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {!selectedTable ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <BarChart3 size={48} className="text-slate-700" />
                <p className="text-sm">Selecione uma tabela à esquerda para visualizar</p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {domains.map(d => {
                    const count = tables.filter(t => t.domain === d).length;
                    const rows = tables.filter(t => t.domain === d).reduce((s, t) => s + (t.rows || 0), 0);
                    return (
                      <button key={d} onClick={() => setDomainFilter(d)}
                        className={`text-left px-4 py-3 rounded-xl border ${DOMAIN_COLORS[d] || ''} hover:opacity-80 transition-opacity`}>
                        <div className="font-semibold text-sm">{d}</div>
                        <div className="text-xs opacity-70 mt-0.5">{count} tabelas · {rows.toLocaleString('pt-BR')} rows</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0d1428]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Table2 size={15} className="text-blue-400" />
                      <h2 className="font-semibold text-white text-sm">{selectedTable.name}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${DOMAIN_COLORS[selectedTable.domain] || ''}`}>
                        {selectedTable.domain}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedTable.rows?.toLocaleString('pt-BR')} registros · {selectedTable.columnCount} colunas · {selectedTable.sizeKB >= 1024 ? `${(selectedTable.sizeKB/1024).toFixed(1)} MB` : `${selectedTable.sizeKB} KB`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Column selector */}
                    <select
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                      value={searchCol}
                      onChange={e => setSearchCol(e.target.value)}
                    >
                      <option value="">Todas as colunas</option>
                      {selectedTable.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {/* Search */}
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 w-52"
                        placeholder="Buscar dados..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      />
                      {search && <button onClick={() => { setSearch(''); queryTable(selectedTable.name, 1, '', searchCol); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={12} /></button>}
                    </div>
                    <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                      <Filter size={12} />Filtrar
                    </button>
                    <button onClick={() => queryTable(selectedTable.name, page, search, searchCol)} className="text-slate-400 hover:text-white transition-colors p-1.5">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {/* Table body */}
                <div className="flex-1 overflow-auto">
                  {loadingQuery ? (
                    <div className="flex items-center justify-center h-40 text-slate-500">
                      <Loader2 size={20} className="animate-spin mr-2" />Carregando dados...
                    </div>
                  ) : queryResult ? (
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#111827] z-10">
                        <tr>
                          {queryResult.columns.map(col => (
                            <th
                              key={col}
                              onClick={() => handleSort(col)}
                              className="text-left px-3 py-2.5 text-slate-400 font-medium border-b border-slate-700/60 cursor-pointer hover:text-white hover:bg-slate-800/40 whitespace-nowrap select-none"
                            >
                              <span className="flex items-center gap-1">
                                {col}
                                {sortCol === col ? (
                                  <ArrowUpDown size={11} className="text-blue-400" />
                                ) : (
                                  <ArrowUpDown size={11} className="text-slate-700 group-hover:text-slate-500" />
                                )}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, i) => (
                          <tr key={i} className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-900/20'}`}>
                            {queryResult.columns.map(col => (
                              <td key={col} className="px-3 py-2 text-slate-300 max-w-[220px] truncate" title={row[col]}>
                                {row[col] || <span className="text-slate-600 italic">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>

                {/* Pagination */}
                {queryResult && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0d1428] text-xs text-slate-400">
                    <span>
                      {queryResult.pagination.total.toLocaleString('pt-BR')} resultado(s)
                      {search && ` para "${search}"`}
                      {' '}· Página {queryResult.pagination.page}/{queryResult.pagination.totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { const np = page - 1; setPage(np); queryTable(selectedTable!.name, np, search, searchCol); }}
                        disabled={page <= 1}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >← Anterior</button>
                      <button
                        onClick={() => { const np = page + 1; setPage(np); queryTable(selectedTable!.name, np, search, searchCol); }}
                        disabled={page >= queryResult.pagination.totalPages}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >Próxima →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {/* ── ETL Control Panel Tab ─────────────────────────────────────────────── */}
      {/* ── ETL Control Panel Tab ─────────────────────────────────────────────── */}
      {activeTab === 'etl' && (() => {
        const quota = etlStatusData?.quota || { totalWrites: 0, limit: 20000, percentage: 0 };
        const activeProcess = etlStatusData?.activeProcess;
        const dlq = etlStatusData?.dlq || { totalErrors: 0, files: [] };

        return (
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            
            {/* Notification Banners */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
                  <span>{errorMessage}</span>
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
              </div>
            )}
            
            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-emerald-400 flex-shrink-0" size={16} />
                  <span>{successMessage}</span>
                </div>
                <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
              </div>
            )}

            {/* Quota & Active process summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Quota Card */}
              <div className="bg-[#0d1428]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700/80 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <ShieldAlert size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Quota de Gravações</h3>
                      <p className="text-[10px] text-slate-400">Firebase Spark Free Plan</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    quota.percentage > 80 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    quota.percentage > 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {quota.percentage}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Gravado Hoje:</span>
                    <span className="font-bold text-white">{quota.totalWrites.toLocaleString('pt-BR')} / {quota.limit.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                        quota.percentage > 80 ? 'from-red-500 to-rose-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                        quota.percentage > 50 ? 'from-amber-500 to-yellow-600 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                        'from-blue-500 to-emerald-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      }`}
                      style={{ width: `${Math.min(100, quota.percentage)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {quota.percentage > 80 ? '⚠️ Atenção: Limite diário quase esgotado. Evite novas gravações hoje.' : 
                     quota.percentage > 50 ? 'Consumo moderado. Ative a suspensão automática se necessário.' : 
                     'Limite seguro. Throttling de 3s e lotes de 200 ativos para segurança.'}
                  </p>
                </div>
              </div>

              {/* Active Process Card */}
              <div className="bg-[#0d1428]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700/80 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeProcess ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                      {activeProcess ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Processo Ativo</h3>
                      <p className="text-[10px] text-slate-400">{activeProcess ? 'Executando em background' : 'Nenhum processo ativo'}</p>
                    </div>
                  </div>
                  {activeProcess && (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                  )}
                </div>
                
                {activeProcess ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Script:</span>
                      <span className="font-semibold text-blue-400 font-mono">{activeProcess.importerKey}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PID:</span>
                      <span className="font-mono text-slate-300">{activeProcess.pid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Modo:</span>
                      <span className={`font-semibold ${activeProcess.dryRun ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {activeProcess.dryRun ? 'Dry-Run (Simulação)' : 'Live (Gravação)'}
                      </span>
                    </div>
                    <button
                      onClick={handleStop}
                      disabled={runningActionKey === 'stop'}
                      className="w-full mt-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg py-1 text-[11px] font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    >
                      {runningActionKey === 'stop' ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                      Interromper Processo
                    </button>
                  </div>
                ) : (
                  <div className="h-[90px] flex flex-col items-center justify-center text-slate-500 text-xs gap-1 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                    <CheckCircle size={20} className="text-slate-600" />
                    <span>Servidor pronto para execução</span>
                  </div>
                )}
              </div>

              {/* DLQ & Rollback Card */}
              <div className="bg-[#0d1428]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700/80 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <ShieldAlert size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Dead Letter Queue</h3>
                      <p className="text-[10px] text-slate-400">Erros de validação Zod</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    dlq.totalErrors > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700/40'
                  }`}>
                    {dlq.totalErrors} erros
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-1">Versão das Migrações</label>
                      <input
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                        value={customVersion}
                        onChange={e => setCustomVersion(e.target.value)}
                        placeholder="v1"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-1">Versão p/ Rollback</label>
                      <div className="flex gap-1">
                        <input
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          value={rollbackVersion}
                          onChange={e => setRollbackVersion(e.target.value)}
                          placeholder="v1"
                        />
                        <button
                          onClick={() => handleRollback()}
                          disabled={!!activeProcess || runningActionKey?.startsWith('rollback')}
                          title="Rollback total de todos os registros da versão indicada"
                          className="bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white p-1.5 rounded transition-colors disabled:opacity-40"
                        >
                          {runningActionKey === 'rollback-all' ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 text-[10px]">
                    <button
                      onClick={() => handleRun('all')}
                      disabled={!!activeProcess}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-1 rounded font-medium transition-all disabled:opacity-40"
                    >
                      Importar Todos
                    </button>
                    <button
                      onClick={() => handleRun('validate')}
                      disabled={!!activeProcess}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-1 rounded font-medium transition-all disabled:opacity-40"
                    >
                      Validar Pipeline
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Split layout: Phase Importer list vs Terminal Console */}
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Grouped Phase List */}
              <div className="flex-1 space-y-8">
                {PHASES.map(phase => {
                  const phaseRunners = RUNNERS.filter(r => r.phase === phase.id);
                  return (
                    <div key={phase.id} className="space-y-3">
                      <div className="border-b border-slate-850 pb-2 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 flex items-center gap-2">
                            <div className="w-1.5 h-3 bg-blue-500 rounded-sm"></div>
                            {phase.label}
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">{phase.desc}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {phaseRunners.map(runner => {
                          const runnerState = getRunnerState(runner);
                          const progress = getRunnerProgress(runner);
                          const hasCheckpoint = runner.subImporters.some(subKey => etlStatusData?.checkpoints?.[subKey]?.lastProcessedIndex > 0);
                          const hasDlqErrors = runner.subImporters.some(subKey => etlStatusData?.dlq?.files?.includes(`${subKey}_dlq.jsonl`));
                          const isSelected = activeLogKey === runner.key;

                          return (
                            <div 
                              key={runner.key}
                              onClick={() => {
                                setActiveLogKey(runner.key);
                                fetchEtlStatus(runner.key);
                              }}
                              className={`rounded-xl border p-4 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between ${
                                runnerState.status === 'running' ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]' :
                                runnerState.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                                runnerState.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                                isSelected ? 'border-slate-500 bg-slate-800/10' :
                                'border-slate-800 bg-[#0d1428]/30 hover:bg-[#0d1428]/50 hover:border-slate-700'
                              }`}
                            >
                              <div>
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 flex items-center justify-center">
                                      {runner.priority}
                                    </span>
                                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{runner.label}</h4>
                                  </div>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[runner.domain] || DOMAIN_COLORS['Outros']}`}>
                                    {runner.domain}
                                  </span>
                                </div>

                                {/* Tables */}
                                <p className="text-[10px] text-slate-400 line-clamp-1 mb-1">
                                  <span className="text-slate-500">Tabelas:</span> {runner.tables.join(', ')}
                                </p>
                                <p className="text-[10px] text-slate-500 mb-3 truncate">
                                  <span className="text-slate-600">Sub-importers:</span> {runner.subImporters.join(', ')}
                                </p>

                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                  {runnerState.status === 'running' && (
                                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                                      <Loader2 size={10} className="animate-spin" /> Executando...
                                    </span>
                                  )}
                                  {runnerState.status === 'completed' && (
                                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <CheckCircle size={10} /> Concluído
                                    </span>
                                  )}
                                  {runnerState.status === 'failed' && (
                                    <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <AlertCircle size={10} /> Falhou
                                    </span>
                                  )}
                                  {runnerState.status === 'idle' && (
                                    <span className="text-[10px] text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-md">
                                      Não Iniciado
                                    </span>
                                  )}
                                  {hasCheckpoint && (
                                    <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Checkpoint salvo. Pode ser retomado.">
                                      <History size={8} /> Checkpoint
                                    </span>
                                  )}
                                  {hasDlqErrors && (
                                    <span className="text-[9px] font-semibold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Erros na Dead Letter Queue">
                                      <ShieldAlert size={8} /> DLQ
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                {/* Progress Bar */}
                                {runnerState.status !== 'idle' && progress.total > 0 && (
                                  <div className="space-y-1 mb-3">
                                    <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          runnerState.status === 'failed' ? 'bg-red-500' :
                                          runnerState.status === 'completed' ? 'bg-emerald-500' :
                                          'bg-blue-500'
                                        }`}
                                        style={{ width: `${progress.percent}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-slate-400">
                                      <span>{progress.percent}% ({progress.processed.toLocaleString('pt-BR')} / {progress.total.toLocaleString('pt-BR')})</span>
                                      {progress.error > 0 && <span className="text-red-400 font-semibold">{progress.error} erros</span>}
                                    </div>
                                  </div>
                                )}

                                {/* Card Actions */}
                                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/40" onClick={e => e.stopPropagation()}>
                                  {runnerState.status === 'running' ? (
                                    <button
                                      onClick={handleStop}
                                      disabled={runningActionKey === 'stop'}
                                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] py-1 rounded font-medium border border-red-500/20 flex items-center justify-center gap-1 transition-all"
                                    >
                                      {runningActionKey === 'stop' ? <Loader2 size={10} className="animate-spin" /> : <Ban size={10} />}
                                      Interromper
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleRun(runner.key, { dryRun: false })}
                                        disabled={!!activeProcess || runningActionKey !== null}
                                        className="flex-1 bg-blue-600/90 hover:bg-blue-600 disabled:opacity-40 text-white text-[10px] py-1 rounded font-medium flex items-center justify-center gap-0.5 transition-all"
                                        title="Importar dados de forma definitiva"
                                      >
                                        {runningActionKey === `${runner.key}-live` ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                        Live
                                      </button>
                                      
                                      <button
                                        onClick={() => handleRun(runner.key, { dryRun: true })}
                                        disabled={!!activeProcess || runningActionKey !== null}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10px] py-1 rounded font-medium border border-slate-700 flex items-center justify-center gap-0.5 transition-all"
                                        title="Simular importação validando esquemas"
                                      >
                                        {runningActionKey === `${runner.key}-dry` ? <Loader2 size={10} className="animate-spin" /> : <Info size={10} />}
                                        Dry
                                      </button>

                                      {hasCheckpoint && (
                                        <button
                                          onClick={() => handleRun(runner.key, { resume: true })}
                                          disabled={!!activeProcess || runningActionKey !== null}
                                          className="bg-purple-600/90 hover:bg-purple-600 disabled:opacity-40 text-white text-[10px] px-1.5 py-1 rounded font-medium flex items-center justify-center gap-0.5 transition-all"
                                          title="Retomar importação a partir do último checkpoint"
                                        >
                                          {runningActionKey === `${runner.key}-resume` ? <Loader2 size={10} className="animate-spin" /> : <History size={10} />}
                                          Retomar
                                        </button>
                                      )}

                                      {hasDlqErrors && (
                                        <button
                                          onClick={() => {
                                            const activeDlqSubKey = runner.subImporters.find(sub => etlStatusData?.dlq?.files?.includes(`${sub}_dlq.jsonl`)) || runner.subImporters[0];
                                            fetchDlqRecords(activeDlqSubKey, 1);
                                          }}
                                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] px-1.5 py-1 rounded font-medium flex items-center justify-center gap-0.5 transition-all"
                                          title="Visualizar erros de validação"
                                        >
                                          <ShieldAlert size={10} />
                                          DLQ
                                        </button>
                                      )}
                                      
                                      <button
                                        onClick={() => handleRollback(runner.subImporters[0])}
                                        disabled={!!activeProcess || runningActionKey !== null}
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 p-1 rounded transition-all"
                                        title="Rollback da coleção associada"
                                      >
                                        {runningActionKey === `rollback-${runner.subImporters[0]}` ? <Loader2 size={10} className="animate-spin" /> : <RotateCw size={10} />}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Console Log Monitor */}
              <div className="w-full lg:w-[480px] flex-shrink-0 space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-[#0d1428]/60 backdrop-blur-md overflow-hidden sticky top-6 shadow-xl">
                  
                  {/* Console Header */}
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0d1428]/90">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                      <Terminal size={14} className="text-blue-400" />
                      <span>Console Live Output</span>
                      {activeLogKey && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                          {activeLogKey}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {activeProcess?.importerKey === activeLogKey && (
                        <span className="text-[10px] text-blue-400 flex items-center gap-1 animate-pulse font-medium bg-blue-500/10 px-2 py-0.5 rounded-full">
                          <Loader2 size={10} className="animate-spin"/> LIVE
                        </span>
                      )}
                      <button
                        onClick={() => fetchEtlStatus(activeLogKey || undefined)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-all"
                        title="Atualizar Logs"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Console Telemetry (Throughput, RAM, Latency) */}
                  {activeLogKey && etlStatusData?.metrics?.[activeLogKey] && (
                    <div className="bg-[#0b0f19] px-4 py-2.5 border-b border-slate-800 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-400 border-dashed">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Velocidade:</span>
                        <span className="text-emerald-400 font-semibold font-mono">
                          {Number(etlStatusData.metrics[activeLogKey].throughput).toFixed(1)} rows/s
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">RAM:</span>
                        <span className="text-blue-400 font-semibold font-mono">
                          {Number(etlStatusData.metrics[activeLogKey].memoryUsageMb).toFixed(1)} MB
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 font-mono">Latência Batch:</span>
                        <span className="text-amber-400 font-semibold font-mono">
                          {Math.round(etlStatusData.metrics[activeLogKey].avgBatchTimeMs)} ms
                        </span>
                      </div>
                      {etlStatusData.metrics[activeLogKey].etaSeconds > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">ETA:</span>
                          <span className="text-purple-400 font-semibold font-mono">
                            {Math.round(etlStatusData.metrics[activeLogKey].etaSeconds)}s
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Console logs tail */}
                  <pre className="p-4 text-[11px] text-slate-300 font-mono overflow-auto h-[550px] whitespace-pre-wrap leading-relaxed bg-[#060a13] selection:bg-blue-500/30">
                    {etlStatusData?.consoleTail ? (
                      etlStatusData.consoleTail
                    ) : activeLogKey ? (
                      <span className="text-slate-600 italic">Aguardando saída de log para "{activeLogKey}"...</span>
                    ) : (
                      <span className="text-slate-600 italic">
                        ← Selecione um script ou execute uma ação para visualizar a telemetria do terminal.
                      </span>
                    )}
                  </pre>
                </div>
              </div>

            </div>

            {/* DLQ Inspector Modal Overlay */}
            {dlqViewKey && (
              <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-250">
                <div 
                  className="bg-[#0d1428] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                  onClick={e => e.stopPropagation()}
                >
                  
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-800 bg-[#0d1428]/95 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="text-red-400 animate-pulse" size={18} />
                        Zod DLQ Inspector: <span className="font-mono text-blue-400">{dlqViewKey}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Erros de validação de esquema identificados durantes a leitura dos arquivos CSV</p>
                    </div>
                    <button 
                      onClick={() => {
                        setDlqViewKey(null);
                        setDlqRecords([]);
                        setDlqPagination(null);
                      }} 
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px] bg-slate-900/40">
                    {dlqLoading ? (
                      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                        <Loader2 size={24} className="animate-spin mr-2" /> Carregando registros...
                      </div>
                    ) : dlqRecords.length > 0 ? (
                      <div className="space-y-4">
                        {dlqRecords.map((rec, i) => {
                          const errors = Array.isArray(rec.errors) ? rec.errors : [];
                          return (
                            <div key={i} className="rounded-xl border border-red-500/15 bg-red-500/5 overflow-hidden">
                              <div className="px-4 py-2 border-b border-red-500/10 bg-red-500/10 flex justify-between items-center text-xs">
                                <span className="font-mono font-semibold text-red-300">Registro #{rec.index ?? 'Desconhecido'}</span>
                                <span className="text-[10px] text-slate-400">{rec.timestamp ? new Date(rec.timestamp).toLocaleString('pt-BR') : ''}</span>
                              </div>
                              
                              <div className="p-4 space-y-3">
                                {/* Error Stack */}
                                <div>
                                  <h4 className="text-[10px] font-bold text-red-400/90 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <AlertCircle size={12} /> Zod Schema Error(s):
                                  </h4>
                                  <ul className="text-xs space-y-1.5 bg-red-950/20 p-3 rounded-lg border border-red-950/40 font-mono">
                                    {errors.map((err: any, idx: number) => (
                                      <li key={idx} className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3 leading-relaxed">
                                        <span className="font-bold text-red-300 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-900/40 self-start text-[10px]">
                                          path: {err.path?.join('.') || 'root'}
                                        </span>
                                        <span className="text-slate-300">{err.message}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                {/* Raw CSV Data */}
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <FileText size={12} /> Dados Originais (Linha CSV):
                                  </h4>
                                  <pre className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg text-[10px] text-slate-300 overflow-x-auto max-h-[140px] font-mono leading-relaxed">
                                    {JSON.stringify(rec.row || rec.rawRow || rec, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                        <CheckCircle size={32} className="text-emerald-500" />
                        <span className="text-sm font-medium">Nenhum registro encontrado na DLQ.</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Modal Footer / Pagination */}
                  {dlqPagination && dlqPagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-800 bg-[#0d1428]/95 flex justify-between items-center text-xs text-slate-400">
                      <span>Total de {dlqPagination.total.toLocaleString('pt-BR')} registros com erro</span>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => fetchDlqRecords(dlqViewKey, dlqPage - 1)}
                          disabled={dlqPage <= 1}
                          className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          ← Anterior
                        </button>
                        <span className="text-white font-medium">Página {dlqPage} de {dlqPagination.totalPages}</span>
                        <button
                          onClick={() => fetchDlqRecords(dlqViewKey, dlqPage + 1)}
                          disabled={dlqPage >= dlqPagination.totalPages}
                          className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Próxima →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ── Rastreio Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'rastreio' && (
        <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-6">

          {/* Search bar */}
          <div className="rounded-2xl border border-slate-800 bg-[#0d1428] p-5">
            <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><GitBranch size={15} className="text-blue-400"/>Rastreio Completo de Pedido</h2>
            <p className="text-xs text-slate-400 mb-4">Insira um ID para cruzar todas as tabelas relacionadas: distribuição → safra → área → transações → lotes UCS → pedidos de certificado</p>
            <div className="flex gap-3">
              <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
                {(['distributionId', 'transactionId', 'orderId'] as const).map(t => (
                  <button key={t} onClick={() => setTraceType(t)}
                    className={`px-3 py-2 transition-colors ${traceType === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    {t === 'distributionId' ? 'Dist. ID' : t === 'transactionId' ? 'TX ID' : 'Order ID'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                  placeholder={traceType === 'distributionId' ? 'Ex: 39369' : traceType === 'transactionId' ? 'Ex: 57581' : 'Ex: 48'}
                  value={traceInput}
                  onChange={e => setTraceInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrace()}
                />
              </div>
              <button onClick={handleTrace} disabled={traceLoading || !traceInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm px-5 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium">
                {traceLoading ? <><Loader2 size={14} className="animate-spin"/>Rastreando...</> : <><Search size={14}/>Rastrear</>}
              </button>
            </div>
            {traceError && (
              <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={12}/>{traceError}</p>
            )}
          </div>

          {/* Results */}
          {traceResult && (() => {
            const { summary, distribution, harvest, area, transactions, ucsBatches, orders } = traceResult;
            const TYPE_LABELS: Record<string, string> = {
              PARTITION_HARVEST: 'Partição de Safra', SALE: 'Venda', TRANSFER: 'Transferência',
              PURCHASE: 'Compra', COMPENSATION: 'Compensação'
            };
            const STATUS_COLORS: Record<string, string> = {
              FINISHED: 'text-emerald-400', PENDING: 'text-amber-400', CANCELED: 'text-red-400',
              PROCESSED: 'text-emerald-400', ARCHIVED: 'text-slate-400'
            };
            const PLATFORM_LABELS: Record<string, string> = {
              '1': 'MATEUS', '2': 'CUSTODIA', '3': 'TRADING', '4': 'INVESTMENT',
              '5': 'CPR VERDE', '6': 'MUNDI', '7': 'GOV', '8': 'MOV'
            };

            return (
              <div className="space-y-4">

                {/* Summary cards */}
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: 'Dist. ID', value: traceResult.distributionId, icon: <GitBranch size={14}/>, color: 'text-blue-400' },
                    { label: 'Tipo', value: TYPE_LABELS[summary.distributionType] || summary.distributionType, icon: <Layers size={14}/>, color: 'text-purple-400' },
                    { label: 'Safra', value: summary.harvestYear, icon: <Package size={14}/>, color: 'text-amber-400' },
                    { label: 'UCS Total', value: summary.totalUcsAmount.toLocaleString('pt-BR'), icon: <Hash size={14}/>, color: 'text-emerald-400' },
                    { label: 'Transações', value: summary.transactionCount, icon: <ArrowRight size={14}/>, color: 'text-sky-400' },
                  ].map(c => (
                    <div key={c.label} className="rounded-xl border border-slate-800 bg-[#0d1428] p-4">
                      <div className={`flex items-center gap-1.5 text-xs mb-1 ${c.color}`}>{c.icon}<span className="text-slate-400">{c.label}</span></div>
                      <div className="font-bold text-white text-sm">{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Área + Safra */}
                {(area || harvest) && (
                  <div className="grid grid-cols-2 gap-4">
                    {area && (
                      <div className="rounded-xl border border-slate-800 bg-[#0d1428] p-4">
                        <div className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1.5"><Package size={12}/>Área</div>
                        <div className="text-sm font-semibold text-white">{area.name || '—'}</div>
                        <div className="text-xs text-slate-500 mt-1">Cód: {area.code} · ID: {area.id} · {area.private === 't' ? 'Privada' : 'Pública'}</div>
                        {area.uf && <div className="text-xs text-slate-500">UF: {area.uf}</div>}
                      </div>
                    )}
                    {harvest && (
                      <div className="rounded-xl border border-slate-800 bg-[#0d1428] p-4">
                        <div className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1.5"><Layers size={12}/>Safra</div>
                        <div className="text-sm font-semibold text-white">Safra {harvest.year} · {parseFloat(harvest.amount||'0').toLocaleString('pt-BR')} UCS</div>
                        <div className="text-xs text-slate-500 mt-1">Registrada: {harvest.registered_on?.split(' ')[0]}</div>
                        <div className="text-xs text-slate-500">Plataforma ID: {harvest.platform_id}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Transactions */}
                {transactions.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-[#0d1428] overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                      <ArrowRight size={14} className="text-sky-400"/>
                      <span className="text-sm font-semibold text-white">Transações</span>
                      <span className="text-xs text-slate-500">{transactions.length} registro(s)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800">
                            {['TX ID','Qtd UCS','Data Início','Plataforma Origem','Usuário Origem','→','Plataforma Destino','Usuário Destino','Saldo Origem','Saldo Destino'].map(h => (
                              <th key={h} className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx, i) => (
                            <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                              <td className="px-3 py-2.5 font-mono text-blue-400 font-bold">{tx.id}</td>
                              <td className="px-3 py-2.5 text-emerald-400 font-semibold">{parseFloat(tx.amount||'0').toLocaleString('pt-BR')}</td>
                              <td className="px-3 py-2.5 text-slate-400">{tx.created_on?.split('.')[0]}</td>
                              <td className="px-3 py-2.5"><span className="bg-slate-700/60 text-slate-200 px-2 py-0.5 rounded text-[10px] font-mono">{PLATFORM_LABELS[tx.origin_platform_id] || tx.origin_platform_id || '—'}</span></td>
                              <td className="px-3 py-2.5">
                                {tx.issuer ? (
                                  <div>
                                    <div className="text-slate-200 font-medium">{tx.issuer.name}</div>
                                    <div className="text-slate-500 text-[10px]">{tx.issuer.document} · <span className="text-purple-400">{tx.issuer.role}</span></div>
                                  </div>
                                ) : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">→</td>
                              <td className="px-3 py-2.5"><span className="bg-slate-700/60 text-slate-200 px-2 py-0.5 rounded text-[10px] font-mono">{PLATFORM_LABELS[tx.recipient_platform_id] || tx.recipient_platform_id || '—'}</span></td>
                              <td className="px-3 py-2.5">
                                {tx.recipient ? (
                                  <div>
                                    <div className="text-slate-200 font-medium">{tx.recipient.name}</div>
                                    <div className="text-slate-500 text-[10px]">{tx.recipient.document} · <span className="text-purple-400">{tx.recipient.role}</span></div>
                                  </div>
                                ) : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{tx.origin_balance}</td>
                              <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{tx.target_balance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* UCS Batches */}
                {ucsBatches.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-[#0d1428] overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                      <Package size={14} className="text-amber-400"/>
                      <span className="text-sm font-semibold text-white">Lotes UCS Vinculados</span>
                      <span className="text-xs text-slate-500">{ucsBatches.length} lote(s) · {summary.totalUcsInBatches.toLocaleString('pt-BR')} UCS · {summary.availableUcsInBatches.toLocaleString('pt-BR')} disponíveis</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800">
                            {['Lote ID','Safra','Emissão Total','Saldo Disponível','Titular','Perfil','Origem'].map(h => (
                              <th key={h} className="text-left px-3 py-2.5 text-slate-400 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ucsBatches.slice(0, 50).map((b, i) => (
                            <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                              <td className="px-3 py-2.5 font-mono text-blue-400">{b.id}</td>
                              <td className="px-3 py-2.5 text-amber-400">{b.harvest_year}</td>
                              <td className="px-3 py-2.5 text-emerald-400 font-semibold">{parseFloat(b.initial_amount||'0').toLocaleString('pt-BR')}</td>
                              <td className="px-3 py-2.5">
                                <span className={parseFloat(b.available_balance||'0') > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                                  {parseFloat(b.available_balance||'0').toLocaleString('pt-BR')}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {b.owner ? <div><div className="text-slate-200">{b.owner.name}</div><div className="text-slate-500 text-[10px]">{b.owner.document}</div></div>
                                         : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="px-3 py-2.5"><span className="text-purple-400 text-[10px]">{b.owner?.role || '—'}</span></td>
                              <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{b.source_partition || b.origin_id}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {ucsBatches.length > 50 && <p className="text-xs text-slate-600 px-4 py-2">+{ucsBatches.length - 50} lotes adicionais omitidos</p>}
                    </div>
                  </div>
                )}

                {/* Certificate Orders */}
                {(orders.akses.length > 0 || orders.tesouroVerde.length > 0) && (
                  <div className="rounded-xl border border-slate-800 bg-[#0d1428] overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                      <FileText size={14} className="text-purple-400"/>
                      <span className="text-sm font-semibold text-white">Pedidos de Certificado</span>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {[...orders.akses.map(o => ({ ...o, _platform: 'Akses' })), ...orders.tesouroVerde.map(o => ({ ...o, _platform: 'Tesouro Verde' }))].map((o: any, i) => (
                        <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/20">
                          <div className="flex items-center gap-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${
                              o._platform === 'Akses' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-green-500/20 text-green-300 border-green-500/40'
                            }`}>{o._platform}</span>
                            <div>
                              <span className="text-white font-semibold text-sm">Pedido #{o.id}</span>
                              <span className={`ml-3 text-xs ${STATUS_COLORS[o.status] || 'text-slate-400'}`}>{o.status}</span>
                            </div>
                            {(o as Record<string,string>).responsible_name && (
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-500">Resp:</span> {(o as Record<string,string>).responsible_name} · {(o as Record<string,string>).responsible_document}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-xs">
                            <div className="text-right">
                              <div className="text-slate-400">UCS</div>
                              <div className="text-emerald-400 font-bold">{parseFloat(o.ucs_amount||'0').toLocaleString('pt-BR')}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-400">Total</div>
                              <div className="text-white font-bold">{o.total ? `R$ ${parseFloat(o.total).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : '—'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-400">Pagamento</div>
                              <div className="text-slate-300">{o.payment_type || '—'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw distribution */}
                <details className="rounded-xl border border-slate-800">
                  <summary className="px-4 py-3 text-xs text-slate-400 cursor-pointer hover:text-white">Ver registro bruto de dbo_distribution</summary>
                  <pre className="px-4 pb-4 text-xs font-mono text-slate-400 whitespace-pre-wrap">{JSON.stringify(distribution, null, 2)}</pre>
                </details>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
