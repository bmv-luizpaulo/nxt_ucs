'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  Search, Shield, Users, UserCheck, ArrowRight,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';

interface PermissionItem {
  name: string;
  identifier: string;
  dependencies: number;
}

interface PermissionCategory {
  title: string;
  items: PermissionItem[];
}

const INITIAL_CATEGORIES: PermissionCategory[] = [
  {
    title: 'ADM - Bloqueio de UCS',
    items: [
      { name: 'Permite criar um novo bloqueio de UCS.', identifier: 'adm.blocked-ucs.add', dependencies: 1 },
      { name: 'Permite cancelar um bloqueio de UCS.', identifier: 'adm.blocked-ucs.delete', dependencies: 1 },
      { name: 'Permite listar os bloqueios de UCS ativos no sistema.', identifier: 'adm.blocked-ucs.list', dependencies: 0 },
      { name: 'Permite processar um bloqueio de UCS pendente.', identifier: 'adm.blocked-ucs.process', dependencies: 1 }
    ]
  },
  {
    title: 'ADM - CPR',
    items: [
      { name: 'Permite listar e gerenciar as CPRs Verdes.', identifier: 'adm.cpr.manage', dependencies: 2 },
      { name: 'Permite assinar digitalmente documentos de CPR.', identifier: 'adm.cpr.sign', dependencies: 1 }
    ]
  },
  {
    title: 'ADM - Certidão de Disponibilidade de Estoque',
    items: [
      { name: 'Permite emitir certidões de estoque para distribuidores.', identifier: 'adm.cert-stock.issue', dependencies: 1 },
      { name: 'Permite revogar certidões emitidas.', identifier: 'adm.cert-stock.revoke', dependencies: 0 }
    ]
  },
  {
    title: 'ADM - Configurações',
    items: [
      { name: 'Permite alterar configurações gerais do sistema.', identifier: 'adm.settings.update', dependencies: 5 }
    ]
  }
];

export default function GerenciarPermissoesPage() {
  const [searchCategory, setSearchCategory] = useState('');
  const [searchPermission, setSearchPermission] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'ADM - Bloqueio de UCS': true // Start with the first one expanded like the screenshot
  });

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const filteredCategories = INITIAL_CATEGORIES.map(cat => {
    const matchesCategory = cat.title.toLowerCase().includes(searchCategory.toLowerCase());
    const filteredItems = cat.items.filter(item =>
      item.name.toLowerCase().includes(searchPermission.toLowerCase()) ||
      item.identifier.toLowerCase().includes(searchPermission.toLowerCase())
    );

    if (searchCategory && !matchesCategory) return null;
    if (searchPermission && filteredItems.length === 0) return null;

    return {
      ...cat,
      items: searchPermission ? filteredItems : cat.items
    };
  }).filter((c): c is PermissionCategory => c !== null);

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] text-slate-700 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="bg-white h-20 px-8 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">
              Gerenciar Permissões
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-0.5">
              <span>Home</span>
              <span className="opacity-50">/</span>
              <span>Usuários</span>
              <span className="opacity-50">/</span>
              <span className="text-slate-500 font-bold">Gerenciar Permissões</span>
            </div>
          </div>
          <button 
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto">
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 flex-wrap">
            <button className="h-10 px-4 border border-purple-200 text-purple-600 bg-white hover:bg-purple-50 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm">
              <Shield size={14} className="text-purple-500" />
              Gerenciar Endpoints
            </button>
            <button className="h-10 px-4 border border-purple-200 text-purple-600 bg-white hover:bg-purple-50 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm">
              <Users size={14} className="text-purple-500" />
              Gerenciar por usuário
            </button>
            <button className="h-10 px-4 border border-purple-200 text-purple-600 bg-white hover:bg-purple-50 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm">
              <UserCheck size={14} className="text-purple-500" />
              Gerenciar por perfil
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchCategory}
                onChange={e => setSearchCategory(e.target.value)}
                placeholder="Busque pela categoria..."
                className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
              />
            </div>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchPermission}
                onChange={e => setSearchPermission(e.target.value)}
                placeholder="Busque pelo nome da permissão ou descrição..."
                className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-400 transition-all"
              />
            </div>
          </div>

          {/* Accordion Categories List */}
          <div className="space-y-4">
            {filteredCategories.map(cat => {
              const isOpen = !!expandedCategories[cat.title];
              return (
                <div 
                  key={cat.title} 
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat.title)}
                    className="w-full px-6 py-4 flex items-center justify-between font-black text-xs text-slate-800 uppercase tracking-wider hover:bg-slate-50 transition-colors"
                  >
                    <span>{cat.title}</span>
                    {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>

                  {/* Category Content */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-[#F9FAF8] border-b border-slate-100">
                            <tr>
                              {['Permissão', 'Identificador', 'Nº Dependências', 'Ações'].map(h => (
                                <th 
                                  key={h} 
                                  className="text-left py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cat.items.map(item => (
                              <tr key={item.identifier} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6 text-[11px] font-semibold text-slate-700">
                                  {item.name}
                                </td>
                                <td className="py-4 px-6 font-mono text-[11px] text-slate-500">
                                  {item.identifier}
                                </td>
                                <td className="py-4 px-6 text-[11px] font-bold text-slate-500">
                                  {item.dependencies}
                                </td>
                                <td className="py-4 px-6">
                                  <button className="h-8 px-3 border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold text-[10px] rounded-lg flex items-center gap-1.5 transition-all">
                                    Gerenciar
                                    <ArrowRight size={10} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                <Shield size={32} className="mx-auto opacity-35" />
                <p className="text-xs font-bold uppercase tracking-wider">Nenhuma categoria de permissão encontrada</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
