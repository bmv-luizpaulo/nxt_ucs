import React from 'react';
import { 
  PlayCircle, Clock, CheckCircle2, User, 
  Calendar, ChevronRight, Plus, Link2 
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { FlowNode } from './types';

// Paleta de cores estilo post-it
const POST_IT_COLORS = [
  { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900', accent: 'bg-yellow-200', badge: 'bg-yellow-400/80', userBg: 'bg-yellow-200/60', progress: 'bg-yellow-400' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900', accent: 'bg-pink-200', badge: 'bg-pink-400/80', userBg: 'bg-pink-200/60', progress: 'bg-pink-400' },
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', accent: 'bg-blue-200', badge: 'bg-blue-400/80', userBg: 'bg-blue-200/60', progress: 'bg-blue-400' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900', accent: 'bg-emerald-200', badge: 'bg-emerald-400/80', userBg: 'bg-emerald-200/60', progress: 'bg-emerald-400' },
  { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-900', accent: 'bg-violet-200', badge: 'bg-violet-400/80', userBg: 'bg-violet-200/60', progress: 'bg-violet-400' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900', accent: 'bg-orange-200', badge: 'bg-orange-400/80', userBg: 'bg-orange-200/60', progress: 'bg-orange-400' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-900', accent: 'bg-cyan-200', badge: 'bg-cyan-400/80', userBg: 'bg-cyan-200/60', progress: 'bg-cyan-400' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-900', accent: 'bg-rose-200', badge: 'bg-rose-400/80', userBg: 'bg-rose-200/60', progress: 'bg-rose-400' },
];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface NodeCardProps {
  node: FlowNode;
  onClick: () => void;
  onAddNext: (e: React.MouseEvent) => void;
  onAddChild: (e: React.MouseEvent) => void;
  onStatusChange: (e: React.MouseEvent, status: string) => void;
  formatDateBR: (date: string) => string;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  onClick,
  onAddNext,
  onAddChild,
  onStatusChange,
  formatDateBR
}) => {
  const color = POST_IT_COLORS[hashId(node.id) % POST_IT_COLORS.length];

  const statusIcon = node.status === 'completed' 
    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    : node.status === 'in_progress' 
      ? <Clock className="w-4 h-4 text-blue-600" />
      : <PlayCircle className="w-4 h-4 text-yellow-600" />;

  const statusLabel = node.status === 'completed' ? 'Concluído' : node.status === 'in_progress' ? 'Em andamento' : 'Pendente';

  return (
    <div className="relative group">
      <div
        onClick={onClick}
        className={cn(
          "relative flex flex-col rounded-2xl border-2 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer w-72",
          color.bg, color.border
        )}
        style={{ transform: `rotate(${(hashId(node.id) % 5) - 2}deg)` }}
      >
        {/* Fita decorativa no topo */}
        <div className={cn("h-2 rounded-t-xl", color.progress, node.status === 'completed' ? 'opacity-100' : 'opacity-40')} />

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn(
              "font-black text-xs uppercase tracking-tight line-clamp-2 leading-relaxed",
              color.text
            )}>
              {node.name}
            </h3>
            <div className="shrink-0">{statusIcon}</div>
          </div>

          <div className="space-y-3">
            <div className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg", color.userBg, color.text)}>
              <User className="w-3 h-3 opacity-60" />
              <span className="truncate">{node.assignedTo}</span>
            </div>

            {node.deadline && (
              <div className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-2 opacity-70", color.text)}>
                <Calendar className="w-3 h-3" />
                <span>Até {formatDateBR(node.deadline)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              <button 
                onClick={(e) => onStatusChange(e, 'in_progress')}
                className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all", node.status === 'in_progress' ? "bg-blue-500 text-white shadow-md" : cn(color.accent, "text-slate-500 hover:opacity-80"))}
              >
                <Clock className="w-3 h-3" />
              </button>
              <button 
                onClick={(e) => onStatusChange(e, 'completed')}
                className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all", node.status === 'completed' ? "bg-emerald-500 text-white shadow-md" : cn(color.accent, "text-slate-500 hover:opacity-80"))}
              >
                <CheckCircle2 className="w-3 h-3" />
              </button>
            </div>
            
            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border", color.accent, color.border)}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className={cn("text-[8px] font-black uppercase", color.text)}>{node.type || 'MANUAL'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÕES DE ADIÇÃO RÁPIDA (CONTROLES DE FLUXO) */}
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 z-20">
        <button 
          onClick={onAddNext}
          title="Nova Etapa à Direita (Fluxo Linear)"
          className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all border-2 border-white"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute left-1/2 -bottom-4 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-20">
        <button 
          onClick={onAddChild}
          title="Nova Sub-etapa Abaixo (Ramificação)"
          className="px-4 py-1.5 bg-white text-blue-600 rounded-full flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all border border-blue-100 font-black text-[9px] uppercase tracking-widest"
        >
          <Plus className="w-3 h-3" /> Ramificar
        </button>
      </div>
    </div>
  );
};
