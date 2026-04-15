import React from "react";
import {
  Download, Calculator, Trash2, ChevronRight,
  ExternalLink, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ==========================================
// TIPAGENS (Removendo o 'any')
// ==========================================
interface StatCardProps {
  label: string;
  value: string | number;
  unit: string;
  isPositive?: boolean;
}

interface QuickLinkProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface DocLinkProps {
  label: string;
}

interface SectionBlockProps {
  title: string;
  value: number;
  data: any[];
  type: 'originacao' | 'creditos' | 'movimentacao' | 'aquisicao' | 'imei' | 'legado';
  onPaste?: () => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onUpdateItem?: (id: string, updates: any) => void;
  isEditing?: boolean;
  isNegative?: boolean;
  isAmber?: boolean;
  isGreen?: boolean;
  customColor?: string;
  pasteLabel?: string;
  hideValue?: boolean;
}

interface SectionTableProps {
  data: any[];
  type: SectionBlockProps['type'];
  onRemove?: (id: string) => void;
  onUpdateItem?: (id: string, updates: any) => void;
  isEditing?: boolean;
}

// ==========================================
// COMPONENTES DE DASHBOARD
// ==========================================

export function StatCard({ label, value, unit, isPositive = true }: StatCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;

  return (
    <div className="group bg-white border border-slate-100/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center gap-2.5 mb-6">
        <div className={cn(
          "w-1 h-3.5 rounded-full transition-transform group-hover:scale-y-125 duration-300",
          isPositive ? "bg-emerald-500" : "bg-rose-500"
        )} />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn(
          "text-3xl font-black tracking-tighter leading-none transition-colors duration-300",
          isPositive ? "text-slate-900 group-hover:text-emerald-600" : "text-rose-600"
        )}>
          {displayValue}
        </span>
        <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{unit}</span>
      </div>
    </div>
  );
}

export function QuickLink({ icon, label, onClick }: QuickLinkProps) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 px-6 rounded-2xl bg-slate-50/50 hover:bg-white transition-all duration-300 group text-left border border-transparent hover:border-slate-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-all shadow-sm border border-slate-100 group-hover:border-emerald-100">
          {icon}
        </div>
        <span className="text-xs font-black text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors leading-none">{label}</span>
      </div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent group-hover:bg-emerald-50 transition-colors">
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

export function DocLink({ label }: DocLinkProps) {
  return (
    <button className="w-full h-14 bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
          <Download className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight text-left">{label}</span>
      </div>
      <Badge variant="secondary" className="bg-slate-50 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 text-[8px] font-black uppercase rounded-md border-none">PDF</Badge>
    </button>
  );
}

// ==========================================
// SEÇÕES TÉCNICAS E TABELAS
// ==========================================

export function SectionBlock({
  title, value, onPaste, data, type, onRemove, onUpdateItem,
  isNegative, isAmber, customColor, pasteLabel, isGreen, isEditing,
  onAdd, hideValue
}: SectionBlockProps) {

  // Lógica simplificada de cores
  const themeColor = customColor ? customColor :
    isAmber ? "bg-amber-500 shadow-amber-500/20" :
      isNegative ? "bg-rose-500 shadow-rose-500/20" :
        "bg-emerald-500 shadow-emerald-500/20";

  const badgeTheme = isGreen ? "bg-emerald-50 text-emerald-600" :
    isNegative ? "bg-rose-50 text-rose-500" :
      isAmber ? "bg-amber-50 text-amber-600" :
        (customColor ? `bg-slate-900 text-white` : "bg-slate-100 text-slate-600");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">

        <div className="flex items-center gap-4">
          <div className={cn("w-1.5 h-10 rounded-full shadow-sm", themeColor)} />
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">{title}</h3>
            <div className="flex items-center gap-3">
              {!hideValue && (
                <Badge className={cn("font-black text-[10px] px-3 py-1 border-none shadow-none rounded-lg", badgeTheme)}>
                  <span className="tracking-tighter">{Math.floor(value || 0).toLocaleString('pt-BR')} UCS</span>
                </Badge>
              )}
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {data?.length || 0} Registros
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && onAdd && (
            <Button
              onClick={onAdd}
              variant="outline"
              className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 bg-white hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm transition-all shrink-0"
            >
              Adicionar Item
            </Button>
          )}

          {isEditing && onPaste && (
            <Button
              onClick={onPaste}
              variant="outline"
              className="h-9 px-5 rounded-xl border-emerald-500/30 text-emerald-600 bg-white hover:bg-emerald-50 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm transition-all shrink-0"
            >
              <Calculator className="w-3.5 h-3.5" />
              {pasteLabel || "Colar Dados"}
            </Button>
          )}
        </div>
      </div>

      <SectionTable data={data} type={type} onRemove={onRemove} onUpdateItem={onUpdateItem} isEditing={isEditing} />
    </div>
  );
}

