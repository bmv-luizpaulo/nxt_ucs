"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Plus, Building2, Search, Trash2,
  ChevronLeft, ChevronRight, MapPin, Users, Layers, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy, setDoc, deleteDoc, writeBatch, addDoc } from "firebase/firestore";
import { Fazenda } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { FazendaForm } from "@/components/fazendas/FazendaForm";
import { FazendaBulkImport } from "@/components/fazendas/FazendaBulkImport";
import { FazendaKMLImport, KMLParseResult } from "@/components/fazendas/FazendaKMLImport";
import { FazendaDetail } from "@/components/fazendas/FazendaDetail";
import { SingleFazendaKMLImport } from "@/components/fazendas/SingleFazendaKMLImport";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SafraBulkDialog } from "@/components/safras/SafraBulkDialog";

function FazendasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSafraDialogOpen, setIsSafraDialogOpen] = useState(false);
  const [editingFazenda, setEditingFazenda] = useState<Fazenda | null>(null);
  const [viewingFazenda, setViewingFazenda] = useState<Fazenda | null>(null);
  const [filterOrphans, setFilterOrphans] = useState(false);
  const [filterPJ, setFilterPJ] = useState(false);
  const itemsPerPage = 50;


  useEffect(() => {
    if (!isUserLoading && !user) router.push("/");
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [user, isUserLoading, router, searchParams]);

  const fazendasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "fazendas"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: allFazendas, isLoading } = useCollection<Fazenda>(fazendasQuery);

  const isOrphan = (f: Fazenda) =>
    !(f.proprietarios || []).some(p => (p.documento || '').trim() || (p.nome || '').trim());

  const hasPJ = (f: Fazenda) =>
    (f.proprietarios || []).some(p => p.tipo === 'PJ' && (p.documento || '').trim());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (allFazendas || []).filter(f => {
      if (filterOrphans && !isOrphan(f)) return false;
      if (filterPJ && !hasPJ(f)) return false;
      return (
        !q ||
        f.nome?.toLowerCase().includes(q) ||
        f.idf?.toLowerCase().includes(q) ||
        f.municipio?.toLowerCase().includes(q) ||
        f.nucleo?.toLowerCase().includes(q) ||
        f.proprietarios?.some(p => p.nome?.toLowerCase().includes(q) || p.documento?.includes(q))
      );
    });
  }, [allFazendas, search, filterOrphans, filterPJ]);

  useEffect(() => { setCurrentPage(1); setSelectedIds([]); }, [search, filterOrphans, filterPJ]);


  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Firestore não aceita campos 'undefined' — remove todos antes de escrever
  const cleanDoc = (obj: Record<string, any>): Record<string, any> =>
    Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [
          k,
          Array.isArray(v)
            ? v.map(item => typeof item === 'object' && item !== null ? cleanDoc(item) : item)
            : typeof v === 'object' && v !== null
              ? cleanDoc(v)
              : v
        ])
    );

  const handleSave = async (data: Omit<Fazenda, 'id' | 'createdAt'>) => {
    if (!firestore) return;
    try {
      const batch = writeBatch(firestore);
      let fazendaRef;

      if (editingFazenda) {
        fazendaRef = doc(firestore, "fazendas", editingFazenda.id);
        batch.set(fazendaRef, cleanDoc({ ...data, updatedAt: new Date().toISOString() }), { merge: true });
      } else {
        fazendaRef = doc(collection(firestore, "fazendas"));
        batch.set(fazendaRef, cleanDoc({ ...data, createdAt: new Date().toISOString() }));
      }

      // --- AUTOMAÇÃO DE CONTAS (WALLET) ---
      
      // 1. Conta para a Propriedade (IDF)
      if (data.idf) {
        const idfRef = doc(firestore, "produtores", data.idf);
        batch.set(idfRef, {
          id: data.idf,
          idf: data.idf,
          nome: `PROPRIEDADE: ${data.nome}`,
          status: 'disponivel',
          nucleo: data.nucleo,
          municipio: data.municipio,
          areaTotal: data.areaTotal,
          propriedade: data.nome,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // 2. Conta(s) para o(s) Produtor(es)
      for (const prop of (data.proprietarios || [])) {
        if (prop.documento) {
          const prodId = prop.documento.replace(/[^\d]/g, '');
          const prodRef = doc(firestore, "produtores", prodId);
          batch.set(prodRef, {
            id: prodId,
            documento: prop.documento,
            nome: prop.nome,
            status: 'disponivel',
            nucleo: data.nucleo,
            propriedade: data.nome,
            idf: data.idf,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }

      await batch.commit();
      toast({ title: editingFazenda ? "Fazenda atualizada." : "Fazenda cadastrada e contas sincronizadas." });
      
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao salvar fazenda e sincronizar contas." });
    }
    setEditingFazenda(null);
  };

  const handleBulkImport = async (fazendas: Omit<Fazenda, 'id' | 'createdAt'>[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    fazendas.forEach(f => {
      const ref = doc(collection(firestore, "fazendas"));
      batch.set(ref, cleanDoc({ ...f, createdAt: new Date().toISOString() }));
    });
    await batch.commit();
    toast({ title: `${fazendas.length} fazenda(s) importadas com sucesso.` });
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "fazendas", id));
    toast({ variant: "destructive", title: "Fazenda removida." });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "fazendas", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: `${selectedIds.length} fazenda(s) removidas.` });
  };

  const handleKMLImport = async (results: KMLParseResult[]) => {
    if (!firestore || !allFazendas) return;
    // Indexa as fazendas existentes por IDF para lookup rápido
    const byIdf: Record<string, string> = {}; // idfLocalizado → docId
    allFazendas.forEach(f => {
      if (f.idf) {
        const cleanIdf = f.idf.toString().trim();
        byIdf[cleanIdf] = f.id;
      }
    });

    let linked = 0;
    let notFound = 0;
    const batch = writeBatch(firestore);

    results.forEach(r => {
      const docId = byIdf[r.idf];
      if (!docId) { notFound++; return; }
      
      // Converte para objetos simples para o Firestore
      const updateData = cleanDoc({
        polygonCoordinates: r.polygonCoordinates,
        lat: r.centroidLat,
        long: r.centroidLon,
        updatedAt: new Date().toISOString(),
      });

      batch.set(doc(firestore, "fazendas", docId), updateData, { merge: true });
      linked++;
    });

    await batch.commit();
    toast({ title: `${linked} fazenda(s) vinculadas com polígono KML.${notFound > 0 ? ` ${notFound} IDF(s) não encontrado(s).` : ''}` });
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelectedIds(selectedIds.length === paginated.length ? [] : paginated.map(f => f.id));

  if (isUserLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cadastro de Fazendas</h1>
            <p className="text-[12px] font-medium text-slate-400">
              Propriedades rurais · Proprietários · Áreas registradas
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {allFazendas?.length || 0} propriedades
            </Badge>
            <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-100 uppercase">
              {user.email?.substring(0, 2)}
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 space-y-6 overflow-y-auto">

          {/* ACTIONS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, IDF, proprietário, município..."
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-sm shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
              <div className="flex items-center gap-3">
                {selectedIds.length > 0 && (
                  <>
                    <Button 
                      onClick={() => setIsSafraDialogOpen(true)} 
                      className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[12px] gap-2 shadow-lg transition-all active:scale-95"
                    >
                      <Layers className="w-4 h-4 text-emerald-400" /> Gerar Safra ({selectedIds.length})
                    </Button>
                    <Button onClick={handleBulkDelete} variant="destructive" className="h-11 px-6 rounded-xl font-bold text-[12px] gap-2">
                       <Trash2 className="w-4 h-4" /> Excluir ({selectedIds.length})
                    </Button>
                  </>
                )}
                <FazendaBulkImport onImport={handleBulkImport} />
                <FazendaKMLImport onImport={handleKMLImport} />
                <Button
                  onClick={() => { setEditingFazenda(null); setIsFormOpen(true); }}
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Nova Fazenda
                </Button>
              </div>
          </div>

          {/* STATS */}
          {(allFazendas?.length || 0) > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard label="Total Registradas" value={allFazendas?.length || 0} unit="fazendas" color="emerald" />
              <StatCard
                label="Área Total"
                value={Math.round(allFazendas?.reduce((s, f) => s + (f.areaTotal || 0), 0) || 0).toLocaleString('pt-BR')}
                unit="ha"
                color="teal"
              />
              <StatCard
                label="Proprietários Únicos"
                value={new Set(allFazendas?.flatMap(f => f.proprietarios?.map(p => p.documento) || [])).size}
                unit="pessoas"
                color="indigo"
              />
              <StatCard
                label="Pessoa Jurídica (PJ)"
                value={new Set(
                  allFazendas?.flatMap(f =>
                    (f.proprietarios || [])
                      .filter(p => p.tipo === 'PJ' && p.documento)
                      .map(p => p.documento)
                  ) || []
                ).size}
                unit="empresas"
                color="amber"
                active={filterPJ}
                onClick={() => setFilterPJ(v => !v)}
              />
              <StatCard
                label="Sem Proprietário"
                value={allFazendas?.filter(isOrphan).length || 0}
                unit="sem vínculo"
                color="rose"
                active={filterOrphans}
                onClick={() => setFilterOrphans(v => !v)}
              />
            </div>
          )}



          {/* TABLE */}
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-black text-slate-500 uppercase tracking-widest">Nenhuma fazenda cadastrada</p>
                  <p className="text-[11px] text-slate-400 mt-1">Clique em "Nova Fazenda" ou importe uma planilha para começar</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="py-4 pl-8 w-10">
                        <Checkbox
                          checked={selectedIds.length === paginated.length && paginated.length > 0}
                          onCheckedChange={toggleAll}
                          className="rounded-md border-slate-300"
                        />
                      </th>
                      {['Propriedade', 'Área (ha)', 'Produtores', 'Localização', 'Núcleo', 'Status', ''].map(h => (
                        <th key={h} className="text-left py-4 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(fazenda => (
                      <tr key={fazenda.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                        <td className="pl-8 py-4">
                          <Checkbox
                            checked={selectedIds.includes(fazenda.id)}
                            onCheckedChange={() => toggleSelect(fazenda.id)}
                            className="rounded-md border-slate-300"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3"></div>
                          <div 
                            onClick={() => router.push(`/fazendas/${fazenda.id}`)}
                            className="flex items-center gap-3 cursor-pointer group/name hover:opacity-80 transition-all"
                          >
                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 group-hover/name:bg-emerald-100 transition-colors">
                              <Building2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-slate-900 group-hover/name:text-emerald-600 transition-colors">{fazenda.nome}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-slate-400">IDF: {fazenda.idf}</span>
                                {!fazenda.polygonCoordinates?.length && (
                                  <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase text-amber-500 border-amber-200 bg-amber-50 rounded-full shrink-0">
                                    Sem KML
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-800">{fazenda.areaTotal?.toLocaleString('pt-BR')} ha</span>
                            {fazenda.areaVegetacao && (
                              <span className="text-[9px] text-emerald-500 font-bold">
                                Veg: {fazenda.areaVegetacao.toLocaleString('pt-BR')} ha
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            {(fazenda.proprietarios || []).map((p, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-slate-300 shrink-0" />
                                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[160px]">{p.nome}</span>
                                {p.percentual !== 100 && (
                                  <span className="text-[9px] text-slate-400">({p.percentual}%)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {(fazenda.municipio || fazenda.uf) && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="text-[11px]">{fazenda.municipio}{fazenda.uf ? `/${fazenda.uf}` : ''}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[11px] text-slate-500">{fazenda.nucleo || '—'}</td>
                        <td className="py-4 px-4">
                          <Badge className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-none",
                            fazenda.status === 'ativa' ? "bg-emerald-100 text-emerald-700" :
                            fazenda.status === 'inativa' ? "bg-slate-100 text-slate-500" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {fazenda.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 pr-8 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {!fazenda.polygonCoordinates?.length && (
                              <SingleFazendaKMLImport fazendaId={fazenda.id} />
                            )}
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => router.push(`/fazendas/${fazenda.id}`)}
                              className="h-8 px-3 rounded-lg text-emerald-600 hover:bg-emerald-50 font-black uppercase text-[10px] tracking-widest gap-1.5 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" /> Visualizar
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              onClick={() => { setEditingFazenda(fazenda); setIsFormOpen(true); }}
                              className="h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest border-slate-200"
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleDelete(fazenda.id)}
                              className="h-8 w-8 p-0 rounded-lg text-rose-400 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="h-16 flex items-center justify-between px-10 border-t border-slate-100 bg-slate-50/20">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages} · {filtered.length} fazendas
                </p>
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
          </div>
        </div>
      </main>

      {/* FORM DIALOG */}
      <FazendaForm
        open={isFormOpen}
        onOpenChange={(v) => { setIsFormOpen(v); if (!v) setEditingFazenda(null); }}
        onSave={handleSave}
        initial={editingFazenda}
      />
      <FazendaDetail
        fazenda={viewingFazenda}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
      
      <SafraBulkDialog
        open={isSafraDialogOpen}
        onOpenChange={setIsSafraDialogOpen}
        selectedFarms={allFazendas?.filter(f => selectedIds.includes(f.id)) || []}
        onSuccess={() => setSelectedIds([])}
      />
    </div>
  );
}

function StatCard({ label, value, unit, color, onClick, active }: {
  label: string; value: any; unit: string; color: string;
  onClick?: () => void; active?: boolean;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    teal: "bg-teal-50 border-teal-100 text-teal-700",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    rose: "bg-rose-50 border-rose-100 text-rose-600",
  };
  const activeRing: Record<string, string> = {
    rose: "ring-2 ring-rose-400 ring-offset-1 shadow-rose-100 shadow-md",
    amber: "ring-2 ring-amber-400 ring-offset-1 shadow-amber-100 shadow-md",
  };
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200",
        colors[color] || colors.emerald,
        onClick ? "cursor-pointer hover:opacity-80 select-none" : "",
        active ? (activeRing[color] || "ring-2 ring-slate-400") : "",
      )}
      onClick={onClick}
    >
      <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1 flex items-center gap-1.5">
        {label}
        {active && <span className="bg-rose-500 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black">ATIVO</span>}
      </p>
      <p className="text-[22px] font-black leading-none">{value}</p>
      <p className="text-[9px] font-bold opacity-50 mt-0.5">{active ? 'clique para limpar' : unit}</p>
    </div>
  );
}

export default function FazendasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>}>
      <FazendasContent />
    </Suspense>
  );
}
