"use client"

import { useState } from "react";
import { 
  Wallet, 
  LayoutDashboard, 
  BarChart3, 
  ArrowLeftRight, 
  Search, 
  TrendingUp, 
  Database,
  FileText,
  ShieldCheck,
  Link as LinkIcon,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderTable } from "@/components/dashboard/OrderTable";
import { AuditOverview } from "@/components/dashboard/AuditOverview";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { Pedido, Movimento } from "@/lib/types";

export default function Dashboard() {
  const firestore = useFirestore();
  
  const pedidosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "pedidos");
  }, [firestore]);

  const { data: pedidos, isLoading } = useCollection<Pedido>(pedidosQuery);

  const handleUpdateOrder = async (id: string, updates: Partial<Pedido>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    await updateDoc(docRef, updates);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    await deleteDoc(docRef);
  };

  const handleAddMovement = async (orderId: string, raw: string) => {
    if (!firestore) return;
    const lines = raw.split('\n').filter(l => l.trim());
    const movementsRef = collection(firestore, "pedidos", orderId, "movimentos");

    for (const line of lines) {
      const id = `MOV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      await addDoc(movementsRef, {
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
    }
  };

  const handleDeleteMovement = async (orderId: string, moveId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", orderId, "movimentos", moveId);
    await deleteDoc(docRef);
  };

  const orders = pedidos || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar Lateral */}
      <aside className="w-20 bg-white border-r flex flex-col items-center py-8 gap-8">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <span className="text-primary font-black text-xs uppercase">bmv</span>
        </div>
        <nav className="flex flex-col gap-6">
          <Button variant="ghost" size="icon" className="rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary">
            <ShieldCheck className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary">
            <Database className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-primary">
            <ArrowLeftRight className="w-6 h-6" />
          </Button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        {/* Header */}
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

        {/* Conteúdo Principal */}
        <div className="p-8 space-y-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando com Blockchain NXT...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Visão Geral (Cartões de Auditoria) */}
              <AuditOverview orders={orders} />

              {/* Métricas e Relatórios Rápidos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardContent className="p-6 relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700">Cotação UCS</h3>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">R$ 177,10</span>
                      <span className="text-slate-400 text-xs font-medium">/UCS</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700">Cobertura de Auditoria</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        {((orders.filter(o => o.linkNxt).length / (orders.length || 1)) * 100).toFixed(0)}%
                      </span>
                      <span className="text-slate-400 text-sm font-bold uppercase tracking-tighter">COM LINKS NXT</span>
                    </div>
                    <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${(orders.filter(o => o.linkNxt).length / (orders.length || 1)) * 100}%` }}
                       />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700">Atenção Necessária</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-rose-600">
                        {orders.filter(o => !o.auditado).length}
                      </span>
                      <span className="text-slate-400 text-sm font-bold uppercase tracking-tighter">SEM HASH VINCULADO</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabelas de Auditoria Separadas por Categoria */}
              <div className="space-y-6">
                <Tabs defaultValue="selo" className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100/50 p-1 border">
                      <TabsTrigger value="selo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Selo Tesouro Verde</TabsTrigger>
                      <TabsTrigger value="certificado_sas" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Certificado SAS</TabsTrigger>
                      <TabsTrigger value="sas_dmv" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">SAS DMV</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-3">
                       <Button variant="outline" size="sm" className="gap-2 text-[10px] font-bold uppercase tracking-widest border-slate-200">
                         <FileText className="w-3.5 h-3.5" /> Exportar Relatório
                       </Button>
                       <Button size="sm" className="gap-2 text-[10px] font-bold uppercase tracking-widest">
                         <Database className="w-3.5 h-3.5" /> Sincronizar Tudo
                       </Button>
                    </div>
                  </div>

                  <TabsContent value="selo" className="mt-0">
                    <OrderTable 
                      orders={orders.filter(o => o.categoria === 'selo' || !o.categoria)} 
                      onUpdateOrder={handleUpdateOrder}
                      onDeleteOrder={handleDeleteOrder}
                      onAddMovement={handleAddMovement}
                      onDeleteMovement={handleDeleteMovement}
                    />
                  </TabsContent>
                  <TabsContent value="certificado_sas" className="mt-0">
                    <OrderTable 
                      orders={orders.filter(o => o.categoria === 'certificado_sas')} 
                      onUpdateOrder={handleUpdateOrder}
                      onDeleteOrder={handleDeleteOrder}
                      onAddMovement={handleAddMovement}
                      onDeleteMovement={handleDeleteMovement}
                    />
                  </TabsContent>
                  <TabsContent value="sas_dmv" className="mt-0">
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
