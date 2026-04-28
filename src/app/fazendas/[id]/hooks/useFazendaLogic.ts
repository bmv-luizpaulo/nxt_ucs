"use client"

import { useMemo } from "react";
import { useDoc, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, or } from "firebase/firestore";
import { Fazenda, EntidadeSaldo } from "@/lib/types";

export function useFazendaLogic(id: string) {
  const firestore = useFirestore();

  // 1. Busca os dados base da fazenda
  const fazendaRef = useMemo(() => 
    firestore ? doc(firestore, "fazendas", id) : null, 
    [firestore, id]
  );
  
  const { data: fazenda, isLoading: isFazendaLoading } = useDoc<Fazenda>(fazendaRef);

  // 2. Busca registros de auditoria de safra vinculados (IDF ou Nome)
  const auditQuery = useMemoFirebase(() => {
    if (!firestore || !fazenda) return null;
    
    const rawIdf = fazenda.idf?.toString().trim() || "";
    const cleanIdf = rawIdf.replace(/^0+/, '');
    const cleanNome = (fazenda.nome || "").toString().trim();
    
    return query(
      collection(firestore, "safras_registros"), 
      or(
        where("idf", "==", rawIdf), 
        where("idf", "==", cleanIdf),
        where("propriedade", "==", cleanNome)
      )
    );
  }, [firestore, fazenda]);

  const { data: auditRecords, isLoading: isAuditLoading } = useCollection<EntidadeSaldo>(auditQuery);

  // 3. Consolida os dados (Fato x Auditoria)
  const consolidatedAudit = useMemo(() => {
    if (!auditRecords || auditRecords.length === 0) return null;
    // Retorna o registro mais recente ou o primeiro encontrado
    return auditRecords[0];
  }, [auditRecords]);

  return {
    fazenda,
    audit: consolidatedAudit,
    isLoading: isFazendaLoading || isAuditLoading,
    isEmpty: !isFazendaLoading && !fazenda
  };
}
