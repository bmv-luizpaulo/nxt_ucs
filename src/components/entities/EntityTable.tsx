"use client"

import React, { useState, useMemo, useEffect } from "react";
import { EntidadeSaldo, EntidadeSaldoGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
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
  groupByPropriedade?: boolean;
  viewMode?: 'fazenda' | 'produtor' | 'associacao' | 'imei' | 'nucleo';
  allData?: EntidadeSaldo[];
}

export function EntityTable({ data, selectedIds, onSelectionChange, onUpdate, groupByPropriedade, viewMode, allData }: EntityTableProps) {
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
  }, [sourceData]);

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

    return data.reduce((acc, item: any) => {
      let key = "Sem Nome";
      if (item.isGroup) {
        key = item.nome;
      } else {
        if (viewMode === 'produtor') key = item.nome || "Sem Nome";
        else if (viewMode === 'associacao') key = item.associacaoNome || "Sem Associação";
        else if (viewMode === 'imei') key = item.imeiNome || "Sem IMEI";
        else if (viewMode === 'nucleo') key = item.nucleo || item.associacaoNome || "Sem Núcleo";
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [data, viewMode]);

  const viewLabels: Record<string, string> = {
    fazenda: "REGISTRO DE FAZENDA",
    produtor: "PRODUTOR / AUDITADO",
    associacao: "ASSOCIAÇÃO / ENTIDADE",
    imei: "IMEI / ADMINISTRADORA",
    nucleo: "NÚCLEO / REGIÃO"
  };

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
    const status = item.statusAuditoriaSaldo;
    
    if (status === 'valido') {
      return (
        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5 w-fit mx-auto">
          <CheckCircle2 className="w-3 h-3" /> Válido
        </Badge>
      );
    }
    
    if (status === 'inconsistente') {
      return (
        <Badge className="bg-rose-50 text-rose-500 border-rose-100 text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5 w-fit mx-auto">
          <AlertTriangle className="w-3 h-3" /> Divergente
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-slate-400 border-slate-200 text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5 w-fit mx-auto">
        <Clock className="w-3 h-3" /> Pendente
      </Badge>
    );
  };

  // Helper: resolve o nome principal baseado no viewMode
  const getEntityName = (item: any) => {
    if (viewMode === 'fazenda') return item.nome || item.propriedade || "Sem Identificação";
    if (viewMode === 'imei') return item.imeiNome || item.nome || "Sem IMEI";
    if (viewMode === 'produtor') return item.nome || item.propriedade || "Sem Nome";
    if (viewMode === 'nucleo') return item.nucleo || item.associacaoNome || "Sem Núcleo";
    if (viewMode === 'associacao') return item.associacaoNome || item.nucleo || "Sem Associação";
    return item.nome || "—";
  };

  // Helper: resolve o sub-texto
  const getEntitySub = (item: any) => {
    if (viewMode === 'fazenda' && item.propriedade) return item.propriedade;
    if (viewMode === 'imei') return item.nome;
    if (viewMode === 'nucleo' && item.associacaoNome && item.nucleo) return `Assoc: ${item.associacaoNome}`;
    return null;
  };

  return (
    <>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <ScrollArea className="w-full">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-slate-50/50 h-14 border-b border-slate-100">
                <TableHead className="w-[50px] pl-10">
                  <Checkbox 
                    checked={data.length > 0 && selectedIds.length === data.length} 
                    onCheckedChange={toggleAll}
                    className="rounded-md border-slate-300"
                  />
                </TableHead>
                {isDetailMode ? (
                  <>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Safra</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {viewMode === 'fazenda' ? 'Detentor / Produtor' : viewMode === 'imei' ? 'IMEI / Registro' : 'Produtor / Registro'}
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Originação</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Movimentação</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aposentado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Bloqueado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aquisição</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#734DCC] text-right">Ajuste IMEI</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary text-right">Saldo Auditado</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Safra</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {viewMode === 'nucleo' ? 'Núcleo / Associação' : 'Entidade / Detentor'}
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produtor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Propriedade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Originação</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary text-right pr-8">
                      {viewMode === 'nucleo' ? 'Saldo Associação' : 'Volume Total (UCS)'}
                    </TableHead>
                  </>
                )}
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status Auditoria</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pr-8">Ações</TableHead>
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
                Object.entries(groupedData).map(([groupKey, items]: [string, any[]]) => {
                  // Calcula o saldo total da fazenda (wallet da fazenda)
                  // Normalmente o originacaoFazendaTotal estará preenchido no primeiro registro do grupo
                  const totalFazenda = viewMode === 'fazenda' 
                    ? (items[0].originacaoFazendaTotal || items.reduce((sum, i) => sum + (i.originacao || 0), 0))
                    : items.reduce((sum, i) => sum + (i.saldoFinalAtual || 0), 0);

                  return (
                    <React.Fragment key={groupKey}>
                      <TableRow className="bg-slate-50/30 border-y border-slate-100/50 hover:bg-slate-50/30">
                        <TableCell colSpan={14} className="py-3 px-8">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full animate-pulse",
                                viewMode === 'nucleo' ? "bg-amber-500" : viewMode === 'imei' ? "bg-violet-500" : "bg-primary"
                              )} />
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{viewLabels[viewMode || 'produtor']}:</span>
                              <span className="text-[12px] font-black uppercase text-slate-900">{groupKey}</span>
                              <Badge variant="outline" className="ml-2 text-[8px] font-bold border-slate-200 text-slate-400 rounded-full px-2 py-0">
                                {items.length} {items.length === 1 ? 'PRODUTOR' : 'PRODUTORES'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {viewMode === 'fazenda' ? 'FARM WALLET (TOTAL)' : 'SALDO CONSOLIDADO'}
                                </span>
                                <span className={cn(
                                  "text-[13px] font-black tracking-tighter",
                                  viewMode === 'fazenda' ? "text-primary" : "text-slate-900"
                                )}>
                                  {totalFazenda.toLocaleString('pt-BR')} <span className="text-[9px] font-bold">UCS</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      {items.map((item: any) => (
                      <TableRow key={item.id} className={`group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-50/20' : ''}`}>
                        <TableCell className="pl-8">
                          <Checkbox 
                            checked={selectedIds.includes(item.id)} 
                            onCheckedChange={() => toggleOne(item.id)}
                            className="rounded-md border-slate-300"
                          />
                        </TableCell>
                        
                        {isDetailMode ? (
                          <>
                            <TableCell className="font-bold text-[10px] text-primary uppercase whitespace-nowrap">{item.safra}</TableCell>
                            <TableCell 
                              className="font-black text-[10px] uppercase text-slate-900 max-w-[250px] truncate cursor-pointer hover:text-primary transition-colors py-5"
                              onClick={() => setViewingEntity(item)}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{getEntityName(item)}</span>
                                  {getEntitySub(item) && (
                                    <span className="text-[9px] text-slate-400 font-normal ml-auto">({getEntitySub(item)})</span>
                                  )}
                                  {(item.statusAuditoriaSaldo === 'inconsistente' || item.saldoFinalAtual < 1000) && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                  )}
                                  {item.observacao && (
                                    <MessageSquare className="w-3 h-3 text-slate-300" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[8px] text-slate-400 font-mono tracking-tighter">
                                  {item.idf && <span>ID: {item.idf}</span>}
                                  {item.dataRegistro && <span>• REG: {item.dataRegistro}</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-[10px] text-slate-400">{item.documento}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatUCS(item.originacao)}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] text-rose-500 font-bold">{item.movimentacao > 0 ? `-${formatUCS(item.movimentacao)}` : formatUCS(item.movimentacao)}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] text-slate-400">{formatUCS(item.aposentado)}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] text-rose-500">{formatUCS(item.bloqueado)}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] text-rose-500">{formatUCS(item.aquisicao)}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] text-[#734DCC] font-black">{formatUCS(item.saldoAjustarImei)}</TableCell>
                            <TableCell className="text-right font-mono font-black text-[12px] text-primary">
                              <div className="flex items-center justify-end gap-2">
                                {formatUCS(viewMode === 'produtor' || viewMode === 'fazenda' ? item.saldoFinalAtual : item.volumeContextual)} UCS
                                {item.statusAuditoriaSaldo === 'inconsistente' && (
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                )}
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-bold text-[10px] text-primary uppercase whitespace-nowrap">{item.safra || '-'}</TableCell>
                            <TableCell 
                              className="font-black text-[10px] uppercase max-w-[200px] cursor-pointer hover:text-primary transition-colors py-5"
                              onClick={() => !item.isGroup && setViewingEntity(item)}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className={cn("truncate font-black",
                                  viewMode === 'nucleo' ? "text-amber-700" : "text-slate-900"
                                )}>
                                  {getEntityName(item)}
                                </span>
                                {getEntitySub(item) && (
                                  <span className="text-[8px] text-slate-400 font-mono">{getEntitySub(item)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-slate-700 uppercase truncate max-w-[150px]">{item.nome}</TableCell>
                            <TableCell className="font-mono text-[9px] text-slate-400">{item.documento || '—'}</TableCell>
                            <TableCell className="text-[9px] text-slate-500 truncate max-w-[120px]">{item.propriedade || '—'}</TableCell>
                            <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatUCS(item.originacao)}</TableCell>
                            <TableCell className="text-right font-mono font-black text-[12px] text-primary pr-8">
                              {formatUCS(item.isGroup ? item.volumeTotal : item.volumeContextual)} UCS
                            </TableCell>
                          </>
                        )}

                        <TableCell className="text-center py-4">
                          {item.isGroup ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase px-3 py-1.5 rounded-full">CONSOLIDADO</Badge>
                          ) : renderStatus(item)}
                        </TableCell>
                        <TableCell className="text-center pr-8">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => !item.isGroup && setViewingEntity(item)}
                            className={cn(
                              "h-10 w-10 text-slate-200 transition-all",
                              item.isGroup ? "opacity-0 cursor-default" : "hover:text-primary cursor-pointer"
                            )}
                          >
                            <Search className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })
            )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* DIALOG DE VISUALIZAÇÃO — Contextual por viewMode */}
      {viewMode === 'produtor' && (
        <ProducerViewDialog 
          entity={viewingEntity}
          open={!!viewingEntity}
          onOpenChange={(open) => !open && setViewingEntity(null)}
          onEdit={() => {
            setEditingEntity(viewingEntity);
            setViewingEntity(null);
          }}
          allData={allData || (data as EntidadeSaldo[])}
        />
      )}

      {viewMode === 'fazenda' && (
        <FarmViewDialog 
          entity={viewingEntity}
          open={!!viewingEntity}
          onOpenChange={(open) => !open && setViewingEntity(null)}
          allData={allData || (data as EntidadeSaldo[])}
        />
      )}
      {viewMode === 'nucleo' && (
        <NucleoViewDialog 
          entity={viewingEntity}
          open={!!viewingEntity}
          onOpenChange={(open) => !open && setViewingEntity(null)}
          allData={data as EntidadeSaldo[]}
        />
      )}
      {viewMode === 'imei' && (
        <ImeiViewDialog 
          entity={viewingEntity}
          open={!!viewingEntity}
          onOpenChange={(open) => !open && setViewingEntity(null)}
          allData={data as EntidadeSaldo[]}
        />
      )}
      {!viewMode && (
        <EntityViewDialog 
          entity={viewingEntity}
          open={!!viewingEntity}
          onOpenChange={(open) => !open && setViewingEntity(null)}
          onEdit={() => {
            setEditingEntity(viewingEntity);
            setViewingEntity(null);
          }}
        />
      )}

      {/* DIALOG DE EDIÇÃO */}
      <EntityEditDialog 
        entity={editingEntity}
        open={!!editingEntity}
        onOpenChange={(open) => !open && setEditingEntity(null)}
        onUpdate={onUpdate || (() => {})}
      />
    </>
  );
}
