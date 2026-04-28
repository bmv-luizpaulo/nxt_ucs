import React from 'react';
import { X, Plus, Trash2, Link2, Users, Calendar, Layout } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Flow, FlowLink } from './types';

interface FlowModalProps {
  isOpen: boolean;
  editingFlow: Partial<Flow>;
  participantsInput: string;
  onClose: () => void;
  setEditingFlow: (flow: Partial<Flow>) => void;
  setParticipantsInput: (val: string) => void;
  handleAddParticipant: () => void;
  handleRemoveParticipant: (p: string) => void;
  handleSaveFlow: () => void;
  generateId: () => string;
}

export const FlowModal: React.FC<FlowModalProps> = ({
  isOpen,
  editingFlow,
  participantsInput,
  onClose,
  setEditingFlow,
  setParticipantsInput,
  handleAddParticipant,
  handleRemoveParticipant,
  handleSaveFlow,
  generateId
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <Layout className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
              {editingFlow.id ? 'Configurações do Fluxo' : 'Novo Fluxo de Trabalho'}
            </h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="rounded-full h-10 w-10 p-0">
            <X className="w-5 h-5 text-slate-400" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Fluxo</label>
            <input 
              value={editingFlow.name || ''} 
              onChange={e => setEditingFlow({...editingFlow, name: e.target.value})}
              placeholder="ex: Auditoria de Transferências"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:bg-white focus:border-slate-900 transition-all"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Equipe Participante
            </label>
            <div className="flex gap-2">
              <input 
                value={participantsInput} 
                onChange={e => setParticipantsInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddParticipant()}
                placeholder="Nome do colaborador..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
              />
              <Button onClick={handleAddParticipant} className="bg-slate-900 text-white rounded-xl px-6 font-bold text-xs uppercase">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editingFlow.participants?.map(p => (
                <div key={p} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 border border-slate-200">
                  {p}
                  <button onClick={() => handleRemoveParticipant(p)} className="hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5" /> Materiais de Apoio (Links)
            </label>
            <div className="grid grid-cols-1 gap-3">
              {editingFlow.links?.map((link, idx) => (
                <div key={link.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                  <input 
                    value={link.title} 
                    onChange={e => {
                      const newLinks = [...(editingFlow.links || [])];
                      newLinks[idx].title = e.target.value;
                      setEditingFlow({...editingFlow, links: newLinks});
                    }}
                    placeholder="Título" 
                    className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-[10px] font-black uppercase outline-none"
                  />
                  <input 
                    value={link.url} 
                    onChange={e => {
                      const newLinks = [...(editingFlow.links || [])];
                      newLinks[idx].url = e.target.value;
                      setEditingFlow({...editingFlow, links: newLinks});
                    }}
                    placeholder="URL" 
                    className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-[10px] font-medium text-blue-600 outline-none"
                  />
                  <button onClick={() => {
                    const newLinks = editingFlow.links?.filter((_, i) => i !== idx);
                    setEditingFlow({...editingFlow, links: newLinks});
                  }} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button 
                variant="outline" 
                onClick={() => setEditingFlow({...editingFlow, links: [...(editingFlow.links || []), { id: generateId(), title: '', url: '' }]})}
                className="w-full border-dashed border-2 rounded-xl text-slate-400 font-bold text-[10px] uppercase h-12"
              >
                + Adicionar Material
              </Button>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={onClose} className="font-bold rounded-xl px-6 text-xs uppercase text-slate-400">Cancelar</Button>
          <Button onClick={handleSaveFlow} disabled={!editingFlow.name} className="bg-slate-900 text-white font-black uppercase text-xs rounded-xl px-8 shadow-lg h-12 tracking-widest">Salvar Fluxo</Button>
        </div>
      </div>
    </div>
  );
};
