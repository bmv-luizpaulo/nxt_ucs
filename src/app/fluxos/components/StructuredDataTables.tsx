import React from 'react';
import { FileSpreadsheet, Trash2, PlusCircle, Trash } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { FlowNode } from './types';

interface StructuredDataTablesProps {
  editingNode: Partial<FlowNode>;
  updateTable: (tIdx: number, updater: (table: { title: string; headers: string[]; rows: string[][] }) => { title: string; headers: string[]; rows: string[][] }) => void;
  setEditingNode: (node: Partial<FlowNode>) => void;
  setPasteModalOpen: (val: boolean) => void;
  setPasteTableName: (val: string) => void;
}

export const StructuredDataTables: React.FC<StructuredDataTablesProps> = ({
  editingNode,
  updateTable,
  setEditingNode,
  setPasteModalOpen,
  setPasteTableName
}) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Tabelas e Listas
        </h4>
        <Button 
          variant="outline" 
          onClick={() => { setPasteTableName(''); setPasteModalOpen(true); }}
          className="border-emerald-100 text-emerald-600 font-black text-[9px] uppercase tracking-widest h-8 px-4 rounded-lg bg-emerald-50/50 hover:bg-emerald-100"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Importar do Excel
        </Button>
      </div>

      <div className="space-y-12">
        {editingNode.structuredData?.map((table, tIdx) => (
          <div key={tIdx} className="space-y-4 group">
            <div className="flex items-center justify-between px-1">
              <input 
                value={table.title}
                onChange={e => {
                  const tables = [...(editingNode.structuredData || [])];
                  tables[tIdx].title = e.target.value;
                  setEditingNode({ ...editingNode, structuredData: tables });
                }}
                className="text-xs font-black uppercase tracking-wider text-slate-600 bg-transparent border-none outline-none focus:text-blue-600 transition-colors"
                placeholder="Nome da Tabela..."
              />
              <button 
                onClick={() => setEditingNode({ ...editingNode, structuredData: editingNode.structuredData?.filter((_, i) => i !== tIdx) })}
                className="text-[9px] font-bold text-red-400 opacity-0 group-hover:opacity-100 uppercase tracking-widest flex items-center gap-1 hover:text-red-600 transition-all"
              >
                <Trash className="w-3 h-3" /> Deletar Tabela
              </button>
            </div>
            
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {table.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-4 py-3 group/header">
                          <div className="flex items-center justify-between gap-2">
                            <input 
                              value={h}
                              onChange={e => updateTable(tIdx, t => {
                                t.headers[hIdx] = e.target.value;
                                return t;
                              })}
                              className="bg-transparent border-none text-[10px] font-black uppercase tracking-tight text-slate-400 w-full outline-none focus:text-blue-600"
                            />
                            <button onClick={() => updateTable(tIdx, t => {
                              t.headers = t.headers.filter((_, i) => i !== hIdx);
                              t.rows = t.rows.map(r => r.filter((_, i) => i !== hIdx));
                              return t;
                            })} className="opacity-0 group-hover/header:opacity-100 text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </th>
                      ))}
                      <th className="w-10 p-0 text-center">
                        <button onClick={() => updateTable(tIdx, t => {
                          t.headers.push(`Coluna ${t.headers.length + 1}`);
                          t.rows = t.rows.map(r => [...r, '']);
                          return t;
                        })} className="text-emerald-500 hover:scale-110 transition-transform"><PlusCircle className="w-4 h-4 mx-auto" /></button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group/row">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2">
                            <input 
                              value={cell}
                              onChange={e => updateTable(tIdx, t => {
                                t.rows[rIdx][cIdx] = e.target.value;
                                return t;
                              })}
                              className="w-full bg-transparent border-none text-xs font-medium text-slate-600 outline-none focus:text-blue-600"
                            />
                          </td>
                        ))}
                        <td className="px-2 text-center">
                          <button onClick={() => updateTable(tIdx, t => {
                            t.rows = t.rows.filter((_, i) => i !== rIdx);
                            return t;
                          })} className="opacity-0 group-hover/row:opacity-100 text-slate-200 hover:text-red-500 transition-all"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button 
                onClick={() => updateTable(tIdx, t => {
                  t.rows.push(new Array(t.headers.length).fill(''));
                  return t;
                })}
                className="w-full py-3 bg-slate-50/50 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 transition-all"
              >
                + Adicionar Linha
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
