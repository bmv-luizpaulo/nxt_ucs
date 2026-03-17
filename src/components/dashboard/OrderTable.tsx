import { Pedido, OrderStatus, Movimento } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronRight, ExternalLink, Trash2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MovementList } from "./MovementList";
import { OrderAuditForm } from "./OrderAuditForm";
import { Badge } from "@/components/ui/badge";

interface OrderTableProps {
  orders: Pedido[];
  onToggleAudit: (id: string, audited: boolean) => void;
  onDeleteOrder: (id: string) => void;
  onAddMovement: (orderId: string, raw: string) => void;
  onDeleteMovement: (orderId: string, moveId: string) => void;
}

export function OrderTable({ orders, onToggleAudit, onDeleteOrder, onAddMovement, onDeleteMovement }: OrderTableProps) {
  return (
    <div className="rounded-xl border bg-card/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[80px] font-headline">Pedido</TableHead>
            <TableHead className="font-headline">Data/Hora</TableHead>
            <TableHead className="font-headline">Origem (Empresa)</TableHead>
            <TableHead className="font-headline">PARC/PROG</TableHead>
            <TableHead className="font-headline text-center">UF</TableHead>
            <TableHead className="font-headline text-center">D.O</TableHead>
            <TableHead className="font-headline text-right">Qtd (UCS)</TableHead>
            <TableHead className="font-headline text-right">Taxa</TableHead>
            <TableHead className="font-headline text-right">Total</TableHead>
            <TableHead className="font-headline text-center">Nxt</TableHead>
            <TableHead className="font-headline text-center">Auditado</TableHead>
            <TableHead className="w-[60px] font-headline text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="transition-colors">
              <TableCell className="font-mono font-bold text-xs">{order.id}</TableCell>
              <TableCell className="text-[10px] leading-tight">
                {new Date(order.data).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-[11px] leading-tight max-w-[150px] truncate">{order.empresa}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">{order.cnpj}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-[10px]">{order.programa}</span>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary/30 text-primary">{order.uf}</Badge>
              </TableCell>
              <TableCell className="text-center">
                {order.do ? <Check className="w-3 h-3 text-emerald-500 mx-auto" /> : <X className="w-3 h-3 text-rose-500 mx-auto" />}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{order.quantidade} UCS</TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {order.taxa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="text-right font-mono font-bold text-xs">
                {order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="text-[9px] py-0 font-mono">{order.hashPedido}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Checkbox
                  checked={order.auditado}
                  onCheckedChange={(checked) => onToggleAudit(order.id, !!checked)}
                  className="mx-auto"
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-accent">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            Rastreabilidade do Pedido: {order.id}
                            <StatusBadge status={order.status} />
                          </div>
                          <Badge variant="outline" className="font-mono text-xs">{order.hashPedido}</Badge>
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Empresa Solicitante</label>
                            <p className="font-semibold text-sm">{order.empresa} ({order.cnpj})</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Volume e Total</label>
                            <p className="font-semibold text-sm">{order.quantidade} UCS | {order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-bold flex items-center gap-2">
                            Movimentações de Rastreio
                            <span className="text-xs font-normal text-muted-foreground">({order.movimentos?.length || 0})</span>
                          </h4>
                          <MovementList 
                            movements={order.movimentos || []} 
                            onDelete={(mid) => onDeleteMovement(order.id, mid)}
                          />
                        </div>

                        <OrderAuditForm onAdd={(raw) => onAddMovement(order.id, raw)} />
                        
                        <div className="flex justify-between items-center pt-4 border-t">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => onDeleteOrder(order.id)}
                          >
                            <Trash2 className="w-4 h-4" /> Excluir Registro
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                            disabled={order.status !== 'ok'}
                          >
                            <ExternalLink className="w-4 h-4" /> Validar na Rede
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
