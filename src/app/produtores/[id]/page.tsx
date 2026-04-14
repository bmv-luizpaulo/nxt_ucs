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
  ChevronLeft, AlertTriangle, PlusCircle, Info, ShieldCheck, Unlock
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
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';
import { PrintPortal } from "@/components/ui/print-portal";

// Componentes Extraídos para Modularização
import { AuditReport } from "./components/AuditReport";
import { StatCard, QuickLink, DocLink, SectionBlock, PropDetail } from "./components/DashboardComponents";

// Reusing the same consolidation logic
function buildProdutores(fazendas: Fazenda[], safras: any[]): any[] {
  const map: Record<string, any> = {};
  for (const fazenda of fazendas) {
    // Busca informações da safra para esta fazenda
    const safraInfo = safras.find(s => s.fazendaId === fazenda.id || s.idf === fazenda.idf);

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
        saldoOriginacao: safraInfo?.originacao || safraInfo?.ucsTotal || fazenda.saldoOriginacao || fazenda.ucs || 0,
        safraReferencia: safraInfo?.safra ? `Safra ${safraInfo.safra}` : (fazenda.safraReferencia || fazenda.safra || '---'),
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

  const produtor = useMemo(() => {
    const all = buildProdutores(fazendas || [], safras || []);
    return all.find(p => p.id === id);
  }, [fazendas, safras, id]);

  const entRef = useMemo(() =>
    firestore && id ? doc(firestore, "produtores", id) : null,
    [firestore, id]
  );

  const { data: entityData, isLoading: isWalletLoading } = useDoc<EntidadeSaldo>(entRef);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EntidadeSaldo>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLegadoModalOpen, setIsLegadoModalOpen] = useState(false);
  const [isAquisicaoModalOpen, setIsAquisicaoModalOpen] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [manualAquisicao, setManualAquisicao] = useState({ data: '2018', valor: 0, observacao: '' });
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

  const handleProcessPaste = (targetSection: string) => {
    if (!pasteData || !pasteData.raw) return;

    const rawLines = pasteData.raw.split('\n').map(l => l.replace('\r', ''));
    const parseVal = (str: string | undefined) => parseFloat(str?.replace(/\./g, "").replace(/[^\d.-]/g, "") || "0");
    const cleanData = (str: string | undefined) => str?.split(' ')[0] || '';
    const newRows: any[] = [];

    const isMultiLineAdair = pasteData.raw.includes('UCS') && rawLines.length > 5;
    const isLegacyExport = rawLines.some(l => /^\d{4,6}\s+\d{4,6}\s+\d{2}\/\d{2}/.test(l.replace(/\t/g, ' ')));

    if (isMultiLineAdair && targetSection === 'tabelaLegado') {
      let i = 0;
      const cleanLines = rawLines.map(l => l.trim()).filter(Boolean);
      while (i < cleanLines.length) {
        const line = cleanLines[i];
        if (/^\d{2}\/\d{2}\/\d{4}/.test(line)) {
          const date = line.split(' ')[0];
          const plat = cleanLines[i + 1]?.toUpperCase() || 'DESCONHECIDO';
          // Busca a linha com UCS que deve estar nos próximos 10 registros
          let valLine = "";
          for (let j = i; j < Math.min(i + 15, cleanLines.length); j++) {
            if (cleanLines[j].includes('UCS')) {
              valLine = cleanLines[j];
              i = j; // Pula para esta linha
              break;
            }
          }
          if (valLine) {
            const vals = valLine.split(/[\t\s]{2,}|(?=UCS)/).map(v => v.replace('UCS', '').trim()).filter(Boolean).map(parseVal).slice(0, 4);
            newRows.push({
              id: `LEG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              data: date,
              plataforma: plat,
              disponivel: vals[0] || 0,
              reservado: vals[1] || 0,
              bloqueado: vals[2] || 0,
              aposentado: vals[3] || 0
            });
          }
        }
        i++;
      }
    } else if (isLegacyExport) {
      const tokens = pasteData.raw.split(/[\t\n]/).map(t => t.trim()).filter(Boolean);
      let startIndex = 0;
      for (let i = 0; i < tokens.length; i++) {
        // Detecta [ID] [DIST] e algo com '/' (Data)
        if (/^\d{1,7}$/.test(tokens[i]) && /^\d{1,8}$/.test(tokens[i + 1] || '') && (tokens[i + 2] || '').includes('/')) {
          startIndex = i;
          break;
        }
      }

      const cleanTokens = tokens.slice(startIndex);
      const records: string[][] = [];
      let currentRecord: string[] = [];

      for (let i = 0; i < cleanTokens.length; i++) {
        const t = cleanTokens[i];
        if (i > 0 && /^\d{1,7}$/.test(t) && /^\d{1,8}$/.test(cleanTokens[i + 1] || '') && (cleanTokens[i + 2] || '').includes('/')) {
          records.push(currentRecord);
          currentRecord = [];
        }
        currentRecord.push(t);
      }
      if (currentRecord.length > 0) records.push(currentRecord);

      records.forEach(rec => {
        if (rec.length < 5) return;

        const parseVal = (str: string | undefined) => {
          if (!str) return 0;
          return parseFloat(str.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
        };

        const idCol = rec[0];
        const distCol = rec[1];
        const dataCol = (rec[2] || '').split(' ')[0];

        const plataformas = ['INVESTMENT', 'TRADING', 'CUSTODIA', 'ORIGINATION', 'FARM', 'ON GOING', 'TESOURO', 'MATEUS'];
        const saldosKeywords = ['RES', 'DIS', 'APO', 'LIQ'];

        // Encontrar os índices de todas as plataformas na linha
        const platformIndices: number[] = [];
        rec.forEach((token, idx) => {
          if (idx > 1 && plataformas.includes(token.toUpperCase())) {
            platformIndices.push(idx);
          }
        });

        const origemIdx = platformIndices[0] ?? -1;
        const destinoIdx = platformIndices[1] ?? -1;

        const quantIdx = rec.findIndex(t => t.toUpperCase().includes('UCS'));
        const saldosIdx = rec.findIndex((t, idx) => idx > 2 && saldosKeywords.includes(t.toUpperCase()));
        const endOfDataIdx = saldosIdx !== -1 ? saldosIdx : quantIdx !== -1 ? quantIdx : rec.length;

        const plataformaOrigem = origemIdx !== -1 ? rec[origemIdx] : '';
        const plataformaDestino = destinoIdx !== -1 ? rec[destinoIdx] : (origemIdx !== -1 ? 'EXTERNO' : '');

        let usuarioOrigem = '';
        let usuarioDestino = '';
        let tipoUsuarioOrigem = '';
        let tipoUsuarioDestino = '';

        const userTypeKeywords = ['PRODUTOR', 'SAAS TESOURO VERDE', 'CLIENTE', 'DISTRIBUIDOR GERAL', 'IMEI', 'SAAS'];

        const processUser = (tokens: string[]) => {
          let type = '';
          let nameTokens = [...tokens];

          if (tokens.length > 0) {
            // Check for multi-token types like "Saas Tesouro Verde"
            const fullText = tokens.join(' ').toUpperCase();
            for (const kw of userTypeKeywords) {
              if (fullText.startsWith(kw)) {
                type = kw;
                // Simple attempt to remove type tokens from name
                const kwTokensCount = kw.split(' ').length;
                nameTokens = tokens.slice(kwTokensCount);
                break;
              }
            }
          }
          return { type, name: nameTokens.join(' ') };
        };

        if (origemIdx !== -1) {
          if (destinoIdx !== -1) {
            const uOrig = processUser(rec.slice(origemIdx + 1, destinoIdx));
            usuarioOrigem = uOrig.name;
            tipoUsuarioOrigem = uOrig.type;

            const uDest = processUser(rec.slice(destinoIdx + 1, endOfDataIdx));
            usuarioDestino = uDest.name;
            tipoUsuarioDestino = uDest.type;
          } else {
            const uOrig = processUser(rec.slice(origemIdx + 1, endOfDataIdx));
            usuarioOrigem = uOrig.name;
            tipoUsuarioOrigem = uOrig.type;
          }
        }

        // Se o nome do usuário capturado for uma data (Data Fim), limpa.
        if (usuarioOrigem.includes('/') && usuarioOrigem.includes(':')) {
          usuarioOrigem = '';
        }

        const valor = parseVal(quantIdx !== -1 ? rec[quantIdx] : rec[rec.length - 1]);

        // Lógica Automática de Categorização Técnica
        let tipoTransacaoDefault = 'CONSUMO';
        const uOrigClean = usuarioOrigem.trim().toUpperCase();
        const uDestClean = usuarioDestino.trim().toUpperCase();
        const platOrigClean = plataformaOrigem.trim().toUpperCase();
        const tOrigClean = (tipoUsuarioOrigem || '').trim().toUpperCase();

        // 1. Regra MATEUS ou Mesmo Produtor -> AJUSTE
        if (platOrigClean === 'MATEUS' || (uOrigClean && uDestClean && uOrigClean === uDestClean)) {
          tipoTransacaoDefault = 'AJUSTE ENTRE PLATAFORMAS';
        }
        // 2. Regra IMEI -> PRODUTOR = AJUSTE
        else if (tOrigClean === 'IMEI') {
          tipoTransacaoDefault = 'AJUSTE ENTRE PLATAFORMAS';
        }

        switch (targetSection) {
          case 'tabelaOriginacao':
            newRows.push({ id: `ORIG-${idCol}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, dist: distCol, data: dataCol, plataforma: plataformaOrigem, valor });
            break;
          case 'tabelaMovimentacao':
            newRows.push({ id: `MOV-${idCol}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, dist: distCol, data: dataCol, plataformaOrigem, usuarioOrigem, tipoUsuarioOrigem, destino: plataformaDestino, usuarioDestino, tipoUsuarioDestino, tipoTransacao: tipoTransacaoDefault, valor, statusAuditoria: 'Concluido', valorPago: 0, linkNxt: idCol, observacaoTransacao: '' });
            break;
          case 'tabelaAquisicao':
            newRows.push({ id: `AQUIS-${idCol}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, dist: distCol, data: dataCol, plataformaOrigem, usuarioOrigem, tipoUsuarioOrigem, destino: plataformaDestino, usuarioDestino, tipoUsuarioDestino, valor, statusAuditoria: 'Concluido', valorPago: 0, linkNxt: idCol, observacaoTransacao: '' });
            break;
          case 'tabelaCreditos':
            newRows.push({ id: `CRED-${idCol}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, dist: distCol, data: dataCol, plataformaOrigem, usuarioOrigem, tipoUsuarioOrigem, destino: plataformaDestino, usuarioDestino, tipoUsuarioDestino, valor, statusAuditoria: 'Concluido', valorPago: 0, linkNxt: idCol, observacaoTransacao: '' });
            break;
          case 'tabelaImei':
            newRows.push({ id: `IMEI-${idCol}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`, data: dataCol, dist: distCol, valorDebito: valor, valorCredito: 0 });
            break;
          case 'tabelaLegado':
            // Para legado, tentamos pegar os últimos 4 valores numéricos se houver
            const numVals = rec.filter(t => /^\d+([.,]\d+)?$/.test(t)).map(parseVal);
            const val4 = numVals.slice(-4); // Últimos 4 valores
            newRows.push({
              id: `LEG-${idCol}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
              dist: distCol,
              data: dataCol,
              plataforma: plataformaOrigem,
              disponivel: val4.length >= 4 ? val4[0] : valor,
              reservado: val4.length >= 4 ? val4[1] : 0,
              bloqueado: val4.length >= 4 ? val4[2] : 0,
              aposentado: val4.length >= 4 ? val4[3] : 0,
              status: 'Concluido'
            });
            break;
        }
      });
    } else {
      // Standard line-by-line parsing for Excel/Sheets templates
      const lines = rawLines.filter(l => l.trim() && !l.toLowerCase().includes('data') && !l.toLowerCase().includes('id'));
      lines.forEach(line => {
        const parseVal = (str: string | undefined) => parseFloat(str?.replace(/\./g, "").replace(/[^\d.-]/g, "") || "0");
        const cleanData = (str: string | undefined) => str?.split(' ')[0] || '';
        const parts = line.split(/\t| {2,}/).map(p => p.trim()).filter(Boolean);
        if (parts.length < 2) return;

        switch (targetSection) {
          case 'tabelaLegado':
            // Procura a data em qualquer lugar
            const dataIdx = parts.findIndex(p => p.includes('/'));
            // Pega todos os números puros
            const numVals = parts.filter(p => /^-?\d+([.,]\d+)?$/.test(p)).map(parseVal);
            // Os últimos 4 são o financeiro
            const finan = numVals.slice(-4);
            // Plataforma costuma ser o que vem depois da data ou o primeiro item não numérico
            const plat = parts.find((p, idx) => idx > (dataIdx !== -1 ? dataIdx : -1) && !/^-?\d+([.,]\d+)?$/.test(p) && p.length > 3) || parts[0];

            newRows.push({
              id: `LEG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              data: dataIdx !== -1 ? cleanData(parts[dataIdx]) : new Date().toLocaleDateString('pt-BR'),
              plataforma: plat.toUpperCase(),
              disponivel: finan.length >= 1 ? (finan.length === 4 ? finan[0] : finan[finan.length - 1]) : 0,
              reservado: finan.length === 4 ? finan[1] : 0,
              bloqueado: finan.length === 4 ? finan[2] : 0,
              aposentado: finan.length === 4 ? finan[3] : 0
            });
            break;
          case 'tabelaOriginacao':
            newRows.push({ id: `ORIG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, dist: parts[0]?.trim() || '', data: cleanData(parts[1]), plataforma: parts[2]?.trim() || '', valor: parseVal(parts[parts.length - 1]) }); break;
          case 'tabelaMovimentacao':
            newRows.push({ id: `MOV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, dist: parts[0]?.trim() || '', data: cleanData(parts[1]), destino: parts[2]?.trim() || '', usuarioDestino: parts[3]?.trim() || '', valor: parseVal(parts[6]) || parseVal(parts[4]) || 0, statusAuditoria: 'Concluido', valorPago: parseVal(parts[11]), linkNxt: parts[12]?.trim() || '', observacaoTransacao: parts[13]?.trim() || '' }); break;
        }
      });
    }

    const existingRows = (formData as any)[targetSection] || [];
    const existingSignatures = new Set(existingRows.map((r: any) =>
      `${r.data}-${r.plataforma}-${r.valor || r.disponivel}-${r.reservado || 0}`
    ));

    const finalRows = newRows.filter(row => {
      const sig = `${row.data}-${row.plataforma}-${row.valor || row.disponivel}-${row.reservado || 0}`;
      if (existingSignatures.has(sig)) return false;
      existingSignatures.add(sig);
      return true;
    });

    if (finalRows.length > 0) {
      setFormData({ ...formData, [targetSection]: [...existingRows, ...finalRows] });
      setIsEditing(true);
      toast.success(`${finalRows.length} novos registros adicionados.`);
    } else {
      toast.info("Nenhum registro novo detectado (duplicados ignorados).");
    }

    setPasteData(null);
    setIsModalOpen(false);
    setIsLegadoModalOpen(false);
  };

  const handleAddAquisicaoManual = () => {
    if (!manualAquisicao.valor || manualAquisicao.valor <= 0) {
      toast.error("Informe um volume de UCS válido.");
      return;
    }

    const newRow = {
      id: `ACQ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      data: manualAquisicao.data,
      adquirente: 'IMEI / BMTCA',
      observacao: manualAquisicao.observacao,
      status: 'CONCLUÍDO',
      valor: manualAquisicao.valor
    };

    setFormData({
      ...formData,
      tabelaAquisicao: [...(formData.tabelaAquisicao || []), newRow]
    });
    setIsEditing(true);
    setIsAquisicaoModalOpen(false);
    setManualAquisicao({ data: '2019', valor: 0, observacao: '' });
    toast.success("Aquisição registrada com sucesso.");
  };

  const currentStats = {
    originacao: (isEditing ? formData.tabelaOriginacao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) : (entityData?.tabelaOriginacao?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || entityData?.originacao || 0)) || 0,
    movimentacao: (isEditing ? formData.tabelaMovimentacao?.reduce((acc: number, cur: any) => {
      const isFinancial = cur.tipoTransacao === 'CONSUMO' || !cur.tipoTransacao;
      return isFinancial ? acc + (Number(cur.valor) || 0) : acc;
    }, 0) : (entityData?.tabelaMovimentacao?.reduce((acc: number, cur: any) => {
      const isFinancial = cur.tipoTransacao === 'CONSUMO' || !cur.tipoTransacao;
      return isFinancial ? acc + (Number(cur.valor) || 0) : acc;
    }, 0) || entityData?.movimentacao || 0)) || 0,
    legado: (isEditing ? formData.tabelaLegado : entityData?.tabelaLegado)?.reduce((acc: number, cur: any) => acc + (Number(cur.disponivel || 0) + Number(cur.reservado || 0)), 0) || 0,
    bloqueado: Number(isEditing ? formData.ajusteManualVolume : entityData?.ajusteManualVolume) < 0
      ? (Number(isEditing ? formData.originacao : entityData?.originacao) - (Number(isEditing ? formData.movimentacao : entityData?.movimentacao) || 0) - (Number(isEditing ? formData.aquisicao : entityData?.aquisicao) || 0))
      : ((isEditing ? formData.tabelaLegado : entityData?.tabelaLegado)?.reduce((acc: number, cur: any) => acc + (Number(cur.bloqueado) || 0), 0) || 0),
    aposentado: (isEditing ? formData.tabelaLegado : entityData?.tabelaLegado)?.reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0) || 0,
    imei: ((isEditing ? formData.tabelaImei : entityData?.tabelaImei) || [])?.reduce((acc: number, cur: any) => acc + (Number(cur.valorDebito || 0) - Number(cur.valorCredito || 0)), 0) || 0
      + ((isEditing ? formData.tabelaMovimentacao : entityData?.tabelaMovimentacao) || [])?.reduce((acc: number, cur: any) =>
        cur.tipoTransacao === 'IMEI / CUSTODIA' ? acc + (Number(cur.valor) || 0) : acc, 0) || 0,
    aquisicao: (isEditing ? formData.tabelaAquisicao : entityData?.tabelaAquisicao)?.reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0) || 0,
    creditos: (isEditing ? formData.tabelaCreditos?.reduce((acc: number, cur: any) => {
      const isFinancial = cur.tipoTransacao === 'CONSUMO' || !cur.tipoTransacao;
      return isFinancial ? acc + (Number(cur.valor) || 0) : acc;
    }, 0) : (entityData?.tabelaCreditos?.reduce((acc: number, cur: any) => {
      const isFinancial = cur.tipoTransacao === 'CONSUMO' || !cur.tipoTransacao;
      return isFinancial ? acc + (Number(cur.valor) || 0) : acc;
    }, 0) || entityData?.creditos || 0)) || 0,
    ajusteManual: Number(isEditing ? formData.ajusteManualVolume : entityData?.ajusteManualVolume) || 0,
    entrada: 0,
    saldoReal: 0,
  };
  currentStats.entrada = currentStats.originacao + currentStats.creditos;
  currentStats.saldoReal = currentStats.entrada - currentStats.movimentacao - currentStats.aquisicao - currentStats.bloqueado - currentStats.aposentado + currentStats.ajusteManual;

  // Se houver ajuste de neutralização (bloqueio integral), forçamos o saldo disponível a zero para evitar negativos
  if (currentStats.ajusteManual < 0 && currentStats.saldoReal !== 0) {
    currentStats.saldoReal = 0;
  }
  const imeiAnalysis = useMemo(() => {
    const movTable = (isEditing ? formData.tabelaMovimentacao : entityData?.tabelaMovimentacao) || [];
    const credTable = (isEditing ? formData.tabelaCreditos : entityData?.tabelaCreditos) || [];
    const imeiTable = (isEditing ? formData.tabelaImei : entityData?.tabelaImei) || [];

    const totalCapturado = movTable.reduce((acc: number, cur: any) =>
      cur.tipoTransacao === 'IMEI / CUSTODIA' ? acc + (Number(cur.valor) || 0) : acc, 0);

    const retornadoCreditos = credTable.reduce((acc: number, cur: any) =>
      cur.tipoTransacao === 'IMEI / CUSTODIA' ? acc + (Number(cur.valor) || 0) : acc, 0);

    const retornadoImei = imeiTable.reduce((acc: number, cur: any) =>
      acc + (Number(cur.valorCredito) || 0), 0);

    const totalRetornado = retornadoCreditos + retornadoImei;

    return {
      totalCapturado,
      totalRetornado,
      pendente: Math.max(0, totalCapturado - totalRetornado),
      emDivergencia: totalCapturado > totalRetornado,
      temBloqueio: currentStats.bloqueado > 0,
      inconsistenciaBloqueio: totalRetornado > 0 && currentStats.bloqueado > 0
    };
  }, [isEditing, formData, entityData, currentStats.bloqueado]);

  const divergenciaLegado = currentStats.saldoReal - currentStats.legado;

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
        creditos: currentStats.creditos,
        bloqueado: currentStats.bloqueado,
        aposentado: currentStats.aposentado,
        saldoAjustarImei: currentStats.imei,
        saldoFinalAtual: currentStats.saldoReal,
        ajusteManualVolume: formData.ajusteManualVolume || 0,
        ajusteManualJustificativa: formData.ajusteManualJustificativa || "",
        comentariosAuditoria: formData.comentariosAuditoria || "",
        updatedAt: new Date().toISOString()
      });
      toast.success("Perfil técnico atualizado!");
      setIsEditing(false);
    } catch (error) { toast.error("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify({
      produtor,
      stats: currentStats,
      tabelas: isEditing ? formData : entityData,
      exportDate: new Date().toISOString()
    }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `auditoria-${produtor.nome?.toLowerCase().replace(/\s+/g, '-')}-${id}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("Dados exportados com sucesso!");
  };

  const handleExportXLSX = () => {
    // 1. Planilha de Resumo por Fazenda
    const resumoData = produtor.fazendas.map((f: any, i: number) => {
      const farmOrig = Number(f.saldoOriginacao) || 0;
      const totalConsumo = currentStats.movimentacao;
      const farmCount = produtor.fazendas.length;
      const baseDeduction = Math.floor(totalConsumo / farmCount);
      const remainder = totalConsumo % farmCount;
      const farmDeduction = i < remainder ? baseDeduction + 1 : baseDeduction;

      const farmAquisicao = (entityData?.tabelaAquisicao || [])?.filter((item: any) =>
        produtor.fazendas.length === 1 ||
        item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
        f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
      ).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);

      const farmAposentado = (entityData?.tabelaLegado || [])?.filter((item: any) =>
        produtor.fazendas.length === 1 ||
        item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
        f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
      ).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0);

      const liquid = farmOrig - farmDeduction - farmAquisicao - farmAposentado;

      return {
        "Fazenda": f.fazendaNome,
        "IDF": f.idf,
        "Safra": f.safraReferencia,
        "Originação Total (UCS)": farmOrig,
        "Dedução Consumo (UCS)": farmDeduction,
        "Aquisição ADM (UCS)": farmAquisicao,
        "Manual/Aposentado (UCS)": farmAposentado,
        "Saldo Líquido (UCS)": liquid
      };
    });

    // 2. Planilha de Extrato Consolidado
    const allTs = [
      ...(entityData?.tabelaOriginacao || []).map((t: any) => ({ ...t, Tipo: 'ORIGINAÇÃO', Sign: '+' })),
      ...(entityData?.tabelaCreditos || []).map((t: any) => ({ ...t, Tipo: 'CRÉDITO ADM', Sign: '+' })),
      ...(entityData?.tabelaMovimentacao || []).map((t: any) => ({ ...t, Tipo: 'CONSUMO / SAÍDA', Sign: '-' })),
      ...(entityData?.tabelaAquisicao || []).map((t: any) => ({ ...t, Tipo: 'AQUISIÇÃO', Sign: '-' })),
      ...(entityData?.tabelaImei || []).map((t: any) => ({ ...t, Tipo: 'AJUSTE IMEI', Sign: t.valorDebito > 0 ? '-' : '+', valor: t.valorDebito || t.valorCredito })),
      ...(entityData?.tabelaLegado || []).map((t: any) => ({ ...t, Tipo: 'RESERVA LEGADA', Sign: '-', valor: Number(t.aposentado || 0) + Number(t.bloqueado || 0) }))
    ].filter(t => t.data).sort((a, b) => b.data.split('/').reverse().join('-').localeCompare(a.data.split('/').reverse().join('-')));

    const extratoData = allTs.map(t => ({
      "Data": t.data,
      "Operação": t.Tipo,
      "Propriedade/Dist": t.dist || 'GERAL',
      "Plataforma/Destino": t.plataforma || t.destino || t.plataformaOrigem || 'CUSTÓDIA DIRETA',
      "Volume (UCS)": `${t.Sign}${Math.floor(t.valor || t.disponivel || 0)}`,
      "Status": t.statusAuditoria || t.status || 'CONCLUÍDO'
    }));

    const wb = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    const wsExtrato = XLSX.utils.json_to_sheet(extratoData);

    XLSX.utils.book_append_sheet(wb, wsResumo, "Particionamento");
    XLSX.utils.book_append_sheet(wb, wsExtrato, "Extrato Técnico");

    XLSX.writeFile(wb, `auditoria-completa-${produtor.nome?.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
    toast.success("Arquivo XLSX Completo disponível!");
  };

  if (isFazendasLoading || isWalletLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  if (!produtor) return <div className="min-h-screen flex items-center justify-center">Produtor não encontrado.</div>;
  return (
    <>
      <div id="main-app-ui" className="flex min-h-screen bg-[#F8FAFC] print:hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
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

                  <div className="flex items-center gap-8 bg-white/5 border border-white/10 p-4 px-8 rounded-[2rem] backdrop-blur-xl shrink-0">
                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Originação</p>
                        <p className="text-[14px] font-black text-emerald-500 leading-none">{Math.floor(currentStats.originacao).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-1">Créditos</p>
                        <p className="text-[14px] font-black text-emerald-400 leading-none">+{Math.floor(currentStats.creditos).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-[7px] font-black text-rose-500/60 uppercase tracking-widest mb-1">Consumo</p>
                        <p className="text-[14px] font-black text-rose-500 leading-none">{Math.floor(currentStats.movimentacao).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-1">Aquisição</p>
                        <p className="text-[14px] font-black text-indigo-400 leading-none">-{Math.floor(currentStats.aquisicao).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-[7px] font-black text-amber-500/60 uppercase tracking-widest mb-1">Bloqueado</p>
                        <p className="text-[14px] font-black text-amber-500 leading-none">{Math.floor(currentStats.bloqueado).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Aposentado</p>
                        <p className="text-[14px] font-black text-slate-400 leading-none">{Math.floor(currentStats.aposentado).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="w-px h-10 bg-white/10 mx-2" />

                    <div className="bg-emerald-500/20 px-6 py-3 rounded-2xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                      <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-1 text-center">Saldo Disponível</p>
                      <div className="flex items-baseline justify-center gap-1.5">
                        <p className="text-[22px] font-black text-emerald-400 leading-none">
                          {Math.floor(currentStats.saldoReal).toLocaleString('pt-BR')}
                        </p>
                        <span className="text-[8px] font-black text-emerald-600">UCS</span>
                      </div>
                    </div>
                  </div>

                  {Math.abs(divergenciaLegado) > 1 && (
                    <div className="absolute -bottom-10 right-4 flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full backdrop-blur-sm">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                        Divergência Legado: {Math.floor(divergenciaLegado).toLocaleString('pt-BR')} UCS
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ÁREA DE SCROLL DO CONTEÚDO */}
              <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
                <div className="p-10 space-y-8 pb-32">
                  <div className="space-y-6">
                    <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-widest flex gap-2 items-center"><MapIcon className="w-4 h-4" /> Portfólio de Propriedades</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {produtor.fazendas.map((f: any, i: number) => {
                        const farmOrig = Number(f.saldoOriginacao) || 0;

                        const totalConsumo = currentStats.movimentacao;
                        const farmCount = produtor.fazendas.length;
                        const baseDeduction = Math.floor(totalConsumo / farmCount);
                        const remainder = totalConsumo % farmCount;
                        const farmDeduction = i < remainder ? baseDeduction + 1 : baseDeduction;

                        const farmAquisicao = (entityData?.tabelaAquisicao || [])?.filter((item: any) =>
                          produtor.fazendas.length === 1 ||
                          item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
                          f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
                        ).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);

                        const farmAposentado = (entityData?.tabelaLegado || [])?.filter((item: any) =>
                          produtor.fazendas.length === 1 ||
                          item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
                          f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
                        ).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0);

                        const legadaValue = farmOrig - farmDeduction - farmAquisicao - farmAposentado;

                        return (
                          <div key={i} className="contents">
                            <div onClick={() => router.push(`/fazendas?search=${encodeURIComponent(f.fazendaNome)}`)} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group cursor-pointer shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
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

                            <div className="bg-[#0B0F1A] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full -mr-24 -mt-24 blur-3xl opacity-20" />
                              <div className="relative z-10 h-full flex flex-col justify-between space-y-8">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Originação Legada</h4>
                                    <div className="space-y-2">
                                      <p className="text-[13px] font-black text-white uppercase leading-tight line-clamp-1">{f.fazendaNome}</p>
                                      <div className="flex flex-col gap-1.5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">IDF: <span className="text-emerald-400">{f.idf}</span></p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Safra {f.safraReferencia}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                                    <Droplets className="w-4 h-4" />
                                  </div>
                                </div>

                                <div className="space-y-3 py-4 border-y border-white/5">
                                  <div className="flex justify-between items-center text-slate-400">
                                    <span className="text-[8px] font-black uppercase tracking-widest">Originação Total (Safra)</span>
                                    <span className="text-[11px] font-black">{Math.floor(farmOrig).toLocaleString('pt-BR')} <span className="text-[8px] opacity-40 ml-1">UCS</span></span>
                                  </div>
                                  <div className="flex justify-between items-center text-rose-500/80">
                                    <span className="text-[8px] font-black uppercase tracking-widest">Dedução (Consumo)</span>
                                    <span className="text-[11px] font-black">-{Math.floor(farmDeduction).toLocaleString('pt-BR')} <span className="text-[8px] opacity-40 ml-1">UCS</span></span>
                                  </div>
                                  {farmAquisicao > 0 && (
                                    <div className="flex justify-between items-center text-indigo-400/80">
                                      <span className="text-[8px] font-black uppercase tracking-widest">Aquisição (Certificados)</span>
                                      <span className="text-[11px] font-black">-{Math.floor(farmAquisicao).toLocaleString('pt-BR')} <span className="text-[8px] opacity-40 ml-1">UCS</span></span>
                                    </div>
                                  )}
                                  {farmAposentado > 0 && (
                                    <div className="flex justify-between items-center text-slate-500">
                                      <span className="text-[8px] font-black uppercase tracking-widest">Reserva (Aposentado)</span>
                                      <span className="text-[11px] font-black">-{Math.floor(farmAposentado).toLocaleString('pt-BR')} <span className="text-[8px] opacity-40 ml-1">UCS</span></span>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-6 border-t border-white/5 flex items-end justify-between">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[28px] font-black text-white tracking-tighter leading-none">{Math.floor(legadaValue).toLocaleString('pt-BR')}</span>
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">UCS</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[7px] font-black text-slate-500 uppercase mb-0.5">Vlr Líquido Técnico</p>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-md text-[7px] font-black p-0 px-1 leading-normal uppercase">Auditado</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-widest flex gap-2 items-center"><Calculator className="w-4 h-4" /> Particionamento Técnico de Saldos</h3>
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-100 h-10">
                            <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-8">Propriedade</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center">Originação</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center">Consumo</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center">Aquisição</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center">Aposentado</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-slate-900 text-right pr-8">Saldo Líquido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {produtor.fazendas.map((f: any, i: number) => {
                            const farmOrig = Number(f.saldoOriginacao) || 0;
                            const totalConsumo = currentStats.movimentacao;
                            const farmCount = produtor.fazendas.length;
                            const baseDeduction = Math.floor(totalConsumo / farmCount);
                            const remainder = totalConsumo % farmCount;
                            const farmDeduction = i < remainder ? baseDeduction + 1 : baseDeduction;

                            const farmAquisicao = (entityData?.tabelaAquisicao || [])?.filter((item: any) =>
                              produtor.fazendas.length === 1 ||
                              item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
                              f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
                            ).reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);

                            const farmAposentado = (entityData?.tabelaLegado || [])?.filter((item: any) =>
                              produtor.fazendas.length === 1 ||
                              item.dist?.toUpperCase().includes(f.fazendaNome?.toUpperCase()) ||
                              f.fazendaNome?.toUpperCase().includes(item.dist?.toUpperCase())
                            ).reduce((acc: number, cur: any) => acc + (Number(cur.aposentado) || 0), 0);

                            const liquid = farmOrig - farmDeduction - farmAquisicao - farmAposentado;

                            return (
                              <TableRow key={i} className="h-12 border-b border-slate-50 hover:bg-slate-50/50">
                                <TableCell className="pl-8 text-[11px] font-black text-slate-800 uppercase">{f.fazendaNome}</TableCell>
                                <TableCell className="text-center text-[11px] font-bold text-slate-500">{Math.floor(farmOrig).toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-center text-[11px] font-bold text-rose-500">-{farmDeduction.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-center text-[11px] font-bold text-indigo-500">-{farmAquisicao.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-center text-[11px] font-bold text-slate-400">-{farmAposentado.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-right pr-8 text-[12px] font-black text-emerald-600">{Math.floor(liquid).toLocaleString('pt-BR')} UCS</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                          <History className="w-5 h-5" />
                        </div>
                        <h4 className="text-[14px] font-black uppercase text-slate-800">Resumo Legado & Conciliação</h4>
                      </div>
                      <div className="space-y-4">
                        <PropDetail label="Saldo auditado disponível" value={`${Math.floor(currentStats.saldoReal).toLocaleString('pt-BR')} UCS`} highlight />
                        <PropDetail label="Saldo (Legado)" value={`${Math.floor(currentStats.legado).toLocaleString('pt-BR')} UCS`} />
                        <div className="flex justify-between items-center py-2 bg-amber-50 rounded-xl px-4 border border-amber-100">
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">UCS Bloqueadas</span>
                          <span className="text-[14px] font-black text-amber-700">-{Math.floor(currentStats.bloqueado).toLocaleString('pt-BR')}</span>
                        </div>
                        {currentStats.ajusteManual !== 0 && (
                          <div className="flex justify-between items-center py-2 bg-slate-100 rounded-xl px-4 border border-slate-200 italic">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ajuste Manual Aplicado</span>
                              <span className="text-[7px] text-slate-400 uppercase font-bold">{formData.ajusteManualJustificativa || 'Sem justificativa'}</span>
                            </div>
                            <span className="text-[14px] font-black text-slate-900">{currentStats.ajusteManual > 0 ? '+' : ''}{currentStats.ajusteManual.toLocaleString('pt-BR')}</span>
                          </div>
                        )}
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Divergência Técnica</span>
                          <Badge className={cn(
                            "text-[12px] font-black px-4 py-1 rounded-full",
                            Math.abs(divergenciaLegado) < 1 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {Math.floor(divergenciaLegado).toLocaleString('pt-BR')} UCS
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#394054] p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-6 text-white text-left overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck className="w-32 h-32 text-white" />
                      </div>
                      <div className="flex items-center gap-3 text-left relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-[14px] font-black uppercase text-white">Status de Auditoria Externo</h4>
                      </div>
                      <p className="text-[11px] font-medium text-slate-100 leading-relaxed italic text-left relative z-10 max-w-[90%]">
                        "A BMV atesta que, após verificação técnica e auditoria das camadas de originação e movimentação histórica, o titular possui a devida custódia das UCs citadas."
                      </p>
                    </div>
                  </div>

                   {/* Bloco de Conciliação Técnica IMEI */}
                   <div className="bg-[#394054]/5 p-8 rounded-[2.5rem] border border-[#394054]/10 space-y-6 relative overflow-hidden mb-8">
                     <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                       <History className="w-32 h-32 text-[#394054]" />
                     </div>
 
                     <div className="flex items-center justify-between relative z-10">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-[#394054] flex items-center justify-center text-white">
                           <History className="w-5 h-5" />
                         </div>
                         <div>
                           <h4 className="text-[14px] font-black uppercase text-[#394054]">Conciliação de Custódia IMEI</h4>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ciclo Histórico 2018 → 2024</p>
                         </div>
                       </div>
                       {imeiAnalysis.emDivergencia ? (
                         <Badge className="bg-rose-500 text-white border-transparent text-[8px] font-black uppercase tracking-widest px-3 py-1">Divergência Detectada</Badge>
                       ) : (
                         <Badge className="bg-emerald-500 text-white border-transparent text-[8px] font-black uppercase tracking-widest px-3 py-1">Conciliado</Badge>
                       )}
                     </div>
 
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                       <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Capturado (2018)</p>
                         <p className="text-sm font-black text-slate-700">{Math.floor(imeiAnalysis.totalCapturado).toLocaleString('pt-BR')} <span className="text-[9px] text-slate-300">UCS</span></p>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Retornado (2023/24)</p>
                         <p className="text-sm font-black text-emerald-600">+{Math.floor(imeiAnalysis.totalRetornado).toLocaleString('pt-BR')} <span className="text-[9px] text-emerald-300">UCS</span></p>
                       </div>
                       <div className={cn(
                         "p-4 rounded-2xl border shadow-sm transition-all",
                         imeiAnalysis.emDivergencia ? "bg-rose-50 border-rose-100 shadow-rose-100/50" : "bg-slate-50 border-slate-100"
                       )}>
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Saldo em Aberto</p>
                         <p className={cn(
                           "text-sm font-black",
                           imeiAnalysis.emDivergencia ? "text-rose-600" : "text-slate-400"
                         )}>
                           {Math.floor(imeiAnalysis.pendente).toLocaleString('pt-BR')} <span className="text-[9px] opacity-50">UCS</span>
                         </p>
                       </div>
                     </div>
 
                     {/* Banner de Diagnóstico Unificado - UX Refresh */}
                     {(imeiAnalysis.emDivergencia || imeiAnalysis.inconsistenciaBloqueio || imeiAnalysis.totalRetornado > 0) && 
                      (isEditing ? !formData.ajusteManualVolume : !entityData?.ajusteManualVolume) && (
                       <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 relative z-20 ${
                         imeiAnalysis.emDivergencia 
                            ? "bg-[#E73052]/10 border-[#E73052]/20 shadow-lg shadow-[#E73052]/5" 
                            : imeiAnalysis.inconsistenciaBloqueio
                            ? "bg-[#F39C12]/10 border-[#F39C12]/20 shadow-lg shadow-amber-500/5"
                            : "bg-emerald-500/10 border-emerald-500/20"
                       }`}>
                         <div className="flex items-center gap-4 text-left">
                           <div className={`p-3 rounded-xl ${
                             imeiAnalysis.emDivergencia ? "bg-[#E73052]" : 
                             imeiAnalysis.inconsistenciaBloqueio ? "bg-[#F39C12]" : 
                             "bg-emerald-500"
                           }`}>
                             <AlertTriangle className={`w-6 h-6 ${imeiAnalysis.emDivergencia || !imeiAnalysis.inconsistenciaBloqueio ? "text-white" : "text-[#231F20]"}`} />
                           </div>
                           <div className="flex flex-col text-left">
                              <h4 className={`text-[12px] font-black uppercase tracking-wider mb-1 text-left ${
                                imeiAnalysis.emDivergencia ? "text-[#E73052]" : 
                                imeiAnalysis.inconsistenciaBloqueio ? "text-[#231F20]" : 
                                "text-emerald-600"
                              }`}>
                                {imeiAnalysis.emDivergencia ? "Divergência de Custódia Detectada" : 
                                 imeiAnalysis.inconsistenciaBloqueio ? "Inconsistência de Bloqueio" : 
                                 "Liberação de Custódia Disponível"}
                              </h4>
                              <p className="text-[11px] text-[#231F20]/70 font-medium leading-relaxed max-w-[600px] text-left">
                                {imeiAnalysis.emDivergencia 
                                  ? `Identificamos ${Math.floor(imeiAnalysis.pendente).toLocaleString('pt-BR')} UCS capturadas em 2018 que ainda não retornaram à conta. Escolha a tratativa de ajuste:`
                                  : imeiAnalysis.inconsistenciaBloqueio
                                  ? "O retorno de custódia IMEI gerou saldo disponível indevido em uma conta que possui restrição integral (16/03/2023)."
                                  : `O volume retornado da IMEI (${Math.floor(imeiAnalysis.totalRetornado).toLocaleString('pt-BR')} UCS) está pendente de liberação manual para a carteira.`}
                              </p>
                           </div>
                         </div>
 
                         <div className="flex gap-3 shrink-0">
                           {imeiAnalysis.emDivergencia ? (
                             <>
                               <Button 
                                 onClick={() => {
                                   const saldoParaZerar = currentStats.originacao + (currentStats.creditos || 0) - (currentStats.movimentacao || 0) - (currentStats.aquisicao || 0);
                                   setFormData({
                                     ...formData,
                                     ajusteManualVolume: -saldoParaZerar,
                                     ajusteManualJustificativa: `SANEAMENTO SOBERANO: Conta restrita (16/03/2023). Integrando estorno IMEI (${Math.floor(imeiAnalysis.pendente)} UCS) e consolidando patrimônio total de ${Math.floor(saldoParaZerar).toLocaleString('pt-BR')} UCS em BLOQUEIO INTEGRAL.`
                                   });
                                   toast.success("Patrimônio Consolidado no Bloqueio.");
                                 }}
                                 className="bg-white border-2 border-[#E73052] text-[#E73052] hover:bg-[#E73052] hover:text-white text-[10px] font-black uppercase h-10 px-6 rounded-xl transition-all"
                               >
                                 Ajustar e Bloquear Integralmente
                               </Button>
                               <Button 
                                 onClick={() => {
                                   setFormData({
                                     ...formData,
                                     ajusteManualVolume: imeiAnalysis.pendente,
                                     ajusteManualJustificativa: `AJUSTE DE EQUILÍBRIO: Estorno manual do saldo pendente de custódia IMEI (${Math.floor(imeiAnalysis.pendente)} UCS) para a conta do produtor.`
                                   });
                                   toast.success("Ajuste de Equilíbrio IMEI preparado.");
                                 }}
                                 className="bg-[#231F20] text-white hover:bg-[#231F20]/80 text-[10px] font-black uppercase h-10 px-6 rounded-xl"
                               >
                                 Ajustar e Liberar (Equilibrar Saldo)
                               </Button>
                             </>
                           ) : imeiAnalysis.inconsistenciaBloqueio ? (
                             <Button 
                               onClick={() => {
                                 const saldoParaZerar = currentStats.originacao + (currentStats.creditos || 0) - (currentStats.movimentacao || 0) - (currentStats.aquisicao || 0);
                                 setFormData({
                                   ...formData,
                                   ajusteManualVolume: -saldoParaZerar,
                                   ajusteManualJustificativa: `BLOQUEIO INTEGRAL: Neutralização de saldo disponível indevido para conformidade técnica com restrição de 2023.`
                                 });
                                 toast.success("Bloqueio Integral Configurado.");
                               }}
                               className="bg-[#231F20] text-white hover:bg-[#231F20]/80 text-[10px] font-black uppercase h-10 px-6 rounded-xl"
                             >
                               PROMOVER BLOQUEIO INTEGRAL
                             </Button>
                           ) : (
                              <Button 
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    ajusteManualVolume: imeiAnalysis.totalRetornado,
                                    ajusteManualJustificativa: "LIBERAÇÃO DE CUSTÓDIA: Volume retornado da IMEI integrado ao saldo disponível após auditoria técnica."
                                  });
                                  toast.success("Liberação preparada.");
                                }}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black uppercase h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/20"
                              >
                                LIBERAR SALDO IMEI
                              </Button>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
             
             {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#394054] flex items-center justify-center text-white">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <h4 className="text-[14px] font-black uppercase text-white">00. Ajustes Técnicos de Conformidade</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase">Volume de Ajuste (UCS)</Label>
                      <Input
                        type="number"
                        value={formData.ajusteManualVolume || 0}
                        onChange={(e) => setFormData({ ...formData, ajusteManualVolume: Number(e.target.value) })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                        placeholder="Ex: -500 ou 1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase">Justificativa do Ajuste</Label>
                      <Input
                        value={formData.ajusteManualJustificativa || ""}
                        onChange={(e) => setFormData({ ...formData, ajusteManualJustificativa: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                        placeholder="Motivo técnico do ajuste..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-[14px] font-black uppercase text-slate-800">Comentários de Auditoria</h4>
                  </div>
                  <Textarea
                    value={formData.comentariosAuditoria || ""}
                    onChange={(e) => setFormData({ ...formData, comentariosAuditoria: e.target.value })}
                    placeholder="Notas técnicas que aparecerão no dossiê final..."
                    className="min-h-[120px] bg-slate-50 border-slate-100 rounded-2xl p-4 text-[13px] font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-12">
              <SectionBlock
                title="01. ORIGINAÇÃO (DISTRIBUIÇÃO DE SAFRA)"
                value={currentStats.originacao}
                data={isEditing ? (formData.tabelaOriginacao || []) : (entityData?.tabelaOriginacao || [])}
                type="originacao"
                isGreen
                isEditing={isEditing}
                onRemove={(id: string) => handleRemoveItem('tabelaOriginacao', id)}
                onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaOriginacao', id, updates)}
              />

              <SectionBlock
                title="02. Créditos Auditados"
                type="creditos"
                isGreen
                isEditing={isEditing}
                value={currentStats.creditos}
                data={isEditing ? (formData.tabelaCreditos || []) : (entityData?.tabelaCreditos || [])}
                onPaste={() => { setPasteData({ section: 'tabelaCreditos', raw: '' }); setIsModalOpen(true); }}
                onRemove={(id: string) => handleRemoveItem('tabelaCreditos', id)}
                onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaCreditos', id, updates)}
              />

              <SectionBlock
                title="03. Movimentação (Saídas)"
                type="movimentacao"
                isNegative
                isEditing={isEditing}
                value={currentStats.movimentacao}
                data={isEditing ? (formData.tabelaMovimentacao || []) : (entityData?.tabelaMovimentacao || [])}
                onPaste={() => { setPasteData({ section: 'tabelaMovimentacao', raw: '' }); setIsModalOpen(true); }}
                onRemove={(id: string) => handleRemoveItem('tabelaMovimentacao', id)}
                onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaMovimentacao', id, updates)}
              />

              <SectionBlock
                title="04. Saldo Legado (Histórico)"
                type="legado"
                isAmber
                isEditing={isEditing}
                value={currentStats.legado}
                data={isEditing ? (formData.tabelaLegado || []) : (entityData?.tabelaLegado || [])}
                onPaste={() => { setPasteData({ section: 'tabelaLegado', raw: '' }); setIsLegadoModalOpen(true); }}
                onRemove={(id: string) => handleRemoveItem('tabelaLegado', id)}
                onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaLegado', id, updates)}
              />

              <SectionBlock
                title="05. Vendas Antecipadas (AQUISIÇÃO ADM)"
                type="aquisicao"
                isNegative
                customColor="bg-indigo-500"
                isEditing={isEditing}
                value={currentStats.aquisicao}
                data={isEditing ? (formData.tabelaAquisicao || []) : (entityData?.tabelaAquisicao || [])}
                onPaste={() => { setPasteData({ section: 'tabelaAquisicao', raw: '' }); setIsAquisicaoModalOpen(true); }}
                pasteLabel="Novo Lançamento ADM"
                onRemove={(id: string) => handleRemoveItem('tabelaAquisicao', id)}
                onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaAquisicao', id, updates)}
              />

              <SectionBlock
                title="06. Ajustes IMEI (Técnico)"
                type="imei"
                isNegative
                isEditing={isEditing}
                value={currentStats.imei}
                data={isEditing ? (formData.tabelaImei || []) : (entityData?.tabelaImei || [])}
                onPaste={() => { setPasteData({ section: 'tabelaImei', raw: '' }); setIsModalOpen(true); }}
                onRemove={(id: string) => handleRemoveItem('tabelaImei', id)}
                onUpdateItem={(id: string, updates: any) => handleUpdateItem('tabelaImei', id, updates)}
              />
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
                <div className="p-10 space-y-10 pb-32 font-sans">
                  {!isEditing ? (
                    <>
                      <div className="space-y-3">
                        <QuickLink
                          icon={<Calculator className="w-5 h-5" />}
                          label="Ativar Modo Auditoria"
                          onClick={() => setIsEditing(true)}
                        />
                        <QuickLink
                          icon={<FileText className="w-5 h-5" />}
                          label="Visualizar Dossiê (PDF)"
                          onClick={() => setIsReportPreviewOpen(true)}
                        />
                        <QuickLink
                          icon={<Calculator className="w-5 h-5" />}
                          label="Planilha de Saldos (XLSX)"
                          onClick={handleExportXLSX}
                        />
                        <QuickLink
                          icon={<Download className="w-5 h-5" />}
                          label="Base de Dados (JSON)"
                          onClick={handleExportJSON}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all gap-3 shadow-lg shadow-emerald-100">
                        <Save className="w-4 h-4" /> {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button onClick={() => { setIsEditing(false); setFormData(entityData || {}); }} variant="ghost" className="w-full h-12 rounded-2xl text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all">Cancelar</Button>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200/60 pb-4">Performance Técnica</h4>
                    <div className="space-y-5">
                      <StatCard label="Hectares Monitorados" value={produtor.totalAreaHa.toLocaleString('pt-BR')} unit="ha" />
                      <StatCard label="Inserções Realizadas" value={(entityData?.tabelaOriginacao?.length || 0).toString()} unit="un" />
                      <StatCard label="Safras Vinculadas" value={new Set(entityData?.tabelaOriginacao?.map((i: any) => i.plataforma)).size.toString()} unit="ano" />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Legais</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <DocLink label="CCIR Consolidado" />
                      <DocLink label="CAR (Todas Fazendas)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

    {/* MODALS REUTILIZADOS */ }
    <Dialog open={isAquisicaoModalOpen} onOpenChange={setIsAquisicaoModalOpen}>
      <DialogContent className="max-w-md rounded-[32px] p-0 border-none bg-white font-sans">
        <div className="bg-indigo-600 p-8 pb-12">
          <DialogTitle className="text-white">Nova Aquisição ADM</DialogTitle>
        </div>
        <div className="p-8 -mt-8 bg-white rounded-t-[32px] space-y-6">
          <Input placeholder="Ano" value={manualAquisicao.data} onChange={e => setManualAquisicao({ ...manualAquisicao, data: e.target.value })} />
          <Input placeholder="Volume" type="number" value={manualAquisicao.valor} onChange={e => setManualAquisicao({ ...manualAquisicao, valor: parseFloat(e.target.value) || 0 })} />
          <Button onClick={handleAddAquisicaoManual} className="w-full h-12 bg-indigo-600">Lançar Registro</Button>
        </div>
      </DialogContent>
          </Dialog>

          <Dialog open={!!pasteData} onOpenChange={() => setPasteData(null)}>
            <DialogContent className="max-w-3xl rounded-[32px] p-8">
              <DialogTitle className="text-xl font-black uppercase">Estação de Ingestão de Dados</DialogTitle>
              <Textarea
                className="min-h-[300px] mt-4 font-mono text-xs"
                placeholder="Cole as colunas aqui..."
                value={pasteData?.raw || ''}
                onChange={e => setPasteData({ ...pasteData!, raw: e.target.value })}
              />
              <div className="flex justify-end mt-6">
                <Button onClick={() => handleProcessPaste(pasteData?.section || '')} className="bg-emerald-600 px-8">Processar Dados</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isLegadoModalOpen} onOpenChange={setIsLegadoModalOpen}>
            <DialogContent className="max-w-2xl p-8 rounded-[32px]">
               <DialogTitle className="uppercase font-black">Histórico Legado</DialogTitle>
               <Textarea
                 className="min-h-[200px] mt-4 font-mono text-xs"
                 placeholder="ID DATA PLATAFORMA DISP RES BLOQ APO"
                 onChange={e => setPasteData({ section: 'tabelaLegado', raw: e.target.value })}
               />
               <Button onClick={() => handleProcessPaste('tabelaLegado')} className="mt-4 w-full bg-amber-600">Importar Legado</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={isReportPreviewOpen} onOpenChange={setIsReportPreviewOpen}>
            <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col p-0 rounded-[32px] border-none bg-slate-100 no-print">
              <div className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm font-black uppercase text-slate-800 tracking-tight">Preview do Dossiê Técnico</DialogTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Revise as informações antes da exportação oficial</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-emerald-100">
                    <Download className="w-4 h-4" /> Confirmar e Gerar PDF
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-100 custom-scrollbar">
                <div className="bg-white shadow-2xl rounded-sm mx-auto">
                    <AuditReport 
                        produtor={produtor} 
                        entityData={entityData} 
                        currentStats={currentStats} 
                        currentUser={userData || user}
                        isPreview={true}
                    />
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </div>
 
      {/* Motor de Impressão Profissional (Versão de Fundo - Via Portal) */}
      <PrintPortal>
        <div className="is-printable-wrapper">
          <AuditReport
            produtor={produtor}
            entityData={isEditing ? formData : entityData}
            currentStats={currentStats}
            currentUser={userData || user}
          />
        </div>
      </PrintPortal>
    </>
  );
}


