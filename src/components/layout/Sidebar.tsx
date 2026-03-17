
"use client"

import { 
  ShieldCheck, 
  Database, 
  Settings, 
  LogOut,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { 
      icon: LayoutGrid, 
      label: "Pedidos de Crédito", 
      href: "/", 
      tooltip: "Selos & Certificados" 
    },
    { 
      icon: ShieldCheck, 
      label: "Produtores", 
      href: "/produtores", 
      tooltip: "Auditoria de Produtores" 
    },
    { 
      icon: Database, 
      label: "Associações", 
      href: "/associacoes", 
      tooltip: "Auditoria de Associações" 
    },
  ];

  return (
    <aside className="w-24 bg-white border-r flex flex-col items-center py-10 sticky top-0 h-screen print:hidden shrink-0 z-20">
      {/* Logo BMV Style */}
      <Link href="/">
        <div className="w-14 h-14 bg-[#E6F9F3] rounded-[1.25rem] flex items-center justify-center mb-12 cursor-pointer transition-transform hover:scale-105 active:scale-95 group">
          <span className="text-primary font-black text-xs tracking-tighter">BMV</span>
        </div>
      </Link>

      {/* Navigation Section */}
      <nav className="flex flex-col gap-10 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <div key={item.label} className="relative group flex items-center justify-center">
              <Link href={item.href}>
                <div 
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm",
                    isActive 
                      ? "bg-primary text-white shadow-primary/20" 
                      : "bg-slate-50 text-slate-300 hover:text-primary hover:bg-emerald-50"
                  )}
                >
                  <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                </div>
              </Link>

              {/* Pill Label Style from Image */}
              <div className={cn(
                "absolute left-20 px-6 py-2.5 rounded-full bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 z-50 pointer-events-none border border-slate-800",
                isActive 
                  ? "opacity-100 translate-x-2" 
                  : "opacity-0 translate-x-0 group-hover:opacity-100 group-hover:translate-x-2"
              )}>
                {item.label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <Button variant="ghost" size="icon" className="w-14 h-14 rounded-2xl text-slate-200 hover:text-slate-400">
          <Settings className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" className="w-14 h-14 rounded-2xl text-slate-200 hover:text-rose-500">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </aside>
  );
}
