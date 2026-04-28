"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
   Loader2, Search, Users, Building2, MapIcon,
   ChevronLeft, ChevronRight, Eye, User, Sparkles, Home, FileDown, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, doc, writeBatch } from "firebase/firestore";
import { Fazenda } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { ProdutorBulkImport } from "@/components/produtores/ProdutorBulkImport";

// ─────────────────────────────────────────────────────────────────────────────
// TIPAGENS & CONSOLIDAÇÃO
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
      saldoOriginacao: number;
      safraReferencia?: string;
   }[];
   totalFazendas: number;
   totalAreaHa: number;
   totalSaldoOriginacao: number;
   isProdutor?: boolean;
   isCliente?: boolean;
   isParceiro?: boolean;
   isAssociacao?: boolean;
   cidade?: string;
}

function buildProdutores(fazendas: Fazenda[]): ProdutorConsolidado[] {
   const map: Record<string, ProdutorConsolidado> = {};

   for (const fazenda of fazendas) {
      for (const prop of fazenda.proprietarios || []) {
         const cleanDoc = prop.documento?.replace(/\D/g, '');
         const key = cleanDoc || prop.nome;
         if (!key) continue;

         const areaProdutor = ((fazenda.areaTotal || 0) * (prop.percentual || 100)) / 100;

         if (!map[key]) {
            map[key] = {
               documento: prop.documento,
               nome: prop.nome?.trim() || (prop as any).razaoSocial || (prop as any).nomeResponsavel || "Sem Nome",
               tipo: prop.tipo || 'PF',
               fazendas: [],
               totalFazendas: 0,
               totalAreaHa: 0,
               totalSaldoOriginacao: 0,
               isProdutor: true
            };
         }

         const saldoOrig = Number(fazenda.saldoOriginacao) || 0;

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
            saldoOriginacao: saldoOrig,
            safraReferencia: fazenda.safraReferencia,
         });

         map[key].totalFazendas++;
         map[key].totalAreaHa += areaProdutor;
         map[key].totalSaldoOriginacao += saldoOrig;
      }
   }

   return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
}

