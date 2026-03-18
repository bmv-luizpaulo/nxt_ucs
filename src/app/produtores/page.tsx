"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, updateDoc, where } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";

export default function ProdutoresPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const produtoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "produtores"), 
      where("status", "==", activeTab),
      orderBy("nome", "asc")
    );
  }, [firestore, user, activeTab]);

  const { data: produtores, isLoading } = useCollection<EntidadeSaldo>(produtoresQuery);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab]);

  const totalPages = Math.ceil((produtores || []).length / itemsPerPage);
  const paginated = (produtores || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
             </div>
             <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">Auditoria BMV</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por nome ou CPF/CNPJ..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">{user.email?.substring(0,2)}</div>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12">
                  <TabsTrigger value="disponivel" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Disponíveis</TabsTrigger>
                  <TabsTrigger value="bloqueado" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Bloqueados</TabsTrigger>
                  <TabsTrigger value="inapto" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Inaptos</TabsTrigger>
                </TabsList>
                <div className="flex gap-3">
                  {selectedIds.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir ({selectedIds.length})
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

              <EntityTable 
                data={paginated} 
                selectedIds={selectedIds} 
                onSelectionChange={setSelectedIds} 
                onUpdate={handleUpdate}
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 mt-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl"><ChevronLeft className="w-4 h-4"/></Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl"><ChevronRight className="w-4 h-4"/></Button>
                  </div>
                </div>
              )}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}