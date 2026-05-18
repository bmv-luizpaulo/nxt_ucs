'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Search, Play, CheckCircle, AlertCircle, Clock, ChevronRight, Table2, ArrowUpDown, RefreshCw, Filter, X, Loader2, Terminal, BarChart3, GitBranch, ArrowRight, Package, Users, Layers, FileText, Hash } from 'lucide-react';

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
  const [etlScripts, setEtlScripts] = useState<Record<string, EtlScript>>({});
  const [etlStatus, setEtlStatus] = useState<Record<string, EtlStatus>>({});
  const [etlOutput, setEtlOutput] = useState<Record<string, string>>({});
  const [etlElapsed, setEtlElapsed] = useState<Record<string, string>>({});
  const [activeLog, setActiveLog] = useState<string | null>(null);

  // Load table list on mount
  useEffect(() => {
    fetch('/api/legado/tables')
      .then(r => r.json())
      .then(data => { setTables(data.tables || []); setLoadingTables(false); });
  }, []);

  // Load ETL scripts on mount
  useEffect(() => {
    fetch('/api/legado/etl')
      .then(r => r.json())
      .then(data => setEtlScripts(data.scripts || {}));
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

  const handleRunEtl = async (key: string) => {
    setEtlStatus(s => ({ ...s, [key]: 'running' }));
    setActiveLog(key);
    const res = await fetch('/api/legado/etl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: key }),
    });
    const data = await res.json();
    setEtlStatus(s => ({ ...s, [key]: data.success ? 'done' : 'error' }));
    setEtlOutput(o => ({ ...o, [key]: data.stdout || data.error || '' }));
    setEtlElapsed(e => ({ ...e, [key]: data.elapsedSeconds || '' }));
  };

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
      {activeTab === 'etl' && (
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex gap-6">

          {/* Script list */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Scripts de Importação</h2>
              <p className="text-xs text-slate-400">Execute um por vez para controlar o ritmo</p>
            </div>

            {Object.entries(etlScripts)
              .sort(([, a], [, b]) => a.priority - b.priority)
              .map(([key, script]) => {
                const status = etlStatus[key] || 'idle';
                return (
                  <div
                    key={key}
                    onClick={() => setActiveLog(key)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      activeLog === key ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          status === 'done'    ? 'bg-emerald-500/20 text-emerald-400' :
                          status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          status === 'error'   ? 'bg-red-500/20 text-red-400' :
                                                 'bg-slate-700/60 text-slate-400'
                        }`}>
                          {status === 'done'    ? <CheckCircle size={16} /> :
                           status === 'running' ? <Loader2 size={16} className="animate-spin" /> :
                           status === 'error'   ? <AlertCircle size={16} /> :
                                                  script.priority}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">{script.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {script.tables.slice(0, 2).join(', ')}{script.tables.length > 2 ? ` +${script.tables.length - 2}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {etlElapsed[key] && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={11} />{etlElapsed[key]}s
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRunEtl(key); }}
                          disabled={status === 'running'}
                          className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
                            status === 'done'    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                            status === 'running' ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed' :
                            status === 'error'   ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                                                   'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {status === 'running' ? <><Loader2 size={12} className="animate-spin"/>Executando...</> :
                           status === 'done'    ? <><CheckCircle size={12}/>Concluído</> :
                           status === 'error'   ? <><AlertCircle size={12}/>Tentar novamente</> :
                                                  <><Play size={12}/>Importar</>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Log panel */}
          <div className="w-[420px] flex-shrink-0">
            <div className="sticky top-6 rounded-xl border border-slate-800 bg-[#0a0f1e] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Terminal size={14} />
                  {activeLog ? `Log: ${etlScripts[activeLog]?.label || activeLog}` : 'Selecione um script'}
                </div>
                {activeLog && etlStatus[activeLog] === 'running' && (
                  <span className="text-xs text-blue-400 flex items-center gap-1 animate-pulse"><Loader2 size={11} className="animate-spin"/>Executando</span>
                )}
              </div>
              <pre className="p-4 text-xs text-slate-300 font-mono overflow-auto h-[500px] whitespace-pre-wrap leading-relaxed">
                {activeLog && etlOutput[activeLog]
                  ? etlOutput[activeLog]
                  : activeLog
                    ? <span className="text-slate-600">Aguardando execução...</span>
                    : <span className="text-slate-600">← Clique em um script para ver o log de saída aqui</span>
                }
              </pre>
            </div>
          </div>
        </div>
      )}

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
