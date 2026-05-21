import { create } from 'zustand';
import { Flow, FlowNode, FlowEdge, NodeLog, Comment, Subtask } from './types';

interface FlowState {
  flows: Flow[];
  activeFlowId: string | null;
  selectedNodeId: string | null;
  
  // Actions
  loadFlows: () => void;
  setActiveFlowId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  
  // Flow management
  addFlow: (name: string, description?: string, deadline?: string, participants?: string[]) => string;
  updateFlow: (flowId: string, updates: Partial<Flow>) => void;
  deleteFlow: (flowId: string) => void;
  
  // Node management
  addNode: (node: Omit<FlowNode, 'id'>) => string;
  updateNodes: (nodes: FlowNode[]) => void;
  updateNodeDetail: (nodeId: string, updates: Partial<FlowNode>) => void;
  deleteNode: (nodeId: string) => void;
  
  // Edge management
  addEdge: (edge: Omit<FlowEdge, 'id'>) => void;
  updateEdges: (edges: FlowEdge[]) => void;
  deleteEdge: (edgeId: string) => void;
  
  // Subtasks & Comments
  addSubtask: (nodeId: string, title: string, type: 'check' | 'text' | 'boolean') => void;
  toggleSubtask: (nodeId: string, subtaskId: string) => void;
  updateSubtaskValue: (nodeId: string, subtaskId: string, value: string) => void;
  deleteSubtask: (nodeId: string, subtaskId: string) => void;
  
  addComment: (nodeId: string, author: string, text: string) => void;
  addLog: (nodeId: string, user: string, action: string, message?: string) => void;
}

