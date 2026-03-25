"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronLeft, ChevronRight, Loader2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, updateDoc } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";
import { EntityFilters, useEntityFilters, useFilterOptions, useSyncFiltersWithUrl } from "@/components/entities/EntityFilters";
import { cn } from "@/lib/utils";

function ImeisContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const { filters, setFilters } = useSyncFiltersWithUrl();

  useEffect(() => {
    if (!isUserLoading && !user) { router.push("/"); }
  }, [user, isUserLoading, router]);

  const allProdutoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: allProdutores, isLoading } = useCollection<EntidadeSaldo>(allProdutoresQuery);
  const imeiItems = useMemo(() => (allProdutores || []).filter(item => item.imeiNome && (item.imeiSaldo || 0) > 0), [allProdutores]);
  const filterOptions = useFilterOptions(imeiItems);

  const counts = useMemo(() => ({
    disponivel: imeiItems.filter(i => i.status === 'disponivel').length,
    bloqueado: imeiItems.filter(i => i.status === 'bloqueado').length,
    inapto: imeiItems.filter(i => i.status === 'inapto').length,
  }), [imeiItems]);

  const statusFiltered = useMemo(() => {
    return imeiItems
      .filter(p => p.status === activeTab)
      .map(item => ({ ...item, volumeContextual: item.imeiSaldo || 0 }));
  }, [imeiItems, activeTab]);

  const filteredData = useEntityFilters(statusFiltered, filters, 'imei');

  useEffect(() => { setCurrentPage(1); setSelectedIds([]); }, [activeTab, filters]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginated = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "produtores", id), updates);
    toast({ title: "Registro Atualizado" });
  };

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center"><Cpu className="w-5 h-5 text-violet-600" /></div>
             <div className="space-y-0.5">
               <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">IMEI (Administradora)</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Particionamento por Entidade Administradora</p>
             </div>
          </div>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">{user.email?.substring(0,2)}</div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {isLoading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div> : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)}>
                  <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12 gap-1">
                    <TabWithCount label="Disponíveis" value="disponivel" count={counts.disponivel} isActive={activeTab === 'disponivel'} />
                    <TabWithCount label="Bloqueados" value="bloqueado" count={counts.bloqueado} isActive={activeTab === 'bloqueado'} />
                    <TabWithCount label="Inaptos" value="inapto" count={counts.inapto} isActive={activeTab === 'inapto'} />
                  </TabsList>
                </Tabs>
                <EntityBulkImport onImport={async (d) => {}} type="produtor" />
              </div>

              <EntityFilters
                filters={filters}
                onChange={setFilters}
                config={{
                  searchPlaceholder: "Buscar IMEI, produtor ou propriedade...",
                  safras: filterOptions.safras,
                  nucleos: filterOptions.nucleos,
                  imeis: filterOptions.imeis,
                  showSafra: true,
                  showNucleo: true,
                  showImei: true,
                  showUcsRange: true,
                  accent: 'violet',
                }}
                resultCount={filteredData.length}
                totalCount={statusFiltered.length}
              />

              <EntityTable data={paginated} selectedIds={selectedIds} onSelectionChange={setSelectedIds} onUpdate={handleUpdate} viewMode="imei" />

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 mt-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages} · {filteredData.length} resultados</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl"><ChevronLeft className="w-4 h-4"/></Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl"><ChevronRight className="w-4 h-4"/></Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ImeisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <ImeisContent />
    </Suspense>
  );
}

function TabWithCount({ label, value, count, isActive }: any) {
  return (
    <TabsTrigger value={value} className="data-[state=active]:bg-white px-6 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 h-10 transition-all font-black">
      {label}
      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black min-w-[20px] text-center", isActive ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500")}>{count}</span>
    </TabsTrigger>
  );
}
