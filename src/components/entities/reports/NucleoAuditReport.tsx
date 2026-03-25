"use client"

import { EntidadeSaldo } from "@/lib/types";
import { ShieldCheck, QrCode, Landmark, Scale } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface NucleoAuditReportProps {
  entity: EntidadeSaldo;
  linkedProducers: any[];
  stats: {
    uniqueProducers: number;
    uniqueFarms: number;
    totalOriginacao: number;
    totalSaldoAssoc: number;
    totalSaldoProd: number;
    avgPart: number;
  };
  reportType: 'executive' | 'juridico';
  userEmail?: string;
  isCensored?: boolean;
}

export function NucleoAuditReport({ entity, linkedProducers, stats, reportType, userEmail, isCensored }: NucleoAuditReportProps) {
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

  const nucleoName = entity.nucleo || entity.associacaoNome || 'Sem Nome';
  const assocCnpj = entity.associacaoCnpj || '';

  return (
    <div className="printable-audit-report hidden print:block bg-white text-slate-900 p-0 font-sans premium-report transition-all duration-500">
      {reportType === 'executive' ? (
        <div className="px-12 py-12">
          <div className="flex justify-between items-start border-b-4 border-amber-500 pb-8 mb-12">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-[42px] font-black text-amber-500 leading-none tracking-tighter">bmv</span>
                <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1">Audit Nucleus</span>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-[22px] font-black uppercase tracking-tight leading-tight text-slate-900">Relatório Executivo de Núcleo</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{nucleoName}</p>
              <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Sincronização: {new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-16">
            <div className="space-y-8">
              <h3 className="text-[12px] font-black text-slate-400 uppercase border-b-2 border-slate-100 pb-3 tracking-[0.2em]">CUSTÓDIA COLETIVA</h3>
              <div className="space-y-5">
                <h4 className="text-[32px] font-black text-slate-900 leading-none uppercase tracking-tighter">{nucleoName}</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">CNPJ ASSOCIAÇÃO</p>
                    <p className="text-[14px] font-black text-slate-600 font-mono italic">{maskText(assocCnpj)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Base de Membros</p>
                    <p className="text-[14px] font-black text-slate-600 uppercase">{stats.uniqueProducers} Produtores</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-amber-50/30 rounded-[3rem] p-10 border-2 border-amber-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16"></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">SUMÁRIO DE CUSTÓDIA</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-amber-200 pb-4">
                  <p className="text-amber-600/60 font-black text-[9px] uppercase tracking-widest leading-none">Total Originado na Base</p>
                  <p className="text-[26px] font-black text-slate-900 font-mono tracking-tighter">{formatUCS(stats.totalOriginacao)}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div>
                    <p className="text-amber-600 font-black text-[11px] uppercase tracking-[0.3em] mb-1 leading-none">Saldo Retido Protocolado</p>
                    <p className="text-[46px] font-black text-amber-600 font-headline leading-none">
                      {formatUCS(stats.totalSaldoAssoc)} <span className="text-[18px] text-amber-500/40 leading-none">UCS</span>
                    </p>
                  </div>
                  <QrCode className="w-16 h-16 text-amber-200" />
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4">
              <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-[0.2em]">01. Unidades de Conservação Vinculadas</h3>
              <span className="legal-verify-badge">LedgerTrust Active ✓</span>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b-2 border-slate-200">
                    <TableHead className="text-[11px] font-black uppercase text-slate-500 py-4 pl-10">Unidade / Propriedade</TableHead>
                    <TableHead className="text-[11px] font-black uppercase text-slate-500 py-4 text-center">Part %</TableHead>
                    <TableHead className="text-[11px] font-black uppercase text-slate-500 py-4 text-right pr-10">Volume Retido (UCS)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedProducers.map((p, idx) => (
                    <TableRow key={idx} className="border-b border-slate-100 h-16">
                      <TableCell className="pl-10">
                        <p className="text-[12px] font-black uppercase text-slate-900">{p.propriedade}</p>
                        <p className="text-[10px] text-slate-400 font-mono italic">{maskText(p.nome)}</p>
                      </TableCell>
                      <TableCell className="text-[12px] font-black text-center text-slate-400">{(p.associacaoParticionamento || 0).toLocaleString('pt-BR')}%</TableCell>
                      <TableCell className="text-[13px] font-black text-right pr-10 text-amber-700 font-mono tracking-tighter">{formatUCS(p.associacaoSaldo)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-950 text-white h-20">
                    <TableCell colSpan={2} className="text-[13px] font-black uppercase pl-10 tracking-[0.2em]">Total sob Governança do Núcleo</TableCell>
                    <TableCell className="text-[24px] font-black text-right pr-10 text-amber-500 font-mono tracking-tighter">{formatUCS(stats.totalSaldoAssoc)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          <footer className="mt-24 pt-12 border-t-4 border-slate-100 flex justify-between items-end text-slate-400">
             <div className="flex items-center gap-4">
                <Landmark className="w-8 h-8 opacity-20" />
                <p className="text-[9px] uppercase font-black tracking-widest leading-loose max-w-sm">
                   Documento emitido para fins de validação de custódia coletiva.
                   Governança ambiental BMV LedgerTrust.
                </p>
             </div>
             <div className="text-right">
                <p className="text-[11px] font-black text-slate-900 uppercase">{userEmail || "SYSTEM_AUDITOR"}</p>
                <p className="text-[9px] font-bold uppercase mt-1">Resp. Técnica BMV Global</p>
             </div>
          </footer>
        </div>
      ) : (
        <div className="px-16 py-16">
           <header className="flex justify-between items-start mb-20 border-b-8 border-slate-900 pb-12">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-xl p-4">
                  <Scale className="w-full h-full text-slate-900" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none mb-2">Protocolo de Evidência – Custódia Coletiva</span>
                  <h1 className="text-[52px] font-black text-slate-950 tracking-tighter leading-none uppercase">{nucleoName}</h1>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="legal-verify-badge">Rastreabilidade Certificada</div>
                <span className="text-[20px] font-black text-slate-300 font-mono tracking-[0.2em]">{maskText(assocCnpj) || 'NUCLEO_ID_SEC'}</span>
              </div>
            </div>
            <div className="gold-seal relative">
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <Image src="/image/logo_amarelo.png" alt="BMV" width={60} height={60} className="object-contain opacity-40 grayscale contrast-200" />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-10 mb-20">
            <div className="bg-slate-50 p-12 rounded-[4rem] border-4 border-slate-100 flex flex-col items-center text-center shadow-sm">
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">Produtores Vinculados</p>
              <p className="text-[42px] font-black text-slate-900 font-mono tracking-tighter leading-none mb-1">{stats.uniqueProducers}</p>
              <p className="text-[11px] text-slate-300 font-black tracking-widest uppercase">Membros Ativos</p>
            </div>
            <div className="bg-slate-50 p-12 rounded-[4rem] border-4 border-slate-100 flex flex-col items-center text-center shadow-sm">
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">Área em Conservação</p>
              <p className="text-[42px] font-black text-slate-900 font-mono tracking-tighter leading-none mb-1">{formatUCS(stats.totalOriginacao)}</p>
              <p className="text-[11px] text-slate-300 font-black tracking-widest uppercase">Base HA/UCS</p>
            </div>
            <div className="bg-slate-950 p-12 rounded-[4rem] border-4 border-slate-800 flex flex-col items-center text-center shadow-2xl scale-105">
              <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Custódia Núcleo Total</p>
              <p className="text-[46px] font-black text-amber-500 font-mono tracking-tighter leading-none mb-1">{formatUCS(stats.totalSaldoAssoc)}</p>
              <p className="text-[12px] text-amber-500/40 font-black tracking-[0.2em] uppercase">UCS AUDITADAS</p>
            </div>
          </div>

          <section className="space-y-12">
            <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] border-b-2 border-slate-200 pb-4">Detalhamento de Fluxo Financeiro e Ativos</h3>
            <div className="grid grid-cols-1 gap-6">
              {linkedProducers.map((p, idx) => (
                <div key={idx} className="bg-white border-2 border-slate-50 rounded-[3rem] p-10 flex items-center justify-between shadow-sm page-break-inside-avoid">
                  <div className="flex gap-10 items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-[1.5rem] flex items-center justify-center font-black text-amber-600 text-xl font-mono">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">{maskText(p.documento)}</span>
                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] uppercase px-3 py-1">Safra {p.safra}</Badge>
                      </div>
                      <h4 className="text-[22px] font-black text-slate-900 uppercase tracking-tighter">{p.propriedade}</h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Titular: {maskText(p.nome)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase mb-2">Volume Retido</p>
                    <p className="text-[32px] font-black text-amber-600 font-mono leading-none tracking-tighter">{formatUCS(p.associacaoSaldo)}</p>
                    <p className="text-[12px] font-black text-amber-500 uppercase mt-2">UCS</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-40 pt-20 border-t-8 border-slate-950 flex justify-between items-start grayscale hover:grayscale-0 transition-all">
            <div className="space-y-8 max-w-xl">
              <div className="flex items-center gap-6 text-slate-950 font-black text-[22px] uppercase tracking-[0.4em]">
                <ShieldCheck className="w-10 h-10 text-primary" /> Conformidade Nucleo
              </div>
              <p className="text-[12px] text-slate-500 font-black uppercase leading-relaxed tracking-wider text-justify">
                A tecnologia LedgerTrust BMV assegura a imutabilidade absoluta deste registro. Qualquer alteração ou divergência nos saldos aqui apresentados em relação à blockchain NXT invalida este protocolo automaticamente. Documento emitido para fins de auditoria e contraprova jurídica.
              </p>
            </div>
            <div className="flex flex-col items-end gap-10">
              <div className="text-center w-80 pt-10 border-t-4 border-slate-950">
                <p className="text-[14px] font-black uppercase text-slate-950 tracking-[0.4em]">Compliance Officer</p>
                <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-widest">{userEmail || "SYSTEM_AUDITOR"}</p>
              </div>
              <QrCode className="w-20 h-20 opacity-10" />
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
