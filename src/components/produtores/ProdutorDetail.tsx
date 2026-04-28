"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, Map as MapIcon, 
  ExternalLink, Droplets,
  ChevronRight as ChevronRightIcon,
  Plus, Trash2, Calculator, Save, 
  History, FileText, Award, Download,
  TrendingUp as TrendingUpIcon,
  Loader2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDoc, useFirestore } from "@/firebase";
import { useMemo, useState, useEffect } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { toast } from "sonner";
import { EntidadeSaldo } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProdutorDetailProps {
  produtor: any | null; // ProdutorConsolidado
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProdutorDetail({ produtor, open, onOpenChange }: ProdutorDetailProps) {
  const firestore = useFirestore();
  const router = useRouter();
  
  const entId = useMemo(() => 
    produtor?.documento?.replace(/[^\d]/g, '') || "", 
    [produtor?.documento]
  );

  const entRef = useMemo(() => 
    firestore && entId ? doc(firestore, "produtores", entId) : null,
    [firestore, entId]
  );

  const { data: entityData, isLoading: isWalletLoading } = useDoc<EntidadeSaldo>(entRef);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [pasteData, setPasteData] = useState<{ section: string; raw: string } | null>(null);

  useEffect(() => {
    if (entityData && open) {
      setFormData(entityData);
    }
  }, [entityData, open]);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginate = (items: any[]) => {
    const start = (currentPage - 1) * itemsPerPage;
    return (items || []).slice(start, start + itemsPerPage);
  };

  const totalPages = (items: any[]) => Math.ceil((items || []).length / itemsPerPage);

  const handleUpdateItem = (section: string, id: string, updates: Partial<any>) => {
    const list = ((formData as any)[section] || []).map((item: any) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setFormData({ ...formData, [section]: list });
  };

  const handleRemoveItem = (section: string, id: string) => {
    const list = ((formData as any)[section] || []).filter((i: any) => i.id !== id);
    setFormData({ ...formData, [section]: list });
  };

  const handleProcessPaste = () => {
    if (!pasteData) return;
    const lines = pasteData.raw.split('\n').filter(l => l.trim());

    const newRows: any[] = lines.map(line => {
      // Split flexível: tab ou 2+ espaços
      const parts = line.split(/\t+| {2,}/).map(p => p.trim()).filter(p => p !== "");
      if (parts.length < 3) return null;

      const parseVal = (str: string | undefined) => {
        if (!str || !str.trim()) return 0;
        const clean = str.replace(/\s/g, "");
        if (clean.includes(',')) {
          // Formato 1.234,56
          return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0;
        }
        // Formato 1.234.567 ou 1234
        return parseFloat(clean.replace(/\./g, "").replace(/[^\d.-]/g, "")) || 0;
      };

      const cleanData = (str: string | undefined) => {
        if (!str) return '';
        if (str.includes(' ')) return str.split(' ')[0];
        return str.trim();
      };

      const section = pasteData.section;

      // DETECÇÃO DE FORMATO ROBUSTO (NOVA TABELA DE ORIGINAÇÃO)
      // Tenta localizar a coluna da Fazenda e do UCS baseada no conteúdo
      const isHarvestSection = section === 'tabelaOriginacao';
      if (isHarvestSection && parts.length >= 8) {
        // Encontra o indice que parece ser a data (XX/XX/XXXX)
        const dateIdx = parts.findIndex(p => /^\d{2}\/\d{2}\/\d{4}/.test(p));
        if (dateIdx !== -1) {
          const farmName = parts[dateIdx + 3];
          const nucleo = parts[dateIdx + 4];
          const ucsValue = parts[dateIdx + 7]; // UCS costuma estar 7 posições após a data
          const produtorLine = parts[dateIdx + 9]; // Produtor costuma estar 9 posições após a data

          const currentProdName = produtor.nome.toLowerCase();
          const currentProdDoc = (produtor.documento || "").replace(/[^\d]/g, "");

          // Verifica se o produtor coincide (nome ou doc nas colunas finais)
          const searchArea = parts.slice(dateIdx).join(" ").toLowerCase();
          const isMatch = searchArea.includes(currentProdName) || 
                         (currentProdDoc.length > 5 && searchArea.includes(currentProdDoc));

          if (isMatch && farmName && ucsValue) {
            return {
              id: `ORIG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              dist: farmName,
              data: cleanData(parts[dateIdx]),
              plataforma: nucleo || '',
              valor: parseVal(ucsValue),
              idf: parts[dateIdx - 1] || '' // Geralmente o IDF vem antes da data
            };
          }
        }
      }

      if (section === 'tabelaMovimentacao' || section === 'tabelaAquisicao') {
        const origin = (parts[0] || "").toLowerCase();
        const dest = (parts[2] || "").toLowerCase();
        const prodName = produtor.nome.toLowerCase();
        
        // Ignore self-transfers (intra-platform)
        if (origin.includes(prodName) && dest.includes(prodName)) return null;
        
        // Determine if it's withdrawal (Saída) or acquisition (Entrada)
        const isSaida = origin.includes(prodName);
        const isEntrada = dest.includes(prodName);

        if (!isSaida && !isEntrada) return null;

        const val = parseVal(parts[6]) || parseVal(parts[4]) || 0;
        const row = {
          id: `${isSaida ? 'MOV' : 'AQ'}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          dist: parts[0]?.trim() || '',
          data: cleanData(parts[1]),
          destino: parts[2]?.trim() || '',
          usuarioDestino: parts[3]?.trim() || '',
          valor: val,
          saldoAcumulado: parts[7]?.trim() || '',
          statusAuditoria: 'Concluido',
          dataPagamento: parts[9]?.trim() || '',
          linkComprovante: parts[10]?.trim() || '',
          valorPago: parseVal(parts[11]),
          linkNxt: parts[12]?.trim() || '',
          observacaoTransacao: parts[13]?.trim() || '',
          _targetSection: isSaida ? 'tabelaMovimentacao' : 'tabelaAquisicao'
        };
        return row;
      }

      switch (section) {
        case 'tabelaLegado':
          return {
            id: `LEG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            data: cleanData(parts[1]),
            plataforma: parts[0]?.trim() || '',
            disponivel: parseVal(parts[4]),
            reservado: parseVal(parts[5]),
            bloqueado: parseVal(parts[6]),
            aposentado: parseVal(parts[7]),
          };
        case 'tabelaOriginacao':
          return {
            id: `ORIG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            dist: parts[0]?.trim() || '',
            data: cleanData(parts[1]),
            plataforma: parts[2]?.trim() || '', 
            valor: parseVal(parts[parts.length - 1])
          };
        case 'tabelaImei':
          return {
            id: `IMEI-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            data: cleanData(parts[1]),
            dist: parts[0]?.trim() || '',
            valorDebito: parseVal(parts[4]),
            valorCredito: parseVal(parts[5]),
          };
        default:
          return null;
      }
    }).filter(Boolean);

    // Filter and Sort Saídas for Traceability
    const saídasRows = newRows.filter(r => r._targetSection === 'tabelaMovimentacao');
    const entradasRows = newRows.filter(r => r._targetSection === 'tabelaAquisicao');
    const legacyRows = newRows.filter(r => !r._targetSection);

    let processedSaídas = saídasRows;
    if (saídasRows.length > 0) {
      const usedByFarm: Record<string, number> = {};
      [...(formData.tabelaMovimentacao || [])].forEach((m: any) => {
        (m.rastreabilidade || []).forEach((r: any) => {
          usedByFarm[r.fazenda] = (usedByFarm[r.fazenda] || 0) + r.valor;
        });
      });

      const farmPool = (formData.tabelaOriginacao || []).map((o: any) => ({
        nome: o.dist,
        saldo: (o.valor || 0) - (usedByFarm[o.dist] || 0)
      }));

      processedSaídas = saídasRows.map(row => {
        const rastreabilidade: { fazenda: string; valor: number }[] = [];
        let restante = row.valor;
        while (restante > 0.0001) {
          const activeFarms = farmPool.filter(f => f.saldo > 0);
          if (activeFarms.length === 0) break;
          const share = restante / activeFarms.length;
          let distributedInThisPass = 0;
          for (const farm of activeFarms) {
            const take = Math.min(share, farm.saldo);
            if (take > 0) {
              farm.saldo -= take;
              restante -= take;
              distributedInThisPass += take;
              const existing = rastreabilidade.find(r => r.fazenda === farm.nome);
              if (existing) existing.valor += take;
              else rastreabilidade.push({ fazenda: farm.nome, valor: take });
            }
          }
          if (distributedInThisPass === 0) break;
        }
        return { ...row, rastreabilidade };
      });
    }

    setFormData({
      ...formData,
      tabelaMovimentacao: [...((formData as any).tabelaMovimentacao || []), ...processedSaídas],
      tabelaAquisicao: [...((formData as any).tabelaAquisicao || []), ...entradasRows],
      [pasteData.section]: pasteData.section === 'tabelaMovimentacao' || pasteData.section === 'tabelaAquisicao' 
        ? ((formData as any)[pasteData.section] || []) // Don't double add
        : [...((formData as any)[pasteData.section] || []), ...legacyRows]
    });
    setPasteData(null);
  };

  const farmStats = useMemo(() => {
    const stats: Record<string, { originacao: number; usado: number; saldo: number; idf?: string }> = {};
    const farmIdfs: Record<string, string> = {};
    produtor.fazendas.forEach((f: any) => { farmIdfs[f.fazendaNome] = f.idf; });

    const currentTabOriginacao = isEditing ? (formData.tabelaOriginacao || []) : (entityData?.tabelaOriginacao || []);
    const currentTabMovimentacao = isEditing ? (formData.tabelaMovimentacao || []) : (entityData?.tabelaMovimentacao || []);

    currentTabOriginacao.forEach((o: any) => {
      if (!stats[o.dist]) stats[o.dist] = { originacao: 0, usado: 0, saldo: 0, idf: farmIdfs[o.dist] };
      stats[o.dist].originacao += (o.valor || 0);
    });

    currentTabMovimentacao.forEach((m: any) => {
      (m.rastreabilidade || []).forEach((r: any) => {
        if (!stats[r.fazenda]) stats[r.fazenda] = { originacao: 0, usado: 0, saldo: 0 };
        stats[r.fazenda].usado += (r.valor || 0);
      });
    });

    Object.keys(stats).forEach(k => { stats[k].saldo = Math.ceil(stats[k].originacao - stats[k].usado); });
    return stats;
  }, [entityData, formData, isEditing, produtor.fazendas]);

  const handleSave = async () => {
    if (!entRef) return;
    setIsSaving(true);
    try {
      await updateDoc(entRef, {
        ...formData,
        originacao: currentStats.originacao,
        movimentacao: currentStats.movimentacao,
        saldoLegadoTotal: currentStats.legado,
        aquisicao: currentStats.aquisicao,
        saldoAjustarImei: currentStats.imei,
        saldoFinalAtual: currentSaldoReal,
        updatedAt: new Date().toISOString()
      });
      toast.success("Perfil técnico atualizado!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentStats = {
    originacao: (isEditing 
      ? formData.tabelaOriginacao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) 
      : (entityData?.tabelaOriginacao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || entityData?.originacao || 0)) || 0,
    movimentacao: (isEditing 
      ? formData.tabelaMovimentacao?.reduce((acc: number, cur: any) => {
          const isConsumo = !cur.tipoTransacao || cur.tipoTransacao === 'CONSUMO';
          return isConsumo ? acc + (Number(cur.valor) || 0) : acc;
        }, 0) 
      : (entityData?.tabelaMovimentacao?.reduce((acc: number, cur: any) => {
          const isConsumo = !cur.tipoTransacao || cur.tipoTransacao === 'CONSUMO';
          return isConsumo ? acc + (Number(cur.valor) || 0) : acc;
        }, 0) || entityData?.movimentacao || 0)) || 0,
    legado: (isEditing 
      ? formData.tabelaLegado?.reduce((acc: number, cur: any) => acc + (Number(cur.disponivel) || 0), 0) 
      : (entityData?.saldoLegadoTotal || 0)) || 0,
    imei: (isEditing
      ? formData.tabelaImei?.reduce((acc: number, cur: any) => acc + (Number(cur.valorDebito || 0) - Number(cur.valorCredito || 0)), 0)
      : (entityData?.saldoAjustarImei || 0)) || 0,
    aquisicao: (isEditing
      ? formData.tabelaAquisicao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0)
      : (entityData?.aquisicao || 0)) || 0,
  };

  const totalEntradas = currentStats.legado + currentStats.aquisicao;
  const totalSaidas = currentStats.movimentacao + currentStats.imei;
  const currentSaldoReal = Math.ceil(totalEntradas - totalSaidas);

  if (!produtor) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1850px] w-[99.5vw] h-[99vh] p-0 border-none bg-white rounded-xl shadow-2xl overflow-hidden flex flex-row">
        
        {/* LADO ESQUERDO: CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <DialogHeader className="sr-only">
            <DialogTitle>Perfil do Produtor: {produtor.nome}</DialogTitle>
          </DialogHeader>

          {/* PROFILE HEADER REESTRUTURADO (MAIS COMPACTO) */}
          <div className="bg-[#0B0F1A] px-10 py-4 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10 gap-4">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-[24px] font-black text-white shadow-xl shadow-emerald-500/20 uppercase shrink-0">
                  {produtor.nome?.substring(0, 2)}
                </div>
                
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                      {produtor.tipo}
                    </Badge>
                    <span className="text-slate-500 font-mono text-[11px]">{produtor.documento}</span>
                  </div>
                  <h1 className="text-[20px] xl:text-[26px] font-black text-white uppercase tracking-tight leading-none truncate max-w-[250px] lg:max-w-[450px]">{produtor.nome}</h1>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-emerald-500" /> {produtor.totalFazendas} {produtor.totalFazendas === 1 ? 'Propriedade' : 'Propriedades'}
                  </p>
                </div>
              </div>

              {/* BARRA DE SALDO INTEGRADA (ENTRADAS vs SAÍDAS) */}
              <div className="flex items-center gap-3 lg:gap-6 bg-white/5 border border-white/5 p-2 lg:p-3 px-4 lg:px-5 rounded-2xl backdrop-blur-md shrink-0">
                 <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Saldo Origem (Total Entradas)</p>
                    <p className="text-[16px] font-black text-white">{Math.ceil(totalEntradas).toLocaleString('pt-BR')}</p>
                 </div>
                 
                 <div className="w-px h-6 bg-white/5" />

                 <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Saldo Destino (Total Baixas)</p>
                    <p className="text-[16px] font-black text-rose-500">{Math.ceil(totalSaidas).toLocaleString('pt-BR')}</p>
                 </div>

                 <div className="w-px h-6 bg-white/5 hidden lg:block" />

                  <div className="bg-emerald-500/10 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl border border-emerald-500/10">
                    <p className="text-[7px] lg:text-[8px] font-black text-emerald-500/80 uppercase tracking-[0.2em] mb-0.5 text-center">Patrimônio Líquido</p>
                    <p className="text-[18px] lg:text-[22px] font-black text-emerald-400 leading-none text-center">
                       {Math.ceil(currentSaldoReal).toLocaleString('pt-BR')} 
                       <span className="text-[9px] ml-0.5 font-bold">UCS</span>
                    </p>
                 </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-[#F8FAFC]">
            <div className="p-6 space-y-6 pb-20">
              
              {/* LISTA DE PROPRIEDADES */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-widest flex gap-2 items-center">
                  <MapIcon className="w-4 h-4" /> Portfólio de Propriedades
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {produtor.fazendas.map((f: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => {
                          onOpenChange(false);
                          router.push(`/fazendas?search=${encodeURIComponent(f.fazendaNome)}`);
                      }}
                      className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 cursor-pointer transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-black text-slate-900 uppercase group-hover:text-emerald-600 transition-colors">{f.fazendaNome}</p>
                            <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 tracking-tight">IDF: {String(f.idf || '').padStart(11, '0')}</p>
                        </div>
                        {f.percentual !== 100 && (
                          <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px]">{f.percentual}%</Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        <PropInfo label="Área do Produtor" value={`${f.areaProdutor.toLocaleString('pt-BR')} ha`} highlight />
                        <PropInfo label="Núcleo" value={f.nucleo || "---"} />
                        <PropInfo 
                          label="Saldo Disponível" 
                          value={farmStats[f.fazendaNome] ? `${Math.ceil(farmStats[f.fazendaNome].saldo).toLocaleString('pt-BR')} UCS` : "---"} 
                          highlight
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CONTEÚDO DINÂMICO: VISUALIZAÇÃO vs EDIÇÃO */}
              {!isEditing ? (
                /* MODO VISUALIZAÇÃO (SESSÕES TÉCNICAS) */
                <div className="space-y-16 pb-20">
                  
                  {/* SESSÃO 01: ORIGINAÇÃO SAFRA */}
                  <div className="space-y-6">
                    <SectionLabel title="01. DEMONSTRATIVO: ORIGINAÇÃO SAFRA" color="bg-emerald-500" total={currentStats.originacao} />
                    <ViewTable 
                      data={entityData?.tabelaOriginacao || []} 
                      type="originacao" 
                      itemsPerPage={10} 
                    />
                  </div>

                  {/* SESSÃO 02: AQUISIÇÕES */}
                  <div className="space-y-6">
                    <SectionLabel title="02. CRÉDITOS: AQUISIÇÕES / REFORÇO" color="bg-indigo-500" total={currentStats.aquisicao} />
                    <ViewTable 
                      data={entityData?.tabelaAquisicao || []} 
                      type="originacao" 
                      itemsPerPage={5} 
                    />
                  </div>

                  {/* SESSÃO 03: SALDO LEGADO */}
                  <div className="space-y-6">
                    <SectionLabel title="03. CRÉDITOS: SALDO LEGADO" color="bg-amber-500" total={currentStats.legado} />
                    <ViewTable 
                      data={entityData?.tabelaLegado || []} 
                      type="legado" 
                      itemsPerPage={5} 
                    />
                  </div>

                  {/* SESSÃO 04: SAÍDAS */}
                  <div className="space-y-6">
                    <SectionLabel title="04. DÉBITOS: MOVIMENTAÇÃO / SAÍDAS" color="bg-rose-500" total={currentStats.movimentacao} isNegative />
                    <ViewTable 
                      data={entityData?.tabelaMovimentacao || []} 
                      type="movimentacao" 
                      itemsPerPage={10} 
                      initialBalance={totalEntradas}
                    />
                  </div>

                  {/* SESSÃO 05: AJUSTES IMEI */}
                  <div className="space-y-6">
                    <SectionLabel title="05. DÉBITOS: AJUSTES IMEI" color="bg-amber-600" total={currentStats.imei} isNegative />
                    <ViewTable 
                      data={entityData?.tabelaImei || []} 
                      type="imei" 
                      itemsPerPage={5} 
                    />
                  </div>
                </div>
              ) : (
                /* MODO EDIÇÃO (TABELAS TÉCNICAS) */
                <div className="space-y-20 pb-32">
                  
                  {/* ============================================================
                      GRUPO A: CRÉDITOS E ORIGENS (ENTRADAS NO SALDO)
                  ============================================================ */}
                  <div className="space-y-10">
                    <div className="flex items-center gap-4 border-b-2 border-emerald-500/20 pb-6">
                      <div className="w-4 h-12 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200" />
                      <div className="space-y-1">
                        <h2 className="text-[22px] font-black text-slate-900 uppercase tracking-tight">01. Créditos e Origens</h2>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Toda movimentação que gera saldo positivo na conta do cliente</p>
                      </div>
                    </div>

                    <div className="space-y-12 pl-6 border-l-2 border-slate-100">
                      {/* SESSÃO 01: ORIGINAÇÃO */}
                      <div className="space-y-4">
                        <SectionHeader 
                           title="01. DEMONSTRATIVO: ORIGINAÇÃO (SAFRA / UCS FARM)" 
                           value={Math.ceil(formData.tabelaOriginacao?.reduce((acc: number, cur: any) => acc + (cur.valor || 0), 0) || 0)}
                           onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })}
                         />
                        <SectionTable data={formData.tabelaOriginacao || []} type="originacao" onRemove={(id) => handleRemoveItem('tabelaOriginacao', id)} onUpdateItem={(id, updates) => handleUpdateItem('tabelaOriginacao', id, updates)} />
                      </div>

                      {/* SESSÃO 02: AQUISIÇÕES */}
                      <div className="space-y-4">
                        <SectionHeader 
                           title="02. AQUISIÇÕES EXTERNAS / REFORÇO" 
                           value={Math.ceil(formData.tabelaAquisicao?.reduce((acc: number, cur: any) => acc + (cur.valor || 0), 0) || 0)}
                           isIndigo
                           onPaste={() => setPasteData({ section: 'tabelaAquisicao', raw: '' })} 
                         />
                        <SectionTable
                          data={formData.tabelaAquisicao || []}
                          type="movimentacao"
                          onRemove={(id) => handleRemoveItem('tabelaAquisicao', id)}
                          onUpdateItem={(id, updates) => handleUpdateItem('tabelaAquisicao', id, updates)}
                        />
                      </div>

                      {/* SESSÃO 03: SALDO LEGADO */}
                      <div className="space-y-4">
                        <SectionHeader 
                           title="03. SALDO LEGADO (PLATAFORMA ANTERIOR)" 
                           value={Math.ceil(formData.tabelaLegado?.reduce((acc: number, cur: any) => acc + (Number(cur.disponivel || 0) + Number(cur.reservado ||0) + Number(cur.bloqueado || 0)), 0) || 0)}
                           isAmber 
                           onPaste={() => setPasteData({ section: 'tabelaLegado', raw: '' })} 
                         />
                        <SectionTable data={formData.tabelaLegado || []} type="legado" onRemove={(id) => handleRemoveItem('tabelaLegado', id)} onUpdateItem={(id, updates) => handleUpdateItem('tabelaLegado', id, updates)} />
                      </div>
                    </div>
                  </div>

                  {/* ============================================================
                      GRUPO B: DÉBITOS E DESTINOS (SAÍDAS DO SALDO)
                  ============================================================ */}
                  <div className="space-y-10">
                    <div className="flex items-center gap-4 border-b-2 border-rose-500/20 pb-6">
                      <div className="w-4 h-12 bg-rose-500 rounded-full shadow-lg shadow-rose-200" />
                      <div className="space-y-1">
                        <h2 className="text-[22px] font-black text-slate-900 uppercase tracking-tight">02. Débitos e Destinos</h2>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Toda movimentação que deduz saldo da conta do cliente</p>
                      </div>
                    </div>

                    <div className="space-y-12 pl-6 border-l-2 border-slate-100">
                      {/* SESSÃO 04: SAÍDAS */}
                      <div className="space-y-4">
                        <SectionHeader 
                           title="04. SAÍDAS (TRANSFERÊNCIAS / BAIXAS)" 
                           value={Math.ceil(formData.tabelaMovimentacao?.reduce((acc: number, cur: any) => acc + (cur.valor || 0), 0) || 0)}
                           isNegative 
                           onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })} 
                         />
                        <SectionTable
                          data={formData.tabelaMovimentacao || []}
                          type="movimentacao"
                          onRemove={(id) => handleRemoveItem('tabelaMovimentacao', id)}
                          onUpdateItem={(id, updates) => handleUpdateItem('tabelaMovimentacao', id, updates)}
                        />
                      </div>

                      {/* SESSÃO 05: AJUSTES IMEI */}
                      <div className="space-y-4">
                        <SectionHeader 
                           title="05. AJUSTES TÉCNICOS (IMEI)" 
                           value={Math.ceil(formData.tabelaImei?.reduce((acc: number, cur: any) => acc + (Number(cur.valorDebito || 0) - Number(cur.valorCredito || 0)), 0) || 0)}
                           isAmber
                           onPaste={() => setPasteData({ section: 'tabelaImei', raw: '' })} 
                         />
                        <SectionTable 
                          data={formData.tabelaImei || []} 
                          type="imei" 
                          onRemove={(id) => handleRemoveItem('tabelaImei', id)} 
                          onUpdateItem={(id, updates) => handleUpdateItem('tabelaImei', id, updates)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* LADO DIREITO: MENU DE AÇÕES TÉCNICAS */}
        <div className="w-[320px] shrink-0 border-l border-slate-100 bg-[#F8FAFC] flex flex-col relative z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.02)]">
           <div className="p-8 border-b border-slate-200/60 bg-white">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Central do Produtor</h3>
              <p className="text-[14px] font-black text-slate-900 uppercase">Ações Técnicas e Gestão</p>
           </div>
           
           <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                 
                 {/* MENU DE NAVEGAÇÃO / AÇÕES */}
                 <div className="space-y-2">
                    <h4 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Acesso Rápido</h4>
                    <MenuButton 
                      icon={<Droplets className="w-4 h-4" />} 
                      label="Visão Geral do Ledger" 
                      onClick={() => { setIsEditing(false); }}
                    />
                    <MenuButton 
                      icon={<History className="w-4 h-4" />} 
                      label="Extrato Consolidado" 
                      onClick={() => { setIsEditing(false); }}
                    />
                    <MenuButton 
                      icon={<FileText className="w-4 h-4" />} 
                      label="Auditoria Técnica" 
                      onClick={() => { setIsEditing(false); }}
                    />
                    <MenuButton icon={<Award className="w-4 h-4" />} label="Certificações de Origem" />
                    <MenuButton icon={<TrendingUpIcon className="w-4 h-4" />} label="Projeção de Carbono" />
                    
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        {!isEditing ? (
                          <Button 
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            className="w-full h-11 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all gap-2 shadow-lg shadow-emerald-50"
                          >
                            <Calculator className="w-3.5 h-3.5" /> Habilitar Edição
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Button 
                              onClick={handleSave}
                              disabled={isSaving}
                              className="w-full h-11 rounded-xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all gap-2"
                            >
                              <Save className="w-3.5 h-3.5" /> {isSaving ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                            <Button 
                              onClick={() => {
                                setIsEditing(false);
                                setFormData(entityData || {});
                              }}
                              variant="ghost"
                              className="w-full h-11 rounded-xl text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all"
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                    </div>
                 </div>

                 {/* DASHBOARD MINI */}
                 <div className="bg-white rounded-[2rem] p-6 border border-slate-200 space-y-4 shadow-sm">
                    <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Performance Técnica</h4>
                    <div className="space-y-4">
                       <MiniStat label="Hectares Monitorados" value={produtor.totalAreaHa.toLocaleString('pt-BR')} unit="ha" />
                       <MiniStat label="Inserções Realizadas" value={(entityData?.tabelaOriginacao?.length || 0).toString()} unit="un" />
                       <MiniStat label="Safras Vinculadas" value={new Set(entityData?.tabelaOriginacao?.map((i: any) => i.plataforma)).size.toString()} unit="ano" />
                    </div>
                 </div>

                 {/* DOWNLOADS RÁPIDOS */}
                 <div className="space-y-4">
                    <h4 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Documentos Legais</h4>
                    <div className="grid grid-cols-1 gap-3">
                       <DownloadCard label="CCIR Consolidado" />
                       <DownloadCard label="CAR (Todas Fazendas)" />
                       <DownloadCard label="Relatório Ambiental" />
                    </div>
                 </div>

              </div>
           </ScrollArea>

           <div className="p-8 bg-white border-t border-slate-200">
              <Button 
                onClick={() => onOpenChange(false)}
                variant="outline" 
                className="w-full h-12 rounded-xl border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
              >
                Fechar Perfil
              </Button>
           </div>
        </div>
      </DialogContent>

      <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-8 space-y-4 border-none bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> COLAGEM TÉCNICA
            </DialogTitle>
            <DialogDescription className="sr-only">Colagem de dados para processamento de auditoria.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteData?.raw || ""}
            onChange={e => setPasteData({ ...pasteData!, raw: e.target.value })}
            placeholder="Cole aqui as colunas do Excel/Google Sheets para processamento automático..."
            className="min-h-[250px] font-mono text-[10px] bg-slate-50 border-slate-100 rounded-2xl p-6 shadow-inner"
          />
          <Button onClick={handleProcessPaste} className="w-full h-12 rounded-xl font-black uppercase text-[10px] bg-primary text-white shadow-lg shadow-emerald-100">IMPORTAR DADOS</Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
       <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
       <span className="text-[14px] font-black text-slate-900">{value} <span className="text-[10px] text-slate-400 font-bold">{unit}</span></span>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-emerald-50 transition-all group text-left"
    >
       <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
            {icon}
          </div>
          <span className="text-[12px] font-black text-slate-600 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">{label}</span>
       </div>
       <ChevronRightIcon className="w-3 h-3 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

function DownloadCard({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 group hover:border-emerald-200 transition-all cursor-pointer">
       <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
             <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{label}</span>
       </div>
       <Badge className="bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 border-none text-[10px] font-black">PDF</Badge>
    </div>
  );
}

function SectionHeader({ title, value, onPaste, onAdd, isNegative, isAmber, isImei, isIndigo }: any) {
  return (
    <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-1.5 h-6 rounded-full",
          isAmber ? "bg-amber-500" : isImei ? "bg-indigo-500" : isNegative ? "bg-rose-500" : isIndigo ? "bg-indigo-500" : "bg-[#10B981]"
        )} />
        <h3 className="text-[13px] font-black uppercase tracking-[0.1em] text-slate-800">{title}</h3>
        <Badge variant="outline" className={cn(
          "text-[10px] font-black uppercase rounded-full border-slate-100 px-3 py-1",
          isAmber ? "text-amber-500" : isImei ? "text-indigo-500" : isNegative ? "text-rose-500" : isIndigo ? "text-indigo-500" : "text-[#10B981]"
        )}>
          {Math.floor(value || 0).toLocaleString('pt-BR')} UCS
        </Badge>
      </div>
      {(onPaste || onAdd) && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPaste || onAdd} 
          className="h-8 px-4 rounded-xl text-[9px] font-black uppercase gap-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all hover:border-primary/40 text-slate-600 flex items-center"
        >
          {onAdd ? <Plus className="w-3.5 h-3.5 text-primary" /> : <Calculator className="w-3.5 h-3.5 text-primary" />}
          <span>{onAdd ? "ADICIONAR" : "COLAR DADOS"}</span>
        </Button>
      )}
    </div>
  );
}

function SectionTable({ data, type, onRemove, onUpdateItem }: { data: any[], type: string, onRemove?: (id: string) => void, onUpdateItem?: (id: string, updates: Partial<any>) => void }) {
  const isLegado = type === 'legado';
  const isImei = type === 'imei';
  const isMovimentacao = type === 'movimentacao';

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto w-full custom-scrollbar technical-console-scroll">
        <Table className="w-full min-w-[1200px] table-fixed">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow className="h-11 hover:bg-transparent">
              <TableHead className="w-[110px] text-[9px] font-black uppercase tracking-widest text-slate-400 pl-6">DATA</TableHead>
              <TableHead className="w-[180px] text-[9px] font-black uppercase tracking-widest text-primary">DISTRIBUIÇÃO</TableHead>
              {isMovimentacao ? (
                <>
                  <TableHead className="w-[140px] text-[9px] font-black uppercase tracking-widest text-slate-500">TIPO</TableHead>
                  <TableHead className="w-[180px] text-[9px] font-black uppercase tracking-widest text-slate-500">DESTINO</TableHead>
                  <TableHead className="w-[140px] text-[9px] font-black uppercase tracking-widest text-slate-500">USUÁRIO DEST.</TableHead>
                  <TableHead className="w-[110px] text-[9px] font-black uppercase tracking-widest text-rose-500 text-right">DÉBITO(UCS)</TableHead>
                  <TableHead className="w-[100px] text-[9px] font-black uppercase tracking-widest text-slate-300 text-right">S. ACUM.</TableHead>
                  <TableHead className="w-[130px] text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">SITUAÇÃO</TableHead>
                  <TableHead className="w-[110px] text-[9px] font-black uppercase tracking-widest text-slate-500">PGTO</TableHead>
                  <TableHead className="w-[120px] text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">VALOR PAGO</TableHead>
                  <TableHead className="w-[160px] text-[9px] font-black uppercase tracking-widest text-slate-500">NXT/HASH</TableHead>
                  <TableHead className="w-[250px] text-[9px] font-black uppercase tracking-widest text-slate-500">OBSERVAÇÕES</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">HISTÓRICO / PLATAFORMA</TableHead>
                  {isLegado ? (
                    <>
                      <TableHead className="w-[100px] text-[9px] font-black uppercase tracking-widest text-primary text-right">DISP.</TableHead>
                      <TableHead className="w-[100px] text-[9px] font-black uppercase tracking-widest text-amber-500 text-right">RES.</TableHead>
                      <TableHead className="w-[100px] text-[9px] font-black uppercase tracking-widest text-rose-500 text-right pr-6">BLOQ.</TableHead>
                    </>
                  ) : isImei ? (
                    <>
                      <TableHead className="w-[110px] text-[9px] font-black uppercase tracking-widest text-indigo-500 text-right">DÉBITO</TableHead>
                      <TableHead className="w-[110px] text-[9px] font-black uppercase tracking-widest text-emerald-500 text-right">CRÉDITO</TableHead>
                      <TableHead className="w-[100px] text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">LÍQUIDO</TableHead>
                    </>
                  ) : (
                    <TableHead className="w-[140px] text-[9px] font-black uppercase tracking-widest text-slate-500 text-right pr-6">VOLUME (UCS)</TableHead>
                  )}
                </>
              )}
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMovimentacao ? 12 : 6} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest bg-slate-50/30">
                  Nenhum registro auditado nesta sessão
                </TableCell>
              </TableRow>
            ) : (
              data.map((row: any, i: number) => (
                <TableRow key={i} className="h-12 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="pl-6 py-2">
                    <Input
                      value={row.data || ""}
                      onChange={e => onUpdateItem?.(row.id, { data: e.target.value })}
                      className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-mono font-bold text-slate-500 rounded-xl focus:bg-white transition-all shadow-none focus:shadow-sm"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <Input
                      value={row.dist || ""}
                      onChange={e => onUpdateItem?.(row.id, { dist: e.target.value })}
                      className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-mono font-bold text-primary rounded-xl focus:bg-white transition-all shadow-none focus:shadow-sm text-center truncate"
                    />
                  </TableCell>

                  {isMovimentacao ? (
                    <>
                      <TableCell className="px-2 py-2">
                        <Select
                          value={row.tipoTransacao || "CONSUMO"}
                          onValueChange={(v) => onUpdateItem?.(row.id, { tipoTransacao: v })}
                        >
                          <SelectTrigger className="h-8 rounded-xl bg-slate-50/50 text-[9px] font-black uppercase border-slate-100 focus:bg-white transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONSUMO">CONSUMO</SelectItem>
                            <SelectItem value="AJUSTE ENTRE PLATAFORMAS">AJUSTE</SelectItem>
                            <SelectItem value="RESERVA OPERACIONAL">RESERVA</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <Input
                          value={row.destino || ""}
                          onChange={e => onUpdateItem?.(row.id, { destino: e.target.value })}
                          className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-bold text-slate-600 rounded-xl focus:bg-white truncate uppercase"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <Input
                          value={row.usuarioDestino || ""}
                          onChange={e => onUpdateItem?.(row.id, { usuarioDestino: e.target.value })}
                          className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-medium text-slate-500 rounded-xl focus:bg-white truncate uppercase"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <Input
                          type="number"
                          value={row.valor ?? ""}
                          onChange={e => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0 })}
                          className={cn(
                            "h-8 w-full text-[11px] font-mono font-black text-right rounded-xl focus:bg-white transition-all shadow-none",
                            (!row.tipoTransacao || row.tipoTransacao === 'CONSUMO') 
                              ? "bg-rose-50/30 border-rose-100 focus:border-rose-300 text-rose-500" 
                              : "bg-slate-50 border-slate-100 focus:border-slate-300 text-slate-400"
                          )}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2 text-right">
                         <span className="text-[10px] font-mono font-bold text-slate-400 pr-2">{row.saldoAcumulado || "---"}</span>
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <Select
                          value={row.statusAuditoria || "Pendente"}
                          onValueChange={(v) => onUpdateItem?.(row.id, { statusAuditoria: v })}
                        >
                          <SelectTrigger className="h-8 rounded-xl bg-slate-50/50 text-[9px] font-black uppercase border-slate-100 focus:bg-white transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Concluido">CONCLUÍDO</SelectItem>
                            <SelectItem value="Pendente">PENDENTE</SelectItem>
                            <SelectItem value="Cancelado">CANCELADO</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <Input
                          value={row.dataPagamento || ""}
                          onChange={e => onUpdateItem?.(row.id, { dataPagamento: e.target.value })}
                          className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-bold text-slate-600 rounded-xl focus:bg-white"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <Input
                          type="number"
                          value={row.valorPago ?? ""}
                          onChange={e => onUpdateItem?.(row.id, { valorPago: parseFloat(e.target.value) || 0 })}
                          className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-mono font-bold text-slate-600 text-right rounded-xl focus:bg-white"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <Input
                          value={row.linkNxt || ""}
                          onChange={e => onUpdateItem?.(row.id, { linkNxt: e.target.value })}
                          className="h-8 w-full bg-slate-50/50 border-slate-100 text-[10px] font-mono text-slate-400 rounded-xl focus:bg-white"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2 pr-6">
                        <Input
                          value={row.observacaoTransacao || ""}
                          onChange={e => onUpdateItem?.(row.id, { observacaoTransacao: e.target.value })}
                          className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] text-slate-600 rounded-xl focus:bg-white px-3"
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="px-2 py-2">
                        <Input
                          value={row.plataforma || row.nome || ""}
                          onChange={e => onUpdateItem?.(row.id, { plataforma: e.target.value })}
                          className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-bold text-slate-600 rounded-xl focus:bg-white uppercase truncate px-3"
                        />
                      </TableCell>

                      {isLegado ? (
                        <>
                          <TableCell className="px-2 py-2">
                            <Input
                              type="number"
                              value={row.disponivel ?? ""}
                              onChange={e => onUpdateItem?.(row.id, { disponivel: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-full bg-primary/5 border-primary/20 text-[11px] font-mono font-black text-primary text-right rounded-xl focus:bg-white transition-all shadow-none"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-2">
                            <Input
                              type="number"
                              value={row.reservado ?? ""}
                              onChange={e => onUpdateItem?.(row.id, { reservado: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-full bg-amber-50/50 border-amber-100 text-[11px] font-mono font-bold text-amber-500 text-right rounded-xl focus:bg-white"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-2 pr-6">
                            <Input
                              type="number"
                              value={row.bloqueado ?? ""}
                              onChange={e => onUpdateItem?.(row.id, { bloqueado: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-full bg-rose-50/30 border-rose-100 text-[11px] font-mono font-bold text-rose-500 text-right rounded-xl focus:bg-white px-3"
                            />
                          </TableCell>
                        </>
                      ) : isImei ? (
                        <>
                          <TableCell className="px-2 py-2">
                            <Input
                              type="number"
                              value={row.valorDebito ?? ""}
                              onChange={e => onUpdateItem?.(row.id, { valorDebito: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-full bg-indigo-50/50 border-indigo-100 text-[11px] font-mono font-bold text-indigo-500 text-right rounded-xl focus:bg-white"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-2">
                            <Input
                              type="number"
                              value={row.valorCredito ?? ""}
                              onChange={e => onUpdateItem?.(row.id, { valorCredito: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-full bg-emerald-50/50 border-emerald-100 text-[11px] font-mono font-bold text-emerald-500 text-right rounded-xl focus:bg-white"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-2 text-right font-mono font-black text-[11px] pr-6 text-indigo-600">
                            {((row.valorDebito || 0) - (row.valorCredito || 0)).toLocaleString('pt-BR')}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="px-2 py-2 pr-6">
                          <Input
                            type="number"
                            value={row.valor ?? ""}
                            onChange={e => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-full bg-slate-50/50 border-slate-100 text-[11px] font-mono font-bold text-slate-600 text-right rounded-xl focus:bg-white px-3"
                          />
                        </TableCell>
                      )}
                    </>
                  )}
                  <TableCell className="pr-6 pl-0 text-center">
                    <Button variant="ghost" size="icon" onClick={() => onRemove?.(row.id)} className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}



function SectionLabel({ title, color, total, isNegative }: any) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-1.5 h-6 rounded-full", color)} />
        <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900 font-headline">{title}</h3>
      </div>
      <Badge className={cn("text-[12px] font-black px-4 py-1 rounded-full", isNegative ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
        {isNegative ? "-" : "+"}{Math.ceil(total || 0).toLocaleString('pt-BR')} UCS
      </Badge>
    </div>
  );
}

function ViewTable({ data, type, itemsPerPage, initialBalance = 0 }: any) {
  const [page, setPage] = useState(1);
  const total = Math.ceil((data?.length || 0) / itemsPerPage);
  const currentItems = (data || []).slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const isMovimentacao = type === 'movimentacao';
  const isLegado = type === 'legado';
  const isImei = type === 'imei';

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-[9px] font-black uppercase tracking-widest pl-8 w-[120px]">Data</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest">Origem / Histórico</TableHead>
            {isMovimentacao ? (
               <>
                 <TableHead className="text-[9px] font-black uppercase tracking-widest">Tipo</TableHead>
                 <TableHead className="text-[9px] font-black uppercase tracking-widest">Destinatário</TableHead>
                 <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Débito</TableHead>
                 <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Status</TableHead>
               </>
            ) : isImei ? (
              <>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Débito</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Crédito</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right pr-8">Líquido</TableHead>
              </>
            ) : (
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-right pr-8">Volume UCS</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase">Nenhum registro encontrado</TableCell></TableRow>
          ) : (
            currentItems.map((item: any, idx: number) => (
              <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="pl-8 text-[11px] font-mono font-bold text-slate-400">{item.data}</TableCell>
                <TableCell>
                  <p className="text-[12px] font-black text-slate-900 uppercase">{item.dist || item.plataforma}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.plataforma || item._type || 'Registro'}</p>
                </TableCell>
                {isMovimentacao ? (
                  <>
                    <TableCell>
                      <Badge className={cn(
                        "text-[8px] font-black px-2 py-0.5 border-none uppercase",
                        !item.tipoTransacao || item.tipoTransacao === 'CONSUMO' ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"
                      )}>
                        {item.tipoTransacao || 'CONSUMO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] font-bold text-slate-500 uppercase">{item.destino}</TableCell>
                    <TableCell className={cn(
                      "text-right font-black",
                      (!item.tipoTransacao || item.tipoTransacao === 'CONSUMO') ? "text-rose-500" : "text-slate-400"
                    )}>
                      {(!item.tipoTransacao || item.tipoTransacao === 'CONSUMO') ? "-" : ""}{Math.ceil(item.valor).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black px-2 py-0.5">{item.statusAuditoria || 'CONCLUÍDO'}</Badge>
                    </TableCell>
                  </>
                ) : isImei ? (
                  <>
                    <TableCell className="text-right font-bold text-rose-500">{Math.ceil(item.valorDebito || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">{Math.ceil(item.valorCredito || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-black text-indigo-600 pr-8">{Math.ceil((item.valorDebito || 0) - (item.valorCredito || 0)).toLocaleString('pt-BR')}</TableCell>
                  </>
                ) : (
                  <TableCell className="text-right font-black text-emerald-600 pr-8">+{Math.ceil(item.valor || item.disponivel || 0).toLocaleString('pt-BR')}</TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {total > 1 && (
        <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-center gap-4">
           <Button disabled={page === 1} onClick={() => setPage(p => p - 1)} variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase">Anterior</Button>
           <span className="text-[9px] font-bold text-slate-400">Pág {page} de {total}</span>
           <Button disabled={page >= total} onClick={() => setPage(p => p + 1)} variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase">Próxima</Button>
        </div>
      )}
    </div>
  );
}

function PropInfo({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={cn(
        "text-[11px] font-bold uppercase",
        highlight ? "text-emerald-600 font-black" : "text-slate-700"
      )}>
        {value}
      </span>
    </div>
  );
}
