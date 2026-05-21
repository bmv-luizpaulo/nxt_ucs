export type NodeStatus = 'pending' | 'in_progress' | 'completed';
export type NodePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  type?: 'check' | 'text' | 'boolean';
  value?: string;
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

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface StructuredTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface FlowNode {
  id: string;
  type: 'lead' | 'task' | 'decision' | 'approval' | 'waiting' | 'document' | 'meeting' | 'notification' | 'done';
  name: string;
  description: string;
  assignedTo: string;
  deadline?: string;
  priority?: NodePriority;
  status: NodeStatus;
  position?: { x: number; y: number };
  subtasks?: Subtask[];
  attachments?: NodeAttachment[];
  commentsList?: Comment[];
  comments?: string; // Kept for backward compatibility
  parentId?: string; // Kept for backward compatibility
  logs?: NodeLog[];
  structuredData?: StructuredTable[];
}

export interface FlowLink {
  id: string;
  title: string;
  url: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  deadline?: string;
  participants: string[];
  nodes: FlowNode[];
  edges?: FlowEdge[];
  links?: FlowLink[];
}
