import React, { useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useReactFlow, 
  applyNodeChanges, 
  applyEdgeChanges,
  Node,
  Edge,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore } from './useFlowStore';
import { CustomNode, NODE_CONFIGS } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { FlowNode, FlowEdge } from './types';
import { Button } from "@/components/ui/button";
import { Plus, Trash, Tag, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const nodeTypes = {
  lead: CustomNode,
  task: CustomNode,
  decision: CustomNode,
  approval: CustomNode,
  waiting: CustomNode,
  document: CustomNode,
  meeting: CustomNode,
  notification: CustomNode,
  done: CustomNode
};

const edgeTypes = {
  customEdge: CustomEdge
};

export const WorkflowCanvas: React.FC = () => {
  const activeFlowId = useFlowStore(s => s.activeFlowId);
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const flows = useFlowStore(s => s.flows);
  const activeFlow = useMemo(() => flows.find(f => f.id === activeFlowId), [flows, activeFlowId]);

  const updateNodes = useFlowStore(s => s.updateNodes);
  const updateEdges = useFlowStore(s => s.updateEdges);
  const setSelectedNodeId = useFlowStore(s => s.setSelectedNodeId);
  const addNode = useFlowStore(s => s.addNode);
  const addEdge = useFlowStore(s => s.addEdge);
  const deleteEdge = useFlowStore(s => s.deleteEdge);
  const updateEdge = useFlowStore(s => s.updateFlow); // fallback or inline updates

  const { screenToFlowPosition } = useReactFlow();

  // Map state nodes to React Flow format
  const rfNodes = useMemo(() => {
    if (!activeFlow) return [];
    return activeFlow.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 100, y: 100 },
      data: n as unknown as Record<string, unknown>,
    })) as Node[];
  }, [activeFlow]);

  // Map state edges to React Flow format
  const rfEdges = useMemo(() => {
    if (!activeFlow || !activeFlow.edges) return [];
    return activeFlow.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.animated,
      type: 'customEdge'
    })) as Edge[];
  }, [activeFlow]);

  // Handle nodes dragging & changing
  const onNodesChange = useCallback((changes: any) => {
    if (!activeFlow) return;
    const currentRF = rfNodes;
    const nextRF = applyNodeChanges(changes, currentRF);
    
    // Write back position & metadata
    const updatedNodes = nextRF.map(rn => {
      const original = activeFlow.nodes.find(n => n.id === rn.id);
      return {
        ...(original || rn.data),
        position: rn.position
      } as FlowNode;
    });
    
    updateNodes(updatedNodes);
  }, [activeFlow, rfNodes, updateNodes]);

  // Handle edges changing
  const onEdgesChange = useCallback((changes: any) => {
    if (!activeFlow || !activeFlow.edges) return;
    const currentEdges = activeFlow.edges;
    const nextEdges = applyEdgeChanges(changes, currentEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.animated,
      type: 'customEdge'
    }))) as unknown as FlowEdge[];

    updateEdges(nextEdges);
  }, [activeFlow, updateEdges]);

  // Handle connection draw
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    addEdge({
      source: connection.source,
      target: connection.target,
      label: '',
      animated: false
    });
  }, [addEdge]);

  // Handle node selection
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  // Handle canvas click to clear selection
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Spawn node logic
  const handleSpawnNode = (type: keyof typeof NODE_CONFIGS) => {
    if (!activeFlow) return;
    
    // Spawn in center of screen
    const x = window.innerWidth / 2 - 350;
    const y = window.innerHeight / 2 - 200;
    const flowPos = screenToFlowPosition({ x, y });

    const config = NODE_CONFIGS[type];
    const defaultName = `Novo(a) ${config.label}`;

    addNode({
      type,
      name: defaultName,
      description: '',
      assignedTo: activeFlow.participants[0] || 'Nenhum',
      status: 'pending',
      priority: 'medium',
      position: flowPos,
      subtasks: [],
      attachments: [],
      commentsList: [],
      logs: []
    });
  };

  // Change edge label trigger
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    if (!activeFlow || !activeFlow.edges) return;
    
    const currentLabel = edge.label || '';
    let nextLabel = '';
    
    if (currentLabel === '') nextLabel = 'Aprovado';
    else if (currentLabel === 'Aprovado') nextLabel = 'Recusado';
    else if (currentLabel === 'Recusado') nextLabel = 'Sim';
    else if (currentLabel === 'Sim') nextLabel = 'Não';
    else if (currentLabel === 'Não') nextLabel = 'Else';
    else if (currentLabel === 'Else') nextLabel = '';

    const updatedEdges = activeFlow.edges.map(e => {
      if (e.id === edge.id) {
        return { 
          ...e, 
          label: nextLabel,
          animated: nextLabel === 'Aprovado' || nextLabel === 'Sim'
        };
      }
      return e;
    });

    updateEdges(updatedEdges);
  }, [activeFlow, updateEdges]);

  // Delete edge on double click
  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    deleteEdge(edge.id);
  }, [deleteEdge]);

  if (!activeFlow) return null;

  return (
    <div className="w-full h-full relative bg-[#F8FAFC]">
      {/* Dynamic Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl z-10 flex items-center gap-2.5 border border-slate-200/80">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2.5 border-r border-slate-200 pr-3.5 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Adicionar Card
        </span>
        
        <TooltipProvider delayDuration={150}>
          {Object.entries(NODE_CONFIGS).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleSpawnNode(key as keyof typeof NODE_CONFIGS)}
                    className={`p-2 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white ${config.headerClass}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="bg-slate-900 border-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 shadow-xl rounded-lg">
                  Adicionar {config.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Floating Instructions/Help */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-150 text-[10px] space-y-1.5 z-10 max-w-[260px]">
        <h5 className="font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Dicas do Mural Visual
        </h5>
        <ul className="text-slate-400 font-medium space-y-1 list-disc pl-3">
          <li>Arraste e conecte os círculos das laterais para linkar cards.</li>
          <li><span className="font-bold text-slate-600">Clique na linha</span> para alterar a condição (ex: Aprovado/Recusado).</li>
          <li><span className="font-bold text-slate-600">Clique duas vezes na linha</span> para removê-la.</li>
          <li>Use scroll do mouse para Zoom e arraste o grid para navegar.</li>
        </ul>
      </div>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={handleEdgeClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background gap={20} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden" />
        <MiniMap 
          nodeColor={(n) => {
            const config = NODE_CONFIGS[n.type as keyof typeof NODE_CONFIGS];
            return config ? config.headerClass.includes('bg-slate') ? '#475569' : config.headerClass.includes('bg-emerald') ? '#10b981' : config.headerClass.includes('bg-indigo') ? '#4f46e5' : '#8b5cf6' : '#cbd5e1';
          }}
          className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden hidden md:block" 
        />
      </ReactFlow>
    </div>
  );
};
export default WorkflowCanvas;
