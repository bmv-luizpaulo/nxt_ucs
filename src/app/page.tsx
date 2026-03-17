
"use client"

import { useState, useEffect } from "react";
import { MOCK_PEDIDOS, MOCK_MOVIMENTOS } from "@/lib/mock-data";
import { Pedido, Movimento, OrderStatus, OrderCategory } from "@/lib/types";
import { OrderTable } from "@/components/dashboard/OrderTable";
import { AuditOverview } from "@/components/dashboard/AuditOverview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Search, Filter, Plus, FileSpreadsheet, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function AuditDashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<OrderCategory>('selo');
  const { toast } = useToast();

  useEffect(() => {
    const initialized = MOCK_PEDIDOS.map(p => ({
      ...p,
      movimentos: MOCK_MOVIMENTOS.filter(m => m.pedidoId === p.id)
    }));
    setPedidos(initialized);
  }, []);

  const handleToggleAudit = (id: string, audited: boolean) => {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, auditado: audited } : p));
  };

  const handleDeleteOrder = (id: string) => {
    setPedidos(prev => prev.filter(p => p.id !== id));
    toast({ title: "Pedido excluído", description: `O pedido ${id} foi removido do sistema.` });
  };

  const handleAddMovement = (orderId: string, raw: string) => {
    const lines = raw.split('\n').filter(line => line.trim() !== "");
    
    lines.forEach(line => {
      const newHash = `HM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const allMovs = pedidos.flatMap(p => p.movimentos || []);
      const isDuplicate = allMovs.some(m => m.hashMovimento === newHash);

      const newMov: Movimento = {
        id: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        pedidoId: orderId,
        raw: line,
        hashMovimento: newHash,
        tipo: 'cliente',
        origem: 'Importação Manual',
        destino: 'Destinatário Desconhecido',
        quantidade: 1,
        duplicado: isDuplicate,
        validado: !isDuplicate,
        createdAt: new Date().toISOString()
      };

      setPedidos(prev => prev.map(p => {
        if (p.id === orderId) {
          const updatedMovs = [...(p.movimentos || []), newMov];
          let newStatus: OrderStatus = 'ok';
          if (updatedMovs.some(m => m.duplicado)) newStatus = 'erro';
          else if (updatedMovs.length === 0) newStatus = 'pendente';

          return { ...p, movimentos: updatedMovs, status: newStatus };
        }
        return p;
      }));
    });

    toast({ title: "Processamento concluído", description: `${lines.length} registros foram analisados.` });
  };

  const handleDeleteMovement = (orderId: string, moveId: string) => {
    setPedidos(prev => prev.map(p => {
      if (p.id === orderId) {
        const updatedMovs = (p.movimentos || []).filter(m => m.id !== moveId);
        let newStatus: OrderStatus = 'ok';
        if (updatedMovs.some(m => m.duplicado)) newStatus = 'erro';
        else if (updatedMovs.length === 0) newStatus = 'pendente';
        return { ...p, movimentos: updatedMovs, status: newStatus };
      }
      return p;
    }));
    toast({ title: "Movimentação removida" });
  };

  const filteredOrders = pedidos.filter(p => {
    const matchesSearch = p.empresa.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesCategory = p.categoria === activeCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-headline tracking-tighter">LEDGERTRUST <span className="text-primary">AUDITORIA</span></h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                <Layers className="w-3 h-3 text-primary" /> Multi-Chain Traceability System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10 font-bold uppercase text-[10px]">
              <FileSpreadsheet className="w-4 h-4" /> Exportar Relatório
            </Button>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px]">
              <Plus className="w-4 h-4" /> Novo Registro
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        <AuditOverview orders={pedidos.filter(p => p.categoria === activeCategory)} />

        <Tabs defaultValue="selo" className="w-full" onValueChange={(v) => setActiveCategory(v as OrderCategory)}>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 bg-card/40 p-2 rounded-xl border border-border/50">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="selo" className="text-[10px] font-black uppercase px-6">Selo Tesouro Verde</TabsTrigger>
              <TabsTrigger value="certificado_sas" className="text-[10px] font-black uppercase px-6">Certificado SAS</TabsTrigger>
              <TabsTrigger value="sas_dmv" className="text-[10px] font-black uppercase px-6">SAS DMV</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2 w-full md:w-auto px-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9 h-9 bg-background/50 border-border/50 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2 border-border/50 font-bold text-[10px]">
                    <Filter className="w-3.5 h-3.5" /> 
                    {statusFilter === 'all' ? 'STATUS' : statusFilter.toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>Todos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('ok')}>OK</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pendente')}>Pendente</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('erro')}>Erro</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <TabsContent value={activeCategory} className="mt-0">
            <OrderTable 
              orders={filteredOrders} 
              onToggleAudit={handleToggleAudit}
              onDeleteOrder={handleDeleteOrder}
              onAddMovement={handleAddMovement}
              onDeleteMovement={handleDeleteMovement}
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-dashed border-primary/20">
          <div className="space-y-1">
            <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-tight">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Camada de Validação de Integridade
            </h3>
            <p className="text-[10px] text-muted-foreground max-w-2xl font-medium">
              Dados auditados localmente antes da submissão para a parachain. O sistema identifica automaticamente colisões de hash e duplicidade de UCS.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
             <div className="text-right">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Sincronização</p>
                <p className="text-[10px] font-black text-emerald-500 uppercase">Rede Polkadot Online</p>
             </div>
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
