import { useState, useEffect, useCallback, useRef } from 'react';

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface LegacyDataResult<T> {
  rows: T[];
  pagination: Pagination;
  [key: string]: unknown;
}

interface UseLegacyDataOptions {
  domain: string;
  params?: Record<string, string | number | boolean>;
  pageSize?: number;
  enabled?: boolean;
}

export function useLegacyData<T = Record<string, string>>({
  domain,
  params = {},
  pageSize = 50,
  enabled = true,
}: UseLegacyDataOptions) {
  const [data, setData] = useState<LegacyDataResult<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async (p = page, s = search) => {
    if (!enabled) return;

    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        domain,
        page: String(p),
        pageSize: String(pageSize),
        search: s,
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      });
      const res = await fetch(`/api/legado/domain?${qs}`, { signal: controller.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao buscar dados');
      
      setData(json);
    } catch (e: any) {
      if (e.name === 'AbortError') return; // Ignore aborted request
      setError(String(e));
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, pageSize, enabled, JSON.stringify(params)]);

  // Reset states and fetch when domain/params change
  useEffect(() => {
    setData(null);
    setSearch('');
    setPage(1);
    fetch_(1, '');
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [domain, JSON.stringify(params), enabled]);

  const handleSearch = (s: string) => {
    setSearch(s);
    setPage(1);
    fetch_(1, s);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetch_(p, search);
  };

  const refresh = () => fetch_(page, search);

  return {
    rows: data?.rows ?? [],
    pagination: data?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 0 },
    extra: data,
    loading,
    error,
    page,
    search,
    handleSearch,
    handlePageChange,
    refresh,
  };
}
