"use client"

import { 
  Settings, 
  LogOut,
  LayoutGrid,
  Calendar,
  MapPin,
  Users2,
  Cpu,
  Wallet,
  Leaf,
  ChevronLeft,
  ChevronRight
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
      items: [
        { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
        { icon: Wallet, label: "Produtores", href: "/produtores" },
        { icon: MapPin, label: "Núcleos", href: "/nucleos" },
        { icon: MapPin, label: "Fazendas", href: "/fazendas" },
        { icon: Users2, label: "Associações", href: "/associacoes" },
        { icon: Cpu, label: "IMEI", href: "/imeis" },
        { icon: Calendar, label: "Safras", href: "/safras" },
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
      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link key={item.label} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer font-bold",
                    isActive 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5 shrink-0 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"
                    )} />
                    {!isCollapsed && (
                      <span className="text-[13px] truncate">{item.label}</span>
                    )}
                  </div>
                </Link>
              );
            })}
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
