import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  isCollapsed: boolean;
  pathname: string;
}

export function SidebarFooter({ isCollapsed, pathname }: SidebarFooterProps) {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: "Sessão encerrada", description: "Até logo, staff." });
      router.push("/");
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao sair" });
    }
  };

  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <div className="p-4 border-t border-slate-50 space-y-2">
      <Link 
        href="/settings"
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-bold",
          isSettingsActive 
            ? "bg-slate-100 text-slate-900" 
            : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Settings className="w-5 h-5 shrink-0" />
        {!isCollapsed && <span className="text-[13px]">Configurações</span>}
      </Link>
      <button 
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 font-bold"
        aria-label="Sair do sistema"
      >
        <LogOut className="w-5 h-5 shrink-0" />
        {!isCollapsed && <span className="text-[13px]">Sair do Sistema</span>}
      </button>
    </div>
  );
}
