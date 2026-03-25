"use client"

import { EntidadeSaldo } from "@/lib/types";
import { ShieldCheck, QrCode, History, Database, Link2, ExternalLink } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";

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

  const isJuridico = reportType === 'juridico';
  const reportTitle = isJuridico ? "RELATÓRIO JURÍDICO DE AUDITORIA" : "RELATÓRIO EXECUTIVO DE AUDITORIA";

  return (
    <div className={cn(
      "is-printable bg-white text-slate-900 font-sans mx-auto",
      "w-full max-w-[21cm] p-[1.5cm] min-h-[29.7cm] text-[10px]"
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
              <p>STATUS CADASTRAL: <span className="text-slate-900 font-black ml-1">ATIVO / VERIFICADO</span></p>
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
              <div>
                <p className="text-emerald-700">SALDO FINAL AUDITADO</p>
                <p className="text-[16px] text-emerald-700 font-black">{formatUCS(totals.final)}</p>
              </div>
            </div>
            <div className="w-16 h-16 border rounded bg-slate-50 flex items-center justify-center border-slate-200 p-2">
              <QrCode className="w-10 h-10 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      {/* TABLES */}
      <div className="space-y-8">
        <ReportTable
          title="01. DEMONSTRATIVO DE ORIGINAÇÃO"
          data={entity.tabelaOriginacao || []}
          type="originacao"
        />

        {isJuridico ? (
          <div className="space-y-4">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">02. DEMONSTRATIVO DE MOVIMENTAÇÃO (RASTREABILIDADE DETALHADA)</h4>
            {(!entity.tabelaMovimentacao || entity.tabelaMovimentacao.length === 0) ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase">NENHUMA MOVIMENTAÇÃO REGISTRADA.</p>
            ) : (
              entity.tabelaMovimentacao.map((mov: any, idx: number) => {
                 const statusAudit = (mov.statusAuditoria || 'PENDENTE').toString().toUpperCase();
                 const statusColor = statusAudit === 'CONCLUIDO' || statusAudit === 'CONCLUÍDO' ? 'text-emerald-600 border-emerald-100' : 'text-amber-500 border-amber-100';
                 
                 return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 page-break-inside-avoid">
                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
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
                      
                      <div className="text-right flex flex-col items-end gap-3">
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

                    <div className="flex gap-6 items-start">
                      {/* NXT HASH COM QR CODE */}
                      <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-4">
                        <div className="bg-white p-1 rounded border border-slate-200 shrink-0">
                          {mov.linkNxt ? (
                             <QRCode value={mov.linkNxt} size={48} bgColor="#ffffff" fgColor="#000000" level="L" />
                          ) : (
                             <div className="w-12 h-12 flex items-center justify-center bg-slate-100 text-[8px] font-bold text-slate-400 text-center uppercase">SEM NXT</div>
                          )}
                        </div>
                        <div className="space-y-1 overflow-hidden">
                           <p className="text-[7px] font-black uppercase tracking-widest text-[#734DCC] flex items-center gap-1"><Link2 className="w-2.5 h-2.5" /> NXT BLOCKCHAIN HASH</p>
                           {mov.linkNxt ? (
                             <a href={mov.linkNxt} target="_blank" className="text-[8px] font-mono text-slate-600 truncate block hover:text-[#734DCC]">{mov.linkNxt}</a>
                           ) : (
                             <p className="text-[8px] font-bold text-slate-400 italic">Hash não disponibilizado</p>
                           )}
                           <p className="text-[6px] text-slate-400 uppercase font-bold mt-1">Escaneie o QR Code para auditar a transação na rede NXT.</p>
                        </div>
                      </div>

                      {/* COMPROVANTE */}
                      <div className="w-[40%] bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[7px] font-black uppercase tracking-widest text-primary flex items-center gap-1 mb-1"><ExternalLink className="w-2.5 h-2.5" /> COMPROVANTE DE PAGAMENTO</p>
                        {mov.linkComprovante ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono font-bold text-slate-600 truncate">ANEXO_PAGAMENTO.PDF</span>
                            <Badge className="bg-emerald-100 text-emerald-700 text-[6px] px-1 py-0 border-none hover:bg-emerald-100">VALIDADO</Badge>
                          </div>
                        ) : (
                          <p className="text-[8px] font-bold text-slate-400 italic">Nenhum comprovante anexado</p>
                        )}
                        <p className="text-[6px] text-slate-400 uppercase font-bold mt-1">Acervo digital armazenado no LedgerTrust.</p>
                      </div>
                    </div>
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
          />
        )}

        <ReportTable
          title="03. DEMONSTRATIVO DE SALDO LEGADO"
          data={entity.tabelaLegado || []}
          type="legado"
        />
      </div>

      {/* FOOTER FIXED AT BOTTOM OR RELATIVE */}
      <footer className="mt-20 pt-4 border-t-2 border-slate-900 flex justify-between items-start">
        <div className="flex items-center gap-2 text-emerald-600 font-black text-[12px] uppercase">
          <ShieldCheck className="w-5 h-5" /> OK - CONFORMIDADE BMV
        </div>
        <div className="text-center text-[8px] uppercase font-bold text-slate-900">
          <p className="text-[10px] font-black">RESPONSÁVEL TÉCNICO BMV</p>
          <p>{userEmail || "LUIZPAULO.JESUS@BMV.GLOBAL"}</p>
          <p className="text-slate-400 mt-1">ASSINADO DIGITALMENTE</p>
        </div>
      </footer>
    </div>
  );
}

function ReportTable({ title, data, type, isCensored }: any) {
  if (!data || data.length === 0) return null;
  const formatUCS = (val?: number) => (val ?? 0).toLocaleString('pt-BR');
  
  const maskText = (text: string | undefined) => {
    if (!text || !isCensored) return text || '-';
    if (text.length <= 4) return "****";
    return text[0] + "*".repeat(text.length - 2) + text[text.length - 1];
  };

  return (
    <div className="page-break-inside-avoid">
      <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</h4>
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="border-b border-slate-300">
            <th className={cn("text-[8px] font-black uppercase text-slate-500 py-2", type === 'legado' || type === 'originacao' ? "w-[25%]" : "w-[20%]")}>REFERÊNCIA</th>
            <th className={cn("text-[8px] font-black uppercase text-slate-500 py-2", type === 'legado' || type === 'originacao' ? "w-[35%]" : "w-[25%]")}>HISTÓRICO / PLATAFORMA</th>
            
            {type === 'movimentacao' && (
              <>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 w-[25%]">USUÁRIO DESTINO</th>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-center w-[15%]">STATUS</th>
                <th className="text-[8px] font-black uppercase text-[#734DCC] py-2 text-center w-[15%]">NXT</th>
              </>
            )}

            {type === 'legado' ? (
              <>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%]">DISP.</th>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%]">RES.</th>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%]">BLOQ.</th>
                <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right w-[10%]">APOS.</th>
              </>
            ) : (
              <th className="text-[8px] font-black uppercase text-slate-500 py-2 text-right">VOLUME (UCS)</th>
            )}
          </tr>
        </thead>
        <tbody className="text-[8px] font-bold text-slate-600">
          {data.map((row: any, i: number) => {
            const statusAudit = (row.statusAuditoria || row.status || 'PENDENTE').toString().toUpperCase();
            const statusColor = statusAudit === 'CONCLUIDO' || statusAudit === 'CONCLUÍDO' ? 'text-emerald-600' : 
                                statusAudit === 'CANCELADO' ? 'text-rose-600' : 
                                'text-amber-500';

            return (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2.5 text-slate-500 font-mono break-words pr-4">{row.data || row.dist || '-'}</td>
                <td className="py-2.5 uppercase text-slate-800 break-words pr-4">
                   {type === 'movimentacao' ? (row.nome || row.plataforma || 'TRADING') : (row.destino || row.plataforma || row.nome || '-')}
                </td>
                
                {type === 'movimentacao' && (
                  <>
                    <td className="py-2.5 uppercase text-slate-600 break-words pr-4">{maskText(row.destino || '-')}</td>
                    <td className={`py-2.5 text-center font-black ${statusColor}`}>{statusAudit}</td>
                    <td className="py-2 text-center font-black text-[#734DCC]">
                      {row.linkNxt ? "HASH ✓" : "-"}
                    </td>
                  </>
                )}

                {type === 'legado' ? (
                  <>
                    <td className="py-2 text-right text-emerald-600">{formatUCS(row.disponivel)}</td>
                    <td className="py-2 text-right text-amber-500">{formatUCS(row.reservado || 0)}</td>
                    <td className="py-2 text-right text-rose-500">{formatUCS(row.bloqueado || row.aposentado)}</td>
                    <td className="py-2 text-right text-slate-400">{formatUCS(row.aposentado || 0)}</td>
                  </>
                ) : (
                  <td className={cn(
                    "py-2 text-right font-black font-mono",
                    type === 'movimentacao' ? "text-rose-600" : "text-slate-900"
                  )}>
                    {type === 'movimentacao' ? '-' : ''}{formatUCS(row.valor)}
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