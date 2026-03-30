"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, Database, Plus, Users2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, setDoc } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function AssociacoesContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 50;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const allAssociacoesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "associacoes"), 
      orderBy("nome", "asc")
    );
  }, [firestore, user]);

  const { data: allAssociacoes, isLoading } = useCollection<EntidadeSaldo>(allAssociacoesQuery);

  const counts = useMemo(() => {
    const items = allAssociacoes || [];
    return {
      disponivel: items.filter(i => i.status === 'disponivel').length,
      bloqueado: items.filter(i => i.status === 'bloqueado').length,
      inapto: items.filter(i => i.status === 'inapto').length,
    };
  }, [allAssociacoes]);

  const filteredAssociacoes = useMemo(() => {
    return (allAssociacoes || []).filter(a => {
      const matchesStatus = a.status === activeTab;
      const matchesSearch = searchQuery === "" || 
        a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (a.documento && a.documento.includes(searchQuery));
      return matchesStatus && matchesSearch;
    });
  }, [allAssociacoes, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredAssociacoes.length / itemsPerPage);
  const paginated = filteredAssociacoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "associacoes", id);
    await setDoc(docRef, updates, { merge: true });
    toast({ title: updates.createdAt ? "Registro Criado" : "Registro Atualizado" });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "associacoes", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: "Registros removidos" });
  };

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Corporativo Premium */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
             <h1 className="text-2xl font-black text-slate-900 tracking-tight">Associações BMV</h1>
             <p className="text-[12px] font-medium text-slate-400">Gerenciamento de entidades coletivas e saldos redistribuídos</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100/50">
               <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Certified Audit</span>
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
                    <Users2 className="w-6 h-6 text-emerald-600" />
                 </div>
                 <h2 className="text-base font-bold text-slate-800">Entidades Habilitadas ({filteredAssociacoes.length})</h2>
              </div>
              
              <div className="flex items-center gap-3">
                 {selectedIds.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" className="h-11 px-6 rounded-xl font-bold text-[12px] gap-2 shadow-lg shadow-rose-100 transition-all active:scale-95">
                       <Trash2 className="w-4 h-4" /> Excluir ({selectedIds.length})
                    </Button>
                 )}
                 <EntityBulkImport onImport={async (data) => {
                    if (!firestore) return;
                    const batch = writeBatch(firestore);
                    data.forEach(item => batch.set(doc(firestore, "associacoes", item.id), item));
                    await batch.commit();
                    toast({ title: "Importação concluída" });
                 }} type="associacao" />
                 <Button onClick={() => setIsCreateOpen(true)} className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> Nova Associação
                 </Button>
              </div>
           </div>

           {/* Filter & Status Tabs */}
           <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)}>
                  <TabsList className="bg-slate-100/50 p-1 border-none rounded-[1.25rem] h-14 gap-1">
                    <TabWithCount label="Disponíveis" value="disponivel" count={counts.disponivel} isActive={activeTab === 'disponivel'} />
                    <TabWithCount label="Bloqueados" value="bloqueado" count={counts.bloqueado} isActive={activeTab === 'bloqueado'} />
                    <TabWithCount label="Inaptos" value="inapto" count={counts.inapto} isActive={activeTab === 'inapto'} />
                  </TabsList>
                </Tabs>

                <div className="relative w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input 
                      placeholder="Buscar por nome ou CNPJ..." 
                      className="pl-11 h-12 bg-white border-slate-200 rounded-2xl text-sm shadow-sm focus:ring-emerald-500"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                   />
                </div>
              </div>
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
              />

              {totalPages > 1 && (
                <div className="h-16 flex items-center justify-between px-10 border-t border-slate-100 bg-slate-50/10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Página {currentPage} de {totalPages} · {filteredAssociacoes.length} resultados
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

export default function AssociacoesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>}>
      <AssociacoesContent />
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
