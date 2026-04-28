import React from 'react';
import { NodeCard } from './NodeCard';
import { FlowNode, NodeStatus } from './types';
import { ChevronDown, CornerDownRight } from 'lucide-react';

interface WorkflowTreeProps {
  nodes: FlowNode[];
  onNodeClick: (node: FlowNode) => void;
  onAddNext: (parentId: string | undefined) => void;
  onAddChild: (parentId: string) => void;
  onStatusChange: (nodeId: string, status: string) => void;
  formatDateBR: (date: string) => string;
}

export const WorkflowTree: React.FC<WorkflowTreeProps> = ({
  nodes,
  onNodeClick,
  onAddNext,
  onAddChild,
  onStatusChange,
  formatDateBR
}) => {
  // Encontrar nós raízes (sem pai)
  const rootNodes = nodes.filter(n => !n.parentId);

  const renderBranch = (parentId: string, depth: number = 0) => {
    const children = nodes.filter(n => n.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className="flex flex-col gap-8 ml-12 mt-8 relative">
        {/* Linha conectora vertical */}
        <div className="absolute -left-6 top-0 bottom-10 w-0.5 bg-slate-200" />
        
        {children.map(child => (
          <div key={child.id} className="relative">
            {/* Linha conectora horizontal (L-shape) */}
            <div className="absolute -left-6 top-10 w-6 h-0.5 bg-slate-200" />
            <div className="flex items-start gap-4">
               <NodeCard 
                  node={child}
                  onClick={() => onNodeClick(child)}
                  onAddNext={(e) => { e.stopPropagation(); onAddNext(child.parentId); }}
                  onAddChild={(e) => { e.stopPropagation(); onAddChild(child.id); }}
                  onStatusChange={(e, status) => { e.stopPropagation(); onStatusChange(child.id, status); }}
                  formatDateBR={formatDateBR}
               />
            </div>
            {renderBranch(child.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-12 pb-32">
      {rootNodes.map(node => (
        <div key={node.id} className="flex flex-col">
          <div className="flex items-start gap-4">
            <NodeCard 
              node={node}
              onClick={() => onNodeClick(node)}
              onAddNext={(e) => { e.stopPropagation(); onAddNext(undefined); }}
              onAddChild={(e) => { e.stopPropagation(); onAddChild(node.id); }}
              onStatusChange={(e, status) => { e.stopPropagation(); onStatusChange(node.id, status); }}
              formatDateBR={formatDateBR}
            />
          </div>
          {renderBranch(node.id)}
        </div>
      ))}
    </div>
  );
};
