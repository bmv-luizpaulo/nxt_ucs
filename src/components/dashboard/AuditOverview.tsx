import { Pedido } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Clock, Link as LinkIcon, ShieldCheck } from "lucide-react";

export function AuditOverview({ orders }: { orders: Pedido[] }) {
   const total = orders.length;
   const auditados = orders.filter(o => o.linkNxt && o.linkNxt.trim() !== '').length;
   const pendentes = orders.filter(o => !o.linkNxt || o.linkNxt.trim() === '').length;
   const inconsistencias = orders.filter(o => o.status === 'erro').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-slate-400">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total de Registros</p>
              <p className="text-3xl font-black text-slate-900">{total}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-slate-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auditados NXT</p>
              <p className="text-3xl font-black text-slate-900">{auditados}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-[9px] mt-2 text-emerald-600 font-bold uppercase italic">
            {((auditados / (total || 1)) * 100).toFixed(1)}% de Cobertura
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-amber-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pendentes de Link</p>
              <p className="text-3xl font-black text-slate-900">{pendentes}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-rose-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inconsistências</p>
              <p className="text-3xl font-black text-slate-900">{inconsistencias}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
