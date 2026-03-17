
"use client"

import { useState } from "react";
import { 
  Wallet, 
  LayoutDashboard, 
  BarChart3, 
  ArrowLeftRight, 
  Search, 
  Bell, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Database,
  FileText,
  ShieldCheck
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
import { MOCK_PEDIDOS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Configuração do gráfico para o ShadCN
const chartConfig = {
  value: {
    label: "Cotação UCS",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

// Dados simulados para o gráfico
const chartData = [
  { month: "Dez/24", value: 110 },
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
  { month: "Mar/26", value: 190 },
];

const recentMovements = [
  { id: 1, title: "Conta Cliente Thayna", type: "TRANSFERÊNCIA", date: "17/03, 10:01", amount: "- 100 UCS", unit: "UCS", status: "out" },
  { id: 2, title: "Cadastro Investidor", type: "TRANSFERÊNCIA", date: "17/03, 09:44", amount: "- 10 UCS", unit: "UCS", status: "out" },
  { id: 3, title: "Cadastro Investidor", type: "TRANSFERÊNCIA", date: "17/03, 09:44", amount: "+ R$ 2.250,00", unit: "BRL", status: "in" },
  { id: 4, title: "Kléber Franco", type: "PAGAMENTO", date: "24/02, 23:43", amount: "+ R$ 416,01", unit: "BRL", status: "in" },
  { id: 5, title: "Kléber Franco", type: "VENDA", date: "24/02, 23:43", amount: "- 3 UCS", unit: "UCS", status: "out" },
];

export default function Dashboard() {
  const [orders, setOrders] = useState(MOCK_PEDIDOS);

  const handleToggleAudit = (id: string, audited: boolean) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, auditado: audited, status: audited ? 'ok' : 'pendente' } : o));
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleAddMovement = (orderId: string, raw: string) => {
    // Lógica simplificada de parser para o exemplo
    const newId = `MOV-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const lines = raw.split('\n').filter(l => l.trim());
    
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const currentMovements = order.movimentos || [];
        const newMovements = lines.map((line, idx) => ({
          id: `${newId}-${idx}`,
          pedidoId: orderId,
          raw: line,
          hashMovimento: `NXT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          tipo: 'outro' as const,
          origem: 'Importado',
          destino: 'Processado',
          quantidade: order.quantidade,
          duplicado: false,
          validado: true,
          createdAt: new Date().toISOString()
        }));
        return { ...order, movimentos: [...currentMovements, ...newMovements] };
      }
      return order;
    }));
  };

  const handleDeleteMovement = (orderId: string, moveId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return { ...order, movimentos: (order.movimentos || []).filter(m => m.id !== moveId) };
      }
      return order;
    }));
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-20 bg-white border-r flex flex-col items-center py-8 gap-8">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <span className="text-primary font-black text-xs">bmv</span>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200">
          <div>
            <h1 className="text-xl font-medium text-slate-600">Olá, <span className="font-bold text-slate-900">Luiz</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Pesquisar..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
            </div>
            <div className="relative">
              <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 text-slate-600">
                <Bell className="w-5 h-5" />
              </Button>
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 border-2 border-white text-[10px]">99+</Badge>
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">LO</div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-8 overflow-y-auto">
          <AuditOverview orders={orders} />

          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm overflow-hidden">
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
                  <p className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                    +22.64% <span className="text-slate-400 font-normal">Variação (30 dias)</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-700">Saldo UCS</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">527.691</span>
                    <span className="text-slate-400 text-xs font-medium uppercase">UCS</span>
                  </div>
                  <p className="text-emerald-500 text-xs font-bold">R$ 93.454.076,10</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Reservado</p>
                    <p className="text-sm font-bold text-slate-700">864 <span className="text-[10px] text-slate-400 font-normal">UCS</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Bloqueado</p>
                    <p className="text-sm font-bold text-rose-500">0 <span className="text-[10px] text-slate-400 font-normal">UCS</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-700">Saldo BRL</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-bold text-slate-400">R$</span>
                    <span className="text-3xl font-black text-slate-900">200.934,46</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-12 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Reservado</p>
                    <p className="text-sm font-bold text-slate-700">R$ 0,00</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Bloqueado</p>
                    <p className="text-sm font-bold text-rose-500">R$ 0,00</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories and Tables */}
          <div className="space-y-6">
            <Tabs defaultValue="selo" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-slate-100 p-1">
                  <TabsTrigger value="selo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Selo Tesouro Verde</TabsTrigger>
                  <TabsTrigger value="certificado_sas" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Certificado SAS</TabsTrigger>
                  <TabsTrigger value="sas_dmv" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">SAS DMV</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="gap-2 text-[10px] font-bold uppercase">
                     <FileText className="w-3.5 h-3.5" /> Exportar Relatório
                   </Button>
                   <Button size="sm" className="gap-2 text-[10px] font-bold uppercase">
                     <ShieldCheck className="w-3.5 h-3.5" /> Auditoria Geral
                   </Button>
                </div>
              </div>

              <TabsContent value="selo">
                <OrderTable 
                  orders={orders.filter(o => o.categoria === 'selo')} 
                  onToggleAudit={handleToggleAudit}
                  onDeleteOrder={handleDeleteOrder}
                  onAddMovement={handleAddMovement}
                  onDeleteMovement={handleDeleteMovement}
                />
              </TabsContent>
              <TabsContent value="certificado_sas">
                <OrderTable 
                  orders={orders.filter(o => o.categoria === 'certificado_sas')} 
                  onToggleAudit={handleToggleAudit}
                  onDeleteOrder={handleDeleteOrder}
                  onAddMovement={handleAddMovement}
                  onDeleteMovement={handleDeleteMovement}
                />
              </TabsContent>
              <TabsContent value="sas_dmv">
                <OrderTable 
                  orders={orders.filter(o => o.categoria === 'sas_dmv')} 
                  onToggleAudit={handleToggleAudit}
                  onDeleteOrder={handleDeleteOrder}
                  onAddMovement={handleAddMovement}
                  onDeleteMovement={handleDeleteMovement}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Charts and Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-8">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-700">Variação UCS</CardTitle>
                    <p className="text-xs text-slate-400">R$ 177,10 <span className="text-rose-500 font-bold ml-1">-21.29%</span></p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <YAxis 
                      hide 
                      domain={[0, 'auto']}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={12}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === chartData.length - 1 ? '#EF4444' : '#10B981'} 
                          fillOpacity={index < chartData.length - 2 ? 0.5 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-700">Últimas Movimentações</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-2">
                <div className="space-y-6">
                  {recentMovements.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between px-4 group cursor-pointer hover:bg-slate-50 py-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          mov.status === 'in' ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                        )}>
                          {mov.status === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{mov.title}</p>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[8px] font-black tracking-widest uppercase",
                              mov.status === 'in' ? "text-emerald-500" : "text-rose-500"
                            )}>{mov.type}</span>
                            <span className="text-[9px] text-slate-400">{mov.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-black",
                          mov.status === 'in' ? "text-emerald-500" : "text-rose-500"
                        )}>{mov.amount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{mov.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