export function SectionTable({ data, type, onRemove, onUpdateItem, isEditing }: SectionTableProps) {
  const isMovimentacao = type === 'movimentacao' || type === 'creditos' || type === 'originacao';
  const isAquisicao = type === 'aquisicao';
  const isImei = type === 'imei';
  const isLegado = type === 'legado';

  // Definição limpa dos cabeçalhos baseados no tipo
  let headers: string[] = [];
  if (isLegado) headers = ["ID", "DATA", "ORIGEM", "DISPONÍVEL", "RESERVADO", "BLOQUEADO", "APOSENTADO"];
  else if (isAquisicao) headers = ["ID", "DATA", "ADQUIRENTE", "OBSERVAÇÃO", "STATUS", "VALOR"];
  else if (isImei) headers = ["DIST.", "DATA INÍCIO", "ORIGEM", "DESTINO", "CRÉDITO", "DÉBITO"];
  else headers = ["TIPO", "ID / REF", "DIST.", "DATA", "ORIGEM", "DESTINO", "SITUAÇÃO", "UCS"];

  // Componente interno para inputs repetitivos na tabela
  const CellInput = ({ val, onChange, type = "text", align = "left", color = "text-slate-500", bold = false }: any) => (
    <Input
      type={type}
      value={val}
      readOnly={!isEditing}
      onChange={onChange}
      className={cn(
        "h-7 bg-transparent border-transparent text-[10px] rounded-md shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500/30 px-2",
        isEditing ? "hover:border-slate-200 bg-white/50" : "pointer-events-none",
        `text-${align}`, color, bold ? "font-black uppercase" : "font-bold"
      )}
    />
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-100/80 overflow-hidden shadow-sm group/table">
      <div className="overflow-x-auto custom-scrollbar">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
              {headers.map((h, i) => (
                <TableHead key={i} className={cn(
                  "text-[9px] font-black uppercase tracking-widest text-slate-400 h-10",
                  i === headers.length - 1 ? "text-right pr-6" : "text-left px-4"
                )}>{h}</TableHead>
              ))}
              {isEditing && <TableHead className="w-[40px] px-2"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!data || data.length === 0) ? (
              <TableRow>
                <TableCell colSpan={headers.length + (isEditing ? 1 : 0)} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum registro auditado</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row: any, i: number) => {
                const isAjuste = row.tipoTransacao === 'AJUSTE_PLATAFORMA';

                // helpers de cor por tipo
                const tipoColor = (
                  row.tipoTransacao === 'CONSUMO' ? { text: 'text-rose-600', bg: 'bg-rose-50' } :
                  row.tipoTransacao === 'TRANSFERENCIA' ? { text: 'text-indigo-600', bg: 'bg-indigo-50' } :
                  row.tipoTransacao === 'RESERVA' ? { text: 'text-amber-600', bg: 'bg-amber-50' } :
                  row.tipoTransacao === 'CREDITO' ? { text: 'text-emerald-600', bg: 'bg-emerald-50' } :
                  row.tipoTransacao === 'ORIGINACAO' ? { text: 'text-slate-700', bg: 'bg-slate-100' } :
                  row.tipoTransacao === 'IMEI_CUSTODIA' ? { text: 'text-violet-600', bg: 'bg-violet-50' } :
                  row.tipoTransacao === 'AJUSTE_PLATAFORMA' ? { text: 'text-teal-600', bg: 'bg-teal-50' } :
                  { text: 'text-rose-600', bg: 'bg-rose-50' }
                );

                const tipoLabel = (
                  row.tipoTransacao === 'IMEI_CUSTODIA' ? 'IMEI / CUSTÓDIA' :
                  row.tipoTransacao === 'AJUSTE_PLATAFORMA' ? 'AJUSTE ENTRE PLATAFORMAS' :
                  (row.tipoTransacao || 'CONSUMO')
                );

                return (
                <TableRow
                  key={row.id || i}
                  className={cn(
                    "border-b border-slate-50 hover:bg-slate-50/60 transition-colors",
                    isAjuste ? "bg-teal-50/30" : ""
                  )}
                >

                  {/* RENDERIZAÇÃO: MOVIMENTAÇÃO / CRÉDITOS / ORIGINAÇÃO */}
                  {isMovimentacao && (
                    <>
                      {/* — TIPO — */}
                      <TableCell className="pl-5 pr-3 py-3 w-[150px]">
                        {isEditing ? (
                          <Select
                            value={row.tipoTransacao || 'CONSUMO'}
                            onValueChange={(val) => onUpdateItem?.(row.id, { tipoTransacao: val })}
                          >
                            <SelectTrigger className={cn("h-7 w-full text-[8px] font-black uppercase border-0 px-2 rounded-lg", tipoColor.bg, tipoColor.text)}>
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-100 rounded-xl shadow-xl">
                              <SelectItem value="CONSUMO" className="text-[10px] font-bold text-rose-600 uppercase">Consumo</SelectItem>
                              <SelectItem value="TRANSFERENCIA" className="text-[10px] font-bold text-indigo-600 uppercase">Transferência</SelectItem>
                              <SelectItem value="RESERVA" className="text-[10px] font-bold text-amber-600 uppercase">Reserva</SelectItem>
                              <SelectItem value="CREDITO" className="text-[10px] font-bold text-emerald-600 uppercase">Crédito</SelectItem>
                              <SelectItem value="ORIGINACAO" className="text-[10px] font-bold text-slate-700 uppercase">Originação</SelectItem>
                              <SelectItem value="IMEI_CUSTODIA" className="text-[10px] font-bold text-violet-600 uppercase">IMEI / Custódia</SelectItem>
                              <SelectItem value="AJUSTE_PLATAFORMA" className="text-[10px] font-bold text-teal-600 uppercase">Ajuste entre Plataformas</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={cn("text-[9px] font-black uppercase tracking-wider leading-tight", tipoColor.text)}>
                            {tipoLabel}
                          </span>
                        )}
                      </TableCell>

                      {/* — ID/REF — */}
                      <TableCell className="px-3 py-3 w-[80px]">
                        <CellInput val={row.plataforma || row.id || ''} bold color="text-slate-600" onChange={(e: any) => onUpdateItem?.(row.id, { plataforma: e.target.value })} />
                      </TableCell>

                      {/* — DIST. — */}
                      <TableCell className="px-3 py-3 w-[70px]">
                        {isEditing ? (
                          <CellInput val={row.dist || ''} bold color="text-teal-600" onChange={(e: any) => onUpdateItem?.(row.id, { dist: e.target.value })} />
                        ) : (
                          <span className="text-[10px] font-black text-teal-600 tabular-nums px-2">{row.dist || '—'}</span>
                        )}
                      </TableCell>

                      {/* — DATA — */}
                      <TableCell className="px-3 py-3 w-[90px]">
                        <CellInput val={row.data || ''} color="text-slate-500" onChange={(e: any) => onUpdateItem?.(row.id, { data: e.target.value })} />
                      </TableCell>

                      {/* — ORIGEM — stacked label + name */}
                      <TableCell className="px-3 py-3 min-w-[130px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">PRODUTOR</span>
                          <CellInput val={row.usuarioOrigem || row.origem || ''} bold color="text-slate-800" onChange={(e: any) => onUpdateItem?.(row.id, { usuarioOrigem: e.target.value })} />
                        </div>
                      </TableCell>

                      {/* — DESTINO — stacked label + name */}
                      <TableCell className="px-3 py-3 min-w-[180px]">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("text-[8px] font-black uppercase tracking-widest",
                            isAjuste ? "text-teal-500" : "text-slate-400"
                          )}>{isAjuste ? 'PRÓPRIA CONTA' : 'CLIENTE / DESTINO'}</span>
                          <CellInput val={row.cliente || row.usuarioDestino || ''} bold={isAjuste} color={isAjuste ? "text-teal-700" : "text-slate-700"} onChange={(e: any) => onUpdateItem?.(row.id, { usuarioDestino: e.target.value })} />
                        </div>
                      </TableCell>

                      {/* — SITUAÇÃO — */}
                      <TableCell className="px-3 py-3 w-[100px]">
                        <div className="flex flex-col gap-1">
                          {isEditing ? (
                            <Select
                              value={row.situacao || 'A conferir'}
                              onValueChange={(val) => onUpdateItem?.(row.id, { situacao: val })}
                            >
                              <SelectTrigger className="h-7 w-[90px] text-[8px] font-black uppercase border-slate-200 bg-white/50 px-2 rounded-lg">
                                <SelectValue placeholder="Sit." />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-100 rounded-xl shadow-xl">
                                <SelectItem value="Pago" className="text-[10px] font-bold uppercase">Pago</SelectItem>
                                <SelectItem value="CONCLUÍDO" className="text-[10px] font-bold uppercase">Concluído</SelectItem>
                                <SelectItem value="A conferir" className="text-[10px] font-bold uppercase">A conferir</SelectItem>
                                <SelectItem value="Pendente" className="text-[10px] font-bold uppercase">Pendente</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-2">
                              {row.situacao || 'CONCLUÍDO'}
                            </span>
                          )}
                          {isAjuste && !isEditing && (
                            <span className="text-[8px] font-black uppercase text-teal-500 tracking-wider px-2">NÃO DEDUZIDO</span>
                          )}
                        </div>
                      </TableCell>

                      {/* — UCS / VALOR — */}
                      <TableCell className="px-3 py-3 pr-6 text-right w-[90px]">
                        {isAjuste && !isEditing ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={cn("text-[11px] font-black tabular-nums",
                              (row.valor || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {(row.valor || 0) > 0 ? '+' : ''}{(row.valor || 0).toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[8px] font-black text-teal-500 uppercase">Não deduzido</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <CellInput
                              type="number" align="right" bold
                              color={(row.valor || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}
                              val={row.valor || 0}
                              onChange={(e: any) => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        )}
                      </TableCell>
                    </>
                  )}

                  {/* RENDERIZAÇÃO: AQUISIÇÃO */}
                  {isAquisicao && (
                    <>
                      <TableCell className="pl-4 py-1 text-[10px] font-mono font-bold text-slate-400">{row.id}</TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.data || ''} onChange={(e: any) => onUpdateItem?.(row.id, { data: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.adquirente || ''} bold color="text-slate-700" onChange={(e: any) => onUpdateItem?.(row.id, { adquirente: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.observacao || ''} onChange={(e: any) => onUpdateItem?.(row.id, { observacao: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.status || ''} bold onChange={(e: any) => onUpdateItem?.(row.id, { status: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1 pr-6"><CellInput type="number" align="right" bold color="text-indigo-600" val={row.valor || 0} onChange={(e: any) => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0 })} /></TableCell>
                    </>
                  )}

                  {/* RENDERIZAÇÃO: IMEI */}
                  {isImei && (
                    <>
                      <TableCell className="pl-4 py-1"><CellInput val={row.dist || ''} bold color="text-slate-700" onChange={(e: any) => onUpdateItem?.(row.id, { dist: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.data || ''} onChange={(e: any) => onUpdateItem?.(row.id, { data: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.origem || ''} bold onChange={(e: any) => onUpdateItem?.(row.id, { origem: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.usuarioDestino || ''} onChange={(e: any) => onUpdateItem?.(row.id, { usuarioDestino: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput type="number" align="right" bold color="text-emerald-600" val={row.credito || 0} onChange={(e: any) => onUpdateItem?.(row.id, { credito: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="px-2 py-1 pr-6"><CellInput type="number" align="right" bold color="text-rose-600" val={row.debito || 0} onChange={(e: any) => onUpdateItem?.(row.id, { debito: parseFloat(e.target.value) || 0 })} /></TableCell>
                    </>
                  )}

                  {/* RENDERIZAÇÃO: LEGADO */}
                  {isLegado && (
                    <>
                      <TableCell className="pl-4 py-1 text-[10px] font-mono font-bold text-slate-400">{row.id}</TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.data || ''} onChange={(e: any) => onUpdateItem?.(row.id, { data: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput val={row.plataforma || ''} bold onChange={(e: any) => onUpdateItem?.(row.id, { plataforma: e.target.value })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput type="number" align="right" val={row.disponivel || 0} onChange={(e: any) => onUpdateItem?.(row.id, { disponivel: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput type="number" align="right" bold color="text-amber-600" val={row.reservado || 0} onChange={(e: any) => onUpdateItem?.(row.id, { reservado: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="px-2 py-1"><CellInput type="number" align="right" bold color="text-slate-600" val={row.bloqueado || 0} onChange={(e: any) => onUpdateItem?.(row.id, { bloqueado: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="px-2 py-1 pr-6"><CellInput type="number" align="right" bold color="text-emerald-600" val={row.aposentado || 0} onChange={(e: any) => onUpdateItem?.(row.id, { aposentado: parseFloat(e.target.value) || 0 })} /></TableCell>
                    </>
                  )}

                  {/* BOTÃO DE DELETAR (MÓDULO DE EDIÇÃO) */}
                  {isEditing && (
                    <TableCell className="w-[40px] px-2 py-1 text-center">
                      <button onClick={() => onRemove?.(row.id)} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  )}

                </TableRow>
              );})
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function PropDetail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50/80">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={cn("text-[11px] font-black uppercase", highlight ? "text-emerald-600" : "text-slate-800")}>{value}</span>
    </div>
  );
}