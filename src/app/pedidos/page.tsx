"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Database,
  ShoppingBag
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
import { Sidebar } from "@/components/layout/Sidebar";

export default function PedidosPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState<OrderCategory>("selo");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

  const handleSeedData = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const sampleData = [
      { id: "P-001", data: new Date().toISOString(), empresa: "VALE S.A.", cnpj: "33.592.510/0001-54", programa: "Amazonia Verde", uf: "PA", do: true, quantidade: 5000, taxa: 15.5, valorTotal: 77500, status: "ok", categoria: "selo", auditado: true, hashPedido: "0x88...f32", linkNxt: "https://explorer.nxt.org", createdAt: new Date().toISOString() },
      { id: "P-002", data: new Date().toISOString(), empresa: "NATURA & CO", cnpj: "71.673.990/0001-77", programa: "Reserva Juma", uf: "AM", do: true, quantidade: 2500, taxa: 12.0, valorTotal: 30000, status: "pendente", categoria: "selo", auditado: false, hashPedido: "", linkNxt: "", createdAt: new Date().toISOString() }
    ];

    sampleData.forEach(item => {
      batch.set(doc(firestore, "pedidos", item.id), item);
    });

    await batch.commit();
    toast({ title: "Dados de Exemplo Gerados" });
  };

  const handleAddOrder = (order: Omit<Pedido, 'createdAt'>) => {
    if (!firestore) return;
    const docRef = doc(firestore, "pedidos", order.id);
    setDoc(docRef, { ...order, createdAt: new Date().toISOString() });
    toast({ title: "Registro criado" });
  };

  const handleBulkImport = async (bulkOrders: any[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    bulkOrders.forEach(order => batch.set(doc(firestore, "pedidos", order.id.toString()), order));
    await batch.commit();
    toast({ title: "Importação concluída" });
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
    updateDoc(doc(firestore, "pedidos", id), updates);
    toast({ title: "Dados atualizados" });
  };

  const handleDeleteOrder = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "pedidos", id));
    toast({ variant: "destructive", title: "Pedido removido" });
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
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" />
             </div>
             <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">Gestão de Pedidos</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar pedido..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
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
              <div className="flex justify-between items-center">
                <AuditOverview orders={orders} />
                {orders.length === 0 && (
                  <Button onClick={handleSeedData} variant="outline" className="h-20 border-dashed border-primary/40 rounded-3xl px-10 gap-3 group hover:bg-primary/5">
                    <Database className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Gerar Dados de Teste</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Popular banco de dados agora</p>
                    </div>
                  </Button>
                )}
              </div>

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
                  onAddMovement={() => {}}
                  onDeleteMovement={() => {}}
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 mt-6 shadow-sm">
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
