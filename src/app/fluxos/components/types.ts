import { LucideIcon } from 'lucide-react';

export type NodeStatus = 'pending' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  type?: 'boolean' | 'text' | 'check'; // Tipo de resposta
  value?: string; // Valor da resposta
}

export interface NodeAttachment {
  id: string;
  title: string;
  url: string;
}

export interface NodeLog {
  id: string;
  user: string;
  action: string;
  message?: string;
  timestamp: string; // ISO string
}

export interface FlowNode {
  id: string;
  name: string;
  description: string;
  type: string;
  assignedTo: string;
  deadline?: string;
  status: NodeStatus;
  subtasks?: Subtask[];
  attachments?: NodeAttachment[];
  comments?: string;
  parentId?: string;
  automationRules?: {
    condition: string;
    action: string;
  }[];
  requiredFiles?: string[];
  structuredData?: {
    title: string;
    headers: string[];
    rows: string[][];
  }[];
  logs?: NodeLog[];
}

export interface FlowLink {
  id: string;
  title: string;
  url: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  deadline?: string;
  participants: string[];
  nodes: FlowNode[];
  links?: FlowLink[];
}
