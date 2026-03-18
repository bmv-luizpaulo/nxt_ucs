
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2
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
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<OrderCategory>("selo");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);
  
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

    toast({ title: "Registro criado", description: `O pedido ${order.id} foi adicionado.` });
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
    toast({ title: "Importação concluída", description: `${bulkOrders.length} registros sincronizados.` });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "pedidos", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: "Remoção concluída" });
  };

  const handleUpdateOrder = (id: string, updates: Partial<Pedido>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", id);
    updateDoc(docRef, updates);
    toast({ title: "Dados atualizados" });
  };

  const handleDeleteOrder = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "pedidos", id));
    toast({ variant: "destructive", title: "Pedido removido" });
  };

  const handleAddMovement = (orderId: string, movements: any[]) => {
    if (!firestore) return;
    const movementsRef = collection(firestore, "pedidos", orderId, "movimentos");
    movements.forEach(mov => {
      const newMoveRef = doc(movementsRef);
      setDoc(newMoveRef, {
        ...mov,
        id: newMoveRef.id,
        pedidoId: orderId,
        duplicado: false,
        validado: true,
        createdAt: new Date().toISOString()
      });
    });
    toast({ title: "Rastreabilidade Gravada" });
  };

  const handleDeleteMovement = (orderId: string, moveId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "pedidos", orderId, "movimentos", moveId));
  };

  const orders = pedidos || [];
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <h1 className="text-xl font-medium text-slate-600">Portal de Auditoria <span className="font-bold text-slate-900">Sistema Legado</span></h1>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar pedido ou hash..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">{user.email?.substring(0,2)}</div>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <AuditOverview orders={orders} />
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderCategory)} className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12">
                    <TabsTrigger value="selo" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Selo Tesouro Verde</TabsTrigger>
                    <TabsTrigger value="Saas_Tesouro_Verde" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Saas Tesouro Verde</TabsTrigger>
                    <TabsTrigger value="Saas_BMV" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">SaaS BMV</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-3">
                     {selectedIds.length > 0 && (
                       <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest">
                         <Trash2 className="w-3.5 h-3.5 mr-2" /> Remover ({selectedIds.length})
                       </Button>
                     )}
                     <BulkImportDialog onImport={handleBulkImport} category={activeTab} />
                     <AddOrderDialog onAdd={handleAddOrder} />
                  </div>
                </div>

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
                  <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl"><ChevronLeft className="w-4 h-4"/></Button>
                      <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl"><ChevronRight className="w-4 h-4"/></Button>
                    </div>
                  </div>
                )}
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