function StatCard({ icon, label, value, unit, gradient }: { icon: React.ReactNode; label: string; value: string | number; unit: string; gradient: string }) {
   return (
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/60 p-6 flex flex-col group hover:shadow-lg hover:border-emerald-200 transition-all duration-300 min-h-[160px]">
         <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 rounded-full blur-2xl -mr-10 -mt-10", gradient)} />

         <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br", gradient)}>
               {icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
         </div>

         <div className="relative z-10 mt-auto">
            <p className="text-3xl xl:text-4xl font-black text-slate-900 leading-none tracking-tight mb-2">
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

interface EntitiesRegistryProps {
   type: 'produtores' | 'clientes' | 'parceiros' | 'todos';
   title: string;
   subtitle: string;
   icon: React.ReactNode;
   gradient: string;
}

export function EntitiesRegistry({ type, title, subtitle, icon, gradient }: EntitiesRegistryProps) {
   const router = useRouter();
   const firestore = useFirestore();
   const { user } = useUser();

   const [search, setSearch] = useState("");
   const [currentPage, setCurrentPage] = useState(1);
   const itemsPerPage = 30;

   // Queries
   const fazendasQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, "fazendas"), orderBy("nome", "asc"));
   }, [firestore, user]);

   const entidadesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
   }, [firestore, user]);

   const { data: fazendas, isLoading: loadingFazendas } = useCollection<Fazenda>(fazendasQuery);
   const { data: entidades, isLoading: loadingEntidades } = useCollection<any>(entidadesQuery);

   const isLoading = loadingFazendas || loadingEntidades;

   const produtoresAll = useMemo(() => {
      const listFromFarms = buildProdutores(fazendas || []);
      if (!entidades) return listFromFarms;

      const map = new Map<string, ProdutorConsolidado>();
      listFromFarms.forEach(p => {
         const cleanDoc = p.documento?.replace(/\D/g, '');
         map.set(cleanDoc || p.nome, p);
      });

      entidades.forEach(ent => {
         const cleanDoc = ent.documento?.replace(/\D/g, '');
         const key = cleanDoc || ent.nome;
         const finalNome = ent.nome?.trim() || ent.razaoSocial || ent.nomeResponsavel || "Sem Nome";
         if (!map.has(key)) {
            map.set(key, {
               documento: ent.documento,
               nome: finalNome,
               tipo: ent.tipo,
               fazendas: [],
               totalFazendas: 0,
               totalAreaHa: 0,
               totalSaldoOriginacao: 0,
               isProdutor: ent.isProdutor,
               isCliente: ent.isCliente,
               isParceiro: ent.isParceiro,
               isAssociacao: ent.isAssociacao,
               cidade: ent.cidade
            } as any);
         } else {
            const p = map.get(key)!;
            (p as any).isProdutor = (p as any).isProdutor || ent.isProdutor;
            (p as any).isCliente = ent.isCliente;
            (p as any).isParceiro = ent.isParceiro;
            (p as any).isAssociacao = ent.isAssociacao;
            if (ent.cidade) p.cidade = ent.cidade;
            if (finalNome && finalNome !== "Sem Nome") p.nome = finalNome;
         }
      });

      return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
   }, [fazendas, entidades]);

   const filtered = useMemo(() => {
      let list = produtoresAll;

      if (type === 'produtores') list = list.filter(p => p.isProdutor);
      else if (type === 'clientes') list = list.filter(p => p.isCliente);
      else if (type === 'parceiros') list = list.filter(p => p.isParceiro);

      const q = search.toLowerCase();
      if (!q) return list;
      return list.filter(p =>
         p.nome?.toLowerCase().includes(q) ||
         p.documento?.includes(q) ||
         p.fazendas.some(f => f.fazendaNome?.toLowerCase().includes(q) || f.idf?.includes(q) || f.nucleo?.toLowerCase().includes(q))
      );
   }, [produtoresAll, search, type]);

   const stats = useMemo(() => {
      const base = {
         total: filtered.length,
         fazendas: filtered.reduce((acc, p) => acc + p.fazendas.length, 0),
         area: filtered.reduce((acc, p) => acc + p.totalAreaHa, 0),
         pj: filtered.filter(p => p.tipo === 'PJ').length,
         pf: filtered.filter(p => p.tipo === 'PF').length,
      };

      if (type === 'produtores') {
         return [
            { label: "Produtores Ativos", value: base.total, unit: "stakeholders", icon: <Users className="w-5 h-5" />, gradient: "from-emerald-500 to-emerald-600" },
            { label: "Área Total Monitorada", value: base.area.toLocaleString('pt-BR'), unit: "hectares registrados", icon: <MapIcon className="w-5 h-5" />, gradient: "from-slate-700 to-slate-900" },
            { label: "Propriedades Rurais", value: base.fazendas, unit: "fazendas vinculadas", icon: <Building2 className="w-5 h-5" />, gradient: "from-teal-500 to-teal-600" },
            { label: "Perfil Empresarial", value: base.pj, unit: "empresas (PJ)", icon: <ShieldAlert className="w-5 h-5" />, gradient: "from-indigo-500 to-indigo-600" },
         ];
      }

      if (type === 'clientes') {
         return [
            { label: "Total de Clientes", value: base.total, unit: "compradores ativos", icon: <Sparkles className="w-5 h-5" />, gradient: "from-teal-500 to-teal-600" },
            { label: "Contas Pessoa Física", value: base.pf, unit: "investidores individuais", icon: <User className="w-5 h-5" />, gradient: "from-emerald-500 to-emerald-600" },
            { label: "Contas Pessoa Jurídica", value: base.pj, unit: "empresas/fundações", icon: <Building2 className="w-5 h-5" />, gradient: "from-indigo-500 to-indigo-600" },
            { label: "Custódia Identificada", value: filtered.filter(p => (p as any).isImei).length, unit: "contas com imei", icon: <ShieldAlert className="w-5 h-5" />, gradient: "from-slate-700 to-slate-900" },
         ];
      }

      if (type === 'parceiros') {
         return [
            { label: "Parceiros Estratégicos", value: base.total, unit: "agentes de campo", icon: <Building2 className="w-5 h-5" />, gradient: "from-indigo-500 to-indigo-600" },
            { label: "Canais de Distribuição", value: base.pj, unit: "empresas parceiras", icon: <Users className="w-5 h-5" />, gradient: "from-slate-700 to-slate-900" },
            { label: "Consultores Técnicos", value: base.pf, unit: "profissionais pf", icon: <User className="w-5 h-5" />, gradient: "from-emerald-500 to-emerald-600" },
            { label: "Capilaridade", value: Array.from(new Set(filtered.map(p => p.cidade).filter(Boolean))).length, unit: "municípios atendidos", icon: <MapIcon className="w-5 h-5" />, gradient: "from-teal-500 to-teal-600" },
         ];
      }

      return [
         { label: "Total na Vista", value: base.total, unit: "entidades filtradas", icon: <Users className="w-5 h-5" />, gradient: "from-slate-700 to-slate-900" },
         { label: "Produtores", value: produtoresAll.filter(p => p.isProdutor).length, unit: "ativos", icon: <MapIcon className="w-5 h-5" />, gradient: "from-emerald-500 to-emerald-600" },
         { label: "Clientes", value: produtoresAll.filter(p => p.isCliente).length, unit: "custódia", icon: <Sparkles className="w-5 h-5" />, gradient: "from-teal-500 to-teal-600" },
         { label: "Parceiros", value: produtoresAll.filter(p => p.isParceiro).length, unit: "agentes", icon: <Building2 className="w-5 h-5" />, gradient: "from-indigo-500 to-indigo-600" },
      ];
   }, [filtered, type, produtoresAll]);

   const handleImportEntidades = async (rows: any[]) => {
      if (!firestore) return;
      const batch = writeBatch(firestore);
      rows.forEach(row => {
         const docId = row.documento;
         const ref = doc(firestore, "produtores", docId);
         batch.set(ref, { ...row, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      toast.success(`${rows.length} entidades processadas.`);
   };

   useEffect(() => { setCurrentPage(1); }, [search]);
   const totalPages = Math.ceil(filtered.length / itemsPerPage);
   const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

   if (isLoading) {
      return (
         <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-screen">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando Auditoria...</p>
         </div>
      );
   }

   return (
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
         <div className="shrink-0 bg-white border-b border-slate-200/60 px-8 lg:px-12 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-emerald-50/50 to-transparent pointer-events-none" />
            <div className="flex items-center gap-6 relative z-10">
               <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-2xl bg-gradient-to-br", gradient)}>
                  {icon}
               </div>
               <div>
                  <h1 className="text-[28px] font-black text-slate-900 leading-none tracking-tight uppercase">{title}</h1>
                  <p className="text-[12px] text-slate-400 font-bold mt-2 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     {subtitle}
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
               <ProdutorBulkImport onImport={handleImportEntidades} />
            </div>
         </div>

         <div className="flex-1 px-8 lg:px-12 pb-12 overflow-y-auto custom-scrollbar z-10 space-y-8 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {stats.map((stat, i) => (
                  <StatCard key={i} {...stat} />
               ))}
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative w-full max-w-md">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <Input
                        placeholder="Pesquisar..."
                        className="pl-12 h-14 bg-slate-50 border-none rounded-2xl"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                     />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none px-4 py-2 font-black uppercase text-[10px]">
                     {filtered.length} Resultados Encontrados
                  </Badge>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50/50">
                           <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome / Identificação</th>
                           <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                           <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Propriedades/Dados</th>
                           <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {paginated.map((p, i) => (
                           <tr key={i} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/produtores/${p.documento || p.nome}`)}>
                              <td className="py-5 px-8">
                                 <div className="flex items-center gap-4">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg", p.tipo === 'PJ' ? "bg-indigo-500" : "bg-emerald-500")}>
                                       {p.nome.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-2">
                                          <p className="text-[14px] font-black text-slate-900 uppercase">{p.nome}</p>
                                          <div className="flex gap-1">
                                             {p.isProdutor && <Badge className="bg-emerald-50 text-emerald-600 text-[8px] font-black shadow-none border-none">PROD</Badge>}
                                             {p.isCliente && <Badge className="bg-amber-50 text-amber-600 text-[8px] font-black shadow-none border-none">CLIE</Badge>}
                                             {p.isParceiro && <Badge className="bg-indigo-50 text-indigo-600 text-[8px] font-black shadow-none border-none">PARC</Badge>}
                                             {p.isAssociacao && <Badge className="bg-slate-50 text-slate-600 text-[8px] font-black shadow-none border-none">ASSOC</Badge>}
                                          </div>
                                       </div>
                                       <p className="text-[11px] font-mono text-slate-400">{p.documento}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-5 px-8">
                                 <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-500">{p.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</Badge>
                              </td>
                              <td className="py-5 px-8">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-slate-600 uppercase">{p.fazendas.length} Fazendas Vinculadas</span>
                                    <span className="text-[10px] text-slate-400 font-mono italic">{p.totalAreaHa.toLocaleString()} ha total</span>
                                 </div>
                              </td>
                              <td className="py-5 px-8">
                                 <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-50 hover:text-emerald-600">
                                    <Eye className="w-5 h-5" />
                                 </Button>
                                 {p.isAssociacao && (
                                    <Badge className="ml-2 bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-1 rounded">GESTÃO</Badge>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                     Mostrando {paginated.length} de {filtered.length} Entidades
                  </p>
                  
                  <div className="flex items-center gap-2">
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(1, prev - 1)); }}
                        disabled={currentPage === 1}
                        className="rounded-xl border-slate-200 text-slate-500 hover:bg-white"
                     >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
                     </Button>
                     
                     <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                           let pageNum = i + 1;
                           if (totalPages > 5 && currentPage > 3) {
                              pageNum = currentPage - 2 + i;
                              if (pageNum + 2 > totalPages) pageNum = totalPages - 4 + i;
                           }
                           if (pageNum <= 0) return null;
                           if (pageNum > totalPages) return null;

                           return (
                              <Button
                                 key={pageNum}
                                 variant={currentPage === pageNum ? "default" : "ghost"}
                                 size="sm"
                                 onClick={(e) => { e.stopPropagation(); setCurrentPage(pageNum); }}
                                 className={cn(
                                    "w-10 h-10 rounded-xl font-black text-[11px]",
                                    currentPage === pageNum ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400"
                                 )}
                              >
                                 {pageNum}
                              </Button>
                           );
                        })}
                     </div>

                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPages, prev + 1)); }}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="rounded-xl border-slate-200 text-slate-500 hover:bg-white"
                     >
                        Próximo <ChevronRight className="w-4 h-4 ml-2" />
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
