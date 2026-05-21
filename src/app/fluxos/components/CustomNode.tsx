import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  UserPlus, CheckSquare, GitBranch, ShieldAlert, 
  Hourglass, FileText, Calendar, Bell, CheckCircle2,
  Clock, AlertCircle, ArrowRight, User
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { FlowNode, NodePriority } from './types';

// Map node types to styling classes, labels and icons
export const NODE_CONFIGS = {
  lead: {
    label: 'Lead',
    icon: UserPlus,
    colorClass: 'border-emerald-500/80 bg-white text-emerald-700',
    headerClass: 'bg-emerald-500 text-white',
    badgeClass: 'bg-emerald-100 text-emerald-700'
  },
  task: {
    label: 'Tarefa',
    icon: CheckSquare,
    colorClass: 'border-slate-300 bg-white text-slate-700',
    headerClass: 'bg-slate-700 text-white',
    badgeClass: 'bg-slate-100 text-slate-700'
  },
  decision: {
    label: 'Decisão (IF)',
    icon: GitBranch,
    colorClass: 'border-indigo-500/80 bg-white text-indigo-700',
    headerClass: 'bg-indigo-600 text-white',
    badgeClass: 'bg-indigo-100 text-indigo-700'
  },
  approval: {
    label: 'Aprovação',
    icon: ShieldAlert,
    colorClass: 'border-amber-500/80 bg-white text-amber-700',
    headerClass: 'bg-amber-500 text-white',
    badgeClass: 'bg-amber-100 text-amber-700'
  },
  waiting: {
    label: 'Espera',
    icon: Hourglass,
    colorClass: 'border-blue-400/80 bg-white text-blue-700',
    headerClass: 'bg-blue-500 text-white',
    badgeClass: 'bg-blue-100 text-blue-700'
  },
  document: {
    label: 'Documento',
    icon: FileText,
    colorClass: 'border-violet-500/80 bg-white text-violet-700',
    headerClass: 'bg-violet-600 text-white',
    badgeClass: 'bg-violet-100 text-violet-700'
  },
  meeting: {
    label: 'Reunião',
    icon: Calendar,
    colorClass: 'border-rose-500/80 bg-white text-rose-700',
    headerClass: 'bg-rose-500 text-white',
    badgeClass: 'bg-rose-100 text-rose-700'
  },
  notification: {
    label: 'Alerta',
    icon: Bell,
    colorClass: 'border-orange-500/80 bg-white text-orange-700',
    headerClass: 'bg-orange-500 text-white',
    badgeClass: 'bg-orange-100 text-orange-700'
  },
  done: {
    label: 'Concluído',
    icon: CheckCircle2,
    colorClass: 'border-emerald-600 bg-emerald-50/50 text-emerald-800',
    headerClass: 'bg-emerald-600 text-white',
    badgeClass: 'bg-emerald-100 text-emerald-800'
  }
};

const PRIORITY_LABELS = {
  low: { label: 'Baixa', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Média', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  high: { label: 'Alta', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  critical: { label: 'Crítica', color: 'bg-red-50 text-red-600 border-red-100 border animate-pulse' }
};

interface CustomNodeProps {
  id: string;
  data: FlowNode;
  selected?: boolean;
}

export const CustomNode: React.FC<CustomNodeProps> = ({ id, data, selected }) => {
  const type = data.type || 'task';
  const config = NODE_CONFIGS[type] || NODE_CONFIGS.task;
  const IconComponent = config.icon;
  
  const priority = data.priority || 'medium';
  const priorityConfig = PRIORITY_LABELS[priority];

  // Calculate subtasks completion
  const totalSubtasks = data.subtasks?.length || 0;
  const completedSubtasks = data.subtasks?.filter(s => s.completed).length || 0;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Delay detection
  const isOverdue = React.useMemo(() => {
    if (!data.deadline || data.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = data.deadline.split('-');
    if (parts.length !== 3) return false;
    const deadlineDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return deadlineDate < today;
  }, [data.deadline, data.status]);

  return (
    <div className={cn(
      "w-72 rounded-2xl border bg-white shadow-md transition-all relative group",
      selected ? "ring-2 ring-indigo-500 border-indigo-500 scale-[1.02]" : "border-slate-200 hover:border-slate-350 hover:shadow-lg",
      isOverdue && "border-red-400 ring-1 ring-red-200"
    )}>
      {/* Handles for flow connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-400 border-2 border-white hover:bg-indigo-500 transition-colors"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-slate-400 border-2 border-white hover:bg-indigo-500 transition-colors"
      />

      {/* Header Band */}
      <div className={cn(
        "px-4 py-2.5 rounded-t-2xl flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider",
        config.headerClass
      )}>
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4" />
          <span>{config.label}</span>
        </div>
        {isOverdue && (
          <span className="bg-red-650 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest animate-bounce">
            Atrasado
          </span>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4">
        {/* Name and status icon */}
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase text-slate-800 leading-snug line-clamp-2">
            {data.name || 'Sem nome'}
          </h4>
          {data.description && (
            <p className="text-[10px] text-slate-400 font-medium line-clamp-2">
              {data.description}
            </p>
          )}
        </div>

        {/* Responsible user & Priority */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg max-w-[60%]">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[9px] font-bold text-slate-600 truncate uppercase">
              {data.assignedTo || '—'}
            </span>
          </div>

          <div className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border", priorityConfig.color)}>
            {priorityConfig.label}
          </div>
        </div>

        {/* Checklist Progress Bar */}
        {totalSubtasks > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-50">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
              <span>Checklist</span>
              <span>{completedSubtasks}/{totalSubtasks} ({progressPercent}%)</span>
            </div>
            <div className="h-1.5 bg-slate-150 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-300", 
                  data.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-650'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Status Indicators */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              data.status === 'completed' ? 'bg-emerald-500' : data.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-400'
            )} />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
              {data.status === 'completed' ? 'Concluído' : data.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
            </span>
          </div>

          {data.deadline && (
            <span className="text-[9px] font-bold text-slate-400">
              Prazo: {data.deadline.split('-').reverse().join('/')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
