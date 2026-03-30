"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, Database } from "lucide-react";
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

function ProdutoresContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // URL-Synced Filters
  const { filters, setFilters } = useSyncFiltersWithUrl();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const allProdutoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "produtores"), 
      orderBy("nome", "asc")
    );
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

  const statusFiltered = useMemo(() => {
    return (allProdutores || []).filter(p => p.status === activeTab);
  }, [allProdutores, activeTab]);

  const filteredProdutores = useEntityFilters(statusFiltered, filters, 'produtor');

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, filters]);

  const totalPages = Math.ceil(filteredProdutores.length / itemsPerPage);
  const paginated = filteredProdutores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSeedProdutores = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const sample = [
      { id: "PROD-001", nome: "JOÃO SILVA - FAZENDA ESTRELA", documento: "123.456.789-00", originacao: 15000, movimentacao: 2000, aposentado: 1000, bloqueado: 500, aquisicao: 0, saldoAjustarImei: 0, saldoLegadoTotal: 0, saldoFinalAtual: 11500, status: "disponivel", createdAt: new Date().toISOString() },
      { id: "PROD-002", nome: "MARIA OLIVEIRA - SÍTIO VERDE", documento: "987.654.321-11", originacao: 8000, movimentacao: 500, aposentado: 0, bloqueado: 200, aquisicao: 1000, saldoAjustarImei: 0, saldoLegadoTotal: 0, saldoFinalAtual: 8300, status: "disponivel", createdAt: new Date().toISOString() }
    ];
    sample.forEach(p => batch.set(doc(firestore, "produtores", p.id), p));
    await batch.commit();
    toast({ title: "Dados de Produtores Gerados" });
  };

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "produtores", id);
    await updateDoc(docRef, updates);
    toast({ title: "Registro Atualizado" });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "produtores", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: "Registros Removidos" });
  };

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
             </div>
             <div className="space-y-0.5">
               <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">Produtores</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastro Geral de Produtores — Todas as Safras</p>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">{user.email?.substring(0,2)}</div>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-[#0B0F1A] rounded-3xl p-6 text-white border border-white/5 shadow-xl flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Produtores</p>
                  <p className="text-3xl font-black">{counts.disponivel + counts.bloqueado + counts.inapto}</p>
               </div>
               <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UCS Disponíveis</p>
                  <p className="text-3xl font-black text-primary">{(allProdutores?.filter(p => p.status === 'disponivel').reduce((acc, p) => acc + (p.saldoFinalAtual || 0), 0) || 0).toLocaleString('pt-BR')}</p>
               </div>
               <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UCS Bloqueadas</p>
                  <p className="text-3xl font-black text-rose-500">{(allProdutores?.filter(p => p.status === 'bloqueado').reduce((acc, p) => acc + (p.saldoFinalAtual || 0), 0) || 0).toLocaleString('pt-BR')}</p>
               </div>
               <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Safras Ativas</p>
                  <p className="text-3xl font-black text-slate-900">{filterOptions.safras.length}</p>
               </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)} className="w-auto">
                  <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12 gap-1">
                    <TabWithCount label="Disponíveis" value="disponivel" count={counts.disponivel} isActive={activeTab === 'disponivel'} />
                    <TabWithCount label="Bloqueados" value="bloqueado" count={counts.bloqueado} isActive={activeTab === 'bloqueado'} />
                    <TabWithCount label="Inaptos" value="inapto" count={counts.inapto} isActive={activeTab === 'inapto'} />
                  </TabsList>
                </Tabs>
                
                <div className="flex gap-3">
                  {(allProdutores?.length === 0) && (
                    <Button onClick={handleSeedProdutores} variant="outline" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest border-dashed">
                      <Database className="w-3.5 h-3.5 mr-2" /> Gerar Teste
                    </Button>
                  )}
                  {selectedIds.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-12 px-8 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <Trash2 className="w-4 h-4 mr-2" /> EXCLUIR ({selectedIds.length})
                    </Button>
                  )}
                  <EntityBulkImport onImport={async (data) => {
                    if (!firestore) return;
                    const batch = writeBatch(firestore);
                    data.forEach(item => batch.set(doc(firestore, "produtores", item.id), item));
                    await batch.commit();
                    toast({ title: "Importação concluída" });
                  }} type="produtor" />
                </div>
              </div>

              <EntityFilters
                filters={filters}
                onChange={setFilters}
                config={{
                  searchPlaceholder: "Buscar por nome, CPF, propriedade, IDF...",
                  safras: filterOptions.safras,
                  nucleos: filterOptions.nucleos,
                  imeis: filterOptions.imeis,
                  showSafra: true,
                  showNucleo: true,
                  showImei: true,
                  showUcsRange: true,
                  accent: 'green',
                }}
                resultCount={filteredProdutores.length}
                totalCount={statusFiltered.length}
              />

              <EntityTable 
                data={paginated} 
                selectedIds={selectedIds} 
                onSelectionChange={setSelectedIds} 
                onUpdate={handleUpdate}
                viewMode="produtor"
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 mt-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages} · {filteredProdutores.length} resultados</p>
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

export default function ProdutoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <ProdutoresContent />
    </Suspense>
  );
}

function TabWithCount({ label, value, count, isActive }: { label: string, value: string, count: number, isActive: boolean }) {
  return (
    <TabsTrigger 
      value={value} 
      className="data-[state=active]:bg-white px-6 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 h-10 transition-all font-black"
    >
      {label}
      <span className={cn(
        "px-2 py-0.5 rounded-full text-[9px] font-black min-w-[20px] text-center",
        isActive ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
      )}>
        {count}
      </span>
    </TabsTrigger>
  );
}
