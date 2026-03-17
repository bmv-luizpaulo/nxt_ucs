import { Pedido, Movimento } from './types';

export const MOCK_PEDIDOS: Pedido[] = [
  {
    id: '#885',
    data: '2025-07-14T20:34:42',
    empresa: 'SUA MAQUETE DESENHO TECNICO LTDA',
    cnpj: '19.775.922/0001-07',
    programa: 'Maricá (Mumbuca Verde)',
    uf: 'RJ',
    do: true,
    quantidade: 3,
    taxa: 0,
    valorTotal: 575.04,
    hashPedido: 'AB',
    auditado: true,
    status: 'ok',
    createdAt: new Date().toISOString(),
  },
  {
    id: '#883',
    data: '2025-07-11T13:28:01',
    empresa: 'DELVAL COMERCIAL LTDDA DELVAL',
    cnpj: '58.020.989/0002-66',
    programa: 'Amapa (SEFAZ - Beneficios Fiscais)',
    uf: 'AP',
    do: true,
    quantidade: 1,
    taxa: 0,
    valorTotal: 191.68,
    hashPedido: 'AB',
    auditado: false,
    status: 'pendente',
    createdAt: new Date().toISOString(),
  },
  {
    id: '#882',
    data: '2025-07-10T11:08:03',
    empresa: 'IMPORUS COMERCIO INTERNACIONAL LTDA IMPORUS',
    cnpj: '56.385.476/0001-42',
    programa: 'Amapa (SEFAZ - Beneficios Fiscais)',
    uf: 'AP',
    do: true,
    quantidade: 1,
    taxa: 0,
    valorTotal: 191.68,
    hashPedido: 'AB',
    auditado: false,
    status: 'ok',
    createdAt: new Date().toISOString(),
  }
];

export const MOCK_MOVIMENTOS: Movimento[] = [];
