"use client"

import { 
  Settings, 
  LogOut,
  LayoutGrid,
  Calendar,
  History,
  MapPin,
  Users2,
  Cpu,
  Wallet,
  Leaf,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  LayoutTemplate,
  Tractor,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: "Sessão encerrada", description: "Até logo, auditor." });
      router.push("/");
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao sair" });
    }
  };

  const menuGroups = [
    {
      label: "Visão Geral",
      items: [
        { icon: LayoutGrid, label: "Dashboard", href: "/dashboard", color: "text-emerald-500 group-hover:text-emerald-600" },
        { icon: LayoutTemplate, label: "Fluxos", href: "/fluxos", color: "text-violet-500 group-hover:text-violet-600" },
      ]
    },
    {
      label: "Gestão Comercial",
      items: [
        { icon: ShoppingBag, label: "Pedidos", href: "/pedidos", color: "text-amber-500 group-hover:text-amber-600" },
        { icon: Leaf, label: "Clientes", href: "/clientes", color: "text-lime-600 group-hover:text-lime-700" },
        { icon: Building2, label: "Parceiros", href: "/parceiros", color: "text-blue-500 group-hover:text-blue-600" },
      ]
    },
    {
      label: "Operações Agro",
      items: [
        { icon: Users2, label: "Produtores", href: "/produtores", color: "text-orange-500 group-hover:text-orange-600" },
        { icon: Network, label: "Núcleos & Associações", href: "/nucleos", color: "text-rose-500 group-hover:text-rose-600" },
        { icon: Tractor, label: "Fazendas", href: "/fazendas", color: "text-amber-700 group-hover:text-amber-800" },
        { icon: Calendar, label: "Safras", href: "/safras", color: "text-yellow-600 group-hover:text-yellow-700" },
      ]
    },
    {
      label: "Tecnologia",
      items: [
        { icon: History, label: "Rastreabilidade", href: "/rastreabilidade", color: "text-indigo-500 group-hover:text-indigo-600" },
        { icon: Cpu, label: "IMEI", href: "/imei", color: "text-cyan-500 group-hover:text-cyan-600" },
      ]
    }
  ];

  return (
    <aside className={cn(
      "bg-white border-r flex flex-col sticky top-0 h-screen print:hidden shrink-0 z-30 transition-all duration-300",
      isCollapsed ? "w-20" : "w-[260px]"
    )}>
      {/* Header with Logo */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tighter">bmv</span>
          </div>
        )}
        {isCollapsed && (
          <span className="text-xl font-black text-slate-900 mx-auto">b</span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar space-y-6">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            {!isCollapsed && group.label && (
              <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link key={item.label} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer font-bold",
                      isActive 
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5 shrink-0 transition-colors",
                        isActive ? "text-white" : item.color
                      )} />
                      {!isCollapsed && (
                        <span className="text-[13px] truncate">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-50 space-y-2">
        <Link href="/settings">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer font-bold",
            pathname === "/settings" 
              ? "bg-slate-100 text-slate-900" 
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
          )}>
            <Settings className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-[13px]">Configurações</span>}
          </div>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 font-bold"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-[13px]">Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
}
