import { Pedido, OrderStatus, Movimento } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, MoreHorizontal, Link as LinkIcon, Save, Database } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MovementList } from "./MovementList";
import { OrderAuditForm } from "./OrderAuditForm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

interface OrderTableProps {
  orders: Pedido[];
  onUpdateOrder: (id: string, updates: Partial<Pedido>) => void;
  onDeleteOrder: (id: string) => void;
  onAddMovement: (orderId: string, raw: string) => void;
  onDeleteMovement: (orderId: string, moveId: string) => void;
}

export function OrderTable({ orders, onUpdateOrder, onDeleteOrder, onAddMovement, onDeleteMovement }: OrderTableProps) {
  return (
    <div className="rounded-xl border bg-card/50 overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
            <TableHead className="w-[100px] text-[10px] font-bold uppercase tracking-wider">ID Pedido</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data / Hora</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider">Empresa / CNPJ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Quantidade</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total (R$)</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">NXT Link</TableHead>
            <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-wider text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="group hover:bg-muted/20">
              <TableCell className="font-mono font-bold text-sm text-primary">{order.id}</TableCell>
              <TableCell className="text-[11px] text-muted-foreground">
                <div className="font-medium text-foreground">{new Date(order.data).toLocaleDateString('pt-BR')}</div>
                <div>{new Date(order.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-[11px] uppercase truncate max-w-[200px]">{order.empresa}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{order.cnpj}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-semibold">{order.quantidade} UCS</TableCell>
              <TableCell className="text-right font-mono font-black text-sm text-accent">
                {order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="text-center">
                {order.linkNxt ? (
                  <a href={order.linkNxt} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <LinkIcon className="w-4 h-4 mx-auto" />
                  </a>
                ) : (
                  <Badge variant="outline" className="text-[8px] border-rose-200 text-rose-500 uppercase px-1">Ausente</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <StatusBadge status={order.status} />
                  <OrderDetailsDialog 
                    order={order} 
                    onUpdateOrder={onUpdateOrder}
                    onDeleteOrder={onDeleteOrder}
                    onAddMovement={onAddMovement}
                    onDeleteMovement={onDeleteMovement}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderDetailsDialog({ order, onUpdateOrder, onDeleteOrder, onAddMovement, onDeleteMovement }: any) {
  const [hash, setHash] = useState(order.hashPedido || "");
  const [link, setLink] = useState(order.linkNxt || "");
  const firestore = useFirestore();
  
  const movimentosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "pedidos", order.id, "movimentos");
  }, [firestore, order.id]);

  const { data: movimentos } = useCollection<Movimento>(movimentosQuery);

  const handleSaveAudit = () => {
    onUpdateOrder(order.id, { 
      hashPedido: hash, 
      linkNxt: link, 
      auditado: !!(hash && link),
      status: (hash && link) ? 'ok' : 'pendente'
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-primary font-black uppercase tracking-tighter">AUDITORIA DE PEDIDO {order.id}</span>
              <StatusBadge status={order.status} />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-xl space-y-4 border border-dashed border-primary/20">
              <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Vincular Blockchain NXT
              </h4>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Hash do Pedido</label>
                <Input 
                  value={hash} 
                  onChange={(e) => setHash(e.target.value)}
                  placeholder="Ex: 0x885...NXT"
                  className="font-mono text-xs bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">URL de Auditoria (Link Nxt)</label>
                <Input 
                  value={link} 
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://nxt.explorer/tx/..."
                  className="font-mono text-xs bg-white"
                />
              </div>
              <Button onClick={handleSaveAudit} size="sm" className="w-full gap-2 font-black uppercase text-[10px]">
                <Save className="w-3.5 h-3.5" /> Salvar Auditoria de Hash
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase flex items-center gap-2">
                <Database className="w-3.5 h-3.5" /> Importar Novos Rastreios
              </h4>
              <OrderAuditForm onAdd={(raw) => onAddMovement(order.id, raw)} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase flex items-center gap-2">
              Movimentações Registradas <Badge variant="secondary">{movimentos?.length || 0}</Badge>
            </h4>
            <MovementList 
              movements={movimentos || []} 
              onDelete={(mid) => onDeleteMovement(order.id, mid)}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t mt-8">
          <Button variant="destructive" size="sm" onClick={() => onDeleteOrder(order.id)} className="text-[10px] font-bold uppercase">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Remover Permanente
          </Button>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase">Exportar XML</Button>
             <Button size="sm" className="text-[10px] font-bold uppercase" disabled={!order.linkNxt}>Gerar Relatório Final</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
