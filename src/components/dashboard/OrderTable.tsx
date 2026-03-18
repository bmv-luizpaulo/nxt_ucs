import { Pedido, OrderStatus, Movimento } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, MoreHorizontal, Link as LinkIcon, Save, Database, ShieldCheck, Check, X, Printer, FileText, CheckCircle2, File, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { MovementList } from "./MovementList";
import { OrderAuditForm } from "./OrderAuditForm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
                className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Pedido</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Data</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Origem</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">PARC/PROG</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-14">UF</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-14">D.O</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-14">Qtd</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-14">Taxa</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-14">Total</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-14">Nxt</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-14">Status</TableHead>
            <TableHead className="w-[100px] pr-8 h-14"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="h-48 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Nenhum pedido registrado nesta categoria
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow 
                key={order.id} 
                className={`group transition-colors border-b border-slate-50 last:border-0 ${selectedIds.includes(order.id) ? 'bg-emerald-50/30' : 'hover:bg-slate-50/80'}`}
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
                  <div className="text-[9px] opacity-70">{new Date(order.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-[10px] uppercase truncate max-w-[150px] text-slate-900">{order.empresa}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{order.cnpj}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[10px] font-medium text-slate-600 max-w-[120px] truncate">
                  {order.programa}
                </TableCell>
                <TableCell className="text-center font-bold text-[10px] text-slate-500">
                  {order.uf}
                </TableCell>
                <TableCell className="text-center">
                  {order.do ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-[10px] font-black text-slate-900 whitespace-nowrap">{order.quantidade} UCS</TableCell>
                <TableCell className="text-right font-mono text-[10px] text-slate-500">
                  {order.taxa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-right font-mono font-black text-[11px] text-primary whitespace-nowrap">
                  {order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-center">
                  {order.linkNxt ? (
                    <a href={order.linkNxt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                      <LinkIcon className="w-3 h-3" />
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-[7px] border-rose-100 bg-rose-50 text-rose-500 uppercase px-1 py-0 font-bold tracking-tighter">OFF</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right pr-8">
                  <div className="flex items-center justify-end gap-1">
                    {order.status === 'ok' && (
                      <OrderDetailsDialog 
                        order={order} 
                        onUpdateOrder={onUpdateOrder}
                        onDeleteOrder={onDeleteOrder}
                        onAddMovement={onAddMovement}
                        onDeleteMovement={onDeleteMovement}
                        variant="pdf"
                      />
                    )}
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderDetailsDialog({ order, onUpdateOrder, onDeleteOrder, onAddMovement, onDeleteMovement, variant = "default" }: any) {
  const [hash, setHash] = useState(order.hashPedido || "");
  const [link, setLink] = useState(order.linkNxt || "");
  const firestore = useFirestore();
  const { user } = useUser();
  
  const movimentosQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "pedidos", order.id, "movimentos");
  }, [firestore, order.id, user]);

  const { data: movimentos } = useCollection<Movimento>(movimentosQuery);

  const handleSaveAudit = () => {
    onUpdateOrder(order.id, { 
      hashPedido: hash, 
      linkNxt: link, 
      auditado: !!(hash && link),
      status: (hash && link) ? 'ok' : 'pendente'
    });
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Certificado_${order.id}_${order.empresa.replace(/\s+/g, '_')}`;
    window.print();
    document.title = originalTitle;
  };

  const qrCodeUrl = order.linkNxt 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(order.linkNxt)}`
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {variant === "pdf" ? (
          <Button variant="ghost" size="icon" title="Gerar Certificado PDF" className="h-8 w-8 text-primary hover:bg-emerald-50 rounded-lg animate-in fade-in zoom-in border border-emerald-100">
            <Download className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" title="Editar Auditoria" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] border-none shadow-2xl p-8 print:max-h-none print:overflow-visible print:bg-transparent print:p-0 print:shadow-none",
        variant === 'pdf' ? "sm:max-w-5xl" : "sm:max-w-4xl"
      )}>
        
        <DialogHeader className={cn(
          "border-b border-slate-100 pb-6 print:hidden",
          variant === 'pdf' ? 'sr-only' : 'block'
        )}>
          <DialogTitle>
            Auditoria de Pedido - {order.id}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalhamento e rastreabilidade do certificado blockchain para {order.empresa}.
          </DialogDescription>
        </DialogHeader>

        {variant === "default" && (
          <div className="print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-8">
              <div className="space-y-8">
                <div className="bg-slate-50/50 p-6 rounded-3xl space-y-6 border border-slate-100">
                  <h4 className="text-[10px] font-black uppercase text-primary flex items-center gap-2 tracking-widest">
                    <ShieldCheck className="w-4 h-4" /> Vincular Blockchain NXT
                  </h4>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hash do Pedido</label>
                    <Input 
                      value={hash} 
                      onChange={(e) => setHash(e.target.value)}
                      placeholder="Ex: 0x885...NXT"
                      className="font-mono text-xs bg-white border-slate-200 rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL de Auditoria (Link Nxt)</label>
                    <Input 
                      value={link} 
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://nxt.explorer/tx/..."
                      className="font-mono text-xs bg-white border-slate-200 rounded-xl h-12"
                    />
                  </div>
                  <Button onClick={handleSaveAudit} className="w-full gap-2 font-black uppercase text-[10px] h-12 rounded-2xl shadow-lg shadow-primary/10">
                    <Save className="w-4 h-4" /> Salvar Auditoria de Hash
                  </Button>
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

            <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-10">
              <Button variant="ghost" className="text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl" onClick={() => onDeleteOrder(order.id)}>
                <Trash2 className="w-4 h-4 mr-2" /> Remover Permanente
              </Button>
              <div className="flex gap-3">
                 {order.status === 'ok' && (
                   <Button onClick={handlePrint} className="text-[10px] font-black uppercase rounded-xl h-11 px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
                     <Download className="w-4 h-4" /> DOWNLOAD DO CERTIFICADO PDF
                   </Button>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* ÁREA DE GERAÇÃO - CERTIFICADO PDF */}
        <div className={cn(
          "printable-content",
          variant === 'pdf' ? "block" : "hidden print:block"
        )}>
          <div className="flex justify-between items-center mb-4 border-b-2 border-slate-900 pb-4 print-no-break">
            <div className="relative w-36 h-16">
              <Image 
                src="/image/logo_amarelo.png" 
                alt="BMV LedgerTrust" 
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="text-right flex flex-col items-end">
              <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Certificado de Rastreabilidade</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Protocolo de Auditoria: #{order.id}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6 print-no-break">
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-1">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Identificação do Ativo</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[8px] tracking-widest block mb-0.5">Pedido ID:</span>
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-lg text-xl font-black text-primary border border-emerald-100 inline-block tracking-tight">
                    ##{order.id}
                  </div>
                </div>
                <div className="text-[10px] space-y-1">
                  <p><strong>Data de Registro:</strong> {new Date(order.data).toLocaleDateString('pt-BR')}</p>
                  <p className="leading-tight"><strong>Empresa/Origem:</strong> {order.empresa}</p>
                  <p><strong>CNPJ:</strong> <span className="font-mono text-primary font-bold">{order.cnpj}</span></p>
                  <p><strong>Programa:</strong> {order.programa}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-1">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Auditoria Digital</h3>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-[11px] font-bold">Quantidade UCS:</p>
                  <p className="text-xl font-black text-slate-900 leading-none">{order.quantidade}</p>
                  <p className="text-[10px] font-bold">Valor Auditado:</p>
                  <p className="text-base font-black text-slate-900">{order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  
                  <div className="pt-1">
                    <a href={order.linkNxt} target="_blank" rel="noopener noreferrer" className="text-[8px] text-primary font-black uppercase underline break-all block">
                      Validar na Blockchain
                    </a>
                  </div>
                </div>
                {qrCodeUrl && (
                  <div className="w-20 h-20 border p-1 rounded-lg shrink-0 bg-white">
                    <img src={qrCodeUrl} alt="QR Code Auditoria" className="w-full h-full" />
                    <p className="text-[5px] text-center font-bold mt-1 text-slate-400">ESCANEIE PARA VALIDAR</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden print-no-break">
            <h3 className="text-[9px] font-black uppercase border-b-2 border-slate-900 pb-1 text-slate-900 tracking-widest mb-3">Histórico de Rastreabilidade (Ledger Records)</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[9px] font-black uppercase text-slate-400 h-8">Categoria</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-400 h-8">Origem do Ativo</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-400 h-8">Destino</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-400 h-8 text-right">Volume (UCS)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentos?.slice(0, 15).map((mov) => (
                    <TableRow key={mov.id} className="border-b border-slate-100">
                      <TableCell className="py-2 text-[9px] font-bold uppercase text-slate-600">{mov.tipo}</TableCell>
                      <TableCell className="py-2 text-[9px] leading-tight max-w-[140px] truncate">{mov.origem}</TableCell>
                      <TableCell className="py-2 text-[9px] leading-tight max-w-[140px] truncate">{mov.destino}</TableCell>
                      <TableCell className="py-2 text-right font-mono text-[10px] font-black text-slate-900">{mov.quantidade}</TableCell>
                    </TableRow>
                  ))}
                  {movimentos && movimentos.length > 15 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-1.5 text-[8px] font-bold text-slate-400 uppercase italic">
                        + {movimentos.length - 15} registros adicionais validados no Ledger
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-6 pt-6 flex justify-between items-end border-t-2 border-slate-200 print-no-break">
             <div className="text-center flex flex-col items-center">
                <div className="w-12 h-12 border-2 border-emerald-100 rounded-full flex items-center justify-center mb-1 bg-emerald-50">
                   <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-[8px] font-black uppercase text-emerald-600 tracking-tighter italic">Integridade Verificada</p>
             </div>
             <div className="text-right">
                <div className="w-56 border-b-2 border-slate-900 mb-1.5"></div>
                <p className="text-[9px] font-black uppercase text-slate-900 tracking-widest">Auditor de Conformidade BMV</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Documento Assinado Digitalmente</p>
             </div>
          </div>

          {variant === "pdf" && (
            <div className="mt-6 flex justify-end print:hidden">
              <Button 
                onClick={handlePrint} 
                className="gap-3 font-black uppercase text-xs h-12 px-10 rounded-xl shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all active:scale-95"
              >
                <Download className="w-5 h-5" /> DOWNLOAD DO CERTIFICADO PDF
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}