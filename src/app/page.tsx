"use client"

import { useState, useMemo } from "react";
import { 
  Wallet, 
  LayoutDashboard, 
  BarChart3, 
  ArrowLeftRight, 
  Search, 
  Bell, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownLeft,
  Database,
  FileText,
  ShieldCheck,
  Link as LinkIcon,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { OrderTable } from "@/components/dashboard/OrderTable";
import { AuditOverview } from "@/components/dashboard/AuditOverview";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Pedido, OrderCategory } from "@/lib/types";

const chartConfig = {
  value: {
    label: "Cotação UCS",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const chartData = [
  { month: "Jan/25", value: 120 },
  { month: "Fev/25", value: 115 },
  { month: "Mar/25", value: 130 },
  { month: "Abr/25", value: 125 },
  { month: "Mai/25", value: 140 },
  { month: "Jun/25", value: 135 },
  { month: "Jul/25", value: 145 },
  { month: "Ago/25", value: 130 },
  { month: "Set/25", value: 120 },
  { month: "Out/25", value: 135 },
  { month: "Nov/25", value: 140 },
  { month: "Dez/25", value: 130 },
  { month: "Jan/26", value: 150 },
  { month: "Fev/26", value: 240 },
];

export default function Dashboard() {
  const firestore = useFirestore();
  
  const pedidosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "pedidos");
  }, [firestore]);

  const { data: pedidos, isLoading } = useCollection<Pedido>(pedidosQuery);

  const handleUpdateOrder = (id: string, updates: Partial<Pedido>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    updateDocumentNonBlocking(docRef, updates);
  };

  const handleDeleteOrder = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    deleteDocumentNonBlocking(docRef);
  };

  const handleAddMovement = (orderId: string, raw: string) => {
    if (!firestore) return;
    const lines = raw.split('\n').filter(l => l.trim());
    const movementsRef = collection(firestore, "pedidos", orderId, "movimentos");

    lines.forEach(line => {
      const id = `MOV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      addDocumentNonBlocking(movementsRef, {
        id,
        pedidoId: orderId,
        raw: line,
        hashMovimento: `NXT-${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
        tipo: 'outro',
        origem: 'Manual / Importação',
        destino: 'Rede Auditada',
        quantidade: 0,
        duplicado: false,
        validado: true,
        createdAt: new Date().toISOString()
      });
    });
  };

  const handleDeleteMovement = (orderId: string, moveId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", orderId, "movimentos", moveId);
    deleteDocumentNonBlocking(docRef);
  };

  const orders = pedidos || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="w-20 bg-white border-r flex flex-col items-center py-8 gap-8">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <span className="text-primary font-black text-xs uppercase">bmv</span>
        </div>
        <nav className="flex flex-col gap-6">
          <Button variant="ghost" size="icon" className="rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary">
            <Wallet className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary">
            <BarChart3 className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary">
            <ArrowLeftRight className="w-6 h-6" />
          </Button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200">
          <div>
            <h1 className="text-xl font-medium text-slate-600">Portal de Auditoria <span className="font-bold text-slate-900">NXT Ledger</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar pedido ou hash..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">ADM</div>
          </div>
        </header>

        <div className="p-8 space-y-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-400 animate-pulse font-bold">CARREGANDO DADOS DA BLOCKCHAIN...</p>
            </div>
          ) : (
            <>
              <AuditOverview orders={orders} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700">Cotação UCS</h3>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900">R$ 177,10</span>
                        <span className="text-slate-400 text-xs font-medium">/UCS</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700">Integridade NXT</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        {orders.filter(o => o.linkNxt).length}
                      </span>
                      <span className="text-slate-400 text-sm font-bold">COM LINK / {orders.length} TOTAL</span>
                    </div>
                    <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${(orders.filter(o => o.linkNxt).length / (orders.length || 1)) * 100}%` }}
                       />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700">Sem Auditoria</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-rose-600">
                        {orders.filter(o => !o.auditado).length}
                      </span>
                      <span className="text-slate-400 text-sm font-bold">PENDENTES</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Tabs defaultValue="selo" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-slate-100 p-1">
                      <TabsTrigger value="selo" className="data-[state=active]:bg-white">Selo Tesouro Verde</TabsTrigger>
                      <TabsTrigger value="certificado_sas" className="data-[state=active]:bg-white">Certificado SAS</TabsTrigger>
                      <TabsTrigger value="sas_dmv" className="data-[state=active]:bg-white">SAS DMV</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                       <Button variant="outline" size="sm" className="gap-2 text-[10px] font-bold uppercase">
                         <FileText className="w-3.5 h-3.5" /> Exportar Relatório
                       </Button>
                    </div>
                  </div>

                  <TabsContent value="selo">
                    <OrderTable 
                      orders={orders.filter(o => o.categoria === 'selo')} 
                      onUpdateOrder={handleUpdateOrder}
                      onDeleteOrder={handleDeleteOrder}
                      onAddMovement={handleAddMovement}
                      onDeleteMovement={handleDeleteMovement}
                    />
                  </TabsContent>
                  <TabsContent value="certificado_sas">
                    <OrderTable 
                      orders={orders.filter(o => o.categoria === 'certificado_sas')} 
                      onUpdateOrder={handleUpdateOrder}
                      onDeleteOrder={handleDeleteOrder}
                      onAddMovement={handleAddMovement}
                      onDeleteMovement={handleDeleteMovement}
                    />
                  </TabsContent>
                  <TabsContent value="sas_dmv">
                    <OrderTable 
                      orders={orders.filter(o => o.categoria === 'sas_dmv')} 
                      onUpdateOrder={handleUpdateOrder}
                      onDeleteOrder={handleDeleteOrder}
                      onAddMovement={handleAddMovement}
                      onDeleteMovement={handleDeleteMovement}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
