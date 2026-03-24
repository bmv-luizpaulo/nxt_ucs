"use client"

import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntidadeSaldo } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer, ShieldCheck, X, FileText, AlertTriangle,
  ExternalLink, Eye, EyeOff, Database, MapPin, Layers, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getLinkWithFilter } from "./EntityFilters";
import Link from "next/link";

interface ProducerViewDialogProps {
  entity: EntidadeSaldo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  allData?: EntidadeSaldo[]; // Pass all loaded data to avoid extra queries
}

export function ProducerViewDialog({ entity, open, onOpenChange, onEdit, allData }: ProducerViewDialogProps) {
  const { user } = useUser();
  const { firestore: db } = useFirebase();
  const [isCensored, setIsCensored] = useState(false);
  const [relatedFarms, setRelatedFarms] = useState<EntidadeSaldo[]>([]);

  // Busca todas as fazendas do mesmo produtor (mesmo documento)
  useEffect(() => {
    if (!entity || !open) return;
    
    if (allData && allData.length > 0) {
      // Use local data if available
      const farms = allData.filter(e => e.documento === entity.documento);
      setRelatedFarms(farms.length > 1 ? farms : [entity]);
    } else if (db && entity.documento) {
      // Fallback: query Firestore
      const fetchRelated = async () => {
        try {
          const q = query(collection(db, 'produtores'), where('documento', '==', entity.documento));
          const snap = await getDocs(q);
          const farms = snap.docs.map(d => ({ id: d.id, ...d.data() } as EntidadeSaldo));
          setRelatedFarms(farms.length > 0 ? farms : [entity]);
        } catch {
          setRelatedFarms([entity]);
        }
      };
      fetchRelated();
    } else {
      setRelatedFarms([entity]);
    }
  }, [entity, open, db, allData]);

  const formatUCS = (val: number | undefined) => (val || 0).toLocaleString('pt-BR');

  // Consolidação de todas as fazendas
  const consolidated = useMemo(() => {
    if (relatedFarms.length === 0) return { orig: 0, origFazenda: 0, mov: 0, apo: 0, bloq: 0, aq: 0, imei: 0, legado: 0, final: 0 };
    
    const orig = relatedFarms.reduce((sum, f) => sum + (f.saldoParticionado || 0), 0);
    const origFazenda = relatedFarms.reduce((sum, f) => sum + (f.originacao || 0), 0);
    const mov = relatedFarms.reduce((sum, f) => sum + (f.movimentacao || 0), 0);
    const apo = relatedFarms.reduce((sum, f) => sum + (f.aposentado || 0), 0);
    const bloq = relatedFarms.reduce((sum, f) => sum + (f.bloqueado || 0), 0);
    const aq = relatedFarms.reduce((sum, f) => sum + (f.aquisicao || 0), 0);
    const imei = relatedFarms.reduce((sum, f) => sum + (f.saldoAjustarImei || 0), 0);
    const legado = relatedFarms.reduce((sum, f) => sum + (f.saldoLegadoTotal || 0), 0);
    const final_ = relatedFarms.reduce((sum, f) => sum + (f.saldoFinalAtual || 0), 0);
    
    return { orig, origFazenda, mov, apo, bloq, aq, imei, legado, final: final_ };
  }, [relatedFarms]);

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualização do Produtor - {entity.nome}</DialogTitle>
          <DialogDescription>Visão consolidada de todas as fazendas e saldos do produtor.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden print:hidden">
          {/* HEADER */}
          <div className="bg-[#0B0F1A] p-10 shrink-0 text-white relative">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-[#10B981]/20 rounded-md flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#10B981]">Auditoria · Produtor</p>
                </div>
                <h1 className="text-[32px] font-black tracking-tight uppercase leading-none font-headline">{entity.nome}</h1>
                <div className="flex items-center gap-4">
                  <p className="text-[14px] font-bold text-slate-500 font-mono tracking-widest">{entity.documento}</p>
                  <Badge className={cn(
                    "text-[10px] font-black uppercase px-4 py-1.5 rounded-full",
                    entity.status === 'disponivel' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" :
                    entity.status === 'bloqueado' ? "bg-rose-500/20 text-rose-400 border-rose-500/50" :
                    "bg-amber-500/20 text-amber-400 border-amber-500/50"
                  )}>
                    {entity.status === 'disponivel' ? 'APTO / DISPONÍVEL' : entity.status?.toUpperCase()}
                  </Badge>
                  {relatedFarms.length > 1 && (
                    <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/50 text-[10px] font-black uppercase px-4 py-1.5 rounded-full">
                      <Layers className="w-3 h-3 mr-1.5" /> {relatedFarms.length} Fazendas
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-[#161B2E] border border-white/5 rounded-[2.5rem] p-8 min-w-[360px] shadow-2xl flex flex-col items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 blur-3xl -mr-20 -mt-20"></div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Saldo Final Auditado</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-[48px] font-black text-white tracking-tighter leading-none font-headline">{formatUCS(consolidated.final)}</span>
                  <span className="text-[14px] font-black text-[#10B981] uppercase tracking-widest">UCS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              <StatBox label="ORIGINAÇÃO (PART.)" value={consolidated.orig} />
              <StatBox label="ORIG. FAZENDAS" value={consolidated.origFazenda} isHighlight />
              <StatBox label="MOVIMENTAÇÃO" value={consolidated.mov} isNegative />
              <StatBox label="APOSENTADO" value={consolidated.apo} isNegative />
              <StatBox label="BLOQUEADO" value={consolidated.bloq} isNegative />
              <StatBox label="AQUISIÇÃO" value={consolidated.aq} isNegative />
              <StatBox label="AJUSTE IMEI" value={consolidated.imei} isImei />
              <StatBox label="SALDO LEGADO" value={consolidated.legado} isAmber />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-10 space-y-12">
              {/* SEÇÃO: FAZENDAS DO PRODUTOR */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 font-headline">
                    Fazendas do Produtor
                  </h3>
                  <Badge variant="outline" className="text-[9px] font-black uppercase rounded-full px-3 py-1 border-slate-200 text-slate-400">
                    {relatedFarms.length} {relatedFarms.length === 1 ? 'PROPRIEDADE' : 'PROPRIEDADES'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {relatedFarms.map((farm, idx) => (
                    <div key={farm.id} className={cn(
                      "bg-slate-50 border border-slate-100 rounded-[2rem] p-8 transition-all",
                      relatedFarms.length > 1 ? "hover:border-teal-200 hover:shadow-sm" : ""
                    )}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center text-[10px] font-black text-teal-600">
                            {idx + 1}
                          </div>
                          <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-900 font-headline">
                            {farm.propriedade || 'Sem Nome de Propriedade'}
                          </h4>
                          {farm.idf && (
                            <Badge variant="outline" className="text-[8px] font-black text-slate-400 border-slate-200 rounded-full px-2 py-0.5">
                              IDF: {farm.idf}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Originação Fazenda</p>
                          <p className="text-[16px] font-black text-slate-900 font-headline">{formatUCS(farm.originacao)} UCS</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-5">
                        <DetailItem label="Safra" value={farm.safra} />
                        <DetailItem label="Data Registro" value={farm.dataRegistro} />
                        <DetailItem label="Área Total" value={farm.areaTotal ? `${farm.areaTotal.toLocaleString('pt-BR')} ha` : '-'} />
                        <DetailItem label="Área Vegetação" value={farm.areaVegetacao ? `${farm.areaVegetacao.toLocaleString('pt-BR')} ha` : '-'} />
                        <DetailItem label="Núcleo" value={farm.nucleo} />
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coordenadas</p>
                          {farm.lat ? (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${String(farm.lat).replace(',', '.')},${String(farm.long).replace(',', '.')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{farm.lat}, {farm.long}</span>
                              <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                          ) : <p className="text-[11px] font-bold text-slate-900">-</p>}
                        </div>
                        <DetailItem label="ISIN" value={farm.isin} isMono />
                        <DetailItem label="Hash Originação" value={farm.hashOriginacao ? `${farm.hashOriginacao.substring(0, 20)}...` : '-'} isMono />
                      </div>

                      {/* Particionamento desta fazenda */}
                      <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Part. Produtor</p>
                          <p className="text-[13px] font-black text-slate-900">{(farm.particionamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% <span className="text-slate-300">|</span> {formatUCS(farm.saldoParticionado)} UCS</p>
                        </div>
                        {farm.associacaoNome && (
                          <Link 
                            href={getLinkWithFilter("/nucleos", farm.associacaoNome)}
                            onClick={() => onOpenChange(false)}
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-600 transition-colors truncate">{farm.associacaoNome}</p>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-amber-600 shrink-0" />
                            </div>
                            <p className="text-[13px] font-black text-slate-900">{(farm.associacaoParticionamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% <span className="text-slate-300">|</span> {formatUCS(farm.associacaoSaldo)} UCS</p>
                          </Link>
                        )}
                        {farm.imeiSaldo !== undefined && (
                          <Link 
                            href={getLinkWithFilter("/imeis", farm.imeiNome || "IMEI")}
                            onClick={() => onOpenChange(false)}
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-violet-300 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-violet-600 transition-colors">IMEI</p>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-violet-600 shrink-0" />
                            </div>
                            <p className="text-[13px] font-black text-slate-900">{formatUCS(farm.imeiSaldo)} UCS</p>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEÇÃO: APONTAMENTOS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#10B981]" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900 font-headline">Apontamentos de Auditoria</h3>
                  </div>
                  <div className="p-8 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[120px] text-[14px] font-medium text-slate-600 leading-relaxed italic">
                    {entity.observacao || "Nenhum apontamento registrado para este produtor."}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Status da Conformidade</h3>
                  <div className="h-16 flex items-center px-8 bg-slate-50 border border-slate-100 rounded-2xl">
                    {entity.statusAuditoriaSaldo === 'valido' ? (
                      <div className="flex items-center gap-3 text-emerald-600 font-black text-[12px] uppercase tracking-widest">
                        <ShieldCheck className="w-5 h-5" /> SALDO VALIDADO</div>
                    ) : (
                      <div className="flex items-center gap-3 text-amber-500 font-black text-[12px] uppercase tracking-widest">
                        <AlertTriangle className="w-5 h-5" /> PENDENTE DE VALIDAÇÃO
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO: TABELAS DE MOVIMENTAÇÕES — Placeholder para futuro */}
              <div className="text-center py-8 text-slate-300 border border-dashed border-slate-200 rounded-[2rem]">
                <Database className="w-8 h-8 mx-auto mb-3 text-slate-200" />
                <p className="text-[11px] font-black uppercase tracking-widest">Tabelas de Movimentação, Legado, IMEI e Aquisição</p>
                <p className="text-[9px] text-slate-400 mt-1">Dados disponíveis conforme lançamentos forem registrados</p>
              </div>
            </div>
          </ScrollArea>

          {/* FOOTER */}
          <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[11px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 px-8 h-12">
              <X className="w-4 h-4 mr-2" /> Fechar
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsCensored(!isCensored)} 
                className={cn(
                  "h-12 px-5 rounded-2xl border-slate-200 transition-all font-black uppercase text-[10px] tracking-widest",
                  isCensored ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-slate-50/50 text-slate-500"
                )}
              >
                {isCensored ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {isCensored ? "Censura Ativa" : "Censurar"}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="h-12 px-8 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest text-slate-700">
                <Printer className="w-4 h-4 mr-2" /> Relatório
              </Button>
              {onEdit && (
                <Button onClick={onEdit} className="h-12 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95">
                  Habilitar Edição
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAmber, isImei }: any) {
  return (
    <div className={cn(
      "border rounded-[1rem] p-3 flex flex-col justify-between h-[80px] transition-all bg-[#161B2E]",
      isAmber ? "border-amber-500/30" : isImei ? "border-indigo-500/30" : "border-white/5"
    )}>
      <p className={cn(
        "text-[8px] font-black uppercase tracking-[0.12em] leading-none",
        isAmber ? "text-amber-500" : isImei ? "text-indigo-400" : isHighlight ? "text-teal-400" : "text-slate-500"
      )}>
        {label}
      </p>
      <p className={cn(
        "text-[16px] font-black font-mono leading-none tracking-tighter",
        isNegative && value !== 0 ? "text-rose-500" :
          isHighlight ? "text-teal-400" :
            isAmber ? "text-amber-500" :
              isImei ? "text-indigo-400" : "text-white"
      )}>
        {(isNegative && value > 0) ? `-${(value || 0).toLocaleString('pt-BR')}` : (value || 0).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function DetailItem({ label, value, isMono, className }: { label: string, value: any, isMono?: boolean, className?: string }) {
  if (value === undefined || value === null || value === "") value = "-";
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-[11px] font-bold text-slate-900", isMono ? "font-mono tracking-tight text-[10px] break-all" : "")}>{value}</p>
    </div>
  );
}
