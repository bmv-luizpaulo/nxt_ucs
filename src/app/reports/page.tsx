"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Loader2, 
  ShieldCheck,
  Download,
  History,
  FileSearch,
  Settings
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUser } from "@/firebase";
import { ReportCenter } from "@/components/entities/ReportCenter";
import { Footer } from "@/components/layout/Footer";

export default function ReportsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER CORPORATIVO */}
        <header className="h-24 bg-white px-12 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-[28px] font-black uppercase tracking-tight text-slate-900 leading-none">Centro de Relatórios</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">Emissão de Certificados e Contraprovas Técnicas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
               <div className="px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Sincronismo Ledger OK</span>
               </div>
            </div>
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white font-black text-lg shadow-xl shadow-emerald-100 uppercase">
              {user.email?.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO */}
        <div className="flex-1 p-12 overflow-hidden flex flex-col">
          <ReportCenter />
        </div>

        <Footer />
      </main>
    </div>
  );
}
