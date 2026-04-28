import React from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { FlowNode } from './types';

interface ExecutionChecklistProps {
  editingNode: Partial<FlowNode>;
  newSubTitle: string;
  setNewSubTitle: (val: string) => void;
  newSubType: 'boolean' | 'check' | 'text';
  setNewSubType: (val: 'boolean' | 'check' | 'text') => void;
  generateId: () => string;
  setEditingNode: (node: Partial<FlowNode>) => void;
  addLog: (action: string, message?: string) => void;
}

export const ExecutionChecklist: React.FC<ExecutionChecklistProps> = ({
  editingNode,
  newSubTitle,
  setNewSubTitle,
  newSubType,
  setNewSubType,
  generateId,
  setEditingNode,
  addLog
}) => {
  return (
    <section className="space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-blue-500" /> Itens de Verificação
      </h4>
      
      {/* Formulário de Inserção Rápida */}
      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 shadow-sm group hover:border-blue-300 transition-all">
        <input 
          value={newSubTitle}
          onChange={e => setNewSubTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newSubTitle.trim()) {
              const newItem = { id: generateId(), title: newSubTitle.trim(), completed: false, type: newSubType };
              setEditingNode({ ...editingNode, subtasks: [newItem, ...(editingNode.subtasks || [])] });
              setNewSubTitle('');
              addLog('Subtarefa criada', `Adicionou: ${newSubTitle}`);
            }
          }}
          placeholder="Adicionar novo item de verificação..."
          className="flex-1 bg-transparent border-none text-xs font-bold outline-none placeholder:text-blue-300"
        />
        <div className="flex items-center gap-2">
          <select 
            value={newSubType}
            onChange={e => setNewSubType(e.target.value as any)}
            className="bg-white border border-blue-100 rounded-lg px-2 py-1 text-[9px] font-black uppercase text-blue-600 outline-none"
          >
            <option value="boolean">Sim/Não</option>
            <option value="check">Check</option>
            <option value="text">Texto</option>
          </select>
          <Button 
            size="sm"
            onClick={() => {
              if (newSubTitle.trim()) {
                const newItem = { id: generateId(), title: newSubTitle.trim(), completed: false, type: newSubType };
                setEditingNode({ ...editingNode, subtasks: [newItem, ...(editingNode.subtasks || [])] });
                setNewSubTitle('');
                addLog('Subtarefa criada', `Adicionou: ${newSubTitle}`);
              }
            }}
            disabled={!newSubTitle.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase h-7 rounded-lg"
          >
            Adicionar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {editingNode.subtasks?.map((sub, idx) => (
          <div key={sub.id} className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all group shadow-sm">
            <div className="pt-0.5">
              {sub.type === 'check' ? (
                <input 
                  type="checkbox" 
                  checked={sub.completed}
                  onChange={e => {
                    const newSubs = [...(editingNode.subtasks || [])];
                    newSubs[idx].completed = e.target.checked;
                    setEditingNode({ ...editingNode, subtasks: newSubs });
                    addLog('Checklist alterado', `${sub.title}: ${e.target.checked ? 'Concluído' : 'Pendente'}`);
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              ) : sub.type === 'boolean' ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const newSubs = [...(editingNode.subtasks || [])];
                      newSubs[idx].completed = true;
                      setEditingNode({ ...editingNode, subtasks: newSubs });
                      addLog('Checklist alterado', `${sub.title}: Marcado como SIM`);
                    }}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${sub.completed === true ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >Sim</button>
                  <button 
                    onClick={() => {
                      const newSubs = [...(editingNode.subtasks || [])];
                      newSubs[idx].completed = false;
                      setEditingNode({ ...editingNode, subtasks: newSubs });
                      addLog('Checklist alterado', `${sub.title}: Marcado como NÃO`);
                    }}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${sub.completed === false ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >Não</button>
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <span className={`text-xs font-bold ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{sub.title}</span>
              {sub.type === 'text' && (
                <textarea 
                  value={sub.value || ''}
                  onChange={e => {
                    const newSubs = [...(editingNode.subtasks || [])];
                    newSubs[idx].value = e.target.value;
                    setEditingNode({ ...editingNode, subtasks: newSubs });
                  }}
                  onBlur={() => addLog('Checklist alterado', `${sub.title}: Resposta atualizada`)}
                  placeholder="Sua resposta aqui..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none focus:bg-white focus:border-blue-400 transition-all min-h-[60px]"
                />
              )}
            </div>
            <button 
              onClick={() => {
                setEditingNode({ ...editingNode, subtasks: editingNode.subtasks?.filter((_, i) => i !== idx) });
                addLog('Subtarefa removida', sub.title);
              }}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
