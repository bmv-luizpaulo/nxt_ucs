"use client"

import { useState, useRef } from "react";
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc, increment, arrayUnion } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Upload, FileSpreadsheet, CheckCircle, 
  Table, Search, Users, Building2, Map as MapIcon,
  Database, ShieldCheck, Calculator, X, AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Helper p/ limpar dados
const cleanDoc = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(cleanDoc);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanDoc(v)])
    );
  }
  return obj;
};

export default function SafraBulkImport() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [stats, setStats] = useState({ fazendas: 0, produtores: 0, nucleos: 0, imeis: 0 });
  const [rawText, setRawText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firestore = useFirestore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text.substring(0, 2000) + "..."); // Amostra
      processData(text);
    };
    reader.readAsText(file);
  };

  const processData = (text: string) => {
    const rows = text.split('\n').filter(r => r.trim());
    if (rows.length < 2) return;

    const headerRow = rows[0].split('\t').map(h => h.trim());
    setHeaders(headerRow);

    // Mapeamento Estrito por Posição (visto que os nomes se repetem)
    const data = rows.slice(1).map(row => {
      const cols = row.split('\t').map(c => c.trim());
      const parseNum = (val: string) => parseFloat(val?.replace(/\./g, '').replace(',', '.') || '0');

      // Se houver apenas 2 ou 3 colunas, assume formato simplificado: IDF | UCS | [ANO]
      if (cols.length >= 2 && cols.length <= 4) {
        return {
          idf: cols[0]?.replace(/^0+/, ''),
          ucs: parseNum(cols[1]),
          ano: cols[2] || new Date().getFullYear().toString(),
          dataRegistro: new Date().toLocaleDateString('pt-BR'),
          isSimplified: true
        };
      }

      if (cols.length < 10) return null;

      return {
        ano: cols[0],
        tipoArea: cols[1],
        idf: cols[2]?.replace(/^0+/, ''),
        dataRegistro: cols[3],
        areaTotal: parseNum(cols[4]),
        areaVegetacao: parseNum(cols[5]),
        fazenda: cols[6],
        nucleo: cols[7],
        latitude: cols[8],
        longitude: cols[9],
        ucs: parseNum(cols[10]),
        isin: cols[11],
        hash: cols[12],

        // --- PARTICIONAMENTO AUTOMÁTICO (33.3333333% CADA) ---
        produtor: cols[13],
        produtorDoc: cols[15] || cols[14],
        produtorPct: 33.3333333,
        produtorSaldo: parseNum(cols[10]) * (33.3333333 / 100),

        assoc: cols[18],
        assocCnpj: cols[19],
        assocPct: 33.3333333,
        assocSaldo: parseNum(cols[10]) * (33.3333333 / 100),

        imei: cols[21],
        imeiCnpj: cols[22],
        imeiPct: 33.3333333,
        imeiSaldo: parseNum(cols[10]) * (33.3333333 / 100),
      };
    }).filter(d => d !== null);

    setPreview(data);
    
    // Atualiza estatísticas do Preview
    const uniqueFazendas = new Set(data.map(d => d?.idf)).size;
    const uniqueProds = new Set(data.map(d => d?.produtorDoc)).size;
    const uniqueIMEI = new Set(data.map(d => d?.imeiCnpj).filter(Boolean)).size;
    setStats({ fazendas: uniqueFazendas, produtores: uniqueProds, nucleos: uniqueFazendas, imeis: uniqueIMEI });
  };

  const handleImport = async () => {
    if (!firestore || preview.length === 0) return;
    setLoading(true);

    try {
      const { getDocs, collection: colRef } = require('firebase/firestore');
      
      // 1. Busca os dados das fazendas correspondentes
      let fazendasMap: Record<string, any> = {};
      const fSnap = await getDocs(colRef(firestore, "fazendas")); 
      fSnap.forEach((doc: any) => {
        const f = doc.data();
        if (f.idf) fazendasMap[f.idf.toString().trim().replace(/^0+/, '')] = f;
      });

      const batch = writeBatch(firestore);
      let successCount = 0;
      
      for (const d of preview) {
        const farmBase = fazendasMap[d.idf];
        if (!farmBase && d.isSimplified) continue; 

        const finalData = d.isSimplified ? {
          ...d,
          fazenda: farmBase?.nome,
          nucleo: farmBase?.nucleo,
          produtor: farmBase?.proprietarios?.[0]?.nome,
          produtorDoc: farmBase?.proprietarios?.[0]?.documento,
          produtorPct: 33.3333333,
          produtorSaldo: d.ucs * (33.3333333 / 100),
          assoc: farmBase?.nucleo,
          assocCnpj: farmBase?.nucleoCnpj,
          assocPct: 33.3333333,
          assocSaldo: d.ucs * (33.3333333 / 100),
          imei: "INSTITUTO MATA VIVA", 
          imeiCnpj: "00.000.000/0001-00", 
          imeiPct: 33.3333333,
          imeiSaldo: d.ucs * (33.3333333 / 100)
        } : d;

        // 1. Audit Table (Safra)
        const safraRef = doc(collection(firestore, "safras"));
        batch.set(safraRef, cleanDoc({
          ...finalData,
          ucsTotal: d.ucs,
          createdAt: new Date().toISOString()
        }));

        const entities = [
          { nome: finalData.produtor, doc: finalData.produtorDoc, valor: finalData.produtorSaldo },
          { nome: finalData.assoc, doc: finalData.assocCnpj, valor: finalData.assocSaldo },
          { nome: finalData.imei, doc: finalData.imeiCnpj, valor: finalData.imeiSaldo }
        ].filter(e => e.doc && e.valor > 0);

        for (const ent of entities) {
          const entId = ent.doc.replace(/[^\d]/g, '');
          if (!entId) continue;
          const entRef = doc(firestore, "produtores", entId);

          const newTransaction = {
            id: `ORIG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            data: finalData.dataRegistro || new Date().toISOString(),
            dist: finalData.fazenda,
            plataforma: finalData.ano,
            valor: ent.valor,
            statusAuditoria: 'valido'
          };

          // Buscaremos se existe ou não? 
          // Como é um batch, não podemos buscar o estado atual fácil.
          // Mas podemos usar set com merge se tivermos campos de soma...
          // No Firestore vanilla não tem inc() fácil sem saber o valor, exceto increment().
          

          const updateData: any = {
            id: entId,
            nome: ent.nome,
            documento: ent.doc,
            status: 'disponivel',
            originacao: increment(ent.valor),
            saldoFinalAtual: increment(ent.valor),
            tabelaOriginacao: arrayUnion(newTransaction),
            updatedAt: new Date().toISOString()
          };

          if (finalData.ano) updateData.safra = finalData.ano;
          if (finalData.nucleo) updateData.nucleo = finalData.nucleo;

          batch.set(entRef, updateData, { merge: true });
        }
        successCount++;
      }

      await batch.commit();
      toast({ title: "Distribuição concluída!", description: `${successCount} registros de safra vinculados e liquidados com sucesso.` });
      setPreview([]);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao distribuir safras." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
             <Database className="w-7 h-7" />
          </div>
          <div>
             <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Importação de Safra — 2010</h2>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{preview.length} registros detectados</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setPreview([])} className="h-14 px-8 rounded-2xl border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-400">Cancelar</Button>
          <Button 
            onClick={handleImport}
            disabled={loading || preview.length === 0}
            className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest gap-3 shadow-xl transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Importar {preview.length} Registros na Safra
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MAPPING & RAW PREVIEW */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Table className="w-4 h-4" /> Mapeamento de Colunas ({headers.length} Campos)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {headers.slice(0, 16).map((h, i) => (
                  <Badge key={i} variant="outline" className="justify-start px-3 py-2 text-[9px] font-bold text-slate-500 border-slate-100 bg-slate-50/50 uppercase truncate">
                    <span className="w-4 text-emerald-500">{i+1}.</span> {h}
                  </Badge>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-50">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Preview do Arquivo (Fila 1 e 2)</p>
                <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden">
                  <pre className="text-[10px] text-emerald-400 font-mono overflow-auto max-h-[300px] leading-relaxed">
                    {rawText || "Nenhum arquivo carregado..."}
                  </pre>
                </div>
              </div>
           </div>

           <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 flex gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                Estrutura obrigatória detectada: Safra, IDF, Área, Fazenda, Núcleo, Lat/Long, UCS, ISIN e Hash. 
                Saldos particionados detectados automaticamente.
              </p>
           </div>
        </div>

        {/* DATA TABLE PREVIEW */}
        <div className="lg:col-span-8 space-y-6">
           {/* STATS STRIP */}
           <div className="grid grid-cols-4 gap-4">
              <StatItem icon={<MapIcon />} value={stats.fazendas} label="Fazendas" color="text-blue-600" />
              <StatItem icon={<Users />} value={stats.produtores} label="Produtores" color="text-emerald-600" />
              <StatItem icon={<Building2 />} value={stats.nucleos} label="Núcleos/Assoc" color="text-amber-500" />
              <StatItem icon={<Database />} value={stats.imeis} label="IMEIs" color="text-purple-600" />
           </div>

           <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex gap-4">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest underline decoration-emerald-500 decoration-2 underline-offset-8">Propriedades</h4>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest opacity-50">Produtores</h4>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest opacity-50">IMEIs</h4>
                 </div>
              </div>

              <ScrollArea className="h-[600px]">
                <table className="w-full">
                  <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="text-left py-4 px-8 text-[9px] font-black uppercase text-slate-400 tracking-widest">Propriedade (Veg/IDF)</th>
                      <th className="text-center py-4 px-8 text-[9px] font-black uppercase text-slate-400 tracking-widest">Registros</th>
                      <th className="text-right py-4 px-8 text-[9px] font-black uppercase text-slate-400 tracking-widest">UCS Originação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {preview.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-8">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-800 uppercase">{d.fazenda || d.veg}</span>
                            <span className="text-[10px] font-mono text-slate-400">IDF: {d.idf}</span>
                          </div>
                        </td>
                        <td className="py-4 px-8 text-center text-[10px] font-black text-slate-400">
                           <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center mx-auto">1</div>
                        </td>
                        <td className="py-4 px-8 text-right font-mono text-[12px] font-bold text-slate-600">
                          {d.ucs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
           </div>
        </div>

      </div>

      {!preview.length && (
        <div className="flex flex-col items-center justify-center p-32 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 text-center space-y-6">
           <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center text-emerald-500">
              <FileSpreadsheet className="w-12 h-12" />
           </div>
           <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configuração de Safra</h4>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                Arraste o arquivo TSV/Excel ou clique abaixo para iniciar o mapeamento dinâmico.
              </p>
           </div>
           <Button 
            onClick={() => fileInputRef.current?.click()}
            className="h-16 px-12 rounded-[2rem] bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-2xl"
           >
             Carregar Base de Dados
           </Button>
           <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.csv" onChange={handleFileChange} />
        </div>
      )}
    </div>
  );
}

function StatItem({ icon, value, label, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
      <div className={cn("w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center", color)}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-800 leading-none">{value.toLocaleString()}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}
