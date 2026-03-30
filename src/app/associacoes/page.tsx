
"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, updateDoc } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";
import { cn } from "@/lib/utils";

export default function AssociacoesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Cálculos de Contadores
  const counts = useMemo(() => {
    const items = allAssociacoes || [];
    return {
      disponivel: items.filter(i => i.status === 'disponivel').length,
      bloqueado: items.filter(i => i.status === 'bloqueado').length,
      inapto: items.filter(i => i.status === 'inapto').length,
    };
  }, [allAssociacoes]);

  // Filtragem Dinâmica
  const filteredAssociacoes = useMemo(() => {
    return (allAssociacoes || []).filter(a => {
      const matchesStatus = a.status === activeTab;
      const matchesSearch = searchQuery === "" || 
        a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.documento.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [allAssociacoes, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredAssociacoes.length / itemsPerPage);
  const paginated = filteredAssociacoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSeedAssociacoes = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const sample = [
      { id: "ASSOC-001", nome: "ASSOCIAÇÃO DOS PRODUTORES DE MARICÁ", documento: "00.111.222/0001-33", originacao: 50000, movimentacao: 5000, aposentado: 2000, bloqueado: 1000, aquisicao: 500, saldoAjustarImei: 0, saldoFinalAtual: 42500, status: "disponivel", createdAt: new Date().toISOString() },
      { id: "ASSOC-002", nome: "COOPERATIVA VERDE BRASIL", documento: "99.888.777/0001-66", originacao: 30000, movimentacao: 2000, aposentado: 0, bloqueado: 0, aquisicao: 0, saldoAjustarImei: 0, saldoFinalAtual: 28000, status: "disponivel", createdAt: new Date().toISOString() }
    ];
    sample.forEach(a => batch.set(doc(firestore, "associacoes", a.id), a));
    await batch.commit();
    toast({ title: "Dados de Associações Gerados" });
  };

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "associacoes", id);
    await updateDoc(docRef, updates);
    toast({ title: "Registro Atualizado" });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "associacoes", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: "Registros removidos" });
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
             <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">Auditoria BMV</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nome ou CNPJ..." 
                className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
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
                  {(allAssociacoes?.length === 0) && (
                    <Button onClick={handleSeedAssociacoes} variant="outline" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest border-dashed">
                      <Database className="w-3.5 h-3.5 mr-2" /> Gerar Teste
                    </Button>
                  )}
                  {selectedIds.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir ({selectedIds.length})
                    </Button>
                  )}
                  <EntityBulkImport onImport={async (data) => {
                    if (!firestore) return;
                    const batch = writeBatch(firestore);
                    data.forEach(item => batch.set(doc(firestore, "associacoes", item.id), item));
                    await batch.commit();
                    toast({ title: "Importação concluída" });
                  }} type="associacao" />
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TabWithCount({ label, value, count, isActive }: { label: string, value: string, count: number, isActive: boolean }) {
  return (
    <TabsTrigger 
      value={value} 
      className="data-[state=active]:bg-white px-6 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 h-10 transition-all"
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
