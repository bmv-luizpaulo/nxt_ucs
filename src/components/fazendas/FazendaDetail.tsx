"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Fazenda } from "@/lib/types";
import {
  MapPin, Building2, Users,
  Globe, Shield, Activity,
  MoveUpRight, Database, Calendar, AlertCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FarmMap from "./FarmMap";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, or } from "firebase/firestore";
import { EntidadeSaldo } from "@/lib/types";

interface FazendaDetailProps {
  fazenda: Fazenda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FazendaDetail({ fazenda, open, onOpenChange }: FazendaDetailProps) {
  const router = useRouter();
  const firestore = useFirestore();

  const origQuery = useMemoFirebase(() => {
    if (!firestore || !fazenda?.idf || !open) return null;
    const rawIdf = fazenda.idf.toString().trim();
    const cleanIdf = rawIdf.replace(/^0+/, '');
    const cleanNome = (fazenda.nome || "").toString().trim();
    
    return query(
      collection(firestore, "safras_registros"), 
      or(
        where("idf", "==", rawIdf), 
        where("idf", "==", cleanIdf),
        where("propriedade", "==", cleanNome)
      )
    );
  }, [firestore, fazenda?.idf, fazenda?.nome, open]);

  const { data: origRecords, isLoading: isFetchingOrig } = useCollection<EntidadeSaldo>(origQuery);
  const origRecord = origRecords?.[0];

  if (!fazenda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[95vw] h-[90vh] p-0 border-none bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes da Fazenda: {fazenda.nome}</DialogTitle>
        </DialogHeader>

        {/* TOP BANNER */}
        <div className="bg-[#0B0F1A] p-10 shrink-0 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  ID: {fazenda.idf}
                </Badge>
                {fazenda.status === 'ativa' && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest flex gap-2 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> CERTIFICADA
                  </Badge>
                )}
              </div>
              <h1 className="text-[32px] font-black text-white uppercase tracking-tight leading-none max-w-2xl">{fazenda.nome}</h1>
              <div className="flex items-center gap-6 text-slate-400">
                <span className="flex items-center gap-2 text-[12px] font-bold">
                  <MapPin className="w-4 h-4 text-emerald-500" /> {fazenda.municipio || "RESERVA DO CABAÇAL"} / {fazenda.uf || "MT"}
                </span>
                <span className="flex items-center gap-2 text-[12px] font-bold">
                   <Building2 className="w-4 h-4 text-emerald-500" /> {fazenda.nucleo}
                </span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
            </div>
          </div>
        </div>

        <Tabs defaultValue="geral" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-10 py-1 bg-white border-b border-slate-100 shrink-0">
            <TabsList className="bg-transparent h-12 gap-8 border-none p-0">
              <TabsTrigger value="geral" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none h-full px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-emerald-600 transition-all shadow-none">
                <Database className="w-4 h-4 mr-2" /> Dados Gerais
              </TabsTrigger>
              <TabsTrigger value="origination" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent rounded-none h-full px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-emerald-600 transition-all shadow-none">
                <Shield className="w-4 h-4 mr-2" /> Auditoria Técnica
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="geral" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
            <ScrollArea className="flex-1 bg-slate-50/50">
              <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">

                <div className="lg:col-span-8 space-y-8">
                  {/* MAP / POLYGON VISUALIZATION */}
                  <div className="aspect-[16/9] bg-[#0B0F1A] rounded-[2rem] overflow-hidden relative shadow-inner">
                      {fazenda.lat && fazenda.long ? (
                        <div className="w-full h-full relative">
                            <FarmMap fazenda={fazenda} />
                            <div className="absolute bottom-8 left-8 ring-1 ring-white/10 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 z-[1000]">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Geometria Realizada</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{fazenda.polygonCoordinates?.length || 0} pontos de GPS</p>
                            </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-slate-100">
                          <MapPin className="w-10 h-10 text-slate-300 mb-4" />
                          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Sem Coordenadas</h3>
                          <p className="text-slate-400 text-[11px] max-w-xs mt-2 font-medium">Use o botão "Importar KML" ou preencha as coordenadas manualmente para ver o mapa.</p>
                        </div>
                      )}
                  </div>

                  {/* PRODUTORES */}
                  <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex gap-2 items-center">
                        <Users className="w-4 h-4" /> Produtores Vinculados
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fazenda.proprietarios.map((p, i) => (
                          <div 
                            key={i} 
                            onClick={() => router.push(`/produtores?search=${p.documento}`)}
                            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-500 hover:bg-emerald-50/10 cursor-pointer transition-all group/prod"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-[13px] font-black text-emerald-600 shrink-0 uppercase group-hover/prod:bg-emerald-100 transition-colors">
                              {p.nome?.substring(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-black text-slate-900 truncate uppercase leading-tight group-hover/prod:text-emerald-700 transition-colors">{p.nome}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{p.documento}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="text-[14px] font-black text-emerald-600 leading-none">{p.percentual}%</p>
                              <MoveUpRight className="w-3 h-3 text-emerald-300 opacity-0 group-hover/prod:opacity-100 transition-all" />
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {/* AREA BREAKDOWN */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 space-y-6 shadow-sm">
                      <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Uso do Solo</h3>
                      <div className="space-y-6">
                          <AreaStat label="Área de Vegetação" value={fazenda.areaVegetacao} total={fazenda.areaTotal} color="bg-emerald-500" />
                          <AreaStat label="Área Consolidada" value={fazenda.areaConsolidada} total={fazenda.areaTotal} color="bg-amber-500" />
                      </div>
                    </div>

                    {/* TECHNICAL INFO BRIEF */}
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                        <h3 className="text-[9px] font-black uppercase text-emerald-400 tracking-widest relative z-10">Informações Técnicas</h3>
                        <div className="space-y-5 relative z-10">
                          <TechRow icon={<Globe className="w-4 h-4" />} label="Geolocalização" value={`${fazenda.lat}, ${fazenda.long}`} />
                          <TechRow 
                              icon={<Database className="w-4 h-4" />} 
                              label="Saldo de Originação" 
                              value={isFetchingOrig ? "Sincronizando..." : origRecord?.originacao ? `${origRecord.originacao.toLocaleString('pt-BR')} UCS` : fazenda.ucs ? `${fazenda.ucs.toLocaleString('pt-BR')} UCS` : "Não Vinculado"} 
                              highlight={!!origRecord?.originacao || !!fazenda.ucs}
                          />
                          <TechRow 
                              icon={<Calendar className="w-4 h-4" />} 
                              label="Safra Referência" 
                              value={isFetchingOrig ? "Sincronizando..." : origRecord?.safra ? `Safra ${origRecord.safra}` : fazenda.safra ? `Safra ${fazenda.safra}` : (fazenda.dataRegistro?.slice(-4) || "Não Informado")} 
                              highlight={!!origRecord?.safra || !!fazenda.safra}
                          />
                        </div>
                    </div>

                    <Button className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95">
                      Baixar Certificado
                    </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="origination" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
            <ScrollArea className="flex-1 bg-slate-50/50">
              <div className="p-10 space-y-8">
                {/* CARD DE ORIGINAÇÃO TÉCNICA */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:bg-emerald-100 transition-colors" />
                  
                  <div className="flex items-center gap-3 mb-10 relative z-10">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-[14px] font-black uppercase tracking-widest text-slate-900">Dados da Safra e Originação Técnica</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10 relative z-10">
                    <GridInfo label="Safra" value={origRecord?.safra || fazenda.safra || "Não Informado"} />
                    <GridInfo label="Propriedade" value={origRecord?.propriedade || fazenda.nome} />
                    <GridInfo label="Identificador (IDF)" value={origRecord?.idf || fazenda.idf} />
                    <GridInfo label="Data Registro" value={origRecord?.dataRegistro || fazenda.dataRegistro || "Não Informado"} />
                    
                    <GridInfo label="Área Total" value={origRecord?.areaTotal ? `${origRecord.areaTotal.toLocaleString('pt-BR')} ha` : `${fazenda.areaTotal?.toLocaleString('pt-BR')} ha`} />
                    <GridInfo label="Área Vegetação" value={origRecord?.areaVegetacao ? `${origRecord.areaVegetacao.toLocaleString('pt-BR')} ha` : `${fazenda.areaVegetacao?.toLocaleString('pt-BR')} ha`} color="text-emerald-600" />
                    <GridInfo label="Coordenadas" value={origRecord?.lat ? `${origRecord.lat}, ${origRecord.long}` : `${fazenda.lat}, ${fazenda.long}`} />
                    <GridInfo label="Núcleo" value={origRecord?.nucleo || fazenda.nucleo} />
                    
                    <div className="lg:col-span-1">
                      <GridInfo label="Originação da Fazenda (UCS)" value={origRecord?.originacao ? `${origRecord.originacao.toLocaleString('pt-BR')}` : fazenda.ucs ? `${fazenda.ucs.toLocaleString('pt-BR')}` : "---"} color="text-indigo-600" />
                    </div>
                    <div className="lg:col-span-1">
                      <GridInfo label="Código ISIN" value={origRecord?.isin || fazenda.isin || "Não Informado"} mono />
                    </div>
                    <div className="lg:col-span-2">
                      <GridInfo label="Hash Originação" value={origRecord?.hashOriginacao || fazenda.hashOriginacao || "---"} mono truncate />
                    </div>
                  </div>

                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GridInfo({ label, value, mono, truncate, color }: { label: string; value: string; mono?: boolean; truncate?: boolean; color?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">{label}</p>
      <p className={cn(
        "text-[12px] font-black tracking-tight",
        mono && "font-mono",
        truncate && "truncate max-w-[300px]",
        color || "text-slate-700"
      )}>
        {value}
      </p>
    </div>
  );
}

function TechRow({ icon, label, value, mono = false, highlight = false }: { icon: any; label: string; value: string; mono?: boolean, highlight?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", highlight ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-400")}>{icon}</div>
      <div className="space-y-0.5">
        <p className={cn("text-[9px] font-black uppercase tracking-widest leading-none", highlight ? "text-emerald-400" : "text-slate-400 opacity-60")}>{label}</p>
        <p className={cn("text-[12px] font-bold leading-tight", mono && "font-mono", highlight ? "text-emerald-400" : "text-white")}>{value}</p>
      </div>
    </div>
  );
}

function AreaStat({ label, value, total, color }: { label: string; value?: number; total: number; color: string }) {
  if (value === undefined) return null;
  const pct = (value / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{label}</p>
        <p className="text-[13px] font-black text-slate-900">{value.toLocaleString('pt-BR')} ha</p>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
