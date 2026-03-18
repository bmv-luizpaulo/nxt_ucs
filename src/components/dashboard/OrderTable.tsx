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
  Printer,
  QrCode as QrCodeIcon
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
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-14">UF</TableHead>
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

  const qrCodeUrl = link 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`
    : "";

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

        {/* CERTIFICADO DE RASTREABILIDADE A4 */}
        <div className="printable-certificate hidden print:block bg-white text-slate-900 p-0 font-body">
          {/* LOGO E HEADER */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-10">
            <div className="flex items-center gap-0">
               <div className="relative w-20 h-20">
                 <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
               </div>
               <span className="text-[40px] font-black text-amber-500 leading-none -ml-2">bmv</span>
            </div>
            <div className="text-right">
              <h2 className="text-[18px] font-black uppercase tracking-tight leading-tight">CERTIFICADO DE RASTREABILIDADE</h2>
              <p className="text-[11px] font-black uppercase text-slate-900 tracking-widest mt-1.5">PROTOCOLO DE AUDITORIA: ##{order.id}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-16 mb-12">
            {/* IDENTIFICAÇÃO DO ATIVO */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase border-b border-slate-100 pb-2 tracking-[0.2em]">IDENTIFICAÇÃO DO ATIVO</h3>
              <div className="space-y-5">
                <p className="text-[32px] font-black text-[#10B981] leading-none tracking-tighter">##{order.id}</p>
                <div className="text-[11px] space-y-2.5 font-bold uppercase tracking-tight">
                  <p><strong className="text-slate-400 font-black mr-2">DATA DO PROTOCOLO:</strong> {new Date(order.data).toLocaleDateString()}</p>
                  <p className="leading-tight"><strong className="text-slate-400 font-black mr-2">ENTIDADE ADQUIRENTE:</strong> {order.empresa}</p>
                  <p><strong className="text-slate-400 font-black mr-2">REGISTRO CNPJ:</strong> {order.cnpj}</p>
                  <p><strong className="text-slate-400 font-black mr-2">PROJETO DE ORIGEM:</strong> {order.programa} ({order.uf})</p>
                </div>
              </div>
            </div>

            {/* AUDITORIA DIGITAL */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase border-b border-slate-100 pb-2 tracking-[0.2em]">AUDITORIA DIGITAL</h3>
              <div className="flex justify-between items-start gap-6">
                <div className="text-[11px] space-y-4 font-bold uppercase flex-1">
                  <div>
                    <p className="text-slate-400 font-black text-[9px] mb-1">VOLUME DE UCS APOSENTADAS</p>
                    <p className="text-2xl font-black text-slate-900">{order.quantidade.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-black text-[9px] mb-1">VALOR TOTAL DO PEDIDO</p>
                    <p className="text-2xl font-black text-slate-900">{order.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                </div>

                {/* QR CODE BOX */}
                <div className="flex flex-col items-center gap-2 bg-slate-50 p-4 rounded-3xl border border-slate-100 shrink-0 shadow-sm">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-28 h-28 bg-white p-1 rounded-lg" />
                  ) : (
                    <div className="w-28 h-28 bg-white flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                      <QrCodeIcon className="w-8 h-8 text-slate-200" />
                    </div>
                  )}
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CERTIFICADO</p>
                </div>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE RASTREABILIDADE */}
          <div className="mt-12 space-y-5">
            <h3 className="text-[11px] font-black text-slate-400 uppercase border-b border-slate-100 pb-2 tracking-[0.2em]">HISTÓRICO DE RASTREABILIDADE (LEDGER RECORDS)</h3>
            <div className="border-2 border-slate-100 rounded-[2rem] overflow-hidden">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase text-slate-400 tracking-widest">CATEGORIA</th>
                    <th className="px-6 py-4 font-black uppercase text-slate-400 tracking-widest">ORIGEM DO ATIVO</th>
                    <th className="px-6 py-4 font-black uppercase text-slate-400 tracking-widest">DESTINO FINAL</th>
                    <th className="px-6 py-4 font-black uppercase text-slate-400 tracking-widest text-right">VOLUME</th>
                  </tr>
                </thead>
                <tbody className="font-bold uppercase">
                  {movimentos && movimentos.length > 0 ? (
                    movimentos.map((mov, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-6 py-4 text-slate-600 font-black">{mov.tipo || "CLIENTE"}</td>
                        <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">{mov.origem}</td>
                        <td className="px-6 py-4 text-slate-900 font-black">{mov.destino}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">{mov.quantidade} UCS</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-300 italic lowercase">Nenhum registro de rastreabilidade vinculado a este protocolo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER DO CERTIFICADO */}
          <div className="mt-24 flex justify-between items-end">
            <div className="text-[12px] text-[#10B981] font-black flex items-center gap-3 uppercase tracking-tight">
              <Check className="w-5 h-5 stroke-[4px]" /> INTEGRIDADE VERIFICADA PELO LEDGER
            </div>
            <div className="text-right">
              <div className="border-t-2 border-slate-900 w-80 pt-4">
                <p className="text-[12px] font-black uppercase text-slate-900 tracking-tight">AUDITOR DE CONFORMIDADE BMV</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONSOLE UI - INTERFACE DE AUDITORIA (HIDDEN EM PRINT) */}
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
            <StatBox label="MOVIMENTAÇÃO" value={stats.totalMov} percentage={stats.percentage} />
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
                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] space-y-8 border border-slate-100">
                    <h4 className="text-[11px] font-black uppercase text-primary flex items-center gap-2 tracking-[0.2em]">
                      <LinkIcon className="w-4 h-4" /> VÍNCULO BLOCKCHAIN NXT
                    </h4>
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Hash do Pedido</label>
                        <Input 
                          value={hash} 
                          onChange={(e) => setHash(e.target.value)}
                          placeholder="0x885...NXT"
                          className="font-mono text-[13px] bg-white border-slate-200 rounded-[1.25rem] h-14 px-8 focus:ring-primary shadow-sm"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Explorer</label>
                        <Input 
                          value={link} 
                          onChange={(e) => setLink(e.target.value)}
                          placeholder="https://app.tesouroverde.global/#/certificate/..."
                          className="font-mono text-[13px] bg-white border-slate-200 rounded-[1.25rem] h-14 px-8 focus:ring-primary shadow-sm"
                        />
                      </div>
                      <Button onClick={handleSaveAudit} className="w-full h-16 rounded-[1.25rem] bg-[#10B981] hover:bg-[#0D9488] text-white font-black uppercase text-[12px] tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-[0.98]">
                        Sincronizar Hash de Auditoria
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2 tracking-widest">
                      <Database className="w-4 h-4" /> Importar Novos Rastreios
                    </h4>
                    <OrderAuditForm onAdd={(movements) => onAddMovement(order.id, movements)} />
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2 tracking-widest">
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
            <Button onClick={handleSaveAudit} className="h-14 px-12 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
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
