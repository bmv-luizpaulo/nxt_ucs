"use client"

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, ChevronLeft, Globe, Database, 
  Calendar, Layers, MapPin, ShieldCheck,
  FileText, ShieldAlert
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/layout/Sidebar";
import FarmMap from "@/components/fazendas/FarmMap";
import { cn } from "@/lib/utils";

// Hooks e Componentes Locais
import { useFazendaLogic } from "./hooks/useFazendaLogic";
import { 
  PropertyHeader, OwnershipCard, 
  TechRow, SoilProgress 
} from "./components/PropertyPageComponents";

export default function FazendaDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { fazenda, audit, isLoading, isEmpty } = useFazendaLogic(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C11]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.3em]">Sincronizando Geometria...</p>
        </div>
      </div>
    );
  }

  if (isEmpty || !fazenda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white flex-col gap-6">
        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
          <MapPin className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase">Propriedade não encontrada</h2>
        <Button onClick={() => router.push('/fazendas')} variant="outline" className="rounded-xl">
          Voltar para Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <PropertyHeader fazenda={fazenda} />

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="geral" className="flex-1 flex flex-col overflow-hidden">
            {/* TABS NAVIGATION */}
            <div className="px-10 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <TabsList className="bg-transparent h-16 gap-10 border-none p-0">
                <TabsTrigger value="geral" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none h-full px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 transition-all shadow-none">
                  <Globe className="w-4 h-4 mr-2" /> Visão Geral & Geo
                </TabsTrigger>
                <TabsTrigger value="audit" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none h-full px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 transition-all shadow-none">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Auditoria de Originação
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                 <Button onClick={() => router.push('/fazendas')} variant="ghost" className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 tracking-widest gap-2">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                 </Button>
                 <Button className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" /> Exportar Ficha Técnica
                 </Button>
              </div>
            </div>

            {/* TAB: VISAO GERAL */}
            <TabsContent value="geral" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 bg-[#F8FAFC]">
                <div className="p-10 grid grid-cols-1 xl:grid-cols-12 gap-10">
                  
                  {/* MAPA E PROPRIETARIOS */}
                  <div className="xl:col-span-8 space-y-10">
                    <div className="aspect-[16/8] bg-[#0B0F1A] rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/5">
                       {fazenda.lat && fazenda.long ? (
                         <FarmMap fazenda={fazenda} />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-500 uppercase font-black text-xs gap-3">
                           <MapPin className="w-5 h-5 animate-bounce" /> Aguardando Importação de Coordenadas
                         </div>
                       )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-[12px] font-black uppercase text-slate-900 tracking-widest flex gap-2 items-center">
                          <Layers className="w-5 h-5 text-emerald-500" /> Malha de Proprietários
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Distribuição por Percentual</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {fazenda.proprietarios?.map((p, i) => (
                          <OwnershipCard key={i} prop={p} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SIDEBAR TÉCNICA */}
                  <div className="xl:col-span-4 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 space-y-8 shadow-sm">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Performance de Solo</h3>
                      <div className="space-y-8">
                         <SoilProgress label="Reserva de Vegetação" value={fazenda.areaVegetacao} total={fazenda.areaTotal || 1} color="bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                         <SoilProgress label="Área Consolidada" value={fazenda.areaConsolidada} total={fazenda.areaTotal || 1} color="bg-amber-500 shadow-lg shadow-amber-500/20" />
                      </div>
                    </div>

                    <div className="bg-[#080C11] rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
                        <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest relative z-10">Métricas de Originação</h3>
                        <div className="space-y-4 relative z-10">
                          <TechRow 
                            icon={<Database className="w-5 h-5" />} 
                            label="Saldo UCS (Consolidado)" 
                            value={audit?.originacao?.toLocaleString('pt-BR') || fazenda.ucs?.toLocaleString('pt-BR') || '0'} 
                            highlight={!!audit?.originacao || !!fazenda.ucs} 
                          />
                          <TechRow 
                            icon={<Calendar className="w-5 h-5" />} 
                            label="Safra Referência" 
                            value={audit?.safra || fazenda.safraReferencia || fazenda.safra || '---'} 
                            highlight={!!audit?.safra}
                          />
                          <TechRow 
                            icon={<Globe className="w-5 h-5" />} 
                            label="Geometria Centróide" 
                            value={fazenda.lat && fazenda.long ? `${Number(fazenda.lat).toFixed(4)}, ${Number(fazenda.long).toFixed(4)}` : "Aguardando GPS"} 
                          />
                          <TechRow 
                            icon={<Database className="w-5 h-5" />} 
                            label="Código ISIN" 
                            value={audit?.isin || fazenda.isin || 'NÃO GERADO'} 
                            highlight={!!audit?.isin}
                          />
                        </div>
                    </div>
                  </div>

                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: AUDITORIA */}
            <TabsContent value="audit" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 bg-[#F8FAFC]">
                <div className="p-10">
                   {audit ? (
                     <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 shadow-sm space-y-12">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                 <ShieldCheck className="w-6 h-6" />
                              </div>
                              <div>
                                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registro Consolidado de Originação</h2>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronizado via {audit.id}</p>
                              </div>
                           </div>
                           <Badge className="bg-emerald-500 text-white border-none px-6 py-2 rounded-xl font-black text-[12px] uppercase tracking-widest">VÁLIDO</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                           <AuditItem label="Volume Auditado (UCS)" value={audit.originacao?.toLocaleString('pt-BR')} highlight />
                           <AuditItem label="Área Auditada" value={`${audit.areaTotal?.toLocaleString('pt-BR')} ha`} />
                           <AuditItem label="Safra de Registro" value={audit.safra} />
                           <AuditItem label="Código ISIN" value={audit.isin} mono />
                        </div>

                        <div className="pt-10 border-t border-slate-50 flex flex-col gap-4">
                           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Hash de Integridade (Blockchain)</p>
                           <p className="text-[12px] font-mono font-bold text-slate-400 break-all bg-slate-50 p-6 rounded-2xl border border-slate-100">{audit.hashOriginacao || '---'}</p>
                        </div>
                     </div>
                   ) : (
                     <div className="bg-amber-50 rounded-[2.5rem] border border-amber-100 p-20 text-center flex flex-col items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-xl shadow-amber-900/5">
                           <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-amber-900 uppercase">Nenhum registro de auditoria automática encontrado</h3>
                        <p className="text-[12px] text-amber-700/60 max-w-md font-medium">Não detectamos um vínculo formal com a tabela de safra consolidada para este IDF. Os dados exibidos serão baseados apenas no cadastro manual da fazenda.</p>
                     </div>
                   )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function AuditItem({ label, value, highlight, mono }: { label: string; value?: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn(
        "text-[18px] font-black tracking-tighter",
        highlight ? "text-emerald-600" : "text-slate-900",
        mono && "font-mono"
      )}>{value || '---'}</p>
    </div>
  );
}
