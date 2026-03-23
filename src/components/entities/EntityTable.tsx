"use client"

import { useState } from "react";
import { EntidadeSaldo } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EntityEditDialog } from "./EntityEditDialog";
import { EntityViewDialog } from "./EntityViewDialog";
import { Button } from "@/components/ui/button";

interface EntityTableProps {
  data: EntidadeSaldo[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onUpdate?: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityTable({ data, selectedIds, onSelectionChange, onUpdate }: EntityTableProps) {
  const [editingEntity, setEditingEntity] = useState<EntidadeSaldo | null>(null);
  const [viewingEntity, setViewingEntity] = useState<EntidadeSaldo | null>(null);

  const toggleAll = () => {
    if (selectedIds.length === data.length) onSelectionChange([]);
    else onSelectionChange(data.map(i => i.id));
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter(i => i !== id));
    else onSelectionChange([...selectedIds, id]);
  };

  const formatUCS = (val: number) => (val || 0).toLocaleString('pt-BR');

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
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Originação</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Movimentação</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aposentado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Bloqueado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aquisição</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#734DCC] text-right">Ajuste IMEI</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary text-right">Saldo Auditado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status Auditoria</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pr-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-48 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className={`group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-50/20' : ''}`}>
                    <TableCell className="pl-8">
                      <Checkbox 
                        checked={selectedIds.includes(item.id)} 
                        onCheckedChange={() => toggleOne(item.id)}
                        className="rounded-md border-slate-300"
                      />
                    </TableCell>
                    <TableCell 
                      className="font-black text-[10px] uppercase text-slate-900 max-w-[200px] truncate cursor-pointer hover:text-primary transition-colors py-5"
                      onClick={() => setViewingEntity(item)}
                    >
                      <div className="flex items-center gap-2">
                        {item.nome}
                        {(item.statusAuditoriaSaldo === 'inconsistente' || item.saldoFinalAtual < 1000) && (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        {item.observacao && (
                          <MessageSquare className="w-3 h-3 text-slate-300" />
                        )}
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
                        {formatUCS(item.saldoFinalAtual)} UCS
                        {item.statusAuditoriaSaldo === 'inconsistente' && (
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      {renderStatus(item)}
                    </TableCell>
                    <TableCell className="text-center pr-8">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setViewingEntity(item)}
                        className="h-10 w-10 text-slate-200 hover:text-primary transition-all"
                      >
                        <Search className="w-5 h-5" />
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

      {/* DIALOG DE VISUALIZAÇÃO (MODO LEITURA) */}
      <EntityViewDialog 
        entity={viewingEntity}
        open={!!viewingEntity}
        onOpenChange={(open) => !open && setViewingEntity(null)}
        onEdit={() => {
          setEditingEntity(viewingEntity);
          setViewingEntity(null);
        }}
      />

      {/* DIALOG DE EDIÇÃO (CONTRÔLE TOTAL) */}
      <EntityEditDialog 
        entity={editingEntity}
        open={!!editingEntity}
        onOpenChange={(open) => !open && setEditingEntity(null)}
        onUpdate={onUpdate || (() => {})}
      />
    </>
  );
}
