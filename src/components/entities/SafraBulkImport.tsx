"use client"

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Layers, CheckCircle2, FileSpreadsheet, AlertCircle, ChevronDown, ChevronRight, Leaf, MapPin, Users2, Cpu, User, Loader2, Send, Calculator } from "lucide-react";
import { EntidadeSaldo } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";
import { collection, doc, getDocs, writeBatch, increment, arrayUnion } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

interface SafraBulkImportProps {
  onImport?: (data: any[]) => void;
  safraId: string;
}

// Tipo para um registro parseado da planilha
interface SafraRecord {
  id: string;
  safra: string;
  dataRegistro: string;
  idf: string;
  areaTotal: number;
  areaVegetacao: number;
  propriedade: string;
  nucleo: string;
  lat: string;
  long: string;
  originacao: number;
  originacaoFazendaTotal?: number;
  isin: string;
  hashOriginacao: string;
  nome: string;       // Produtor
  documento: string;  // CNPJ ou CPF
  cpf: string;
  cnpj: string;
  particionamento: number;
  saldoParticionado: number;
  associacaoNome: string;
  associacaoCnpj: string;
  associacaoParticionamento: number;
  imeiNome: string;
  imeiCnpj: string;
  imeiParticionamento: number;
  saldoFinalAtual: number;    // Saldo do Produtor (Particionado)
  associacaoSaldo: number;    // Saldo da Associação (Particionado)
  imeiSaldo: number;          // Saldo da IMEI (Particionado)
  // Campos de compatibilidade
  movimentacao: number;
  aposentado: number;
  bloqueado: number;
  aquisicao: number;
  saldoAjustarImei: number;
  saldoLegadoTotal: number;
  status: string;
  createdAt: string;
  isSimplified?: boolean;
}

// Mapeamento de colunas da planilha (25 campos)
const COLUMN_MAP = [
  { label: 'Safra', type: 'text' },               // 0
  { label: 'Data', type: 'text' },                // 1
  { label: 'IDF', type: 'text' },                 // 2
  { label: 'Área Total', type: 'number' },        // 3
  { label: 'Área Veg.', type: 'number' },         // 4
  { label: 'Fazenda', type: 'text' },             // 5
  { label: 'Núcleo', type: 'text' },              // 6
  { label: 'Lat', type: 'text' },                 // 7
  { label: 'Long', type: 'text' },                // 8
  { label: 'UCS Farm', type: 'number' },          // 9
  { label: 'ISIN', type: 'text' },                // 10
  { label: 'Hash', type: 'text' },                // 11
  { label: 'Produtor', type: 'text' },            // 12
  { label: 'CNPJ', type: 'text' },                // 13
  { label: 'CPF', type: 'text' },                 // 14
  { label: 'Part. %', type: 'number' },           // 15
  { label: 'Saldo Part.', type: 'number' },       // 16
  { label: 'Assoc. Nome', type: 'text' },         // 17
  { label: 'Assoc. CNPJ', type: 'text' },         // 18
  { label: 'Assoc. %', type: 'number' },          // 19
  { label: 'IMEI CNPJ', type: 'text' },           // 20
  { label: 'IMEI Nome', type: 'text' },           // 21
  { label: 'Saldo Prod.', type: 'number' },       // 22
  { label: 'Saldo Assoc.', type: 'number' },      // 23
  { label: 'Saldo IMEI', type: 'number' },       // 24
];
// Novo Mapeamento Auditoria Técnica (14 colunas)
const AUDIT_COLUMN_MAP = [
  { key: 'tipo',                      label: 'Tipo da Área',          type: 'text' },    // 0
  { key: 'idf',                       label: 'IDF',                   type: 'text' },    // 1
  { key: 'data',                      label: 'Data Registro',         type: 'text' },    // 2
  { key: 'areaTotal',                 label: 'Área Total',           type: 'number' },  // 3
  { key: 'areaVeg',                   label: 'Área Veg.',             type: 'number' },  // 4
  { key: 'propriedade',               label: 'Fazenda',               type: 'text' },    // 5
  { key: 'nucleo',                    label: 'Núcleo',                type: 'text' },    // 6
  { key: 'ucs',                       label: 'UCS',                   type: 'number' },  // 9 (index will be adjusted)
  { key: 'produtores',                label: 'Produtores',            type: 'text' },    // 11
];

