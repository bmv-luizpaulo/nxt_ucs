"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  LayoutTemplate,
  AlertTriangle,
  Calendar,
  Loader2,
  ArrowLeft,
  Edit2,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

// Componentes Extraídos
import { Flow, FlowNode, NodeStatus } from './components/types';
import { NodeModal } from './components/NodeModal';
import { FlowModal } from './components/FlowModal';
import { WorkflowTree } from './components/WorkflowTree';

const LOCAL_STORAGE_KEY = "bmv_flows";

// --- UTILITÁRIOS ---
const formatDateBR = (dateStr: string) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

const isDelayed = (deadline?: string, status?: NodeStatus) => {
  if (!deadline || status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateParts = deadline.split('-');
  if (dateParts.length !== 3) return false;
  const nodeDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
  return nodeDate < today;
};

const hasDelayedNodes = (nodes: FlowNode[]) => {
  return nodes.some(node => isDelayed(node.deadline, node.status));
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function BmvFluxosPage() {
  const { user } = useUser();
  const defaultParticipant = user?.displayName || user?.email?.split('@')[0] || "Eu";

  const db = useFirestore();
  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: realUsers } = useCollection(usersQuery);

  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  // Modais State
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  // Edição State
  const [editingFlow, setEditingFlow] = useState<Partial<Flow>>({});
  const [editingNode, setEditingNode] = useState<Partial<FlowNode>>({});
  const [participantsInput, setParticipantsInput] = useState("");

  // Persistência
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFlows(parsed);
        if (parsed.length > 0 && !activeFlowId) setActiveFlowId(parsed[0].id);
      } catch (e) { console.error("Error loading flows", e); }
    }
  }, []);

  useEffect(() => {
    if (flows.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flows));
    }
  }, [flows]);

  const activeFlow = flows.find(f => f.id === activeFlowId);

  // --- HANDLERS FLUXO ---
  const handleSaveFlow = () => {
    if (!editingFlow.name) return;
    if (editingFlow.id) {
      setFlows(prev => prev.map(f => f.id === editingFlow.id ? { ...f, ...editingFlow } as Flow : f));
    } else {
      const newFlow: Flow = {
        id: generateId(),
        name: editingFlow.name,
        description: editingFlow.description,
        deadline: editingFlow.deadline,
        participants: editingFlow.participants || [],
        nodes: []
      };
      setFlows(prev => [...prev, newFlow]);
      setActiveFlowId(newFlow.id);
    }
    setIsFlowModalOpen(false);
    setEditingFlow({});
  };

  // --- HANDLERS NODE ---
  const handleSaveNode = () => {
    if (!activeFlowId || !editingNode.name || !editingNode.assignedTo) return;

    let savedNode: FlowNode;

    if (editingNode.id) {
      // Atualizar
      savedNode = { ...editingNode } as FlowNode;
      setFlows(prev => prev.map(f => {
        if (f.id === activeFlowId) {
          return {
            ...f,
            nodes: f.nodes.map(n => n.id === editingNode.id ? savedNode : n)
          };
        }
        return f;
      }));
      setIsNodeModalOpen(false); // Fecha ao editar existente
    } else {
      // Criar
      savedNode = {
        id: generateId(),
        name: editingNode.name,
        description: editingNode.description || "",
        type: editingNode.type || "manual",
        assignedTo: editingNode.assignedTo,
        deadline: editingNode.deadline,
        status: editingNode.status || 'pending',
        subtasks: editingNode.subtasks || [],
        attachments: editingNode.attachments || [],
        comments: editingNode.comments || "",
        parentId: editingNode.parentId
      };
      setFlows(prev => prev.map(f => {
        if (f.id === activeFlowId) return { ...f, nodes: [...f.nodes, savedNode] };
        return f;
      }));
      
      // MANTÉM ABERTO E VAI PARA EXECUÇÃO
      setEditingNode(savedNode);
      setIsEditingDetails(false);
    }
  };

  const handleNodeStatusChange = (nodeId: string, newStatus: string) => {
    setFlows(prev => prev.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => n.id === nodeId ? { ...n, status: newStatus as NodeStatus } : n)
        };
      }
      return f;
    }));
  };

  return (
    <div className="flex h-screen bg-[#F4F7F6] font-sans text-slate-800 overflow-hidden">
      <Sidebar />

      {/* SIDEBAR DO FLUXO (DIREITA) */}
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col z-20 shrink-0 order-last">
        <div className="h-20 flex items-center px-6 border-b border-slate-200 shrink-0 gap-3">
          <LayoutTemplate className="w-5 h-5 text-slate-600" />
          <div>
            <h2 className="font-black text-sm tracking-wide text-slate-900 uppercase">Gestão de Fluxos</h2>
          </div>
        </div>
        <div className="p-4 shrink-0">
          <Button
            onClick={() => { setEditingFlow({ participants: [defaultParticipant] }); setIsFlowModalOpen(true); }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs h-12 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Fluxo
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {flows.map(flow => (
            <button
              key={flow.id}
              onClick={() => setActiveFlowId(flow.id)}
              className={cn(
                "w-full flex flex-col p-4 rounded-xl transition-all border text-left",
                flow.id === activeFlowId ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200"
              )}
            >
              <span className="text-sm font-bold truncate">{flow.name}</span>
              {hasDelayedNodes(flow.nodes) && <span className="text-[9px] text-red-400 font-black mt-1">● TAREFAS ATRASADAS</span>}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">
        {/* HEADER DINÂMICO */}
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-slate-200 shrink-0 z-30">
          <div className="flex items-center gap-4">
            {activeFlowId && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveFlowId(null)}
                className="rounded-full hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </Button>
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {activeFlow ? activeFlow.name : 'Seus Fluxos de Trabalho'}
              </h1>
              {activeFlow && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {activeFlow.participants.join(', ')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {activeFlow ? (
               <Button 
                  onClick={() => { setEditingNode({ status: 'pending' }); setIsEditingDetails(true); setIsNodeModalOpen(true); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs h-11 rounded-xl px-6 shadow-lg shadow-blue-100"
               >
                  <Plus className="w-4 h-4 mr-2" /> Nova Etapa Raiz
               </Button>
             ) : (
               <Button 
                  onClick={() => { setEditingFlow({ participants: [defaultParticipant] }); setIsFlowModalOpen(true); }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs h-11 rounded-xl px-6 shadow-xl"
               >
                  <Plus className="w-4 h-4 mr-2" /> Novo Fluxo
               </Button>
             )}
          </div>
        </header>

        {/* CONTEÚDO DINÂMICO: HUB OU CANVAS */}
        <div className="flex-1 overflow-auto p-12 bg-[#F8FAFC]">
          {!activeFlow ? (
            /* HUB DE FLUXOS (GRID) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {flows.map(flow => {
                const hasDelayed = hasDelayedNodes(flow.nodes);
                const completedCount = flow.nodes.filter(n => n.status === 'completed').length;
                
                return (
                  <div 
                    key={flow.id}
                    onClick={() => setActiveFlowId(flow.id)}
                    className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-[280px] relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <LayoutTemplate className="w-24 h-24 text-slate-900 rotate-12" />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", hasDelayed ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                           {hasDelayed ? 'Atenção: Atrasos' : 'Em Dia'}
                         </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900" onClick={(e) => { e.stopPropagation(); setEditingFlow(flow); setIsFlowModalOpen(true); }}>
                           <Edit2 className="w-4 h-4" />
                         </Button>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 uppercase leading-tight line-clamp-2">
                        {flow.name}
                      </h3>

                      <div className="flex -space-x-2">
                        {flow.participants.slice(0, 3).map((p, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-400" title={p}>
                            {p.charAt(0)}
                          </div>
                        ))}
                        {flow.participants.length > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                            +{flow.participants.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50 mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
                        <span className="text-[10px] font-black text-slate-900 uppercase">{flow.nodes.length > 0 ? Math.round((completedCount/flow.nodes.length)*100) : 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${flow.nodes.length > 0 ? (completedCount/flow.nodes.length)*100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* CARD DE ADICIONAR NO HUB */}
              <div 
                onClick={() => { setEditingFlow({ participants: [defaultParticipant] }); setIsFlowModalOpen(true); }}
                className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center hover:bg-white hover:border-slate-300 transition-all cursor-pointer group h-[280px]"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                   <Plus className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Novo Fluxo</h3>
              </div>
            </div>
          ) : (
            /* VISÃO DO CANVAS (workflow tree) */
            <WorkflowTree 
              nodes={activeFlow.nodes}
              onNodeClick={(node) => { setEditingNode(node); setIsEditingDetails(false); setIsNodeModalOpen(true); }}
              onAddNext={(parentId) => { setEditingNode({ parentId, status: 'pending' }); setIsEditingDetails(true); setIsNodeModalOpen(true); }}
              onAddChild={(nodeId) => { setEditingNode({ parentId: nodeId, status: 'pending' }); setIsEditingDetails(true); setIsNodeModalOpen(true); }}
              onStatusChange={handleNodeStatusChange}
              formatDateBR={formatDateBR}
            />
          )}
        </div>
      </main>

      {/* MODAIS COMPONENTIZADOS */}
      <NodeModal 
        isOpen={isNodeModalOpen}
        editingNode={editingNode}
        isEditingDetails={isEditingDetails}
        activeFlow={activeFlow}
        onClose={() => setIsNodeModalOpen(false)}
        setEditingNode={setEditingNode}
        setIsEditingDetails={setIsEditingDetails}
        handleSaveNode={handleSaveNode}
        generateId={generateId}
        activeFlowId={activeFlowId}
        setFlows={setFlows}
        formatDateBR={formatDateBR}
      />

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
              setEditingFlow({...editingFlow, participants: [...(editingFlow.participants || []), p]});
              setParticipantsInput("");
           }
        }}
        handleRemoveParticipant={(p) => setEditingFlow({...editingFlow, participants: editingFlow.participants?.filter(x => x !== p)})}
        handleSaveFlow={handleSaveFlow}
        generateId={generateId}
      />
    </div>
  );
}
