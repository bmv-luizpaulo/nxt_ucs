import React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AuditReportProps {
  produtor: any;
  entityData: any;
  currentStats: any;
  isPreview?: boolean;
  currentUser?: any;
}

export function AuditReport({ produtor, entityData, currentStats, isPreview, currentUser }: AuditReportProps) {
  return (
    <div className={cn(
      "bg-white w-full audit-page",
      isPreview ? "block shadow-2xl border border-slate-200" : "is-printable"
    )}>
      <div className={cn("mx-auto space-y-6", isPreview ? "p-10 max-w-5xl" : "w-full p-4")}>
        {/* Cabeçalho Certidão */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 break-inside-avoid">
          <div>
             <img src="/image/logo_amarelo.png" alt="Logo BMV" className="h-14 w-auto object-contain" />
          </div>
          <div className="text-right">
             <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Certidão de Histórico de Transações</h1>
             <p className="text-[10px] font-black text-slate-700 uppercase mt-1">Protocolo de Saldo: <span className="text-indigo-600">{produtor.documento?.replace(/\D/g, '')}_{new Date().getFullYear()}</span></p>
             <p className="text-[8px] font-bold text-slate-400 mt-1">{new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Identificação da Entidade e Resumo de Saldos (Grid Estilo Certidão) */}
        <div className="grid grid-cols-12 gap-8 py-6 border-b-4 border-slate-900 break-inside-avoid">
           {/* Lado Esquerdo: Identificação */}
           <div className="col-span-8 space-y-4">
              <div className="space-y-2">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identificação da Entidade</p>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{produtor.nome}</h2>
              </div>

              <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                 <div className="space-y-2">
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Documento Registrado:</p>
                       <p className="text-[11px] font-black text-slate-900">{produtor.documento}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Status Cadastral:</p>
                       <p className="text-[11px] font-black text-emerald-600 uppercase italic">Ativo / Verificado</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Propriedade / Local:</p>
                       <p className="text-[11px] font-black text-slate-900 uppercase">{produtor.fazendas[0]?.fazendaNome || 'Fazenda Registrada'}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">IDF: {String(produtor.fazendas[0]?.idNxt || produtor.fazendas[0]?.idf || '').padStart(11, '0')}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Auditor Responsável:</p>
                       <p className="text-[11px] font-black text-slate-900 uppercase">{currentUser?.displayName || currentUser?.name || 'Sistema Central'}</p>
                    </div>
                 </div>

                 <div className="space-y-2 border-l border-slate-200 pl-8">
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Safra / Registro:</p>
                       <p className="text-[11px] font-black text-slate-900">{produtor.fazendas[0]?.safraReferencia || '---'}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Núcleo Regional:</p>
                       <p className="text-[11px] font-black text-slate-900 uppercase">{produtor.fazendas[0]?.nucleo || 'Xingu Mata Viva'}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Coordenadas (Lat, Long):</p>
                       <p className="text-[11px] font-black text-slate-900">{produtor.fazendas[0]?.latitude || '-13,4645'}, {produtor.fazendas[0]?.longitude || '-57,0500'}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Lado Direito: Resumo Financeiro */}
           <div className="col-span-4 space-y-4 border-l border-slate-200 pl-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo de Saldos (UCS)</p>
              
              <div className="space-y-4">
                 <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Originação Total</p>
                    <p className="text-lg font-black text-slate-900">{Math.floor(currentStats.originacao || 0).toLocaleString('pt-BR')}</p>
                 </div>
                 <div className="border-b border-slate-200 pb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Movimentação / Baixas</p>
                    <p className="text-lg font-black text-rose-500">-{Math.floor((currentStats.movimentacao || 0) + (currentStats.aquisicao || 0) + (currentStats.aposentado || 0)).toLocaleString('pt-BR')}</p>
                 </div>
                 <div className="border-b border-slate-200 pb-2">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">UCS Bloqueadas (Cofre)</p>
                    <p className="text-lg font-black text-amber-600">-{Math.floor(currentStats.bloqueado || 0).toLocaleString('pt-BR')}</p>
                 </div>
                 {currentStats.ajusteManual !== 0 && (
                    <div className="border-b border-slate-100 pb-2 bg-slate-50 px-2 rounded-lg py-1">
                       <p className="text-[9px] font-black text-[#394054] uppercase">Ajuste de Conformidade</p>
                       <div className="flex justify-between items-baseline">
                          <p className="text-[7px] italic text-slate-400 font-bold uppercase">{entityData?.ajusteManualJustificativa || 'Ajuste Técnico'}</p>
                          <p className="text-md font-black text-[#394054]">{currentStats.ajusteManual > 0 ? '+' : ''}{Math.floor(currentStats.ajusteManual).toLocaleString('pt-BR')}</p>
                       </div>
                    </div>
                 )}
                 <div className="pt-1">
                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">Saldo Final Auditado</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                        {Math.floor(currentStats.saldoReal || 0).toLocaleString('pt-BR')}
                    </p>
                 </div>
              </div>


           </div>
        </div>

        {/* Gestão de Propriedades e Ativo Biológico (Tabela) */}
        <div className="space-y-4 pt-4 break-inside-avoid">
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald-500 rounded-full" />
            Portfólio de Propriedades e Análise de Safra
          </h2>
          <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400">Propriedade / IDF</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 text-center">Safra</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400">Localização</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 text-right">Área Total (ha)</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 text-right">Monitorada</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-900 text-right">Volume (UCS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtor.fazendas.map((f: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6">
                      <p className="text-[11px] font-black text-slate-900 uppercase leading-tight">{f.fazendaNome}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">IDF: {String(f.idNxt || f.idf || '').padStart(11, '0')}</p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase leading-none">
                        {f.safraReferencia}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-[10px] font-bold text-slate-600 uppercase leading-tight">{f.municipio} - {f.uf}</p>
                      <p className="text-[8px] font-medium text-slate-400 uppercase">{f.nucleo || 'Núcleo Central'}</p>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-500 text-[10px]">
                      {f.areaTotal?.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="text-[10px] font-black text-slate-900">{f.areaProdutor?.toLocaleString('pt-BR')}</p>
                      <p className="text-[7px] font-bold text-emerald-500 uppercase tracking-tighter">
                        {((f.areaProdutor / f.areaTotal) * 100).toFixed(1)}% Participação
                      </p>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-emerald-600 text-[13px]">
                      {Math.floor(f.saldoOriginacao).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabelas de Auditoria Granular */}
        <div className="space-y-10 pt-6">
          {/* Seção 07 - Conciliação de Liquidez Por Matrícula */}
          <div className="space-y-6 break-inside-avoid">
            <h3 className="text-sm font-black bg-slate-100 text-slate-900 px-6 py-3 rounded-2xl uppercase tracking-[0.2em]">07. Conciliação de Liquidez Por Matrícula (Dossiê Técnico)</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-4 text-[9px] font-black uppercase text-slate-400 text-left">Propriedade / IDF</th>
                  <th className="py-4 text-[9px] font-black uppercase text-slate-400 text-center">Safra</th>
                  <th className="py-4 text-[9px] font-black uppercase text-slate-400 text-right">Originação</th>
                  <th className="py-4 text-[9px] font-black uppercase text-slate-400 text-right">Consumo</th>
                  <th className="py-4 text-[9px] font-black uppercase text-slate-400 text-right">Aquisição</th>
                  <th className="py-4 text-[9px] font-black uppercase text-slate-400 text-right">Aposentado</th>
                  <th className="py-4 text-[9px] font-black uppercase text-slate-900 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtor.fazendas.map((f: any, idx: number) => {
                  const farmOrig = Number(f.saldoOriginacao) || 0;
                  const farmCount = produtor.fazendas.length;
                  const totalConsumo = currentStats.movimentacao;
                  const baseDeduction = Math.floor(totalConsumo / farmCount);
                  const remainder = totalConsumo % farmCount;
                  const farmDeduction = idx < remainder ? baseDeduction + 1 : baseDeduction;

                  const farmAquisicao = (entityData?.tabelaAquisicao || [])?.filter((item: any) =>
                    produtor.fazendas.length === 1 ||
                    item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
                    f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
                  ).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);

                  const farmAposentado = (entityData?.tabelaLegado || [])?.filter((item: any) =>
                    produtor.fazendas.length === 1 ||
                    item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
                    f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
                  ).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0);

                  return (
                    <tr key={idx}>
                      <td className="py-4 font-black uppercase text-[11px] text-slate-900">
                        {f.fazendaNome}
                        <span className="block text-[8px] font-bold text-slate-400 tracking-tighter uppercase mt-0.5">IDF: {String(f.idNxt || f.idf || '').padStart(11, '0')}</span>
                      </td>
                      <td className="py-4 text-center font-bold text-[10px] text-slate-500">{f.safraReferencia}</td>
                      <td className="py-4 text-right font-bold text-slate-600 text-[10px]">{Math.floor(farmOrig).toLocaleString('pt-BR')}</td>
                      <td className="py-4 text-right font-bold text-rose-500 text-[10px]">-{farmDeduction.toLocaleString('pt-BR')}</td>
                      <td className="py-4 text-right font-bold text-[#394054] text-[10px]">-{farmAquisicao.toLocaleString('pt-BR')}</td>
                      <td className="py-4 text-right font-bold text-slate-400 text-[10px]">-{farmAposentado.toLocaleString('pt-BR')}</td>
                      <td className="py-4 text-right font-black text-emerald-600 text-sm">
                        {(Math.floor(farmOrig) - (farmDeduction + farmAquisicao + farmAposentado)).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1.5">Nota de Auditoria Técnica</p>
              <p className="text-[10px] italic text-amber-900 leading-relaxed">
                Os valores acima representam o saldo residual de UCS (Unidades de Crédito de Sustentabilidade) após a aplicação das deduções compulsórias de consumo, aquisição e aposentadoria direta. Este dossiê foi gerado eletronicamente e possui validade técnica para comprovação de custódia ambiental.
              </p>
            </div>
          </div>

        {/* Extrato Consolidado de Transações (Estilo Banco) */}
        <div className="space-y-8 pt-8">
          <h3 className="text-sm font-black bg-slate-900 text-white px-6 py-3 rounded-2xl uppercase tracking-[0.2em]">08. Extrato Técnico Consolidado (Audit Trail)</h3>
          <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 text-left">Data</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 text-left">ID / Lote</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 text-left">Fluxo Detalhado (Origem → Destino)</th>
                  <th className="py-4 px-6 text-[9px] font-black uppercase text-slate-400 text-right">Volume (UCS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const allTransactions = [
                    ...(entityData?.tabelaOriginacao || []).map((t: any) => ({ ...t, type: 'ORIGINAÇÃO', color: 'text-slate-900', sign: '+' })),
                    ...(entityData?.tabelaCreditos || []).map((t: any) => ({ ...t, type: 'CRÉDITO ADM', color: 'text-emerald-600', sign: '+' })),
                    ...(entityData?.tabelaMovimentacao || []).map((t: any) => ({ ...t, type: 'CONSUMO / SAÍDA', color: 'text-rose-500', sign: '-' })),
                    ...(entityData?.tabelaAquisicao || []).map((t: any) => ({ ...t, type: 'AQUISIÇÃO', color: 'text-[#394054]', sign: '-' })),
                    ...(entityData?.tabelaImei || []).map((t: any) => ({ ...t, type: 'AJUSTE IMEI', color: 'text-amber-600', sign: t.valorDebito > 0 ? '-' : '+', valor: t.valorDebito || t.valorCredito })),
                    ...(entityData?.tabelaLegado || []).map((t: any) => ({ ...t, type: 'RESERVA LEGADA', color: 'text-slate-400', sign: '-', valor: Number(t.aposentado || 0) + Number(t.bloqueado || 0) }))
                  ].filter(t => t.data && (t.valor || t.disponivel || t.valorDebito || t.valorCredito));

                  const sorted = allTransactions.sort((a, b) => {
                    const dateA = a.data.split('/').reverse().join('-');
                    const dateB = b.data.split('/').reverse().join('-');
                    return dateB.localeCompare(dateA);
                  });

                  return sorted.map((t, idx) => {
                    const origin = (t.usuarioOrigem || t.plataforma || 'CUSTÓDIA').trim().toUpperCase();
                    const dest = (t.usuarioDestino || t.destino || t.plataformaDestino || produtor.nome).trim().toUpperCase();
                    const isInternalAdjustment = origin === dest;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 text-[10px] font-bold text-slate-500">{t.data}</td>
                        <td className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {t.id?.split('-')[1] || t.dist || '---'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-0.5">
                             <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-black uppercase",
                                  isInternalAdjustment ? "text-[#394054]" : "text-slate-900"
                                )}>
                                  {isInternalAdjustment ? 'AJUSTE ENTRE PLATAFORMAS' : t.type}
                                </span>
                                <span className="text-[8px] bg-slate-100 text-slate-400 px-1 rounded font-bold uppercase">{t.statusAuditoria || t.status || 'FINAL'}</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
                                <span className="text-slate-900">{t.usuarioOrigem || t.plataforma || 'CUSTÓDIA'}</span>
                                <span className="text-slate-300">→</span>
                                <span className={t.usuarioDestino ? "text-slate-900" : "text-slate-400 italic"}>
                                  {t.usuarioDestino || t.destino || t.plataformaDestino || produtor.nome}
                                </span>
                             </div>
                          </div>
                        </td>
                        <td className={`py-4 px-6 text-right font-black ${t.color}`}>
                          {t.sign}{Math.floor(t.valor || t.disponivel || 0).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

          {entityData?.comentariosAuditoria && (
            <div className="mt-12 bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 break-inside-avoid shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldCheck className="w-24 h-24 text-slate-900" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Parecer Técnico de Auditoria</p>
               <p className="text-[12px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                  "{entityData.comentariosAuditoria}"
               </p>
            </div>
          )}

        {/* Firmas e Chaves de Verificação */}
        <div className="pt-10 space-y-10 break-inside-avoid">
          <div className="flex justify-center text-center">
            <div className="w-64 space-y-4">
              <div className="border-t border-slate-900 pt-5">
                <p className="text-[12px] font-black uppercase text-slate-900">{currentUser?.nome || currentUser?.displayName || 'Auditor Central'}</p>
                <div className="mt-1 space-y-0.5">
                   <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Auditado e Certificado Via NXT</p>
                   {currentUser?.cargo && <p className="text-[8px] font-bold text-slate-500 uppercase">{currentUser.cargo}</p>}
                   {currentUser?.cpf && <p className="text-[8px] font-mono text-slate-400">CPF: {currentUser.cpf}</p>}
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
