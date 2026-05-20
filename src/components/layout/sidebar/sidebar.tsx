"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_CONFIG } from "./sidebar-config";
import { SidebarHeader } from "./sidebar-header";
import { SidebarGroup } from "./sidebar-group";
import { SidebarItem } from "./sidebar-item";
import { SidebarFooter } from "./sidebar-footer";

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams?.get("category");
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    akses: false,
    tesouroVerde: false,
    estoque: false,
  });

  // Auto-expand menus based on URL path when navigation occurs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");

    const isAkses = pathname === "/pedidos" && (!cat || cat.startsWith("akses_") || cat === "akses_compra");
    const isTV = pathname === "/pedidos" && (cat?.startsWith("tv_") ?? false);
    const isEstoque = pathname.startsWith("/estoque") || [
      "/safras", "/abastecimento", "/config-distribuicao", "/movimentacoes", 
      "/transf-titularidade", "/ajustes-contas", "/bloqueio-ucs", "/cpr-verde"
    ].includes(pathname);

    setOpenMenus({
      akses: isAkses,
      tesouroVerde: isTV,
      estoque: isEstoque,
    });
  }, [pathname]);

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

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <aside 
      className={cn(
        "bg-white border-r flex flex-col sticky top-0 h-screen lg:h-dvh print:hidden shrink-0 z-30 transition-all duration-300",
        isCollapsed ? "w-20" : "w-[260px]"
      )}
    >
      <SidebarHeader 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
      />

      <nav className="flex-1 overflow-y-auto min-h-0 py-6 px-4 custom-scrollbar space-y-6">
        {SIDEBAR_CONFIG.map((group, gIdx) => (
          <SidebarGroup 
            key={gIdx} 
            label={group.label} 
            isCollapsed={isCollapsed}
          >
            {group.items.map((item, idx) => (
              <SidebarItem 
                key={idx}
                item={item}
                isCollapsed={isCollapsed}
                isLinkActive={isLinkActive}
                isOpen={item.menuKey ? openMenus[item.menuKey] : false}
                toggleOpen={item.menuKey ? () => toggleMenu(item.menuKey!) : undefined}
              />
            ))}
          </SidebarGroup>
        ))}
      </nav>

      <SidebarFooter 
        isCollapsed={isCollapsed} 
        pathname={pathname} 
      />
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={<div className="w-64 bg-slate-50 animate-pulse border-r h-screen lg:h-dvh" />}>
      <SidebarContent />
    </Suspense>
  );
}
