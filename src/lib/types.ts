export type OrderStatus = 'pendente' | 'ok' | 'erro';
export type MovementType = 'gov' | 'cliente' | 'outro';
export type OrderCategory = 'selo' | 'Saas_Tesouro_Verde' | 'Saas_BMV';
export type EntityStatus = 'disponivel' | 'bloqueado' | 'inapto';
export type AuditoriaStatus = 'Pendente' | 'Não Pago' | 'Pago';

export interface Movimento {
  id: string;
  pedidoId: string;
  raw: string;
  hashMovimento: string;
  tipo: MovementType;
  origem: string;
  destino: string;
  quantidade: number;
  duplicado: boolean;
  validado: boolean;
  createdAt: string;
}

export interface Pedido {
  id: string;
  data: string;
  empresa: string;
  cnpj: string;
  programa: string;
  uf: string;
  do: boolean; // Dispositivo de Origem
  quantidade: number; // UCS
  taxa: number;
  valorTotal: number;
  hashPedido: string;
  linkNxt: string;
  auditado: boolean;
  status: OrderStatus;
  categoria: OrderCategory;
  createdAt: string;
}

export interface RegistroTabela {
  dist?: string;
  data: string;
  destino?: string;
  valor: number;
  valorCredito?: number;
  valorDebito?: number;
  situacao?: string;
  ano?: string;
  plataforma?: string;
  nome?: string;
  documento?: string;
  disponivel?: number;
  reservado?: number;
  bloqueado?: number;
  aposentado?: number;
  statusAuditoria?: AuditoriaStatus;
  linkComprovante?: string;
}

export interface EntidadeSaldo {
  id: string;
  nome: string; // Usuário
  documento: string; // Documento
  
  // Seção: Saldo Atualizado
  originacao: number;
  movimentacao: number; 
  aposentado: number;
  bloqueado: number;
  aquisicao: number;
  saldoAjustarImei: number;
  saldoFinalAtual: number; 
  
  // Seção: Saldo Legado
  saldoLegadoTotal: number;
  
  // Tabelas de Histórico
  tabelaOriginacao?: RegistroTabela[];
  tabelaMovimentacao?: RegistroTabela[];
  tabelaImei?: RegistroTabela[];
  tabelaAquisicao?: RegistroTabela[];
  tabelaLegado?: RegistroTabela[];

  // Informações Adicionais
  cprs: string;
  bmtca: string;
  statusBmtca: string;
  desmate: string;
  valorAjustar: number; 
  status: EntityStatus;
  createdAt: string;
}
