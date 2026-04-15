"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Search, Users, Building2, MapIcon,
  ChevronLeft, ChevronRight, Eye, User, Sparkles, Home, FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { Fazenda } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// TIPAGENS & CONSOLIDAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
interface ProdutorConsolidado {
  documento: string;           
  nome: string;
  tipo: 'PF' | 'PJ';
  fazendas: {
    fazendaId: string;
    fazendaNome: string;
    idf: string;
    nucleo?: string;
    municipio?: string;
    uf?: string;
    areaTotal: number;
    percentual: number;
    areaProdutor: number;
    saldoOriginacao: number;   
    safraReferencia?: string;
  }[];
  totalFazendas: number;
  totalAreaHa: number;
  totalSaldoOriginacao: number; 
}

function buildProdutores(fazendas: Fazenda[]): ProdutorConsolidado[] {
  const map: Record<string, ProdutorConsolidado> = {};

  for (const fazenda of fazendas) {
    for (const prop of fazenda.proprietarios || []) {
      const key = prop.documento || prop.nome;
      if (!key) continue;

      const areaProdutor = ((fazenda.areaTotal || 0) * (prop.percentual || 100)) / 100;

      if (!map[key]) {
        map[key] = {
          documento: prop.documento,
          nome: prop.nome,
          tipo: prop.tipo || 'PF',
          fazendas: [],
          totalFazendas: 0,
          totalAreaHa: 0,
          totalSaldoOriginacao: 0,
        };
      }

      const saldoOrig = Number(fazenda.saldoOriginacao) || 0;

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
        saldoOriginacao: saldoOrig,
        safraReferencia: fazenda.safraReferencia,
      });

      map[key].totalFazendas++;
      map[key].totalAreaHa += areaProdutor;
      map[key].totalSaldoOriginacao += saldoOrig;
    }
  }

  return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES DE UI LOCAIS
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, gradient }: { icon: React.ReactNode; label: string; value: string | number; unit: string; gradient: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/60 p-6 flex flex-col group hover:shadow-lg hover:border-emerald-200 transition-all duration-300 min-h-[160px]">
       <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 rounded-full blur-2xl -mr-10 -mt-10", gradient)} />
       
       <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br", gradient)}>
             {icon}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
       </div>

       <div className="relative z-10 mt-auto">
          <p className="text-3xl xl:text-4xl font-black text-slate-900 leading-none tracking-tight mb-2">
             {value}
          </p>
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{unit}</p>
          </div>
       </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function ProdutoresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Sincroniza busca da URL
  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  // Proteção de rota
  useEffect(() => {
    if (!isUserLoading && !user) router.push("/");
  }, [user, isUserLoading, router]);

  // Queries e Dados
  const fazendasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "fazendas"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: fazendas, isLoading } = useCollection<Fazenda>(fazendasQuery);
  const produtores = useMemo(() => buildProdutores(fazendas || []), [fazendas]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return produtores;
    return produtores.filter(p =>
      p.nome?.toLowerCase().includes(q) ||
      p.documento?.includes(q) ||
      p.fazendas.some(f => f.fazendaNome?.toLowerCase().includes(q) || f.idf?.includes(q) || f.nucleo?.toLowerCase().includes(q))
    );
  }, [produtores, search]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── EXPORT XLSX CONSOLIDADO COM DISTRIBUIÇÃO, CRUZAMENTO DE SAFRAS E DADOS TÉCNICOS ───────
  const handleExportConsolidado = async () => {
    if (!firestore || !produtores) return;
    setIsExporting(true);
    try {
      // 1. Busca Entities (Dados financeiros/auditoria)
      const snapEntities = await getDocs(collection(firestore, 'entities'));
      const entities: Record<string, any> = {};
      snapEntities.forEach(doc => { entities[doc.id] = doc.data(); });

      // 2. Busca Safras_Registros (Para puxar as Safras e Datas reais de Originação)
      const snapSafras = await getDocs(collection(firestore, 'safras_registros'));
      const safrasByIDF: Record<string, any> = {};
      snapSafras.forEach(doc => {
        const data = doc.data();
        if (data.idf) {
          safrasByIDF[data.idf] = data;
        }
      });

      // 3. Busca Nova Coleção de Consumos (Substitua 'consumos_registros' pelo nome real da sua coleção)
      const snapConsumos = await getDocs(collection(firestore, 'consumos_registros'));
      const consumosByIDF: Record<string, number> = {};
      snapConsumos.forEach(doc => {
        const d = doc.data();
        if (d.idf) {
          consumosByIDF[d.idf] = (consumosByIDF[d.idf] || 0) + (Number(d.valor) || 0);
        }
      });

      const matchFarm = (val: string, nome: string, idf: string): boolean => {
        if (!val) return false;
        const d = val.toUpperCase().trim();
        const n = (nome || '').toUpperCase().trim();
        const i = (idf  || '').toUpperCase().trim();
        if (i && i !== '---' && d.includes(i)) return true;
        if (n && d.includes(n)) return true;
        const cleanN = n.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
        const cleanD = d.replace(/^(FAZENDA|SITIO|SÍTIO|CHACARA|CHÁCARA|ESTANCIA|ESTÂNCIA)\s+/i, '').trim();
        return !!(cleanN && cleanN.length > 3 && (cleanD.includes(cleanN) || cleanN.includes(cleanD)));
      };

      const sumByFarm = (tbl: any[], nome: string, idf: string, key = 'valor'): number =>
        (tbl || []).reduce((a: number, r: any) => {
          if (matchFarm(r.dist, nome, idf) || matchFarm(r.plataforma, nome, idf)) {
            return a + (Number(r[key]) || 0);
          }
          return a;
        }, 0);

      const wb = XLSX.utils.book_new();
      const rows: any[] = [];

      // Cabeçalho do Relatório
      rows.push({ 'Produtor/Fazenda': 'CENTRAL DE PRODUTORES - AUDITORIA CONSOLIDADA' });
      rows.push({ 'Produtor/Fazenda': `Gerado em: ${new Date().toLocaleString('pt-BR')}` });
      rows.push({});

      let grandOrig = 0, grandConsumo = 0, grandAquisi = 0, grandApos = 0, grandSaldo = 0;

      for (const prod of produtores) {
        const entityKey = prod.documento?.replace(/\D/g, '') || prod.nome;
        const entity = entities[entityKey] || {};
        
        const totalConsumoFallback = Math.abs(
          (entity.tabelaMovimentacao || []).reduce((acc: number, cur: any) => {
            const isFinancial = cur.tipoTransacao === 'CONSUMO' || !cur.tipoTransacao;
            return isFinancial ? acc + (Number(cur.valor) || 0) : acc;
          }, 0)
        );
        
        const totalAquisicao = (entity.tabelaAquisicao || []).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);
        const totalAposentado = (entity.tabelaLegado || []).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0);

        const n = prod.fazendas.length || 1;

        const distribute = (total: number, idx: number) => {
          const base = Math.floor(total / n);
          const resto = total % n;
          return idx < resto ? base + 1 : base;
        };

        // Linha Mestre do Produtor
        rows.push({
          'Produtor/Fazenda': `PRODUTOR: ${prod.nome.toUpperCase()}`,
          'Doc/IDF': prod.documento,
          'Tipo': prod.tipo,
          'Safra (Ano)': '-',
          'Município': '-',
          'UF': '-',
          'Área Total (ha)': '-',
          'Partic (%)': '-',
          'Área Prod (ha)': prod.totalAreaHa,
          'Originação (UCS)': '-',
          'Consumo (UCS)': '-',
          'Aquisição (UCS)': '-',
          'Aposentada (UCS)': '-',
          'Saldo Líquido (UCS)': '-'
        });

        let prodOrig = 0, prodConsumo = 0, prodAquisi = 0, prodApos = 0;

        prod.fazendas.forEach((f, idx) => {
          // ── BUSCA INTELIGENTE DE ORIGINAÇÃO E SAFRA ──
          const safraRecord = safrasByIDF[f.idf] || {};
          let orig = Number(safraRecord.originacao) || sumByFarm(entity.tabelaOriginacao, f.fazendaNome, f.idf) || Number(f.saldoOriginacao) || 0;
          
          let safraAno = safraRecord.safra || f.safraReferencia;
          if (!safraAno && entity.tabelaOriginacao) {
             const origRow = entity.tabelaOriginacao.find((r:any) => matchFarm(r.dist, f.fazendaNome, f.idf));
             if (origRow && origRow.plataforma) safraAno = origRow.plataforma;
          }
          
          // ── INTEGRAÇÃO DA NOVA COLEÇÃO DE CONSUMOS ──
          // Se a nova coleção tiver valor para o IDF, usa ela. Senão, faz o fallback pro rateio antigo.
          const consumo = consumosByIDF[f.idf] !== undefined ? Math.abs(consumosByIDF[f.idf]) : distribute(totalConsumoFallback, idx);
          
          const aquisi = distribute(totalAquisicao, idx);
          const apos = distribute(totalAposentado, idx);
          const saldo = orig - consumo - aquisi - apos;

          rows.push({
            'Produtor/Fazenda': f.fazendaNome,
            'Doc/IDF': f.idf || '—',
            'Tipo': 'Fazenda',
            'Safra (Ano)': safraAno || 'N/A',
            'Município': f.municipio || '—',
            'UF': f.uf || '—',
            'Área Total (ha)': f.areaTotal,
            'Partic (%)': f.percentual,
            'Área Prod (ha)': f.areaProdutor,
            'Originação (UCS)': orig,
            'Consumo (UCS)': consumo,
            'Aquisição (UCS)': aquisi,
            'Aposentada (UCS)': apos,
            'Saldo Líquido (UCS)': saldo,
          });

          prodOrig += orig; prodConsumo += consumo; prodAquisi += aquisi; prodApos += apos;
        });

        const prodSaldo = prodOrig - prodConsumo - prodAquisi - prodApos;
        
        rows.push({
          'Produtor/Fazenda': `SUBTOTAL — ${prod.nome}`,
          'Doc/IDF': '', 'Tipo': '', 'Safra (Ano)': '', 'Município': '', 'UF': '', 'Área Total (ha)': '', 'Partic (%)': '', 'Área Prod (ha)': '',
          'Originação (UCS)': prodOrig,
          'Consumo (UCS)': prodConsumo,
          'Aquisição (UCS)': prodAquisi,
          'Aposentada (UCS)': prodApos,
          'Saldo Líquido (UCS)': prodSaldo,
        });
        rows.push({});

        grandOrig += prodOrig; grandConsumo += prodConsumo;
        grandAquisi += prodAquisi; grandApos += prodApos; grandSaldo += prodSaldo;
      }

      // ── FAZENDAS SEM PROPRIETÁRIO (ÓRFÃS) ──
      const includedIds = new Set<string>();
      produtores.forEach(p => p.fazendas.forEach(f => includedIds.add(f.fazendaId)));
      const orphans = (fazendas || []).filter(f => !includedIds.has(f.id));

      if (orphans.length > 0) {
        rows.push({ 'Produtor/Fazenda': 'FAZENDAS SEM PROPRIETÁRIO CADASTRADO' });
        
        let orphanOrig = 0;
        orphans.forEach(f => {
          const safraRecord = safrasByIDF[f.idf || ''] || {};
          const idfKey = (f.idf || '').replace(/\D/g, '');
          const orphanEntity = entities[idfKey] || {};
          
          let orig = Number(safraRecord.originacao) || Number(orphanEntity.originacao) || Number(f.saldoOriginacao) || 0;
          
          rows.push({
            'Produtor/Fazenda': f.nome,
            'Doc/IDF': f.idf || '—',
            'Tipo': 'Fazenda Órfã',
            'Safra (Ano)': safraRecord.safra || f.safraReferencia || 'N/A',
            'Município': f.municipio || '—',
            'UF': f.uf || '—',
            'Área Total (ha)': f.areaTotal || 0,
            'Partic (%)': 100,
            'Área Prod (ha)': f.areaTotal || 0,
            'Originação (UCS)': orig,
            'Consumo (UCS)': 0,
            'Aquisição (UCS)': 0,
            'Aposentada (UCS)': 0,
            'Saldo Líquido (UCS)': orig,
          });
          orphanOrig += orig;
          grandOrig += orig;
          grandSaldo += orig;
        });

        rows.push({
          'Produtor/Fazenda': 'SUBTOTAL — Sem Proprietário',
          'Originação (UCS)': orphanOrig,
          'Consumo (UCS)': 0,
          'Aquisição (UCS)': 0,
          'Aposentada (UCS)': 0,
          'Saldo Líquido (UCS)': orphanOrig,
        });
        rows.push({});
      }

      // Rodapé com Total Geral
      rows.push({
        'Produtor/Fazenda': 'TOTAL GERAL CONSOLIDADO',
        'Originação (UCS)': grandOrig,
        'Consumo (UCS)': grandConsumo,
        'Aquisição (UCS)': grandAquisi,
        'Aposentada (UCS)': grandApos,
        'Saldo Líquido (UCS)': grandSaldo,
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      
      ws['!cols'] = [
        { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, 
        { wch: 6 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 16 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Auditoria Consolidada');
      XLSX.writeFile(wb, `relatorio-ucs-completo-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Relatório cruzado gerado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao processar dados de exportação.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── ESTADOS DE LOADING E UI ───────────────────────────────────────
  if (isUserLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="relative flex items-center justify-center">
         <div className="w-16 h-16 border-4 border-emerald-100 rounded-full animate-pulse absolute" />
         <Loader2 className="w-10 h-10 text-emerald-500 animate-spin relative z-10" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F4F7FA]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* GLOWING BACKGROUND ORB */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-gradient-to-bl from-emerald-400/20 via-teal-400/5 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* PREMIUM HEADER SECTION */}
        <div className="px-8 lg:px-12 pt-12 pb-8 shrink-0 relative z-10">
           <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-4 max-w-2xl">
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Painel Consolidado</span>
                 </div>
                 <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    Central de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Produtores</span>
                 </h1>
                 <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xl">
                    Gestão unificada de clientes. Os perfis abaixo são gerados automaticamente através da consolidação de propriedades e titularidades das fazendas cadastradas.
                 </p>
              </div>

              <div className="flex items-center gap-4">
                 <div className="relative hidden md:block">
                   <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20" />
                   <div className="relative bg-white h-14 px-6 rounded-2xl border border-emerald-100 flex items-center justify-center gap-3 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Unificado</span>
                         <span className="text-lg font-black text-slate-900 leading-tight">{produtores.length} perfis</span>
                      </div>
                   </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 px-8 lg:px-12 pb-12 overflow-y-auto custom-scrollbar z-10 space-y-8">

          {/* DYNAMIC STATS CARDS */}
          {produtores.length > 0 && (() => {
            const linkedIds = new Set<string>();
            produtores.forEach(p => p.fazendas.forEach(f => linkedIds.add(f.fazendaId)));
            const totalVinculos = produtores.reduce((s, p) => s + p.totalFazendas, 0);
            const semVinculo = (fazendas?.length || 0) - linkedIds.size;

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-6">
                <StatCard icon={<Users className="w-5 h-5" />} label="Produtores" value={produtores.length} unit="cadastrados" gradient="from-emerald-500 to-emerald-600" />
                <StatCard icon={<User className="w-5 h-5" />} label="Pessoa Física (PF)" value={produtores.filter(p => p.tipo === 'PF').length} unit="cadastros ativos" gradient="from-teal-500 to-teal-600" />
                <StatCard icon={<Building2 className="w-5 h-5" />} label="Pessoa Jurídica (PJ)" value={produtores.filter(p => p.tipo === 'PJ').length} unit="empresas" gradient="from-indigo-500 to-indigo-600" />
                <StatCard
                   icon={<Home className="w-5 h-5" />}
                   label="Fazendas"
                   value={(fazendas?.length || 0).toLocaleString('pt-BR')}
                   unit={`${linkedIds.size} vinculadas · ${semVinculo} sem vínculo`}
                   gradient="from-violet-500 to-purple-600"
                />
                <StatCard
                   icon={<Sparkles className="w-5 h-5" />}
                   label="Vínculos"
                   value={totalVinculos.toLocaleString('pt-BR')}
                   unit={`${linkedIds.size} fazendas → ${produtores.length} produtores`}
                   gradient="from-amber-500 to-orange-600"
                />
              </div>
            );
          })()}

          {/* MAIN CONTENT AREA */}
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-sm overflow-hidden">
             
             <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                   <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-300" />
                   <div className="relative flex items-center">
                     <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                     <Input
                       placeholder="Buscar por nome, documento ou identificação..."
                       className="pl-12 h-14 bg-slate-50/50 border-slate-200 rounded-2xl text-[14px] font-medium text-slate-700 shadow-inner focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all placeholder:text-slate-400"
                       value={search}
                       onChange={e => setSearch(e.target.value)}
                     />
                   </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className="md:hidden self-start bg-slate-100 text-slate-500 border-none px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                    {filtered.length} Resultados
                  </Badge>
                  <Button
                    onClick={handleExportConsolidado}
                    disabled={isExporting || produtores.length === 0}
                    className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    {isExporting ? 'Processando Base...' : 'Exportar Relatório (XLSX)'}
                  </Button>
                </div>
             </div>

            {/* TABLE / LIST */}
            {isLoading ? (
               <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando base de dados...</p>
               </div>
            ) : paginated.length === 0 ? (
               <div className="p-24 flex flex-col items-center justify-center gap-6 bg-slate-50/30">
                  <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-[2rem] flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Nenhum produtor encontrado</h3>
                    <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
                      {(fazendas?.length || 0) === 0
                        ? "Você ainda não cadastrou nenhuma fazenda com proprietários."
                        : "Não encontramos resultados para sua busca atual."}
                    </p>
                  </div>
               </div>
            ) : (
               <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full min-w-[800px]">
                   <thead>
                     <tr className="bg-slate-50/80 border-b border-slate-100">
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Produtor</th>
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hidden xl:table-cell">Classificação</th>
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Propriedades</th>
                       <th className="text-left py-5 px-8 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Área Consolidada</th>
                       <th className="text-right py-5 px-8 w-24"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50/80">
                     {paginated.map((produtor, i) => (
                       <tr 
                         key={i} 
                         onClick={() => { router.push(`/produtores/${produtor.documento?.replace(/[^\d]/g, '') || produtor.nome}`); }}
                         className="group bg-white hover:bg-emerald-50/30 transition-all duration-300 cursor-pointer"
                       >
                         {/* PRODUTOR - NOME E DOCUMENTO */}
                         <td className="py-5 px-8">
                           <div className="flex items-center gap-4">
                             <div className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center text-[14px] font-black shrink-0 transition-all duration-500 shadow-sm group-hover:scale-110",
                               produtor.tipo === 'PJ'
                                 ? "bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white"
                                 : "bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white"
                             )}>
                               {produtor.nome?.substring(0, 2).toUpperCase()}
                             </div>
                             <div className="flex flex-col gap-1 min-w-0">
                               <span className="text-[14px] font-black text-slate-900 truncate max-w-[200px] lg:max-w-[280px] leading-none uppercase group-hover:text-emerald-700 transition-colors">{produtor.nome}</span>
                               <span className="text-[11px] font-mono font-bold text-slate-400 tracking-tight flex items-center gap-2">
                                 {produtor.documento}
                                 <Badge className={cn(
                                   "xl:hidden text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border-none",
                                   produtor.tipo === 'PJ' ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"
                                 )}>
                                   {produtor.tipo}
                                 </Badge>
                               </span>
                             </div>
                           </div>
                         </td>

                         {/* CLASSIFICAÇÃO / TIPO */}
                         <td className="py-5 px-8 hidden xl:table-cell">
                            <Badge className={cn(
                               "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border-none transition-all shadow-sm",
                               produtor.tipo === 'PJ'
                                 ? "bg-indigo-50 text-indigo-600"
                                 : "bg-emerald-50 text-emerald-600"
                            )}>
                               {produtor.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                            </Badge>
                         </td>

                         {/* PROPRIEDADES RESUMO */}
                         <td className="py-5 px-8 hidden md:table-cell">
                           <div className="space-y-2">
                             {produtor.fazendas.slice(0, 2).map((f, j) => (
                               <div key={j} className="flex items-center gap-2">
                                 <Building2 className="w-3 h-3 text-slate-300 shrink-0 group-hover:text-emerald-400 transition-colors" />
                                 <span className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{f.fazendaNome}</span>
                                 <Badge className="bg-slate-50 text-slate-400 border-slate-200 text-[9px] font-mono px-1.5 py-0.5 shadow-none">{f.percentual}%</Badge>
                               </div>
                             ))}
                             {produtor.fazendas.length > 2 && (
                               <Badge variant="outline" className="mt-1 text-[9px] font-black text-emerald-500 border-emerald-100 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md shadow-none">
                                 +{produtor.fazendas.length - 2} Propriedades
                               </Badge>
                             )}
                           </div>
                         </td>

                         {/* ÁREA / GEOGRAFIA */}
                         <td className="py-5 px-8">
                           <div className="flex flex-col gap-2">
                             <div className="flex items-baseline gap-1.5">
                               <span className="text-sm font-black text-slate-800">
                                 {produtor.totalAreaHa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                               </span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ha</span>
                             </div>
                             
                             <div className="flex flex-wrap gap-1">
                               {[...new Set(produtor.fazendas.map(f => f.nucleo).filter(Boolean))].slice(0, 2).map((n, j) => (
                                 <Badge key={j} variant="outline" className="text-[8px] bg-white border-slate-200 text-slate-500 font-bold px-2 py-0.5 uppercase tracking-wider truncate max-w-[120px] shadow-none">{n}</Badge>
                               ))}
                             </div>
                           </div>
                         </td>

                         {/* AÇÕES */}
                         <td className="py-5 px-8 text-right">
                            <Button 
                               variant="ghost" 
                               size="icon" 
                               className="w-10 h-10 rounded-2xl text-slate-300 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 router.push(`/produtores/${produtor.documento?.replace(/[^\d]/g, '') || produtor.nome}`);
                               }}
                            >
                               <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
               <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden md:block">
                       Exibindo <span className="text-emerald-600">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-emerald-600">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> de <span className="text-slate-900">{filtered.length}</span>
                     </p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button 
                       variant="outline" 
                       onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }} 
                       disabled={currentPage === 1} 
                       className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                     >
                       Anterior
                     </Button>
                     <div className="px-4 text-[11px] font-black text-slate-900 bg-white border border-slate-200 h-9 rounded-xl flex items-center justify-center shadow-sm">
                       {currentPage}
                     </div>
                     <Button 
                       variant="outline" 
                       onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} 
                       disabled={currentPage === totalPages} 
                       className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                     >
                       Próxima
                     </Button>
                  </div>
               </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProdutoresPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
       </div>
    }>
      <ProdutoresContent />
    </Suspense>
  );
}