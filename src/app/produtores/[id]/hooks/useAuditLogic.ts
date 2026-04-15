import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
// Assumindo que processAuditPaste retorna um array de objetos genéricos compatíveis com AuditRow
import { processAuditPaste } from "../utils/auditParsers";

// ==========================================
// TIPAGENS
// ==========================================
export interface AuditRow {
  id: string;
  valor?: string | number;
  credito?: string | number;
  debito?: string | number;
  bloqueado?: string | number;
  aposentado?: string | number;
  disponivel?: string | number;
  reservado?: string | number;
  tipoTransacao?: string;
  linkNxt?: string;
  data?: string;
  plataforma?: string;
  destino?: string;
  origem?: string;
  [key: string]: any; // Fallback flexível para outros campos que o parser possa retornar
}

export interface AuditData {
  originacao?: string | number;
  saldoFinalAtual?: string | number;
  movimentacao?: string | number;
  aquisicao?: string | number;
  creditos?: string | number;
  imei?: string | number;
  legado?: string | number;
  ajusteManual?: string | number;
  tabelaOriginacao?: AuditRow[];
  tabelaMovimentacao?: AuditRow[];
  tabelaAquisicao?: AuditRow[];
  tabelaCreditos?: AuditRow[];
  tabelaImei?: AuditRow[];
  tabelaLegado?: AuditRow[];
}

export interface AuditStats {
  originacao: number;
  creditos: number;
  movimentacao: number;
  aquisicao: number;
  imei: number;
  legado: number;
  bloqueado: number;
  aposentado: number;
  ajusteManual: number;
  saldoBruto: number;   // antes do bloqueio
  saldoReal: number;    // após deduzir bloqueado
}

// Helper interno para conversão segura de números, evitando NaN
const num = (val: any): number => Number(val) || 0;

/**
 * Função pura para calcular as estatísticas de auditoria.
 * Otimizada para performance e aderente às regras de negócio de UCS.
 */
export function calculateAuditStats(data: AuditData | null, baseOriginacao: number = 0): AuditStats {
  if (!data) return {
    originacao: baseOriginacao, creditos: 0, movimentacao: 0, aquisicao: 0, imei: 0,
    legado: 0, bloqueado: 0, aposentado: 0, ajusteManual: 0,
    saldoBruto: baseOriginacao, saldoReal: baseOriginacao
  };

  // Prioridade Máxima: 1. Soma da tabela, 2. Campo 'originacao' salvo, 3. Campo 'saldoFinalAtual'
  const originacaoFromTable = (data.tabelaOriginacao && data.tabelaOriginacao.length > 0)
    ? data.tabelaOriginacao.reduce((acc, cur) => {
        if (cur.tipoTransacao === 'AJUSTE_PLATAFORMA') return acc;
        return acc + num(cur.valor);
      }, 0)
    : null;

  const originacao = originacaoFromTable !== null
    ? originacaoFromTable 
    : (num(data.originacao) || num(data.saldoFinalAtual) || baseOriginacao);
  
  const movimentacao = data.tabelaMovimentacao?.reduce((acc, cur) => {
    // Ignora ajustes entre plataformas e tipos não financeiros
    if (cur.tipoTransacao === 'AJUSTE_PLATAFORMA') return acc;
    const isFinancial = cur.tipoTransacao === 'CONSUMO' || !cur.tipoTransacao;
    return isFinancial ? acc + num(cur.valor) : acc;
  }, 0) || num(data.movimentacao);

  const aquisicao = data.tabelaAquisicao?.reduce((acc, cur) => acc + num(cur.valor), 0) || num(data.aquisicao);
  
  const creditos = data.tabelaCreditos?.reduce((acc, cur) => {
    if (cur.tipoTransacao === 'AJUSTE_PLATAFORMA') return acc;
    return acc + num(cur.valor);
  }, 0) || num(data.creditos);
  
  const imei = data.tabelaImei?.reduce((acc, cur) => acc + num(cur.credito) - num(cur.debito), 0) || num(data.imei);
  
  // Regra de Negócio: 'disponivel' e 'reservado' são apenas para referência visual. 
  // Apenas 'bloqueado' e 'aposentado' contam para a auditoria matemática do estado legado.
  const legado = data.tabelaLegado?.reduce((acc, cur) => acc + num(cur.bloqueado) + num(cur.aposentado), 0) || num(data.legado);

  const bloqueado = data.tabelaLegado?.reduce((acc, cur) => acc + num(cur.bloqueado), 0) || 0;
  const aposentado = data.tabelaLegado?.reduce((acc, cur) => acc + num(cur.aposentado), 0) || 0;

  const ajusteManual = num(data.ajusteManual);
  
  // FÓRMULA FINAL:
  // movimentacao já é negativo (valores de débito na tabela são negativos, ex: -93/linha)
  // então usamos + movimentacao (soma o valor já negativo = deduz)
  // aquisicao e aposentado são quantidades positivas → subtraímos explicitamente
  // bloqueado → deduzido do total, NÃO distribuído por fazenda
  const saldoBruto = Math.floor(
    originacao + creditos + movimentacao - aquisicao - aposentado + imei + ajusteManual
  );
  const saldoReal = Math.max(0, saldoBruto - bloqueado);


  return {
    originacao,
    creditos,
    movimentacao,
    aquisicao,
    imei,
    legado,
    bloqueado,
    aposentado,
    ajusteManual,
    saldoBruto,
    saldoReal
  };
}

