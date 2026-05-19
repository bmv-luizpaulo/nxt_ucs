"use client"

import { 
  Settings, 
  LogOut,
  LayoutGrid,
  History,
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
  Network,
  Archive,
  ChevronDown,
  FileText
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams?.get("category") || "akses_compra";
  const auth = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAksesOpen, setIsAksesOpen] = useState(true);
  const [isTesouroVerdeOpen, setIsTesouroVerdeOpen] = useState(false);
  const [isEstoqueOpen, setIsEstoqueOpen] = useState(false);

  // Auto-expand menus based on current URL path and category query param
  useEffect(() => {
    if (pathname === "/pedidos") {
      if (currentCategory.startsWith("akses_") || currentCategory === "akses_compra") {
        setIsAksesOpen(true);
      } else if (currentCategory.startsWith("tv_")) {
        setIsTesouroVerdeOpen(true);
      }
    } else if (
      pathname.startsWith("/estoque") || 
      pathname === "/safras" || 
      pathname === "/abastecimento" || 
      pathname === "/config-distribuicao" || 
      pathname === "/movimentacoes" || 
      pathname === "/transf-titularidade" || 
      pathname === "/ajustes-contas" || 
      pathname === "/bloqueio-ucs" ||
      pathname === "/cpr-verde"
    ) {
      setIsEstoqueOpen(true);
    }
  }, [pathname, currentCategory]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: "Sessão encerrada", description: "Até logo, auditor." });
      router.push("/");
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao sair" });
    }
  };

  const isLinkActive = (href: string) => {
    if (!href) return false;
    const [path, query] = href.split("?");
    const pathMatches = pathname === path;
    if (!pathMatches) return false;
    
    if (query) {
      const hrefParams = new URLSearchParams(query);
      const categoryParam = hrefParams.get("category");
      if (categoryParam) {
        return currentCategory === categoryParam;
      }
    } else {
      if (path === "/pedidos") {
        return !currentCategory || currentCategory === "akses_compra";
      }
    }
    return true;
  };

  interface MenuSubItem {
    label: string;
    href: string;
  }

  interface MenuItem {
    icon: any;
    label: string;
    href?: string;
    color: string;
    isCollapsible?: boolean;
    isOpen?: boolean;
    setOpen?: (open: boolean) => void;
    subItems?: MenuSubItem[];
  }

  interface MenuGroup {
    label: string;
    items: MenuItem[];
  }

  const menuGroups: MenuGroup[] = [
    {
      label: "Visão Geral",
      items: [
        { icon: LayoutGrid, label: "Dashboard", href: "/dashboard", color: "text-emerald-500 group-hover:text-emerald-600" },
        { icon: LayoutTemplate, label: "Fluxos", href: "/fluxos", color: "text-violet-500 group-hover:text-violet-600" },
      ]
    },
    {
      label: "Plataformas",
      items: [
        {
          icon: Cpu,
          label: "Akses",
          color: "text-blue-500 group-hover:text-blue-600",
          isCollapsible: true,
          isOpen: isAksesOpen,
          setOpen: setIsAksesOpen,
          subItems: [
            { label: "Pedidos Compra", href: "/pedidos?category=akses_compra" },
            { label: "Pedidos de Venda", href: "/pedidos?category=akses_venda" },
            { label: "Pedidos de Transferência", href: "/pedidos?category=akses_transferencia" },
            { label: "Pedidos de Certificado (Cli.)", href: "/pedidos?category=akses_cert_cliente" },
            { label: "Cert. Dist. Financeira", href: "/pedidos?category=akses_cert_distribuidor_financeiro" },
            { label: "Cert. Dist. Geral", href: "/pedidos?category=akses_cert_distribuidor_geral" },
            { label: "Cert. SaaS Tesouro Verde", href: "/pedidos?category=akses_cert_distribuidor_credenciado" },
            { label: "Cert. SaaS BMV (Living Carbon)", href: "/pedidos?category=akses_living_carbon" },
            { label: "Cert. CDE (Stock)", href: "/pedidos?category=akses_cde" },
            { label: "Intenção de Movimentação", href: "/pedidos?category=akses_intencao_movimentacao" },
          ]
        },
        {
          icon: Leaf,
          label: "Tesouro Verde",
          color: "text-emerald-500 group-hover:text-emerald-600",
          isCollapsible: true,
          isOpen: isTesouroVerdeOpen,
          setOpen: setIsTesouroVerdeOpen,
          subItems: [
            { label: "Pedidos Selo", href: "/pedidos?category=tv_pedidos_selo" },
            { label: "DARE / Royalties", href: "/pedidos?category=tv_dare_royalties" },
            { label: "Compensações", href: "/pedidos?category=tv_compensacao" },
            { label: "Programas / Campanhas", href: "/pedidos?category=tv_programas" },
          ]
        }
      ]
    },
    {
      label: "Gestão",
      items: [
        {
          icon: Archive,
          label: "Estoque",
          color: "text-indigo-500 group-hover:text-indigo-600",
          isCollapsible: true,
          isOpen: isEstoqueOpen,
          setOpen: setIsEstoqueOpen,
          subItems: [
            { label: "Dashboard", href: "/estoque/dashboard" },
            { label: "Safra", href: "/safras" },
            { label: "Abastecimento", href: "/abastecimento" },
            { label: "Config. Distribuição", href: "/config-distribuicao" },
            { label: "Movimentações", href: "/movimentacoes" },
            { label: "Transf. de Titularidade", href: "/transf-titularidade" },
            { label: "Ajustes entre Contas", href: "/ajustes-contas" },
            { label: "Bloqueio de UCS", href: "/bloqueio-ucs" },
            { label: "CPR Verde", href: "/cpr-verde" },
          ]
        },
        { icon: Wallet, label: "DARE / Royalties", href: "/dare-royalties", color: "text-emerald-500 group-hover:text-emerald-600" },
        { icon: Building2, label: "Clientes / Parceiros", href: "/parceiros", color: "text-blue-500 group-hover:text-blue-600" },
      ]
    },
    {
      label: "Operações Agro",
      items: [
        { icon: Users2, label: "Produtores", href: "/produtores", color: "text-orange-500 group-hover:text-orange-600" },
        { icon: Network, label: "Núcleos & Associações", href: "/nucleos", color: "text-rose-500 group-hover:text-rose-600" },
        { icon: Tractor, label: "Fazendas", href: "/fazendas", color: "text-amber-700 group-hover:text-amber-800" },
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
              {group.items.map((item, idx) => {
                const Icon = item.icon;

                if (item.isCollapsible) {
                  const isAnySubActive = item.subItems?.some(sub => isLinkActive(sub.href)) ?? false;
                  return (
                    <div key={idx} className="space-y-1">
                      <div 
                        onClick={() => item.setOpen?.(!item.isOpen)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          isAnySubActive && "bg-slate-50/80 text-slate-900 font-extrabold"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("w-5 h-5 shrink-0 transition-colors", item.color)} />
                          {!isCollapsed && (
                            <span className="text-[13px] truncate">
                              {item.label}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", item.isOpen ? "transform rotate-180" : "")} />
                        )}
                      </div>

                      {!isCollapsed && item.isOpen && item.subItems && (
                        <div className="pl-6 space-y-1 border-l border-slate-100 ml-6 mt-1">
                          {item.subItems.map((sub, sIdx) => {
                            const isSubActive = isLinkActive(sub.href);
                            return (
                              <Link key={sIdx} href={sub.href}>
                                <div className={cn(
                                  "flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
                                  isSubActive 
                                    ? "bg-indigo-50 text-indigo-700 font-bold" 
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
                                )}>
                                  <span className="opacity-50">—</span>
                                  <span>{sub.label}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = item.href && isLinkActive(item.href);
                return (
                  <Link key={item.label} href={item.href || '#'}>
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