const LOCAL_STORAGE_KEY = "bmv_flows";

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function migrateFlow(flow: Flow): Flow {
  const nodes = [...(flow.nodes || [])];
  const edges = flow.edges ? [...flow.edges] : [];

  // Assign position if missing
  const visited = new Set<string>();
  const layoutNode = (nodeId: string, x: number, y: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || visited.has(nodeId)) return;
    visited.add(nodeId);
    
    if (!node.position) {
      node.position = { x, y };
    }
    
    const children = nodes.filter(n => n.parentId === nodeId);
    children.forEach((child, index) => {
      const childX = x + (index - (children.length - 1) / 2) * 340;
      const childY = y + 200;
      layoutNode(child.id, childX, childY);
    });
  };

  const rootNodes = nodes.filter(n => !n.parentId);
  rootNodes.forEach((root, index) => {
    layoutNode(root.id, 350 + index * 400, 100);
  });

  nodes.forEach((n, idx) => {
    if (!n.position) {
      n.position = { x: 200, y: 100 + idx * 160 };
    }
  });

  // Generate edges if missing and parentId is present
  nodes.forEach(node => {
    if (node.parentId) {
      const parentNode = nodes.find(n => n.id === node.parentId);
      if (parentNode) {
        const edgeExists = edges.some(e => e.source === node.parentId && e.target === node.id);
        if (!edgeExists) {
          edges.push({
            id: `edge-${node.parentId}-${node.id}`,
            source: node.parentId,
            target: node.id,
            animated: parentNode.status === 'in_progress'
          });
        }
      }
    }
  });

  return {
    ...flow,
    nodes,
    edges
  };
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  activeFlowId: null,
  selectedNodeId: null,

  loadFlows: () => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Flow[];
        const migrated = parsed.map(migrateFlow);
        set({ flows: migrated });
        if (migrated.length > 0 && !get().activeFlowId) {
          set({ activeFlowId: migrated[0].id });
        }
      } catch (e) {
        console.error("Error loading flows from localStorage", e);
      }
    }
  },

  setActiveFlowId: (id) => set({ activeFlowId: id, selectedNodeId: null }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  addFlow: (name, description, deadline, participants = []) => {
    const newFlowId = generateId();
    const newFlow: Flow = {
      id: newFlowId,
      name,
      description,
      deadline,
      participants,
      nodes: [],
      edges: []
    };
    
    const nextFlows = [...get().flows, newFlow];
    set({ flows: nextFlows, activeFlowId: newFlowId, selectedNodeId: null });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
    return newFlowId;
  },

  updateFlow: (flowId, updates) => {
    const nextFlows = get().flows.map(f => f.id === flowId ? { ...f, ...updates } : f);
    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  deleteFlow: (flowId) => {
    const nextFlows = get().flows.filter(f => f.id !== flowId);
    const nextActive = get().activeFlowId === flowId 
      ? (nextFlows.length > 0 ? nextFlows[0].id : null)
      : get().activeFlowId;
    set({ flows: nextFlows, activeFlowId: nextActive, selectedNodeId: null });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  addNode: (nodeData) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return '';
    const newNodeId = generateId();
    const newNode: FlowNode = {
      ...nodeData,
      id: newNodeId,
      subtasks: nodeData.subtasks || [],
      attachments: nodeData.attachments || [],
      commentsList: nodeData.commentsList || [],
      logs: [{
        id: generateId(),
        user: nodeData.assignedTo || 'Sistema',
        action: 'Criou o cartão',
        timestamp: new Date().toISOString()
      }]
    };

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: [...f.nodes, newNode]
        };
      }
      return f;
    });

    set({ flows: nextFlows, selectedNodeId: newNodeId });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
    return newNodeId;
  },

  updateNodes: (nodes) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return { ...f, nodes };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  updateNodeDetail: (nodeId, updates) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => {
            if (n.id === nodeId) {
              const logs = [...(n.logs || [])];
              if (updates.status && updates.status !== n.status) {
                logs.push({
                  id: generateId(),
                  user: updates.assignedTo || n.assignedTo || 'Colaborador',
                  action: 'Alterou status',
                  message: `Para ${updates.status === 'completed' ? 'Concluído' : updates.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}`,
                  timestamp: new Date().toISOString()
                });
              }
              return { ...n, ...updates, logs };
            }
            return n;
          })
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  deleteNode: (nodeId) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.filter(n => n.id !== nodeId),
          edges: (f.edges || []).filter(e => e.source !== nodeId && e.target !== nodeId)
        };
      }
      return f;
    });

    const nextSelected = get().selectedNodeId === nodeId ? null : get().selectedNodeId;
    set({ flows: nextFlows, selectedNodeId: nextSelected });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  addEdge: (edgeData) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;
    const newEdge: FlowEdge = {
      ...edgeData,
      id: `edge-${generateId()}`
    };

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          edges: [...(f.edges || []), newEdge]
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  updateEdges: (edges) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return { ...f, edges };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  deleteEdge: (edgeId) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          edges: (f.edges || []).filter(e => e.id !== edgeId)
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  addSubtask: (nodeId, title, type) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;
    const newSub: Subtask = {
      id: generateId(),
      title,
      completed: false,
      type
    };

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => {
            if (n.id === nodeId) {
              const subtasks = [...(n.subtasks || []), newSub];
              const logs = [...(n.logs || []), {
                id: generateId(),
                user: n.assignedTo || 'Sistema',
                action: 'Adicionou sub-etapa',
                message: `"${title}"`,
                timestamp: new Date().toISOString()
              }];
              return { ...n, subtasks, logs };
            }
            return n;
          })
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  toggleSubtask: (nodeId, subtaskId) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => {
            if (n.id === nodeId) {
              let actionTitle = '';
              let completedState = false;
              const subtasks = (n.subtasks || []).map(s => {
                if (s.id === subtaskId) {
                  actionTitle = s.title;
                  completedState = !s.completed;
                  return { ...s, completed: !s.completed };
                }
                return s;
              });

              const logs = [...(n.logs || []), {
                id: generateId(),
                user: n.assignedTo || 'Sistema',
                action: completedState ? 'Concluiu sub-etapa' : 'Marcou sub-etapa pendente',
                message: `"${actionTitle}"`,
                timestamp: new Date().toISOString()
              }];

              return { ...n, subtasks, logs };
            }
            return n;
          })
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  updateSubtaskValue: (nodeId, subtaskId, value) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => {
            if (n.id === nodeId) {
              const subtasks = (n.subtasks || []).map(s => {
                if (s.id === subtaskId) {
                  return { ...s, value };
                }
                return s;
              });
              return { ...n, subtasks };
            }
            return n;
          })
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  deleteSubtask: (nodeId, subtaskId) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => {
            if (n.id === nodeId) {
              let actionTitle = '';
              const subtasks = (n.subtasks || []).filter(s => {
                if (s.id === subtaskId) {
                  actionTitle = s.title;
                  return false;
                }
                return true;
              });

              const logs = [...(n.logs || []), {
                id: generateId(),
                user: n.assignedTo || 'Sistema',
                action: 'Excluiu sub-etapa',
                message: `"${actionTitle}"`,
                timestamp: new Date().toISOString()
              }];

              return { ...n, subtasks, logs };
            }
            return n;
          })
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  addComment: (nodeId, author, text) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;
    const newComment: Comment = {
      id: generateId(),
      author,
      text,
      timestamp: new Date().toISOString()
    };

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => {
            if (n.id === nodeId) {
              const commentsList = [...(n.commentsList || []), newComment];
              const logs = [...(n.logs || []), {
                id: generateId(),
                user: author,
                action: 'Adicionou comentário',
                message: text.length > 30 ? `"${text.substring(0, 30)}..."` : `"${text}"`,
                timestamp: new Date().toISOString()
              }];
              return { ...n, commentsList, logs };
            }
            return n;
          })
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  },

  addLog: (nodeId, user, action, message) => {
    const activeFlowId = get().activeFlowId;
    if (!activeFlowId) return;
    const newLog: NodeLog = {
      id: generateId(),
      user,
      action,
      message,
      timestamp: new Date().toISOString()
    };

    const nextFlows = get().flows.map(f => {
      if (f.id === activeFlowId) {
        return {
          ...f,
          nodes: f.nodes.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                logs: [...(n.logs || []), newLog]
              };
            }
            return n;
          })
        };
      }
      return f;
    });

    set({ flows: nextFlows });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextFlows));
  }
}));
