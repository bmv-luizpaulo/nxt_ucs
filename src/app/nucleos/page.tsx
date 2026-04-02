"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronLeft, ChevronRight, Loader2, Users2, MapPin, Search, CheckCircle2, Clock, AlertTriangle, Building2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EntityEditDialog } from "@/components/entities/EntityEditDialog";
import { NucleoConsolidatedReport } from "@/components/entities/NucleoConsolidatedReport";
import { cn } from "@/lib/utils";

function NucleosContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [activeNucleo, setActiveNucleo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEntity, setEditingEntity] = useState<EntidadeSaldo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    if (!isUserLoading && !user) { router.push("/"); }
  }, [user, isUserLoading, router]);

  const allProdutoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: allProdutores, isLoading } = useCollection<EntidadeSaldo>(allProdutoresQuery);

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

  const nucleoList = useMemo(() => {
    const map = new Map<string, { count: number; totalSaldo: number; totalOrig: number }>();
    statusFiltered.forEach(p => {
      const key = p.nucleo || p.associacaoNome || "Sem Núcleo";
      if (!map.has(key)) map.set(key, { count: 0, totalSaldo: 0, totalOrig: 0 });
      const entry = map.get(key)!;
      entry.count++;
      entry.totalSaldo += (p.associacaoSaldo || 0);
      entry.totalOrig += (p.originacao || 0);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [statusFiltered]);

  useEffect(() => {
    if (nucleoList.length > 0 && (!activeNucleo || !nucleoList.find(n => n.name === activeNucleo))) {
      setActiveNucleo(nucleoList[0].name);
    }
  }, [nucleoList, activeNucleo]);

  const nucleoRecords = useMemo(() => {
    let records = statusFiltered.filter(p => {
      const key = p.nucleo || p.associacaoNome || "Sem Núcleo";
      return key === activeNucleo;
    });
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      records = records.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        p.documento?.includes(q) ||
        p.propriedade?.toLowerCase().includes(q)
      );
    }
    
    return records;
  }, [statusFiltered, activeNucleo, searchQuery]);

  const activeNucleoData = nucleoList.find(n => n.name === activeNucleo);
  const totalPages = Math.ceil(nucleoRecords.length / itemsPerPage);
  const paginatedRecords = nucleoRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [activeNucleo, searchQuery, activeTab]);

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "produtores", id), updates);
    toast({ title: "Registro Atualizado" });
  };

  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Corporativo Premium */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
             <h1 className="text-2xl font-black text-slate-900 tracking-tight">Núcleos & Associações</h1>
             <p className="text-[12px] font-medium text-slate-400">Visão consolidada por entidade e região</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100/50">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Auditor</span>
            </div>
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-100 uppercase">
               {user.email?.substring(0,2)}
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 space-y-8 overflow-y-auto custom-scrollbar">
           {/* Section Filter & Search */}
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-800">Lista Regional ({nucleoRecords.length})</h2>
                 </div>
                 
                 <div className="flex items-center gap-3">
                    <div className="relative w-80">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <Input 
                          placeholder="Buscar por produtor, fazenda..." 
                          className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-sm shadow-sm"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                       />
                    </div>
                    
                    <Button 
                      onClick={async () => {
                        if (!firestore) return;
                        const batch = writeBatch(firestore);
                        const { getDocs, collection, doc, setDoc } = await import('firebase/firestore');
                        
                        // 1. Vincular Fazendas
                        const snap = await getDocs(collection(firestore, 'fazendas'));
                        let fCount = 0;
                        snap.forEach(fDoc => {
                          const f = fDoc.data();
                          if (f.nucleo && (!f.nucleoCnpj || f.nucleoCnpj === "")) {
                            const n = (f.nucleo || "").toUpperCase();
                            let cnpj = "";
                            if (n.includes('XINGU')) cnpj = '10.175.886/0001-68';
                            else if (n.includes('TELES PIRES')) cnpj = '11.271.788/0001-97';
                            else if (n.includes('MADEIRA') || n.includes('APRIMA') || n.includes('APRRIMA')) cnpj = '12.741.679/0001-59';
                            else if (n.includes('ARINOS')) cnpj = '11.952.411/0001-01';
                            
                            if (cnpj) {
                              batch.update(fDoc.ref, { nucleoCnpj: cnpj });
                              fCount++;
                            }
                          }
                        });

                        // 2. Garantir que as Associações existam como carteiras (produtores)
                        const assocMap = [
                          { nome: "ASSOCIACAO DE PROPRIETARIOS RURAIS SANTA CRUZ DO XINGU MATA VIVA", cnpj: "10.175.886/0001-68", nucleo: "XINGU MATA VIVA" },
                          { nome: "ASSOCIACAO TELES PIRES MATA VIVA", cnpj: "11.271.788/0001-97", nucleo: "TELES PIRES MATA VIVA" },
                          { nome: "ASSOCIACAO DE PRODUTORES RURAIS DO RIO MADEIRA - APRRIMA", cnpj: "12.741.679/0001-59", nucleo: "MADEIRA MATA VIVA" },
                          { nome: "ASSOCIACAO ARINOS MATA VIVA", cnpj: "11.952.411/0001-01", nucleo: "ARINOS MATA VIVA" }
                        ];

                        for (const a of assocMap) {
                          const docId = `ASSOC_${a.cnpj.replace(/\D/g, '')}`;
                          batch.set(doc(firestore, "produtores", docId), {
                            id: docId,
                            nome: a.nome,
                            documento: a.cnpj,
                            nucleo: a.nucleo,
                            status: "disponivel",
                            tipo: "PJ",
                            saldoFinalAtual: 0,
                            createdAt: new Date().toISOString()
                          }, { merge: true });
                        }
                        
                        await batch.commit();
                        toast({ title: `Governança Sincronizada`, description: `${fCount} fazendas vinculadas e 4 associações criadas.` });
                      }}
                      variant="outline" 
                      className="h-11 px-6 rounded-xl border-dashed border-slate-300 text-slate-600 font-bold text-[12px] gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                       <RefreshCw className="w-4 h-4" /> Sincronizar Governança
                    </Button>
                    
                    <Button onClick={() => window.print()} variant="secondary" className="h-11 px-6 rounded-xl bg-slate-100 text-slate-900 border-none font-bold text-[12px] gap-2 hover:bg-slate-200 transition-all active:scale-95 shadow-sm">
                       <Printer className="w-4 h-4" /> Relatório Consolidado
                    </Button>
                 </div>
              </div>

              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as EntityStatus); setActiveNucleo(""); }}>
                  <TabsList className="bg-slate-100/50 p-1 border-none rounded-[1.25rem] h-14 gap-1">
                    <TabWithCount label="Disponíveis" value="disponivel" count={counts.disponivel} isActive={activeTab === 'disponivel'} />
                    <TabWithCount label="Bloqueados" value="bloqueado" count={counts.bloqueado} isActive={activeTab === 'bloqueado'} />
                    <TabWithCount label="Inaptos" value="inapto" count={counts.inapto} isActive={activeTab === 'inapto'} />
                  </TabsList>
                </Tabs>
              </div>
           </div>

           {/* NUCLEO TABS HORIZONTAL */}
           <div className="shrink-0">
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-4">
                    {nucleoList.map(nucleo => (
                      <button
                        key={nucleo.name}
                        onClick={() => setActiveNucleo(nucleo.name)}
                        className={cn(
                          "shrink-0 px-6 py-4 rounded-[1.5rem] border-2 transition-all text-left min-w-[200px]",
                          activeNucleo === nucleo.name
                            ? "bg-white border-emerald-500 shadow-xl shadow-emerald-50"
                            : "bg-white border-slate-50 hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className={cn("w-3.5 h-3.5", activeNucleo === nucleo.name ? "text-emerald-600" : "text-slate-300")} />
                          <span className={cn(
                            "text-[11px] font-black uppercase tracking-widest truncate max-w-[150px]",
                            activeNucleo === nucleo.name ? "text-slate-900" : "text-slate-400"
                          )}>
                            {nucleo.name}
                          </span>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{nucleo.count} contas</span>
                          <span className={cn(
                            "text-[14px] font-black",
                            activeNucleo === nucleo.name ? "text-emerald-600" : "text-slate-700"
                          )}>
                            {formatUCS(nucleo.totalSaldo)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
           </div>

            {/* NUCLEO SUMMARY CARD */}
            {activeNucleoData && (
              <div className="bg-[#0B0F1A] rounded-[2.5rem] p-8 flex items-center justify-between text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-white/5">
                        <Building2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Entidade Selecionada</p>
                        <h2 className="text-[28px] font-black uppercase tracking-tight">{activeNucleo}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-12 relative z-10">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vol. Originação</p>
                        <p className="text-[24px] font-black text-white font-mono">{formatUCS(activeNucleoData.totalOrig)}</p>
                    </div>
                    <div className="bg-white/5 w-px h-12"></div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Saldo Consolidado</p>
                        <p className="text-[24px] font-black text-emerald-400 font-mono">{formatUCS(activeNucleoData.totalSaldo)} <span className="text-[12px] pl-1">UCS</span></p>
                    </div>
                </div>
              </div>
            )}

            {/* MAIN TABLE AREA */}
            <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <ScrollArea className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/30 h-16 border-b border-slate-100">
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-10">Safra</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Produtor / Conta</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Fazenda</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Originação</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo Produtor</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-emerald-600 text-right">Saldo Entidade</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-center pr-10">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nucleoRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-48 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum registro encontrado</TableCell>
                                </TableRow>
                            ) : (
                                paginatedRecords.map(item => (
                                    <TableRow key={item.id} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors h-16">
                                        <TableCell className="pl-10 font-black text-[12px] text-emerald-600">{item.safra}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-slate-900 uppercase truncate max-w-[200px]">{item.nome}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{item.documento}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[12px] font-medium text-slate-500 uppercase truncate max-w-[180px]">{item.propriedade || '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-[12px] font-bold text-slate-400">{formatUCS(item.originacao)}</TableCell>
                                        <TableCell className="text-right font-black text-[13px] text-slate-900">{formatUCS(item.saldoFinalAtual)}</TableCell>
                                        <TableCell className="text-right font-black text-[13px] text-emerald-600 bg-emerald-50/20">{formatUCS(item.associacaoSaldo)}</TableCell>
                                        <TableCell className="text-center">
                                            {item.statusAuditoriaSaldo === 'valido' ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-black uppercase px-3 py-1 rounded-full w-fit mx-auto">VÁLIDO</Badge>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-400 border-none text-[9px] font-black uppercase px-3 py-1 rounded-full w-fit mx-auto">PENDENTE</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center pr-10">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setEditingEntity(item)}
                                                className="h-9 px-4 rounded-lg text-[10px] font-black tracking-widest border-slate-200 text-slate-600 gap-2 hover:bg-slate-50 active:scale-95 transition-all"
                                            >
                                                <Search className="w-3.5 h-3.5" /> DETALHES
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                
                {/* Pagination Internal */}
                {totalPages > 1 && (
                    <div className="h-16 flex items-center justify-between px-10 border-t border-slate-100 bg-slate-50/30">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pág. {currentPage} de {totalPages}</p>
                        <div className="flex gap-2">
                             <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white"><ChevronLeft className="w-4 h-4"/></Button>
                             <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl bg-white"><ChevronRight className="w-4 h-4"/></Button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Global Report Component */}
        <NucleoConsolidatedReport records={nucleoRecords} nucleoName={activeNucleo || "GERAL"} />
        
        {/* EDIT DIALOG */}
        <EntityEditDialog 
            entity={editingEntity}
            open={!!editingEntity}
            onOpenChange={(open: boolean) => !open && setEditingEntity(null)}
            onUpdate={handleUpdate}
        />
      </main>
    </div>
  );
}

export default function NucleosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>}>
      <NucleosContent />
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
