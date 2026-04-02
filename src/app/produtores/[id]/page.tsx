"use client"

import { useParams, useRouter } from "next/navigation";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Fazenda, EntidadeSaldo } from "@/lib/types";
import { useMemo, useState, useEffect } from "react";
import { 
  Loader2, Building2, Map as MapIcon, 
  ExternalLink, Droplets,
  ChevronRight, Calculator, Trash2, Save,
  History, FileText, Award, Download, TrendingUp as TrendingUpIcon,
  ChevronLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Reusing the same consolidation logic
function buildProdutores(fazendas: Fazenda[]): any[] {
  const map: Record<string, any> = {};
  for (const fazenda of fazendas) {
    for (const prop of fazenda.proprietarios || []) {
      const key = (prop.documento || prop.nome || "").replace(/[^\d]/g, '') || prop.nome;
      if (!key) continue;
      const areaProdutor = ((fazenda.areaTotal || 0) * (prop.percentual || 100)) / 100;
      if (!map[key]) {
        map[key] = {
          documento: prop.documento,
          id: key,
          nome: prop.nome,
          tipo: prop.tipo || 'PF',
          fazendas: [],
          totalFazendas: 0,
          totalAreaHa: 0,
        };
      }
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
      });
      map[key].totalFazendas++;
      map[key].totalAreaHa += areaProdutor;
    }
  }
  return Object.values(map);
}

