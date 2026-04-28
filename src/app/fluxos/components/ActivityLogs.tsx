import React from 'react';
import { Clock, Trash2, User, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { FlowNode, Flow } from '../types';

interface ActivityLogsProps {
  editingNode: Partial<FlowNode>;
  setEditingNode: (node: Partial<FlowNode>) => void;
  activeFlow: Flow | undefined;
  logUser: string;
  setLogUser: (val: string) => void;
  logMessage: string;
  setLogMessage: (val: string) => void;
  addLog: (action: string, message?: string) => void;
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({
  editingNode,
  setEditingNode,
  activeFlow,
  logUser,
  setLogUser,
  logMessage,
  setLogMessage,
  addLog
}) => {
  return (
    <>
      <div className="h-12 border-b border-slate-200 flex items-center px-6 bg-white/50 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Logs de Atividade</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Seletor de usuário */}
        <div className="bg-slate-100 rounded-xl p-3 space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <User className="w-3 h-3" /> Registrando como
          </label>
          <select 
            value={logUser}
            onChange={e => setLogUser(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold outline-none"
          >
            {activeFlow?.participants.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Adicionar log */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
          <textarea 
            value={logMessage}
            onChange={e => setLogMessage(e.target.value)}
            placeholder="Descreva a ação realizada..."
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[11px] font-medium outline-none focus:border-blue-500 min-h-[60px] resize-y transition-all"
          />
          <Button 
            size="sm"
            onClick={() => {
              if (logMessage.trim()) {
                addLog('Observação', logMessage.trim());
                setLogMessage('');
              }
            }}
            disabled={!logMessage.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-widest h-8 rounded-lg disabled:opacity-40"
          >
            <Send className="w-3 h-3 mr-1.5" /> Registrar Log
          </Button>
        </div>

        {/* Timeline de logs */}
        {editingNode.logs && editingNode.logs.length > 0 ? (
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Histórico</label>
            {[...editingNode.logs].reverse().map(log => (
              <div key={log.id} className="bg-white border border-slate-100 rounded-xl p-3 space-y-1 group relative">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-blue-600">{log.user}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-slate-300 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(log.timestamp).toLocaleDateString('pt-BR')} {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      onClick={() => setEditingNode({ ...editingNode, logs: editingNode.logs?.filter(l => l.id !== log.id) })}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                    ><Trash2 className="w-2.5 h-2.5" /></button>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded inline-block">{log.action}</span>
                {log.message && (
                  <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{log.message}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-6 h-6 text-slate-200 mx-auto mb-2" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nenhum log registrado</p>
          </div>
        )}
      </div>
    </>
  );
};
