import React, { useState } from "react";
import { History, Table2, TrendingUp, TrendingDown, Landmark, ShieldCheck, Database, GitCommitHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { SectionBlock } from "./DashboardComponents";
import { AuditData } from "../hooks/useAuditLogic";
import { cn } from "@/lib/utils";

interface AuditSectionProps {
  currentStats: any;
  currentData: any;
  isEditing: boolean;
  setPasteData: (val: any) => void;
  handleRemoveItem: (section: keyof AuditData, id: string) => void;
  handleUpdateItem: (section: keyof AuditData, id: string, updates: any) => void;
  handleAddItem: (section: keyof AuditData) => void;
  setIsAquisicaoModalOpen: (val: boolean) => void;
  setFormData: (val: any) => void;
}

const AUDIT_TABS = [
  { id: 'imei-hero',      label: 'Custódia IMEI',  icon: ShieldCheck,          color: 'text-slate-700',   dot: 'bg-slate-700' },
  { id: 'originacao',     label: 'Originação',      icon: Database,             color: 'text-emerald-600', dot: 'bg-emerald-500' },
  { id: 'creditos',       label: 'Créditos',        icon: TrendingUp,           color: 'text-emerald-600', dot: 'bg-emerald-500' },
  { id: 'movimentacao',   label: 'Movimentação',    icon: TrendingDown,         color: 'text-rose-500',    dot: 'bg-rose-500' },
  { id: 'aquisicao',      label: 'Aquisições',      icon: Landmark,             color: 'text-amber-600',   dot: 'bg-amber-500' },
  { id: 'legado',         label: 'Legado',          icon: GitCommitHorizontal,  color: 'text-amber-600',   dot: 'bg-amber-500' },
  { id: 'imei',           label: 'IMEI',            icon: Table2,               color: 'text-indigo-600',  dot: 'bg-indigo-500' },
  { id: 'conciliacao',    label: 'Conciliação',     icon: History,              color: 'text-slate-800',   dot: 'bg-slate-900' },
] as const;

function scrollToSection(sectionId: string) {
  const el = document.getElementById(`audit-section-${sectionId}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function AuditSection({
  currentStats,
  currentData,
  isEditing,
  setPasteData,
  handleRemoveItem,
  handleUpdateItem,
  handleAddItem,
  setIsAquisicaoModalOpen,
  setFormData
}: AuditSectionProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('imei-hero');

  return (
    <div className="space-y-16">

      {/* MENU DE NAVEGAÇÃO POR TIPOS */}
      <div className="sticky top-0 z-30 -mx-10 px-10 py-3 bg-[#F8FAFC]/90 backdrop-blur-sm border-b border-slate-100/80">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {AUDIT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  scrollToSection(tab.id);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 shrink-0",
                  isActive
                    ? "bg-white shadow-md border border-slate-200/80 text-slate-900"
                    : "text-slate-400 hover:text-slate-700 hover:bg-white/60"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isActive ? tab.dot : "bg-slate-300")} />
                <Icon className={cn("w-3 h-3", isActive ? tab.color : "")} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONCILIAÇÃO DE CUSTÓDIA IMEI HERO BLOCK */}
      <div id="audit-section-imei-hero" className="bg-slate-100/70 rounded-[2.5rem] p-10 border border-slate-200 relative overflow-hidden shadow-sm">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
              <History className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Conciliação de Custódia IMEI</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1.5 text-emerald-600">Ciclo Histórico 2018 — 2024</p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white font-black text-[10px] uppercase px-5 py-2 border-none tracking-[0.2em] shadow-lg shadow-emerald-500/20 rounded-xl">
            Sincronizado
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Capturado (2018)</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">0 <span className="text-sm text-slate-400 ml-1">UCS</span></p>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Retornado (2023/24)</p>
            <p className="text-3xl font-black text-emerald-500 tracking-tighter">+0 <span className="text-sm text-emerald-500/60 ml-1">UCS</span></p>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Saldo em Aberto</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">0 <span className="text-sm text-slate-400 ml-1">UCS</span></p>
          </div>
        </div>
      </div>

      {/* SEÇÕES TÉCNICAS SEQUENCIAIS */}
      <div className="space-y-16">
        <div id="audit-section-originacao"><SectionBlock
          isGreen title="01. ORIGINAÇÃO (DISTRIBUIÇÃO DE SAFRA)" value={currentStats.originacao} type="originacao"
          data={currentData?.tabelaOriginacao || []} isEditing={isEditing}
          onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })}
          onAdd={() => handleAddItem('tabelaOriginacao')}
          onRemove={(id: string) => handleRemoveItem('tabelaOriginacao', id)}
          onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaOriginacao', id, updates)}
        /></div>

        <div id="audit-section-creditos"><SectionBlock
          isGreen title="02. CRÉDITOS AUDITADOS" value={currentStats.creditos} type="creditos"
          data={currentData?.tabelaCreditos || []} isEditing={isEditing}
          onPaste={() => setPasteData({ section: 'tabelaCreditos', raw: '' })}
          onAdd={() => handleAddItem('tabelaCreditos')}
          onRemove={(id: string) => handleRemoveItem('tabelaCreditos', id)}
          onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaCreditos', id, updates)}
        /></div>

        <div id="audit-section-movimentacao"><SectionBlock
          isNegative title="03. MOVIMENTAÇÃO (SAÍDAS)" value={currentStats.movimentacao} type="movimentacao"
          data={currentData?.tabelaMovimentacao || []} isEditing={isEditing}
          onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })}
          onAdd={() => handleAddItem('tabelaMovimentacao')}
          onRemove={(id: string) => handleRemoveItem('tabelaMovimentacao', id)}
          onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaMovimentacao', id, updates)}
        /></div>

        <div id="audit-section-aquisicao"><SectionBlock
          isAmber title="04. AQUISIÇÕES DE PORTFÓLIO" value={currentStats.aquisicao} type="aquisicao"
          data={currentData?.tabelaAquisicao || []} isEditing={isEditing}
          onPaste={() => setIsAquisicaoModalOpen(true)}
          onAdd={() => handleAddItem('tabelaAquisicao')}
          onRemove={(id: string) => handleRemoveItem('tabelaAquisicao', id)}
          onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaAquisicao', id, updates)}
        /></div>

        <div id="audit-section-legado"><SectionBlock
          isAmber title="05. HISTÓRICO LEGADO (PORTFÓLIO ANTIGO)" value={currentStats.legado} type="legado"
          data={currentData?.tabelaLegado || []} isEditing={isEditing}
          onPaste={() => setPasteData({ section: 'tabelaLegado', raw: '' })}
          onAdd={() => handleAddItem('tabelaLegado')}
          onRemove={(id: string) => handleRemoveItem('tabelaLegado', id)}
          onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaLegado', id, updates)}
        /></div>

        <div id="audit-section-imei"><SectionBlock
          customColor="bg-slate-900" title="06. REGISTROS IMEI (CÂMBIO BMT/BMTCA)" value={currentStats.imei} type="imei"
          data={currentData?.tabelaImei || []} isEditing={isEditing}
          onPaste={() => setPasteData({ section: 'tabelaImei', raw: '' })}
          onAdd={() => handleAddItem('tabelaImei')}
          onRemove={(id: string) => handleRemoveItem('tabelaImei', id)}
          onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaImei', id, updates)}
        /></div>

        {/* 07. AUDITORIA DE SALDOS (RESUMO FINAL) */}
        <div id="audit-section-conciliacao" className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-2 h-7 rounded-full bg-slate-900" />
            <h3 className="text-[15px] font-black uppercase tracking-tight text-slate-800">07. Conciliação & Auditoria Final</h3>
          </div>
          <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-xl shadow-slate-900/5">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 pl-10 h-16">Metodologia de Auditoria Aplicada</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 pr-10">Valores Auditados (UCS)</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                <TableRow className="h-14 border-b border-slate-50"><TableCell className="pl-10 text-[12px] font-bold text-slate-600 uppercase">Total Originação Legada (+)</TableCell><TableCell className="text-right pr-10 font-black text-emerald-600">{(currentStats.originacao || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                <TableRow className="h-14 border-b border-slate-50"><TableCell className="pl-10 text-[12px] font-bold text-slate-600 uppercase">Total Créditos Adjudicados (+)</TableCell><TableCell className="text-right pr-10 font-black text-emerald-600">{(currentStats.creditos || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                <TableRow className="h-14 border-b border-slate-50"><TableCell className="pl-10 text-[12px] font-bold text-slate-600 uppercase">Total Movimentação / Consumo (-)</TableCell><TableCell className="text-right pr-10 font-black text-rose-500">-{(currentStats.movimentacao || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                <TableRow className="h-14 border-b border-slate-50"><TableCell className="pl-10 text-[12px] font-bold text-slate-600 uppercase">Saldo Custódia IMEI / BMTCA (+/-)</TableCell><TableCell className="text-right pr-10 font-black text-indigo-600">{currentStats.imei >= 0 ? '+' : ''}{(currentStats.imei || 0).toLocaleString('pt-BR')}</TableCell></TableRow>
                <TableRow className="h-16 border-b border-slate-50"><TableCell className="pl-10 text-[12px] font-black text-slate-900 uppercase">Ajuste Manual de Auditoria (+/-)</TableCell><TableCell className="text-right pr-10">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentData.ajusteManual || 0}
                      onChange={e => setFormData((prev: any) => ({ ...prev, ajusteManual: parseFloat(e.target.value) || 0 }))}
                      className="h-10 w-40 border-slate-200 text-right font-black rounded-xl focus:ring-emerald-500/20 bg-slate-50"
                    />
                  ) : (
                    <span className="font-black text-slate-900">{currentStats.ajusteManual >= 0 ? '+' : ''}{(currentStats.ajusteManual || 0).toLocaleString('pt-BR')}</span>
                  )}
                </TableCell></TableRow>
                <TableRow className="bg-slate-900 border-none">
                  <TableCell className="pl-10 text-[13px] font-black text-white uppercase py-8">Saldo Disponível Liquidado p/ Dossiê</TableCell>
                  <TableCell className="text-right pr-10 text-[24px] font-black text-emerald-400">{(currentStats.saldoReal || 0).toLocaleString('pt-BR')} <span className="text-sm opacity-50 ml-1">UCS</span></TableCell>
                </TableRow>
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
