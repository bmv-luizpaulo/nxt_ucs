
"use client"

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Search, 
  Database,
  FileText,
  ShieldCheck,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderTable } from "@/components/dashboard/OrderTable";
import { AuditOverview } from "@/components/dashboard/AuditOverview";
import { AddOrderDialog } from "@/components/dashboard/AddOrderDialog";
import { BulkImportDialog } from "@/components/dashboard/BulkImportDialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, setDoc, writeBatch, query, orderBy } from "firebase/firestore";
import { Pedido, OrderCategory, Movimento } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState<OrderCategory>("selo");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const pedidosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "pedidos"), orderBy("data", "desc"));
  }, [firestore]);

  const { data: pedidos, isLoading } = useCollection<Pedido>(pedidosQuery);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab]);

  const handleAddOrder = async (order: Omit<Pedido, 'createdAt'>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", order.id);
    await setDoc(docRef, {
      ...order,
      createdAt: new Date().toISOString()
    });
    toast({
      title: "Registro criado",
      description: `O pedido ${order.id} foi adicionado ao banco de dados.`
    });
  };

  const handleBulkImport = async (bulkOrders: any[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const colRef = collection(firestore, "pedidos");

    bulkOrders.forEach(order => {
      const docId = order.id.toString();
      const newDocRef = doc(colRef, docId);
      batch.set(newDocRef, order);
    });

    await batch.commit();
    toast({
      title: "Importação concluída",
      description: `${bulkOrders.length} registros foram sincronizados com sucesso.`
    });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      const docRef = doc(firestore, "pedidos", id);
      batch.delete(docRef);
    });

    await batch.commit();
    setSelectedIds([]);
    toast({
      variant: "destructive",
      title: "Remoção em lote",
      description: `${selectedIds.length} registros foram excluídos permanentemente.`
    });
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Pedido>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    updateDoc(docRef, updates);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    deleteDoc(docRef);
  };

  const handleAddMovement = async (orderId: string, movements: any[]) => {
    if (!firestore) return;
    const movementsRef = collection(firestore, "pedidos", orderId, "movimentos");

    for (const mov of movements) {
      const newMoveRef = doc(movementsRef);
      setDoc(newMoveRef, {
        id: newMoveRef.id,
        pedidoId: orderId,
        raw: mov.raw,
        hashMovimento: mov.hashMovimento,
        tipo: mov.tipo,
        origem: mov.origem,
        destino: mov.destino,
        quantidade: mov.quantidade,
        duplicado: false,
        validado: true,
        createdAt: new Date().toISOString()
      });
    }
    
    toast({
      title: "Rastreabilidade Atualizada",
      description: `${movements.length} novos movimentos vinculados ao pedido ${orderId}.`
    });
  };

  const handleDeleteMovement = async (orderId: string, moveId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", orderId, "movimentos", moveId);
    deleteDoc(docRef);
  };

  const orders = pedidos || [];
  const filteredOrders = orders.filter(o => o.categoria === activeTab);
  
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <aside className="w-20 bg-white border-r flex flex-col items-center py-8 gap-10 sticky top-0 h-screen">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-emerald-100">
            <span className="text-primary font-black text-xs">BMV</span>
          </div>

          <nav className="flex flex-col gap-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-emerald-50 text-primary shadow-sm border border-emerald-100">
                  <LayoutDashboard className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="font-bold text-xs uppercase tracking-widest">Painel Geral</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl text-slate-400 hover:text-primary hover:bg-emerald-50 transition-all">
                  <ShieldCheck className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="font-bold text-xs uppercase tracking-widest">Auditoria de Selos</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl text-slate-400 hover:text-primary hover:bg-emerald-50 transition-all">
                  <Database className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="font-bold text-xs uppercase tracking-widest">NXT Blockchain</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl text-slate-400 hover:text-primary hover:bg-emerald-50 transition-all">
                  <FileText className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="font-bold text-xs uppercase tracking-widest">Relatórios</p></TooltipContent>
            </Tooltip>
          </nav>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10">
            <div>
              <h1 className="text-xl font-medium text-slate-600">Portal de Auditoria <span className="font-bold text-slate-900">NXT Ledger</span></h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar pedido ou hash..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
              </div>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">AD</div>
            </div>
          </header>

          <div className="p-8 space-y-8 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando com Blockchain...</p>
                </div>
              </div>
            ) : (
              <>
                <AuditOverview orders={orders} />

                <div className="space-y-6">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderCategory)} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                      <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12">
                        <TabsTrigger value="selo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-8 rounded-full text-[10px] font-bold uppercase tracking-tighter">Selo Tesouro Verde</TabsTrigger>
                        <TabsTrigger value="Saas_Tesouro_Verde" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-8 rounded-full text-[10px] font-bold uppercase tracking-tighter">Saas Tesouro Verde</TabsTrigger>
                        <TabsTrigger value="Saas_BMV" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-8 rounded-full text-[10px] font-bold uppercase tracking-tighter">SaaS BMV</TabsTrigger>
                      </TabsList>
                      <div className="flex gap-3">
                         {selectedIds.length > 0 && (
                           <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="gap-2 text-[10px] font-bold uppercase tracking-widest h-12 px-6 rounded-full animate-in fade-in zoom-in">
                             <Trash2 className="w-3.5 h-3.5" /> Remover ({selectedIds.length})
                           </Button>
                         )}
                         <BulkImportDialog onImport={handleBulkImport} category={activeTab} />
                         <AddOrderDialog onAdd={handleAddOrder} />
                         <Button variant="outline" size="sm" className="gap-2 text-[10px] font-bold uppercase tracking-widest border-slate-200 h-12 px-6 rounded-full hover:bg-slate-50">
                           <FileText className="w-3.5 h-3.5" /> Exportar Relatório
                         </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <OrderTable 
                        orders={paginatedOrders} 
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onUpdateOrder={handleUpdateOrder}
                        onDeleteOrder={handleDeleteOrder}
                        onAddMovement={handleAddMovement}
                        onDeleteMovement={handleDeleteMovement}
                      />

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Mostrando {Math.min(filteredOrders.length, itemsPerPage)} de {filteredOrders.length} registros
                          </p>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="w-10 h-10 rounded-xl border-slate-200"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            
                            <div className="flex items-center gap-1 mx-4">
                              <span className="text-[10px] font-black text-primary">{currentPage}</span>
                              <span className="text-[10px] font-bold text-slate-300">/</span>
                              <span className="text-[10px] font-bold text-slate-400">{totalPages}</span>
                            </div>

                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="w-10 h-10 rounded-xl border-slate-200"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Tabs>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
