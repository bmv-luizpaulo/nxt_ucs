export interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'investidor' | 'produtor' | 'auditor' | string;
  avatar?: string;
  status?: 'ativo' | 'inativo' | 'pendente' | string;
  ultimoAcesso?: string;
  createdAt: string;
  cargo?: string;
  cpf?: string;
}

export type AppUser = User;

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CADASTRO_AUDITOR'
  | 'EDICAO_AUDITOR'
  | 'REMOCAO_AUDITOR'
  | 'AJUSTE_IMEI'
  | 'EXPORTACAO_PDF'
  | 'EXPORTACAO_CSV'
  | 'RESET_SENHA'
  | 'ATUALIZACAO_PERFIL'
  | 'SINCRONIZACAO';

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  target: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

export type OrderStatus = 'ok' | 'pendente' | 'cancelado' | 'erro';
export type ReportType = 'executive' | 'juridico';

export interface AuditReportMetadata {
  id: string;
  title?: string;
  description?: string;
  icon?: any;
  category?: string;
  template?: 'executive' | 'juridico' | 'consolidated';
  type?: ReportType;
  date?: string;
  userName?: string;
  userEmail?: string;
}

export interface FazendaProprietario {
  nome: string;
  documento: string;    // CPF ou CNPJ
  percentual: number;   // % de participação sobre a terra
  tipo?: 'PF' | 'PJ';
  razaoSocial?: string;
  nomeResponsavel?: string;
}

export interface Fazenda {
  id: string;
  idf: string;           // Identificação da Fazenda (IDF)
  nome: string;          // Nome da Fazenda
  nucleo: string;        // Núcleo (Ex: Xingu Mata Viva)
  nucleoCnpj?: string;    // CNPJ do Núcleo
  municipio: string;     // Município
  uf: string;            // Estado
  latitude?: string;
  longitude?: string;
  lat?: number | string;
  long?: number | string;
  
  // Áreas
  areaTotal: number;
  areaVegetacao?: number;
  areaConsolidada?: number;
  areaUsoAntropico?: number;
  tipoArea?: string;      // Privado, etc
  
  // Produtores / Proprietários (Derivado)
  proprietarios: FazendaProprietario[];

  // Documentação
  isin?: string;
  status: 'ativa' | 'inativa' | 'pendente';
  observacao?: string;
  hashOriginacao?: string;
  ucs?: number;
  safra?: string;
  dataRegistro?: string;
  createdAt: string;
  updatedAt?: string;

  // Geometria (importado do KML)
  polygonCoordinates?: { lon: number; lat: number }[]; 
  
  // Campos de Auditoria
  saldoOriginacao?: number;
  safraReferencia?: string;
}

// Safra: Distribuição de UCS por Ano e por Entidade (Produtor, Associação, IMEI)
export interface SafraDistribuicao {
  id: string;
  fazendaId: string;
  fazendaNome: string;
  idf: string;
  ano: number;           // Ano de Referência
  ucsTotal: number;      // UCS Total da Fazenda (100%)
  isin?: string;
  hashOrigination?: string;
  
  // 1. Produtor
  produtorNome: string;
  produtorDoc: string;   
  produtorPct: number;
  produtorSaldo: number;

  // 2. Associação
  associacaoNome: string;
  associacaoCnpj: string;
  associacaoPct: number;
  associacaoSaldo: number;

  // 3. IMEI (Institutos/Entidades)
  imeiNome: string;
  imeiCnpj: string;
  imeiPct: number;
  imeiSaldo: number;

  createdAt: string;
  updatedAt?: string;
}

export type OrderCategory = 'selo' | 'Saas_Tesouro_Verde' | 'Saas_BMV';

// Tipos para Pedidos e Movimentações (Dashboard)
export interface Pedido {
  id: string;
  data: string;
  empresa: string;
  cnpj: string;
  quantidade: number;
  taxa: number;
  valorTotal: number;
  status: OrderStatus;
  categoria: string;
  usuarioId: string;
  origem?: string;
  programa?: string;
  modo?: string;
  linkNxt?: string;
  hashPedido?: string;
  linkCertificado?: string;
  auditado?: boolean;
  uf?: string;
  do?: boolean;
  createdAt: string;

  // ── KPIs de Impacto Ambiental ──────────────────────────
  nucleo?: string;                  // Nome do núcleo/localidade
  validade?: string;                // Data de validade do certificado

  // Relatório de Impacto Direto
  kpiPessoas?: number;              // Número de pessoas
  kpiEnergiaKwh?: number;           // Consumo Anual de Energia Elétrica (kWh)
  kpiAguaM3?: number;               // Consumo Anual de Água (m³)
  kpiEtanolL?: number;              // Consumo Anual de Etanol (litros)
  kpiGasolinaL?: number;            // Consumo Anual de Gasolina (litros)
  kpiDieselL?: number;              // Consumo Anual de Diesel (litros)
  kpiGnvM3?: number;                // Consumo Anual de GNV (m³)
  kpiJetfuelL?: number;             // Consumo Anual de Jetfuel (litros)
  kpiLixoT?: number;                // Consumo Anual de Lixo (toneladas)
  kpiAreaM2?: number;               // Área Ocupada (m²)
  kpiLenhaT?: number;               // Consumo de Lenha (toneladas)

