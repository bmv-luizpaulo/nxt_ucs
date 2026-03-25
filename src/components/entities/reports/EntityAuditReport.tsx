"use client"

import { EntidadeSaldo, RegistroTabela } from "@/lib/types";
import { ShieldCheck, QrCode, History, Database, FileText } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EntityAuditReportProps {
  entity: EntidadeSaldo;
  totals: any;
  reportType: 'executive' | 'juridico';
  userEmail?: string;
  isCensored: boolean;
}

export function EntityAuditReport({ entity, totals, reportType, userEmail, isCensored }: EntityAuditReportProps) {
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

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
                    <span className="text-[42px] font-black text-amber-500 leading-none tracking-tighter uppercase font-headline">bmv</span>
                    <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1">Audit Global</span>
                 </div>
              </div>
              <div className="text-right">
                 <h2 className="text-[22px] font-black uppercase tracking-tight leading-tight text-slate-900">Relatório Executivo de Auditoria</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Protocolo: #{entity.id?.substring(0, 8).toUpperCase()}</p>
                 <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Emissão: {new Date().toLocaleString("pt-BR")}</p>
              </div>
           </header>

           <div className="grid grid-cols-2 gap-12 mb-16">
               <div className="space-y-8">
                  <h3 className="text-[12px] font-black text-slate-400 uppercase border-b-2 border-slate-100 pb-3 tracking-[0.2em]">IDENTIFICAÇÃO DA ENTIDADE</h3>
                  <div className="space-y-5">
                     <h4 className="text-[32px] font-black text-slate-900 leading-none uppercase tracking-tighter">{entity.nome}</h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Documento</p>
                           <p className="text-[14px] font-black text-slate-600 font-mono italic">{isCensored ? entity.documento?.replace(/\d/g, '*') : entity.documento}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Localização</p>
                           <p className="text-[14px] font-black text-slate-600 uppercase italic">{entity.propriedade || '-'}</p>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50/50 rounded-[3rem] p-10 border-2 border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16"></div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">SUMÁRIOS DE CONFORMIDADE (UCS)</h3>
                  <div className="space-y-6">
                     <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                        <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest leading-none">Carga Térmica Originação</p>
                        <p className="text-[26px] font-black text-slate-900 font-mono tracking-tighter">{formatUCS(totals.orig)}</p>
                     </div>
                     <div className="flex justify-between items-center pt-2">
                        <div>
                           <p className="text-primary font-black text-[11px] uppercase tracking-[0.3em] mb-1 leading-none">Saldo Disponível Auditado</p>
                           <p className="text-[46px] font-black text-primary font-headline leading-none">
                              {formatUCS(totals.final)} <span className="text-[18px] text-primary/40 leading-none tracking-normal">UCS</span>
                           </p>
                        </div>
                        <QrCode className="w-16 h-16 text-slate-200" />
                     </div>
                  </div>
               </div>
           </div>

           <div className="space-y-10">
              <ReportTablePremium title="01. Demonstração de Originação" data={entity.tabelaOriginacao} type="originacao" isNegative={false} />
              <ReportTablePremium title="02. Demonstração de Movimentação" data={entity.tabelaMovimentacao} type="movimentacao" isNegative={true} />
              <ReportTablePremium title="03. Saldos de Reserva / Legado" data={entity.tabelaLegado} type="legado" isLegado={true} />
           </div>

           <footer className="mt-24 pt-12 border-t-4 border-slate-100 flex justify-between items-end">
              <div className="space-y-6 text-slate-400">
                <div className="flex items-center gap-4">
                   <ShieldCheck className="w-8 h-8 text-primary" />
                   <div>
                     <p className="font-black text-[12px] uppercase">Rastreabilidade BMV</p>
                     <p className="text-[9px] uppercase">Protocolo LedgerTrust Sincronizado</p>
                   </div>
                </div>
                <p className="text-[9px] font-bold uppercase max-w-sm">A tecnologia LedgerTrust assegura a imutabilidade estatística deste registro ambiental.</p>
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
                       <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none mb-2">Protocolo de Contraprova Jurídica</span>
                       <h1 className="text-[52px] font-black text-slate-950 tracking-tighter leading-none uppercase">{entity.nome}</h1>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="legal-verify-badge">Integração Blockchain Certificada</div>
                    <span className="text-[20px] font-black text-slate-300 font-mono tracking-[0.2em]">{entity.documento}</span>
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
                 <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">Originação Bruta</p>
                 <p className="text-[42px] font-black text-slate-900 font-mono tracking-tighter leading-none mb-1">{formatUCS(totals.orig)}</p>
                 <p className="text-[11px] text-slate-300 font-black tracking-widest uppercase">Patrimônio Gerado</p>
              </div>
              <div className="bg-rose-50 p-12 rounded-[4rem] border-4 border-rose-100 flex flex-col items-center text-center shadow-sm">
                 <p className="text-[12px] font-black text-rose-400 uppercase tracking-widest mb-3">Movimentações Débito</p>
                 <p className="text-[42px] font-black text-rose-600 font-mono tracking-tighter leading-none mb-1">-{formatUCS(totals.mov)}</p>
                 <p className="text-[11px] text-rose-300 font-black tracking-widest uppercase">Aposentado / Cedido</p>
              </div>
              <div className="bg-slate-950 p-12 rounded-[4rem] border-4 border-slate-800 flex flex-col items-center text-center shadow-2xl scale-105">
                 <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Saldo Final Verificado</p>
                 <p className="text-[46px] font-black text-amber-500 font-mono tracking-tighter leading-none mb-1">{formatUCS(totals.final)}</p>
                 <p className="text-[12px] text-amber-500/40 font-black tracking-[0.2em] uppercase">Unidades Custodiadas</p>
              </div>
           </div>

           <section className="space-y-16">
              <div className="flex items-center justify-between border-b-2 border-slate-300 pb-6 mb-4">
                 <h3 className="text-[18px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-6">
                    <History className="w-8 h-8 text-primary" /> Histórico de Auditoria
                 </h3>
                 <Badge className="bg-slate-950 text-white font-black text-[10px] uppercase px-6 py-2">Imutabilidade NXT Proof</Badge>
              </div>

              <div className="space-y-10">
                 {(entity.tabelaMovimentacao || []).map((mov: any, idx: number) => (
                    <div key={idx} className="bg-white border-4 border-slate-100 rounded-[3.5rem] p-12 flex items-center justify-between shadow-sm page-break-inside-avoid">
                        <div className="flex gap-12 items-center">
                           <div className="w-24 h-24 bg-slate-950 rounded-[2rem] flex items-center justify-center font-black text-amber-500 text-3xl shadow-2xl">
                              {String(idx + 1).padStart(2, '0')}
                           </div>
                           <div className="space-y-4">
                              <span className="text-[16px] font-black text-primary uppercase tracking-[0.4em]">{mov.data || mov.dist}</span>
                              <h4 className="text-[28px] font-black text-slate-950 uppercase tracking-tighter leading-none">{maskText(mov.destino || mov.plataforma)}</h4>
                              <p className="text-[13px] font-black text-slate-300 uppercase tracking-widest italic">{mov.plataforma}</p>
                           </div>
                        </div>
                        <div className="text-right min-w-[200px] bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100">
                           <p className="text-[11px] font-black text-slate-400 uppercase mb-2">Fluxo de Saída</p>
                           <p className="text-[40px] font-black text-rose-500 font-mono leading-none tracking-tighter">-{formatUCS(mov.valor)}</p>
                           <p className="text-[13px] font-black text-rose-300 uppercase mt-2">UCS AUDITADAS</p>
                        </div>
                    </div>
                 ))}
                 {(entity.tabelaMovimentacao || []).length === 0 && (
                    <div className="text-center py-32 bg-slate-50/50 rounded-[5rem] border-4 border-dashed border-slate-200">
                       <Database className="w-20 h-20 mx-auto mb-8 text-slate-100" />
                       <h4 className="text-[16px] font-black text-slate-300 uppercase tracking-[0.6em]">Nenhuma Movimentação Registrada</h4>
                    </div>
                 )}
              </div>
           </section>

           <footer className="mt-40 pt-20 border-t-8 border-slate-950 flex justify-between items-start grayscale transition-all">
              <div className="space-y-8 max-w-xl">
                 <div className="flex items-center gap-6 text-slate-950 font-black text-[22px] uppercase tracking-[0.4em]">
                    <ShieldCheck className="w-10 h-10 text-primary" /> Conformidade BMV
                 </div>
                 <p className="text-[12px] text-slate-500 font-black uppercase leading-relaxed tracking-wider">
                    As unidades apresentadas neste protocolo são registradas sob a governança BMV. Qualquer discrepância invalida este título perante outrem.
                 </p>
              </div>
           </footer>
        </div>
      )}
    </div>
  );
}

