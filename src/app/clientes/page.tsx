"use client"

import { Sidebar } from "@/components/layout/Sidebar";
import { EntitiesRegistry } from "@/components/produtores/EntitiesRegistry";
import { Sparkles } from "lucide-react";

export default function ClientesPage() {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <EntitiesRegistry 
        type="clientes"
        title="Painel de Clientes"
        subtitle="Gestão de compradores e custódia de UCs"
        icon={<Sparkles className="w-8 h-8" />}
        gradient="from-teal-500 to-teal-700"
      />
    </div>
  );
}
