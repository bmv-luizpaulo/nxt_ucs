import React from "react";
import { 
  Download, Calculator, Trash2, ChevronRight 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-[24px] p-5 flex items-center justify-between shadow-sm">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-tight w-24">{label}</span>
      <div className="text-right">
        <span className="text-[18px] font-black text-slate-800 leading-none">{value}</span>
        <span className="text-[10px] font-bold text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}

export function QuickLink({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 px-6 rounded-2xl hover:bg-slate-50 transition-all group text-left border border-transparent">
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 rounded-xl bg-slate-50/50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-md group-hover:text-emerald-500 transition-all border border-transparent group-hover:border-slate-100">{icon}</div>
        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-slate-800 transition-colors leading-none">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

export function DocLink({ label }: { label: string }) {
  return (
    <button className="w-full h-16 bg-white border border-slate-100 rounded-[20px] p-4 flex items-center justify-between group hover:border-emerald-200 hover:shadow-lg transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
          <Download className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight text-left">{label}</span>
      </div>
      <Badge variant="secondary" className="bg-slate-50 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 text-[8px] font-black uppercase rounded-lg border-none">PDF</Badge>
    </button>
  );
}

export function SectionBlock({ title, value, onPaste, data, type, onRemove, onUpdateItem, isNegative, isAmber, customColor, pasteLabel, isGreen, isEditing }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn("w-1.5 h-6 rounded-full", customColor ? customColor : isAmber ? "bg-amber-500" : isNegative ? "bg-rose-500" : isGreen ? "bg-emerald-500" : "bg-emerald-500")} />
          <h3 className="text-[14px] font-black uppercase tracking-tight text-slate-800">{title}</h3>
          <Badge variant="outline" className={cn("text-[10px] font-black px-3 py-1 rounded-full", isAmber ? "text-amber-500 border-amber-200" : isNegative ? "text-rose-500 border-rose-200" : "text-emerald-500 border-emerald-200")}>
            {Math.floor(value || 0).toLocaleString('pt-BR')} UCS
          </Badge>
        </div>
        {isEditing && onPaste && (
          <Button
            variant="outline"
            onClick={onPaste}
            className={cn(
              "h-10 px-6 rounded-2xl text-[10px] font-black uppercase gap-2.5 transition-all text-slate-600 border-slate-200",
              customColor ? "bg-indigo-600 text-white border-none hover:bg-indigo-700 shadow-lg shadow-indigo-500/20" : "bg-white hover:bg-slate-50"
            )}
          >
            <Calculator className={cn("w-4 h-4", customColor ? "text-white" : "text-emerald-500")} /> {pasteLabel || "Colar Dados"}
          </Button>
        )}
      </div>
      <SectionTable data={data} type={type} onRemove={onRemove} onUpdateItem={onUpdateItem} isEditing={isEditing} />
    </div>
  );
}

export function SectionTable({ data, type, onRemove, onUpdateItem, isEditing }: any) {
  const isMovimentacao = type === 'movimentacao' || type === 'creditos';
  const isAquisicao = type === 'aquisicao';
  const isImei = type === 'imei';
  const isLegado = type === 'legado';

  const headers = isLegado
    ? ["ID", "DATA", "PLATAFORMA", "DISPONÍVEL", "RESERVADO", "BLOQUEADO", "APOSENTADO"]
    : isAquisicao
      ? ["ID", "DATA", "ADQUIRENTE", "OBSERVAÇÃO", "STATUS", "VALOR"]
      : isImei
        ? ["ID", "ANO", "ORIGEM", "MÉTRICA", "DÉBITO", "CRÉDITO"]
        : ["TIPO", "REF/ID", "DIST.", "DATA", "ORIGEM", "TIPO", "NOME", "DESTINO", "TIPO", "NOME", "SALDOS", "VALOR"];

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 border-b border-slate-100 h-10 hover:bg-slate-50/50">
              {headers.map((h, i) => (
                <TableHead key={i} className={cn(
                  "text-[8px] font-black uppercase tracking-widest text-slate-400",
                  i === headers.length - 1 ? "text-right pr-4" : "text-center px-1"
                )}>{h}</TableHead>
              ))}
              {isEditing && <TableHead className="w-[40px] px-1"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={isMovimentacao ? 11 : 7} className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest bg-slate-50/20">Nenhum registro auditado</TableCell></TableRow>
            ) : (
              data.map((row: any, i: number) => (
                <TableRow key={i} className="h-10 border-b border-slate-50 hover:bg-slate-50/50">
                  {isMovimentacao ? (
                    <>
                      <TableCell className="px-1 py-1 text-center">
                        {isEditing ? (
                          <Select
                            value={row.tipoTransacao || "CONSUMO"}
                            onValueChange={(v) => onUpdateItem?.(row.id, { tipoTransacao: v })}
                          >
                            <SelectTrigger className="h-7 rounded-lg bg-white/50 text-[8px] font-black uppercase border-slate-100 focus:bg-white transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CONSUMO">CONSUMO</SelectItem>
                              <SelectItem value="TRANSFERENCIA">TRANSFERÊNCIA</SelectItem>
                              <SelectItem value="ORIGINACAO">ORIGINAÇÃO</SelectItem>
                              <SelectItem value="IMEI / CUSTODIA">IMEI / CUSTODIA</SelectItem>
                              <SelectItem value="AJUSTE ENTRE PLATAFORMAS">AJUSTE</SelectItem>
                              <SelectItem value="RESERVA OPERACIONAL">RESERVA</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-[7px] font-black uppercase px-2 py-0 border-slate-100 text-slate-400 bg-slate-50/50">
                            {row.tipoTransacao || "CONSUMO"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        {isEditing ? (
                          <Input value={row.linkNxt || ''} onChange={e => onUpdateItem?.(row.id, { linkNxt: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[10px] font-mono font-bold text-slate-500 rounded-lg" />
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-slate-400 pl-2">{row.linkNxt || '---'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        {isEditing ? (
                          <Input value={row.dist || ''} onChange={e => onUpdateItem?.(row.id, { dist: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[10px] font-mono font-bold text-primary rounded-lg" />
                        ) : (
                          <span className="text-[10px] font-bold text-primary uppercase">{row.dist || '---'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        {isEditing ? (
                          <Input value={row.data || ''} onChange={e => onUpdateItem?.(row.id, { data: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[10px] font-mono font-bold text-slate-500 rounded-lg" />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">{row.data || '---'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        {isEditing ? (
                          <Input value={row.plataformaOrigem || ''} onChange={e => onUpdateItem?.(row.id, { plataformaOrigem: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-bold text-slate-700 rounded-lg uppercase" placeholder="Origem" />
                        ) : (
                          <span className="text-[9px] font-black text-slate-700 uppercase">{row.plataformaOrigem || '---'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <div className="flex flex-col gap-0.5 py-0.5">
                          {row.tipoUsuarioOrigem && (
                            <Badge variant="outline" className={cn(
                              "w-fit text-[6px] font-black uppercase px-1 py-0 border-transparent leading-none",
                              row.tipoUsuarioOrigem.includes('PRODUTOR') ? "bg-amber-100/50 text-amber-600" :
                                row.tipoUsuarioOrigem.includes('CLIENTE') || row.tipoUsuarioOrigem.includes('SAAS') ? "bg-emerald-100/50 text-emerald-600" :
                                  "bg-slate-100 text-slate-500"
                            )}>
                              {row.tipoUsuarioOrigem || ''}
                            </Badge>
                          )}
                          {isEditing ? (
                            <Input value={row.usuarioOrigem || ''} onChange={e => onUpdateItem?.(row.id, { usuarioOrigem: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[9px] text-slate-500 rounded-lg" placeholder="Nome" />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500 truncate">{row.usuarioOrigem || '---'}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        {isEditing ? (
                          <Input value={row.destino || ''} onChange={e => onUpdateItem?.(row.id, { destino: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-bold text-slate-700 rounded-lg uppercase" placeholder="Destino" />
                        ) : (
                          <span className="text-[9px] font-black text-slate-700 uppercase">{row.destino || '---'}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <div className="flex flex-col gap-0.5 py-0.5">
                          {row.tipoUsuarioDestino && (
                            <Badge variant="outline" className={cn(
                              "w-fit text-[6px] font-black uppercase px-1 py-0 border-transparent leading-none",
                              row.tipoUsuarioDestino.includes('PRODUTOR') ? "bg-amber-100/50 text-amber-600" :
                                row.tipoUsuarioDestino.includes('CLIENTE') || row.tipoUsuarioDestino.includes('SAAS') ? "bg-emerald-100/50 text-emerald-600" :
                                  "bg-slate-100 text-slate-500"
                            )}>
                              {row.tipoUsuarioDestino || ''}
                            </Badge>
                          )}
                          {isEditing ? (
                            <Input value={row.usuarioDestino || ''} onChange={e => onUpdateItem?.(row.id, { usuarioDestino: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[9px] text-slate-500 rounded-lg" placeholder="Nome" />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500 truncate">{row.usuarioDestino || '---'}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        {isEditing ? (
                          <Input value={row.statusAuditoria || ''} onChange={e => onUpdateItem?.(row.id, { statusAuditoria: e.target.value })} className="h-7 bg-slate-50/50 border-slate-100 text-[9px] font-mono font-black text-slate-400 text-center rounded-lg" placeholder="Saldos" />
                        ) : (
                          <div className="text-center font-mono text-[9px] text-slate-300 uppercase">{row.statusAuditoria || '---'}</div>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1 pr-4">
                        <div className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={row.valor || 0}
                              onChange={e => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0 })}
                              className={cn(
                                "h-7 bg-slate-50/30 border-slate-100 text-[10px] font-mono font-black text-right rounded-lg",
                                (!row.tipoTransacao || row.tipoTransacao === 'CONSUMO') ? "text-rose-500 border-rose-100 bg-rose-50/30" : "text-slate-400 border-slate-100 bg-slate-50/30"
                              )}
                            />
                          ) : (
                            <span className={cn(
                              "text-[12px] font-black",
                              (!row.tipoTransacao || row.tipoTransacao === 'CONSUMO') ? "text-rose-600" : "text-slate-500"
                            )}>
                              {(!row.tipoTransacao || row.tipoTransacao === 'CONSUMO') ? '- ' : '+ '}
                              {Math.floor(row.valor || 0).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {row.tipoTransacao && row.tipoTransacao !== 'CONSUMO' && (
                            <p className="text-[6px] font-black text-slate-400 uppercase pr-1">Não deduzido</p>
                          )}
                        </div>
                      </TableCell>
                    </>
                  ) : isLegado ? (
                    <>
                      <TableCell className="pl-4 py-0.5 text-center"><span className="text-[10px] font-black text-slate-400">{row.id?.substring(0, 5)}</span></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.data || ''} onChange={e => onUpdateItem(row.id, { data: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-mono text-slate-500 rounded-none text-center shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.plataforma || ''} onChange={e => onUpdateItem(row.id, { plataforma: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-bold text-slate-700 rounded-none uppercase shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.disponivel || 0} type="number" onChange={e => onUpdateItem(row.id, { disponivel: parseFloat(e.target.value) || 0 })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[11px] font-black text-emerald-700 rounded-none text-right shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.reservado || 0} type="number" onChange={e => onUpdateItem(row.id, { reservado: parseFloat(e.target.value) || 0 })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[11px] font-black text-orange-700 rounded-none text-right shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.bloqueado || 0} type="number" onChange={e => onUpdateItem(row.id, { bloqueado: parseFloat(e.target.value) || 0 })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[11px] font-black text-amber-800 rounded-none text-right shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5 pr-4"><Input value={row.aposentado || 0} type="number" onChange={e => onUpdateItem(row.id, { aposentado: parseFloat(e.target.value) || 0 })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[11px] font-black text-slate-500 rounded-none text-right shadow-none focus-visible:ring-0" /></TableCell>
                    </>
                  ) : isAquisicao ? (
                    <>
                      <TableCell className="pl-4 py-0.5 text-center"><span className="text-[10px] font-black text-slate-400">{row.id?.substring(0, 5)}</span></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.data || ''} onChange={e => onUpdateItem(row.id, { data: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-mono text-slate-500 rounded-none text-center shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.adquirente || 'BMTCA / IMEI'} onChange={e => onUpdateItem(row.id, { adquirente: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-bold text-indigo-700 rounded-none uppercase shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.observacao || ''} onChange={e => onUpdateItem(row.id, { observacao: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] text-slate-400 rounded-none shadow-none focus-visible:ring-0" placeholder="Contrato" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.status || 'CONCLUÍDO'} onChange={e => onUpdateItem(row.id, { status: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-black text-slate-400 rounded-none text-center shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5 pr-4"><Input value={row.valor || 0} type="number" onChange={e => onUpdateItem(row.id, { valor: parseFloat(e.target.value) || 0 })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[11px] font-black text-indigo-700 rounded-none text-right shadow-none focus-visible:ring-0" /></TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="pl-4 py-0.5 text-center"><span className="text-[10px] font-black text-slate-400">{row.id?.substring(0, 5)}</span></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.dist || ''} onChange={e => onUpdateItem?.(row.id, { dist: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-mono font-bold text-primary rounded-none text-center shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={row.data || ''} onChange={e => onUpdateItem?.(row.id, { data: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-mono font-bold text-slate-500 rounded-none text-center shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={isImei ? (row.valorDebito || 0) : (row.plataforma || '')} onChange={e => onUpdateItem?.(row.id, isImei ? { valorDebito: parseFloat(e.target.value) || 0 } : { plataforma: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-bold text-slate-500 rounded-none uppercase shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5"><Input value={isImei ? (row.valorCredito || 0) : (row.statusAuditoria || '')} onChange={e => onUpdateItem?.(row.id, isImei ? { valorCredito: parseFloat(e.target.value) || 0 } : { statusAuditoria: e.target.value })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[10px] font-bold text-slate-500 rounded-none uppercase shadow-none focus-visible:ring-0" /></TableCell>
                      <TableCell className="px-0.5 py-0.5 pr-4"><Input type="number" value={row.valor || 0} onChange={e => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0 })} className="h-6 bg-transparent border-transparent hover:border-slate-200 text-[11px] font-mono font-black text-emerald-600 text-right rounded-none shadow-none focus-visible:ring-0" /></TableCell>
                    </>
                  )}
                  {isEditing && (
                    <TableCell className="w-[40px] px-1 py-1 text-center">
                      <button onClick={() => onRemove?.(row.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function PropDetail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[12px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={cn("text-[12px] font-black uppercase", highlight ? "text-emerald-600" : "text-slate-800")}>{value}</span>
    </div>
  );
}
