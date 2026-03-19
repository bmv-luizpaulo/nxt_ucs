export type OrderStatus = 'pendente' | 'ok' | 'erro';
export type MovementType = 'gov' | 'cliente' | 'outro';
export type OrderCategory = 'selo' | 'Saas_Tesouro_Verde' | 'Saas_BMV';
export type EntityStatus = 'disponivel' | 'bloqueado' | 'inapto';
export type AuditoriaStatus = 'Pendente' | 'Não Pago' | 'Pago';
export type UserRole = 'admin' | 'auditor' | 'viewer';
export type UserStatus = 'ativo' | 'suspenso' | 'pendente';

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  ultimoAcesso: string;
  createdAt: string;
}

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
  do: boolean;
  quantidade: number;
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
  id?: string;
  dist?: string;
  data: string;
  destino?: string;
  valor?: number;
  valorCredito?: number;
  valorDebito?: number;
  tipo?: string;
  status?: string;
  prioridade?: number;
  plataforma?: string;
  disponivel?: number;
  reservado?: number;
  bloqueado?: number;
  aposentado?: number;
  statusAuditoria?: AuditoriaStatus | string;
  linkComprovante?: string;
}

export interface EntidadeSaldo {
  id: string;
  nome: string;
  documento: string;
  
  // Totais Consolidados
  originacao: number;
  movimentacao: number; 
  aposentado: number;
  bloqueado: number;
  aquisicao: number;
  saldoAjustarImei: number;
  saldoLegadoTotal: number;
  saldoFinalAtual: number; 
  
  // Tabelas de Lançamentos
  tabelaOriginacao?: RegistroTabela[];
  tabelaMovimentacao?: RegistroTabela[];
  tabelaImei?: RegistroTabela[];
  tabelaAquisicao?: RegistroTabela[];
  tabelaLegado?: RegistroTabela[];

  // Auditoria e Apontamentos
  observacao?: string;
  statusAuditoriaSaldo?: 'valido' | 'inconsistente';

  status: EntityStatus;
  createdAt: string;
}
