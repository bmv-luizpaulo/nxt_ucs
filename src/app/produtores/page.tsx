"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  ShieldCheck, 
  Database,
  Search,
  Plus,
  UserPlus,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, setDoc } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";
import { useEntityFilters, useFilterOptions, useSyncFiltersWithUrl } from "@/components/entities/EntityFilters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function ProdutoresContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const itemsPerPage = 50;

  const { filters, setFilters } = useSyncFiltersWithUrl();

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/");
  }, [user, isUserLoading, router]);

  const allProdutoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: allProdutores, isLoading } = useCollection<EntidadeSaldo>(allProdutoresQuery);
  const filteredProdutores = useEntityFilters(allProdutores || [], filters, 'produtor');

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [filters]);

  const totalPages = Math.ceil(filteredProdutores.length / itemsPerPage);
  const paginated = filteredProdutores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "produtores", id);
    await setDoc(docRef, updates, { merge: true });
    toast({ title: updates.createdAt ? "Registro Criado" : "Registro Atualizado" });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "produtores", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: "Registros Removidos" });
  };

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Corporativo */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gerenciamento de Produtores</h1>
            <p className="text-[12px] font-medium text-slate-400">Visualização e gerenciamento de produtores do sistema</p>
          </div>
          
          <div className="flex items-center gap-6">
            <Badge className="bg-emerald-50 text-emerald-500 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </Badge>
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-black text-sm shadow-xl shadow-emerald-100 uppercase">
              {user.email?.substring(0,2)}
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 space-y-8 overflow-y-auto">
          {/* Action Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-800">Lista de Produtores ({allProdutores?.length || 0})</h2>
             </div>
             
             <div className="flex items-center gap-3">
                <div className="relative w-80">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input 
                      placeholder="Buscar por nome, documento..." 
                      className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-sm shadow-sm"
                      value={filters.search || ""}
                      onChange={e => setFilters({ ...filters, search: e.target.value })}
                   />
                </div>
                
                <EntityBulkImport onImport={async (data) => {
                    if (!firestore) return;
                    const batch = writeBatch(firestore);
                    data.forEach(item => batch.set(doc(firestore, "produtores", item.id), item));
                    await batch.commit();
                    toast({ title: "Importação concluída" });
                }} type="produtor" />
                
                {selectedIds.length > 0 && (
                  <Button onClick={handleBulkDelete} variant="destructive" className="h-11 px-6 rounded-xl font-bold text-[12px] gap-2">
                     <Trash2 className="w-4 h-4" /> Excluir ({selectedIds.length})
                  </Button>
                )}
                <Button onClick={() => setIsCreateOpen(true)} className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[12px] gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> Nova Conta
                 </Button>
             </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
               <EntityTable 
                 data={paginated} 
                 selectedIds={selectedIds} 
                 onSelectionChange={setSelectedIds} 
                 onUpdate={handleUpdate}
                 isCreateOpen={isCreateOpen}
                 onOpenChangeCreate={setIsCreateOpen}
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
