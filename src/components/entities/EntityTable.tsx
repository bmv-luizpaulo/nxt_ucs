import React, { useState, useMemo, useEffect } from "react";
import { EntidadeSaldo, EntidadeSaldoGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  User, 
  Shield, 
  Cpu, 
  Sprout, 
  Building,
  Users,
  Eye,
  CreditCard,
  Wallet
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EntityEditDialog } from "./EntityEditDialog";
import { EntityViewDialog } from "./EntityViewDialog";
import { ProducerViewDialog } from "./ProducerViewDialog";
import { FarmViewDialog } from "./FarmViewDialog";
import { NucleoViewDialog } from "./NucleoViewDialog";
import { ImeiViewDialog } from "./ImeiViewDialog";
import { Button } from "@/components/ui/button";

interface EntityTableProps {
  data: (EntidadeSaldo | EntidadeSaldoGroup)[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onUpdate?: (id: string, updates: Partial<EntidadeSaldo>) => void;
  isCreateOpen?: boolean;
  onOpenChangeCreate?: (open: boolean) => void;
  groupByPropriedade?: boolean;
  viewMode?: 'fazenda' | 'produtor' | 'associacao' | 'imei' | 'nucleo';
  allData?: EntidadeSaldo[];
}

export function EntityTable({ data, selectedIds, onSelectionChange, onUpdate, isCreateOpen, onOpenChangeCreate, groupByPropriedade, viewMode, allData }: EntityTableProps) {
  const [editingEntity, setEditingEntity] = useState<EntidadeSaldo | null>(null);
  const [viewingEntity, setViewingEntity] = useState<EntidadeSaldo | null>(null);

  // Keep viewing/editing entity in sync with latest data from Firestore
  const sourceData = allData || (data as EntidadeSaldo[]);
  useEffect(() => {
    if (viewingEntity) {
      const fresh = sourceData.find(e => e.id === viewingEntity.id);
      if (fresh && fresh !== viewingEntity) {
        setViewingEntity(fresh);
      }
    }
    if (editingEntity) {
      const fresh = sourceData.find(e => e.id === editingEntity.id);
      if (fresh && fresh !== editingEntity) {
        setEditingEntity(fresh);
      }
    }
  }, [sourceData, viewingEntity, editingEntity]);

  const isDetailMode = viewMode === 'produtor' || viewMode === 'fazenda' || viewMode === 'imei';

  const groupedData = useMemo(() => {
    if (viewMode === 'fazenda') {
      return data.reduce((acc, item: any) => {
        const key = item.propriedade || "Sem Propriedade";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, any[]>);
    }

    // Para o modo produtor detalhado, não agrupamos
    if (viewMode === 'produtor') {
      return { "GERAL": data };
    }

    return data.reduce((acc, item: any) => {
      let key = "Sem Nome";
      if (item.isGroup) {
        key = item.nome;
      } else {
        if (viewMode === 'associacao') key = item.associacaoNome || "Sem Associação";
        else if (viewMode === 'imei') key = item.imeiNome || "Sem IMEI";
        else if (viewMode === 'nucleo') key = item.nucleo || item.associacaoNome || "Sem Núcleo";
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [data, viewMode]);

  const toggleAll = () => {
    if (selectedIds.length === data.length) onSelectionChange([]);
    else onSelectionChange(data.map(i => i.id));
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter(i => i !== id));
    else onSelectionChange([...selectedIds, id]);
  };

  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  const renderStatus = (item: EntidadeSaldo) => {
    const cadastralStatus = item.status;
    
    if (cadastralStatus === 'bloqueado') {
      return (
        <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-bold uppercase px-3 py-1 rounded-full flex items-center justify-center gap-1.5 w-fit mx-auto shadow-sm">
          BLOQUEADO
        </Badge>
      );
    }

    if (cadastralStatus === 'inapto') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold uppercase px-3 py-1 rounded-full flex items-center justify-center gap-1.5 w-fit mx-auto">
          INAPTO
        </Badge>
      );
    }

    if (cadastralStatus === 'disponivel') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase px-3 py-1 rounded-full flex items-center justify-center gap-1.5 w-fit mx-auto">
          Ativa
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold uppercase px-3 py-1 rounded-full flex items-center justify-center gap-1.5 w-fit mx-auto">
        Pendente
      </Badge>
    );
  };

  const renderTypeIcon = (item: EntidadeSaldo) => {
    if (item.imeiNome) return <Badge variant="outline" className="text-rose-500 border-rose-100 text-[10px] uppercase font-bold gap-1.5"><Cpu className="w-3 h-3" /> IMEI</Badge>;
    if (item.associacaoNome) return <Badge variant="outline" className="text-sky-500 border-sky-100 text-[10px] uppercase font-bold gap-1.5"><Building className="w-3 h-3" /> Parceiro</Badge>;
    if (item.nucleo) return <Badge variant="outline" className="text-amber-500 border-amber-100 text-[10px] uppercase font-bold gap-1.5"><Users className="w-3 h-3" /> Nucleo</Badge>;
    return <Badge variant="outline" className="text-emerald-600 border-emerald-100 text-[10px] uppercase font-bold gap-1.5"><Sprout className="w-3 h-3" /> Produtor</Badge>;
  };

  return (
    <>
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 h-14 border-b border-slate-100">
                <TableHead className="w-[50px] pl-10">
                  <Checkbox 
                    checked={data.length > 0 && selectedIds.length === data.length} 
                    onCheckedChange={toggleAll}
                    className="rounded-md border-slate-300"
                  />
                </TableHead>
                {viewMode === 'produtor' ? (
                  <>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário Titular</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Fazendas</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Núcleos</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Safra</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidade / Registro</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo Auditado</TableHead>
                  </>
                )}
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pr-10">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-48 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedData).map(([groupKey, items]: [string, any[]]) => (
                  <React.Fragment key={groupKey}>
                    {viewMode !== 'produtor' && (
                       <TableRow className="bg-slate-50/30 border-y border-slate-100/50">
                         <TableCell colSpan={14} className="py-2 px-10">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{groupKey}</span>
                         </TableCell>
                       </TableRow>
                    )}
                    {items.map((item: any) => (
                      <TableRow key={item.id} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-10">
                          <Checkbox 
                            checked={selectedIds.includes(item.id)} 
                            onCheckedChange={() => toggleOne(item.id)}
                            className="rounded-md border-slate-300"
                          />
                        </TableCell>
                        
                        {viewMode === 'produtor' ? (
                          <>
                            <TableCell className="py-4">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                     {item.nome?.substring(0,2)}
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[13px] font-bold text-slate-900">{item.nome}</span>
                                     <span className="text-[10px] text-slate-400 font-medium">Pessoa Jurídica</span>
                                  </div>
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CNPJ</span>
                                  <span className="text-[12px] font-medium text-slate-600">{item.documento}</span>
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-slate-800 uppercase">{item.nome?.split('-')[0]}</span>
                                  <span className="text-[11px] text-slate-400">{item.nome?.toLowerCase().replace(/ /g, '.') + "@gmail.com"}</span>
                               </div>
                            </TableCell>
                            <TableCell>
                               {renderTypeIcon(item)}
                            </TableCell>
                            <TableCell className="text-center font-medium text-slate-400">-</TableCell>
                            <TableCell className="text-center font-medium text-slate-400">-</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-bold text-[11px] text-primary uppercase">{item.safra}</TableCell>
                            <TableCell className="font-bold text-[12px] uppercase text-slate-700">{item.nome}</TableCell>
                            <TableCell className="text-right font-black text-[13px] text-primary">{formatUCS(item.saldoFinalAtual)} UCS</TableCell>
                          </>
                        )}

                        <TableCell className="text-center py-4">
                          {renderStatus(item)}
                        </TableCell>
                        <TableCell className="text-center pr-10">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingEntity(item)}
                            className="h-9 px-4 rounded-lg text-[10px] font-black tracking-widest border-slate-200 text-slate-600 gap-2 hover:bg-slate-50 transition-all active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" /> VER
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* DIALOGS */}
      {viewMode === 'produtor' ? (
        <ProducerViewDialog 
          entity={viewingEntity}
          open={!!viewingEntity && viewMode === 'produtor'}
          onOpenChange={(open) => !open && setViewingEntity(null)}
          onEdit={() => {
            setEditingEntity(viewingEntity);
            setViewingEntity(null);
          }}
          allData={allData || (data as EntidadeSaldo[])}
        />
      ) : (
        viewingEntity && (
          <EntityViewDialog 
            entity={viewingEntity}
            open={!!viewingEntity}
            onOpenChange={(open) => !open && setViewingEntity(null)}
            onEdit={() => {
              setEditingEntity(viewingEntity);
              setViewingEntity(null);
            }}
          />
        )
      )}

      <EntityEditDialog 
        entity={editingEntity}
        open={!!editingEntity || !!isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEntity(null);
            onOpenChangeCreate?.(false);
          }
        }}
        onUpdate={(id, updates) => {
          if (onUpdate) {
            const finalId = id.startsWith("NEW_") ? id.replace("NEW_", "") : id;
            onUpdate(finalId, updates);
          }
          setEditingEntity(null);
          onOpenChangeCreate?.(false);
        }}
      />
    </>
  );
}
