"use client"

import { ShieldCheck, Globe, HelpCircle } from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="h-16 px-8 flex items-center justify-between border-t border-slate-200 bg-white/50 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          {/* Logo can be added here if needed, keeping it subtle */}
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">© 2026 GRUPO BMV · LEDGERTRUST TECHNOLOGY</span>
        </div>
        <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />
        <div className="hidden md:flex gap-6">
          <a href="#" className="text-[9px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Privacidade</a>
          <a href="#" className="text-[9px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Termos de Uso</a>
          <a href="#" className="text-[9px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Suporte Técnico</a>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
           <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
           <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none">Security Validated</span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
           <HelpCircle className="w-4 h-4 cursor-pointer hover:text-primary transition-colors" />
           <Globe className="w-4 h-4 cursor-pointer hover:text-primary transition-colors" />
        </div>
      </div>
    </footer>
  );
}
