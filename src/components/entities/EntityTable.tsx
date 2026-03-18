"use client"

import { useState } from "react";
import { EntidadeSaldo } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EntityEditDialog } from "./EntityEditDialog";
import { Button } from "@/components/ui/button";

interface EntityTableProps {
  data: EntidadeSaldo[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onUpdate?: (id: string, updates: Partial<EntidadeSaldo>) => void;
}

export function EntityTable({ data, selectedIds, onSelectionChange, onUpdate }: EntityTableProps) {
  const [editingEntity, setEditingEntity] = useState<EntidadeSaldo | null>(null);

  const toggleAll = () => {
    if (selectedIds.length === data.length) onSelectionChange([]);
    else onSelectionChange(data.map(i => i.id));
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter(i => i !== id));
    else onSelectionChange([...selectedIds, id]);
  };

  const formatUCS = (val: number) => (val || 0).toLocaleString('pt-BR');

  return (
    <>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <ScrollArea className="w-full">
          <Table className="min-w-[1400px]">
            <TableHeader>
              <TableRow className="bg-slate-50/50 h-14 border-b border-slate-100">
                <TableHead className="w-[60px] pl-8">
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
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-indigo-500 text-right">Ajuste IMEI</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-primary text-right bg-emerald-50/30">Saldo Auditado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pr-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-48 text-center text-slate-400 font-bold uppercase text-[11px] tracking-widest">
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
                        className="rounded-md border-slate-200"
                      />
                    </TableCell>
                    <TableCell 
                      className="font-black text-[11px] uppercase text-slate-900 max-w-[200px] truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setEditingEntity(item)}
                    >
                      {item.nome}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-500">{item.documento}</TableCell>
                    <TableCell className="text-right font-mono text-[11px] font-bold text-slate-600">{formatUCS(item.originacao)}</TableCell>
                    <TableCell className="text-right font-mono text-[11px] text-rose-500">{formatUCS(item.movimentacao)}</TableCell>
                    <TableCell className="text-right font-mono text-[11px] text-slate-400">{formatUCS(item.aposentado)}</TableCell>
                    <TableCell className="text-right font-mono text-[11px] text-rose-400">{formatUCS(item.bloqueado)}</TableCell>
                    <TableCell className="text-right font-mono text-[11px] text-rose-500">{formatUCS(item.aquisicao)}</TableCell>
                    <TableCell className="text-right font-mono text-[11px] text-indigo-500">{formatUCS(item.saldoAjustarImei)}</TableCell>
                    <TableCell className="text-right font-mono font-black text-[14px] text-primary bg-emerald-50/30">{formatUCS(item.saldoFinalAtual)} UCS</TableCell>
                    <TableCell className="text-center py-4">
                      {item.status === 'disponivel' ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase">Válido</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase">{item.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center pr-8">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="Abrir Auditoria Técnica"
                        onClick={() => setEditingEntity(item)}
                        className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-emerald-50 rounded-lg transition-all"
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

      <EntityEditDialog 
        entity={editingEntity}
        open={!!editingEntity}
        onOpenChange={(open) => !open && setEditingEntity(null)}
        onUpdate={onUpdate || (() => {})}
      />
    </>
  );
}
