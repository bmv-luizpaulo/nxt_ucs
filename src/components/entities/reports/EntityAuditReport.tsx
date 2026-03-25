"use client"

import { EntidadeSaldo } from "@/lib/types";
import { ShieldCheck, QrCode, History, Database, Link2, ExternalLink, MapPin } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";

interface EntityAuditReportProps {
  entity: EntidadeSaldo;
  totals: any;
  reportType: 'executive' | 'juridico';
  userEmail?: string;
  auditor?: any;
  isCensored: boolean;
}

export function EntityAuditReport({ entity, totals, reportType, userEmail, auditor, isCensored }: EntityAuditReportProps) {
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');

  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

  const isJuridico = reportType === 'juridico';
  const reportTitle = isJuridico ? "RELATÓRIO JURÍDICO DE AUDITORIA" : "RELATÓRIO EXECUTIVO DE AUDITORIA";

  return (
    <div className={cn(
      "is-printable bg-white text-slate-900 font-sans mx-auto",
      "w-full max-w-[21cm] p-[4mm] min-h-[29.7cm] text-[10px]"
    )}>
      {/* HEADER */}
      <header className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
        <div className="w-32 h-12 relative">
          <img src="/image/logo_amarelo.png" alt="BMV Logo" className="w-full h-full object-contain object-left" />
        </div>
        <div className="text-right">
          <h1 className="text-[16px] font-black uppercase tracking-tight text-slate-900">{reportTitle}</h1>
          <p className="text-[10px] font-bold text-slate-900 uppercase mt-1">
            PROTOCOLO DE SALDO: <span className="font-mono">{entity.id?.substring(0, 16).toUpperCase() || 'PROD-00000000'}</span>
          </p>
          <p className="text-[8px] font-medium text-slate-400 uppercase mt-1">{new Date().toLocaleString("pt-BR")}</p>
        </div>
      </header>

      {/* IDENTIFICATION & SUMMARY */}
      <div className="flex justify-between gap-12 mb-10 border-b-2 border-slate-900 pb-8">
        <div className="flex-1 space-y-3">
          <h2 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">IDENTIFICAÇÃO DA ENTIDADE</h2>
          <h3 className="text-[18px] font-black leading-tight uppercase text-slate-900">{entity.nome}</h3>
          
          <div className="flex gap-12">
            <div className="space-y-1 text-[9px] uppercase font-bold text-slate-500">
              <p>DOCUMENTO REGISTRADO: <span className="text-slate-900 font-black ml-1">{isCensored ? entity.documento?.replace(/\d/g, '*') : entity.documento}</span></p>
              <p>STATUS CADASTRAL: <span className={cn(
                "font-black ml-1",
                entity.status === 'bloqueado' ? "text-rose-600" : 
                entity.status === 'inapto' ? "text-amber-600" : 
                "text-emerald-600"
              )}>
                {entity.status === 'bloqueado' ? 'BLOQUEADO' : 
                 entity.status === 'inapto' ? 'INAPTO / DIVERGENTE' : 
                 'ATIVO / VERIFICADO'}
              </span></p>
              <p>PROPRIEDADE / LOCAL: <span className="text-slate-900 font-black ml-1">{entity.propriedade || 'NÃO INFORMADA'}</span></p>
              <p>AUDITOR RESPONSÁVEL: <span className="text-slate-900 font-black ml-1">{userEmail || "BMV_VALIDATOR_V4"}</span></p>
            </div>
            
            {isJuridico && (
              <div className="space-y-1 text-[9px] uppercase font-bold text-slate-500 border-l border-slate-200 pl-4">
                <p>SAFRA / REGISTRO: <span className="text-slate-900 font-black ml-1">{entity.safra || '-'}</span></p>
                <p>COORDENADAS (LAT, LONG): <span className="text-slate-900 font-black ml-1">{entity.lat || '-'}, {entity.long || '-'}</span></p>
                <p>NÚCLEO REGIONAL: <span className="text-slate-900 font-black ml-1">{entity.nucleo || '-'}</span></p>
                <p>PARTICIONAMENTO (PRODUTOR): <span className="text-emerald-700 font-black ml-1">{entity.particionamento || 0}%</span></p>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3 space-y-3">
          <h2 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">RESUMO DE SALDOS (UCS)</h2>
          <div className="flex items-center justify-between">
            <div className="space-y-2 text-[9px] font-bold uppercase text-slate-500">
              <div>
                <p>ORIGINAÇÃO TOTAL</p>
                <p className="text-[14px] text-slate-900 font-black">{formatUCS(totals.origProdutor || totals.orig)}</p>
              </div>
              <div>
                <p>MOVIMENTAÇÃO</p>
                <p className="text-[14px] text-rose-600 font-black">-{formatUCS(totals.mov)}</p>
              </div>
              {entity.ajusteRealizado && (
                <div>
                  <p className="text-indigo-600">AJUSTE GOVERNANÇA</p>
                  <p className="text-[14px] text-indigo-600 font-black">{formatUCS(entity.valorAjusteManual)}</p>
                </div>
              )}
              {entity.bloqueado > 0 && (
                <div>
                  <p className="text-rose-400">SALDO BLOQUEADO</p>
                  <p className="text-[12px] text-rose-400 font-black">{formatUCS(entity.bloqueado)}</p>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 mt-2">
                <p className="text-emerald-700 font-black uppercase text-[8px]">SALDO FINAL AUDITADO</p>
                <p className="text-[20px] text-emerald-700 font-black leading-none">{formatUCS(totals.final)}</p>
              </div>
            </div>
            <div className="w-16 h-16 border rounded bg-slate-50 flex items-center justify-center border-slate-200 p-2">
              <QrCode className="w-10 h-10 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      {/* AUDIT OBSERVATIONS (THE MOST IMPORTANT ADDITION) */}
      {(entity.observacao || entity.ajusteRealizado) && (
        <div className="mb-10 bg-slate-50 border-l-4 border-slate-900 p-6 rounded-r-xl page-break-inside-avoid">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-900" /> 00. PARECER TÉCNICO DE AUDITORIA
          </h2>
          
          <div className="space-y-4">
            {entity.observacao && (
              <div className="space-y-1">
                <p className="text-[7px] font-black uppercase text-slate-400">NOTAS DA AUDITORIA:</p>
                <p className="text-[12px] font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {entity.observacao}
                </p>
              </div>
            )}
            
            {entity.ajusteRealizado && (
              <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 mt-4">
                <p className="text-[8px] font-black uppercase text-indigo-600 mb-1">DETALHES DO AJUSTE DE GOVERNANÇA:</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-[7px] font-bold text-slate-500 block">NOVO SALDO FIXADO:</span>
                    <span className="text-[12px] font-black text-indigo-700 font-mono">{formatUCS(entity.valorAjusteManual)} UCS</span>
                  </div>
                  <div>
                    <span className="text-[7px] font-bold text-slate-500 block">AUTORIZADO POR:</span>
                    <span className="text-[9px] font-black text-slate-700 uppercase">{entity.usuarioAjuste} ({new Date(entity.dataAjuste!).toLocaleDateString('pt-BR')})</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] font-bold text-slate-500 block">JUSTIFICATIVA TÉCNICA:</span>
                  <p className="text-[10px] font-bold text-indigo-900 italic leading-relaxed">
                    "{entity.justificativaAjuste}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 01: SAFRA TÉCNICA (COMPACTA) */}
      {isJuridico && (
        <div className="mb-8 page-break-inside-avoid">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#734DCC] mb-3 border-b-2 border-[#734DCC]/10 pb-1 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> 01. ESPECIFICAÇÕES TÉCNICAS DA SAFRA (ORIGINAÇÃO BRUTA)
          </h4>
          
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {/* Header com Dados da Propriedade */}
            <div className="flex gap-8 p-4 border-b border-slate-200 bg-white/50">
              <div className="flex-[2] space-y-0.5 min-w-0">
                <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">PROPRIEDADE / MATRIZ</p>
                <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">{entity.propriedade || '-'}</p>
              </div>
              <div className="flex-1 space-y-0.5 whitespace-nowrap">
                <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">SAFRA / ANO</p>
                <p className="text-[10px] font-black text-slate-900 uppercase">{entity.safra || '-'}</p>
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">NÚCLEO REGIONAL</p>
                <p className="text-[10px] font-black text-slate-900 uppercase">{entity.nucleo || '-'}</p>
              </div>
              <div className="flex-[1.5] space-y-0.5 text-right whitespace-nowrap">
                <p className="text-[6px] font-black text-[#734DCC] uppercase tracking-tighter">VOL. BRUTO ORIGINADO</p>
                <p className="text-[16px] font-black text-[#734DCC] leading-none">{formatUCS(totals.origFazenda)} <span className="text-[8px] opacity-40">UCS</span></p>
              </div>
            </div>

            {/* Coordenadas e Participação */}
            <div className="p-4 space-y-4">
              <div className="flex gap-10 items-center justify-between">
                 <div className="flex gap-4 items-center shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[6px] font-black text-slate-400 uppercase">COORDENADAS GEORREFERENCIADAS</p>
                      <p className="text-[10px] font-mono font-black text-slate-700">{entity.lat || '-'}, {entity.long || '-'}</p>
                    </div>
                 </div>
                 
                 <div className="flex-1 flex gap-8 justify-end items-center">
                    <div className="text-right">
                      <p className="text-[6px] font-black text-emerald-600 uppercase">QUOTA PRODUTOR</p>
                      <p className="text-[11px] font-black text-emerald-700">{formatUCS(totals.origProdutor || totals.orig)} <span className="text-[7px] opacity-40">({entity.particionamento || 0}%)</span></p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-right">
                      <p className="text-[6px] font-black text-amber-600 uppercase">ASSOCIAÇÃO</p>
                      <p className="text-[11px] font-black text-amber-700">{formatUCS(entity.associacaoSaldo)} <span className="text-[7px] opacity-40">({entity.associacaoParticionamento || 0}%)</span></p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-right">
                      <p className="text-[6px] font-black text-indigo-600 uppercase">IMEI / PLATAFORMA</p>
                      <p className="text-[11px] font-black text-indigo-700">{formatUCS(entity.imeiSaldo)} <span className="text-[7px] opacity-40">({entity.imeiParticionamento || 0}%)</span></p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLES */}
      <div className="space-y-10">
        <ReportTable
          title={isJuridico ? "02. DEMONSTRATIVO DE ORIGINAÇÃO" : "01. DEMONSTRATIVO DE ORIGINAÇÃO"}
          data={entity.tabelaOriginacao || []}
          type="originacao"
        />

        {isJuridico ? (
          <div className="space-y-4">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">03. DEMONSTRATIVO DE MOVIMENTAÇÃO (RASTREABILIDADE DETALHADA)</h4>
            {(!entity.tabelaMovimentacao || entity.tabelaMovimentacao.length === 0) ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase">NENHUMA MOVIMENTAÇÃO REGISTRADA.</p>
            ) : (
              entity.tabelaMovimentacao.map((mov: any, idx: number) => {
                 const statusAudit = (mov.statusAuditoria || 'PENDENTE').toString().toUpperCase();
                 const statusColor = statusAudit === 'CONCLUIDO' || statusAudit === 'CONCLUÍDO' ? 'text-emerald-600 border-emerald-100' : 'text-amber-500 border-amber-100';
                 
                 return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 page-break-inside-avoid">
                    <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[12px] font-black text-slate-900 uppercase">{maskText(mov.destino)}</span>
                           <span className={`px-2 py-0.5 rounded border text-[7px] font-black uppercase ${statusColor}`}>{statusAudit}</span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">PLATAFORMA / HISTÓRICO: {maskText(mov.plataforma || mov.nome || 'TRADING')}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">DATA DA TRANSAÇÃO: {mov.data || mov.dist || '-'}</p>
                        
                        {mov.observacaoTransacao && (
                          <div className="mt-2 text-[8px] font-bold text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic w-[80%] break-words">
                            <span className="text-slate-400 font-black uppercase block text-[7px] mb-0.5">OBSERVAÇÕES:</span>
                            {mov.observacaoTransacao}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <p className="text-[8px] font-black uppercase text-slate-400">VOLUME MOVIDO</p>
                          <p className="text-[16px] font-black font-mono text-rose-600">-{formatUCS(mov.valor)} <span className="text-[8px] text-slate-500">UCS</span></p>
                        </div>
                        {mov.valorPago !== undefined && mov.valorPago > 0 && (
                          <div className="bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-right">
                            <p className="text-[7px] font-black uppercase text-emerald-700">VALOR PAGO ({mov.dataPagamento || 'S/D'})</p>
                            <p className="text-[12px] font-black font-mono text-emerald-700">
                              {mov.valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {(mov.linkNxt) && (
                      <div className="flex gap-6 items-stretch">
                        {/* NXT HASH COM QR CODE */}
                        <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-3">
                          <div className="bg-white p-1 rounded border border-slate-200 shrink-0">
                                <QRCode value={mov.linkNxt} size={40} bgColor="#ffffff" fgColor="#000000" level="L" />
                          </div>
                          <div className="space-y-1 overflow-hidden">
                                <p className="text-[7px] font-black uppercase tracking-widest text-[#734DCC] flex items-center gap-1"><Link2 className="w-2.5 h-2.5" /> NXT BLOCKCHAIN HASH</p>
                                <a href={mov.linkNxt} target="_blank" className="text-[8px] font-mono text-slate-600 truncate block hover:text-[#734DCC] font-bold">{mov.linkNxt}</a>
                                <p className="text-[6px] text-slate-400 uppercase font-bold mt-1">Escaneie o QR Code para auditar a transação na rede NXT.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                 );
              })
            )}
          </div>
        ) : (
          <ReportTable
            title="02. DEMONSTRATIVO DE MOVIMENTAÇÃO"
            data={entity.tabelaMovimentacao || []}
            type="movimentacao"
            isCensored={isCensored}
            initialBalance={totals.origProdutor || totals.orig}
          />
        )}

        <ReportTable
          title={isJuridico ? "04. DEMONSTRATIVO DE SALDO LEGADO" : "03. DEMONSTRATIVO DE SALDO LEGADO"}
          data={entity.tabelaLegado || []}
          type="legado"
        />
      </div>

      {/* FOOTER FIXED AT BOTTOM OR RELATIVE */}
      <footer className="mt-20 pt-4 border-t-2 border-slate-900 flex justify-between items-start">
        <div className="flex items-center gap-2 text-emerald-600 font-black text-[12px] uppercase">
          <ShieldCheck className="w-5 h-5" /> OK - CONFORMIDADE BMV
        </div>
        <div className="text-right text-[8px] uppercase font-bold text-slate-900">
          <p className="text-[10px] font-black">{auditor?.cargo || "RESPONSÁVEL TÉCNICO BMV"}</p>
          <p className="text-[11px] font-black">{auditor?.nome || userEmail || "LUIZPAULO.JESUS"}</p>
          {auditor?.cpf && <p className="text-[8px] opacity-60">CPF: {auditor.cpf}</p>}
          <p className="text-slate-400 mt-1 uppercase text-[7px]">ASSINADO DIGITALMENTE EM CONFORMIDADE COM PROTOCOLO LEDGERTRUST</p>
        </div>
      </footer>
    </div>
  );
}

function ReportTable({ title, data, type, isCensored, initialBalance = 0 }: any) {
  if (!data || data.length === 0) return null;
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');
  const isMovimentacao = type === 'movimentacao';
  const isLegado = type === 'legado';
  
  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

  // Calculate Running Balance for Movimentação
  let runningBalance = initialBalance;
  const dataWithBalance = isMovimentacao ? (data || []).map((row: any) => {
    runningBalance -= (row.valor || 0);
    return { ...row, saldoAcumulado: runningBalance };
  }) : data;

  return (
    <div className="page-break-inside-avoid mt-8">
      <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</h4>
      <table className="w-full text-left border-collapse table-fixed border border-slate-200">
        <thead>
          <tr className="border-b-2 border-slate-900 bg-slate-50/80">
             <th className="text-[8px] font-black uppercase text-slate-500 py-3 pl-3 w-[6%]">DIST.</th>
             <th className="text-[8px] font-black uppercase text-slate-500 py-3 w-[8%]">INÍCIO</th>
             <th className="text-[8px] font-black uppercase text-slate-500 py-3 w-[12%]">HISTÓRICO</th>
             
             {isMovimentacao ? (
               <>
                 <th className="text-[8px] font-black uppercase text-slate-500 py-3 w-[25%]">DESTINO</th>
                 <th className="text-[8px] font-black uppercase text-slate-500 py-3 w-[5%] text-center">USR</th>
                 <th className="text-[8px] font-black uppercase text-rose-600 py-3 text-right w-[7%]">DÉBITO</th>
                 <th className="text-[8px] font-black uppercase text-slate-500 py-3 text-center w-[5%]">SIT.</th>
                 <th className="text-[8px] font-black uppercase text-slate-500 py-3 text-center w-[12%]">PGTO</th>
                 <th className="text-[8px] font-black uppercase text-[#734DCC] py-3 text-center w-[3%]">NXT</th>
                 <th className="text-[8px] font-black uppercase text-slate-500 py-3 pr-4 w-[20%]">OBSERVAÇÕES</th>
               </>
             ) : isLegado ? (
              <>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%]">DISP.</th>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%]">RES.</th>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%]">BLOQ.</th>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%] pr-4">APOS.</th>
              </>
            ) : (
              <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right pr-4">VOLUME (UCS)</th>
            )}
          </tr>
        </thead>
        <tbody className="text-[8px] font-bold text-slate-600">
          {dataWithBalance.map((row: any, i: number) => {
            const statusAudit = (row.statusAuditoria || row.status || 'PENDENTE').toString().toUpperCase();
            const statusColor = statusAudit === 'CONCLUIDO' || statusAudit === 'CONCLUÍDO' ? 'text-emerald-600' : 
                                statusAudit === 'CANCELADO' ? 'text-rose-600' : 
                                'text-amber-500';

            return (
              <tr key={i} className={cn(
                "border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors",
                i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
              )}>
                <td className="py-2.5 pl-3 text-slate-400 font-mono text-[7.5px]">{row.dist || '-'}</td>
                <td className="py-2.5 text-slate-400 font-mono text-[7.5px]">{row.data || '-'}</td>
                <td className="py-2.5 uppercase text-slate-800 break-words pr-2">
                   {maskText(row.plataforma || row.nome || '-')}
                </td>
                
                {isMovimentacao && (
                  <>
                    <td className="py-2.5 uppercase text-slate-900 font-black break-words pr-2 leading-tight text-[7.5px]">{maskText(row.destino || '-')}</td>
                    <td className="py-2.5 uppercase text-slate-400 break-words pr-2 leading-tight text-center text-[7px]">{maskText(row.usuarioDestino || '-')}</td>
                    <td className="py-2.5 text-right font-black text-rose-600 font-mono text-[7.5px]">{row.valor > 0 ? `-${formatUCS(row.valor)}` : formatUCS(row.valor)}</td>
                    <td className={`py-2.5 text-center font-black ${statusColor} text-[6.5px]`}>{statusAudit.substring(0, 4)}</td>
                    <td className="py-2.5 text-center text-slate-500 whitespace-nowrap">
                       <div className="flex flex-col items-center leading-none gap-1">
                         <span className="text-[7px]">{row.dataPagamento || '-'}</span>
                         {row.valorPago > 0 && <span className="text-emerald-700 font-black text-[7.5px]">{row.valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                       </div>
                    </td>
                    <td className="py-2.5 text-center font-black text-[#734DCC]">
                      {row.linkNxt ? "✓" : "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-[7px] font-medium text-slate-500 uppercase leading-snug italic break-words">
                       {row.observacaoTransacao || "-"}
                    </td>
                  </>
                )}

                {isLegado ? (
                  <>
                    <td className="py-2.5 text-right text-emerald-700 font-black">{formatUCS(row.disponivel)}</td>
                    <td className="py-2.5 text-right text-amber-600">{formatUCS(row.reservado || 0)}</td>
                    <td className="py-2.5 text-right text-rose-600">{formatUCS(row.bloqueado || row.aposentado)}</td>
                    <td className="py-2.5 text-right text-slate-400 pr-4">{formatUCS(row.aposentado || 0)}</td>
                  </>
                ) : !isMovimentacao && (
                  <td className="py-2.5 text-right font-black font-mono pr-4 text-slate-900">
                    {formatUCS(row.valor)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}