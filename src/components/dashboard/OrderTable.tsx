
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
  QrCode as QrCodeIcon,
  FileText,
  ImageIcon,
  Leaf
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
import { SealDownloadDialog } from "./SealDownloadDialog";
import { ReportDownloadDialog } from "./ReportDownloadDialog";
import { calculateGhgEmissions } from "@/lib/ghgProtocol";

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
    <div className="rounded-[2.8rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
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
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Pedido</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Data</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Origem</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Cliente</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">CNPJ</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-10">Qtd</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-10">Taxa</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-10">Total</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-10">Modo</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Link Nxt</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-10">Status</TableHead>
            <TableHead className="w-[80px] pr-8 h-10"></TableHead>
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
                <TableCell className="font-mono font-bold text-xs text-slate-700">{order.id}</TableCell>
                <TableCell className="text-[10px] text-slate-500 whitespace-nowrap">
                  <div className="font-bold text-slate-900">{new Date(order.data).toLocaleDateString('pt-BR')}</div>
                </TableCell>
                <TableCell title={order.origem || order.programa}>
                  <span className="text-[9px] font-black text-primary uppercase truncate max-w-[100px] block">
                    {order.origem || order.programa || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-[10px] uppercase truncate max-w-[150px] text-slate-900 leading-tight">
                    {order.empresa}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-[9px] text-slate-500">
                  {order.cnpj || "-"}
                </TableCell>
                <TableCell className="text-right font-mono text-[10px] font-black text-slate-900 whitespace-nowrap">{order.quantidade} UCS</TableCell>
                <TableCell className="text-right font-mono text-[10px] text-slate-500">
                  {order.taxa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-right font-mono font-black text-[11px] text-slate-900 whitespace-nowrap">
                  {order.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-center font-bold text-[9px] text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {order.modo || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5 max-w-[120px]">
                    {order.linkNxt || order.hashPedido ? (
                      <span className="text-[8px] font-mono text-slate-400 truncate" title={order.hashPedido || order.linkNxt}>
                        {order.linkNxt || order.hashPedido}
                      </span>
                    ) : (
                      <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter opacity-80 leading-none">PENDENTE LINK NXT</span>
                    )}
                  </div>
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
  const [certLink, setCertLink] = useState(order.linkCertificado || "");
  const [sealDialogOpen, setSealDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  
  // Env KPIs State
  const [nucleo, setNucleo] = useState(order.nucleo || "");
  const [validade, setValidade] = useState(order.validade || "");
  
  // Activity Data
  const [kpiPessoas, setKpiPessoas] = useState(order.kpiPessoas || 0);
  const [kpiEnergiaKwh, setKpiEnergiaKwh] = useState(order.kpiEnergiaKwh || 0);
  const [kpiAguaM3, setKpiAguaM3] = useState(order.kpiAguaM3 || 0);
  const [kpiEtanolL, setKpiEtanolL] = useState(order.kpiEtanolL || 0);
  const [kpiGasolinaL, setKpiGasolinaL] = useState(order.kpiGasolinaL || 0);
  const [kpiDieselL, setKpiDieselL] = useState(order.kpiDieselL || 0);
  const [kpiGnvM3, setKpiGnvM3] = useState(order.kpiGnvM3 || 0);
  const [kpiJetfuelL, setKpiJetfuelL] = useState(order.kpiJetfuelL || 0);
  const [kpiLixoT, setKpiLixoT] = useState(order.kpiLixoT || 0);
  const [kpiAreaM2, setKpiAreaM2] = useState(order.kpiAreaM2 || 0);
  const [kpiLenhaT, setKpiLenhaT] = useState(order.kpiLenhaT || 0);

  // Positive Impact KPIs
  const [kpiFlorestaNativaM2, setKpiFlorestaNativaM2] = useState(order.kpiFlorestaNativaM2 || order.quantidade * 30);
  const [kpiCarbonoTCO2e, setKpiCarbonoTCO2e] = useState(order.kpiCarbonoTCO2e || order.quantidade);
  const [kpiFaunaHa, setKpiFaunaHa] = useState(order.kpiFaunaHa || 0);
  const [kpiFloraHa, setKpiFloraHa] = useState(order.kpiFloraHa || 0);
  const [kpiMadeiraM3, setKpiMadeiraM3] = useState(order.kpiMadeiraM3 || 0);
  const [kpiProducaoApoiadaM2, setKpiProducaoApoiadaM2] = useState(order.kpiProducaoApoiadaM2 || 0);
  const [kpiHidrologicoLAno, setKpiHidrologicoLAno] = useState(order.kpiHidrologicoLAno || 0);
  const [kpiRecuperacaoAreaM2, setKpiRecuperacaoAreaM2] = useState(order.kpiRecuperacaoAreaM2 || 0);

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

  const ghgEmissions = useMemo(() => {
    return calculateGhgEmissions({
      kpiGasolinaL,
      kpiDieselL,
      kpiEtanolL,
      kpiGnvM3,
      kpiJetfuelL,
      kpiLenhaT,
      kpiEnergiaKwh,
      kpiAguaM3,
      kpiLixoT,
    });
  }, [kpiGasolinaL, kpiDieselL, kpiEtanolL, kpiGnvM3, kpiJetfuelL, kpiLenhaT, kpiEnergiaKwh, kpiAguaM3, kpiLixoT]);

  const handleSaveAudit = () => {
    const isAuditOk = !!(hash && link); // Exige link NXT agora para ser OK
    onUpdateOrder(order.id, { 
      hashPedido: hash, 
      linkNxt: link, 
      linkCertificado: certLink,
      auditado: isAuditOk,
      status: isAuditOk ? 'ok' : 'pendente',
      
      // Environmental KPIs
      nucleo,
      validade,
      kpiPessoas: Number(kpiPessoas),
      kpiEnergiaKwh: Number(kpiEnergiaKwh),
      kpiAguaM3: Number(kpiAguaM3),
      kpiEtanolL: Number(kpiEtanolL),
      kpiGasolinaL: Number(kpiGasolinaL),
      kpiDieselL: Number(kpiDieselL),
      kpiGnvM3: Number(kpiGnvM3),
      kpiJetfuelL: Number(kpiJetfuelL),
      kpiLixoT: Number(kpiLixoT),
      kpiAreaM2: Number(kpiAreaM2),
      kpiLenhaT: Number(kpiLenhaT),

      kpiFlorestaNativaM2: Number(kpiFlorestaNativaM2),
      kpiCarbonoTCO2e: Number(kpiCarbonoTCO2e),
      kpiFaunaHa: Number(kpiFaunaHa),
      kpiFloraHa: Number(kpiFloraHa),
      kpiMadeiraM3: Number(kpiMadeiraM3),
      kpiProducaoApoiadaM2: Number(kpiProducaoApoiadaM2),
      kpiHidrologicoLAno: Number(kpiHidrologicoLAno),
      kpiRecuperacaoAreaM2: Number(kpiRecuperacaoAreaM2)
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const qrCodeUrl = (certLink || link) 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(certLink || link)}`
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
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center gap-0">
               <div className="relative w-16 h-16">
                 <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
               </div>
               <span className="text-[36px] font-black text-amber-500 leading-none -ml-2">bmv</span>
            </div>
            <div className="text-right">
              <h2 className="text-[16px] font-black uppercase tracking-tight leading-tight">CERTIFICADO DE RASTREABILIDADE</h2>
              <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest mt-1">PROTOCOLO DE AUDITORIA: ##{order.id}</p>
              <p className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase">{new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-8">
            {/* IDENTIFICAÇÃO DO ATIVO */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1.5 tracking-[0.2em]">IDENTIFICAÇÃO DO ATIVO</h3>
              <div className="space-y-4">
                <p className="text-[28px] font-black text-[#10B981] leading-none tracking-tighter">##{order.id}</p>
                <div className="text-[10px] space-y-2 font-bold uppercase tracking-tight">
                  <p><strong className="text-slate-400 font-black mr-2">DATA DO PROTOCOLO:</strong> {new Date(order.data).toLocaleDateString()}</p>
                  <p className="leading-tight"><strong className="text-slate-400 font-black mr-2">ENTIDADE ADQUIRENTE:</strong> {order.empresa}</p>
                  <p><strong className="text-slate-400 font-black mr-2">REGISTRO CNPJ:</strong> {order.cnpj}</p>
                  <p><strong className="text-slate-400 font-black mr-2">{order.uf ? "PROJETO DE ORIGEM:" : "ORIGEM:"}</strong> {order.programa} {order.uf ? `(${order.uf})` : ""}</p>
                </div>
              </div>
            </div>

            {/* AUDITORIA DIGITAL */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1.5 tracking-[0.2em]">AUDITORIA DIGITAL</h3>
              <div className="flex justify-between items-start gap-4">
                <div className="text-[10px] space-y-3 font-bold uppercase flex-1">
                  <div>
                    <p className="text-slate-400 font-black text-[8px] mb-0.5">VOLUME DE UCS APOSENTADAS</p>
                    <p className="text-xl font-black text-slate-900">{order.quantidade.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-black text-[8px] mb-0.5">VALOR TOTAL DO PEDIDO</p>
                    <p className="text-xl font-black text-slate-900">{order.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                  {(certLink || link) && (
                    <p className="text-[8px] text-blue-600 underline break-all">{certLink || link}</p>
                  )}
                </div>

                {/* QR CODE BOX */}
                <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0 shadow-sm">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 bg-white p-1 rounded-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-white flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                      <QrCodeIcon className="w-6 h-6 text-slate-200" />
                    </div>
                  )}
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CERTIFICADO</p>
                </div>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE RASTREABILIDADE */}
          <div className="mt-8 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1.5 tracking-[0.2em]">HISTÓRICO DE RASTREABILIDADE (LEDGER RECORDS)</h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-[9px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-black uppercase text-slate-400 tracking-widest">CATEGORIA</th>
                    <th className="px-5 py-3 font-black uppercase text-slate-400 tracking-widest">ORIGEM DO ATIVO</th>
                    <th className="px-5 py-3 font-black uppercase text-slate-400 tracking-widest">DESTINO FINAL</th>
                    <th className="px-5 py-3 font-black uppercase text-slate-400 tracking-widest text-right">VOLUME</th>
                  </tr>
                </thead>
                <tbody className="font-bold uppercase">
                  {movimentos && movimentos.length > 0 ? (
                    movimentos.map((mov, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-5 py-2.5 text-slate-600 font-black">{mov.tipo || "CLIENTE"}</td>
                        <td className="px-5 py-2.5 text-slate-500 truncate max-w-[180px]">{mov.origem}</td>
                        <td className="px-5 py-2.5 text-slate-900 font-black">{mov.destino}</td>
                        <td className="px-5 py-2.5 text-right font-black text-slate-900">{mov.quantidade} UCS</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-300 italic lowercase">Nenhum registro de rastreabilidade vinculado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER DO CERTIFICADO */}
          <div className="mt-12 flex justify-between items-end">
            <div className="text-[10px] text-[#10B981] font-black flex items-center gap-2 uppercase tracking-tight">
              <Check className="w-4 h-4 stroke-[4px]" /> INTEGRIDADE VERIFICADA PELO LEDGER
            </div>
            <div className="text-right">
              <div className="border-t border-slate-900 w-64 pt-3">
                <p className="text-[10px] font-black uppercase text-slate-900 tracking-tight">AUDITOR DE CONFORMIDADE BMV</p>
                <p className="text-[7px] text-slate-400 uppercase font-bold">Assinado digitalmente via LedgerTrust</p>
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
            <StatBox label={order.uf ? "UF ORIGEM" : "MODO"} value={order.uf || order.modo || "-"} isStatus />
            <StatBox label="CATEGORIA" value={order.categoria.replace(/_/g, ' ')} isStatus isAccent />
            <StatBox label={order.uf ? "D.O" : "ORIGEM"} value={order.uf ? (order.do ? 'SIM' : 'NÃO') : (order.origem || "-")} isStatus />
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
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Número do Selo</label>
                        <Input 
                          value={hash} 
                          onChange={(e) => setHash(e.target.value)}
                          placeholder="0x885...NXT"
                          className="font-mono text-[13px] bg-white border-slate-200 rounded-[1.25rem] h-14 px-8 focus:ring-primary shadow-sm"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Link NXT</label>
                        <Input 
                          value={link} 
                          onChange={(e) => setLink(e.target.value)}
                          placeholder="https://explorer.nxt.org/transaction/..."
                          className="font-mono text-[13px] bg-white border-slate-200 rounded-[1.25rem] h-14 px-8 focus:ring-primary shadow-sm"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <FileText className="w-3 h-3" /> Link do Certificado
                        </label>
                        <Input 
                          value={certLink} 
                          onChange={(e) => setCertLink(e.target.value)}
                          placeholder="https://app.tesouroverde.global/#/certificate/..."
                          className="font-mono text-[13px] bg-white border-slate-200 rounded-[1.25rem] h-14 px-8 focus:ring-primary shadow-sm"
                        />
                      </div>
                      <Button onClick={handleSaveAudit} className="w-full h-16 rounded-[1.25rem] bg-[#10B981] hover:bg-[#0D9488] text-white font-black uppercase text-[12px] tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-[0.98]">
                        Sincronizar Auditoria
                      </Button>
                    </div>
                  </div>

                  {/* INVENTÁRIO GEE & COMPENSAÇÃO (GHG PROTOCOL) */}
                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] space-y-8 border border-slate-100">
                    <h4 className="text-[11px] font-black uppercase text-[#10B981] flex items-center gap-2 tracking-[0.2em]">
                      <Leaf className="w-4 h-4" /> INVENTÁRIO & COMPENSAÇÃO (GHG PROTOCOL)
                    </h4>
                    
                    {/* Live Calculation Panel */}
                    <div className="bg-[#0B0F1A] text-white p-5 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                      <div className="flex justify-between items-center pb-2 border-b border-white/10">
                        <span className="text-[10px] font-black uppercase text-slate-400">Pegada Calculada</span>
                        <span className="font-mono text-xs font-bold text-amber-400">{ghgEmissions.total} tCO2e</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-400">
                        <div className="bg-white/5 p-2 rounded-lg text-center">
                          <p className="font-bold uppercase tracking-wider text-[8px]">Escopo 1</p>
                          <p className="font-mono text-white mt-0.5">{ghgEmissions.scope1} t</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg text-center">
                          <p className="font-bold uppercase tracking-wider text-[8px]">Escopo 2</p>
                          <p className="font-mono text-white mt-0.5">{ghgEmissions.scope2} t</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg text-center">
                          <p className="font-bold uppercase tracking-wider text-[8px]">Escopo 3</p>
                          <p className="font-mono text-white mt-0.5">{ghgEmissions.scope3} t</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 text-[10px] font-bold">
                        <span className="text-slate-400 uppercase">Compensação (UCS):</span>
                        <span className="text-emerald-400 font-mono">{order.quantidade} tCO2e</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400 uppercase">Status de Carbono:</span>
                        {order.quantidade >= ghgEmissions.total ? (
                          <span className="text-emerald-400 uppercase tracking-wider font-black">Carbono Neutro ✓</span>
                        ) : (
                          <span className="text-rose-400 uppercase tracking-wider font-black">Déficit de {(ghgEmissions.total - order.quantidade).toFixed(3)} t</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Núcleo BMV</label>
                          <Input 
                            value={nucleo} 
                            onChange={(e) => setNucleo(e.target.value)}
                            placeholder="Ex: Xingu Mata Viva"
                            className="text-xs bg-white border-slate-200 rounded-xl h-11 px-4 focus:ring-primary shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade Certificado</label>
                          <Input 
                            value={validade} 
                            onChange={(e) => setValidade(e.target.value)}
                            placeholder="Ex: 31/12/2027"
                            className="text-xs bg-white border-slate-200 rounded-xl h-11 px-4 focus:ring-primary shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Inputs da Pegada de Carbono */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#10B981]">Dados de Atividade (Consumo Anual)</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Energia (kWh)</label>
                            <Input 
                              type="number"
                              value={kpiEnergiaKwh || ""} 
                              onChange={(e) => setKpiEnergiaKwh(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Água (m³)</label>
                            <Input 
                              type="number"
                              value={kpiAguaM3 || ""} 
                              onChange={(e) => setKpiAguaM3(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Lixo (t)</label>
                            <Input 
                              type="number"
                              value={kpiLixoT || ""} 
                              onChange={(e) => setKpiLixoT(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Gasolina (L)</label>
                            <Input 
                              type="number"
                              value={kpiGasolinaL || ""} 
                              onChange={(e) => setKpiGasolinaL(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Diesel (L)</label>
                            <Input 
                              type="number"
                              value={kpiDieselL || ""} 
                              onChange={(e) => setKpiDieselL(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Etanol (L)</label>
                            <Input 
                              type="number"
                              value={kpiEtanolL || ""} 
                              onChange={(e) => setKpiEtanolL(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">GNV (m³)</label>
                            <Input 
                              type="number"
                              value={kpiGnvM3 || ""} 
                              onChange={(e) => setKpiGnvM3(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Jetfuel (L)</label>
                            <Input 
                              type="number"
                              value={kpiJetfuelL || ""} 
                              onChange={(e) => setKpiJetfuelL(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Lenha (t)</label>
                            <Input 
                              type="number"
                              value={kpiLenhaT || ""} 
                              onChange={(e) => setKpiLenhaT(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Pessoas</label>
                            <Input 
                              type="number"
                              value={kpiPessoas || ""} 
                              onChange={(e) => setKpiPessoas(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Área (m²)</label>
                            <Input 
                              type="number"
                              value={kpiAreaM2 || ""} 
                              onChange={(e) => setKpiAreaM2(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-lg h-9 px-2 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Inputs de Impacto Positivo */}
                      <div className="space-y-3 pt-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#10B981]">Impacto Ecológico Positivo</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Floresta Preservada (m²)</label>
                            <Input 
                              type="number"
                              value={kpiFlorestaNativaM2 || ""} 
                              onChange={(e) => setKpiFlorestaNativaM2(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-xl h-10 px-3 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Carbono Estocado (tCO2e)</label>
                            <Input 
                              type="number"
                              value={kpiCarbonoTCO2e || ""} 
                              onChange={(e) => setKpiCarbonoTCO2e(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-xl h-10 px-3 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Fauna (espécies/ha)</label>
                            <Input 
                              type="number"
                              value={kpiFaunaHa || ""} 
                              onChange={(e) => setKpiFaunaHa(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-xl h-10 px-3 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Flora (espécies/ha)</label>
                            <Input 
                              type="number"
                              value={kpiFloraHa || ""} 
                              onChange={(e) => setKpiFloraHa(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-xl h-10 px-3 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5">Madeira Preservada (m³)</label>
                            <Input 
                              type="number"
                              value={kpiMadeiraM3 || ""} 
                              onChange={(e) => setKpiMadeiraM3(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-xl h-10 px-3 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-0.5 text-ellipsis overflow-hidden whitespace-nowrap">Ciclo Hidrológico (L/ano)</label>
                            <Input 
                              type="number"
                              value={kpiHidrologicoLAno || ""} 
                              onChange={(e) => setKpiHidrologicoLAno(Number(e.target.value))}
                              className="text-xs bg-white border-slate-200 rounded-xl h-10 px-3 focus:ring-primary font-mono shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSealDialogOpen(true)}
              className="h-14 px-8 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700 font-black uppercase text-[11px] tracking-widest hover:bg-emerald-100 transition-all shadow-sm flex gap-2"
            >
              <ImageIcon className="w-4 h-4" /> Baixar Selo
            </Button>
            <Button variant="outline" onClick={() => setReportDialogOpen(true)} className="h-14 px-10 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[11px] tracking-widest text-slate-700 hover:bg-white transition-all shadow-sm flex gap-2">
              <Printer className="w-4 h-4" /> Gerar Certificado PDF
            </Button>
            <Button onClick={handleSaveAudit} className="h-14 px-12 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
              <Save className="w-4 h-4 mr-2" /> Finalizar Auditoria
            </Button>
          </div>
        </div>

        <SealDownloadDialog
          open={sealDialogOpen}
          onOpenChange={setSealDialogOpen}
          pedido={{ ...order, hashPedido: hash || order.hashPedido, linkNxt: link || order.linkNxt, linkCertificado: certLink || order.linkCertificado }}
        />
        <ReportDownloadDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          pedido={{ ...order, hashPedido: hash || order.hashPedido, linkNxt: link || order.linkNxt, linkCertificado: certLink || order.linkCertificado }}
          movimentos={movimentos || []}
        />
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
