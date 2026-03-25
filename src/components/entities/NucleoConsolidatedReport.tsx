"use client"

import { EntidadeSaldo } from "@/lib/types";
import { CheckCircle2, ShieldCheck, QrCode, Landmark, Building2, Users } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NucleoConsolidatedReportProps {
  records: EntidadeSaldo[];
  nucleoName: string;
}

export function NucleoConsolidatedReport({ records, nucleoName }: NucleoConsolidatedReportProps) {
  const totalOrigination = records.reduce((acc, r) => acc + (r.originacao || 0), 0);
  const totalAssoc = records.reduce((acc, r) => acc + (r.associacaoSaldo || 0), 0);
  const totalProd = records.reduce((acc, r) => acc + (r.saldoFinalAtual || 0), 0);

  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  return (
    <div className="printable-nucleo-report hidden print:block bg-white text-slate-900 p-0 font-sans premium-report">
      <div className="px-12 py-12">
        <header className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-12">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <Image src="/image/logo_amarelo.png" alt="BMV Logo" fill className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-[42px] font-black text-amber-500 leading-none tracking-tighter uppercase font-headline">bmv</span>
              <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1">Audit Global</span>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-[22px] font-black uppercase tracking-tight leading-tight text-slate-900">Demonstrativo Consolidado de Núcleo</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">ECOSSISTEMA BMV • PROTOCOLO COLETIVO</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Geração: {new Date().toLocaleString("pt-BR")}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-12 mb-16">
          <div className="space-y-8">
            <h3 className="text-[12px] font-black text-slate-400 uppercase border-b-2 border-slate-100 pb-3 tracking-[0.2em]">IDENTIFICAÇÃO DO NÚCLEO</h3>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                  <Landmark className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-[32px] font-black text-slate-900 leading-none uppercase tracking-tighter shrink-0">{nucleoName}</h4>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total de Registros</p>
                  <p className="text-[18px] font-black text-slate-600">{records.length} Produtores</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Status de Auditoria</p>
                  <p className="text-[14px] font-black text-emerald-600 uppercase font-mono tracking-widest">Consolidado ✓</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50/50 rounded-[3rem] p-10 border-2 border-slate-100 relative overflow-hidden text-right">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16"></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">BALANÇO CONSOLIDADO (UCS)</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest leading-none">Originação Bruta Coletiva</p>
                <p className="text-[26px] font-black text-slate-900 font-mono tracking-tighter">{formatUCS(totalOrigination)}</p>
              </div>
              <div className="flex justify-between items-center pt-2 text-left">
                <div>
                  <p className="text-amber-600 font-black text-[11px] uppercase tracking-[0.3em] mb-1 leading-none">Saldo Retido Ativo</p>
                  <p className="text-[46px] font-black text-amber-600 font-headline leading-none">
                    {formatUCS(totalAssoc)} <span className="text-[18px] text-amber-400/40 leading-none tracking-normal">UCS</span>
                  </p>
                </div>
                <QrCode className="w-16 h-16 text-slate-200" />
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4">
            <h3 className="text-[14px] font-black text-slate-950 uppercase tracking-[0.2em]">Listagem Analítica de Participantes</h3>
            <Badge variant="outline" className="border-emerald-500 text-emerald-600 font-black px-6 py-2 rounded-full uppercase text-[10px]">LedgerTrust Active ✓</Badge>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC]">
                <tr className="border-b-2 border-slate-200">
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[9px]">Titular / Propriedade</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[9px] text-center">Safra</th>
                  <th className="px-6 py-4 font-black text-amber-600 uppercase tracking-widest text-[9px] text-right">Originação</th>
                  <th className="px-6 py-4 font-black text-amber-600 uppercase tracking-widest text-[9px] text-right">Saldo Assoc</th>
                  <th className="px-6 py-4 font-black text-emerald-600 uppercase tracking-widest text-[9px] text-right">Saldo Prod</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {records.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 h-16 page-break-inside-avoid">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase text-[11px] leading-tight break-all">{item.nome}</span>
                        <span className="text-[8px] text-slate-400 font-black uppercase mt-1.5 font-mono italic">{item.propriedade || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center text-[11px] font-black text-slate-400">{item.safra}</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-600 text-[10px]">{formatUCS(item.originacao)}</td>
                    <td className="px-6 py-3 text-right font-mono font-black text-amber-600 text-[11px]">{formatUCS(item.associacaoSaldo)}</td>
                    <td className="px-6 py-3 text-right font-mono font-black text-emerald-600 text-[11px]">{formatUCS(item.saldoFinalAtual)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-950 text-white h-20">
                  <td colSpan={3} className="px-6 font-black uppercase tracking-[0.2em] text-[13px]">Totais Consolidados do Núcleo</td>
                  <td className="px-6 text-right font-mono font-black text-amber-400 text-[18px]">{formatUCS(totalAssoc)}</td>
                  <td className="px-6 text-right font-mono font-black text-emerald-400 text-[18px]">{formatUCS(totalProd)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-24 pt-12 border-t-4 border-slate-100 flex justify-between items-end">
          <div className="space-y-6">
            <div className="bg-amber-50 px-6 py-4 rounded-2xl border-2 border-amber-100 flex items-center gap-4 w-fit shadow-sm">
              <ShieldCheck className="w-8 h-8 text-amber-600" />
              <div className="flex flex-col">
                <span className="text-[12px] font-black text-amber-800 uppercase tracking-widest leading-none">Consolidação LedgerTrust</span>
                <span className="text-[9px] text-amber-600 font-black uppercase mt-1">Auditoria Integrada BMV</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 uppercase leading-relaxed max-w-sm font-bold tracking-wide opacity-60">
              Registros validados contra o protocolo oficial BMV. A imutabilidade do saldo coletivo é assegurada pela reconciliação de todos os membros do núcleo.
            </p>
          </div>
          <div className="text-right border-t-4 border-slate-900 w-64 pt-6 text-center">
            <p className="text-[11px] font-black uppercase text-slate-900 tracking-widest leading-none">Compliance Officer</p>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2 leading-none">BMV_AUDIT_SYSTEM</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
