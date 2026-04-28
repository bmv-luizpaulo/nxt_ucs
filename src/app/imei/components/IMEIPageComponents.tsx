"use client"

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ShieldCheck, ArrowUpRight, ArrowDownRight, 
  Layers, Wallet, Receipt, History
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- SUMMARY CARD ---
interface SummaryProps {
  label: string;
  value: number;
  icon: any;
  subtext: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function IMEISummaryCard({ label, value, icon: Icon, subtext, trend }: SummaryProps) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4 });
  
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
           <Badge className={cn(
             "border-none text-[8px] font-black uppercase px-2 py-0.5",
             trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
           )}>
             {trend === 'up' ? "Entrada" : "Saída"}
           </Badge>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-[22px] font-black text-slate-900 tracking-tight font-mono">{format(value)}</h3>
        <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{subtext}</p>
      </div>
    </div>
  );
}

// --- PARTITION TABLE ---
export function IMEIPartitionTable({ data }: { data: any[] }) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4 });

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
           <Layers className="w-5 h-5 text-indigo-600" />
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Histórico de Particionamento (1/3)</h3>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 h-14 border-slate-100">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-10">Safra / Referência</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Oringinação (UCS)</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Produtor (33,33%)</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Associação (33,33%)</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-indigo-600 text-right">IMEI (Absorvedor)</TableHead>
            <TableHead className="text-right pr-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
             <TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-400 text-[10px] font-black uppercase">Nenhum registro de safra</TableCell></TableRow>
          ) : (
            data.map((item, idx) => (
              <TableRow key={idx} className="h-16 group hover:bg-slate-50/50 transition-colors">
                <TableCell className="pl-10 font-black text-[12px] text-slate-900">{item.safra}</TableCell>
                <TableCell className="text-right font-mono text-[13px] text-slate-400">{format(item.total)}</TableCell>
                <TableCell className="text-right font-mono text-[13px] text-slate-600">{format(item.produtor)}</TableCell>
                <TableCell className="text-right font-mono text-[13px] text-slate-600">{format(item.associacao)}</TableCell>
                <TableCell className="text-right font-mono text-[14px] font-black text-indigo-600 bg-indigo-50/20">{format(item.imei)}</TableCell>
                <TableCell className="text-right pr-10">
                   <ShieldCheck className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// --- TRANSACTION TABLE ---
export function IMEITransactionTable({ data }: { data: any[] }) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4 });

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
           <Receipt className="w-5 h-5 text-slate-900" />
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Extrato de Movimentações IMEI</h3>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 h-14 border-slate-100">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-10">Data</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo / Justificativa</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Origem / Destino</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Valor UCS</TableHead>
            <TableHead className="text-right pr-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
             <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-400 text-[10px] font-black uppercase">Sem movimentações recentes</TableCell></TableRow>
          ) : (
            data.map((tx, idx) => (
              <TableRow key={idx} className="h-16 group hover:bg-slate-50/50 transition-colors">
                <TableCell className="pl-10 text-[11px] font-bold text-slate-400">{new Date(tx.timestamp).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                   <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase text-slate-900">{tx.tipo}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[250px]">{tx.justificativa}</span>
                   </div>
                </TableCell>
                <TableCell className="text-[11px] font-mono text-slate-500">{tx.origem || '---'} → {tx.destino || '---'}</TableCell>
                <TableCell className={cn(
                  "text-right font-black text-[14px]",
                  tx.tipo === 'entrada' ? "text-emerald-600" : "text-red-500"
                )}>
                  {tx.tipo === 'entrada' ? '+' : '-'}{format(tx.valor)}
                </TableCell>
                <TableCell className="text-right pr-10">
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                      <History className="w-3.5 h-3.5 text-slate-300" />
                   </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
