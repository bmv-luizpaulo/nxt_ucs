import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MenuItem } from "./sidebar-config";

interface SidebarItemProps {
  item: MenuItem;
  isCollapsed: boolean;
  isLinkActive: (href: string) => boolean;
  isOpen?: boolean;
  toggleOpen?: () => void;
}

export function SidebarItem({ item, isCollapsed, isLinkActive, isOpen, toggleOpen }: SidebarItemProps) {
  const Icon = item.icon;

  if (item.isCollapsible) {
    const isAnySubActive = item.subItems?.some(sub => isLinkActive(sub.href)) ?? false;
    
    return (
      <div className="space-y-1">
        <button 
          onClick={toggleOpen}
          aria-expanded={isOpen}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#734DCC]/20",
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
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen ? "transform rotate-180" : "")} />
          )}
        </button>

        {!isCollapsed && isOpen && item.subItems && (
          <div className="pl-6 space-y-1 border-l border-slate-100 ml-6 mt-1">
            {item.subItems.map((sub, sIdx) => {
              const isSubActive = isLinkActive(sub.href);
              return (
                <Link 
                  key={sIdx} 
                  href={sub.href}
                  className={cn(
                    "flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150",
                    isSubActive 
                      ? "bg-indigo-50 text-indigo-700 font-bold" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
                  )}
                >
                  <span className="opacity-50">—</span>
                  <span>{sub.label}</span>
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
    <Link 
      href={item.href || '#'}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-bold",
        isActive 
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className={cn(
        "w-5 h-5 shrink-0 transition-colors",
        isActive ? "text-white" : item.color
      )} />
      {!isCollapsed && (
        <span className="text-[13px] truncate">
          {item.label}
        </span>
      )}
    </Link>
  );
}
