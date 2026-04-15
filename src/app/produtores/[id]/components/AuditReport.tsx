import React, { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AuditReportProps {
  produtor: any;
  entityData: any;
  currentStats: any;
  isPreview?: boolean;
  currentUser?: any;
  isSimplified?: boolean;
  isCensored?: boolean;
}

export function AuditReport({ 
  produtor, 
  entityData, 
  currentStats, 
  isPreview, 
  currentUser,
  isSimplified = false,
  isCensored = false
}: AuditReportProps) {
  
  const mask = (text: string) => {
    if (!isCensored || !text) return text;
    const prodName = produtor.nome?.toUpperCase().trim();
    const upperText = text.toUpperCase().trim();
    if (upperText.includes(prodName) || prodName.includes(upperText)) return text;
    return text.split(' ').map(() => '****').join(' ');
  };

  const totalAuditRecordsCount = useMemo(() => (
    (entityData?.tabelaOriginacao?.length || 0) + 
    (entityData?.tabelaMovimentacao?.length || 0) + 
    (entityData?.tabelaAquisicao?.length || 0) + 
    (entityData?.tabelaImei?.length || 0) + 
    (entityData?.tabelaCreditos?.length || 0) + 
    (entityData?.tabelaLegado?.length || 0)
  ), [entityData]);

  const farmConciliation = useMemo(() => {
    if (!produtor?.fazendas) return [];
    const farmCount = produtor.fazendas.length;
    const totalConsumo    = Math.abs(Math.floor(currentStats.movimentacao || 0));
    const totalAquisicao  = Math.floor(currentStats.aquisicao    || 0);
    const totalAposentado = Math.floor(currentStats.aposentado   || 0);

    const distValue = (total: number, idx: number) => {
      if (farmCount === 0) return 0;
      const base = Math.floor(total / farmCount);
      const resto = total % farmCount;
      return idx < resto ? base + 1 : base;
    };

    return produtor.fazendas.map((f: any, idx: number) => {
      const farmOrig       = Number(f.saldoOriginacao) || 0;
      const farmConsumo    = distValue(totalConsumo,    idx);
      const farmAquisicao  = distValue(totalAquisicao,  idx);
      const farmAposentado = distValue(totalAposentado, idx);
      const temRestoConsumo    = farmCount > 0 && (totalConsumo    % farmCount) > 0 && idx < (totalConsumo    % farmCount);
      const temRestoAquisicao  = farmCount > 0 && (totalAquisicao  % farmCount) > 0 && idx < (totalAquisicao  % farmCount);
      const temRestoAposentado = farmCount > 0 && (totalAposentado % farmCount) > 0 && idx < (totalAposentado % farmCount);
      const liquid = farmOrig - farmConsumo - farmAquisicao - farmAposentado;
      return { ...f, farmOrig, farmConsumo, farmAquisicao, farmAposentado, temRestoConsumo, temRestoAquisicao, temRestoAposentado, liquid };
    });
  }, [produtor, currentStats, entityData]);

  const auditTrail = useMemo(() => {
    const allTransactions = [
      ...(entityData?.tabelaOriginacao || []).map((t: any) => ({ ...t, type: 'ORIGINAÇÃO', color: 'text-slate-900', sign: '+' })),
      ...(entityData?.tabelaCreditos || []).map((t: any) => ({ ...t, type: 'CRÉDITO ADM', color: 'text-emerald-600', sign: '+' })),
      ...(entityData?.tabelaMovimentacao || []).map((t: any) => ({ ...t, type: 'CONSUMO / SAÍDA', color: 'text-rose-500', sign: '-' })),
      ...(entityData?.tabelaAquisicao || []).map((t: any) => ({ ...t, type: 'AQUISIÇÃO', color: 'text-[#394054]', sign: '-' })),
      ...(entityData?.tabelaImei || []).map((t: any) => ({ ...t, type: 'AJUSTE IMEI', color: 'text-amber-600', sign: (t.valorDebito || 0) > 0 ? '-' : '+', valor: t.valorDebito || t.valorCredito })),
      ...(entityData?.tabelaLegado || []).map((t: any) => ({ ...t, type: 'RESERVA LEGADA', color: 'text-slate-400', sign: '-', valor: Number(t.aposentado || 0) + Number(t.bloqueado || 0) }))
    ].filter(t => t.data && (t.valor || t.disponivel || t.valorDebito || t.valorCredito));

    return allTransactions.sort((a, b) => {
      const dateA = (a.data || '').split('/').reverse().join('-');
      const dateB = (b.data || '').split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    });
  }, [entityData, produtor]);

  return (
    <div className={cn(
      "bg-white w-full audit-page font-sans",
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
             <div className="mt-2 flex justify-end gap-3 items-center">
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[8px] px-2 py-0.5 rounded-md">
                   {totalAuditRecordsCount} REGISTROS AUDITADOS
                </Badge>
                <p className="text-[10px] font-black text-slate-700 uppercase">Protocolo: <span className="text-indigo-600">{produtor.documento?.replace(/\D/g, '')}_{new Date().getFullYear()}</span></p>
             </div>
             <p className="text-[8px] font-bold text-slate-400 mt-1">{new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Identificação e Resumo */}
        <div className="grid grid-cols-12 gap-8 py-6 border-b-4 border-slate-900 break-inside-avoid">
           <div className="col-span-8 space-y-4">
              <div className="space-y-2">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identificação da Entidade</p>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{produtor.nome}</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                 <div className="space-y-2">
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Documento:</p>
                       <p className="text-[11px] font-black text-slate-900">{produtor.documento}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Safra Referência:</p>
                       <p className="text-[11px] font-black text-slate-900 uppercase">{produtor.fazendas?.[0]?.safraReferencia || '---'}</p>
                    </div>
                 </div>
                 <div className="space-y-2 border-l border-slate-200 pl-8">
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Auditor Responsável:</p>
                       <p className="text-[11px] font-black text-slate-900 uppercase">{currentUser?.displayName || currentUser?.name || 'Sistema Central'}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Data de Certificação:</p>
                       <p className="text-[11px] font-black text-slate-900 font-mono tracking-tighter">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="col-span-4 space-y-4 border-l border-slate-200 pl-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo de Saldos (UCS)</p>
              <div className="space-y-3">
                 <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Originação Total</p>
                    <p className="text-lg font-black text-slate-900">{Math.floor(currentStats.originacao || 0).toLocaleString('pt-BR')}</p>
                 </div>
                 <div className="space-y-1 border-b border-slate-200 pb-3">
                    <div className="flex justify-between text-[9px]">
                      <span className="font-bold text-slate-400 uppercase">Consumo</span>
                      <span className="font-black text-rose-500">-{Math.abs(Math.floor(currentStats.movimentacao || 0)).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="font-bold text-slate-400 uppercase">Aquisição</span>
                      <span className="font-black text-indigo-500">-{Math.floor(currentStats.aquisicao || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="font-bold text-slate-400 uppercase">Aposentadas</span>
                      <span className="font-black text-slate-500">-{Math.floor(currentStats.aposentado || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    {(currentStats.bloqueado || 0) > 0 && (
                      <div className="flex justify-between text-[9px] pt-1 border-t border-amber-200">
                        <span className="font-bold text-amber-600 uppercase">Bloqueado 🔒 (pool)</span>
                        <span className="font-black text-amber-600">-{Math.floor(currentStats.bloqueado || 0).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                 </div>
                 <div>
                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">Saldo Final Auditado</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                        {Math.floor(currentStats.saldoReal || 0).toLocaleString('pt-BR')}
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* Portfólio de Propriedades */}
        {!isSimplified && (
        <div className="space-y-4 pt-4 break-inside-avoid">
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            Portfólio de Propriedades e Safra
          </h2>
          <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-6 text-[8px] font-black uppercase text-slate-400">Propriedade / IDF</th>
                  <th className="py-3 px-6 text-[8px] font-black uppercase text-slate-400 text-center">Safra</th>
                  <th className="py-3 px-6 text-[8px] font-black uppercase text-slate-400">Localização</th>
                  <th className="py-3 px-6 text-[8px] font-black uppercase text-slate-900 text-right">Volume (UCS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtor.fazendas.map((f: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6">
                      <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">{f.fazendaNome}</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">IDF: {f.idf || '---'}</p>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="bg-slate-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded leading-none">
                        {f.safraReferencia}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <p className="text-[9px] font-bold text-slate-600 uppercase leading-tight">{f.municipio} - {f.uf}</p>
                    </td>
                    <td className="py-3 px-6 text-right font-black text-emerald-600 text-[11px]">
                      {Math.floor(f.saldoOriginacao).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Conciliação por Matrícula */}
        {(!isSimplified || !isCensored) && (
        <div className="space-y-4 pt-4 break-inside-avoid">
          <h3 className="text-[11px] font-black bg-slate-100 text-slate-900 px-5 py-2.5 rounded-xl uppercase tracking-[0.1em]">07. Conciliação de Liquidez Por Matrícula</h3>
          <table className="w-full border-collapse text-[8px]">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-50">
                <th className="py-2.5 px-4 font-black uppercase text-slate-500 text-left">Propriedade / IDF</th>
                <th className="py-2.5 px-3 font-black uppercase text-slate-500 text-right">Originação</th>
                <th className="py-2.5 px-3 font-black uppercase text-rose-400 text-right">Consumo ÷</th>
                <th className="py-2.5 px-3 font-black uppercase text-indigo-400 text-right">Aquisição ÷</th>
                <th className="py-2.5 px-3 font-black uppercase text-slate-400 text-right">Aposentadas ÷</th>
                <th className="py-2.5 px-4 font-black uppercase text-slate-900 text-right">Saldo Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {farmConciliation.map((f: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4">
                    <p className="font-black text-slate-900 uppercase leading-tight">{f.fazendaNome}</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">IDF: {f.idf}</p>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-600">{Math.floor(f.farmOrig).toLocaleString('pt-BR')}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-500">
                    -{f.farmConsumo.toLocaleString('pt-BR')}
                    {f.temRestoConsumo && <span className="text-amber-500 ml-0.5">*</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-500">
                    -{f.farmAquisicao.toLocaleString('pt-BR')}
                    {f.temRestoAquisicao && <span className="text-amber-500 ml-0.5">*</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-500">
                    -{f.farmAposentado.toLocaleString('pt-BR')}
                    {f.temRestoAposentado && <span className="text-amber-500 ml-0.5">*</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right font-black text-[10px] text-emerald-600">
                    {f.liquid.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-50">
                <td className="py-2.5 px-4 font-black text-slate-500 uppercase text-[7px]">Subtotal Fazendas</td>
                <td className="py-2.5 px-3 text-right font-black text-slate-700">
                  {farmConciliation.reduce((acc: number, f: any) => acc + f.farmOrig, 0).toLocaleString('pt-BR')}
                </td>
                <td className="py-2.5 px-3 text-right font-black text-rose-500">
                  -{Math.abs(Math.floor(currentStats.movimentacao || 0)).toLocaleString('pt-BR')}
                </td>
                <td className="py-2.5 px-3 text-right font-black text-indigo-500">
                  -{Math.floor(currentStats.aquisicao || 0).toLocaleString('pt-BR')}
                </td>
                <td className="py-2.5 px-3 text-right font-black text-slate-500">
                  -{Math.floor(currentStats.aposentado || 0).toLocaleString('pt-BR')}
                </td>
                <td className="py-2.5 px-4 text-right font-black text-[10px] text-slate-700">
                  {farmConciliation.reduce((acc: number, f: any) => acc + f.liquid, 0).toLocaleString('pt-BR')}
                </td>
              </tr>
              {(currentStats.bloqueado || 0) > 0 && (
                <tr className="bg-amber-50">
                  <td className="py-2 px-4 font-black text-amber-600 uppercase text-[7px]" colSpan={5}>
                    🔒 Saldo Bloqueado (pool — não distribuído por fazenda)
                  </td>
                  <td className="py-2 px-4 text-right font-black text-amber-600">
                    -{Math.floor(currentStats.bloqueado || 0).toLocaleString('pt-BR')}
                  </td>
                </tr>
              )}
              <tr className="bg-emerald-50 border-t border-emerald-200">
                <td className="py-3 px-4 font-black text-emerald-700 uppercase text-[8px]" colSpan={5}>Saldo Real Disponível</td>
                <td className="py-3 px-4 text-right font-black text-[11px] text-emerald-700">
                  {Math.floor(currentStats.saldoReal || 0).toLocaleString('pt-BR')}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="text-[7px] text-slate-400 mt-1">* Fazenda absorveu +1 UCS do resto inteiro da divisão igualitária.</p>
        </div>
        )}

        {/* Audit Trail */}
        <div className="space-y-6 pt-8 break-inside-avoid">
          <h3 className="text-[11px] font-black bg-slate-900 text-white px-5 py-2.5 rounded-xl uppercase tracking-[0.1em]">08. Extrato Técnico Consolidado (Audit Trail)</h3>
          <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-6 text-[8px] font-black uppercase text-slate-400 text-left">Data</th>
                  <th className="py-3 px-6 text-[8px] font-black uppercase text-slate-400 text-left">Operação</th>
                  <th className="py-3 px-6 text-[8px] font-black uppercase text-slate-400 text-right">Volume (UCS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditTrail.map((t, idx) => {
                  const origin = (t.usuarioOrigem || t.plataforma || 'CUSTÓDIA').trim().toUpperCase();
                  const dest = (t.usuarioDestino || t.destino || t.plataformaDestino || produtor.nome).trim().toUpperCase();
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6 text-[9px] font-bold text-slate-500">{t.data}</td>
                      <td className="py-3 px-6">
                        <div className="flex flex-col">
                           <span className={cn("text-[9px] font-black uppercase", t.color)}>{t.type}</span>
                           <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase">
                              <span>{mask(origin)}</span>
                              <span>→</span>
                              <span>{mask(dest)}</span>
                           </div>
                        </div>
                      </td>
                      <td className={`py-3 px-6 text-right font-black ${t.color} text-[10px]`}>
                        {t.sign}{Math.floor(t.valor || t.disponivel || 0).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assinatura */}
        <div className="pt-10 flex justify-end text-right break-inside-avoid">
          <div className="w-56 space-y-4">
            <div className="border-t-2 border-slate-900 pt-4">
              <p className="text-[11px] font-black uppercase text-slate-900">{currentUser?.displayName || currentUser?.name || 'Auditor Central'}</p>
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">Auditado e Certificado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
