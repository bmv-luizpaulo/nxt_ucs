"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddSafraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSafraDialog({ open, onOpenChange }: AddSafraDialogProps) {
  const [year, setYear] = useState("");
  const router = useRouter();

  const handleCreate = () => {
    if (!year) return;
    onOpenChange(false);
    // Redireciona para a página da safra, onde o usuário poderá importar os dados
    router.push(`/safras/${year}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-[2.5rem] p-10 border-none shadow-2xl">
        <DialogHeader className="items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Nova Safra de Originação</DialogTitle>
          <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest px-10">
            Informe o ciclo anual para iniciar o registro técnico de ativos ambientais.
          </DialogDescription>
        </DialogHeader>

        <div className="py-10 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Ano da Safra (Ex: 2010)</label>
            <Input 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Digite o ano..."
              className="h-16 rounded-2xl bg-slate-50 border-none px-6 font-black text-lg focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button 
            onClick={handleCreate}
            disabled={!year}
            className="w-full h-16 rounded-2xl bg-[#0B0F1A] hover:bg-[#161B2E] text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 group"
          >
            <Rocket className="w-4 h-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            CONFIGURAR SAFRA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
