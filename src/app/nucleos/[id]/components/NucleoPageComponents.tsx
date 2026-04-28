"use client"

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Building2, Users2, ShieldCheck, 
  Database, MapPin, User, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- HEADER ---
export function GovernanceHeader({ name, cnpj }: { name: string; cnpj?: string }) {
  return (
    <div className="bg-[#080C11] p-10 shrink-0 relative overflow-hidden group border-b border-white/5">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
            <Building2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                Associação: {cnpj || "Não Vinculada"}
              </Badge>
              <Badge className="bg-blue-500/10 text-blue-400 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest flex gap-2 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Governança Ativa
              </Badge>
            </div>
            <h1 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none">{name}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">ID da Carteira Associação</p>
              <p className="text-[11px] font-mono text-emerald-400">{cnpj ? `ASSOC_${cnpj.replace(/\D/g, '')}` : '---'}</p>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- STAT CARD ---
export function RegionalStatCard({ label, value, unit, color, icon: Icon }: any) {
  const colors: any = {
    emerald: "bg-emerald-500/5 border-emerald-500/10 text-emerald-500",
    indigo: "bg-indigo-500/5 border-indigo-500/10 text-indigo-500",
    slate: "bg-slate-500/5 border-slate-500/10 text-slate-400",
  };

  return (
    <div className={cn("p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-xl", colors[color] || colors.emerald)}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-current shadow-sm border border-slate-100">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
      </div>
      <div>
        <p className="text-[26px] font-black text-slate-900 tracking-tight leading-none">
          {value}
        </p>
        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{unit}</p>
      </div>
    </div>
  );
}

// --- FARM ROW ---
interface FarmRowProps {
  item: {
    id: string;
    idf: string;
    nome: string;
    totalOrig: number;
    particionadoAssoc: number;
    safra: string;
    proprietarios: any[];
    status: string;
  }
}

export function FarmRow({ item }: FarmRowProps) {
  const router = useRouter();
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  return (
    <>
      <tr 
        onClick={() => router.push(`/fazendas/${item.id}`)}
        className="group border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-all h-20 bg-white"
      >
        <td className="pl-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-all">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase leading-tight">{item.nome}</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">IDF: {item.idf}</span>
            </div>
          </div>
        </td>
        
        <td className="text-right">
          <span className="text-[14px] font-black text-slate-900">{formatUCS(item.totalOrig)}</span>
        </td>

        <td className="text-right">
          <div className="flex items-center justify-end gap-2">
             <span className="text-[14px] font-black text-emerald-600">{formatUCS(item.particionadoAssoc)}</span>
             <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black px-1.5 py-0">ASSOC</Badge>
          </div>
        </td>

        <td className="text-center">
            <span className="text-[12px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{item.safra}</span>
        </td>

        <td className="text-center">
          {item.status === 'valido' ? (
            <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">VALIDADO</Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-400 border-none text-[8px] font-black uppercase px-3 py-1 rounded-full">PENDENTE</Badge>
          )}
        </td>

        <td className="text-right pr-10">
           <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
        </td>
      </tr>

      {/* RENDER PROPRIETÁRIOS ABAIXO DA FAZENDA */}
      {item.proprietarios.map((p, idx) => (
        <tr key={`${item.id}-prop-${idx}`} className="h-10 border-b border-slate-50 bg-slate-50/20">
          <td colSpan={6} className="pl-[74px]">
            <div 
              onClick={() => router.push(`/produtores/${p.documento?.replace(/\D/g, '')}`)}
              className="flex items-center gap-3 text-slate-500 hover:text-emerald-600 cursor-pointer transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{p.nome}</span>
              <span className="text-[9px] font-mono opacity-60">({p.documento})</span>
              {p.percentual !== 100 && (
                <span className="text-[10px] font-black ml-4">{p.percentual}%</span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
