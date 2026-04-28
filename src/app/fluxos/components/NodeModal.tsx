import React, { useState } from 'react';
import {
  X, Plus, PlayCircle, Calendar, Edit2, CheckCircle2,
  Link2, Trash2, Database, ArrowLeft, Tag, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FlowNode, Flow, NodeStatus } from './types';

// Subcomponentes
import { ExecutionChecklist } from './ExecutionChecklist';
import { StructuredDataTables } from './StructuredDataTables';
import { ActivityLogs } from './ActivityLogs';
import { PasteTableModal } from './PasteTableModal';

interface NodeModalProps {
  isOpen: boolean;
  editingNode: Partial<FlowNode>;
  isEditingDetails: boolean;
  activeFlow: Flow | undefined;
  onClose: () => void;
  setEditingNode: (node: Partial<FlowNode>) => void;
  setIsEditingDetails: (val: boolean) => void;
  handleSaveNode: () => void;
  generateId: () => string;
  activeFlowId: string | null;
  setFlows: React.Dispatch<React.SetStateAction<Flow[]>>;
  formatDateBR: (date: string) => string;
}

export const NodeModal: React.FC<NodeModalProps> = ({
  isOpen,
  editingNode,
  isEditingDetails,
  activeFlow,
  onClose,
  setEditingNode,
  setIsEditingDetails,
  handleSaveNode,
  generateId,
  activeFlowId,
  setFlows,
  formatDateBR
}) => {
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteTableName, setPasteTableName] = useState('');
  const [logMessage, setLogMessage] = useState('');
  const [logUser, setLogUser] = useState(activeFlow?.participants[0] || '');
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubType, setNewSubType] = useState<'boolean' | 'check' | 'text'>('boolean');
  const [showTables, setShowTables] = useState(!!editingNode.structuredData?.length);
  const [showChecklist, setShowChecklist] = useState(!!editingNode.subtasks?.length);
  const [showEvidence, setShowEvidence] = useState(!!editingNode.attachments?.length);

  const addLog = (action: string, message?: string) => {
    const newLog = {
      id: generateId(),
      user: logUser || 'Sistema',
      action,
      message,
      timestamp: new Date().toISOString()
    };
    setEditingNode({
      ...editingNode,
      logs: [...(editingNode.logs || []), newLog]
    });
  };

  const updateTable = (tIdx: number, updater: (table: { title: string; headers: string[]; rows: string[][] }) => { title: string; headers: string[]; rows: string[][] }) => {
    const tables = [...(editingNode.structuredData || [])];
    tables[tIdx] = updater({ ...tables[tIdx], headers: [...tables[tIdx].headers], rows: tables[tIdx].rows.map(r => [...r]) });
    setEditingNode({ ...editingNode, structuredData: tables });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-8">
      <div className="bg-white rounded-[2rem] w-full max-w-[95vw] h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        {/* TOP BAR */}
        <div className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-white",
              editingNode.status === 'completed' ? "bg-emerald-500" :
                editingNode.status === 'in_progress' ? "bg-blue-500" : "bg-yellow-500"
            )}>
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-700 flex items-center gap-2">
                {editingNode.name || 'Nova Etapa'}
                <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase">{editingNode.type || 'Manual'}</span>
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsável: {editingNode.assignedTo || 'Não atribuído'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (!editingNode.id) return;
                const childNode = {
                  id: generateId(),
                  parentId: editingNode.id,
                  name: `Ramificação: ${editingNode.name || 'Nova'}`,
                  description: `Auditoria derivada de: ${editingNode.name}`,
                  assignedTo: editingNode.assignedTo || 'Eu',
                  type: editingNode.type || 'manual',
                  status: 'pending' as NodeStatus,
                  subtasks: []
                };
                setFlows(prev => prev.map(f => {
                  if (f.id === activeFlowId) return { ...f, nodes: [...f.nodes, childNode] };
                  return f;
                }));
                alert("Nova ramificação criada! Esta tarefa agora é um desdobramento da atual.");
              }}
              variant="outline"
              className="border-blue-200 text-blue-600 font-black text-[10px] uppercase tracking-widest h-10 px-4 rounded-lg"
            >
              <Plus className="w-3 h-3 mr-2" /> Criar Sub-etapa
            </Button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <Button variant="ghost" onClick={onClose} className="h-10 w-10 p-0 rounded-full hover:bg-slate-200">
              <X className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 flex overflow-hidden bg-[#F1F5F9]">
          {/* SIDEBAR RESUMO */}
          <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="h-12 border-b border-slate-100 flex items-center px-6 bg-slate-50/30">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contexto Geral</span>
            </div>

            <div className="p-6 space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Database className="w-4 h-4 text-slate-400" />
                  <h4 className="text-[11px] font-black uppercase tracking-tight">{activeFlow?.name}</h4>
                </div>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {activeFlow?.description || 'Fluxo de auditoria e orquestração de processos BMV.'}
                </p>
              </div>

              {editingNode.parentId && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ArrowLeft className="w-3 h-3" /> Origem desta Etapa
                  </label>
                  <Button
                    onClick={() => {
                      const parent = activeFlow?.nodes.find(n => n.id === editingNode.parentId);
                      if (parent) {
                        setEditingNode(parent);
                        setIsEditingDetails(false);
                      }
                    }}
                    variant="outline"
                    className="w-full justify-start p-4 h-auto flex flex-col items-start gap-1 border-blue-100 bg-blue-50/30 hover:bg-blue-50 group transition-all"
                  >
                    <span className="text-[10px] font-black text-blue-600 uppercase">Voltar para Pai</span>
                    <span className="text-[11px] font-bold text-slate-700 truncate w-full text-left">
                      {activeFlow?.nodes.find(n => n.id === editingNode.parentId)?.name}
                    </span>
                  </Button>
                </div>
              )}

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Prazo Final da Etapa</label>
                  <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    {editingNode.deadline ? formatDateBR(editingNode.deadline) : 'Sem prazo'}
                  </div>
                </div>
              </div>

              {!isEditingDetails && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Instruções</label>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 min-h-[100px]">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">{editingNode.description || 'Sem instruções.'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL PRINCIPAL */}
          <div className="flex-1 bg-white flex flex-col shadow-inner z-10 overflow-hidden">
            {!isEditingDetails ? (
              <>
                <div className="h-12 border-b border-slate-100 flex items-center px-8 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 border-b-2 border-blue-500 h-12 flex items-center">Execução</span>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-10 max-w-4xl mx-auto w-full">
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-400" /> Notas e Observações da Etapa
                    </h4>
                    <textarea
                      value={editingNode.comments || ''}
                      onChange={e => setEditingNode({ ...editingNode, comments: e.target.value })}
                      placeholder="Registre aqui as conclusões, problemas ou observações gerais desta auditoria..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[120px] shadow-sm"
                    />
                  </section>

                  {showChecklist && (
                    <ExecutionChecklist 
                      editingNode={editingNode}
                      newSubTitle={newSubTitle}
                      setNewSubTitle={setNewSubTitle}
                      newSubType={newSubType}
                      setNewSubType={setNewSubType}
                      generateId={generateId}
                      setEditingNode={setEditingNode}
                      addLog={addLog}
                    />
                  )}

                  {showTables && (
                    <StructuredDataTables 
                      editingNode={editingNode}
                      updateTable={updateTable}
                      setEditingNode={setEditingNode}
                      setPasteModalOpen={setPasteModalOpen}
                      setPasteTableName={setPasteTableName}
                    />
                  )}

                  {showEvidence && (
                    <section className="space-y-4 pb-10">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-blue-500" /> Evidências
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {editingNode.attachments?.map((att, idx) => (
                          <div key={att.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 relative group">
                            <input value={att.title} onChange={e => {
                              const newAtts = [...(editingNode.attachments || [])];
                              newAtts[idx].title = e.target.value;
                              setEditingNode({ ...editingNode, attachments: newAtts });
                            }} placeholder="Título" className="w-full bg-white border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase outline-none" />
                            <input value={att.url} onChange={e => {
                              const newAtts = [...(editingNode.attachments || [])];
                              newAtts[idx].url = e.target.value;
                              setEditingNode({ ...editingNode, attachments: newAtts });
                            }} placeholder="URL" className="w-full bg-white border px-3 py-1.5 rounded-lg text-[10px] font-medium text-blue-600 outline-none" />
                            <button onClick={() => setEditingNode({ ...editingNode, attachments: editingNode.attachments?.filter((_, i) => i !== idx) })} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 text-red-500 bg-white shadow-sm rounded-full p-1 border border-slate-200"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                        <Button variant="outline" onClick={() => setEditingNode({ ...editingNode, attachments: [...(editingNode.attachments || []), { id: generateId(), title: '', url: '' }] })} className="h-24 border-dashed border-2 rounded-xl text-slate-400 font-bold text-[10px] uppercase">+ Adicionar Anexo</Button>
                      </div>
                    </section>
                  )}
                </div>
                <div className="h-20 border-t border-slate-100 flex items-center justify-between px-10 bg-slate-50/50 shrink-0">
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setEditingNode({ ...editingNode, status: 'in_progress' }); addLog('Status alterado', 'Marcou como Em Andamento'); }} className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all", editingNode.status === 'in_progress' ? "bg-blue-500 text-white shadow-lg" : "bg-slate-200 text-slate-500")}>Em Andamento</button>
                    <button onClick={() => { setEditingNode({ ...editingNode, status: 'completed' }); addLog('Status alterado', 'Marcou como Concluído'); }} className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all", editingNode.status === 'completed' ? "bg-emerald-500 text-white shadow-lg" : "bg-slate-200 text-slate-500")}>Concluído</button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-1" />
                    {editingNode.id && (
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja DELETAR esta etapa? Esta ação não pode ser desfeita.')) {
                            setFlows(prev => prev.map(f => {
                              if (f.id === activeFlowId) return { ...f, nodes: f.nodes.filter(n => n.id !== editingNode.id) };
                              return f;
                            }));
                            onClose();
                          }
                        }}
                        className="px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3 inline mr-1" />Deletar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onClose} className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-12 px-6">Cancelar</Button>
                    <Button onClick={handleSaveNode} className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest h-12 px-10 rounded-xl shadow-xl">Salvar Execução</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 bg-white p-12 overflow-y-auto">
                <div className="max-w-2xl mx-auto space-y-10">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Edit2 className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">Configurações da Etapa</h3>
                      <p className="text-sm font-medium text-slate-400">Defina os detalhes fundamentais para a criação.</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Etapa *</label>
                      <input value={editingNode.name || ''} onChange={e => setEditingNode({ ...editingNode, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-lg font-bold outline-none focus:bg-white focus:border-blue-600 transition-all" placeholder="ex: Validação de Crédito" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição detalhada</label>
                      <textarea value={editingNode.description || ''} onChange={e => setEditingNode({ ...editingNode, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-600 transition-all min-h-[150px]" placeholder="O que deve ser feito nesta etapa?" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</label>
                        <select value={editingNode.assignedTo || ''} onChange={e => setEditingNode({ ...editingNode, assignedTo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm font-bold outline-none focus:bg-white">
                          <option value="" disabled>Selecionar...</option>
                          <option value="Todos">👥 Todos os Participantes</option>
                          {activeFlow?.participants.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prazo Final</label>
                        <input type="date" value={editingNode.deadline || ''} onChange={e => setEditingNode({ ...editingNode, deadline: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm font-bold outline-none focus:bg-white" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-8 flex items-center gap-4">
                    <Button
                      onClick={handleSaveNode}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase h-16 rounded-xl shadow-xl transition-all"
                    >
                      {editingNode.id ? 'Salvar Alterações e Voltar' : 'Criar Etapa e Iniciar Execução'}
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="px-8 font-black text-xs uppercase text-slate-400 h-16">Cancelar</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA */}
          <div className="w-96 bg-slate-50 border-l border-slate-200 flex shrink-0 overflow-hidden">
            {!isEditingDetails && (
              <div className="w-14 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-6 gap-6 shrink-0 shadow-sm">
                <div className="relative group/tooltip">
                  <button 
                    onClick={() => setShowTables(!showTables)} 
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all", 
                      showTables ? "bg-emerald-100 text-emerald-600 shadow-sm" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    )}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </button>
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-[70] shadow-2xl whitespace-nowrap after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-slate-900">
                    Tabelas e Listas
                  </div>
                </div>

                <div className="relative group/tooltip">
                  <button 
                    onClick={() => setShowChecklist(!showChecklist)} 
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all", 
                      showChecklist ? "bg-blue-100 text-blue-600 shadow-sm" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    )}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-[70] shadow-2xl whitespace-nowrap after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-slate-900">
                    Itens de Verificação
                  </div>
                </div>

                <div className="relative group/tooltip">
                  <button 
                    onClick={() => setShowEvidence(!showEvidence)} 
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all", 
                      showEvidence ? "bg-violet-100 text-violet-600 shadow-sm" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    )}
                  >
                    <Link2 className="w-5 h-5" />
                  </button>
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-[70] shadow-2xl whitespace-nowrap after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-slate-900">
                    Evidências e Anexos
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 flex flex-col overflow-y-auto">
              {isEditingDetails ? (
                <>
                  <div className="h-12 border-b border-slate-200 flex items-center px-6 bg-white/50 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Configurações Avançadas</span>
                  </div>
                  <div className="p-6 space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Checklist Operacional</label>
                      <div className="space-y-2">
                        {editingNode.subtasks?.map((sub, idx) => (
                          <div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 group shadow-sm">
                            <input value={sub.title} onChange={e => { const newSubs = [...(editingNode.subtasks || [])]; newSubs[idx].title = e.target.value; setEditingNode({ ...editingNode, subtasks: newSubs }); }} placeholder="Descrição..." className="w-full bg-slate-50 border-none px-3 py-2 rounded-lg text-[10px] font-bold outline-none" />
                            <div className="flex items-center justify-between">
                              <select value={sub.type || 'boolean'} onChange={e => { const newSubs = [...(editingNode.subtasks || [])]; newSubs[idx].type = e.target.value as any; setEditingNode({ ...editingNode, subtasks: newSubs }); }} className="text-[9px] font-black uppercase text-slate-400 bg-transparent outline-none cursor-pointer"><option value="boolean">Sim/Não</option><option value="check">Check</option><option value="text">Resposta</option></select>
                              <button onClick={() => setEditingNode({ ...editingNode, subtasks: editingNode.subtasks?.filter((_, i) => i !== idx) })} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" onClick={() => setEditingNode({ ...editingNode, subtasks: [...(editingNode.subtasks || []), { id: generateId(), title: '', completed: false, type: 'boolean' }] })} className="w-full border-dashed border-2 rounded-xl text-slate-400 font-bold text-[10px] uppercase h-10 bg-white">+ Novo Item</Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <ActivityLogs 
                  editingNode={editingNode}
                  setEditingNode={setEditingNode}
                  activeFlow={activeFlow}
                  logUser={logUser}
                  setLogUser={setLogUser}
                  logMessage={logMessage}
                  setLogMessage={setLogMessage}
                  addLog={addLog}
                />
              )}
            </div>
          </div>
        </div>

        <PasteTableModal 
          pasteModalOpen={pasteModalOpen}
          setPasteModalOpen={setPasteModalOpen}
          pasteTableName={pasteTableName}
          setPasteTableName={setPasteTableName}
          pasteText={pasteText}
          setPasteText={setPasteText}
          editingNode={editingNode}
          setEditingNode={setEditingNode}
        />
      </div>
    </div>
  );
};
