"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  LayoutTemplate,
  ArrowLeft,
  Edit2,
  Search,
  Filter,
  Layers,
  Sparkles,
  FileText,
  AlertTriangle,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { ReactFlowProvider } from '@xyflow/react';

// Subcomponentes
import { useFlowStore } from './components/useFlowStore';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { DetailPanel } from './components/DetailPanel';
import { FlowModal } from './components/FlowModal';
import { useUser } from "@/firebase";
import { FlowNode, FlowEdge } from './components/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BmvFluxosPage() {
  const { user } = useUser();
  const defaultParticipant = user?.displayName || user?.email?.split('@')[0] || "Operador";

  // Zustand Store binding
  const flows = useFlowStore(s => s.flows);
  const activeFlowId = useFlowStore(s => s.activeFlowId);
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const loadFlows = useFlowStore(s => s.loadFlows);
  const setActiveFlowId = useFlowStore(s => s.setActiveFlowId);
  const addFlow = useFlowStore(s => s.addFlow);
  const updateFlow = useFlowStore(s => s.updateFlow);

  // Local UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'delayed' | 'completed'>('all');
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any>({});
  const [participantsInput, setParticipantsInput] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const activeFlow = flows.find(f => f.id === activeFlowId);

  // Filter flows
  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Check delay
    const hasDelayedNodes = flow.nodes.some(node => {
      if (!node.deadline || node.status === 'completed') return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parts = node.deadline.split('-');
      if (parts.length !== 3) return false;
      const deadlineDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return deadlineDate < today;
    });

    // Check completion
    const isCompleted = flow.nodes.length > 0 && flow.nodes.every(n => n.status === 'completed');

    if (filterType === 'delayed') return hasDelayedNodes;
    if (filterType === 'completed') return isCompleted;
    return true;
  });

  // Spawn from Template Action
  const handleCreateFromTemplate = (templateType: 'onboarding' | 'compliance' | 'cpr') => {
    let name = '';
    let description = '';
    let nodes: FlowNode[] = [];
    let edges: FlowEdge[] = [];
    
    if (templateType === 'onboarding') {
      name = 'Integração de Produtor';
      description = 'Processo visual de onboarding de novos produtores rurais';
      nodes = [
        {
          id: 'node-1',
          type: 'lead',
          name: 'Cadastro do Produtor',
          description: 'Inserção de dados cadastrais, e-mail e contatos primários',
          assignedTo: defaultParticipant,
          status: 'completed',
          priority: 'high',
          position: { x: 100, y: 150 },
          subtasks: [
            { id: 'sub-1', title: 'Nome completo e CPF/CNPJ válidos', completed: true, type: 'check' },
            { id: 'sub-2', title: 'Certificado de regularidade cadastral', completed: true, type: 'check' }
          ]
        },
        {
          id: 'node-2',
          type: 'task',
          name: 'Análise de Imóvel e CAR',
          description: 'Confrontar matrícula georreferenciada da fazenda',
          assignedTo: defaultParticipant,
          status: 'in_progress',
          priority: 'high',
          position: { x: 450, y: 150 },
          subtasks: [
            { id: 'sub-3', title: 'Extrair limite vetorial do CAR', completed: true, type: 'check' },
            { id: 'sub-4', title: 'Confrontar sobreposições territoriais', completed: false, type: 'check' }
          ]
        },
        {
          id: 'node-3',
          type: 'decision',
          name: 'Território Regular?',
          description: 'Bifurcação dependendo da consistência das matrículas da fazenda',
          assignedTo: defaultParticipant,
          status: 'pending',
          priority: 'critical',
          position: { x: 800, y: 150 }
        },
        {
          id: 'node-4',
          type: 'document',
          name: 'Emitir Contrato BMV',
          description: 'Geração e envio da minuta jurídica de filiação',
          assignedTo: defaultParticipant,
          status: 'pending',
          priority: 'medium',
          position: { x: 1150, y: 50 },
          subtasks: [
            { id: 'sub-5', title: 'Obter assinatura da diretoria', completed: false, type: 'check' }
          ]
        },
        {
          id: 'node-5',
          type: 'notification',
          name: 'Comunicar Reprovação',
          description: 'Notificar o produtor sobre inconsistências territoriais',
          assignedTo: defaultParticipant,
          status: 'pending',
          priority: 'medium',
          position: { x: 1150, y: 280 }
        },
        {
          id: 'node-6',
          type: 'done',
          name: 'Produtor Homologado',
          description: 'Processo concluído com êxito. Produtor habilitado.',
          assignedTo: defaultParticipant,
          status: 'pending',
          priority: 'low',
          position: { x: 1500, y: 50 }
        }
      ];
      edges = [
        { id: 'edge-1-2', source: 'node-1', target: 'node-2' },
        { id: 'edge-2-3', source: 'node-2', target: 'node-3' },
        { id: 'edge-3-4', source: 'node-3', target: 'node-4', label: 'Sim' },
        { id: 'edge-3-5', source: 'node-3', target: 'node-5', label: 'Não' },
        { id: 'edge-4-6', source: 'node-4', target: 'node-6' }
      ];
    } else if (templateType === 'compliance') {
      name = 'Funil de Compliance e Auditoria';
      description = 'Auditoria das UCSs e emissão de laudo técnico';
      nodes = [
        {
          id: 'node-c1',
          type: 'document',
          name: 'Inventário Florestal',
          description: 'Compilação de biomassa e estimativa de créditos de carbono',
          assignedTo: defaultParticipant,
          status: 'completed',
          priority: 'high',
          position: { x: 100, y: 150 }
        },
        {
          id: 'node-c2',
          type: 'approval',
          name: 'Assinatura do Laudo Técnico',
          description: 'Etapa que requer o crivo do comitê auditor',
          assignedTo: defaultParticipant,
          status: 'in_progress',
          priority: 'critical',
          position: { x: 450, y: 150 }
        },
        {
          id: 'node-c3',
          type: 'done',
          name: 'Certificação Emitida',
          description: 'Processo de certificação finalizado',
          assignedTo: defaultParticipant,
          status: 'pending',
          priority: 'low',
          position: { x: 800, y: 150 }
        }
      ];
      edges = [
        { id: 'edge-c1-c2', source: 'node-c1', target: 'node-c2' },
        { id: 'edge-c2-c3', source: 'node-c2', target: 'node-c3' }
      ];
    } else {
      name = 'Validação de CPR Verde';
      description = 'Auditoria de títulos financeiros CPR';
      nodes = [
        {
          id: 'node-cpr1',
          type: 'waiting',
          name: 'Aguardando Emissão',
          description: 'Aguardar registro da CPR Verde em cartório ou no banco',
          assignedTo: defaultParticipant,
          status: 'in_progress',
          priority: 'medium',
          position: { x: 100, y: 150 }
        },
        {
          id: 'node-cpr2',
          type: 'task',
          name: 'Verificar Lastro UCS',
          description: 'Asegurar que as UCSs vinculadas estão bloqueadas para o título',
          assignedTo: defaultParticipant,
          status: 'pending',
          priority: 'high',
          position: { x: 450, y: 150 }
        },
        {
          id: 'node-cpr3',
          type: 'done',
          name: 'CPR Verde Homologada',
          description: 'Lastro validado e CPR liberada operacionalmente',
          assignedTo: defaultParticipant,
          status: 'pending',
          priority: 'medium',
          position: { x: 800, y: 150 }
        }
      ];
      edges = [
        { id: 'edge-cpr1-cpr2', source: 'node-cpr1', target: 'node-cpr2' },
        { id: 'edge-cpr2-cpr3', source: 'node-cpr2', target: 'node-cpr3' }
      ];
    }

    const newFlowId = addFlow(name, description, '', [defaultParticipant]);
    updateFlow(newFlowId, { nodes, edges });
  };

  const handleSaveFlow = () => {
    if (!editingFlow.name) return;
    if (editingFlow.id) {
      updateFlow(editingFlow.id, editingFlow);
    } else {
      addFlow(editingFlow.name, editingFlow.description, editingFlow.deadline, editingFlow.participants);
    }
    setIsFlowModalOpen(false);
    setEditingFlow({});
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      <Sidebar />

      {/* PAINEL ESQUERDO: LISTA & CATEGORIAS */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-slate-200 shrink-0 gap-3">
          <Layers className="w-5 h-5 text-indigo-650" />
          <div>
            <h2 className="font-black text-sm tracking-wide text-slate-900 uppercase">Processos e Leads</h2>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar fluxos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Filter badges */}
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'delayed', label: 'Atrasados' },
              { id: 'completed', label: 'Feitos' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border",
                  filterType === f.id 
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Spawners (Templates) */}
        <div className="p-4 border-b border-slate-100 space-y-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Modelos Rápidos
          </span>
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <button 
              onClick={() => handleCreateFromTemplate('onboarding')}
              className="w-full text-left px-3 py-2 bg-indigo-50/50 border border-indigo-100/60 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">P</div>
              <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wide truncate">Cadastro Produtor</span>
            </button>
            <button 
              onClick={() => handleCreateFromTemplate('compliance')}
              className="w-full text-left px-3 py-2 bg-emerald-50/50 border border-emerald-100/60 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">C</div>
              <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wide truncate">Compliance & Auditoria</span>
            </button>
            <button 
              onClick={() => handleCreateFromTemplate('cpr')}
              className="w-full text-left px-3 py-2 bg-amber-50/50 border border-amber-100/60 rounded-xl hover:bg-amber-50 transition-colors flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-[10px] font-black">V</div>
              <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wide truncate">Validação de CPR</span>
            </button>
          </div>
        </div>

        {/* Flows List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Seus Processos</span>
          {filteredFlows.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-wide border border-dashed border-slate-200 rounded-2xl p-4">
              Nenhum fluxo encontrado.
            </div>
          ) : (
            filteredFlows.map(flow => {
              const hasDelayed = flow.nodes.some(node => {
                if (!node.deadline || node.status === 'completed') return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const parts = node.deadline.split('-');
                if (parts.length !== 3) return false;
                const deadlineDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                return deadlineDate < today;
              });

              return (
                <button
                  key={flow.id}
                  onClick={() => setActiveFlowId(flow.id)}
                  className={cn(
                    "w-full flex flex-col p-4 rounded-2xl transition-all border text-left space-y-1.5",
                    flow.id === activeFlowId 
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10" 
                      : "bg-slate-50/50 border-slate-150 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <span className="text-xs font-black uppercase tracking-tight truncate flex-1 leading-snug">
                      {flow.name}
                    </span>
                    {hasDelayed && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-0.5" title="Tarefas em atraso!" />
                    )}
                  </div>
                  
                  {flow.description && (
                    <p className={cn(
                      "text-[9px] line-clamp-1 font-medium",
                      flow.id === activeFlowId ? "text-slate-300" : "text-slate-400"
                    )}>
                      {flow.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>{flow.nodes.length} cards</span>
                    <span className={flow.id === activeFlowId ? "text-white" : "text-slate-900"}>
                      {flow.nodes.length > 0 
                        ? Math.round((flow.nodes.filter(n => n.status === 'completed').length / flow.nodes.length) * 100) 
                        : 0}%
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* New Flow Trigger */}
        <div className="p-4 border-t border-slate-200">
          <Button
            onClick={() => { setEditingFlow({ participants: [defaultParticipant] }); setIsFlowModalOpen(true); }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider h-11 rounded-xl shadow-md shadow-slate-900/10"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Processo
          </Button>
        </div>
      </aside>

      {/* CANVAS CENTRAL */}
      <main className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Header */}
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-slate-200 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            {activeFlowId && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setActiveFlowId(null)}
                      className="rounded-full hover:bg-slate-100"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6} className="bg-slate-900 border-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 shadow-xl rounded-lg">
                    Voltar para lista de processos
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                {activeFlow ? activeFlow.name : 'Seus Processos de Trabalho'}
              </h1>
              {activeFlow && (
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Equipe: {activeFlow.participants.join(', ')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {activeFlow && (
               <Button 
                  onClick={() => { setEditingFlow(activeFlow); setIsFlowModalOpen(true); }}
                  variant="outline"
                  className="border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider h-10 rounded-xl px-4"
               >
                  <Edit2 className="w-3.5 h-3.5 mr-2" /> Configurações
               </Button>
             )}
          </div>
        </header>

        {/* Dynamic Area */}
        <div className="flex-1 relative overflow-hidden">
          {!activeFlow ? (
            /* HUB GRID VIEW */
            <div className="p-12 overflow-y-auto h-full max-w-6xl mx-auto space-y-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <FolderOpen className="w-6 h-6 text-indigo-650" /> Selecione ou Crie um Fluxo Operacional
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Gerencie onboarding, auditoria, compliance e leads de forma visual e estruturada.
                </p>
              </div>

              {/* Grid of existing processes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flows.map(flow => {
                  const completedCount = flow.nodes.filter(n => n.status === 'completed').length;
                  const total = flow.nodes.length;
                  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
                  
                  return (
                    <div 
                      key={flow.id}
                      onClick={() => setActiveFlowId(flow.id)}
                      className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between h-56"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="bg-slate-100 text-slate-700 text-[8px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider border border-slate-200">
                            {total} Cards
                          </span>
                          <span className="text-[10px] font-black text-indigo-650 uppercase">{progress}% Concluído</span>
                        </div>
                        
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight leading-snug line-clamp-2">
                          {flow.name}
                        </h3>

                        {flow.description && (
                          <p className="text-[10px] font-medium text-slate-400 line-clamp-2 leading-relaxed">
                            {flow.description}
                          </p>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5 pt-4 border-t border-slate-50">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty state add flow card */}
                <div 
                  onClick={() => { setEditingFlow({ participants: [defaultParticipant] }); setIsFlowModalOpen(true); }}
                  className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-slate-350 hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center text-center p-6 h-56 group"
                >
                  <div className="w-12 h-12 bg-white border border-slate-150 rounded-2xl flex items-center justify-center shadow-sm mb-3 group-hover:scale-105 transition-transform text-slate-400 group-hover:text-slate-650">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-600">Novo Fluxo</h4>
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">Clique para começar</p>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE CANVAS VIEW */
            <ReactFlowProvider>
              <WorkflowCanvas />
            </ReactFlowProvider>
          )}
        </div>
      </main>

      {/* PAINEL CONTEXTUAL DIREITO */}
      {selectedNodeId && <DetailPanel />}

      {/* MODAL CONFIGURAÇÃO FLUXO */}
      <FlowModal 
        isOpen={isFlowModalOpen}
        editingFlow={editingFlow}
        participantsInput={participantsInput}
        setParticipantsInput={setParticipantsInput}
        onClose={() => setIsFlowModalOpen(false)}
        setEditingFlow={setEditingFlow}
        handleAddParticipant={() => {
          const p = participantsInput.trim();
          if (p && !editingFlow.participants?.includes(p)) {
            setEditingFlow({ ...editingFlow, participants: [...(editingFlow.participants || []), p] });
            setParticipantsInput("");
          }
        }}
        handleRemoveParticipant={(p) => setEditingFlow({ ...editingFlow, participants: editingFlow.participants?.filter((x: string) => x !== p) })}
        handleSaveFlow={handleSaveFlow}
        generateId={() => Math.random().toString(36).substring(2, 11)}
      />
    </div>
  );
}
