"use client"

import { Sidebar } from "@/components/layout/Sidebar";
import { EntitiesRegistry } from "@/components/produtores/EntitiesRegistry";
import { Users } from "lucide-react";

export default function ProdutoresPage() {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <EntitiesRegistry 
        type="produtores"
        title="Painel de Produtores"
        subtitle="Gestão de proprietários e áreas de preservação"
        icon={<Users className="w-8 h-8" />}
        gradient="from-emerald-500 to-emerald-700"
      />
    </div>
  );
}