"use client"

import { useParams, useRouter } from "next/navigation";
import { updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Loader2, Calculator, Save,
  FileText, Download, Droplets,
  ChevronLeft, ShieldCheck, LayoutGrid, List,
  History, Table2, Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PrintPortal } from "@/components/ui/print-portal";

// Hooks e Utils Refatorados
import { useProdutorData } from "./hooks/useProdutorData";
import { useAuditLogic, AuditData } from "./hooks/useAuditLogic";
import { handleExportJSON, handleExportXLSX } from "./utils/exportUtils";

// Componentes UI
import { AuditReport } from "./components/AuditReport";
import { 
  StatCard, QuickLink, DocLink, 
  SectionBlock, PropDetail 
} from "./components/DashboardComponents";

export default function ProdutorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // 1. Hook de Dados (Fetching e Consolidação)
  const { 
    produtor, entityData, userData, user, 
    isLoading, entityRef 
  } = useProdutorData(id);

  // 2. Hook de Lógica (Estados de Auditoria e Cálculos)
  const {
    formData, setFormData, isEditing, setIsEditing, isSaving, setIsSaving,
    currentData, currentStats, handleUpdateItem, handleRemoveItem, handleProcessPaste
  } = useAuditLogic(entityData, produtor?.baseOriginacao || 0);

  // 3. Estados Locais de UI
  const [pasteData, setPasteData] = useState<{ section: keyof AuditData, raw: string } | null>(null);
  const [isAquisicaoModalOpen, setIsAquisicaoModalOpen] = useState(false);
  const [isLegadoModalOpen, setIsLegadoModalOpen] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [isPortfolioTableView, setIsPortfolioTableView] = useState(false);
  const [manualAquisicao, setManualAquisicao] = useState({ data: '2024', valor: 0, observacao: '' });

  // 4. Configurações de PDF
  const [isReportSimplified, setIsReportSimplified] = useState(false);
  const [isReportCensored, setIsReportCensored] = useState(false);

  // Ações de Persistência
  const handleSave = async () => {
    if (!entityRef) return;
    setIsSaving(true);
    try {
      await updateDoc(entityRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
        auditadoPor: user?.email || 'NXT System',
        statusAuditoria: 'CONCLUIDO'
      });
      setIsEditing(false);
      toast.success("Auditoria salva com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar auditoria.");
    } finally {
      setIsSaving(false);
    }
  };

  const onProcessPaste = (section: keyof AuditData) => {
    if (!pasteData) return;
    const success = handleProcessPaste(section, pasteData.raw);
    if (success) {
      setPasteData(null);
    }
  };

  const handleAddAquisicaoManual = () => {
    if (!manualAquisicao.valor || manualAquisicao.valor <= 0) {
      toast.error("Informe um volume de UCS válido.");
      return;
    }
    const newRow = {
      id: `ACQ-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
      data: manualAquisicao.data,
      adquirente: 'IMEI / BMTCA',
      observacao: manualAquisicao.observacao,
      status: 'CONCLUÍDO',
      valor: manualAquisicao.valor
    };
    setFormData((prev: any) => ({
      ...prev,
      tabelaAquisicao: [...(prev?.tabelaAquisicao || []), newRow]
    }));
    setIsEditing(true);
    setIsAquisicaoModalOpen(false);
    setManualAquisicao({ data: '2024', valor: 0, observacao: '' });
    toast.success("Aquisição manual registrada.");
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  if (!produtor) return <div className="min-h-screen flex items-center justify-center">Produtor não encontrado.</div>;

  return (
    <>
      <div id="main-app-ui" className="flex min-h-screen bg-[#F8FAFC] print:hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
          <div className="flex-1 flex flex-row overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 relative border-r border-slate-100 overflow-hidden">

              {/* HEADER TIPO DASHBOARD (PITCH BLACK) */}
              <div className="shrink-0 bg-[#080C11] border-b border-white/5 relative z-20 px-10 py-6">
                <div className="flex items-center justify-between gap-8 flex-wrap lg:flex-nowrap">
                  
                  {/* LADO ESQUERDO: NOME E NAV */}
                  <div className="flex items-center gap-6 min-w-0">
                    <button onClick={() => router.push('/produtores')} className="shrink-0 w-14 h-24 rounded-[2rem] border-2 border-emerald-500/30 hover:border-emerald-500 flex items-center justify-center text-emerald-500 bg-emerald-500/5 transition-all group">
                       <span className="text-2xl font-black tracking-tighter uppercase leading-none group-hover:scale-110 transition-transform">
                         {produtor.nome?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                       </span>
                    </button>

                    <div className="max-w-xl">
                      <div className="flex items-center gap-3 mb-1">
                        <Badge className="bg-emerald-500 text-[9px] font-black uppercase px-2 py-0 border-none">PF</Badge>
                        <p className="text-slate-500 font-mono text-[10px] font-bold tracking-tight">{produtor.documento}</p>
                      </div>
                      <h1 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter leading-tight truncate max-w-[360px]">
                        {produtor.nome}
                      </h1>
                      <div className="mt-2 flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{produtor.fazendas.length} PROPRIEDADES</p>
                      </div>
                      <button onClick={() => router.push('/produtores')} className="mt-2 flex items-center gap-1 text-[8px] font-black text-slate-600 hover:text-white transition-colors uppercase tracking-widest">
                        <ChevronLeft className="w-2 h-2" /> Voltar para Lista
                      </button>
                    </div>
                  </div>

                  {/* LADO DIREITO: MÉTRICAS */}
                  <div className="flex items-center gap-5 flex-1 justify-end">
                    {/* BARRA DE STATS (DARK CAPSULE) */}
                    <div className="bg-[#111622]/50 border border-white/5 rounded-3xl p-3 px-8 flex items-center gap-6 lg:gap-10 shadow-xl relative overflow-hidden">
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Originação</p>
                          <p className="text-lg font-black text-emerald-400">{(currentStats.originacao || 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Créditos</p>
                          <p className="text-lg font-black text-emerald-300">+{(currentStats.creditos || 0).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="w-px h-6 bg-white/5" />
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="text-center">
                          <p className="text-[8px] font-black text-rose-500/70 uppercase mb-1">Consumo</p>
                          <p className="text-lg font-black text-rose-500">{(currentStats.movimentacao || 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-indigo-400/70 uppercase mb-1">Aquisição</p>
                          <p className="text-lg font-black text-indigo-400">-{(currentStats.aquisicao || 0).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="w-px h-6 bg-white/5" />
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="text-center">
                          <p className="text-[8px] font-black text-amber-500/70 uppercase mb-1">Bloqueado</p>
                          <p className="text-lg font-black text-amber-500">{(currentStats.bloqueado || 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Aposentado</p>
                          <p className="text-lg font-black text-white/90">{(currentStats.aposentado || 0).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>

                    {/* BOX SALDO (NEON) */}
                    <div className="bg-[#111A16] border border-emerald-500/30 rounded-3xl p-3 px-8 text-center relative overflow-hidden shadow-lg min-w-[170px] group transition-all">
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Saldo Disponível</p>
                      <div className="flex items-center gap-2 justify-center">
                        <p className="text-2xl font-black text-[#69FFA6] drop-shadow-[0_0_10px_rgba(105,255,166,0.3)] tracking-tighter">
                          {(currentStats.saldoReal || 0).toLocaleString('pt-BR')}
                        </p>
                        <span className="text-[9px] font-black text-emerald-500 mt-1">UCS</span>
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO */}
                    <div className="flex flex-col gap-2 shrink-0">
                       <Button
                          onClick={() => isEditing ? (handleSave ? handleSave() : setIsEditing(false)) : setIsEditing(true)}
                          disabled={isSaving}
                          className={cn(
                            "h-8 px-4 rounded-xl text-[9px] font-black uppercase transition-all shadow-md",
                            isEditing ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" : "bg-white/10 hover:bg-white/20 text-white border border-white/5"
                          )}
                        >
                          {isSaving ? "SALVANDO" : isEditing ? "CONCLUIR" : "AUDITAR"}
                        </Button>
                        <Button variant="ghost" className="h-4 p-0 text-[8px] font-black text-slate-500 uppercase hover:text-white transition-colors">Exportar PDF</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ÁREA DE SCROLL DO CONTEÚDO */}
              <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
                <div className="p-10 space-y-12 pb-32">
                  
                  {/* PORTFÓLIO DE PROPRIEDADES */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                         <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight flex gap-2 items-center">Portfólio de Propriedades</h3>
                       </div>
                    </div>

                    <div className="space-y-12">
                      {produtor.fazendas.map((f: any, i: number) => {
                        const safeMatch = (val: string) => {
                          if (!val) return false;
                          const d = val.toUpperCase().trim();
                          const n = (f.fazendaNome || '').toUpperCase().trim();
                          const idf = (f.idf || '').toUpperCase().trim();
                          if (idf && idf !== '---' && d.includes(idf)) return true;
                          if (n && d.includes(n)) return true;
                          // Fallback para nomes sem "Fazenda/Sítio"
                          const cleanN = n.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
                          const cleanD = d.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
                          if (cleanN && cleanN.length > 3 && (cleanD.includes(cleanN) || cleanN.includes(cleanD))) return true;
                          return false;
                        };
                        
                        const farmOrig = (currentData?.tabelaOriginacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0)) || Number(f.saldoOriginacao) || 0;
                        const farmDeduction = currentData?.tabelaMovimentacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0;
                        const farmAposentado = (currentData?.tabelaLegado?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0)) || Number(f.aposentado) || 0;

                        return (
                          <div key={i} className="flex gap-8 items-stretch">
                            {/* CARD ESQUERDO: DETALHES */}
                            <div className="flex-1 bg-white p-10 rounded-[40px] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                              <div className="flex justify-between items-start mb-10">
                                <div>
                                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">{f.fazendaNome}</h4>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IDF: {f.idf}</p>
                                </div>
                                <Badge className="bg-slate-100 text-slate-500 border-none px-4 py-1.5 rounded-xl font-black text-[10px] uppercase">100%</Badge>
                              </div>

                              <div className="space-y-6">
                                <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl">
                                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Área do Produtor</span>
                                  <span className="text-lg font-black text-emerald-600 tracking-tighter">{f.areaProdutor?.toLocaleString('pt-BR')} HA</span>
                                </div>
                                <div className="flex justify-between items-center px-4">
                                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Núcleo</span>
                                  <span className="text-[12px] font-bold text-slate-900 uppercase">{f.nucleo || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center px-4">
                                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Localização</span>
                                  <span className="text-[12px] font-bold text-slate-500 uppercase">{f.municipio}/{f.uf}</span>
                                </div>
                              </div>
                            </div>

                            {/* CARD DIREITO: RESUMO TÉCNICO (DARK) */}
                            <div className="w-[480px] bg-[#0B101B] p-10 rounded-[40px] shadow-2xl relative overflow-hidden border border-white/5">
                              <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Droplets className="w-16 h-16 text-emerald-400" />
                              </div>
                              <div className="relative z-10 h-full flex flex-col">
                                <div className="mb-8">
                                  <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">Originação Legada</h5>
                                  <div className="space-y-1">
                                     <p className="text-[16px] font-black text-white uppercase leading-none">{f.fazendaNome}</p>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">IDF: <span className="text-emerald-500/80">{f.idf}</span></p>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Safra {f.safraReferencia}</p>
                                  </div>
                                </div>

                                <div className="space-y-4 flex-1 border-t border-white/5 pt-8">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Originação Total (Safra)</span>
                                    <span className="text-[13px] font-black text-white tracking-tighter">{farmOrig.toLocaleString('pt-BR')} <span className="text-[8px] text-slate-500 ml-1">UCS</span></span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Dedução (Consumo)</span>
                                    <span className="text-[13px] font-black text-rose-500 tracking-tighter">-{farmDeduction.toLocaleString('pt-BR')} <span className="text-[8px] text-rose-400 ml-1">UCS</span></span>
                                  </div>
                                </div>

                                <div className="mt-12 pt-6 border-t border-white/5 flex justify-between items-end">
                                  <div>
                                    <p className="text-4xl font-black text-white tracking-tighter leading-none mb-1">
                                      {(farmOrig - farmDeduction).toLocaleString('pt-BR')} <span className="text-emerald-500 text-lg">UCS</span>
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Vlr Líquido Técnico</p>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[7px] font-black uppercase px-2 py-0.5">Auditado</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* PARTICIONAMENTO TÉCNICO DE SALDOS (TABELA) */}
                    <div className="space-y-8 pt-12">
                      <div className="flex items-center gap-3">
                        <Table2 className="w-5 h-5 text-slate-300" />
                        <h2 className="text-[14px] font-black text-slate-400 uppercase tracking-[0.2em]">Particionamento Técnico de Saldos</h2>
                      </div>
                      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-8">Propriedade</TableHead>
                              <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Originação</TableHead>
                              <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Consumo</TableHead>
                              <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Aquisição</TableHead>
                              <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Aposentado</TableHead>
                              <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 pr-8">Saldo Líquido</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {produtor.fazendas.map((f: any, j: number) => {
                              const safeMatch = (val: string) => {
                                if (!val) return false;
                                const d = val.toUpperCase().trim();
                                const n = (f.fazendaNome || '').toUpperCase().trim();
                                const idf = (f.idf || '').toUpperCase().trim();
                                if (idf && idf !== '---' && d.includes(idf)) return true;
                                if (n && d.includes(n)) return true;
                                const cleanN = n.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
                                const cleanD = d.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
                                if (cleanN && cleanN.length > 3 && (cleanD.includes(cleanN) || cleanN.includes(cleanD))) return true;
                                return false;
                              };

                              const farmOrig = (currentData?.tabelaOriginacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0)) || Number(f.saldoOriginacao) || 0;
                              const farmDeduction = currentData?.tabelaMovimentacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0;
                              const farmAquisicao = currentData?.tabelaAquisicao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0;
                              const farmAposentado = (currentData?.tabelaLegado?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0)) || Number(f.aposentado) || 0;
                              return (
                                <TableRow key={j} className="h-12">
                                  <TableCell className="pl-8 text-[11px] font-black text-slate-900 uppercase">{f.fazendaNome}</TableCell>
                                  <TableCell className="text-center text-[12px] font-black text-slate-400">{farmOrig.toLocaleString('pt-BR')}</TableCell>
                                  <TableCell className="text-center text-[12px] font-black text-rose-400">-{farmDeduction.toLocaleString('pt-BR')}</TableCell>
                                  <TableCell className="text-center text-[12px] font-black text-indigo-400">-{farmAquisicao.toLocaleString('pt-BR')}</TableCell>
                                  <TableCell className="text-center text-[12px] font-black text-slate-400">-{farmAposentado.toLocaleString('pt-BR')}</TableCell>
                                  <TableCell className="text-right pr-8 text-[13px] font-black text-emerald-600">{(farmOrig - farmDeduction - farmAquisicao - farmAposentado).toLocaleString('pt-BR')} UCS</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* BLOCOS DE RESUMO */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
                      {/* RESUMO LEGADO & CONCILIAÇÃO */}
                      <div className="bg-white border-l-2 border-l-amber-500 rounded-r-2xl border-y border-r border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <History className="w-5 h-5 text-amber-500" />
                          <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Resumo Legado & Conciliação</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-3 border-b border-slate-50">
                            <span className="text-[10px] font-black uppercase text-slate-400">Saldo Aposentado (Portfólio)</span>
                            <span className="text-[14px] font-black text-emerald-600">{(currentStats.legado || 0).toLocaleString('pt-BR')} <span className="text-[9px] text-slate-400">UCS</span></span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-50 relative overflow-hidden rounded-lg bg-amber-50/50 px-4 border border-amber-100">
                            <div className="absolute left-0 top-0 w-1 h-full bg-amber-300" />
                            <span className="text-[10px] font-black uppercase text-amber-700">Déficit (Câmbio BMTCA/UCS)</span>
                            <span className="text-[14px] font-black text-rose-500 tracking-tighter">0</span>
                          </div>
                          <div className="flex justify-between items-center py-3">
                            <span className="text-[10px] font-black uppercase text-slate-400">Restorno de Excesso</span>
                            <Badge className="bg-rose-50 text-rose-500 border border-rose-100 uppercase text-[8px] font-black">Indisponível Resta</Badge>
                          </div>
                        </div>
                      </div>

                      {/* STATUS DE AUDITORIA EXTERNO */}
                      <div className="bg-[#3A3F4E] rounded-2xl p-8 shadow-inner border border-slate-600 relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                          <ShieldCheck className="w-32 h-32 text-slate-300" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Status de Auditoria Externo</h3>
                          </div>
                          <p className="text-[11px] font-medium text-slate-300 leading-relaxed max-w-sm">
                            As bases técnicas para certificação de direitos e validação dos sistemas de originação e escrituração digital passam por robusta análise cruzada de conformidade.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONCILIAÇÃO DE CUSTÓDIA IMEI HERO BLOCK */}
                  <div className="bg-slate-100/70 rounded-[2rem] p-8 border border-slate-200 relative overflow-hidden shadow-sm mb-12">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
                          <History className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-tighter">Conciliação de Custódia IMEI</h2>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Ciclo Histórico 2018 — 2024</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase px-4 py-1.5 border-none tracking-widest shadow-lg shadow-emerald-500/20 rounded-full">
                        Conciliado
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Capturado (2018)</p>
                        <p className="text-[20px] font-black text-slate-800 tracking-tighter">0 <span className="text-[10px] text-slate-400 ml-0.5">UCS</span></p>
                      </div>
                      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Retornado (2023/24)</p>
                        <p className="text-[20px] font-black text-emerald-500 tracking-tighter">+0 <span className="text-[10px] text-emerald-500/60 ml-0.5">UCS</span></p>
                      </div>
                      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Saldo em Aberto</p>
                        <p className="text-[20px] font-black text-slate-800 tracking-tighter">0 <span className="text-[10px] text-slate-400 ml-0.5">UCS</span></p>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÕES TÉCNICAS SEQUENCIAIS */}
                  <div className="space-y-12">
                    <SectionBlock 
                      isGreen title="01. ORIGINAÇÃO (DISTRIBUIÇÃO DE SAFRA)" value={currentStats.originacao} type="originacao" 
                      data={currentData?.tabelaOriginacao || []} isEditing={isEditing}
                      onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })}
                      onRemove={(id: string) => handleRemoveItem('tabelaOriginacao', id)}
                      onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaOriginacao', id, updates)}
                    />

                    <SectionBlock 
                      isGreen title="02. CRÉDITOS AUDITADOS" value={currentStats.creditos} type="creditos" 
                      data={currentData?.tabelaCreditos || []} isEditing={isEditing}
                      onPaste={() => setPasteData({ section: 'tabelaCreditos', raw: '' })}
                      onRemove={(id: string) => handleRemoveItem('tabelaCreditos', id)}
                      onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaCreditos', id, updates)}
                    />

                    <SectionBlock 
                      isNegative title="03. MOVIMENTAÇÃO (SAÍDAS)" value={currentStats.movimentacao} type="movimentacao" 
                      data={currentData?.tabelaMovimentacao || []} isEditing={isEditing}
                      onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })}
                      onRemove={(id: string) => handleRemoveItem('tabelaMovimentacao', id)}
                      onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaMovimentacao', id, updates)}
                    />

                    <SectionBlock 
                      isAmber title="04. AQUISIÇÕES DE PORTFÓLIO" value={currentStats.aquisicao} type="aquisicao" 
                      data={currentData?.tabelaAquisicao || []} isEditing={isEditing}
                      onPaste={() => setIsAquisicaoModalOpen(true)}
                      onRemove={(id: string) => handleRemoveItem('tabelaAquisicao', id)}
                      onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaAquisicao', id, updates)}
                    />

                    <SectionBlock 
                      isAmber title="05. HISTÓRICO LEGADO (PORTFÓLIO ANTIGO)" value={currentStats.legado} type="legado" 
                      data={currentData?.tabelaLegado || []} isEditing={isEditing}
                      onPaste={() => setIsLegadoModalOpen(true)}
                      onRemove={(id: string) => handleRemoveItem('tabelaLegado', id)}
                      onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaLegado', id, updates)}
                    />

                    <SectionBlock 
                      customColor="bg-indigo-600" title="06. REGISTROS IMEI (CÂMBIO BMT/BMTCA)" value={currentStats.imei} type="imei" 
                      data={currentData?.tabelaImei || []} isEditing={isEditing}
                      onPaste={() => setPasteData({ section: 'tabelaImei', raw: '' })}
                      onRemove={(id: string) => handleRemoveItem('tabelaImei', id)}
                      onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaImei', id, updates)}
                    />

                    {/* 07. AUDITORIA DE SALDOS (RESUMO FINAL) */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <div className="w-1.5 h-6 rounded-full bg-slate-900" />
                        <h3 className="text-[14px] font-black uppercase tracking-tight text-slate-800">07. Conciliação & Auditoria Final</h3>
                      </div>
                      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                         <Table>
                           <TableHeader>
                              <TableRow className="bg-slate-50/50">
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-8">Metodologia de Auditoria</TableHead>
                                <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 pr-8">Valores Auditados (UCS)</TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              <TableRow><TableCell className="pl-8 text-[11px] font-bold text-slate-500 uppercase">Total Originação Legada (+) </TableCell><TableCell className="text-right pr-8 font-black text-emerald-600">{(currentStats.originacao || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                              <TableRow><TableCell className="pl-8 text-[11px] font-bold text-slate-500 uppercase">Total Créditos Adjudicados (+) </TableCell><TableCell className="text-right pr-8 font-black text-emerald-600">{(currentStats.creditos || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                              <TableRow><TableCell className="pl-8 text-[11px] font-bold text-slate-500 uppercase">Total Movimentação / Consumo (-) </TableCell><TableCell className="text-right pr-8 font-black text-rose-500">-{(currentStats.movimentacao || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                              <TableRow><TableCell className="pl-8 text-[11px] font-bold text-slate-500 uppercase">Saldo Custódia IMEI / BMTCA (+/-) </TableCell><TableCell className="text-right pr-8 font-black text-indigo-600">{currentStats.imei >= 0 ? '+' : ''}{(currentStats.imei || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                              <TableRow><TableCell className="pl-8 text-[11px] font-bold text-slate-500 uppercase">Ajuste Manual de Auditoria (+/-) </TableCell><TableCell className="text-right pr-8 font-black text-slate-400">
                                {isEditing && currentData ? (
                                  <Input 
                                    type="number" 
                                    value={currentData.ajusteManual || 0}
                                    onChange={e => setFormData((prev: any) => ({ ...prev, ajusteManual: parseFloat(e.target.value) || 0 }))}
                                    className="h-8 w-32 border-slate-100 text-right font-black"
                                  />
                                ) : (
                                  `${currentStats.ajusteManual >= 0 ? '+' : ''}${(currentStats.ajusteManual || 0).toLocaleString('pt-BR')}`
                                )}
                              </TableCell></TableRow>
                              <TableRow className="bg-slate-900 border-none">
                                <TableCell className="pl-8 text-[12px] font-black text-white uppercase py-6">Saldo Disponível Liquidado p/ Dossiê</TableCell>
                                <TableCell className="text-right pr-8 text-[20px] font-black text-emerald-400">{(currentStats.saldoReal || 0).toLocaleString('pt-BR')} UCS</TableCell>
                              </TableRow>
                           </TableBody>
                         </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SIDEBAR DIREITA */}
            <div className="w-[360px] shrink-0 bg-white flex flex-col relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] h-screen">
              <div className="p-10 border-b border-slate-100 shrink-0">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Central do Produtor</h3>
                <p className="text-[16px] font-black text-slate-900 uppercase leading-tight">Ações Técnicas e Gestão</p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-10 space-y-10 pb-32">
                  {!isEditing ? (
                    <div className="space-y-3">
                      <QuickLink icon={<Calculator className="w-5 h-5" />} label="Ativar Modo Auditoria" onClick={() => setIsEditing(true)} />
                      <QuickLink icon={<FileText className="w-5 h-5" />} label="Visualizar Dossiê (PDF)" onClick={() => setIsReportPreviewOpen(true)} />
                      <QuickLink icon={<Download className="w-5 h-5" />} label="Planilha de Saldos (XLSX)" onClick={() => handleExportXLSX(produtor, entityData, currentStats)} />
                      <QuickLink icon={<Download className="w-5 h-5" />} label="Base de Dados (JSON)" onClick={() => handleExportJSON(entityData, produtor.nome)} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all gap-3 shadow-lg shadow-emerald-100">
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button onClick={() => { setIsEditing(false); setFormData(entityData); }} variant="ghost" className="w-full h-12 rounded-2xl text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all">Cancelar</Button>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200/60 pb-4">Performance Técnica</h4>
                    <div className="space-y-5">
                      <StatCard label="Registros Auditados" value={Math.floor(currentStats.saldoReal).toString()} unit="un" />
                      <StatCard label="Fazendas Consolidadas" value={produtor.fazendas.length.toString()} unit="un" />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Legais</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <DocLink label="CCIR Consolidado" />
                      <DocLink label="CAR (Todas Fazendas)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODALS REUTILIZADOS */}
      <Dialog open={isAquisicaoModalOpen} onOpenChange={setIsAquisicaoModalOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-0 border-none bg-white font-sans">
          <div className="bg-indigo-600 p-8 pb-12">
            <DialogTitle className="text-white">Nova Aquisição ADM</DialogTitle>
          </div>
          <div className="p-8 -mt-8 bg-white rounded-t-[32px] space-y-6">
            <Input placeholder="Ano" value={manualAquisicao.data} onChange={e => setManualAquisicao({ ...manualAquisicao, data: e.target.value })} />
            <Input placeholder="Volume" type="number" value={manualAquisicao.valor} onChange={e => setManualAquisicao({ ...manualAquisicao, valor: parseFloat(e.target.value) || 0 })} />
            <Button onClick={handleAddAquisicaoManual} className="w-full h-12 bg-indigo-600">Lançar Registro</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
        <DialogContent className="max-w-3xl rounded-[32px] p-8">
          <DialogTitle className="text-xl font-black uppercase">Estação de Ingestão de Dados</DialogTitle>
          <Textarea
            className="min-h-[300px] mt-4 font-mono text-xs"
            placeholder="Cole as colunas aqui..."
            value={pasteData?.raw || ''}
            onChange={e => setPasteData({ ...pasteData!, raw: e.target.value })}
          />
          <div className="flex justify-end mt-6">
            <Button onClick={() => pasteData && onProcessPaste(pasteData.section)} className="bg-emerald-600 px-8">Processar Dados</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLegadoModalOpen} onOpenChange={setIsLegadoModalOpen}>
        <DialogContent className="max-w-2xl p-8 rounded-[32px]">
          <DialogTitle className="uppercase font-black">Histórico Legado</DialogTitle>
          <Textarea
            className="min-h-[200px] mt-4 font-mono text-xs"
            placeholder="ID DATA PLATAFORMA DISP RES BLOQ APO"
            onChange={e => setPasteData({ section: 'tabelaLegado', raw: e.target.value })}
          />
          <Button onClick={() => onProcessPaste('tabelaLegado')} className="mt-4 w-full bg-amber-600">Importar Legado</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportPreviewOpen} onOpenChange={setIsReportPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col p-0 rounded-[32px] border-none bg-slate-100 no-print">
          <div className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black uppercase text-slate-800 tracking-tight">Preview do Dossiê Técnico</DialogTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Revise as informações antes da exportação oficial</p>
              </div>
            </div>
            <div className="flex items-center gap-8 mr-12 bg-slate-50 p-2 px-6 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="simple-mode" checked={isReportSimplified} onChange={(e) => setIsReportSimplified(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                <label htmlFor="simple-mode" className="text-[10px] font-black uppercase text-slate-500 cursor-pointer">Simples</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="privacy-mode" checked={isReportCensored} onChange={(e) => setIsReportCensored(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                <label htmlFor="privacy-mode" className="text-[10px] font-black uppercase text-slate-500 cursor-pointer">Privacidade</label>
              </div>
              <Button onClick={() => window.print()} className="bg-emerald-600 h-11 px-8 rounded-2xl font-black uppercase text-[10px]">Gerar PDF</Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 custom-scrollbar">
            <div className="bg-white shadow-2xl rounded-sm mx-auto">
              <AuditReport 
                produtor={produtor} entityData={entityData} currentStats={currentStats} 
                currentUser={userData || user} isPreview={true} isSimplified={isReportSimplified} isCensored={isReportCensored} 
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrintPortal>
        <div className="is-printable-wrapper">
          <AuditReport 
            produtor={produtor} entityData={isEditing ? formData : entityData} currentStats={currentStats} 
            currentUser={userData || user} isSimplified={isReportSimplified} isCensored={isReportCensored} 
          />
        </div>
      </PrintPortal>
    </>
  );
}
