import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/lib/types";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

export function StatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'ok':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/50 flex items-center gap-1.5 py-1 px-3 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          <span className="font-bold text-[9px] tracking-widest">VÁLIDO</span>
        </Badge>
      );
    case 'pendente':
      return (
        <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-amber-500/50 flex items-center gap-1.5 py-1 px-3 rounded-full">
          <Clock className="w-3 h-3" />
          <span className="font-bold text-[9px] tracking-widest">PENDENTE</span>
        </Badge>
      );
    case 'erro':
      return (
        <Badge className="bg-rose-500/15 text-rose-500 hover:bg-rose-500/20 border-rose-500/50 flex items-center gap-1.5 py-1 px-3 rounded-full">
           <AlertCircle className="w-3 h-3" />
           <span className="font-bold text-[9px] tracking-widest">INCONSISTENTE</span>
        </Badge>
      );
    default:
      return <Badge variant="outline" className="rounded-full text-[9px] font-bold uppercase">{status}</Badge>;
  }
}