export function useAuditLogic(entityData: AuditData | null, baseOriginacao: number = 0) {
  const [formData, setFormData] = useState<AuditData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza o formData com entityData apenas no carregamento inicial
  useEffect(() => {
    if (entityData && !formData) {
      setFormData(entityData);
    }
  }, [entityData, formData]);

  const currentData = isEditing ? formData : entityData;

  // Memoizado para performance pesada (recalcula apenas quando tabelas/dados mudam)
  const currentStats = useMemo(() => calculateAuditStats(currentData, baseOriginacao), [currentData, baseOriginacao]);

  const handleUpdateItem = (section: keyof AuditData, id: string, updates: Partial<AuditRow>) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const list = [...(prev[section] as AuditRow[] || [])];
      const idx = list.findIndex(i => i.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        return { ...prev, [section]: list };
      }
      return prev;
    });
    setIsEditing(true);
  };

  const handleRemoveItem = (section: keyof AuditData, id: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: (prev[section] as AuditRow[] || []).filter(i => i.id !== id)
      };
    });
    setIsEditing(true);
  };

  const handleProcessPaste = (targetSection: keyof AuditData, rawText: string) => {
    const newRows: AuditRow[] = processAuditPaste(targetSection, rawText);
    
    setFormData((prev) => {
      if (!prev) return prev;
      const existingRows = (prev[targetSection] as AuditRow[]) || [];
      
      // Helper para extrair a assinatura única da linha e prevenir dados duplicados
      const getRowSignature = (r: AuditRow) => {
        if (r.linkNxt) return `LNX-${r.linkNxt}`;
        
        // Inclui ID e DIST na assinatura se existirem, para diferenciar lançamentos no mesmo dia/valor
        const identity = `${r.id || ''}-${r.dist || ''}`;
        const time = r.data || '';
        const place = r.plataforma || r.destino || r.origem || '';
        const values = `${num(r.valor)}-${num(r.disponivel)}-${num(r.debito)}-${num(r.reservado)}-${num(r.credito)}`;
        
        return `${identity}-${time}-${place}-${values}`;
      };

      const existingSignatures = new Set(existingRows.map(getRowSignature));

      const finalRows = newRows.filter(row => {
        const sig = getRowSignature(row);
        if (existingSignatures.has(sig)) return false;
        existingSignatures.add(sig);
        return true;
      });

      if (finalRows.length > 0) {
        toast.success(`${finalRows.length} novos registros adicionados.`);
        setIsEditing(true);
        return { ...prev, [targetSection]: [...existingRows, ...finalRows] };
      } else {
        toast.info("Nenhum registro novo detectado (duplicados ignorados).");
        return prev;
      }
    });

    return true; 
  };

  return {
    formData,
    setFormData,
    isEditing,
    setIsEditing,
    isSaving,
    setIsSaving,
    currentData,
    currentStats,
    handleUpdateItem,
    handleRemoveItem,
    handleProcessPaste,
    handleAddItem: (section: keyof AuditData) => {
      const newRow: AuditRow = {
        id: `MAN-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
        data: new Date().toLocaleDateString('pt-BR'),
        plataforma: 'NXT',
        valor: 0,
        tipoTransacao: section === 'tabelaOriginacao' ? 'ORIGINACAO' : (section === 'tabelaCreditos' ? 'CREDITO' : 'CONSUMO')
      };
      setFormData(prev => {
        if (!prev) return prev;
        return { ...prev, [section]: [...(prev[section] as AuditRow[] || []), newRow] };
      });
      setIsEditing(true);
    }
  };
}