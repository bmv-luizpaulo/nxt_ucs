"use client"

import { EntidadeSaldo } from "@/lib/types";
import { ShieldCheck, QrCode, History } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FarmAuditReportProps {
  entity: EntidadeSaldo;
  participants: any[];
  farmTotals: any;
  reportType: 'executive' | 'juridico';
  userEmail?: string;
}

export function FarmAuditReport({ entity, participants, farmTotals, reportType, userEmail }: FarmAuditReportProps) {
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  return (
    <div className="printable-audit-report hidden print:block bg-white text-slate-900 p-0 font-sans premium-report transition-all duration-500">
      {reportType === 'executive' ? (
        <div className="px-12 py-12">
           <header className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-12">
              <div className="flex items-center gap-4">
                 <div className="relative w-16 h-16">
                    <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[42px] font-black text-amber-500 leading-none tracking-tighter">bmv</span>
                    <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1">Audit Global</span>
                 </div>
              </div>
              <div className="text-right">
                 <h2 className="text-[22px] font-black uppercase tracking-tight leading-tight text-slate-900">Relatório Executivo de Localização</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">IDF: {entity.idf || "AUDIT_REGISTER"}</p>
                 <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Emissão: {new Date().toLocaleString("pt-BR")}</p>
              </div>
           </header>

           <div className="grid grid-cols-2 gap-12 mb-16">
               <div className="space-y-8">
                  <h3 className="text-[12px] font-black text-slate-400 uppercase border-b-2 border-slate-100 pb-3 tracking-[0.2em]">IDENTIFICAÇÃO DA PROPRIEDADE</h3>
                  <div className="space-y-5">
                     <h4 className="text-[32px] font-black text-slate-900 leading-none uppercase tracking-tighter">{entity.propriedade}</h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Safra Vigente</p>
                           <p className="text-[14px] font-black text-slate-600 font-mono italic">Safra {entity.safra}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Coordenadas</p>
                           <p className="text-[14px] font-black text-slate-600 uppercase font-mono">{entity.lat}, {entity.long}</p>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50/50 rounded-[3rem] p-10 border-2 border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16"></div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">SUMÁRIOS DE WALLET GLOBAL</h3>
                  <div className="space-y-6">
                     <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                        <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest leading-none">Originação Bruta Safra</p>
                        <p className="text-[26px] font-black text-slate-900 font-mono tracking-tighter">{formatUCS(farmTotals.totalOrig)}</p>
                     </div>
                     <div className="flex justify-between items-center pt-2 text-primary">
                        <div>
                           <p className="font-black text-[11px] uppercase tracking-[0.3em] mb-1 leading-none">Saldo Remanescente Auditado</p>
                           <p className="text-[46px] font-black font-headline leading-none">
                              {formatUCS(farmTotals.totalFinal)} <span className="text-[18px] text-primary/40 leading-none tracking-normal">UCS</span>
                           </p>
                        </div>
                        <QrCode className="w-16 h-16 text-slate-200" />
                     </div>
                  </div>
               </div>
           </div>

           <section className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4">
                 <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-[0.2em]">01. Demonstração de Particionamento de Alvos</h3>
                 <span className="legal-verify-badge">Origin Ledger Trust ✓</span>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                 <Table>
                    <TableHeader className="bg-slate-50/50">
                       <TableRow className="border-b-2 border-slate-200">
                          <TableHead className="text-[11px] font-black uppercase text-slate-500 py-4 pl-10">Titular / Beneficiário</TableHead>
                          <TableHead className="text-[11px] font-black uppercase text-slate-500 py-4 text-center">Part. (%)</TableHead>
                          <TableHead className="text-[11px] font-black uppercase text-slate-500 py-4 text-right pr-10">Volume Auditado (UCS)</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {participants.map(p => (
                          <TableRow key={p.id} className="border-b border-slate-100 h-16">
                             <TableCell className="text-[12px] font-black uppercase pl-10 text-slate-900">{p.nome}</TableCell>
                             <TableCell className="text-[12px] font-black text-center text-slate-400">{(p.particionamento || 0).toLocaleString('pt-BR')}%</TableCell>
                             <TableCell className="text-[13px] font-black text-right pr-10 text-slate-950 font-mono tracking-tighter">{formatUCS(p.saldoParticionado || p.saldoFinalAtual)}</TableCell>
                          </TableRow>
                       ))}
                       {farmTotals.totalAssoc > 0 && (
                          <TableRow className="border-b border-slate-100 h-16 bg-slate-50/50">
                             <TableCell className="text-[12px] font-black uppercase pl-10 text-amber-600 italic">({participants[0]?.associacaoNome || 'ASSOCIAÇÃO'})</TableCell>
                             <TableCell className="text-[12px] font-black text-center text-amber-600/50">{farmTotals.associacaoParticionamento.toLocaleString('pt-BR')}%</TableCell>
                             <TableCell className="text-[13px] font-black text-right pr-10 text-amber-700 font-mono tracking-tighter">{formatUCS(farmTotals.totalAssoc)}</TableCell>
                          </TableRow>
                       )}
                       {farmTotals.totalImei > 0 && (
                          <TableRow className="border-b border-slate-100 h-16 bg-slate-50/50">
                             <TableCell className="text-[12px] font-black uppercase pl-10 text-indigo-600 italic">IMEI PLATAFORMA</TableCell>
                             <TableCell className="text-[12px] font-black text-center text-indigo-600/50">{farmTotals.imeiParticionamento.toLocaleString('pt-BR')}%</TableCell>
                             <TableCell className="text-[13px] font-black text-right pr-10 text-indigo-700 font-mono tracking-tighter">{formatUCS(farmTotals.totalImei)}</TableCell>
                          </TableRow>
                       )}
                       <TableRow className="bg-slate-950 text-white h-20">
                          <td colSpan={2} className="text-[13px] font-black uppercase pl-10 tracking-[0.2em]">Total Garantido pela Propriedade</td>
                          <td className="text-[24px] font-black text-right pr-10 text-amber-500 font-mono tracking-tighter">{formatUCS(farmTotals.totalOrig)}</td>
                       </TableRow>
                    </TableBody>
                 </Table>
              </div>
           </section>

           <footer className="mt-24 pt-12 border-t-4 border-slate-100 flex justify-between items-end">
              <div className="space-y-6">
                 <div className="bg-emerald-50 px-6 py-4 rounded-2xl border-2 border-emerald-100 flex items-center gap-4 w-fit shadow-sm">
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                    <div className="flex flex-col">
                       <span className="text-[12px] font-black text-emerald-800 uppercase tracking-widest leading-none">Auditado LedgerTrust</span>
                       <span className="text-[9px] text-emerald-600 font-black uppercase mt-1">Imutabilidade Blockchain NXT</span>
                    </div>
                 </div>
                 <p className="text-[9px] text-slate-400 uppercase leading-relaxed max-w-sm font-bold tracking-wide opacity-60">
                    Este relatório constitui prova técnica de conformidade da carteira ambiental da propriedade.
                 </p>
              </div>
              <div className="text-right border-t-4 border-slate-900 w-64 pt-6 text-center">
                 <p className="text-[11px] font-black uppercase text-slate-900 tracking-widest leading-none">Responsabilidade Técnica</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase mt-2 leading-none">{userEmail || "BMV_VALIDATOR_V4"}</p>
              </div>
           </footer>
        </div>
      ) : (
        <div className="px-16 py-16">
           <header className="flex justify-between items-start mb-20 border-b-8 border-slate-900 pb-12">
              <div className="space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-xl p-4">
                       <ShieldCheck className="w-full h-full text-slate-900" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none mb-2">Protocolo de Evidência de Fazenda</span>
                       <h1 className="text-[52px] font-black text-slate-950 tracking-tighter leading-none uppercase">{entity.propriedade}</h1>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="legal-verify-badge">Rastreabilidade Certificada</div>
                    <span className="text-[20px] font-black text-slate-300 font-mono tracking-[0.2em]">IDF: {entity.idf}</span>
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
                 <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">Originação Total</p>
                 <p className="text-[42px] font-black text-slate-900 font-mono tracking-tighter leading-none mb-1">{formatUCS(farmTotals.totalOrig)}</p>
                 <p className="text-[11px] text-slate-300 font-black tracking-widest uppercase">Patrimônio Gerado</p>
              </div>
              <div className="bg-rose-50 p-12 rounded-[4rem] border-4 border-rose-100 flex flex-col items-center text-center shadow-sm">
                 <p className="text-[12px] font-black text-rose-400 uppercase tracking-widest mb-3">Circulação de Ativos</p>
                 <p className="text-[42px] font-black text-rose-600 font-mono tracking-tighter leading-none mb-1">-{formatUCS(farmTotals.totalMov)}</p>
                 <p className="text-[11px] text-rose-300 font-black tracking-widest uppercase">Saídas Processadas</p>
              </div>
              <div className="bg-slate-950 p-12 rounded-[4rem] border-4 border-slate-800 flex flex-col items-center text-center shadow-2xl scale-105">
                 <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Saldo Disponível Atual</p>
                 <p className="text-[46px] font-black text-amber-500 font-mono tracking-tighter leading-none mb-1">{formatUCS(farmTotals.totalFinal)}</p>
                 <p className="text-[12px] text-amber-500/40 font-black tracking-[0.2em] uppercase">Unidades Verificadas</p>
              </div>
           </div>

           <footer className="mt-40 pt-20 border-t-8 border-slate-950 flex justify-between items-start grayscale hover:grayscale-0 transition-all">
              <div className="space-y-8 max-w-xl">
                 <div className="flex items-center gap-6 text-slate-950 font-black text-[22px] uppercase tracking-[0.4em]">
                    <ShieldCheck className="w-10 h-10 text-primary" /> Auditoria Fazenda
                 </div>
                 <p className="text-[12px] text-slate-500 font-black uppercase leading-relaxed tracking-wider">
                    Este protocolo de rastreabilidade de propriedade assegura que a originação total da safra foi devidamente particionada entre seus detentores legítimos.
                 </p>
              </div>
           </footer>
        </div>
      )}
    </div>
  );
}
