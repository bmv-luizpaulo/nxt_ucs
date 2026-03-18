"use client"

import { Pedido, Movimento } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  MoreHorizontal, 
  Link as LinkIcon, 
  Save, 
  Database, 
  ShieldCheck, 
  Check, 
  X, 
  Download,
  Printer,
  ArrowRightLeft,
  Calculator,
  FileText,
  QrCode
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { MovementList } from "./MovementList";
import { OrderAuditForm } from "./OrderAuditForm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderTableProps {
  orders: Pedido[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onUpdateOrder: (id: string, updates: Partial<Pedido>) => void;
  onDeleteOrder: (id: string) => void;
  onAddMovement: (orderId: string, movements: any[]) => void;
  onDeleteMovement: (orderId: string, moveId: string) => void;
}

export function OrderTable({ 
  orders, 
  selectedIds, 
  onSelectionChange, 
  onUpdateOrder, 
  onDeleteOrder, 
  onAddMovement, 
  onDeleteMovement 
}: OrderTableProps) {
  
  const allIds = orders.map(o => o.id);
  const isAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange(selectedIds.filter(id => !allIds.includes(id)));
    } else {
      const newSelection = Array.from(new Set([...selectedIds, ...allIds]));
      onSelectionChange(newSelection);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="rounded-[2.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
            <TableHead className="w-[40px] pl-8">
              <Checkbox 
                checked={isAllSelected} 
                onCheckedChange={toggleSelectAll} 
                className="rounded-md border-slate-300"
              />
            </TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Pedido</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Data</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Origem</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14 text-center">UF</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-14">Qtd</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-14">Total</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-14">Status</TableHead>
            <TableHead className="w-[100px] pr-8 h-14"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-48 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Nenhum pedido registrado nesta categoria
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow 
                key={order.id} 
                className={cn(
                  "group transition-colors border-b border-slate-50 last:border-0",
                  selectedIds.includes(order.id) ? 'bg-emerald-50/30' : 'hover:bg-slate-50/80'
                )}
              >
                <TableCell className="pl-8">
                  <Checkbox 
                    checked={selectedIds.includes(order.id)} 
                    onCheckedChange={() => toggleSelectOne(order.id)}
                    className="rounded-md border-slate-200"
                  />
                </TableCell>
                <TableCell className="font-mono font-bold text-xs text-primary">{order.id}</TableCell>
                <TableCell className="text-[10px] text-slate-500 whitespace-nowrap">
                  <div className="font-bold text-slate-900">{new Date(order.data).toLocaleDateString('pt-BR')}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-[10px] uppercase truncate max-w-[150px] text-slate-900">{order.empresa}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{order.cnpj}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-[10px] text-slate-500">{order.uf}</TableCell>
                <TableCell className="text-right font-mono text-[10px] font-black text-slate-900 whitespace-nowrap">{order.quantidade} UCS</TableCell>
                <TableCell className="text-right font-mono font-black text-[11px] text-primary whitespace-nowrap">
                  {order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right pr-8">
                  <OrderDetailsDialog 
                    order={order} 
                    onUpdateOrder={onUpdateOrder}
                    onDeleteOrder={onDeleteOrder}
                    onAddMovement={onAddMovement}
                    onDeleteMovement={onDeleteMovement}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderDetailsDialog({ order, onUpdateOrder, onDeleteOrder, onAddMovement, onDeleteMovement }: any) {
  const [hash, setHash] = useState(order.hashPedido || "");
  const [link, setLink] = useState(order.linkNxt || "");
  const firestore = useFirestore();
  const { user } = useUser();
  
  const movimentosQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "pedidos", order.id, "movimentos");
  }, [firestore, order.id, user]);

  const { data: movimentos } = useCollection<Movimento>(movimentosQuery);

  const stats = useMemo(() => {
    const totalMov = (movimentos || []).reduce((acc, curr) => acc + curr.quantidade, 0);
    const percentage = order.quantidade > 0 ? ((totalMov / order.quantidade) * 100).toFixed(1) : "0.0";
    return { totalMov, percentage };
  }, [movimentos, order.quantidade]);

  const handleSaveAudit = () => {
    onUpdateOrder(order.id, { 
      hashPedido: hash, 
      linkNxt: link, 
      auditado: !!(hash && link),
      status: (hash && link) ? 'ok' : 'pendente'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg transition-all">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[95vh] p-0 border-none bg-white overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Console de Auditoria de Pedido - {order.id}</DialogTitle>
          <DialogDescription>Detalhamento técnico de rastreabilidade e conferência blockchain.</DialogDescription>
        </DialogHeader>

        {/* CERTIFICADO DE RASTREABILIDADE (EVOLUÍDO E COMPACTO PARA A4) */}
        <div className="printable-certificate hidden print:block">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
               <h1 className="text-[32px] font-black text-primary leading-none tracking-tighter">bmv</h1>
               <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 text-slate-400">LedgerTrust Auditoria de Conformidade</p>
            </div>
            <div className="text-right">
              <h2 className="text-[16px] font-black uppercase tracking-tight text-slate-900">Certificado de Rastreabilidade</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Protocolo: {order.id}</p>
              <p className="text-[7px] text-slate-400 font-mono">{new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-100 pb-1">Informações do Ativo</h3>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-900 uppercase">{order.empresa}</p>
                <p className="text-[9px] font-bold text-slate-400 font-mono">{order.cnpj}</p>
                <div className="mt-2 pt-2 border-t border-slate-50">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Programa / Projeto:</p>
                  <p className="text-[9px] font-bold text-slate-900 uppercase">{order.programa} - {order.uf}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
               <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-100 pb-1">Dados Auditados (UCS)</h3>
               <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Volume</p>
                    <p className="text-[12px] font-black text-slate-900">{order.quantidade.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Valor Total</p>
                    <p className="text-[12px] font-black text-primary">{order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
               </div>
               <div className="p-3 border-2 border-primary/20 rounded-2xl bg-primary/5 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest">Hash Blockchain</p>
                    <p className="text-[7px] font-mono text-slate-600 mt-0.5 truncate max-w-[120px]">{order.hashPedido || 'Pendente de Sincronização'}</p>
                  </div>
                  <QrCode className="w-8 h-8 text-slate-200" />
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-100 pb-1">Rastreabilidade Ledger (Traceability Records)</h3>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[8px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Origem</th>
                    <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Destino</th>
                    <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500 text-right">Volume (UCS)</th>
                  </tr>
                </thead>
                <tbody>
                  {(movimentos || []).slice(0, 15).map((mov, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-slate-900 font-bold uppercase">{mov.origem}</td>
                      <td className="px-3 py-2 text-slate-600 uppercase">{mov.destino}</td>
                      <td className="px-3 py-2 text-right font-black text-slate-900">{mov.quantidade.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                  {(!movimentos || movimentos.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-300 font-bold uppercase text-[8px] tracking-widest italic">Nenhum registro de rastreabilidade encontrado</td>
                    </tr>
                  )}
                  {movimentos && movimentos.length > 15 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={3} className="px-3 py-1.5 text-center text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                        Exibindo os primeiros 15 de {movimentos.length} registros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 pt-8 flex justify-between items-end border-t border-slate-100">
            <div className="flex items-center gap-2">
               <ShieldCheck className="w-6 h-6 text-primary" />
               <p className="text-[8px] font-black uppercase tracking-widest text-primary">Autenticidade Verificada LedgerTrust</p>
            </div>
            <div className="text-right space-y-2">
               <div className="w-48 border-t border-slate-900 pt-1">
                 <p className="text-[8px] font-black uppercase text-slate-900">Auditor Responsável BMV</p>
                 <p className="text-[6px] font-bold text-slate-400 uppercase">Protocolo Gerado via Blockchain Integrity</p>
               </div>
            </div>
          </div>
        </div>

        {/* CABEÇALHO TÉCNICO - CONSOLE UI (HIDDEN EM PRINT) */}
        <div className="bg-[#0B0F1A] p-6 shrink-0 text-white relative print:hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-primary rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AUDITORIA DE CONFERÊNCIA</p>
              </div>
              <h1 className="text-[24px] font-black tracking-tight uppercase leading-none max-w-2xl">{order.empresa}</h1>
              <p className="text-[11px] font-bold text-slate-500 font-mono tracking-widest">{order.cnpj} • PEDIDO #{order.id}</p>
            </div>

            <div className="bg-[#161B2E] border border-white/5 rounded-[1.5rem] p-5 min-w-[280px] shadow-2xl flex flex-col items-end relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16"></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 relative z-10">Saldo Final Auditado</p>
               <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-3xl font-black text-white tracking-tighter">{order.quantidade.toLocaleString('pt-BR')}</span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">UCS</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatBox label="VOLUME TOTAL" value={order.quantidade} />
            <StatBox label="MOVIMENTAÇÃO" value={stats.totalMov} percentage={stats.percentage} isNegative={stats.totalMov < 0} />
            <StatBox label="TAXA APLICADA" value={order.taxa} isCurrency />
            <StatBox label="VALOR AUDITADO" value={order.valorTotal} isCurrency isHighlight />
            <StatBox label="STATUS" value={order.status.toUpperCase()} isStatus />
            <StatBox label="UF ORIGEM" value={order.uf} isStatus />
            <StatBox label="CATEGORIA" value={order.categoria.replace(/_/g, ' ')} isStatus isAccent />
            <StatBox label="D.O" value={order.do ? 'SIM' : 'NÃO'} isStatus />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-white print:hidden">
          <div className="p-10 space-y-14">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="space-y-8">
                  <div className="bg-slate-50/50 p-8 rounded-[2rem] space-y-6 border border-slate-100">
                    <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2 tracking-[0.2em]">
                      <LinkIcon className="w-4 h-4" /> VÍNCULO BLOCKCHAIN NXT
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hash do Pedido</label>
                        <Input 
                          value={hash} 
                          onChange={(e) => setHash(e.target.value)}
                          placeholder="0x885...NXT"
                          className="font-mono text-xs bg-white border-slate-200 rounded-xl h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Explorer</label>
                        <Input 
                          value={link} 
                          onChange={(e) => setLink(e.target.value)}
                          placeholder="https://nxt.explorer/..."
                          className="font-mono text-xs bg-white border-slate-200 rounded-xl h-12"
                        />
                      </div>
                      <Button onClick={handleSaveAudit} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/10">
                        Sincronizar Hash de Auditoria
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-900 flex items-center gap-2 tracking-widest">
                      <Database className="w-4 h-4" /> Importar Novos Rastreios
                    </h4>
                    <OrderAuditForm onAdd={(movements) => onAddMovement(order.id, movements)} />
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-900 flex items-center gap-2 tracking-widest">
                    Movimentações Registradas <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-full">{movimentos?.length || 0}</Badge>
                  </h4>
                  <MovementList 
                    movements={movimentos || []} 
                    onDelete={(mid) => onDeleteMovement(order.id, mid)}
                  />
               </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 print:hidden">
          <Button variant="ghost" className="text-[11px] font-black uppercase text-rose-500 hover:bg-rose-50 hover:text-rose-600 px-8 rounded-xl h-14" onClick={() => onDeleteOrder(order.id)}>
            Remover Registro Permanente
          </Button>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={handlePrint} className="h-14 px-10 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[11px] tracking-widest text-slate-700 hover:bg-white transition-all shadow-sm">
              <Printer className="w-4 h-4 mr-2" /> Gerar Certificado PDF
            </Button>
            <Button onClick={handleSaveAudit} className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
              <Save className="w-4 h-4 mr-2" /> Finalizar Auditoria
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, isNegative, isHighlight, isAccent, isCurrency, isStatus, percentage }: any) {
  return (
    <div className="bg-[#161B2E] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-[80px] hover:bg-[#1C2237] transition-all group relative">
      <div className="flex justify-between items-start w-full">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</p>
        {percentage !== undefined && (
          <span className={cn(
            "text-[7px] font-black px-1.5 py-0.5 rounded-md",
            isNegative ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {percentage}%
          </span>
        )}
      </div>
      <p className={cn(
        "text-[15px] font-black font-mono leading-none tracking-tight truncate",
        isNegative ? "text-rose-500" : isHighlight ? "text-emerald-400" : isAccent ? "text-primary" : "text-white"
      )}>
        {isCurrency ? (
          value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ) : (
          value.toLocaleString('pt-BR')
        )}
      </p>
    </div>
  );
}