export default function ProdutorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const fazendasQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "fazendas"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: fazendas, isLoading: isFazendasLoading } = useCollection<Fazenda>(fazendasQuery);
  const produtor = useMemo(() => {
    const all = buildProdutores(fazendas || []);
    return all.find(p => p.id === id);
  }, [fazendas, id]);

  const entRef = useMemo(() => 
    firestore && id ? doc(firestore, "produtores", id) : null,
    [firestore, id]
  );

  const { data: entityData, isLoading: isWalletLoading } = useDoc<EntidadeSaldo>(entRef);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [pasteData, setPasteData] = useState<{ section: string; raw: string } | null>(null);

  useEffect(() => {
    if (entityData) setFormData(entityData);
  }, [entityData]);

  const handleUpdateItem = (section: string, itemId: string, updates: Partial<any>) => {
    const list = ((formData as any)[section] || []).map((item: any) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    setFormData({ ...formData, [section]: list });
  };

  const handleRemoveItem = (section: string, itemId: string) => {
    const list = ((formData as any)[section] || []).filter((i: any) => i.id !== itemId);
    setFormData({ ...formData, [section]: list });
  };

  const handleProcessPaste = () => {
    if (!pasteData) return;
    const lines = pasteData.raw.split('\n').filter(l => l.trim());
    const newRows: any[] = lines.map(line => {
      const parts = line.split('\t');
      const parseVal = (str: string | undefined) => {
        if (!str || !str.trim()) return 0;
        if (str.includes(',')) return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
        return parseFloat(str.replace(/\./g, "").replace(/[^\d.-]/g, "")) || 0;
      };
      const cleanData = (str: string | undefined) => {
        if (!str) return '';
        if (str.includes(' ')) return str.split(' ')[0];
        return str.trim();
      };

      switch (pasteData.section) {
        case 'tabelaLegado':
          return { id: `LEG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, data: cleanData(parts[1]), plataforma: parts[0]?.trim() || '', disponivel: parseVal(parts[4]), reservado: parseVal(parts[5]), bloqueado: parseVal(parts[6]), aposentado: parseVal(parts[7]) };
        case 'tabelaOriginacao':
          return { id: `ORIG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, dist: parts[0]?.trim() || '', data: cleanData(parts[1]), plataforma: parts[2]?.trim() || '', valor: parseVal(parts[parts.length - 1]) };
        case 'tabelaImei':
          return { id: `IMEI-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, data: cleanData(parts[1]), dist: parts[0]?.trim() || '', valorDebito: parseVal(parts[4]), valorCredito: parseVal(parts[5]) };
        default: // tabelaMovimentacao
          const statusRaw = parts[8]?.trim().toLowerCase() || '';
          const statusAuditoria = (statusRaw.includes('pago') || statusRaw.includes('concl') || statusRaw.includes('final')) ? 'Concluido' : statusRaw.includes('canc') ? 'Cancelado' : 'Pendente';
          return {
            id: `MOV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, dist: parts[0]?.trim() || '', data: cleanData(parts[1]), destino: parts[2]?.trim() || '', usuarioDestino: parts[3]?.trim() || '', 
            valor: parseVal(parts[6]) || parseVal(parts[4]) || 0, statusAuditoria, dataPagamento: parts[9]?.trim() || '', valorPago: parseVal(parts[11]), linkNxt: parts[12]?.trim() || '', observacaoTransacao: parts[13]?.trim() || ''
          };
      }
    });

    setFormData({ ...formData, [pasteData.section]: [...((formData as any)[pasteData.section] || []), ...newRows] });
    setPasteData(null);
  };

  const currentStats = {
    originacao: (isEditing ? formData.tabelaOriginacao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) : (entityData?.originacao || 0)) || 0,
    movimentacao: (isEditing ? formData.tabelaMovimentacao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) : (entityData?.movimentacao || 0)) || 0,
    legado: (isEditing ? formData.tabelaLegado?.reduce((acc: number, cur: any) => acc + (Number(cur.disponivel) || 0), 0) : (entityData?.saldoLegadoTotal || 0)) || 0,
    imei: (isEditing ? formData.tabelaImei?.reduce((acc: number, cur: any) => acc + (Number(cur.valorDebito || 0) - Number(cur.valorCredito || 0)), 0) : (entityData?.saldoAjustarImei || 0)) || 0,
    aquisicao: (isEditing ? formData.tabelaAquisicao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) : (entityData?.aquisicao || 0)) || 0,
  };
  const currentSaldoReal = currentStats.originacao + currentStats.legado + currentStats.aquisicao - currentStats.movimentacao - currentStats.imei;

  const handleSave = async () => {
    if (!entRef) return;
    setIsSaving(true);
    try {
      await updateDoc(entRef, {
        ...formData,
        originacao: currentStats.originacao,
        movimentacao: currentStats.movimentacao,
        saldoLegadoTotal: currentStats.legado,
        aquisicao: currentStats.aquisicao,
        saldoAjustarImei: currentStats.imei,
        saldoFinalAtual: currentSaldoReal,
        updatedAt: new Date().toISOString()
      });
      toast.success("Perfil técnico atualizado!");
      setIsEditing(false);
    } catch (error) { toast.error("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  if (isFazendasLoading || isWalletLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  if (!produtor) return <div className="min-h-screen flex items-center justify-center">Produtor não encontrado.</div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex flex-row overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 relative border-r border-slate-100 overflow-hidden">
            
            {/* HEADER FIXO */}
            <div className="bg-[#0B0F1A] pb-4 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
              <div className="px-10 py-3 border-b border-white/5 flex items-center gap-4 relative z-10">
                 <Button onClick={() => router.push('/produtores')} variant="ghost" className="h-8 px-2 text-slate-400 hover:text-white hover:bg-white/5 gap-2 uppercase text-[10px] font-black">
                   <ChevronLeft className="w-4 h-4" /> Voltar para Lista
                 </Button>
              </div>
              <div className="px-10 py-6 flex items-center justify-between relative z-10 gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-[24px] font-black text-white shadow-xl shadow-emerald-500/20 uppercase shrink-0">
                    {produtor.nome?.substring(0, 2)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">{produtor.tipo}</Badge>
                      <span className="text-slate-500 font-mono text-[11px]">{produtor.documento}</span>
                    </div>
                    <h1 className="text-[20px] xl:text-[26px] font-black text-white uppercase tracking-tight leading-none truncate max-w-[250px] lg:max-w-[450px]">{produtor.nome}</h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-emerald-500" /> {produtor.totalFazendas} {produtor.totalFazendas === 1 ? 'Propriedade' : 'Propriedades'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:gap-6 bg-white/5 border border-white/5 p-2 lg:p-3 px-4 lg:px-5 rounded-2xl backdrop-blur-md shrink-0">
                   <div className="text-right">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Originação</p>
                      <p className="text-[16px] font-black text-white">{Math.floor(currentStats.originacao).toLocaleString('pt-BR')}</p>
                   </div>
                   <div className="w-px h-6 bg-white/5" />
                   <div className="text-right">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Baixas</p>
                      <p className="text-[16px] font-black text-rose-500">{Math.floor(currentStats.movimentacao).toLocaleString('pt-BR')}</p>
                   </div>
                   <div className="w-px h-6 bg-white/5 hidden lg:block" />
                   <div className="bg-emerald-500/10 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl border border-emerald-500/10">
                      <p className="text-[7px] lg:text-[8px] font-black text-emerald-500/80 uppercase tracking-widest mb-0.5 text-center">Saldo Disponível</p>
                      <p className="text-[18px] lg:text-[22px] font-black text-emerald-400 leading-none text-center">
                         {Math.floor(currentSaldoReal).toLocaleString('pt-BR')} <span className="text-[9px] ml-0.5 font-bold">UCS</span>
                      </p>
                   </div>
                </div>
              </div>
            </div>

            {/* ÁREA DE SCROLL DO CONTEÚDO */}
            <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
              <div className="p-10 space-y-12 pb-32">
                <div className="space-y-6">
                  <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-widest flex gap-2 items-center"><MapIcon className="w-4 h-4" /> Portfólio de Propriedades</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {produtor.fazendas.map((f: any, i: number) => (
                      <div key={i} onClick={() => router.push(`/fazendas?search=${encodeURIComponent(f.fazendaNome)}`)} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group cursor-pointer shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                        <div className="flex justify-between items-start mb-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[16px] font-black text-slate-900 uppercase group-hover:text-emerald-600 transition-colors">{f.fazendaNome}</p>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 tracking-tight">IDF: {f.idf}</p>
                          </div>
                          <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px]">{f.percentual}%</Badge>
                        </div>
                        <div className="space-y-4">
                          <PropDetail label="Área do Produtor" value={`${f.areaProdutor.toLocaleString('pt-BR')} ha`} highlight />
                          <PropDetail label="Núcleo" value={f.nucleo || "---"} />
                          <PropDetail label="Localização" value={`${f.municipio || '---'}/${f.uf || '---'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-10">
                  {!isEditing ? (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-widest flex gap-2 items-center"><Droplets className="w-4 h-4 text-emerald-500" /> Extrato de Originação (Safra por Fazenda)</h3>
                          <Badge variant="outline" className="text-[12px] font-black px-4 py-1.5 rounded-full border-slate-200 text-slate-400">{entityData?.tabelaOriginacao?.length || 0} Inserções</Badge>
                       </div>
                       <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                         <div className="overflow-x-auto w-full custom-scrollbar">
                           <Table className="w-full min-w-[700px]">
                             <TableHeader className="bg-slate-50 border-b border-slate-100">
                               <TableRow>
                                 <TableHead className="text-left py-5 px-10 text-[9px] font-black uppercase text-slate-400 tracking-widest">Safra</TableHead>
                                 <TableHead className="text-left py-5 px-10 text-[9px] font-black uppercase text-slate-400 tracking-widest">Fazenda Origem</TableHead>
                                 <TableHead className="text-left py-5 px-10 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Crédito UCS</TableHead>
                                 <TableHead className="text-center py-5 px-10 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody className="divide-y divide-slate-50">
                               {entityData?.tabelaOriginacao && entityData.tabelaOriginacao.length > 0 ? (
                                 [...entityData.tabelaOriginacao].reverse().map((item, idx) => (
                                   <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                                     <TableCell className="py-5 px-10 text-[14px] font-black text-slate-900">{item.plataforma}</TableCell>
                                     <TableCell className="py-5 px-10"><p className="text-[13px] font-bold text-slate-700 uppercase">{item.dist}</p><p className="text-[11px] text-slate-400">{item.data}</p></TableCell>
                                     <TableCell className="py-5 px-10 text-right font-black text-[16px] text-emerald-600">+ {Math.floor(item.valor || 0).toLocaleString('pt-BR')}</TableCell>
                                     <TableCell className="py-5 px-10 text-center"><Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase px-3 py-1 rounded-full">Liquidado</Badge></TableCell>
                                   </TableRow>
                                 ))
                               ) : (
                                 <TableRow><TableCell colSpan={4} className="py-24 text-center text-slate-300 font-bold uppercase text-[11px] tracking-widest">Nenhuma inserção registrada</TableCell></TableRow>
                               )}
                             </TableBody>
                           </Table>
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-16">
                      <SectionBlock title="01. ORIGINAÇÃO (VOL. PRODUTOR)" value={formData.tabelaOriginacao?.reduce((acc: number, cur: any) => acc + (cur.valor || 0), 0) || 0} onPaste={() => setPasteData({ section: 'tabelaOriginacao', raw: '' })} data={formData.tabelaOriginacao || []} type="originacao" onRemove={(id: string) => handleRemoveItem('tabelaOriginacao', id)} onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaOriginacao', id, updates)} />
                      <SectionBlock title="02. MOVIMENTAÇÃO" isNegative value={formData.tabelaMovimentacao?.reduce((acc: number, cur: any) => acc + (cur.valor || 0), 0) || 0} onPaste={() => setPasteData({ section: 'tabelaMovimentacao', raw: '' })} data={formData.tabelaMovimentacao || []} type="movimentacao" onRemove={(id: string) => handleRemoveItem('tabelaMovimentacao', id)} onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaMovimentacao', id, updates)} />
                      <SectionBlock title="03. SALDO LEGADO" isAmber value={formData.tabelaLegado?.reduce((acc: number, cur: any) => acc + (cur.disponivel + (cur.reservado || 0)), 0) || 0} onPaste={() => setPasteData({ section: 'tabelaLegado', raw: '' })} data={formData.tabelaLegado || []} type="legado" onRemove={(id: string) => handleRemoveItem('tabelaLegado', id)} onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaLegado', id, updates)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR DIREITA */}
          <div className="w-[360px] shrink-0 bg-white flex flex-col relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] h-screen">
             <div className="p-10 border-b border-slate-100 shrink-0">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Central do Produtor</h3>
                <p className="text-[16px] font-black text-slate-900 uppercase leading-tight">Ações Técnicas e Gestão</p>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-10 space-y-10 pb-32">
                   <div className="space-y-3">
                      <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Acesso Rápido</h4>
                      <QuickLink icon={<History className="w-4 h-4" />} label="Extrato de Movimentações" />
                      <QuickLink icon={<FileText className="w-4 h-4" />} label="Relatórios de Auditoria" />
                      <QuickLink icon={<Award className="w-4 h-4" />} label="Certificações de Origem" />
                      <QuickLink icon={<TrendingUpIcon className="w-4 h-4" />} label="Projeção de Carbono" />
                      
                      <div className="pt-6 mt-6 border-t border-slate-50">
                          {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all gap-3 shadow-lg shadow-slate-100">
                              <Calculator className="w-4 h-4" /> Habilitar Edição
                            </Button>
                          ) : (
                            <div className="space-y-3">
                              <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all gap-3 shadow-lg shadow-emerald-100">
                                <Save className="w-4 h-4" /> {isSaving ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                              <Button onClick={() => { setIsEditing(false); setFormData(entityData || {}); }} variant="ghost" className="w-full h-12 rounded-2xl text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all">Cancelar</Button>
                            </div>
                          )}
                      </div>
                   </div>

                   <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200/60 pb-4">Performance Técnica</h4>
                      <div className="space-y-5">
                         <SimpleStat label="Hectares Monitorados" value={produtor.totalAreaHa.toLocaleString('pt-BR')} unit="ha" />
                         <SimpleStat label="Inserções Realizadas" value={(entityData?.tabelaOriginacao?.length || 0).toString()} unit="un" />
                         <SimpleStat label="Safras Vinculadas" value={new Set(entityData?.tabelaOriginacao?.map((i: any) => i.plataforma)).size.toString()} unit="ano" />
                      </div>
                   </div>

                   <div className="space-y-5">
                      <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Legais</h4>
                      <div className="grid grid-cols-1 gap-3">
                         <FileCard label="CCIR Consolidado" />
                         <FileCard label="CAR (Todas Fazendas)" />
                         <FileCard label="Relatório Ambiental" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* MODAL DE PASTE */}
        <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
          <DialogContent className="max-w-xl rounded-[2.5rem] p-10 border-none bg-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black uppercase text-slate-900 flex items-center gap-3">
                <Calculator className="w-6 h-6 text-emerald-500" /> Processamento de Auditoria
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">Cole os dados formatados do Excel ou Sheets para processamento automático.</DialogDescription>
            </DialogHeader>
            <Textarea value={pasteData?.raw} onChange={e => setPasteData(pasteData ? { ...pasteData, raw: e.target.value } : null)} placeholder="Cole as colunas aqui..." className="min-h-[300px] font-mono text-[11px] bg-slate-50 border-slate-100 rounded-[1.5rem] p-6 shadow-inner" />
            <Button onClick={handleProcessPaste} className="w-full h-14 rounded-[1.5rem] font-black uppercase text-[11px] bg-emerald-600 text-white shadow-xl shadow-emerald-100 mt-4">Importar Agora</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function PropDetail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[12px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={cn("text-[12px] font-black uppercase", highlight ? "text-emerald-600" : "text-slate-800")}>{value}</span>
    </div>
  );
}

function SectionBlock({ title, value, onPaste, data, type, onRemove, onUpdateItem, isNegative, isAmber }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn("w-1.5 h-6 rounded-full", isAmber ? "bg-amber-500" : isNegative ? "bg-rose-500" : "bg-emerald-500")} />
          <h3 className="text-[14px] font-black uppercase tracking-tight text-slate-800">{title}</h3>
          <Badge variant="outline" className={cn("text-[10px] font-black px-3 py-1 rounded-full", isAmber ? "text-amber-500" : isNegative ? "text-rose-500" : "text-emerald-500")}>
            {Math.floor(value || 0).toLocaleString('pt-BR')} UCS
          </Badge>
        </div>
        <Button variant="outline" onClick={onPaste} className="h-10 px-6 rounded-2xl text-[10px] font-black uppercase gap-2.5 border-slate-200 bg-white hover:bg-slate-50 transition-all text-slate-600">
          <Calculator className="w-4 h-4 text-emerald-500" /> Colar Dados
        </Button>
      </div>
      <SectionTable data={data} type={type} onRemove={onRemove} onUpdateItem={onUpdateItem} />
    </div>
  );
}

function SectionTable({ data, type, onRemove, onUpdateItem }: any) {
  const isMovimentacao = type === 'movimentacao';
  return (
    <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto w-full custom-scrollbar">
        <Table className="w-full min-w-[1200px] table-fixed text-left">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow className="h-12 border-none">
              <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-slate-400 pl-8">Data</TableHead>
              <TableHead className="w-[200px] text-[10px] font-black uppercase tracking-widest text-primary">Distribuição</TableHead>
              {isMovimentacao ? (
                <>
                  <TableHead className="w-[200px] text-[10px] font-black uppercase tracking-widest text-slate-500">Destino</TableHead>
                  <TableHead className="w-[150px] text-[10px] font-black uppercase tracking-widest text-slate-500">Usuário</TableHead>
                  <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-rose-500 text-right">Débito</TableHead>
                  <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Situação</TableHead>
                  <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-slate-500 text-right pr-8">Valor Pago</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-left">Histórico/Plataforma</TableHead>
                  <TableHead className="w-[140px] text-[10px] font-black uppercase tracking-widest text-emerald-600 text-right pr-8">Volume</TableHead>
                </>
              )}
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
               <TableRow><TableCell colSpan={10} className="py-20 text-center text-slate-300 font-bold uppercase text-[11px] tracking-widest bg-slate-50/20">Nenhum registro auditado</TableCell></TableRow>
            ) : (
              data.map((row: any, i: number) => (
                <TableRow key={i} className="h-14 border-b border-slate-50 hover:bg-slate-50/50">
                  <TableCell className="pl-8 py-3"><Input value={row.data} onChange={e => onUpdateItem?.(row.id, { data: e.target.value })} className="h-10 bg-slate-50/50 border-slate-100 text-[12px] font-mono font-bold text-slate-500 rounded-xl" /></TableCell>
                  <TableCell className="px-2 py-3"><Input value={row.dist} onChange={e => onUpdateItem?.(row.id, { dist: e.target.value })} className="h-10 bg-slate-50/50 border-slate-100 text-[12px] font-mono font-bold text-primary rounded-xl text-center" /></TableCell>
                  <TableCell className="px-2 py-3"><Input value={row.destino || row.plataforma} onChange={e => onUpdateItem?.(row.id, { destino: e.target.value, plataforma: e.target.value })} className="h-10 bg-slate-50/50 border-slate-100 text-[12px] font-bold text-slate-700 rounded-xl uppercase" /></TableCell>
                  {isMovimentacao ? (
                    <>
                      <TableCell className="px-2 py-3"><Input value={row.usuarioDestino} onChange={e => onUpdateItem?.(row.id, { usuarioDestino: e.target.value })} className="h-10 bg-slate-50/50 border-slate-100 text-[11px] text-slate-500 rounded-xl" /></TableCell>
                      <TableCell className="px-2 py-3"><Input type="number" value={row.valor} onChange={e => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0 })} className="h-10 bg-rose-50/30 border-rose-100 text-[12px] font-mono font-black text-rose-500 text-right rounded-xl" /></TableCell>
                      <TableCell className="px-2 py-3">
                        <Select value={row.statusAuditoria || "Pendente"} onValueChange={(v) => onUpdateItem?.(row.id, { statusAuditoria: v })}>
                          <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 text-[10px] font-black uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent><SelectItem value="Concluido">CONCLUÍDO</SelectItem><SelectItem value="Pendente">PENDENTE</SelectItem><SelectItem value="Cancelado">CANCELADO</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-2 py-3 pr-8"><Input type="number" value={row.valorPago} onChange={e => onUpdateItem?.(row.id, { valorPago: parseFloat(e.target.value) || 0 })} className="h-10 bg-slate-50/50 border-slate-100 text-[12px] font-mono font-bold text-slate-600 text-right rounded-xl" /></TableCell>
                    </>
                  ) : (
                    <TableCell className="px-2 py-3 pr-8"><Input type="number" value={row.valor || row.disponivel} onChange={e => onUpdateItem?.(row.id, { valor: parseFloat(e.target.value) || 0, disponivel: parseFloat(e.target.value) || 0 })} className="h-10 bg-emerald-50/30 border-emerald-100 text-[12px] font-mono font-black text-emerald-600 text-right rounded-xl" /></TableCell>
                  )}
                  <TableCell className="pr-6 text-center"><Button variant="ghost" size="icon" onClick={() => onRemove?.(row.id)} className="h-10 w-10 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function QuickLink({ icon, label }: any) {
  return (
    <button className="w-full flex items-center justify-between p-5 rounded-2xl hover:bg-emerald-50 transition-all group text-left">
       <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">{icon}</div>
          <span className="text-[13px] font-black text-slate-600 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">{label}</span>
       </div>
       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

function SimpleStat({ label, value, unit }: any) {
  return (
    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
       <span className="text-[11px] font-bold text-slate-400 uppercase">{label}</span>
       <span className="text-[16px] font-black text-slate-900">{value} <span className="text-[11px] text-slate-400 font-bold">{unit}</span></span>
    </div>
  );
}

function FileCard({ label }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all cursor-pointer shadow-sm">
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
             <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
          </div>
          <span className="text-[12px] font-bold text-slate-700 uppercase">{label}</span>
       </div>
       <Badge className="bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 border-none text-[10px] font-black">PDF</Badge>
    </div>
  );
}
