"use client"

import { useState, useEffect } from "react";
import { 
  Search, 
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderTable } from "@/components/dashboard/OrderTable";
import { AuditOverview } from "@/components/dashboard/AuditOverview";
import { AddOrderDialog } from "@/components/dashboard/AddOrderDialog";
import { BulkImportDialog } from "@/components/dashboard/BulkImportDialog";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, setDoc, writeBatch, query, orderBy, where } from "firebase/firestore";
import { Pedido, OrderCategory } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Sidebar } from "@/components/layout/Sidebar";

export default function Dashboard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<OrderCategory>("selo");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const pedidosQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "pedidos"), 
      where("categoria", "==", activeTab),
      orderBy("data", "desc")
    );
  }, [firestore, user, activeTab]);

  const { data: pedidos, isLoading } = useCollection<Pedido>(pedidosQuery);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab]);

  const handleAddOrder = (order: Omit<Pedido, 'createdAt'>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", order.id);
    const data = {
      ...order,
      createdAt: new Date().toISOString()
    };

    setDoc(docRef, data).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });

    toast({
      title: "Registro criado",
      description: `O pedido ${order.id} foi adicionado com sucesso.`
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

  const handleUpdateOrder = (id: string, updates: Partial<Pedido>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    
    updateDoc(docRef, updates).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updates
      }));
    });

    toast({
      title: "Dados atualizados",
      description: `As informações do pedido ${id} foram salvas.`
    });
  };

  const handleDeleteOrder = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    
    deleteDoc(docRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }));
    });

    toast({
      variant: "destructive",
      title: "Pedido removido",
      description: `O registro ${id} foi excluído do banco de dados.`
    });
  };

  const handleAddMovement = (orderId: string, movements: any[]) => {
    if (!firestore) return;
    const movementsRef = collection(firestore, "pedidos", orderId, "movimentos");

    for (const mov of movements) {
      const newMoveRef = doc(movementsRef);
      const data = {
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
      };

      setDoc(newMoveRef, data).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newMoveRef.path,
          operation: 'create',
          requestResourceData: data
        }));
      });
    }
    
    toast({
      title: "Rastreabilidade Gravada",
      description: `${movements.length} movimentos vinculados ao pedido ${orderId}.`
    });
  };

  const handleDeleteMovement = (orderId: string, moveId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", orderId, "movimentos", moveId);
    deleteDoc(docRef);
  };

  // O filtro agora é feito no servidor pelo queryPedidos
  const orders = pedidos || [];
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 print:hidden">
          <div>
            <h1 className="text-xl font-medium text-slate-600">Portal de Auditoria <span className="font-bold text-slate-900">Sistema Legado</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar pedido ou hash..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">AD</div>
          </div>
        </header>

        <div className="p-8 space-y-8 overflow-y-auto print:p-0 print:overflow-visible">
          {isLoading || !user ? (
            <div className="flex items-center justify-center h-64 print:hidden">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando com Banco de Dados...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="print:hidden">
                <AuditOverview orders={orders} />
              </div>

              <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderCategory)} className="w-full">
                  <div className="flex items-center justify-between mb-6 print:hidden">
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
                      <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 shadow-sm print:hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Mostrando {paginatedOrders.length} de {orders.length} registros
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
  );
}