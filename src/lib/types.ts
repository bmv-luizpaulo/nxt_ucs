export type OrderStatus = 'pendente' | 'ok' | 'erro';
export type MovementType = 'gov' | 'cliente' | 'outro';
export type OrderCategory = 'selo' | 'certificado_sas' | 'sas_dmv';

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
  auditado: boolean;
  status: OrderStatus;
  categoria: OrderCategory;
  createdAt: string;
  movimentos?: Movimento[];
}
