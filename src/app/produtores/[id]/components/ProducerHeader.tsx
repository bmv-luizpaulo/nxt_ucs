import React from "react";
import { ShieldCheck, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link"; // Adicionado Link do Next.js

// 1. TIPAGENS REAIS AO INVÉS DE 'any'
interface Fazenda {
  id: string;
  // adicione outras propriedades da fazenda
}

interface Produtor {
  nome: string;
  fazendas: Fazenda[];
  // adicione outras propriedades do produtor
}

interface CurrentStats {
  saldoReal?: number;
  originacao?: number;
  movimentacao?: number;
  aquisicao?: number;
  legado?: number;
  bloqueado?: number;
}

interface ProducerHeaderProps {
  produtor: Produtor | null;
  id: string;
  currentStats: CurrentStats | null;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isSaving: boolean;
  handleSave: () => void;
  // router: any; -> Removido pois usaremos o Link
}

// 2. SUBCOMPONENTE PARA EVITAR REPETIÇÃO DE CÓDIGO (DRY)
const MetricItem = ({ 
  label, 
  value, 
  colorClass, 
  unitClass 
}: { 
  label: string; 
  value: number; 
  colorClass: string; 
  unitClass: string; 
}) => (
  <div className="flex flex-col">
    <p className={cn("text-[9px] font-black uppercase tracking-[0.3em] mb-2", colorClass)}>
      {label}
    </p>
    <p className={cn("text-lg font-black tracking-tighter leading-none", colorClass.replace('/70', ''))}>
      {value.toLocaleString('pt-BR')}
      <span className={cn("text-xs ml-1.5 font-bold", unitClass)}>UCS</span>
    </p>
  </div>
);

export function ProducerHeader({
  produtor,
  id,
  currentStats,
  isEditing,
  setIsEditing,
  isSaving,
  handleSave,
}: ProducerHeaderProps) {
  
  // Prevenção de quebra caso os dados ainda estejam carregando
  if (!produtor || !currentStats) return null; 

  return (
    <header className="bg-[#0F172A] border-b border-white/5 py-6 px-10 sticky top-0 z-40 shrink-0 shadow-2xl">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* LINHA 01: IDENTIFICAÇÃO E AÇÕES */}
        <div className="flex justify-between items-center">
          {/* LADO ESQUERDO: INFOS DO PRODUTOR */}
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] shrink-0 group hover:rotate-6 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                  {produtor?.nome || 'Produtor Desconhecido'}
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black tracking-[0.2em] px-3 py-1 rounded-lg">VERIFICADO</Badge>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-none">Documento</span>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight leading-none">{id}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-none">Inventário</span>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight leading-none">
                    {produtor?.fazendas?.length || 0} Fazendas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: SALDO E AÇÕES PRINCIPAIS */}
          <div className="flex items-center gap-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-3 text-center min-w-[160px] shadow-lg shadow-emerald-500/5 backdrop-blur-sm">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1.5 leading-none">Saldo Disponível</p>
              <p className="text-xl font-black text-emerald-400 tracking-tighter leading-none">
                {(currentStats?.saldoReal || 0).toLocaleString('pt-BR')} <span className="text-xs opacity-40">UCS</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={isSaving}
                className={cn(
                  "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                  isEditing ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" : "bg-white/10 hover:bg-white/20 text-white"
                )}
              >
                {isSaving ? "SALVANDO..." : isEditing ? "SALVAR AUDITORIA" : "INICIAR AUDITORIA"}
              </Button>
              
              <Link 
                href="/produtores" 
                className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Painel Geral
              </Link>
            </div>
          </div>
        </div>

        {/* LINHA 02: MÉTRICAS TÉCNICAS (CONSOLIDADO) */}
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 px-10 border border-white/10 flex items-center justify-between shadow-inner overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-10 min-w-max">
            <MetricItem label="Total Originado" value={currentStats?.originacao || 0} colorClass="text-white" unitClass="text-slate-600" />
            <div className="w-px h-8 bg-white/5" />
            <MetricItem label="Consumo" value={currentStats?.movimentacao || 0} colorClass="text-rose-500/70" unitClass="text-rose-900" />
            <div className="w-px h-8 bg-white/5" />
            <MetricItem label="Aquisição" value={currentStats?.aquisicao || 0} colorClass="text-indigo-400" unitClass="text-indigo-900" />
            <div className="w-px h-8 bg-white/5" />
            <MetricItem label="Aposentadas" value={currentStats?.legado || 0} colorClass="text-amber-500/70" unitClass="text-amber-900" />
            <div className="w-px h-8 bg-white/5" />
            <MetricItem label="Saldo Bloqueado" value={currentStats?.bloqueado || 0} colorClass="text-slate-500" unitClass="text-slate-800" />
          </div>
        </div>

      </div>
    </header>
  );
}