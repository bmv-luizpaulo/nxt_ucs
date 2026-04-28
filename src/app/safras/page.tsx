"use client"

import { useState, useEffect, useMemo } from "react";
import { 
  Leaf, Search, Wand2, X, Calendar, Calculator, Landmark, 
  ShieldCheck, Loader2, Plus, ArrowUpRight, Database,
  TrendingUp, FileText, LayoutGrid, List
} from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SafraBulkImport } from "@/components/safras/SafraBulkImport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function SafrasPage() {
  const [loading, setLoading] = useState(true);
  const [safras, setSafras] = useState<any[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const db = useFirestore();
  const router = useRouter();

  const loadSafras = async () => {
    setLoading(true);
    try {
      // No novo modelo, as safras são identificadas pelos anos nos documentos de originação
      // Buscamos a coleção 'safras' direto (onde estão os documentos de cada ano)
      const safrasSnap = await getDocs(collection(db, "safras"));
      const list = safrasSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSafras(list.sort((a, b) => b.id.localeCompare(a.id)));
    } catch (e) {
      console.error("Erro ao carregar safras:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSafras();
  }, [db]);

  const filteredSafras = safras.filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const totalUCS = safras.reduce((acc, curr) => acc + (curr.totalUCS || 0), 0);
    return {
      totalUCS,
      totalSafras: safras.length,
      totalFazendas: safras.reduce((acc, curr) => acc + (curr.totalFazendas || 0), 0)
    };
  }, [safras]);

  return (
    <div className="p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      {/* HEADER DA CENTRAL DE SAFRAS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Leaf className="w-6 h-6" />
             </div>
             <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Minhas Safras</h1>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] ml-15">
            Gestão de Auditoria e Originação Técnica
          </p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar Safra (Ano)..."
                className="w-full md:w-72 h-14 pl-12 bg-white border-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest focus:ring-emerald-500/20 shadow-sm"
              />
           </div>
           
           <Button 
            onClick={() => setIsImportOpen(true)}
            className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest gap-3 shadow-xl hover:bg-emerald-600 transition-all border-b-4 border-slate-950 hover:border-emerald-800"
           >
              <Plus className="w-4 h-4" /> Nova Carga de Safra
           </Button>
        </div>
      </div>

      {/* DASHBOARD DE MONITORAMENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatCard 
            icon={<Calculator className="w-6 h-6" />}
            label="Total UCS Gênese"
            value={stats.totalUCS.toLocaleString('pt-BR')}
            color="text-emerald-600"
            trend="+12.4% vs 2023"
         />
         <StatCard 
            icon={<Landmark className="w-6 h-6" />}
            label="Fazendas Auditadas"
            value={stats.totalFazendas}
            color="text-blue-600"
         />
          <StatCard 
            icon={<FileText className="w-6 h-6" />}
            label="Ciclos Registrados"
            value={stats.totalSafras}
            color="text-amber-500"
         />
      </div>

      {/* GRID DE SAFRAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-[2.5rem] bg-slate-100 animate-pulse border border-slate-50"></div>
          ))
        ) : filteredSafras.map((safra) => (
          <div 
            key={safra.id}
            onClick={() => router.push(`/safras/${safra.id}`)}
            className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>
            
            <div className="flex items-center justify-between relative z-10 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                 <Calendar className="w-7 h-7" />
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-sm">Auditada</Badge>
            </div>

            <div className="space-y-4 relative z-10">
               <div>
                  <h3 className="text-3xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">SAFRA {safra.id}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ciclo de Originação Ativo</p>
               </div>

               <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume Total</p>
                     <p className="text-lg font-black text-slate-700">{(safra.totalUCS || 0).toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400">UCS</span></p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                     <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE IMPORTAÇÃO (BULK IMPORT REFORMADO) */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
         <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[3rem]">
            <ScrollArea className="h-full">
               <SafraBulkImport onComplete={() => {
                 setIsImportOpen(false);
                 loadSafras();
               }} />
            </ScrollArea>
         </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, color, trend }: any) {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
      <div className="flex items-center gap-6 relative z-10">
        <div className={cn("w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform", color)}>{icon}</div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <div className="flex items-baseline gap-3">
             <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
             {trend && <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}