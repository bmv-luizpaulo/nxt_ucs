"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Search, Users, Building2, MapIcon,
  ChevronLeft, ChevronRight, Eye, User, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Fazenda } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Produtor derivado: consolidação dos proprietários de todas as fazendas
// ─────────────────────────────────────────────────────────────────────────────
interface ProdutorConsolidado {
  documento: string;           
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
    areaProdutor: number;      
  }[];
  totalFazendas: number;
  totalAreaHa: number;          
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
  const itemsPerPage = 15;

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="relative">
         <div className="w-16 h-16 border-4 border-emerald-100 rounded-full animate-pulse absolute" />
         <Loader2 className="w-16 h-16 text-emerald-500 animate-spin relative z-10" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F4F7FA]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* GLOWING BACKGROUND ORB */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-gradient-to-bl from-emerald-400/20 via-teal-400/5 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* PREMIUM HEADER SECTION */}
        <div className="px-8 lg:px-12 pt-12 pb-8 shrink-0 relative z-10">
           <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-4 max-w-2xl">
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Painel Consolidado</span>
                 </div>
                 <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    Central de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Produtores</span>
                 </h1>
                 <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xl">
                    Gestão unificada de clientes. Os perfis abaixo são gerados automaticamente através da consolidação de propriedades e titularidades das fazendas cadastradas.
                 </p>
              </div>

              <div className="flex items-center gap-4">
                 <div className="relative hidden md:block">
                   <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20" />
                   <div className="relative bg-white h-14 px-6 rounded-2xl border border-emerald-100 flex items-center justify-center gap-3 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Unificado</span>
                         <span className="text-lg font-black text-slate-900 leading-tight">{produtores.length} perfis</span>
                      </div>
                   </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 px-8 lg:px-12 pb-12 overflow-y-auto custom-scrollbar z-10 space-y-8">

          {/* DYNAMIC STATS CARDS */}
          {produtores.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-6">
              <StatCard icon={<Users className="w-5 h-5" />} label="Produtores" value={produtores.length} unit="cadastrados" gradient="from-emerald-500 to-emerald-600" />
              <StatCard icon={<User className="w-5 h-5" />} label="Pessoa Física (PF)" value={produtores.filter(p => p.tipo === 'PF').length} unit="cadastros ativos" gradient="from-teal-500 to-teal-600" />
              <StatCard icon={<Building2 className="w-5 h-5" />} label="Pessoa Jurídica (PJ)" value={produtores.filter(p => p.tipo === 'PJ').length} unit="empresas" gradient="from-indigo-500 to-indigo-600" />
              <StatCard 
                 icon={<MapIcon className="w-5 h-5" />} 
                 label="Área Mapeada" 
                 value={Math.round(produtores.reduce((s, p) => s + p.totalAreaHa, 0)).toLocaleString('pt-BR')} 
                 unit="hectares" 
                 gradient="from-amber-500 to-orange-500" 
              />
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
             
             {/* TOOLBAR */}
             <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                   <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-300" />
                   <div className="relative flex items-center">
                     <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                     <Input
                       placeholder="Buscar por nome, identificação ou núcleo..."
                       className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl text-[14px] font-medium text-slate-700 shadow-inner focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all placeholder:text-slate-400"
                       value={search}
                       onChange={e => setSearch(e.target.value)}
                     />
                   </div>
                </div>
                
                <Badge className="md:hidden self-start bg-slate-100 text-slate-500 border-none px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                  {filtered.length} Resultados
                </Badge>
             </div>

            {/* TABLE / LIST */}
            {isLoading ? (
               <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando base de dados...</p>
               </div>
            ) : paginated.length === 0 ? (
               <div className="p-24 flex flex-col items-center justify-center gap-6 bg-slate-50/30">
                  <div className="w-24 h-24 bg-white shadow-sm border border-slate-100 rounded-[2rem] flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Users className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Nenhum produtor encontrado</h3>
                    <p className="text-[14px] font-medium text-slate-500 max-w-md mx-auto">
                      {(fazendas?.length || 0) === 0
                        ? "Você ainda não cadastrou nenhuma fazenda com proprietários."
                        : "Não encontramos resultados para sua busca atual."}
                    </p>
                  </div>
               </div>
            ) : (
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="bg-slate-50/80 border-b border-slate-100">
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Produtor</th>
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hidden xl:table-cell">Classificação</th>
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Propriedades</th>
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Geografia & Área</th>
                       <th className="text-right py-5 px-8 w-24"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {paginated.map((produtor, i) => (
                       <tr 
                         key={i} 
                         onClick={() => { router.push(`/produtores/${produtor.documento?.replace(/[^\d]/g, '') || produtor.nome}`); }}
                         className="group bg-white hover:bg-emerald-50/30 transition-all duration-300 cursor-pointer"
                       >
                         {/* PRODUTOR - NOME E DOCUMENTO */}
                         <td className="py-5 px-8">
                           <div className="flex items-center gap-4">
                             <div className={cn(
                               "w-12 h-12 rounded-[1rem] flex items-center justify-center text-[14px] font-black shrink-0 transition-all duration-500 shadow-sm group-hover:scale-110",
                               produtor.tipo === 'PJ'
                                 ? "bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white"
                                 : "bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white"
                             )}>
                               {produtor.nome?.substring(0, 2).toUpperCase()}
                             </div>
                             <div className="flex flex-col gap-1 min-w-0">
                               <span className="text-[15px] font-black text-slate-900 truncate max-w-[200px] lg:max-w-[280px] leading-none uppercase group-hover:text-emerald-700 transition-colors">{produtor.nome}</span>
                               <span className="text-[11px] font-mono font-bold text-slate-400 tracking-tight flex items-center gap-2">
                                 {produtor.documento}
                                 <Badge className={cn(
                                   "xl:hidden text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md text-[9px] border-none",
                                   produtor.tipo === 'PJ' ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"
                                 )}>
                                   {produtor.tipo}
                                 </Badge>
                               </span>
                             </div>
                           </div>
                         </td>
 
                         {/* CLASSIFICAÇÃO / TIPO */}
                         <td className="py-5 px-8 hidden xl:table-cell">
                            <Badge className={cn(
                               "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border-none transition-all shadow-sm",
                               produtor.tipo === 'PJ'
                                 ? "bg-indigo-50 text-indigo-600"
                                 : "bg-emerald-50 text-emerald-600"
                            )}>
                               {produtor.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                            </Badge>
                         </td>
 
                         {/* PROPRIEDADES RESUMO */}
                         <td className="py-5 px-8 hidden md:table-cell">
                           <div className="space-y-2">
                             {produtor.fazendas.slice(0, 2).map((f, j) => (
                               <div key={j} className="flex items-center gap-2">
                                 <Building2 className="w-3.5 h-3.5 text-slate-300 shrink-0 group-hover:text-emerald-400 transition-colors" />
                                 <span className="text-[12px] font-bold text-slate-700 truncate max-w-[150px]">{f.fazendaNome}</span>
                                 <Badge className="bg-slate-50 text-slate-400 border-slate-200 text-[9px] font-mono px-1.5 py-0.5">{f.percentual}%</Badge>
                               </div>
                             ))}
                             {produtor.fazendas.length > 2 && (
                               <Badge variant="outline" className="mt-1 text-[9px] font-black text-emerald-500 border-emerald-100 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">
                                 +{produtor.fazendas.length - 2} Propriedades
                               </Badge>
                             )}
                           </div>
                         </td>
 
                         {/* ÁREA / GEOGRAFIA */}
                         <td className="py-5 px-8">
                           <div className="flex flex-col gap-2">
                             <div className="flex items-baseline gap-1.5">
                               <span className="text-[16px] font-black text-slate-800">
                                 {produtor.totalAreaHa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                               </span>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ha</span>
                             </div>
                             
                             <div className="flex flex-wrap gap-1">
                               {[...new Set(produtor.fazendas.map(f => f.nucleo).filter(Boolean))].slice(0, 2).map((n, j) => (
                                 <Badge key={j} variant="outline" className="text-[9px] bg-white border-slate-200 text-slate-500 font-bold px-2 py-0.5 uppercase tracking-wide truncate max-w-[120px]">{n}</Badge>
                               ))}
                             </div>
                           </div>
                         </td>
 
                         {/* AÇÕES */}
                         <td className="py-5 px-8 text-right">
                            <Button 
                               variant="ghost" 
                               size="icon" 
                               className="w-10 h-10 rounded-2xl text-slate-300 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 router.push(`/produtores/${produtor.documento?.replace(/[^\d]/g, '') || produtor.nome}`);
                               }}
                            >
                               <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
               <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest hidden md:block">
                       Exibindo <span className="text-emerald-600">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-emerald-600">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> de <span className="text-slate-900">{filtered.length}</span>
                     </p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button 
                       variant="outline" 
                       onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }} 
                       disabled={currentPage === 1} 
                       className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                     >
                       Anterior
                     </Button>
                     <div className="px-4 text-[12px] font-black text-slate-900 bg-white border border-slate-200 h-10 rounded-xl flex items-center justify-center shadow-sm">
                       {currentPage}
                     </div>
                     <Button 
                       variant="outline" 
                       onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} 
                       disabled={currentPage === totalPages} 
                       className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                     >
                       Próxima
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

function StatCard({ icon, label, value, unit, gradient }: { icon: React.ReactNode; label: string; value: any; unit: string; gradient: string }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 p-6 flex flex-col group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-emerald-100 transition-all duration-300 min-h-[160px]">
       <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 rounded-full blur-2xl -mr-10 -mt-10", gradient)} />
       
       <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br", gradient)}>
             {icon}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
       </div>

       <div className="relative z-10 mt-auto">
          <p className="text-[32px] xl:text-[40px] font-black text-slate-900 leading-none tracking-tight mb-2">
             {value}
          </p>
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{unit}</p>
          </div>
       </div>
    </div>
  );
}

export default function ProdutoresPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
       </div>
    }>
      <ProdutoresContent />
    </Suspense>
  );
}
