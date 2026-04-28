"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { 
  Database, ShieldCheck, Loader2, Table, MapIcon, Users, 
  Building2, Calculator, FileSpreadsheet, AlertCircle,
  Search, CheckCircle2, XCircle, Info, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc, getDocs, query, where, increment } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SafraBulkImportProps {
  targetSafra?: string;
  onComplete?: () => void;
}

export function SafraBulkImport({ targetSafra, onComplete }: SafraBulkImportProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Registro de entidades p/ enriquecimento (Cache)
  const [registry, setRegistry] = useState<{farms: Map<string, any>, entities: Map<string, string>}>({
    farms: new Map(),
    entities: new Map()
  });

  // Carrega cruzamento de dados ao montar
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const farmsSnap = await getDocs(collection(db, "fazendas"));
        const farmsMap = new Map();
        farmsSnap.forEach(doc => {
          const data = doc.data();
          if (data.idf) farmsMap.set(data.idf.toString().trim(), data);
        });

        const entitiesSnap = await getDocs(collection(db, "entidades"));
        const entitiesMap = new Map();
        entitiesSnap.forEach(doc => {
          const data = doc.data();
          if (data.documento) entitiesMap.set(data.documento.replace(/\D/g, ''), data.nome);
        });

        setRegistry({ farms: farmsMap, entities: entitiesMap });
      } catch (error) {
        console.error("Erro ao carregar registros:", error);
      }
    };
    if (db) loadRegistry();
  }, [db]);

  const normalize = (text: string) => text?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";
  
  const isDoc = (val: string) => {
    const clean = val.replace(/\D/g, '');
    return clean.length === 11 || clean.length === 14;
  };

  const processData = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Detectar delimitador de forma agressiva
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',') && !firstLine.includes('\t')) delimiter = ',';

    const colsFirst = firstLine.split(delimiter).map(c => c.trim());
    
    // Se a primeira linha tiver muitos números/docs, provavelmente NÃO é cabeçalho
    const hasHeader = !colsFirst.some(c => isDoc(c) || /^\d{7,}$/.test(c));
    
    let mapping: any = {};
    if (hasHeader) {
      const normHeaders = colsFirst.map(normalize);
      const findIdx = (keywords: string[]) => normHeaders.findIndex(h => keywords.some(k => h.includes(normalize(k))));
      
      mapping = {
        idf: findIdx(['idf']),
        pNome: findIdx(['produtor', 'titular', 'nome']),
        pDoc: findIdx(['cpf', 'cnpj', 'documento']),
        ucs: findIdx(['ucs', 'area total', 'volume']), // Se não tiver UCS, usa Área Total como volume
        isin: findIdx(['isin']),
        fazenda: findIdx(['fazenda', 'propriedade']),
        nucleo: findIdx(['nucleo', 'associacao'])
      };
      setHeaders(colsFirst);
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsedData = dataLines.map(line => {
      const cols = line.split(delimiter).map(c => c.trim());
      if (cols.length < 2) return null;

      // LÓGICA DE DETECÇÃO INTELIGENTE (Caso o mapeamento falhe ou não tenha cabeçalho)
      let idf = hasHeader && mapping.idf !== -1 ? cols[mapping.idf] : cols.find(c => /^\d{10,11}$/.test(c)) || cols[1];
      let pDoc = hasHeader && mapping.pDoc !== -1 ? cols[mapping.pDoc] : cols.find(c => isDoc(c)) || "";
      let pNome = hasHeader && mapping.pNome !== -1 ? cols[mapping.pNome] : cols.find(c => c.length > 5 && !isDoc(c) && !/\d/.test(c)) || "";
      
      // Limpeza
      pDoc = pDoc.replace(/\D/g, '');
      idf = idf?.toString().trim();

      // Cruzamento com Banco de Dados (Prioridade Absoluta)
      const farmDb = registry.farms.get(idf);
      const entityDb = registry.entities.get(pDoc);

      const ucsVal = hasHeader && mapping.ucs !== -1 ? cols[mapping.ucs] : cols.find(c => /^\d+([.,]\d+)?$/.test(c) && c.length < 10);
      const parseNum = (val: any) => parseFloat(val?.toString().replace(/\./g, '').replace(',', '.')) || 0;

      return {
        idf,
        isin: (hasHeader && mapping.isin !== -1 ? cols[mapping.isin] : farmDb?.isin) || "---",
        fazenda: farmDb?.nome || (hasHeader && mapping.fazenda !== -1 ? cols[mapping.fazenda] : "") || `IDF ${idf}`,
        nucleo: farmDb?.nucleo || (hasHeader && mapping.nucleo !== -1 ? cols[mapping.nucleo] : ""),
        ucsTotal: parseNum(ucsVal),
        pNome: entityDb || pNome || "Produtor não identificado",
        pDoc: pDoc,
        pSaldo: parseNum(ucsVal) / 3, // Rateio padrão caso não seja 14 colunas
        aNome: farmDb?.nucleo || "Associação",
        aSaldo: parseNum(ucsVal) / 3,
        iNome: "IMEI CONSULTORIA",
        iSaldo: parseNum(ucsVal) / 3,
      };
    }).filter(d => d !== null && d.idf);

    setPreview(parsedData);
    setRawText(text.substring(0, 1000));
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setLoading(true);
    const safraId = targetSafra || "2010";

    try {
      const batch = writeBatch(db);
      const auditRef = collection(db, "safras", safraId, "originacao");

      preview.forEach(d => {
        // 1. Registro Mestre de Auditoria (Apenas a Fazenda/IDF)
        const farmRef = doc(auditRef, `F-${d.idf}-${safraId}`);
        batch.set(farmRef, {
          idf: d.idf,
          isin: d.isin,
          entidade: d.fazenda, // Padronização p/ ordenação
          fazenda: d.fazenda,
          nucleo: d.nucleo,
          originacao: d.ucsTotal,
          isAuditRecord: true, // Principal para o dashboard
          categoria: "fazenda",
          status: "auditado",
          updatedAt: new Date().toISOString()
        });

        // 2. Registros de Partilha (Produtor, Associação e IMEI)
        // Usamos tags claras para que o sistema de filtros ignore esses registros na listagem de fazendas
        const pRef = doc(auditRef, `P-${d.idf}-${safraId}`);
        batch.set(pRef, { 
          entidade: d.pNome, 
          documento: d.pDoc, 
          originacao: d.pSaldo, 
          tipo: "produtor", 
          idfOrigem: d.idf,
          isAuditRecord: false,
          categoria: "participante" 
        });
        
        const aRef = doc(auditRef, `A-${d.idf}-${safraId}`);
        batch.set(aRef, { 
          entidade: d.nucleo || d.aNome, 
          originacao: d.aSaldo, 
          tipo: "associacao", 
          idfOrigem: d.idf,
          isAuditRecord: false,
          categoria: "participante"
        });

        const iRef = doc(auditRef, `I-${d.idf}-${safraId}`);
        batch.set(iRef, { 
          entidade: "IMEI CONSULTORIA", 
          originacao: d.iSaldo, 
          tipo: "imei", 
          idfOrigem: d.idf,
          isAuditRecord: false,
          categoria: "participante"
        });
      });

      // Atualizar Totais da Safra
      const totalUCS = preview.reduce((acc, curr) => acc + curr.ucsTotal, 0);
      const mainSafraRef = doc(db, "safras", safraId);
      batch.set(mainSafraRef, {
        id: safraId,
        totalUCS: increment(totalUCS),
        totalFazendas: increment(preview.length),
        updatedAt: new Date().toISOString(),
        status: "auditada"
      }, { merge: true });

      await batch.commit();
      toast({ title: "Sucesso!", description: "Safra importada com rastreabilidade total." });
      onComplete?.();
    } catch (error) {
       toast({ title: "Erro na Importação", description: "Falha ao salvar registros.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-xl">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Central de Auditoria Técnica</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Safra Alvo: {targetSafra}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setPreview([])} className="h-14 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400">Limpar</Button>
          <Button 
            onClick={handleImport}
            disabled={loading || !preview.length}
            className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest gap-3 shadow-xl transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Confirmar e Importar
          </Button>
        </div>
      </div>

      {!preview.length ? (
        <div className="flex flex-col items-center justify-center p-32 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 text-center space-y-8">
           <div className="w-32 h-32 rounded-[3.5rem] bg-white shadow-2xl flex items-center justify-center text-emerald-500 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="w-16 h-16" />
           </div>
           <div className="space-y-4">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Carga de Originação</h3>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
                Arraste os dados ou selecione sua planilha de safra. <br/>
                O motor de busca identificará IDF, Documentos e Nomes automaticamente.
              </p>
           </div>
           <Button onClick={() => fileInputRef.current?.click()} className="h-16 px-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase text-xs tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-2xl">
              Selecionar Planilha
           </Button>
           <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.csv,.tsv" onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
               const reader = new FileReader();
               reader.onload = (e) => processData(e.target?.result as string);
               reader.readAsText(file);
             }
           }} />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-8 animate-in fade-in">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-8 shadow-2xl">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Carga Identificada</p>
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Fazendas</p>
                    <p className="text-2xl font-black">{preview.length}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Total UCS</p>
                    <p className="text-2xl font-black text-emerald-400">{preview.reduce((acc, c) => acc + c.ucsTotal, 0).toLocaleString('pt-BR')}</p>
                 </div>
              </div>
              <div className="pt-8 border-t border-slate-800 flex items-center gap-3">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Cruzamento com Banco Ativo</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-[3rem] p-8 border border-blue-100 flex gap-4">
               <Info className="w-6 h-6 text-blue-500 shrink-0" />
               <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed">
                 O sistema identificou uma planilha de {headers.length || 'Dados Diretos'} colunas. Os produtores foram mapeados pelo documento (CPF/CNPJ).
               </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
               <ScrollArea className="flex-1">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="text-left py-6 px-8 text-[9px] font-black uppercase text-slate-400 tracking-widest">Recorte / IDF</th>
                        <th className="text-left py-6 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Produtor (Auditor)</th>
                        <th className="text-center py-6 px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Documento</th>
                        <th className="text-right py-6 px-8 text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Gênese</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {preview.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-6 px-8">
                            <span className="font-black text-xs text-slate-800 uppercase block">{d.fazenda}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">IDF: {d.idf} / {d.isin}</span>
                          </td>
                          <td className="py-6 px-4">
                            <span className="font-black text-[11px] text-slate-700 uppercase block">{d.pNome}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{d.nucleo}</span>
                          </td>
                          <td className="py-6 px-4 text-center">
                            <Badge variant="outline" className="text-[10px] font-mono text-slate-500 border-slate-200 bg-slate-50 px-3 py-1">
                               {d.pDoc || "SEM DOCUMENTO"}
                            </Badge>
                          </td>
                          <td className="py-6 px-8 text-right font-mono text-sm font-black text-slate-900">
                             {d.ucsTotal.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </ScrollArea>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}