const parseNumber = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/[^\d,.-]/g, '').trim();
  if (!clean) return 0;

  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  
  if (lastComma === -1 && lastDot === -1) return parseFloat(clean) || 0;

  const decimalIdx = Math.max(lastComma, lastDot);
  const decimalSeparator = clean[decimalIdx];
  
  // Ambiguidade Brasil: "1.000" = mil, não 1.0
  if (decimalSeparator === '.' && lastComma === -1) {
    const fractionalPart = clean.substring(decimalIdx + 1);
    if (fractionalPart.length === 3) {
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }
  }
  
  const integerPart = clean.substring(0, decimalIdx).replace(/[,.]/g, '');
  const fractionalPart = clean.substring(decimalIdx + 1);
  
  return parseFloat(`${integerPart}.${fractionalPart}`) || 0;
};

const cleanObject = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) newObj[key] = obj[key];
  });
  return newObj;
};

export function SafraBulkImport({ onImport, safraId }: SafraBulkImportProps) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<SafraRecord[]>([]);
  const [previewTab, setPreviewTab] = useState<'fazendas' | 'produtores' | 'nucleos' | 'imeis'>('fazendas');

  const parseTSV = (text: string): SafraRecord[] => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const results: SafraRecord[] = [];
    
    // Primeira linha é o cabeçalho — apenas verificamos se parece com o formato correto
    const headerLine = lines[0].toLowerCase();
    const hasHeader = headerLine.includes('safra') || headerLine.includes('produtor') || headerLine.includes('idf');
    const startIdx = hasHeader ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(/\t|\s{2,}/); // Aceita TAB ou múltiplos espaços
      if (parts.length < 2) continue;

      const get = (idx: number) => (parts[idx] || '').trim();
      const getNum = (idx: number) => parseNumber(get(idx));

      // MODO SIMPLIFICADO: IDF | UCS 
      if (parts.length >= 2 && parts.length < 5) {
        results.push({
          id: `SIMP_${get(0)}_${i}`,
          idf: get(0).replace(/^0+/, ''),
          originacao: getNum(1),
          safra: safraId || 'N/A',
          isSimplified: true,
          status: 'disponivel',
          createdAt: new Date().toISOString()
        } as any);
        continue;
      }

      // MODO AUDITORIA TÉCNICA (13-14 COLUNAS)
      if (parts.length >= 10 && parts.length < 18) {
        // Encontrar o IDF e a Data no início para garantir alinhamento
        const dateIdx = parts.findIndex(p => /^\d{2}\/\d{2}\/\d{4}/.test(p));
        
        if (dateIdx !== -1) {
          const idf = parts[dateIdx - 1]?.replace(/^0+/, '') || "";
          const prop = parts[dateIdx + 3] || "";
          const nuc = parts[dateIdx + 4] || "";
          const ucsVal = parseNumber(parts[dateIdx + 7]);
          const prod = parts[dateIdx + 9] || "";
          const cnpj = parts[dateIdx + 10] || "";
          const cpf = parts[dateIdx + 11] || "";
          const doc = (cnpj || cpf || "").trim();

          results.push({
            id: `AUDIT_${idf}_${i}`,
            safra: safraId || 'N/A',
            dataRegistro: parts[dateIdx],
            idf,
            propriedade: prop,
            nucleo: nuc,
            originacao: ucsVal,
            nome: prod,
            documento: doc,
            cnpj,
            cpf,
            isRobust: true,
            status: 'disponivel',
            createdAt: new Date().toISOString()
          } as any);
          continue;
        }
      }

      const cnpj = get(13);
      const cpf = get(14);
      const documento = cnpj || cpf || '';
      const produtor = get(12) || 'Sem Nome';
      const safra = get(0) || safraId || 'N/A';
      const propriedade = get(5);
      const idf = (get(2) || '').toString().trim().replace(/^0+/, '');
      const origFazenda = getNum(9);
      const partPct = getNum(15);
      const assocPct = getNum(19);
      
      // Calcula IMEI particionamento como o restante (100% - produtor% - associação%)
      const imeiPct = (partPct > 0 && assocPct > 0) ? Math.round((100 - partPct - assocPct) * 10000) / 10000 : 0;
      
      // Gera um ID determinístico baseado no documento + safra + IDF para evitar duplicação
      const idBase = `${documento}_${safra}_${idf || propriedade || i}`.replace(/[^\w]/g, '_');

      results.push({
        id: idBase || `SAFRA_${i}`,
        safra,
        dataRegistro: get(1),
        idf,
        areaTotal: getNum(3),
        areaVegetacao: getNum(4),
        propriedade,
        nucleo: get(6),
        lat: get(7),
        long: get(8),
        originacao: origFazenda,
        originacaoFazendaTotal: origFazenda,
        isin: get(10),
        hashOriginacao: get(11),
        nome: produtor,
        cnpj,
        cpf,
        documento,
        particionamento: partPct,
        saldoParticionado: getNum(16),
        associacaoNome: get(17),
        associacaoCnpj: get(18),
        associacaoParticionamento: assocPct,
        imeiCnpj: get(20),
        imeiNome: get(21),
        imeiParticionamento: imeiPct,
        saldoFinalAtual: getNum(22),
        associacaoSaldo: getNum(23),
        imeiSaldo: getNum(24),
        // Compatibilidade — campos zerados por padrão
        movimentacao: 0,
        aposentado: 0,
        bloqueado: 0,
        aquisicao: 0,
        saldoAjustarImei: 0,
        saldoLegadoTotal: 0,
        status: 'disponivel',
        createdAt: new Date().toISOString(),
      } as any);
    }
    return results;
  };

  useEffect(() => {
    setPreview(parseTSV(raw));
  }, [raw]);

  // Agrupamentos para preview
  const grouped = useMemo(() => {
    const fazendas = new Map<string, { nome: string; count: number; ucs: number }>();
    const produtores = new Map<string, { nome: string; doc: string; saldo: number; propriedade: string }>();
    const nucleos = new Map<string, { nome: string; count: number; saldoAssoc: number }>();
    const imeis = new Map<string, { nome: string; count: number; saldo: number }>();

    preview.forEach(r => {
      // Fazendas
      const fKey = r.propriedade || (r.isSimplified ? `IDF: ${r.idf}` : r.nome) || 'N/A';
      if (!fazendas.has(fKey)) fazendas.set(fKey, { nome: fKey, count: 0, ucs: 0 });
      const f = fazendas.get(fKey)!;
      f.count++;
      f.ucs += r.originacao;

      // Produtores
      const pKey = r.documento || r.nome;
      if (!produtores.has(pKey)) produtores.set(pKey, { nome: r.nome, doc: r.documento, saldo: 0, propriedade: r.propriedade });
      const p = produtores.get(pKey)!;
      p.saldo += r.saldoFinalAtual;

      // Núcleos
      const nKey = r.nucleo || r.associacaoNome || 'Sem Núcleo';
      if (!nucleos.has(nKey)) nucleos.set(nKey, { nome: nKey, count: 0, saldoAssoc: 0 });
      const n = nucleos.get(nKey)!;
      n.count++;
      n.saldoAssoc += r.associacaoSaldo;

      // IMEIs
      if (r.imeiNome) {
        if (!imeis.has(r.imeiNome)) imeis.set(r.imeiNome, { nome: r.imeiNome, count: 0, saldo: 0 });
        const im = imeis.get(r.imeiNome)!;
        im.count++;
        im.saldo += r.imeiSaldo;
      }
    });

    return {
      fazendas: Array.from(fazendas.values()),
      produtores: Array.from(produtores.values()),
      nucleos: Array.from(nucleos.values()),
      imeis: Array.from(imeis.values()),
    };
  }, [preview]);

  const totals = useMemo(() => ({
    ucs: preview.reduce((a, r) => a + r.originacao, 0),
    saldoProd: preview.reduce((a, r) => a + r.saldoFinalAtual, 0),
    saldoAssoc: preview.reduce((a, r) => a + r.associacaoSaldo, 0),
    saldoImei: preview.reduce((a, r) => a + r.imeiSaldo, 0),
  }), [preview]);

  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [isSafraImported, setIsSafraImported] = useState(false);
  const [isParticionamentoDone, setIsParticionamentoDone] = useState(false);

  const handleSubirSafra = async () => {
    if (preview.length === 0 || !firestore) return;
    setLoading(true);
    try {
      const fazendasMap: Record<string, any> = {};
      const fazendasByName: Record<string, any> = {};

      const fSnap = await getDocs(collection(firestore, "fazendas"));
      fSnap.forEach(doc => {
        const f = doc.data();
        if (f.idf) fazendasMap[f.idf.toString().trim().replace(/^0+/, '')] = { ...f, docId: doc.id };
        if (f.nome) fazendasByName[f.nome.toString().trim().toLowerCase()] = { ...f, docId: doc.id };
      });

      const batch = writeBatch(firestore);
      const PCT = 33.3333333 / 100;

      for (const d of preview) {
        let farm = fazendasMap[d.idf];
        if (!farm && d.propriedade) {
          farm = fazendasByName[d.propriedade.toString().trim().toLowerCase()];
        }

        const finalData: any = (d.isSimplified || (d as any).isRobust) ? {
          ...d,
          propriedade: farm?.nome || d.propriedade || "",
          idf: farm?.idf || d.idf || "",
          nucleo: farm?.nucleo || d.nucleo || "",
          nome: d.nome || farm?.proprietarios?.[0]?.nome || "",
          documento: d.documento || farm?.proprietarios?.[0]?.documento || "",
          // Particionamento Math.ceil
          saldoFinalAtual: Math.ceil(d.originacao * 0.333333333),
          associacaoNome: farm?.nucleo || d.nucleo || "",
          associacaoCnpj: farm?.nucleoCnpj || d.associacaoCnpj || "00.000.000/0001-00",
          associacaoSaldo: Math.ceil(d.originacao * 0.333333333),
          imeiNome: "INSTITUTO MATA VIVA",
          imeiCnpj: "00.000.000/0001-00",
          imeiSaldo: Math.ceil(d.originacao * 0.333333333),
          dataRegistro: d.dataRegistro || new Date().toLocaleDateString('pt-BR')
        } : d;

        const safraRef = doc(collection(firestore, "safras_registros"));
        batch.set(safraRef, cleanObject({
          ...finalData,
          importadoEm: new Date().toISOString()
        }));
      }

      await batch.commit();
      setIsSafraImported(true);
      toast({ title: "Passo 1 Concluído", description: "Safra registrada com sucesso na auditoria técnica." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro na importação" });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessarCarteiras = async () => {
    if (preview.length === 0 || !firestore) return;
    setLoading(true);
    try {
      const fazendasMap: Record<string, any> = {};
      const fazendasByName: Record<string, any> = {};

      const fSnap = await getDocs(collection(firestore, "fazendas"));
      fSnap.forEach(doc => {
        const f = doc.data();
        if (f.idf) fazendasMap[f.idf.toString().trim().replace(/^0+/, '')] = { ...f, docId: doc.id };
        if (f.nome) fazendasByName[f.nome.toString().trim().toLowerCase()] = { ...f, docId: doc.id };
      });

      const batch = writeBatch(firestore);
      const produtoresUpdates = new Map<string, {
        id: string;
        nome: string;
        documento: string;
        safra: string;
        nucleo: string;
        valorTotal: number;
        transactions: any[];
      }>();

      const PCT = 33.3333333 / 100;

      for (const d of preview) {
        let farm = fazendasMap[d.idf];
        if (!farm && d.propriedade) {
          farm = fazendasByName[d.propriedade.toString().trim().toLowerCase()];
        }

        const finalData: any = (d.isSimplified || (d as any).isRobust) ? {
          ...d,
          propriedade: farm?.nome || d.propriedade || "",
          idf: farm?.idf || d.idf || "",
          nucleo: farm?.nucleo || d.nucleo || "",
          nome: d.nome || farm?.proprietarios?.[0]?.nome || "",
          documento: d.documento || farm?.proprietarios?.[0]?.documento || "",
          // Particionamento Math.ceil
          saldoFinalAtual: Math.ceil(d.originacao * 0.333333333),
          associacaoNome: farm?.nucleo || d.nucleo || "",
          associacaoCnpj: farm?.nucleoCnpj || d.associacaoCnpj || "00.000.000/0001-00",
          associacaoSaldo: Math.ceil(d.originacao * 0.333333333),
          imeiNome: "INSTITUTO MATA VIVA",
          imeiCnpj: "00.000.000/0001-00",
          imeiSaldo: Math.ceil(d.originacao * 0.333333333),
        } : d;

        const entities = [
          { nome: finalData.nome, doc: finalData.documento, valor: finalData.saldoFinalAtual },
          { nome: finalData.associacaoNome, doc: finalData.associacaoCnpj, valor: finalData.associacaoSaldo },
          { nome: finalData.imeiNome, doc: finalData.imeiCnpj, valor: finalData.imeiSaldo }
        ].filter(e => e.doc && e.valor > 0);

        for (const ent of entities) {
          const entId = ent.doc.replace(/[^\d]/g, '');
          if (!entId) continue;

          if (!produtoresUpdates.has(entId)) {
            produtoresUpdates.set(entId, {
              id: entId,
              nome: ent.nome,
              documento: ent.doc,
              safra: finalData.safra,
              nucleo: finalData.nucleo,
              valorTotal: 0,
              transactions: []
            });
          }

          const existing = produtoresUpdates.get(entId)!;
          existing.valorTotal += ent.valor;
          existing.transactions.push({
            id: `ORIG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            data: finalData.dataRegistro || new Date().toISOString(),
            dist: finalData.propriedade,
            plataforma: finalData.safra,
            valor: ent.valor,
            statusAuditoria: 'valido'
          });
        }
      }

      produtoresUpdates.forEach((upd, entId) => {
        const entRef = doc(firestore, "produtores", entId);
        batch.set(entRef, cleanObject({
          id: upd.id,
          nome: upd.nome,
          documento: upd.documento,
          status: 'disponivel',
          safra: upd.safra || "",
          nucleo: upd.nucleo || "",
          originacao: increment(upd.valorTotal),
          saldoFinalAtual: increment(upd.valorTotal),
          tabelaOriginacao: arrayUnion(...upd.transactions.map(cleanObject)),
          updatedAt: new Date().toISOString()
        }), { merge: true });
      });

      await batch.commit();
      setIsParticionamentoDone(true);
      toast({ title: "Passo 2 Concluído", description: "Carteiras atualizadas com sucesso." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro no particionamento" });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setOpen(false);
    setRaw("");
    setPreview([]);
    setIsSafraImported(false);
    setIsParticionamentoDone(false);
    if (onImport) onImport(preview);
  };

  const formatUCS = (val: number) => (val || 0).toLocaleString('pt-BR');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-12 px-8 rounded-full border-primary/20 bg-white hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest gap-3 shadow-none transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-primary" /> IMPORTAR PLANILHA DA SAFRA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
        <div className="flex flex-col h-[90vh]">
          {/* HEADER */}
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-slate-900 font-black uppercase text-lg flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-primary" />
                </div>
                Importação de Safra {safraId ? `— ${safraId}` : ''}
              </DialogTitle>
              {preview.length > 0 && (
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-black uppercase px-4 py-2 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> {preview.length} registros detectados
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] overflow-hidden">
            {/* COLUNA ESQUERDA — Input */}
            <div className="p-6 border-r border-slate-100 flex flex-col gap-4 overflow-hidden">
              {/* Mapa de colunas esperadas */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3">
                  {preview.some(r => r.isSimplified) 
                    ? "Mapeamento Simplificado Detectado (2 campos):" 
                    : (preview[0] as any)?.isRobust 
                      ? "Mapeamento Robusto Detectado (8 campos):"
                      : "Mapeamento Completo de Colunas (25 campos):"}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {preview.some(r => r.isSimplified) ? (
                    <>
                      <div className="px-2 py-1.5 rounded-lg text-[7px] font-bold text-center uppercase tracking-wide border bg-primary/5 text-primary border-primary/10">
                        <span className="text-[6px] text-slate-300 mr-0.5">0.</span> IDF
                      </div>
                      <div className="px-2 py-1.5 rounded-lg text-[7px] font-bold text-center uppercase tracking-wide border bg-primary/5 text-primary border-primary/10">
                        <span className="text-[6px] text-slate-300 mr-0.5">1.</span> UCS
                      </div>
                    </>
                  ) : (preview[0] as any)?.isRobust ? (
                    AUDIT_COLUMN_MAP.map((col, i) => (
                      <div key={i} className="px-2 py-1.5 rounded-lg text-[7px] font-bold text-center uppercase tracking-wide border bg-primary/5 text-primary border-primary/10">
                        <span className="text-[6px] text-slate-300 mr-0.5">{i}.</span> {col.label}
                      </div>
                    ))
                  ) : (
                    COLUMN_MAP.map((col, i) => (
                      <div key={i} className={cn(
                        "px-2 py-1.5 rounded-lg text-[7px] font-bold text-center uppercase tracking-wide border",
                        col.type === 'number' 
                          ? "bg-primary/5 text-primary border-primary/10" 
                          : "bg-white text-slate-400 border-slate-100"
                      )}>
                        <span className="text-[6px] text-slate-300 mr-0.5">{i}.</span> {col.label}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Textarea 
                value={raw} 
                onChange={e => setRaw(e.target.value)} 
                placeholder="Cole aqui os dados copiados da planilha Excel (Ctrl+V)..."
                className="flex-1 font-mono text-[10px] bg-slate-50 border-slate-200 p-5 resize-none rounded-2xl focus:ring-primary shadow-inner leading-relaxed"
              />
            </div>

            {/* COLUNA DIREITA — Preview Consolidado */}
            <div className="flex flex-col overflow-hidden bg-slate-50/50">
              {preview.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-40 gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Aguardando colagem</p>
                    <p className="text-[10px] text-slate-300 mt-1">Copie os dados da planilha e cole no campo ao lado</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Dashboard de Totais */}
                  <div className="grid grid-cols-4 gap-3 p-4 pb-0">
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-teal-500" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fazendas</p>
                      </div>
                      <p className="text-xl font-black text-slate-900">{grouped.fazendas.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Produtores</p>
                      </div>
                      <p className="text-xl font-black text-slate-900">{grouped.produtores.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Users2 className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Núcleos/Assoc.</p>
                      </div>
                      <p className="text-xl font-black text-slate-900">{grouped.nucleos.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-3.5 h-3.5 text-violet-500" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">IMEIs</p>
                      </div>
                      <p className="text-xl font-black text-slate-900">{grouped.imeis.length}</p>
                    </div>
                  </div>

                  {/* Tabs de Preview */}
                  <div className="flex-1 flex flex-col overflow-hidden p-4">
                    <Tabs value={previewTab} onValueChange={v => setPreviewTab(v as any)} className="flex flex-col flex-1 overflow-hidden">
                      <TabsList className="bg-white border p-1 rounded-full h-10 gap-1 shadow-sm mb-3 w-fit">
                        <TabsTrigger value="fazendas" className="rounded-full text-[9px] font-black uppercase tracking-widest px-4 h-8 data-[state=active]:bg-teal-500 data-[state=active]:text-white gap-1.5">
                          <MapPin className="w-3 h-3" /> Fazendas
                        </TabsTrigger>
                        <TabsTrigger value="produtores" className="rounded-full text-[9px] font-black uppercase tracking-widest px-4 h-8 data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5">
                          <User className="w-3 h-3" /> Produtores
                        </TabsTrigger>
                        <TabsTrigger value="nucleos" className="rounded-full text-[9px] font-black uppercase tracking-widest px-4 h-8 data-[state=active]:bg-amber-500 data-[state=active]:text-white gap-1.5">
                          <Users2 className="w-3 h-3" /> Núcleos
                        </TabsTrigger>
                        <TabsTrigger value="imeis" className="rounded-full text-[9px] font-black uppercase tracking-widest px-4 h-8 data-[state=active]:bg-violet-500 data-[state=active]:text-white gap-1.5">
                          <Cpu className="w-3 h-3" /> IMEIs
                        </TabsTrigger>
                      </TabsList>

                      <div className="flex-1 rounded-2xl border bg-white overflow-hidden shadow-sm">
                        <ScrollArea className="h-full">
                          {/* FAZENDAS TAB */}
                          <TabsContent value="fazendas" className="m-0">
                            <Table>
                              <TableHeader className="bg-slate-50/50 sticky top-0">
                                <TableRow>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Propriedade</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Registros</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-teal-600 text-right pr-6">UCS Originação</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {grouped.fazendas.map((f, i) => (
                                  <TableRow key={i} className="border-b border-slate-50 hover:bg-teal-50/30 transition-colors">
                                    <TableCell className="font-black text-[10px] uppercase text-slate-900 truncate max-w-[200px]">{f.nome}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="text-[8px] font-black border-slate-200 rounded-full px-2">{f.count}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-black text-teal-600 text-[11px] pr-6">{formatUCS(f.ucs)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-teal-50/50 border-t-2 border-teal-100">
                                  <TableCell className="font-black text-[9px] uppercase text-teal-700">Total</TableCell>
                                  <TableCell className="text-center font-black text-[9px] text-teal-700">{grouped.fazendas.length}</TableCell>
                                  <TableCell className="text-right font-mono font-black text-teal-700 text-[12px] pr-6">{formatUCS(totals.ucs)} UCS</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TabsContent>

                          {/* PRODUTORES TAB */}
                          <TabsContent value="produtores" className="m-0">
                            <Table>
                              <TableHeader className="bg-slate-50/50 sticky top-0">
                                <TableRow>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Produtor</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Documento</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Propriedade</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-primary text-right pr-6">Saldo Particionado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {grouped.produtores.map((p, i) => (
                                  <TableRow key={i} className="border-b border-slate-50 hover:bg-emerald-50/30 transition-colors">
                                    <TableCell className="font-black text-[10px] uppercase text-slate-900 truncate max-w-[160px]">{p.nome}</TableCell>
                                    <TableCell className="font-mono text-[9px] text-slate-400">{p.doc || '—'}</TableCell>
                                    <TableCell className="text-[9px] text-slate-500 truncate max-w-[120px]">{p.propriedade || '—'}</TableCell>
                                    <TableCell className="text-right font-mono font-black text-primary text-[11px] pr-6">{formatUCS(p.saldo)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-emerald-50/50 border-t-2 border-emerald-100">
                                  <TableCell className="font-black text-[9px] uppercase text-primary" colSpan={3}>Total ({grouped.produtores.length} produtores)</TableCell>
                                  <TableCell className="text-right font-mono font-black text-primary text-[12px] pr-6">{formatUCS(totals.saldoProd)} UCS</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TabsContent>

                          {/* NUCLEOS TAB */}
                          <TabsContent value="nucleos" className="m-0">
                            <Table>
                              <TableHeader className="bg-slate-50/50 sticky top-0">
                                <TableRow>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Núcleo / Associação</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Produtores</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-amber-600 text-right pr-6">Saldo Associação</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {grouped.nucleos.map((n, i) => (
                                  <TableRow key={i} className="border-b border-slate-50 hover:bg-amber-50/30 transition-colors">
                                    <TableCell className="font-black text-[10px] uppercase text-slate-900 truncate max-w-[200px]">{n.nome}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="text-[8px] font-black border-slate-200 rounded-full px-2">{n.count}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-black text-amber-600 text-[11px] pr-6">{formatUCS(n.saldoAssoc)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-amber-50/50 border-t-2 border-amber-100">
                                  <TableCell className="font-black text-[9px] uppercase text-amber-700">Total</TableCell>
                                  <TableCell className="text-center font-black text-[9px] text-amber-700">{preview.length}</TableCell>
                                  <TableCell className="text-right font-mono font-black text-amber-700 text-[12px] pr-6">{formatUCS(totals.saldoAssoc)} UCS</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TabsContent>

                          {/* IMEIS TAB */}
                          <TabsContent value="imeis" className="m-0">
                            <Table>
                              <TableHeader className="bg-slate-50/50 sticky top-0">
                                <TableRow>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">IMEI / Administradora</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Produtores</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-violet-600 text-right pr-6">Saldo IMEI</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {grouped.imeis.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-[9px] font-bold text-slate-300 uppercase">Nenhum IMEI detectado na planilha</TableCell>
                                  </TableRow>
                                ) : (
                                  grouped.imeis.map((im, i) => (
                                    <TableRow key={i} className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors">
                                      <TableCell className="font-black text-[10px] uppercase text-slate-900 truncate max-w-[200px]">{im.nome}</TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant="outline" className="text-[8px] font-black border-slate-200 rounded-full px-2">{im.count}</Badge>
                                      </TableCell>
                                      <TableCell className="text-right font-mono font-black text-violet-600 text-[11px] pr-6">{formatUCS(im.saldo)}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                                {grouped.imeis.length > 0 && (
                                  <TableRow className="bg-violet-50/50 border-t-2 border-violet-100">
                                    <TableCell className="font-black text-[9px] uppercase text-violet-700">Total</TableCell>
                                    <TableCell className="text-center font-black text-[9px] text-violet-700">
                                      {grouped.imeis.reduce((a, im) => a + im.count, 0)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-black text-violet-700 text-[12px] pr-6">{formatUCS(totals.saldoImei)} UCS</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TabsContent>
                        </ScrollArea>
                      </div>
                    </Tabs>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t flex items-center justify-between gap-6 bg-white">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 flex-1 max-w-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-tight leading-snug">
                {preview.some(r => r.isSimplified)
                  ? "Modo Simplificado: Apenas colunas 'IDF' e 'UCS' são necessárias. O sistema vinculará as fazendas automaticamente."
                  : (preview[0] as any)?.isRobust
                    ? "Modo Robusto: Mapeamento de 8 colunas detectado (Fazenda, Produtor, Docs, IDF, UCS, ISIN, Hash). Cruzamento de dados ativo."
                    : "Estrutura completa: Safra · Data · IDF · Área · Propriedade · Núcleo · Lat/Long · UCS · ISIN · Hash · Produtor · CNPJ · CPF · Part% · Saldos Particionados."}
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[10px] font-bold uppercase tracking-widest px-8">Cancelar</Button>
              {!isSafraImported ? (
                <Button 
                  onClick={handleSubirSafra} 
                  disabled={preview.length === 0 || loading}
                  className="h-14 px-12 font-black uppercase text-xs rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 bg-primary"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Passo 1: Subir Safra (Auditoria)
                </Button>
              ) : !isParticionamentoDone ? (
                <Button 
                  onClick={handleProcessarCarteiras} 
                  disabled={loading}
                  className="h-14 px-12 font-black uppercase text-xs rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 bg-indigo-600"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Calculator className="w-4 h-4 mr-2" />
                  )}
                  Passo 2: Processar Carteiras (Saldos)
                </Button>
              ) : (
                <Button 
                  onClick={handleFinish} 
                  className="h-14 px-12 font-black uppercase text-xs rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 bg-emerald-600"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalizar Importação
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
