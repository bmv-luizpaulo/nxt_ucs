"use client"

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  MapPin, Building2, Users, MoveUpRight,
  ShieldAlert, CheckCircle2
} from "lucide-react";
import { Fazenda } from "@/lib/types";
import { useRouter } from "next/navigation";

// --- HEADER ---
export function PropertyHeader({ fazenda }: { fazenda: Fazenda }) {
  return (
    <div className="bg-[#080C11] p-10 shrink-0 relative overflow-hidden group border-b border-white/5">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              ID: {fazenda.idf}
            </Badge>
            {fazenda.status === 'ativa' ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest flex gap-2 items-center">
                <CheckCircle2 className="w-3 h-3" /> FAZENDA CERTIFICADA
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-500 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest flex gap-2 items-center">
                <ShieldAlert className="w-3 h-3" /> AGUARDANDO AUDITORIA
              </Badge>
            )}
          </div>
          <h1 className="text-[36px] font-black text-white uppercase tracking-tight leading-none max-w-2xl">{fazenda.nome}</h1>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="flex items-center gap-2 text-[12px] font-bold">
              <MapPin className="w-4 h-4 text-emerald-500" /> {fazenda.municipio} / {fazenda.uf}
            </span>
            <span className="flex items-center gap-2 text-[12px] font-bold">
               <Building2 className="w-4 h-4 text-emerald-500" /> NÚCLEO: {fazenda.nucleo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- OWNERSHIP ---
export function OwnershipCard({ prop }: { prop: { nome: string; documento: string; percentual: number } }) {
  const router = useRouter();
  return (
    <div 
      onClick={() => router.push(`/produtores/${prop.documento.replace(/\D/g, '')}`)}
      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-900/5 cursor-pointer transition-all group"
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-[14px] font-black text-slate-400 shrink-0 uppercase group-hover:bg-emerald-500 group-hover:text-white transition-all">
        {prop.nome?.substring(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-black text-slate-900 truncate uppercase leading-tight group-hover:text-emerald-700 transition-colors">{prop.nome}</p>
        <p className="text-[11px] font-mono text-slate-400 mt-1">{prop.documento}</p>
      </div>
      <div className="text-right flex flex-col items-end gap-1">
        {prop.percentual !== 100 && (
          <>
            <p className="text-[18px] font-black text-slate-900 group-hover:text-emerald-600 leading-none">{prop.percentual}%</p>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Participação</span>
          </>
        )}
      </div>
    </div>
  );
}

// --- TECH ROW ---
export function TechRow({ icon, label, value, highlight }: { icon: any; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", highlight ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white/5 text-slate-500")}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] leading-none", highlight ? "text-emerald-400" : "text-slate-500")}>{label}</p>
        <p className={cn("text-[13px] font-black leading-tight", highlight ? "text-white" : "text-slate-300")}>{value}</p>
      </div>
    </div>
  );
}

// --- SOIL PROGRESS ---
export function SoilProgress({ label, value, total, color }: { label: string; value?: number; total: number; color: string }) {
  if (value === undefined) return null;
  const pct = Math.min(100, (value / total) * 100);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <div className="text-right">
          <p className="text-[15px] font-black text-slate-900 leading-none">{value.toLocaleString('pt-BR')} ha</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{pct.toFixed(1)}% da área total</p>
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
