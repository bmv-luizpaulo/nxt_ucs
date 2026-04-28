"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutGrid,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  ArrowUpRight,
  Loader2,
  Calendar,
  Building2,
  TableProperties
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy } from "firebase/firestore";
import { Pedido, EntidadeSaldo } from "@/lib/types";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // Queries para o Dashboard
  const recentOrdersQuery = useMemoFirebase(() => {
    return firestore ? query(collection(firestore, "pedidos"), orderBy("createdAt", "desc"), limit(5)) : null;
  }, [firestore]);
  const { data: recentOrders, isLoading: loadingOrders } = useCollection<Pedido>(recentOrdersQuery as any);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

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
             <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-emerald-600" />
             </div>
             <h1 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900">Dashboard Executivo</h1>
          </div>
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">{user.email?.substring(0,2)}</div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard 
              label="UCS Originadas" 
              value="4.8M" 
              change="+12% vs last month" 
              icon={Zap} 
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatCard 
              label="Pedidos Auditados" 
              value="1.242" 
              change="+5.2%" 
              icon={ShieldCheck} 
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <StatCard 
              label="Fazendas Ativas" 
              value="41" 
              change="Total monitorado" 
              icon={Building2} 
              color="text-rose-600"
              bg="bg-rose-50"
            />
            <StatCard 
              label="Dossiers Emitidos" 
              value="892" 
              change="+18% este ano" 
              icon={TrendingUp} 
              color="text-amber-600"
              bg="bg-amber-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LADO ESQUERDO: ATIVIDADE RECENTE */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                       <Clock className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Atividade de Pedidos</h2>
                  </div>
                  <Link href="/pedidos">
                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 px-4 rounded-full gap-2">
                       Ver Todos <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {loadingOrders ? (
                    <div className="h-32 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-200" /></div>
                  ) : (
                    recentOrders?.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", order.status === 'ok' ? 'bg-emerald-100' : 'bg-amber-100')}>
                             <TableProperties className={cn("w-5 h-5", order.status === 'ok' ? 'text-emerald-600' : 'text-amber-600')} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-wide truncate w-48">{order.empresa}</p>
                            <p className="text-[10px] font-bold text-slate-400">ID: {order.id} • {new Date(order.data).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-slate-900">{order.quantidade.toLocaleString('pt-BR')} UCS</p>
                           <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">R$ {order.valorTotal.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* LADO DIREITO: ATALHOS E STATUS */}
            <div className="space-y-6">
               <div className="bg-[#0B0F1A] rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                  <Zap className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500/10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Ações Rápidas</p>
                  <h3 className="text-xl font-black mb-6 leading-tight">Gestão de Auditoria Técnica</h3>
                  
                  <div className="space-y-3">
                    <Link href="/safras" className="block">
                      <Button className="w-full justify-between bg-white/5 hover:bg-white/10 border-white/5 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4">
                        Consultar Safras <Calendar className="w-4 h-4 text-emerald-400" />
                      </Button>
                    </Link>
                    <Link href="/fazendas" className="block">
                      <Button className="w-full justify-between bg-white/5 hover:bg-white/10 border-white/5 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4">
                        Mapa de Fazendas <MapPin className="w-4 h-4 text-emerald-400" />
                      </Button>
                    </Link>
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Estado da Rede</p>
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Sincronizado</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, change, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between h-[160px] relative overflow-hidden group hover:border-emerald-200 transition-colors">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", bg)}>
        <Icon className={cn("w-6 h-6", color)} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      </div>
      <div className="absolute top-6 right-6 text-right">
        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">{change}</p>
      </div>
    </div>
  );
}

// Helper to use 'cn'
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

import { MapPin } from "lucide-react";