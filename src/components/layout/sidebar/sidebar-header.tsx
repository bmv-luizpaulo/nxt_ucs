import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function SidebarHeader({ isCollapsed, setIsCollapsed }: SidebarHeaderProps) {
  return (
    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50">
      {!isCollapsed ? (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-slate-900 tracking-tighter">bmv</span>
        </div>
      ) : (
        <span className="text-xl font-black text-slate-900 mx-auto">b</span>
      )}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400"
        aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {isCollapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
      </button>
    </div>
  );
}
