"use client"

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer, X, FileText, Info, MapPin, ExternalLink, Calendar, Scale, PieChart, Database, User, Building2, Cpu, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Link from "next/link";
import { getLinkWithFilter } from "./EntityFilters";

interface FarmViewDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allData?: EntidadeSaldo[];
}

export function FarmViewDialog({ entity, open, onOpenChange, allData }: FarmViewDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [reportType, setReportType] = useState<'executive' | 'juridico'>('executive');
  const formatUCS = (val: number | undefined) => (val || 0).toLocaleString('pt-BR');

  // Consulta para buscar os 3 participantes do particionamento
  const participantsQuery = useMemoFirebase(() => {
    if (!firestore || !entity || !open) return null;
    return query(
      collection(firestore, "produtores"),
      where("safra", "==", entity.safra),
      where("idf", "==", entity.idf || "")
    );
  }, [firestore, entity, open]);

  const { data: participants } = useCollection<EntidadeSaldo>(participantsQuery);

  const farmData = useMemo(() => {
    if (!entity) return null;
    const totalVolume = entity.originacaoFazendaTotal || entity.originacao || 0;
    const splitValue = totalVolume * (33.33333 / 100);

    return {
      nome: entity.propriedade || "Sem Nome",
      proprietario: entity.nome || "Não Identificado",
      documento: entity.documento,
      idf: entity.idf,
      safra: entity.safra,
      areaTotal: entity.areaTotal,
      areaVeg: entity.areaVegetacao,
      nucleo: entity.nucleo,
      lat: entity.lat,
      long: entity.long,
      totalVolume,
      splitValue,
      dataRegistro: entity.dataRegistro
    };
  }, [entity]);

  if (!entity || !farmData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Dossiê de Originação: {farmData.nome}</DialogTitle>
          <DialogDescription>Relatório técnico de originação e particionamento de saldo.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            
            {/* SEÇÃO 1: A FUNDAÇÃO (A TERRA E A IDENTIDADE) */}
            <div className="bg-[#0F172A] p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">01. Identidade da Propriedade</p>
                      <h1 className="text-3xl font-black tracking-tight uppercase font-headline">{farmData.nome}</h1>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <InfoItem label="Proprietário Originador" value={farmData.proprietario} icon={<User className="w-3 h-3" />} />
                    <InfoItem label="IDF (Identificador)" value={farmData.idf} isMono />
                    <InfoItem label="Núcleo / Associação" value={farmData.nucleo} icon={<Building2 className="w-3 h-3" />} />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coordenadas Gps</p>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${farmData.lat},${farmData.long}`} 
                        target="_blank" 
                        className="text-[13px] font-bold text-emerald-400 hover:text-white transition-colors flex items-center gap-1.5"
                      >
                        {farmData.lat}, {farmData.long} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md min-w-[240px]">
                   <div className="flex items-center gap-2 mb-4">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Áreas Declaradas</p>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase">Área Total</p>
                        <p className="text-lg font-black">{farmData.areaTotal?.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-500">HA</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase">Área Vegetação</p>
                        <p className="text-lg font-black text-emerald-400">{farmData.areaVeg?.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-500">HA</span></p>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: A SAFRA (O EVENTO DE ORIGINAÇÃO) */}
            <div className="p-12 bg-white">
              <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-10 mb-10 gap-8">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                      <Calendar className="w-7 h-7 text-slate-400" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">02. O Evento de Originação</p>
                      <h2 className="text-2xl font-black uppercase text-slate-900">Safra Técnica {farmData.safra}</h2>
                      <p className="text-[12px] font-bold text-slate-400">Registro realizado em {farmData.dataRegistro || '-'}</p>
                   </div>
                </div>

                <div className="text-center md:text-right">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Bruto Total (100%)</p>
                   <div className="flex items-baseline gap-2 justify-end">
                      <span className="text-5xl font-black text-slate-900 tracking-tighter">{formatUCS(farmData.totalVolume)}</span>
                      <span className="text-xl font-black text-emerald-500 uppercase">UCS</span>
                   </div>
                </div>
              </div>

              {/* SEÇÃO 3: A PARTILHA (A DISTRIBUIÇÃO DOS 33,33333%) */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <PieChart className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900">03. Particionamento de Benefícios</h3>
                  <Badge className="bg-emerald-100 text-emerald-700 font-black px-3">REGRE FIXA: 33.33333%</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PartitionCard 
                    title="O Produtor" 
                    subtitle={farmData.proprietario}
                    icon={<User className="w-5 h-5" />}
                    value={farmData.splitValue}
                    color="emerald"
                  />
                  <PartitionCard 
                    title="A Clínica (IMEI)" 
                    subtitle="IMEI CONSULTORIA"
                    icon={<Cpu className="w-5 h-5" />}
                    value={farmData.splitValue}
                    color="indigo"
                  />
                  <PartitionCard 
                    title="O Núcleo (Assoc.)" 
                    subtitle={farmData.nucleo || 'Associação Vinculada'}
                    icon={<Users className="w-5 h-5" />}
                    value={farmData.splitValue}
                    color="amber"
                  />
                </div>
              </div>

              {/* AUDIT TABLE */}
              <div className="mt-16 space-y-6">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Ledger de Originação (Prova de Reserva)</h4>
                </div>
                
                <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-12">
                        <TableHead className="text-[9px] font-black pl-8">PARTICIPANTE</TableHead>
                        <TableHead className="text-[9px] font-black">DOCUMENTO</TableHead>
                        <TableHead className="text-[9px] font-black text-center">FUNÇÃO</TableHead>
                        <TableHead className="text-[9px] font-black text-right pr-8">VOLUME DESTINADO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Linha do Produtor */}
                      <TableRow className="h-14 font-medium">
                        <TableCell className="pl-8 font-bold text-slate-900 uppercase text-[11px]">{farmData.proprietario}</TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-400">{farmData.documento || '-'}</TableCell>
                        <TableCell className="text-center font-black text-[9px] text-emerald-600 uppercase">GERAÇÃO / ORIGINAÇÃO</TableCell>
                        <TableCell className="text-right font-black text-slate-900 pr-8">{formatUCS(farmData.splitValue)} UCS</TableCell>
                      </TableRow>
                      {/* Linha IMEI */}
                      <TableRow className="h-14 font-medium">
                        <TableCell className="pl-8 font-bold text-slate-900 uppercase text-[11px]">IMEI CONSULTORIA</TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-400">01.843.447/0001-95</TableCell>
                        <TableCell className="text-center font-black text-[9px] text-indigo-600 uppercase">CUSTÓDIA TÉCNICA</TableCell>
                        <TableCell className="text-right font-black text-slate-900 pr-8">{formatUCS(farmData.splitValue)} UCS</TableCell>
                      </TableRow>
                      {/* Linha Associação */}
                      <TableRow className="h-14 font-medium">
                        <TableCell className="pl-8 font-bold text-slate-900 uppercase text-[11px]">{farmData.nucleo}</TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-400">-</TableCell>
                        <TableCell className="text-center font-black text-[9px] text-amber-600 uppercase">MANUTENÇÃO / NÚCLEO</TableCell>
                        <TableCell className="text-right font-black text-slate-900 pr-8">{formatUCS(farmData.splitValue)} UCS</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 hover:text-slate-900 px-6">
             <X className="w-4 h-4 mr-2" /> Fechar Dossiê
          </Button>
          <div className="flex gap-3">
             <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest gap-2">
                <Printer className="w-4 h-4" /> Relatório Executivo
             </Button>
             <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest gap-2 text-[#734DCC]">
                <Scale className="w-4 h-4" /> Contraprova Jurídica
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value, icon, isMono }: { label: string, value: any, icon?: React.ReactNode, isMono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className="opacity-50">{icon}</span>}
        <p className={cn("text-[13px] font-bold text-white uppercase", isMono ? "font-mono tracking-tight" : "")}>
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function PartitionCard({ title, subtitle, icon, value, color }: { title: string, subtitle: string, icon: React.ReactNode, value: number, color: 'emerald' | 'indigo' | 'amber' }) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };

  return (
    <div className={cn("p-6 rounded-[2rem] border transition-all hover:shadow-md", colorMap[color])}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{title}</p>
          <p className="text-[12px] font-black truncate max-w-[160px]">{subtitle}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[20px] font-black tracking-tighter">{(value || 0).toLocaleString('pt-BR')} <span className="text-[10px] opacity-60 uppercase">UCS</span></p>
        <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">Saldo Auditado Pós-Divisão</p>
      </div>
    </div>
  );
}