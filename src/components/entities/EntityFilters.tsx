"use client"

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, X, Filter, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export interface FilterConfig {
  searchPlaceholder?: string;
  /** Array of available safra values */
  safras?: (string | number)[];
  /** Array of available núcleo values */
  nucleos?: string[];
  /** Array of available associação values */
  associacoes?: string[];
  /** Array of available IMEI values */
  imeis?: string[];
  /** Show safra filter */
  showSafra?: boolean;
  /** Show nucleo filter */
  showNucleo?: boolean;
  /** Show associacao filter */
  showAssociacao?: boolean;
  /** Show imei filter */
  showImei?: boolean;
  /** Show UCS range filter */
  showUcsRange?: boolean;
  /** Theme accent */
  accent?: 'green' | 'teal' | 'amber' | 'violet';
}

export interface ActiveFilters {
  search: string;
  safra: string;
  nucleo: string;
  associacao: string;
  imei: string;
  ucsMin: string;
  ucsMax: string;
}

interface EntityFiltersProps {
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  config: FilterConfig;
  resultCount?: number;
  totalCount?: number;
}

export const defaultFilters: ActiveFilters = {
  search: '',
  safra: '',
  nucleo: '',
  associacao: '',
  imei: '',
  ucsMin: '',
  ucsMax: '',
};

