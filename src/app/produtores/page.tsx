"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Search, Users, Building2,
  ChevronLeft, ChevronRight, MapPin, Eye, ExternalLink,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Fazenda } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProdutorDetail } from "@/components/produtores/ProdutorDetail";

// ─────────────────────────────────────────────────────────────────────────────
// Produtor derivado: consolidação dos proprietários de todas as fazendas
// ─────────────────────────────────────────────────────────────────────────────
interface ProdutorConsolidado {
  documento: string;           // CPF / CNPJ (chave única)
  nome: string;
  tipo: 'PF' | 'PJ';
  fazendas: {
    fazendaId: string;
    fazendaNome: string;
    idf: string;
    nucleo?: string;
    municipio?: string;
    uf?: string;
    areaTotal: number;
    percentual: number;
    areaProdutor: number;      // areaTotal * percentual / 100
  }[];
  totalFazendas: number;
  totalAreaHa: number;          // soma da área proporcional do produtor
}

function buildProdutores(fazendas: Fazenda[]): ProdutorConsolidado[] {
  const map: Record<string, ProdutorConsolidado> = {};

  for (const fazenda of fazendas) {
    for (const prop of fazenda.proprietarios || []) {
      const key = prop.documento || prop.nome;
      if (!key) continue;

      const areaProdutor = ((fazenda.areaTotal || 0) * (prop.percentual || 100)) / 100;

      if (!map[key]) {
        map[key] = {
          documento: prop.documento,
          nome: prop.nome,
          tipo: prop.tipo || 'PF',
          fazendas: [],
          totalFazendas: 0,
          totalAreaHa: 0,
        };
      }

      map[key].fazendas.push({
        fazendaId: fazenda.id,
        fazendaNome: fazenda.nome,
        idf: fazenda.idf,
        nucleo: fazenda.nucleo,
        municipio: fazenda.municipio,
        uf: fazenda.uf,
        areaTotal: fazenda.areaTotal || 0,
        percentual: prop.percentual || 100,
        areaProdutor,
      });

      map[key].totalFazendas++;
      map[key].totalAreaHa += areaProdutor;
    }
  }

  return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
}

function ProdutoresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingProdutor, setViewingProdutor] = useState<any | null>(null);
  const itemsPerPage = 50;

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/");
  }, [user, isUserLoading, router]);

  const fazendasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "fazendas"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: fazendas, isLoading } = useCollection<Fazenda>(fazendasQuery);

  const produtores = useMemo(() => buildProdutores(fazendas || []), [fazendas]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return produtores;
    return produtores.filter(p =>
      p.nome?.toLowerCase().includes(q) ||
      p.documento?.includes(q) ||
      p.fazendas.some(f => f.fazendaNome?.toLowerCase().includes(q) || f.idf?.includes(q) || f.nucleo?.toLowerCase().includes(q))
    );
  }, [produtores, search]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isUserLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Produtores</h1>
            <p className="text-[12px] font-medium text-slate-400">
              Derivado das fazendas cadastradas · Consolidado por CPF/CNPJ
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {produtores.length} produtores
            </Badge>
            <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-100 uppercase">
              {user.email?.substring(0, 2)}
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 space-y-6 overflow-y-auto">

          {/* STATS */}
          {produtores.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Produtores" value={produtores.length} unit="cadastrados" color="emerald" />
              <StatCard label="PF" value={produtores.filter(p => p.tipo === 'PF').length} unit="pessoa física" color="teal" />
              <StatCard label="PJ" value={produtores.filter(p => p.tipo === 'PJ').length} unit="pessoa jurídica" color="indigo" />
              <StatCard
                label="Área Total"
                value={Math.round(produtores.reduce((s, p) => s + p.totalAreaHa, 0)).toLocaleString('pt-BR')}
                unit="ha (proporcional)"
                color="amber"
              />
            </div>
          )}

          {/* SEARCH */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ, fazenda, núcleo..."
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-sm shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-black text-slate-500 uppercase tracking-widest">
                    {(fazendas?.length || 0) === 0
                      ? "Nenhuma fazenda cadastrada ainda"
                      : "Nenhum produtor encontrado"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {(fazendas?.length || 0) === 0
                      ? "Cadastre fazendas com proprietários para ver os produtores aqui"
                      : "Tente buscar por outro termo"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Produtor', 'Tipo', 'Fazendas', 'Área Proporcional', 'Núcleo(s)'].map(h => (
                        <th key={h} className="text-left py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((produtor, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                        {/* PRODUTOR */}
                        <td className="py-4 px-6">
                          <div 
                            onClick={() => { router.push(`/produtores/${produtor.documento?.replace(/[^\d]/g, '') || produtor.nome}`); }}
                            className="flex items-center gap-3 cursor-pointer group/name"
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 transition-colors",
                              produtor.tipo === 'PJ'
                                ? "bg-indigo-50 text-indigo-600 group-hover/name:bg-indigo-100"
                                : "bg-emerald-50 text-emerald-600 group-hover/name:bg-emerald-100"
                            )}>
                              {produtor.nome?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-bold text-slate-900 leading-tight group-hover/name:text-emerald-500 transition-colors uppercase">{produtor.nome}</span>
                              <span className="text-[10px] font-mono text-slate-400">{produtor.documento}</span>
                            </div>
                          </div>
                        </td>

                        {/* TIPO */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                             <Badge className={cn(
                               "text-[8px] font-black uppercase px-2.5 py-1 rounded-full border-none",
                               produtor.tipo === 'PJ'
                                 ? "bg-indigo-100 text-indigo-700"
                                 : "bg-emerald-100 text-emerald-700"
                             )}>
                               {produtor.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                             </Badge>
                             <Button 
                                variant="ghost" size="sm" 
                                onClick={() => { router.push(`/produtores/${produtor.documento?.replace(/[^\d]/g, '') || produtor.nome}`); }}
                                className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all gap-1.5"
                             >
                               <Eye className="w-3.5 h-3.5" /> Visualizar
                             </Button>
                          </div>
                        </td>

                        {/* FAZENDAS */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            {produtor.fazendas.slice(0, 3).map((f, j) => (
                              <div key={j} className="flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-slate-300 shrink-0" />
                                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]">{f.fazendaNome}</span>
                                <span className="text-[9px] text-slate-400 font-mono shrink-0">({f.percentual}%)</span>
                              </div>
                            ))}
                            {produtor.fazendas.length > 3 && (
                              <span className="text-[9px] text-slate-400 font-bold">+{produtor.fazendas.length - 3} mais</span>
                            )}
                          </div>
                        </td>

                        {/* ÁREA */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-black text-slate-800">
                              {produtor.totalAreaHa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {produtor.totalFazendas} {produtor.totalFazendas === 1 ? 'fazenda' : 'fazendas'}
                            </span>
                          </div>
                        </td>

                        {/* NÚCLEOS */}
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {[...new Set(produtor.fazendas.map(f => f.nucleo).filter(Boolean))].slice(0, 2).map((n, j) => (
                              <span key={j} className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">{n}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="h-16 flex items-center justify-between px-10 border-t border-slate-100 bg-slate-50/20">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages} · {filtered.length} produtores
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: any; unit: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    teal: "bg-teal-50 border-teal-100 text-teal-700",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  };
  return (
    <div className={cn("rounded-2xl border p-5", colors[color])}>
      <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-[22px] font-black leading-none">{value}</p>
      <p className="text-[9px] font-bold opacity-50 mt-0.5">{unit}</p>
    </div>
  );
}

export default function ProdutoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>}>
      <ProdutoresContent />
    </Suspense>
  );
}
