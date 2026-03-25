"use client"

import { useState, useMemo } from "react";
import { 
  FileText, 
  ShieldCheck, 
  Scale, 
  Printer, 
  Download, 
  Search, 
  ChevronRight, 
  FileSearch,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Filter,
  Layers,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { EntidadeSaldo, ReportType, AuditReportMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EntityAuditReport } from "./reports/EntityAuditReport";
import { FarmAuditReport } from "./reports/FarmAuditReport";
import { useAuditor } from "@/hooks/use-auditor";
import { PrintPortal } from "@/components/ui/print-portal";

const AVAILABLE_REPORTS: AuditReportMetadata[] = [
  {
    id: 'exec-audit',
    title: 'Relatório Executivo de Auditoria',
    description: 'Demonstrativo técnico completo de originação, movimentação e saldo atualizado.',
    icon: FileText,
    category: 'audit',
    template: 'executive'
  },
  {
    id: 'juridical-proof',
    title: 'Certificado de Contraprova Jurídica',
    description: 'Documento de compliance para fins judiciais com evidências de imutabilidade blockchain.',
    icon: Scale,
    category: 'compliance',
    template: 'juridico'
  },
  {
    id: 'cons-farm',
    title: 'Consolidado de Unidade Fundiária',
    description: 'Visão agrupada de todos os detentores vinculados a uma matrícula ou IDF.',
    icon: Layers,
    category: 'audit',
    template: 'consolidated'
  }
];

export function ReportCenter() {
  const { user } = useUser();
  const auditor = useAuditor();
  const firestore = useFirestore();
  const [searchTerm, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<EntidadeSaldo | null>(null);
  const [selectedReport, setSelectedReport] = useState<AuditReportMetadata | null>(AVAILABLE_REPORTS[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Busca produtores para seleção
  const producersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: producers, isLoading } = useCollection<EntidadeSaldo>(producersQuery);

  const filteredProducers = useMemo(() => {
    if (!searchTerm) return producers || [];
    const q = searchTerm.toLowerCase();
    return (producers || []).filter(p => 
      p.nome.toLowerCase().includes(q) || 
      p.documento.includes(q) || 
      p.propriedade?.toLowerCase().includes(q)
    );
  }, [producers, searchTerm]);

  const handleGenerate = () => {
    if (!selectedEntity) return;
    setIsGenerating(true);
    // Simula processamento técnico de reconciliação
    setTimeout(() => {
      setIsGenerating(false);
      window.print();
    }, 1500);
  };

  const totals = useMemo(() => {
    if (!selectedEntity) return null;
    return {
      orig: selectedEntity.saldoParticionado || selectedEntity.originacao || 0,
      mov: selectedEntity.movimentacao || 0,
      final: selectedEntity.saldoFinalAtual || 0
    };
  }, [selectedEntity]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-full overflow-hidden">
      {/* SELEÇÃO DE DADOS (ESQUERDA) */}
      <div className="lg:col-span-4 flex flex-col gap-8 overflow-hidden no-print">
        <div className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">1. Selecionar Alvo da Auditoria</h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nome, documento ou fazenda..."
              className="h-14 pl-12 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-primary"
              value={searchTerm}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="flex-1 rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Carregando Ledger...</span>
                </div>
              ) : filteredProducers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedEntity(p)}
                  className={cn(
                    "w-full text-left p-5 rounded-[1.5rem] transition-all flex items-center justify-between group",
                    selectedEntity?.id === p.id 
                      ? "bg-primary text-white shadow-lg shadow-emerald-100" 
                      : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <div className="space-y-1 overflow-hidden">
                    <p className={cn(
                      "text-[12px] font-black uppercase truncate tracking-tight",
                      selectedEntity?.id === p.id ? "text-white" : "text-slate-900"
                    )}>{p.nome}</p>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[9px] font-bold font-mono",
                        selectedEntity?.id === p.id ? "text-emerald-100" : "text-slate-400"
                      )}>{p.documento}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        selectedEntity?.id === p.id ? "text-emerald-200" : "text-primary"
                      )}>Safra {p.safra}</span>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-transform",
                    selectedEntity?.id === p.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100"
                  )} />
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* CONFIGURAÇÃO DO RELATÓRIO (CENTRO/DIREITA) */}
      <div className="lg:col-span-8 flex flex-col gap-8 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0 no-print">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">2. Escolher Template</h3>
            <div className="grid grid-cols-1 gap-3">
              {AVAILABLE_REPORTS.map(rep => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={cn(
                    "p-5 rounded-2xl border-2 text-left transition-all flex gap-4",
                    selectedReport?.id === rep.id 
                      ? "bg-white border-primary shadow-md" 
                      : "bg-slate-50 border-transparent hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    selectedReport?.id === rep.id ? "bg-primary/10 text-primary" : "bg-white text-slate-400"
                  )}>
                    <rep.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[12px] font-black uppercase text-slate-900 tracking-tight">{rep.title}</p>
                    <p className="text-[10px] font-medium text-slate-400 leading-snug mt-1">{rep.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">3. Opções de Emissão</h3>
            <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-white space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Auditor Responsável</label>
                <div className="h-14 px-5 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] font-black text-slate-600 uppercase truncate">
                      {auditor?.nome || user?.email?.split('@')[0]}
                    </span>
                    {auditor?.cpf && (
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">
                        {auditor.cpf} <span className="text-slate-200">|</span> {auditor.cargo || "Auditor"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Referência</label>
                <div className="h-12 px-5 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-600 uppercase">{new Date().toLocaleDateString('pt-BR')} (HOJE)</span>
                </div>
              </div>
              <Button 
                onClick={handleGenerate}
                disabled={!selectedEntity || isGenerating}
                className="w-full h-16 rounded-2xl bg-[#0B0F1A] hover:bg-[#161B2E] text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> RECONCILIANDO LEDGER...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" /> GERAR CERTIFICADO PDF
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>

        {/* ÁREA DE PREVIEW (ABAIXO) */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden no-print">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">4. Visualização Prévia do Documento</h3>
          <Card className="flex-1 rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 overflow-hidden relative group">
            {selectedEntity ? (
              <div className="absolute inset-0 bg-white flex flex-col items-center p-10 overflow-hidden shadow-inner">
                <div className="w-[210mm] h-full bg-white shadow-2xl border border-slate-100 transform origin-top scale-[0.6] lg:scale-[0.7] xl:scale-[0.8] transition-all">
                   {/* Aqui renderizamos o componente de report real para o preview */}
                   <div className="p-10 pointer-events-none">
                      <header className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-amber-500 rounded-lg" />
                          <span className="text-[24px] font-black text-slate-900 uppercase">bmv</span>
                        </div>
                        <div className="text-right">
                          <h2 className="text-[12px] font-black uppercase text-slate-900">{selectedReport?.title}</h2>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">PROTOCOLO: PREVIEW_MODE</p>
                        </div>
                      </header>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Titular</p>
                            <p className="text-[16px] font-black text-slate-900 uppercase">{selectedEntity.nome}</p>
                          </div>
                          <div className="space-y-2 text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Saldo Auditado</p>
                            <p className="text-[20px] font-black text-emerald-600">{selectedEntity.saldoFinalAtual?.toLocaleString('pt-BR')} UCS</p>
                          </div>
                        </div>
                        <div className="h-40 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center italic text-slate-300 text-[10px]">
                          [ Dados de Auditoria LedgerTrust ]
                        </div>
                      </div>
                   </div>
                </div>
                <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-all flex items-center justify-center">
                   <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-slate-100 flex items-center gap-3">
                      <FileSearch className="w-5 h-5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Modo de Inspeção Ativo</span>
                   </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center gap-6 opacity-30">
                <FileSearch className="w-16 h-16 text-slate-300" />
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">Nenhum alvo selecionado</p>
                  <p className="text-[10px] text-slate-300 mt-1 uppercase font-bold">Selecione um produtor à esquerda para configurar o relatório</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* COMPONENTES DE IMPRESSÃO REAIS (PORTAL) */}
      {selectedEntity && selectedReport && (
        <PrintPortal>
          <div className="is-printable-wrapper">
            {selectedReport.template === 'consolidated' ? (
              <FarmAuditReport 
                entity={selectedEntity} 
                participants={[selectedEntity]} 
                farmTotals={{ totalOrig: selectedEntity.originacao, totalFinal: selectedEntity.saldoFinalAtual }}
                reportType="executive"
                userEmail={user?.email || ""}
                auditor={auditor}
              />
            ) : (
              <EntityAuditReport 
                entity={selectedEntity} 
                totals={totals}
                reportType={selectedReport.template as any}
                userEmail={user?.email || ""}
                auditor={auditor}
                isCensored={false}
              />
            )}
          </div>
        </PrintPortal>
      )}
    </div>
  );
}