export function EntityFilters({ filters, onChange, config, resultCount, totalCount }: EntityFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const accentColors = {
    green: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', badge: 'bg-primary/10 text-primary' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', badge: 'bg-teal-50 text-teal-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', badge: 'bg-amber-50 text-amber-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', badge: 'bg-violet-50 text-violet-600' },
  };
  const theme = accentColors[config.accent || 'green'];

  const activeFilterCount = [
    filters.safra,
    filters.nucleo,
    filters.associacao,
    filters.imei,
    filters.ucsMin,
    filters.ucsMax,
  ].filter(Boolean).length;

  const clearAll = () => onChange({ ...defaultFilters, search: filters.search });
  const updateFilter = (key: keyof ActiveFilters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-[400px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={config.searchPlaceholder || "Buscar..."}
            className="pl-10 pr-10 bg-white border-slate-200 rounded-full h-11 text-sm shadow-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
          />
          {filters.search && (
            <button 
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300 transition-colors"
            >
              <X className="w-3 h-3 text-slate-600" />
            </button>
          )}
        </div>

        {/* Safra Quick Filter */}
        {config.showSafra && config.safras && config.safras.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-11 px-4 rounded-full text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm gap-2",
                  filters.safra ? `${theme.border} ${theme.bg} ${theme.text}` : ""
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Safra {filters.safra && `: ${filters.safra}`}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-2 min-w-[160px]">
              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2">Selecionar Safra</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={!filters.safra}
                onCheckedChange={() => updateFilter('safra', '')}
                className="rounded-xl text-[11px] font-bold"
              >
                Todas as Safras
              </DropdownMenuCheckboxItem>
              {config.safras.map(s => (
                <DropdownMenuCheckboxItem 
                  key={String(s)}
                  checked={filters.safra === String(s)}
                  onCheckedChange={() => updateFilter('safra', filters.safra === String(s) ? '' : String(s))}
                  className="rounded-xl text-[11px] font-bold"
                >
                  Safra {String(s)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Núcleo Quick Filter */}
        {config.showNucleo && config.nucleos && config.nucleos.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-11 px-4 rounded-full text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm gap-2",
                  filters.nucleo ? "border-amber-200 bg-amber-50 text-amber-600" : ""
                )}
              >
                Núcleo {filters.nucleo && `: ${filters.nucleo.substring(0, 12)}${filters.nucleo.length > 12 ? '...' : ''}`}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-2 min-w-[200px] max-h-[300px] overflow-y-auto">
              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2">Núcleo / Região</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={!filters.nucleo}
                onCheckedChange={() => updateFilter('nucleo', '')}
                className="rounded-xl text-[11px] font-bold"
              >
                Todos os Núcleos
              </DropdownMenuCheckboxItem>
              {config.nucleos.map(n => (
                <DropdownMenuCheckboxItem 
                  key={n}
                  checked={filters.nucleo === n}
                  onCheckedChange={() => updateFilter('nucleo', filters.nucleo === n ? '' : n)}
                  className="rounded-xl text-[11px] font-bold"
                >
                  {n}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* IMEI Quick Filter */}
        {config.showImei && config.imeis && config.imeis.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-11 px-4 rounded-full text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm gap-2",
                  filters.imei ? "border-violet-200 bg-violet-50 text-violet-600" : ""
                )}
              >
                IMEI {filters.imei && `: ${filters.imei.substring(0, 12)}...`}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-2 min-w-[200px] max-h-[300px] overflow-y-auto">
              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2">IMEI / Administradora</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={!filters.imei}
                onCheckedChange={() => updateFilter('imei', '')}
                className="rounded-xl text-[11px] font-bold"
              >
                Todos os IMEIs
              </DropdownMenuCheckboxItem>
              {config.imeis.map(i => (
                <DropdownMenuCheckboxItem 
                  key={i}
                  checked={filters.imei === i}
                  onCheckedChange={() => updateFilter('imei', filters.imei === i ? '' : i)}
                  className="rounded-xl text-[11px] font-bold"
                >
                  {i}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Advanced Filter Toggle */}
        {config.showUcsRange && (
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "h-11 px-4 rounded-full text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm gap-2",
              showAdvanced ? `${theme.border} ${theme.bg} ${theme.text}` : ""
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        )}

        {/* Active Filters Count + Clear */}
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            onClick={clearAll}
            className="h-11 px-4 rounded-full text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Limpar Filtros
          </Button>
        )}

        {/* Results Counter */}
        {resultCount !== undefined && totalCount !== undefined && (
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-full px-3 py-1 border-slate-200", theme.badge)}>
              {resultCount} de {totalCount} registros
            </Badge>
          </div>
        )}
      </div>

      {/* Advanced UCS Range */}
      {showAdvanced && config.showUcsRange && (
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Faixa UCS:</span>
          <Input
            type="number"
            placeholder="Mínimo"
            className="w-32 h-9 text-sm rounded-xl border-slate-200"
            value={filters.ucsMin}
            onChange={e => updateFilter('ucsMin', e.target.value)}
          />
          <span className="text-slate-300 font-bold">—</span>
          <Input
            type="number"
            placeholder="Máximo"
            className="w-32 h-9 text-sm rounded-xl border-slate-200"
            value={filters.ucsMax}
            onChange={e => updateFilter('ucsMax', e.target.value)}
          />
          <span className="text-[9px] font-bold text-slate-400 uppercase">UCS</span>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to apply filters to a dataset
 */
export function useEntityFilters(data: any[], filters: ActiveFilters, viewMode?: string) {
  return useMemo(() => {
    let items = [...data];

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(p =>
        p.nome?.toLowerCase().includes(q) ||
        p.documento?.includes(q) ||
        p.propriedade?.toLowerCase().includes(q) ||
        p.idf?.toLowerCase().includes(q) ||
        p.nucleo?.toLowerCase().includes(q) ||
        p.associacaoNome?.toLowerCase().includes(q) ||
        p.imeiNome?.toLowerCase().includes(q) ||
        String(p.safra).includes(q)
      );
    }

    // Safra filter
    if (filters.safra) {
      items = items.filter(p => String(p.safra) === filters.safra);
    }

    // Nucleo filter
    if (filters.nucleo) {
      items = items.filter(p => p.nucleo === filters.nucleo || p.associacaoNome === filters.nucleo);
    }

    // Associacao filter
    if (filters.associacao) {
      items = items.filter(p => p.associacaoNome === filters.associacao);
    }

    // IMEI filter
    if (filters.imei) {
      items = items.filter(p => p.imeiNome === filters.imei);
    }

    // UCS range filter
    if (filters.ucsMin) {
      const min = parseFloat(filters.ucsMin);
      items = items.filter(p => (p.saldoFinalAtual || p.saldoParticionado || 0) >= min);
    }
    if (filters.ucsMax) {
      const max = parseFloat(filters.ucsMax);
      items = items.filter(p => (p.saldoFinalAtual || p.saldoParticionado || 0) <= max);
    }

    return items;
  }, [data, filters, viewMode]);
}

/**
 * Hook to sync filters with URL state
 */
export function useSyncFiltersWithUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current filters from URL
  const currentFilters = useMemo(() => {
    return {
      search: searchParams.get('search') || '',
      safra: searchParams.get('safra') || '',
      nucleo: searchParams.get('nucleo') || '',
      associacao: searchParams.get('associacao') || '',
      imei: searchParams.get('imei') || '',
      ucsMin: searchParams.get('ucsMin') || '',
      ucsMax: searchParams.get('ucsMax') || '',
    };
  }, [searchParams]);

  // Update URL based on new filters
  const setFilters = (newFilters: ActiveFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  return { 
    filters: currentFilters as ActiveFilters, 
    setFilters 
  };
}

/**
 * Generates a URL for cross-entity navigation with search pre-filled
 */
export function getLinkWithFilter(path: string, searchVal: string | number) {
  if (!searchVal) return path;
  return `${path}?search=${encodeURIComponent(String(searchVal))}`;
}

/**
 * Extract unique filter options from data
 */
export function useFilterOptions(data: any[]) {
  return useMemo(() => ({
    safras: Array.from(new Set(data.map(p => p.safra).filter(Boolean))).sort() as (string | number)[],
    nucleos: Array.from(new Set(data.map(p => p.nucleo).filter(Boolean))).sort() as string[],
    associacoes: Array.from(new Set(data.map(p => p.associacaoNome).filter(Boolean))).sort() as string[],
    imeis: Array.from(new Set(data.map(p => p.imeiNome).filter(Boolean))).sort() as string[],
  }), [data]);
}