  // KPIs – Impacto Positivo
  kpiFlorestaNativaM2?: number;     // Preservação vegetação nativa (m²)
  kpiCarbonoTCO2e?: number;         // Carbono estocado (tCO2e)
  kpiFaunaHa?: number;              // Espécies de fauna (Unidade/ha)
  kpiFloraHa?: number;              // Espécies de flora (Unidade/ha)
  kpiMadeiraM3?: number;            // Preservação de madeira (m³)
  kpiProducaoApoiadaM2?: number;    // Área de produção apoiada (m²)
  kpiHidrologicoLAno?: number;      // Regulação do ciclo hidrológico (l/ano)
  kpiRecuperacaoAreaM2?: number;    // Apoio a recuperação de área (m²)
}


export interface Movimento {
  id: string;
  pedidoId: string;
  tipo: string;
  origem: string;
  destino: string;
  quantidade: number;
  data?: string;
  duplicado?: boolean;
  validado?: boolean;
  createdAt: string;
}

export type EntityStatus = 'disponivel' | 'bloqueado' | 'inapto';
export type AuditoriaStatus = 'Concluido' | 'Cancelado' | 'Pendente' | 'valido' | 'inconsistente';

export interface RegistroTabela {
  id: string;
  data: string;
  plataforma?: string;
  dist?: string;
  valor?: number;
  destino?: string;
  usuarioDestino?: string;
  plataformaOrigem?: string;
  usuarioOrigem?: string;
  tipoUsuarioOrigem?: string;
  tipoUsuarioDestino?: string;
  statusAuditoria?: AuditoriaStatus;
  dataPagamento?: string;
  linkComprovante?: string;
  valorPago?: number;
  linkNxt?: string;
  observacaoTransacao?: string;
  disponivel?: number;
  reservado?: number;
  bloqueado?: number;
  aposentado?: number;
  valorCredito?: number;
  valorDebito?: number;
  rastreabilidade?: { fazenda: string; valor: number }[];
}

export interface EntidadeSaldo {
  id: string;
  nome: string;
  documento: string;
  status: EntityStatus;
  statusAuditoriaSaldo?: 'valido' | 'inconsistente';
  safra: string;
  
  // Saldos e Particionamento
  particionamento?: number;
  saldoParticionado?: number;
  originacao?: number;
  originacaoFazendaTotal?: number;
  movimentacao: number;
  aquisicao: number;
  creditos: number;
  saldoAjustarImei: number;
  transferenciaImei?: number;
  estornoImei?: number;
  saldoLegadoTotal: number;
  aposentado: number;
  bloqueado: number;
  saldoFinalAtual: number;
  
  balance?: number;
  
  // Propriedade
  propriedade?: string;
  idf?: string;
  nucleo?: string;
  areaTotal?: number;
  areaVegetacao?: number;
  dataRegistro?: string;
  lat?: number | string;
  long?: number | string;
  isin?: string;
  hashOriginacao?: string;
  observacaoFazenda?: string;
  observacao?: string;
  
  // Tabelas
  tabelaOriginacao: RegistroTabela[];
  tabelaMovimentacao: RegistroTabela[];
  tabelaAquisicao: RegistroTabela[];
  tabelaCreditos: RegistroTabela[];
  tabelaLegado: RegistroTabela[];
  tabelaImei: RegistroTabela[];
  
  // Ajuste Manual
  ajusteRealizado?: boolean;
  valorAjusteManual?: number;
  justificativaAjuste?: string;
  ajusteManualVolume?: number;
  ajusteManualJustificativa?: string;
  comentariosAuditoria?: string;
  usuarioAjuste?: string;
  dataAjuste?: string;
  
  // Entidades Vinculadas
  associacaoNome?: string;
  associacaoCnpj?: string;
  associacaoParticionamento?: number;
  associacaoSaldo?: number;
  imeiNome?: string;
  imeiCnpj?: string;
  imeiParticionamento?: number;
  imeiSaldo?: number;
  
  // Auditoria
  updatedAt?: string;
  createdAt?: string;

  // UI helper
  isGroup?: boolean;
  // Auditoria e Motor de Partição
  isAuditRecord?: boolean;
  categoria?: "fazenda" | "participante" | string;
  tipo?: "produtor" | "associacao" | "imei" | string;
  entidade?: string;
  volumeContextual?: number;
}

export interface EntidadeSaldoGroup {
  id: string;
  nome: string;
  isGroup: true;
  type: 'associacao' | 'imei' | 'nucleo' | 'fazenda';
  items: EntidadeSaldo[];
}

export interface Certificado {
  id: string;
  codigo: string;
  fazendaId: string;
  produtorId: string;
  volumeUCS: number;
  anoSafra: number;
  dataEmissao: string;
  status: 'valido' | 'cancelado' | 'expirado';
  pdfUrl?: string;
}
