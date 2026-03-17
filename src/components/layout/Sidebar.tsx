"use client"

import { 
  LayoutDashboard, 
  ShieldCheck, 
  Database, 
  FileText,
  Settings, 
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { 
      icon: LayoutDashboard, 
      label: "Pedidos", 
      href: "/", 
      tooltip: "Pedidos de Crédito" 
    },
    { 
      icon: ShieldCheck, 
      label: "Produtores", 
      href: "/produtores", 
      tooltip: "Saldos: Produtores" 
    },
    { 
      icon: Database, 
      label: "Associações", 
      href: "/associacoes", 
      tooltip: "Saldos: Associações" 
    },
    { 
      icon: FileText, 
      label: "Relatórios", 
      href: "#", 
      tooltip: "Relatórios Consolidados" 
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="w-24 bg-white border-r flex flex-col items-center py-10 sticky top-0 h-screen print:hidden shrink-0 z-20">
        {/* Logo BMV Style */}
        <Link href="/">
          <div className="w-14 h-14 bg-[#E6F9F3] rounded-[1.25rem] flex items-center justify-center mb-12 cursor-pointer transition-transform hover:scale-105 active:scale-95 group">
            <span className="text-primary font-black text-xs tracking-tighter">BMV</span>
          </div>
        </Link>

        {/* Navigation Section */}
        <nav className="flex flex-col gap-8 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "w-14 h-14 rounded-2xl transition-all duration-300",
                        isActive 
                          ? "bg-[#E6F9F3] text-primary shadow-sm" 
                          : "text-slate-300 hover:text-primary hover:bg-slate-50"
                      )}
                    >
                      <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 border-none text-white font-bold text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg">
                  <p>{item.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="flex flex-col gap-4 mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-14 h-14 rounded-2xl text-slate-200 hover:text-slate-400">
                <Settings className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-900 text-white font-bold text-[10px] uppercase">Configurações</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-14 h-14 rounded-2xl text-slate-200 hover:text-rose-500">
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-rose-600 text-white font-bold text-[10px] uppercase">Sair</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
