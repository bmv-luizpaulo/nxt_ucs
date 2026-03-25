"use client"

import { 
  ShieldCheck, 
  Database, 
  Settings, 
  LogOut,
  LayoutGrid,
  Calendar,
  MapPin,
  Users2,
  Cpu,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: "Sessão encerrada", description: "Até logo, auditor." });
      router.push("/");
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao sair" });
    }
  };

  const navItems = [
    { 
      icon: LayoutGrid, 
      label: "PEDIDOS DE CRÉDITO", 
      href: "/dashboard", 
      tooltip: "Selos & Certificados",
      color: "primary"
    },
    { 
      icon: Calendar, 
      label: "SAFRAS", 
      href: "/safras", 
      tooltip: "Portal de Safras",
      color: "primary"
    },
    { 
      icon: MapPin, 
      label: "FAZENDAS", 
      href: "/fazendas", 
      tooltip: "Propriedades Rurais",
      color: "teal"
    },
    { 
      icon: ShieldCheck, 
      label: "PRODUTORES", 
      href: "/produtores", 
      tooltip: "Cadastro de Produtores",
      color: "primary"
    },
    { 
      icon: Users2, 
      label: "NÚCLEOS / ASSOCIAÇÕES", 
      href: "/nucleos", 
      tooltip: "Visão por Núcleo e Associação",
      color: "amber"
    },
    { 
      icon: Cpu, 
      label: "IMEIS (ADMINISTRADORA)", 
      href: "/imeis", 
      tooltip: "Particionamento IMEI",
      color: "violet"
    },
    { 
      icon: FileText, 
      label: "RELATÓRIOS", 
      href: "/reports", 
      tooltip: "Audit Report Center",
      color: "emerald"
    },
  ];

  const getActiveColors = (color: string) => {
    switch(color) {
      case 'teal': return "bg-teal-500 text-white shadow-xl shadow-teal-200/50";
      case 'amber': return "bg-amber-500 text-white shadow-xl shadow-amber-200/50";
      case 'violet': return "bg-violet-500 text-white shadow-xl shadow-violet-200/50";
      case 'emerald': return "bg-emerald-600 text-white shadow-xl shadow-emerald-200/50";
      default: return "bg-primary text-white shadow-xl shadow-primary/30";
    }
  };

  const getHoverColors = (color: string) => {
    switch(color) {
      case 'teal': return "hover:text-teal-500 hover:bg-teal-50";
      case 'amber': return "hover:text-amber-500 hover:bg-amber-50";
      case 'violet': return "hover:text-violet-500 hover:bg-violet-50";
      case 'emerald': return "hover:text-emerald-600 hover:bg-emerald-50";
      default: return "hover:text-primary hover:bg-emerald-50";
    }
  };

  return (
    <aside className="w-24 bg-white border-r flex flex-col items-center py-10 sticky top-0 h-screen print:hidden shrink-0 z-20">
      {/* Logo BMV Style */}
      <Link href="/dashboard">
        <div className="w-14 h-14 bg-[#E6F9F3] rounded-[1.25rem] flex items-center justify-center mb-12 cursor-pointer transition-transform hover:scale-105 active:scale-95 group">
          <span className="text-primary font-black text-xs tracking-tighter">BMV</span>
        </div>
      </Link>

      {/* Navigation Section */}
      <nav className="flex flex-col gap-6 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          const Icon = item.icon;

          return (
            <div key={item.label} className="relative group flex items-center justify-center">
              <Link href={item.href}>
                <div 
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                    isActive 
                      ? getActiveColors(item.color) 
                      : `bg-slate-50 text-slate-300 ${getHoverColors(item.color)}`
                  )}
                >
                  <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                </div>
              </Link>

              {/* Pill Label Style */}
              <div className="absolute left-20 px-6 py-2.5 rounded-full bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 translate-x-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 z-50 pointer-events-none border border-slate-800 shadow-xl">
                {item.label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <Link href="/settings">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer",
            pathname === "/settings" 
              ? "bg-accent text-white shadow-xl shadow-accent/30" 
              : "bg-slate-50 text-slate-300 hover:text-accent hover:bg-blue-50"
          )}>
            <Settings className="w-5 h-5" />
          </div>
        </Link>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLogout}
          className="w-14 h-14 rounded-2xl text-slate-200 hover:text-rose-500"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </aside>
  );
}