function ReportTablePremium({ title, data, isNegative, isLegado, type }: any) {
  if (!data || data.length === 0) return null;
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');
  return (
    <div className="space-y-4">
      <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-slate-950 pb-2">{title}</h4>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 pl-6">Referência</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3">Histórico</TableHead>
              {isLegado ? (
                <>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 text-right">Disp.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 text-right pr-6">Apos.</TableHead>
                </>
              ) : (
                <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 text-right pr-6">Volume</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any, i: number) => (
              <TableRow key={i} className="border-b border-slate-50 last:border-0 h-10">
                <TableCell className="pl-6 font-mono text-[9px] text-slate-400">{row.data || row.dist || '-'}</TableCell>
                <TableCell className="text-[10px] font-bold text-slate-700 uppercase">{type === 'movimentacao' ? (row.nome || row.plataforma) : (row.destino || row.plataforma || row.nome)}</TableCell>
                {isLegado ? (
                  <>
                    <TableCell className="text-right font-mono font-black text-primary">{formatUCS(row.disponivel)}</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-400 pr-6">{formatUCS(row.aposentado)}</TableCell>
                  </>
                ) : (
                  <TableCell className={cn("text-right font-mono font-black pr-6", isNegative ? "text-rose-500" : "text-slate-900")}>
                    {formatUCS(row.valor)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
