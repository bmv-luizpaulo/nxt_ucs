import { Pedido } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Clock, Link as LinkIcon } from "lucide-react";

export function AuditOverview({ orders }: { orders: Pedido[] }) {
  const total = orders.length;
  const withLink = orders.filter(o => o.linkNxt).length;
  const pending = orders.filter(o => !o.auditado).length;
  const critical = orders.filter(o => o.status === 'erro').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pedidos</p>
              <p className="text-3xl font-black text-slate-900">{total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Blockchain NXT</p>
              <p className="text-3xl font-black text-slate-900">{withLink}</p>
            </div>
            <LinkIcon className="w-8 h-8 text-primary opacity-20" />
          </div>
          <p className="text-[9px] mt-2 text-slate-400 font-bold uppercase italic">
            {((withLink / (total || 1)) * 100).toFixed(1)}% de Cobertura
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Aguardando Auditoria</p>
              <p className="text-3xl font-black text-slate-900">{pending}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500 opacity-20" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Inconsistências</p>
              <p className="text-3xl font-black text-slate-900">{critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-rose-500 opacity-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
