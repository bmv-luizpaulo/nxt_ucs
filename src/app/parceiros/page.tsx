"use client"

import { Sidebar } from "@/components/layout/Sidebar";
import { EntitiesRegistry } from "@/components/produtores/EntitiesRegistry";
import { Building2 } from "lucide-react";

export default function ParceirosPage() {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <EntitiesRegistry 
        type="parceiros"
        title="Painel de Parceiros"
        subtitle="Gestão de agentes técnicos e canais de distribuição"
        icon={<Building2 className="w-8 h-8" />}
        gradient="from-indigo-500 to-indigo-700"
      />
    </div>
  );
}
