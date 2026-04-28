"use client"

import { useParams, useRouter } from "next/navigation";
import { updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Loader2, Calculator, Save,
  FileText, Download, Droplets,
  ChevronLeft, ShieldCheck, LayoutGrid, List,
  History, Table2, Building2, ShieldAlert, Lock, User, Trash2, PlusCircle
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
    currentData, currentStats, handleUpdateItem, handleRemoveItem, handleProcessPaste, handleAddItem
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
  const [showRiskControl, setShowRiskControl] = useState(false);

  // Ações de Persistência
  const handleSave = async () => {
    if (!entityRef || !produtor) return;
    setIsSaving(true);
    try {
      // Calculamos a distribuição APENAS para fins de consulta rápida e relatórios,
      // sem alterar o saldo base original das fazendas.
      const distribuicaoAuditada = produtor.fazendas.map((f: any) => {
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

        const farmOrig = (formData?.tabelaOriginacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0)) || Number(f.saldoOriginacao) || 0;
        const farmConsumo = formData?.tabelaMovimentacao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0;
        const farmAquisicao = formData?.tabelaAquisicao?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0;
        const farmAposentado = (formData?.tabelaLegado?.filter((row: any) => safeMatch(row.dist) || safeMatch(row.plataforma)).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0)) || Number(f.aposentado) || 0;

        return {
          idf: f.idf,
          fazendaNome: f.fazendaNome,
          origemAuditoria: farmOrig,
          consumoAuditado: farmConsumo,
          aquisicaoAuditada: farmAquisicao,
          aposentadoAuditado: farmAposentado,
          saldoDisponivelCalculado: farmOrig - farmConsumo - farmAquisicao - farmAposentado
        };
      });

      await updateDoc(entityRef, {
        ...formData, // Persiste as tabelas de movimentação (rastreabilidade total)
        auditConsolidado: {
          resumo: {
            origincacaoTotal: currentStats.originacao,
            creditosTotal: currentStats.creditos,
            consumoTotal: currentStats.movimentacao,
            aquisicaoTotal: currentStats.aquisicao,
            imeiTotal: currentStats.imei,
            bloqueadoTotal: currentStats.bloqueado,
            aposentadoTotal: currentStats.aposentado,
            saldoFinalDisponivel: currentStats.saldoReal
          },
          justificativaTecnica: formData?.ajusteManualJustificativa || "",
          distribuicaoPorFazenda: distribuicaoAuditada,
          auditadoPor: user?.email || 'NXT System',
          dataAuditoria: new Date().toISOString()
        },
        statusAuditoria: currentStats.bloqueado > 0 ? 'BLOQUEADO' : 'CONCLUIDO',
        updatedAt: new Date().toISOString()
      });

      setIsEditing(false);
      setShowRiskControl(false);
      toast.success("Consolidação de auditoria salva com sucesso! O saldo original foi preservado.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar consolidação.");
    } finally {
      setIsSaving(false);
    }
  };

  const onProcessPaste = (section: keyof AuditData) => {
    if (!pasteData) return;
    const success = handleProcessPaste(section, pasteData.raw);
    if (success) {
      setPasteData(null);
      setIsLegadoModalOpen(false);
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
      {/* OVERLAY DE PROCESSAMENTO / SALVAMENTO */}
      {isSaving && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="text-center space-y-8 max-w-sm w-full px-6">
              <div className="relative w-24 h-24 mx-auto">
                 <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                 <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                 <div className="absolute inset-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 animate-pulse" />
                 </div>
              </div>
              
              <div className="space-y-3">
                 <h3 className="text-lg font-black text-white uppercase tracking-widest">Consolidando Auditoria</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando dados e particionamento...</p>
              </div>

              <div className="relative h-1.5 w-full bg-slate-700 rounded-full overflow-hidden shadow-inner">
                 <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-progress" style={{ width: '0%' }} />
              </div>

              <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                 <span>Processando Camadas</span>
                 <span>NXT UCS V2</span>
              </div>
           </div>

           <style jsx>{`
             @keyframes progress {
               0% { width: 0%; }
               50% { width: 70%; }
               100% { width: 100%; }
             }
             .animate-progress {
               animation: progress 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
             }
           `}</style>
        </div>
      )}

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

                    <div className="max-w-xl">
                      <div className="flex items-center gap-3 mb-1">
                        <Badge className={cn("text-[9px] font-black uppercase px-2 py-0 border-none", produtor.tipo === 'PJ' ? "bg-indigo-500" : "bg-emerald-500")}>
                          {produtor.tipo}
                        </Badge>
                        <p className="text-slate-500 font-mono text-[10px] font-bold tracking-tight">{produtor.documento}</p>
                        {currentStats.bloqueado > 0 && (
                          <Badge className="bg-rose-600 text-white border-none font-black text-[9px] uppercase px-4 py-1.5 rounded-lg flex items-center gap-2 animate-pulse shadow-lg shadow-rose-200">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Conta Restrita / Bloqueada
                          </Badge>
                        )}
                      </div>
                      <h1 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter leading-tight truncate max-w-[360px]">
                        {produtor.nome}
                      </h1>
                      <div className="mt-2 flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", produtor.fazendas.length > 0 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-500")} />
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            {produtor.fazendas.length > 0 ? `${produtor.fazendas.length} PROPRIEDADES` : 'Sem Fazendas Vinculadas'}
                         </p>
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
                  
                  {/* BANNER DE GESTÃO DE RISCO (ZONA DE AUDITORIA) */}
                  {isEditing && showRiskControl && (
                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-full h-1 bg-rose-500" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500 opacity-[0.02] rounded-full -mb-16 -ml-16" />
                      
                      <div className="flex flex-col lg:flex-row gap-12 items-center">
                        <div className="w-[320px] shrink-0 lg:border-r border-slate-100 lg:pr-12">
                           <div className="flex items-center gap-4 mb-4">
                             <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-xl shadow-rose-200">
                                <ShieldAlert className="w-6 h-6" />
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] leading-none mb-1">Audit Mode</p>
                               <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Controle de Risco</h3>
                             </div>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">Use esta seção para bloqueios técnicos e saneamento de balanço. Todas as ações exigem justificativa.</p>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
                          <div className="space-y-4">
                             <div className="flex items-center justify-between ml-1">
                                <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Volume UCS em Bloqueio</label>
                                <button 
                                  onClick={() => {
                                    const currentAvailable = currentStats.saldoReal || 0;
                                    const currentTotalBlocked = currentStats.bloqueado || 0;
                                    const newConsolidatedTotal = currentTotalBlocked + currentAvailable;
                                    
                                    setFormData((prev: any) => ({ ...prev, bloqueado: newConsolidatedTotal }));
                                    toast.success(`Consolidando bloqueio total: ${newConsolidatedTotal.toLocaleString('pt-BR')} UCS`);
                                  }}
                                  className="text-[8px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-md border border-rose-100 transition-colors"
                                >
                                  Bloquear Saldo Integral
                                </button>
                             </div>
                             <div className="relative">
                                <Input 
                                  type="number"
                                  value={formData?.bloqueado || 0}
                                  onChange={e => setFormData((prev: any) => ({ ...prev, bloqueado: parseFloat(e.target.value) || 0 }))}
                                  className="h-16 bg-rose-50/20 border-rose-100 rounded-2xl pl-16 text-3xl font-black text-rose-700 outline-none focus-visible:ring-rose-500 transition-all" 
                                />
                                <Lock className="absolute left-6 top-5 w-6 h-6 text-rose-300" />
                                <div className="absolute right-6 top-6 text-[8px] font-black text-rose-400 uppercase">Pool Técnico</div>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Histórico Legado & Justificativa</label>
                             <div className="space-y-3">
                                <textarea
                                  placeholder="Ex: Auditoria IMEI consolidada..."
                                  value={formData?.ajusteManualJustificativa || ""}
                                  onChange={e => setFormData((prev: any) => ({ ...prev, ajusteManualJustificativa: e.target.value }))}
                                  className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[11px] font-medium text-slate-700 focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                                />
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                                      <User className="w-3 h-3 text-slate-400" />
                                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[120px]">{user?.displayName || user?.email}</span>
                                   </div>
                                   <Badge className="bg-rose-500/10 text-rose-500 border-none text-[8px] uppercase font-black px-3 py-1">Ação Auditada</Badge>
                                </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* PORTFÓLIO DE PROPRIEDADES */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                         <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight flex gap-2 items-center">Portfólio de Propriedades</h3>
                       </div>
                    </div>

                    
                        <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/50">
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-8">Propriedade / IDF</TableHead>
                                <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Originação</TableHead>
                                <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Consumo</TableHead>
                                <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Aquisição</TableHead>
                                <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Aposentado</TableHead>
                                <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 pr-8">Saldo Líquido</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {produtor.fazendas.map((f: any, i: number) => {
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
                                const farmSaldo = farmOrig - farmDeduction - farmAquisicao - farmAposentado;
 
                                return (
                                  <TableRow 
                                    key={i} 
                                    onClick={() => router.push(`/fazendas/${f.fazendaId}`)}
                                    className="group hover:bg-slate-50 cursor-pointer transition-all h-14"
                                  >
                                    <TableCell className="pl-8">
                                      <div className="flex items-center gap-3">
                                        {currentStats.bloqueado > 0 && (
                                          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm animate-pulse">
                                            <ShieldAlert className="w-4 h-4" />
                                          </div>
                                        )}
                                        <div className="flex flex-col">
                                          <span className={cn(
                                            "text-[12px] font-black uppercase flex items-center gap-2",
                                            currentStats.bloqueado > 0 ? "text-rose-900" : "text-slate-900"
                                          )}>
                                            {f.fazendaNome}
                                            {currentStats.bloqueado > 0 && (
                                              <span className="text-[7px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-sm font-black tracking-widest">RESRITA</span>
                                            )}
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-400 uppercase">IDF: {f.idf}</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center text-[12px] font-black text-slate-600">
                                      {farmOrig.toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-center text-[12px] font-black text-rose-400">
                                      -{farmDeduction.toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-center text-[12px] font-black text-indigo-400">
                                      -{farmAquisicao.toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-center text-[12px] font-black text-slate-400">
                                      -{farmAposentado.toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-right pr-8 text-[13px] font-black text-emerald-600">
                                      {farmSaldo.toLocaleString('pt-BR')}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* SUBTOTAL FAZENDAS */}
                              <TableRow className="bg-slate-50/30 border-t-2 border-slate-100">
                                <TableCell className="pl-8 text-[10px] font-black text-slate-500 uppercase py-4">Subtotal Fazendas</TableCell>
                                <TableCell className="text-center text-[13px] font-black text-slate-900">{currentStats.originacao.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-center text-[13px] font-black text-rose-500">-{currentStats.movimentacao.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-center text-[13px] font-black text-indigo-600">-{currentStats.aquisicao.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-center text-[13px] font-black text-slate-500">-{currentStats.aposentado.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-right pr-8 text-[14px] font-black text-slate-900">
                                  {(currentStats.originacao - currentStats.movimentacao - currentStats.aquisicao - currentStats.aposentado).toLocaleString('pt-BR')}
                                </TableCell>
                              </TableRow>
                              {/* SALDO REAL DISPONÍVEL */}
                              <TableRow className="bg-emerald-50/50 border-none">
                                <TableCell colSpan={5} className="pl-8 text-[11px] font-black text-emerald-700 uppercase py-5">Saldo Real Disponível</TableCell>
                                <TableCell className="text-right pr-8 text-[18px] font-black text-emerald-600">
                                  {currentStats.saldoReal.toLocaleString('pt-BR')}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
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
                      hideValue={true}
                    />

                    <div className="bg-slate-900 rounded-[2rem] p-10 border border-slate-800 relative overflow-hidden shadow-2xl mb-12 group">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 animate-pulse" />
                      
                      <div className="flex justify-between items-start mb-10 relative z-10">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-900/20 group-hover:rotate-6 transition-transform">
                            <Calculator className="w-7 h-7" />
                          </div>
                          <div>
                            <h2 className="text-[16px] font-black text-white uppercase tracking-tighter">06. Conciliação de Custódia IMEI</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Intercâmbio de Ativos e Fluxo Histórico</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] uppercase px-5 py-2 tracking-widest rounded-full">
                          Ciclo 2018 — 2024
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col justify-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Capturado (2018)</p>
                          <p className="text-[24px] font-black text-white tracking-tighter">{(currentStats.imei < 0 ? Math.abs(currentStats.imei) : 0).toLocaleString('pt-BR')} <span className="text-[12px] text-slate-500 ml-1">UCS</span></p>
                        </div>
                        <div className="bg-emerald-500/5 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/10 flex flex-col justify-center">
                          <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mb-2">Retornado (2023/24)</p>
                          <p className="text-[24px] font-black text-emerald-400 tracking-tighter">+{(currentStats.imei > 0 ? currentStats.imei : 0).toLocaleString('pt-BR')} <span className="text-[12px] text-emerald-500/40 ml-1">UCS</span></p>
                        </div>
                        <div className="bg-indigo-500/10 backdrop-blur-md rounded-2xl p-6 border border-indigo-500/20 flex flex-col justify-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                             <History className="w-12 h-12 text-indigo-400" />
                          </div>
                          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Saldo em Aberto</p>
                          <p className="text-[24px] font-black text-white tracking-tighter">{currentStats.imei.toLocaleString('pt-BR')} <span className="text-[12px] text-indigo-400 ml-1">UCS</span></p>
                        </div>
                      </div>

                      {/* TABELA DE LANÇAMENTOS COM DÉBITO E CRÉDITO */}
                      <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl relative z-10">
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                           <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Detalhamento de Fluxo IMEI</h4>
                           <div className="flex items-center gap-3">
                              {isEditing && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleAddItem('tabelaImei', { data: new Date().toLocaleDateString('pt-BR'), origem: 'LANÇAMENTO IMEI', debito: 0, credito: 0, statusAuditoria: 'Concluido' })}
                                  className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase px-4"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 mr-2" /> Novo Lançamento
                                </Button>
                              )}
                           </div>
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50 border-none">
                              <TableHead className="pl-8 text-[9px] font-black uppercase text-slate-400">Data</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-400">Descrição/Origem</TableHead>
                              <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Débito (-)</TableHead>
                              <TableHead className="text-center text-[9px] font-black uppercase text-slate-400">Crédito (+)</TableHead>
                              {isEditing && <TableHead className="w-10 pr-8"></TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(currentData?.tabelaImei || []).length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="h-24 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhum lançamento registrado</TableCell></TableRow>
                            ) : (currentData?.tabelaImei || []).map((row: any) => (
                              <TableRow key={row.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="pl-8 text-[11px] font-black text-slate-900">{row.data}</TableCell>
                                <TableCell className="text-[11px] font-medium text-slate-600">{row.origem || row.descricao || '---'}</TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Input 
                                      type="number"
                                      value={row.debito || 0}
                                      onChange={e => handleUpdateItem('tabelaImei', row.id, { debito: parseFloat(e.target.value) || 0 })}
                                      className="h-8 w-24 mx-auto text-center font-black text-rose-500 bg-transparent border-slate-100"
                                    />
                                  ) : (
                                    <span className="text-[12px] font-black text-rose-500">{(row.debito || 0) > 0 ? `-${row.debito.toLocaleString('pt-BR')}` : '---'}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Input 
                                      type="number"
                                      value={row.credito || 0}
                                      onChange={e => handleUpdateItem('tabelaImei', row.id, { credito: parseFloat(e.target.value) || 0 })}
                                      className="h-8 w-24 mx-auto text-center font-black text-emerald-500 bg-transparent border-slate-100"
                                    />
                                  ) : (
                                    <span className="text-[12px] font-black text-emerald-500">{(row.credito || 0) > 0 ? `+${row.credito.toLocaleString('pt-BR')}` : '---'}</span>
                                  )}
                                </TableCell>
                                {isEditing && (
                                  <TableCell className="pr-8 text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem('tabelaImei', row.id)} className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* ANALISE DE DIVERGENCIA DA IMEI */}
                        {(() => {
                           const sumTransactions = (currentData?.tabelaImei || []).reduce((acc: number, cur: any) => acc + (cur.credito || 0) - (cur.debito || 0), 0);
                           const imeiDivergence = Math.abs(currentStats.imei - sumTransactions);
                           
                           if (imeiDivergence > 1) {
                             return (
                               <div className="p-6 bg-rose-50 border-t border-rose-100 flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
                                       <ShieldAlert className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <p className="text-[11px] font-black text-rose-700 uppercase leading-none mb-1">Divergência IMEI Detectada</p>
                                       <p className="text-[10px] font-medium text-rose-500">A soma dos lançamentos ({sumTransactions.toLocaleString('pt-BR')}) não confere com o saldo em aberto.</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <p className="text-xl font-black text-rose-600">Δ {imeiDivergence.toLocaleString('pt-BR')}</p>
                                    {isEditing && (
                                      <Button 
                                        onClick={() => {
                                          const diff = currentStats.imei - sumTransactions;
                                          handleAddItem('tabelaImei', { 
                                            data: new Date().toLocaleDateString('pt-BR'), 
                                            origem: 'AJUSTE TÉCNICO DE CONCILIAÇÃO', 
                                            credito: diff > 0 ? Math.abs(diff) : 0,
                                            debito: diff < 0 ? Math.abs(diff) : 0,
                                            statusAuditoria: 'Concluido' 
                                          });
                                          toast.success("Ajuste de IMEI aplicado com sucesso!");
                                        }}
                                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[9px] font-black uppercase px-6 h-10"
                                      >
                                        Conciliar Automaticamente
                                      </Button>
                                    )}
                                 </div>
                               </div>
                             );
                           }
                           return (
                             <div className="p-6 bg-emerald-50 border-t border-emerald-100 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                   <ShieldCheck className="w-4 h-4" />
                                </div>
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Conciliação IMEI Verificada e Balanceada</p>
                             </div>
                           );
                        })()}
                      </div>
                    </div>

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
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                      

                      <div className="space-y-6">
                        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 flex flex-col gap-4">
                           <div className="flex items-center gap-3">
                              <Lock className="w-4 h-4 text-rose-500" />
                              <h4 className="text-[10px] font-black text-rose-900 uppercase">Segurança de Saldo</h4>
                           </div>
                           <Button 
                             onClick={() => setShowRiskControl(!showRiskControl)}
                             className={cn(
                               "w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm border transition-all",
                               showRiskControl 
                                ? "bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200" 
                                : "bg-white border-slate-200 text-slate-600 hover:border-rose-400 hover:text-rose-600 shadow-none"
                             )}
                           >
                             {showRiskControl ? "Ocultar Ajuste" : "Ajustar Saldo Bloqueado"}
                           </Button>
                        </div>

                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed px-4 text-center">
                          Você está em modo de edição. Todas as alterações serão registradas no histórico do produtor.
                        </p>
                        <Button 
                          onClick={handleSave} 
                          disabled={isSaving}
                          className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3"
                        >
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          Salvar Auditoria
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => { setIsEditing(false); setFormData(entityData); }} 
                          className="w-full h-12 text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest"
                        >
                          Cancelar Alterações
                        </Button>
                      </div>
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
