import React from 'react';
import { Button } from "@/components/ui/button";
import { FlowNode } from '../types';

interface PasteTableModalProps {
  pasteModalOpen: boolean;
  setPasteModalOpen: (val: boolean) => void;
  pasteTableName: string;
  setPasteTableName: (val: string) => void;
  pasteText: string;
  setPasteText: (val: string) => void;
  editingNode: Partial<FlowNode>;
  setEditingNode: (node: Partial<FlowNode>) => void;
}

export const PasteTableModal: React.FC<PasteTableModalProps> = ({
  pasteModalOpen,
  setPasteModalOpen,
  pasteTableName,
  setPasteTableName,
  pasteText,
  setPasteText,
  editingNode,
  setEditingNode
}) => {
  if (!pasteModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Importar Tabela</h3>
          <p className="text-[10px] font-medium text-slate-400 mt-1">Cole os dados copiados do Excel abaixo (com cabeçalho na primeira linha)</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Nome da Tabela</label>
            <input 
              value={pasteTableName}
              onChange={e => setPasteTableName(e.target.value)}
              placeholder="ex: Transações Q1, Lista de Fazendas..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>
          <textarea 
            autoFocus
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            onPaste={e => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text');
              setPasteText(pasted);
            }}
            placeholder={'Nome\tIdade\tCidade\nJoão\t30\tSão Paulo\nMaria\t25\tRio'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all min-h-[200px] resize-y"
          />
          {pasteText && (
            <p className="text-[10px] font-bold text-emerald-600 mt-2">
              {pasteText.trim().split('\n').length} linhas detectadas
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <Button variant="ghost" onClick={() => setPasteModalOpen(false)} className="font-bold text-xs uppercase text-slate-400">
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              const text = pasteText.trim();
              if (text) {
                const lines = text.split('\n');
                if (lines.length > 0) {
                  const headers = lines[0].split('\t');
                  const rows = lines.slice(1).map(line => line.split('\t'));
                  setEditingNode({
                    ...editingNode,
                    structuredData: [...(editingNode.structuredData || []), { title: pasteTableName.trim() || `Lista ${new Date().toLocaleTimeString()}`, headers, rows }]
                  });
                }
              }
              setPasteModalOpen(false);
            }}
            disabled={!pasteText.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-6 rounded-xl shadow-lg disabled:opacity-40"
          >
            Importar
          </Button>
        </div>
      </div>
    </div>
  );
};
