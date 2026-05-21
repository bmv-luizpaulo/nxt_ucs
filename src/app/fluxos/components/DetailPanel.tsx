import React, { useState, useEffect } from 'react';
import { 
  X, Info, CheckSquare, Paperclip, History, 
  Send, Plus, Trash2, Calendar, User, Shield, 
  AlertCircle, Link2, MessageSquare, CheckCircle, FileText
} from 'lucide-react';
import { useFlowStore } from './useFlowStore';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FlowNode, NodePriority, NodeStatus, Subtask } from './types';
import { NODE_CONFIGS } from './CustomNode';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const DetailPanel: React.FC = () => {
  const activeFlowId = useFlowStore(s => s.activeFlowId);
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const setSelectedNodeId = useFlowStore(s => s.setSelectedNodeId);
  const flows = useFlowStore(s => s.flows);
  const activeFlow = flows.find(f => f.id === activeFlowId);
  const node = activeFlow?.nodes.find(n => n.id === selectedNodeId);

  const updateNodeDetail = useFlowStore(s => s.updateNodeDetail);
  const deleteNode = useFlowStore(s => s.deleteNode);
  const addSubtask = useFlowStore(s => s.addSubtask);
  const toggleSubtask = useFlowStore(s => s.toggleSubtask);
  const updateSubtaskValue = useFlowStore(s => s.updateSubtaskValue);
  const deleteSubtask = useFlowStore(s => s.deleteSubtask);
  const addComment = useFlowStore(s => s.addComment);

  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'attachments' | 'timeline'>('details');

  // Input states
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskType, setNewSubtaskType] = useState<'check' | 'text' | 'boolean'>('check');
  const [newComment, setNewComment] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Reset tab when node changes
  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab('details');
    }
  }, [selectedNodeId]);

  if (!node || !activeFlow) return null;

  const handleUpdateField = (field: keyof FlowNode, value: any) => {
    updateNodeDetail(node.id, { [field]: value });
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtask(node.id, newSubtaskTitle.trim(), newSubtaskType);
    setNewSubtaskTitle('');
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(node.id, activeFlow.participants[0] || 'Gestor', newComment.trim());
    setNewComment('');
  };

  const handleAddAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    const currentAttachments = node.attachments || [];
    const newAttach = {
      id: Math.random().toString(36).substring(2, 9),
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim()
    };
    handleUpdateField('attachments', [...currentAttachments, newAttach]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleDeleteAttachment = (id: string) => {
    const currentAttachments = node.attachments || [];
    handleUpdateField('attachments', currentAttachments.filter(a => a.id !== id));
  };

  const handleDeleteNode = () => {
    if (confirm('Tem certeza que deseja excluir esta etapa e todas as suas conexões?')) {
      deleteNode(node.id);
    }
  };

  const formatDateBR = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  return (
    <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col z-35 shrink-0 h-full relative shadow-2xl animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 font-bold">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Painel da Etapa</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: #{node.id}</p>
          </div>
        </div>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setSelectedNodeId(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6} className="bg-slate-900 border-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 shadow-xl rounded-lg">
              Fechar Painel
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-100 px-2 bg-slate-50/30">
        {[
          { id: 'details', label: 'Detalhes', icon: FileText },
          { id: 'checklist', label: 'Checklist', icon: CheckSquare },
          { id: 'attachments', label: 'Materiais', icon: Link2 },
          { id: 'timeline', label: 'Histórico', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-3.5 flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all",
                activeTab === tab.id 
                  ? "border-indigo-600 text-indigo-650" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nome da Etapa</label>
              <input
                type="text"
                value={node.name}
                onChange={e => handleUpdateField('name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição / Instruções</label>
              <textarea
                value={node.description}
                onChange={e => handleUpdateField('description', e.target.value)}
                placeholder="Detalhes adicionais sobre o procedimento..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>

            {/* Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tipo de Etapa</label>
              <select
                value={node.type}
                onChange={e => handleUpdateField('type', e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              >
                {Object.entries(NODE_CONFIGS).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Assigned To */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> Responsável
                </label>
                <select
                  value={node.assignedTo}
                  onChange={e => handleUpdateField('assignedTo', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none"
                >
                  {activeFlow.participants.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-400" /> Prioridade
                </label>
                <select
                  value={node.priority || 'medium'}
                  onChange={e => handleUpdateField('priority', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-slate-400" /> Situação
                </label>
                <select
                  value={node.status}
                  onChange={e => handleUpdateField('status', e.target.value as NodeStatus)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="completed">Concluido</option>
                </select>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Prazo Final
                </label>
                <input
                  type="date"
                  value={node.deadline || ''}
                  onChange={e => handleUpdateField('deadline', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-850 outline-none"
                />
              </div>
            </div>

            {/* Action Area */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <Button
                type="button"
                onClick={handleDeleteNode}
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold uppercase text-[10px] tracking-wider"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir Etapa
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="space-y-5">
            {/* Form to add subtask */}
            <form onSubmit={handleAddSubtaskSubmit} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-150">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nova Sub-Etapa (Requisito)</h4>
              
              <input
                type="text"
                placeholder="Título do requisito (ex: Validar certidão)"
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              />

              <div className="flex items-center justify-between gap-2">
                <select
                  value={newSubtaskType}
                  onChange={e => setNewSubtaskType(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-black uppercase text-slate-600 outline-none"
                >
                  <option value="check">Checkbox</option>
                  <option value="text">Resposta Texto</option>
                  <option value="boolean">Sim / Não</option>
                </select>
                <Button type="submit" className="bg-slate-900 text-white font-bold text-[9px] uppercase px-4 h-8 rounded-lg">
                  Adicionar
                </Button>
              </div>
            </form>

            {/* Subtasks List */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Requisitos da Etapa</label>
              
              {(!node.subtasks || node.subtasks.length === 0) ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
                  Nenhuma sub-etapa definida.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {node.subtasks.map(sub => (
                    <div 
                      key={sub.id} 
                      className={cn(
                        "p-3 rounded-xl border flex items-start justify-between gap-3 bg-white",
                        sub.completed ? "border-emerald-250 bg-emerald-50/20" : "border-slate-150"
                      )}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {sub.type !== 'text' && sub.type !== 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() => toggleSubtask(node.id, sub.id)}
                            className="mt-1 w-4 h-4 rounded text-indigo-650 border-slate-300 outline-none cursor-pointer"
                          />
                        ) : (
                          <span className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            sub.completed ? "bg-emerald-500" : "bg-slate-300"
                          )} />
                        )}

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <span className={cn(
                            "text-xs font-bold text-slate-800 break-words block",
                            sub.completed && sub.type === 'check' && "line-through text-slate-400 font-medium"
                          )}>
                            {sub.title}
                          </span>

                          {/* Dynamic response input based on type */}
                          {sub.type === 'text' && (
                            <input
                              type="text"
                              value={sub.value || ''}
                              onChange={e => {
                                updateSubtaskValue(node.id, sub.id, e.target.value);
                                if (e.target.value.trim() && !sub.completed) {
                                  toggleSubtask(node.id, sub.id);
                                } else if (!e.target.value.trim() && sub.completed) {
                                  toggleSubtask(node.id, sub.id);
                                }
                              }}
                              placeholder="Digite a resposta..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                            />
                          )}

                          {sub.type === 'boolean' && (
                            <div className="flex gap-2">
                              {['Sim', 'Não'].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    updateSubtaskValue(node.id, sub.id, opt);
                                    if (!sub.completed) toggleSubtask(node.id, sub.id);
                                  }}
                                  className={cn(
                                    "px-3 py-1 rounded-md text-[9px] font-black uppercase border transition-all",
                                    sub.value === opt 
                                      ? "bg-slate-900 border-slate-900 text-white" 
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={() => deleteSubtask(node.id, sub.id)}
                        className="text-slate-300 hover:text-red-500 p-1 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MATERIALS / LINKS */}
        {activeTab === 'attachments' && (
          <div className="space-y-5">
            {/* Form to add link */}
            <form onSubmit={handleAddAttachmentSubmit} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-150">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adicionar Material / Link</h4>
              
              <input
                type="text"
                placeholder="Nome do arquivo ou link"
                value={newLinkTitle}
                onChange={e => setNewLinkTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              />
              
              <input
                type="text"
                placeholder="http://..."
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-blue-600"
              />

              <Button type="submit" className="w-full bg-slate-900 text-white font-bold text-[9px] uppercase h-9 rounded-xl">
                Adicionar Material
              </Button>
            </form>

            {/* List */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Materiais de Apoio</label>
              
              {(!node.attachments || node.attachments.length === 0) ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
                  Nenhum arquivo ou link anexado.
                </div>
              ) : (
                <div className="space-y-2">
                  {node.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-150 bg-white group hover:border-slate-350">
                      <a 
                        href={att.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline truncate max-w-[85%]"
                      >
                        <Link2 className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{att.title}</span>
                      </a>
                      <button 
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TIMELINE & AUDIT LOGS */}
        {activeTab === 'timeline' && (
          <div className="space-y-5 flex flex-col h-full min-h-[400px]">
            {/* Timeline logs */}
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Logs de Auditoria</label>
              
              {(!node.logs || node.logs.length === 0) ? (
                <p className="text-center text-slate-400 text-[10px] font-bold">Nenhum log registrado.</p>
              ) : (
                <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-4">
                  {node.logs.map(log => (
                    <div key={log.id} className="relative text-[10px]">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-slate-900 rounded-full border border-white" />
                      
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 uppercase text-[9px]">
                          {log.user}: <span className="text-slate-500 font-medium normal-case">{log.action}</span>
                        </span>
                        {log.message && (
                          <span className="text-slate-400 font-semibold text-[8px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                            {log.message}
                          </span>
                        )}
                        <span className="text-slate-300 text-[8px] font-medium mt-0.5">
                          {formatDateBR(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Comments Area */}
            <div className="border-t border-slate-100 pt-4 flex-1 flex flex-col justify-end space-y-4">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Conversas / Comentários
              </label>

              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                {(!node.commentsList || node.commentsList.length === 0) ? (
                  <div className="text-center py-4 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                    Sem comentários
                  </div>
                ) : (
                  node.commentsList.map(c => (
                    <div key={c.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                        <span>{c.author}</span>
                        <span>{formatDateBR(c.timestamp).split(' ')[1] || ''}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 leading-normal">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Form to submit comment */}
              <form onSubmit={handleAddCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newComment.trim()}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl h-10 w-10 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
};
export default DetailPanel;
