"use client"

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, Trash2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, Database, Calendar, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, updateDoc, where } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus, EntidadeSaldoGroup } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { SafraBulkImport } from "@/components/safras/SafraBulkImport";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function SafraDetailPage() {
  const { id: safraIdRaw } = useParams();
  const safraId = decodeURIComponent(String(safraIdRaw));
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'fazenda' | 'produtor' | 'nucleo' | 'imei'>('fazenda');
  const itemsPerPage = 50;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const safraQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "safras", safraId, "originacao"), 
      orderBy("entidade", "asc")
    );
  }, [firestore, user, safraId]);

  const auditQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "safras"),
      where("ano", "==", safraId)
    );
  }, [firestore, user, safraId]);

  const { data: produtorData, isLoading: loadingProds } = useCollection<EntidadeSaldo>(safraQuery);
  const { data: auditData, isLoading: loadingAudit } = useCollection<any>(auditQuery);

  const isLoading = loadingProds || loadingAudit;

  const stats = useMemo(() => {
    const pData = produtorData || [];
    
    // Somar apenas registros de auditoria (categoria fazenda)
    const auditRecords = pData.filter(p => p.categoria === "fazenda" || p.isAuditRecord);
    const totalUCS = auditRecords.reduce((acc, d) => acc + (Number(d.originacao) || 0), 0);
    const totalFarms = auditRecords.length;

    return {
      totalUCS,
      totalFarms,
      totalEntityCount: new Set(pData.map(p => p.documento)).size,
      disponivelCount: pData.filter(i => i.status === 'disponivel').length,
      bloqueadoCount: pData.filter(i => i.status === 'bloqueado').length,
      inaptoCount: pData.filter(i => i.status === 'inapto').length,
      disponivel: totalUCS, 
      bloqueado: 0
    };
  }, [produtorData]);

  const preparedData = useMemo(() => {
    const pData = produtorData || [];
    
    // 1. Separar registros mestre (Auditoria) dos stakeholders
    const auditRecords = pData.filter(p => p.categoria === "fazenda" || p.isAuditRecord);
    const stakeholders = pData.filter(p => p.categoria === "participante" || !p.isAuditRecord);

    let baseList: any[] = [];

    // 2. Lógica por Aba (ViewMode)
    if (viewMode === 'fazenda') {
      baseList = auditRecords;
    } else {
      // Filtro por stakeholders e tipo
      let filtered = stakeholders;
      
      if (viewMode === 'produtor') {
        baseList = filtered.filter(s => s.tipo === 'produtor');
      } else if (viewMode === 'nucleo') {
        baseList = filtered.filter(s => s.tipo === 'associacao');
      } else if (viewMode === 'imei') {
        baseList = filtered.filter(s => s.tipo === 'imei');
      } else {
        baseList = filtered;
      }
    }

    // 3. Aplicação do Filtro de Busca Global
    const q = searchQuery.toLowerCase();
    if (q) {
      baseList = baseList.filter((item: any) => 
        item.entidade?.toLowerCase().includes(q) || 
        item.documento?.toLowerCase().includes(q) ||
        item.fazenda?.toLowerCase().includes(q)
      );
    }

    return baseList;
  }, [produtorData, viewMode, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, searchQuery, viewMode]);

  const totalPages = Math.ceil(preparedData.length / itemsPerPage);
  const paginated = preparedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
          <div className="flex items-center gap-6">
             <Link href="/safras">
               <div className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all cursor-pointer">
                  <ArrowLeft className="w-4 h-4 text-slate-400" />
               </div>
             </Link>
             <div className="space-y-0.5">
               <div className="flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-primary" />
                 <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-primary/20">Safra {safraId}</h1>
               </div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditoria de Originação Técnica</p>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Filtrar nesta safra..." 
                className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">{user.email?.substring(0,2)}</div>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* DASHBOARD DE CABEÇALHO DA SAFRA */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-[#0B0F1A] rounded-3xl p-6 text-white border border-white/5 shadow-xl flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Stakeholders</p>
                  <p className="text-3xl font-black">{stats.totalEntityCount}</p>
               </div>
               <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UCS Disponíveis</p>
                  <p className="text-3xl font-black text-primary">{stats.totalUCS.toLocaleString('pt-BR')}</p>
               </div>
               <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fazendas Auditadas</p>
                  <p className="text-3xl font-black text-rose-500">{stats.totalFarms}</p>
               </div>
               <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-[120px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Certificados Emitidos</p>
                  <p className="text-3xl font-black text-slate-900">0</p>
               </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="w-auto">
                      <TabsList className="bg-white border p-1 rounded-full h-12 gap-1 shadow-sm">
                        <TabsTrigger value="fazenda" className="rounded-full text-[10px] font-black uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-white">Fazendas</TabsTrigger>
                        <TabsTrigger value="produtor" className="rounded-full text-[10px] font-black uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-white">Produtores</TabsTrigger>
                        <TabsTrigger value="nucleo" className="rounded-full text-[10px] font-black uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-white">Núcleos / Assoc.</TabsTrigger>
                        <TabsTrigger value="imei" className="rounded-full text-[10px] font-black uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-white">IMEI</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="w-px h-8 bg-slate-200 mx-2" />
                    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)} className="w-auto">
                      <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12 gap-1">
                        <TabWithCount label="Disponíveis" value="disponivel" count={stats.disponivelCount} isActive={activeTab === 'disponivel'} />
                        <TabWithCount label="Bloqueados" value="bloqueado" count={stats.bloqueadoCount} isActive={activeTab === 'bloqueado'} />
                        <TabWithCount label="Inaptos" value="inapto" count={stats.inaptoCount} isActive={activeTab === 'inapto'} />
                      </TabsList>
                    </Tabs>
                  </div>
                
                <div className="flex gap-3">
                  {selectedIds.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-12 px-8 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <Trash2 className="w-4 h-4 mr-2" /> EXCLUIR ({selectedIds.length})
                    </Button>
                  )}
                  <SafraBulkImport targetSafra={safraId} onComplete={() => router.refresh()} />
                </div>
              </div>

                <EntityTable 
                  data={paginated} 
                  allData={produtorData || []}
                  selectedIds={selectedIds} 
                  onSelectionChange={setSelectedIds} 
                  onUpdate={handleUpdate}
                  viewMode={viewMode}
                />
              </div>

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
