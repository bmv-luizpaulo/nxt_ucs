"use client"

import { useState, useEffect } from "react";
import { Search, FileText, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";

export default function ProdutoresPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const produtoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: produtores, isLoading } = useCollection<EntidadeSaldo>(produtoresQuery);

  const filteredProdutores = (produtores || []).filter(p => p.status === activeTab);
  const totalPages = Math.ceil(filteredProdutores.length / itemsPerPage);
  const paginated = filteredProdutores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleBulkImport = async (data: any[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const colRef = collection(firestore, "produtores");

    data.forEach(item => {
      const docRef = doc(colRef, item.id);
      batch.set(docRef, item);
    });

    await batch.commit();
    toast({ title: "Importação concluída", description: `${data.length} produtores sincronizados.` });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "produtores", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: "Registros removidos" });
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 print:hidden">
          <h1 className="text-xl font-medium text-slate-600">Portal de Auditoria <span className="font-bold text-slate-900">Saldos: Produtores</span></h1>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por nome ou CPF/CNPJ..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
            </div>
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">AD</div>
          </div>
        </header>

        <div className="p-8 space-y-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12">
                  <TabsTrigger value="disponivel" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase">Disponíveis</TabsTrigger>
                  <TabsTrigger value="bloqueado" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase">Bloqueados</TabsTrigger>
                  <TabsTrigger value="inapto" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase">Inaptos</TabsTrigger>
                </TabsList>
                <div className="flex gap-3">
                  {selectedIds.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir ({selectedIds.length})
                    </Button>
                  )}
                  <EntityBulkImport onImport={handleBulkImport} type="produtor" />
                  <Button variant="outline" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase border-slate-200">
                    <FileText className="w-3.5 h-3.5 mr-2" /> Exportar Saldo
                  </Button>
                </div>
              </div>

              <EntityTable 
                data={paginated} 
                selectedIds={selectedIds} 
                onSelectionChange={setSelectedIds} 
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 mt-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Página {currentPage} de {totalPages}</p>
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
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}