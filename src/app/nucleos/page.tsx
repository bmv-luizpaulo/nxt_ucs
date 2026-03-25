"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronLeft, ChevronRight, Loader2, Users2, MapPin, Search, CheckCircle2, Clock, AlertTriangle, Building2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy, updateDoc } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/Footer";
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
  const itemsPerPage = 30;

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

  // Filter by status first
  const statusFiltered = useMemo(() => {
    return (allProdutores || []).filter(p => p.status === activeTab);
  }, [allProdutores, activeTab]);

  // Get unique nucleos with counts and total saldo
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

  // Set default nucleo when data loads
  useEffect(() => {
    if (nucleoList.length > 0 && (!activeNucleo || !nucleoList.find(n => n.name === activeNucleo))) {
      setActiveNucleo(nucleoList[0].name);
    }
  }, [nucleoList]);

  // Filter records for the active nucleo & search
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
        p.propriedade?.toLowerCase().includes(q) ||
        p.associacaoNome?.toLowerCase().includes(q)
      );
    }
    
    return records;
  }, [statusFiltered, activeNucleo, searchQuery]);

  const activeNucleoData = nucleoList.find(n => n.name === activeNucleo);

  // Pagination
  const totalPages = Math.ceil(nucleoRecords.length / itemsPerPage);
  const paginatedRecords = nucleoRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when nucleo or search changes
  useEffect(() => { setCurrentPage(1); }, [activeNucleo, searchQuery, activeTab]);

  const handleUpdate = async (id: string, updates: Partial<EntidadeSaldo>) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "produtores", id), updates);
    toast({ title: "Registro Atualizado" });
  };

  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  if (isUserLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center"><Users2 className="w-5 h-5 text-amber-600" /></div>
             <div className="space-y-0.5">
               <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">Núcleos & Associações</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visão Consolidada por Região / Entidade</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar produtor, fazenda..."
                className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">{user.email?.substring(0,2)}</div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div> : (
            <>
              {/* STATUS TABS */}
              <div className="px-8 pt-6 pb-4 flex items-center justify-between shrink-0">
                <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as EntityStatus); setActiveNucleo(""); }}>
                  <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12 gap-1">
                    <TabWithCount label="Disponíveis" value="disponivel" count={counts.disponivel} isActive={activeTab === 'disponivel'} />
                    <TabWithCount label="Bloqueados" value="bloqueado" count={counts.bloqueado} isActive={activeTab === 'bloqueado'} />
                    <TabWithCount label="Inaptos" value="inapto" count={counts.inapto} isActive={activeTab === 'inapto'} />
                  </TabsList>
                </Tabs>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {nucleoList.length} Núcleos · {statusFiltered.length} Produtores
                </p>
              </div>

              {/* NUCLEO TABS */}
              <div className="px-8 shrink-0">
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    {nucleoList.map(nucleo => (
                      <button
                        key={nucleo.name}
                        onClick={() => setActiveNucleo(nucleo.name)}
                        className={cn(
                          "shrink-0 px-5 py-3 rounded-2xl border-2 transition-all text-left",
                          activeNucleo === nucleo.name
                            ? "bg-amber-50 border-amber-400 shadow-md shadow-amber-100"
                            : "bg-white border-slate-100 hover:border-amber-200 hover:bg-amber-50/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className={cn("w-3 h-3", activeNucleo === nucleo.name ? "text-amber-600" : "text-slate-300")} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest truncate max-w-[180px]",
                            activeNucleo === nucleo.name ? "text-amber-800" : "text-slate-500"
                          )}>
                            {nucleo.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-slate-400">{nucleo.count} prod.</span>
                          <span className={cn(
                            "text-[11px] font-black",
                            activeNucleo === nucleo.name ? "text-amber-700" : "text-slate-700"
                          )}>
                            {formatUCS(nucleo.totalSaldo)} UCS
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* NUCLEO DETAIL HEADER */}
              {activeNucleoData && (
                <div className="px-8 py-4 shrink-0">
                  <div className="bg-[#0B0F1A] rounded-2xl p-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Núcleo / Região</p>
                        <h2 className="text-[20px] font-black uppercase tracking-tight">{activeNucleo}</h2>
                      </div>
                      <Badge className="bg-white/10 text-white/70 border-white/10 text-[9px] font-black uppercase rounded-full px-3 py-1 ml-4">
                        {nucleoRecords.length} Produtores
                      </Badge>
                    </div>
                    <div className="flex items-center gap-10">
                      <Button 
                        variant="ghost" 
                        onClick={() => window.print()}
                        className="h-10 px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-2 transition-all shrink-0"
                      >
                        <Printer className="w-4 h-4 text-amber-400" /> Relatório Consolidado
                      </Button>
                      <div className="flex gap-8">
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Originação Total</p>
                          <p className="text-[18px] font-black text-white font-mono tracking-tight">{formatUCS(activeNucleoData.totalOrig)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Saldo Associação</p>
                          <p className="text-[18px] font-black text-amber-400 font-mono tracking-tight">{formatUCS(activeNucleoData.totalSaldo)} <span className="text-[10px]">UCS</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TABLE */}
              <div className="flex-1 px-8 pb-6 overflow-hidden flex flex-col">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 flex flex-col">
                  <ScrollArea className="flex-1">
                    <Table className="min-w-[1100px]">
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 h-14 border-b border-slate-100">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-6">Safra</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-amber-600">Associação</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produtor</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fazenda</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Originação</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Part. %</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-amber-600 text-right">Saldo Assoc.</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary text-right">Saldo Produtor</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pr-6">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nucleoRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="h-32 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                              Nenhum registro encontrado neste núcleo
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedRecords.map(item => (
                            <TableRow key={item.id} className="border-b border-slate-50 hover:bg-amber-50/20 transition-colors h-14">
                              <TableCell className="pl-6 font-bold text-[10px] text-primary uppercase">{item.safra}</TableCell>
                              <TableCell className="font-black text-[10px] text-amber-700 uppercase truncate max-w-[180px]">
                                {item.associacaoNome || '-'}
                              </TableCell>
                              <TableCell className="font-black text-[10px] text-slate-900 uppercase truncate max-w-[160px]">{item.nome}</TableCell>
                              <TableCell className="font-mono text-[9px] text-slate-400">{item.documento || '-'}</TableCell>
                              <TableCell className="text-[9px] text-slate-500 truncate max-w-[140px]">{item.propriedade || '-'}</TableCell>
                              <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatUCS(item.originacao)}</TableCell>
                              <TableCell className="text-right font-mono text-[10px] font-bold text-amber-600">
                                {item.associacaoParticionamento ? `${item.associacaoParticionamento.toLocaleString('pt-BR')}%` : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-black text-amber-600 text-[11px]">{formatUCS(item.associacaoSaldo)}</TableCell>
                              <TableCell className="text-right font-mono font-black text-primary text-[11px]">{formatUCS(item.saldoFinalAtual)}</TableCell>
                              <TableCell className="text-center">
                                {item.statusAuditoriaSaldo === 'valido' ? (
                                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] font-black uppercase px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Válido</Badge>
                                ) : item.statusAuditoriaSaldo === 'inconsistente' ? (
                                  <Badge className="bg-rose-50 text-rose-500 border-rose-100 text-[8px] font-black uppercase px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3 mr-1" /> Divergente</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-400 border-slate-200 text-[8px] font-black uppercase px-2 py-1 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center pr-6">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setEditingEntity(item)}
                                  className="h-8 w-8 text-slate-300 hover:text-primary transition-all"
                                >
                                  <Search className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-8 py-3 bg-white border-t border-slate-100 shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Página {currentPage} de {totalPages} · {nucleoRecords.length} registros
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-9 h-9 rounded-xl">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-9 h-9 rounded-xl">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <Footer />
      </main>

      {/* EDIT DIALOG */}
      <EntityEditDialog 
        entity={editingEntity}
        open={!!editingEntity}
        onOpenChange={(open: boolean) => !open && setEditingEntity(null)}
        onUpdate={handleUpdate}
      />

      <NucleoConsolidatedReport 
        records={nucleoRecords} 
        nucleoName={activeNucleo || "GERAL"} 
      />
    </div>
  );
}

export default function NucleosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <NucleosContent />
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

