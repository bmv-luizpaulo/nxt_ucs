"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronLeft, ChevronRight, Loader2, MapPin, Search, Plus, Map, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, setDoc } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";
import { EntityFilters, useEntityFilters, useFilterOptions, useSyncFiltersWithUrl } from "@/components/entities/EntityFilters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function FazendasContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const itemsPerPage = 50;

  const { filters, setFilters } = useSyncFiltersWithUrl();

  useEffect(() => {
    if (!isUserLoading && !user) { router.push("/"); }
  }, [user, isUserLoading, router]);

  const allProdutoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: allProdutores, isLoading } = useCollection<EntidadeSaldo>(allProdutoresQuery);
  const filterOptions = useFilterOptions(allProdutores || []);

  const counts = useMemo(() => {
    const items = allProdutores || [];
    return {
      disponivel: items.filter(i => i.status === 'disponivel').length,
      bloqueado: items.filter(i => i.status === 'bloqueado').length,
      inapto: items.filter(i => i.status === 'inapto').length,
    };
  }, [allProdutores]);

  const statusFiltered = useMemo(() => (allProdutores || []).filter(p => p.status === activeTab), [allProdutores, activeTab]);
  const filteredData = useEntityFilters(statusFiltered, filters, 'fazenda');

  useEffect(() => { setCurrentPage(1); setSelectedIds([]); }, [activeTab, filters]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginated = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "produtores", id);
    await setDoc(docRef, updates, { merge: true });
    toast({ title: updates.createdAt ? "Registro Criado" : "Registro Atualizado" });
  };

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Corporativo Premium */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
             <h1 className="text-2xl font-black text-slate-900 tracking-tight">Registro de Fazendas</h1>
             <p className="text-[12px] font-medium text-slate-400">Propriedades rurais e conformidade de originação</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100/50">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Ledger</span>
            </div>
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-100 uppercase">
               {user.email?.substring(0,2)}
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 space-y-8 overflow-y-auto custom-scrollbar">
           {/* Action Area */}
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                    <Map className="w-6 h-6 text-emerald-600" />
                 </div>
                 <h2 className="text-base font-bold text-slate-800">Visualização Geográfica ({filteredData.length})</h2>
              </div>
              
              <div className="flex items-center gap-3">
                 <EntityBulkImport onImport={async (d) => {}} type="produtor" />
                 <Button onClick={() => setIsCreateOpen(true)} className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> Nova Fazenda
                 </Button>
              </div>
           </div>

           {/* Filter & Status Tabs */}
           <div className="space-y-8">
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)}>
                  <TabsList className="bg-slate-100/50 p-1 border-none rounded-[1.25rem] h-14 gap-1">
                    <TabWithCount label="Disponíveis" value="disponivel" count={counts.disponivel} isActive={activeTab === 'disponivel'} />
                    <TabWithCount label="Bloqueados" value="bloqueado" count={counts.bloqueado} isActive={activeTab === 'bloqueado'} />
                    <TabWithCount label="Inaptos" value="inapto" count={counts.inapto} isActive={activeTab === 'inapto'} />
                  </TabsList>
                </Tabs>
              </div>

              <EntityFilters
                filters={filters}
                onChange={setFilters}
                config={{
                  searchPlaceholder: "Buscar por fazenda, IDF, produtor...",
                  safras: filterOptions.safras,
                  nucleos: filterOptions.nucleos,
                  showSafra: true,
                  showNucleo: true,
                  showUcsRange: true,
                  accent: 'green',
                }}
                resultCount={filteredData.length}
                totalCount={statusFiltered.length}
              />
           </div>

           {/* Table Area */}
           <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <EntityTable 
                data={paginated} 
                selectedIds={selectedIds} 
                onSelectionChange={setSelectedIds} 
                onUpdate={handleUpdate} 
                isCreateOpen={isCreateOpen}
                onOpenChangeCreate={setIsCreateOpen}
                viewMode="fazenda" 
              />

              {totalPages > 1 && (
                <div className="h-16 flex items-center justify-between px-10 border-t border-slate-100 bg-slate-50/10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Página {currentPage} de {totalPages} · {filteredData.length} resultados
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all">
                       <ChevronLeft className="w-4 h-4 text-slate-600"/>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all">
                       <ChevronRight className="w-4 h-4 text-slate-600"/>
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

export default function FazendasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>}>
      <FazendasContent />
    </Suspense>
  );
}

function TabWithCount({ label, value, count, isActive }: any) {
  return (
    <TabsTrigger value={value} className="data-[state=active]:bg-white px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 h-12 transition-all">
      {label}
      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black min-w-[24px] text-center", isActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>
        {count}
      </span>
    </TabsTrigger>
  );
}
