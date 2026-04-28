"use client"

import { useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc } from "firebase/firestore";
import { Fazenda, EntidadeSaldo } from "@/lib/types";

export function useNucleoLogic(nucleoName: string) {
  const firestore = useFirestore();
  const decodedName = decodeURIComponent(nucleoName);

  // 1. Mapa de CNPJs por Núcleo (conforme fornecido pelo usuário)
  const nucleoMap: Record<string, string> = {
    "ARINOS MATA VIVA": "11.952.411/0001-01",
    "MADEIRA MATA VIVA": "12.741.679/0001-59",
    "TELES PIRES MATA VIVA": "11.271.788/0001-97",
    "XINGU MATA VIVA": "10.175.886/0001-68"
  };

  const associationCnpj = nucleoMap[decodedName] || "";
  const associationDocId = `ASSOC_${associationCnpj.replace(/\D/g, '')}`;

  // 2. Busca a Conta Oficial da Associação
  const associationRef = useMemo(() => 
    firestore && associationCnpj ? doc(firestore, "produtores", associationDocId) : null, 
    [firestore, associationDocId]
  );
  const { data: associationAccount, isLoading: isAssocLoading } = useDoc<EntidadeSaldo>(associationRef);

  // 3. Busca todas as fazendas vinculadas a este núcleo
  const fazendasQuery = useMemoFirebase(() => {
    if (!firestore || !nucleoName) return null;
    return query(
      collection(firestore, "fazendas"), 
      where("nucleo", "==", decodedName),
      orderBy("nome", "asc")
    );
  }, [firestore, decodedName]);

  const { data: fazendas, isLoading: isFazendasLoading } = useCollection<Fazenda>(fazendasQuery);

  // 4. Busca os registros de auditoria das propriedades (IDF) para consolidar saldos
  const auditRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !nucleoName) return null;
    return query(
      collection(firestore, "produtores"), 
      where("nucleo", "==", decodedName)
    );
  }, [firestore, decodedName]);

  const { data: auditRecords, isLoading: isAuditLoading } = useCollection<EntidadeSaldo>(auditRecordsQuery);

  // 5. Consolida os dados por Fazenda/Safra
  const consolidatedRows = useMemo(() => {
    if (!fazendas || !auditRecords) return [];

    return fazendas.map(f => {
      const audit = auditRecords.find(a => a.idf === f.idf || a.id === f.idf);
      return {
        id: f.id,
        idf: f.idf,
        nome: f.nome,
        totalOrig: audit?.originacao || f.ucs || 0,
        particionadoAssoc: audit?.associacaoSaldo || 0,
        safra: audit?.safra || f.safra || '---',
        proprietarios: f.proprietarios || [],
        status: audit?.statusAuditoriaSaldo || 'pendente'
      };
    });
  }, [fazendas, auditRecords]);

  // 6. Métricas do Núcleo
  const stats = useMemo(() => {
    const calculatedSum = consolidatedRows.reduce((acc, curr) => acc + curr.particionadoAssoc, 0);
    return {
      totalContas: consolidatedRows.length,
      totalOrig: consolidatedRows.reduce((acc, curr) => acc + curr.totalOrig, 0),
      totalSaldoEntidade: associationAccount?.saldoFinalAtual || calculatedSum,
      calculatedPartitioned: calculatedSum,
      associationCnpj,
      associationAccount,
      pendentes: consolidatedRows.filter(r => r.status === 'pendente').length
    };
  }, [consolidatedRows, associationAccount, associationCnpj]);

  return {
    rows: consolidatedRows,
    stats,
    isLoading: isFazendasLoading || isAuditLoading || isAssocLoading,
    nucleoName: decodedName,
    associationDocId
  };
}
