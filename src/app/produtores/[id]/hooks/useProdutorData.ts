import { useMemo } from "react";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Fazenda } from "@/lib/types";

function buildProdutores(fazendas: Fazenda[], safras: any[]): any[] {
  const map: Record<string, any> = {};
  for (const fazenda of fazendas) {
    const safraInfo = safras.find(s => s.fazendaId === fazenda.id || s.idf === fazenda.idf);

    for (const prop of fazenda.proprietarios || []) {
      const key = (prop.documento || prop.nome || "").replace(/[^\d]/g, '') || prop.nome;
      if (!key) continue;

      const areaProdutor = ((fazenda.areaTotal || 0) * (prop.percentual || 100)) / 100;
      if (!map[key]) {
        map[key] = {
          documento: prop.documento,
          id: key,
          nome: prop.nome?.trim() || prop.razaoSocial || prop.nomeResponsavel || "Sem Nome",
          tipo: prop.tipo || 'PF',
          fazendas: [],
          totalFazendas: 0,
          totalAreaHa: 0,
        };
      }
      const rawOrig = safraInfo?.originacao || safraInfo?.ucsTotal || fazenda.saldoOriginacao || fazenda.ucs || 0;
      const farmOrig = (rawOrig * (prop.percentual || 100)) / 100;
      map[key].fazendas.push({
        fazendaId: fazenda.id,
        fazendaNome: fazenda.nome,
        idf: fazenda.idf,
        nucleo: fazenda.nucleo,
        municipio: fazenda.municipio,
        uf: fazenda.uf,
        areaTotal: fazenda.areaTotal || 0,
        percentual: prop.percentual || 100,
        areaProdutor,
        saldoOriginacao: farmOrig,
        safraReferencia: safraInfo?.safra ? `Safra ${safraInfo.safra}` : (fazenda.safraReferencia || fazenda.safra || '---'),
      });
      map[key].totalFazendas++;
      map[key].totalAreaHa += areaProdutor;
      if (!map[key].baseOriginacao) map[key].baseOriginacao = 0;
      map[key].baseOriginacao += farmOrig;
    }
  }
  return Object.values(map);
}

export function useProdutorData(id: string) {
  const firestore = useFirestore();
  const { user } = useUser();

  const auditorRef = useMemo(() =>
    user && firestore ? doc(firestore, "users", user.uid) : null,
    [user, firestore]
  );
  const { data: userData } = useDoc<any>(auditorRef);

  const fazendasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "fazendas"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const safrasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "safras_registros"));
  }, [firestore, user]);

  const { data: fazendas, isLoading: isFazendasLoading } = useCollection<Fazenda>(fazendasQuery);
  const { data: safras } = useCollection<any>(safrasQuery);

  const walletId = useMemo(() => id?.replace(/\D/g, ''), [id]);
  
  const entityRef = useMemo(() =>
    firestore && walletId ? doc(firestore, "produtores", walletId) : null,
    [firestore, walletId]
  );
  
  const { data: entityDataPlain, isLoading: isPlainLoading } = useDoc<any>(entityRef);
  const { data: entityDataFormatted, isLoading: isFormattedLoading } = useDoc<any>(useMemo(() => 
    firestore && id ? doc(firestore, "produtores", id) : null, 
    [firestore, id]
  ));

  const entityData = entityDataPlain || entityDataFormatted;

  const produtor = useMemo(() => {
    if (!fazendas || !safras || !id) return null;
    const all = buildProdutores(fazendas, safras);
    const cleanId = id.replace(/\D/g, '');
    const found = all.find(p => p.id === cleanId || p.documento === id);
    
    if (found) return found;

    // Fallback para quando temos o dado na coleção 'produtores' mas sem fazendas vinculadas
    if (entityData) {
      return {
        documento: entityData.documento || id,
        id: (entityData.documento || id).replace(/\D/g, ''),
        nome: entityData.nome?.trim() || entityData.razaoSocial || entityData.nomeResponsavel || "Sem Nome",
        tipo: entityData.tipo || 'PF',
        fazendas: [],
        totalFazendas: 0,
        totalAreaHa: 0,
        baseOriginacao: 0,
        isExternal: true
      };
    }

    return null;
  }, [fazendas, safras, id, entityData]);

  const isWalletLoading = (isPlainLoading || isFormattedLoading) && !entityData;

  return {
    produtor,
    entityData,
    userData,
    user,
    isLoading: isFazendasLoading || isWalletLoading,
    entityRef
  };
}
