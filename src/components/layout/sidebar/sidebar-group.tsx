import * as React from "react";

interface SidebarGroupProps {
  label: string;
  isCollapsed: boolean;
  children: React.ReactNode;
}

export function SidebarGroup({ label, isCollapsed, children }: SidebarGroupProps) {
  return (
    <div className="space-y-2">
      {!isCollapsed && label && (
        <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
