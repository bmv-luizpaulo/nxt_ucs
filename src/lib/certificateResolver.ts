export interface CertificateProgramConfig {
  baseUrl: string;
  typeParam?: string;
  name: string;
}

export const CERTIFICATE_PROGRAMS: Record<string, CertificateProgramConfig> = {
  TESOURO_VERDE: {
    baseUrl: 'https://app.tesouroverde.global/#/certificate',
    name: 'Tesouro Verde'
  },
  SAAS_BMV: {
    baseUrl: 'https://app.bmvdigital.global/#/certificate',
    typeParam: 'clc',
    name: 'SaaS BMV'
  },
  SAAS_TESOURO_VERDE: {
    baseUrl: 'https://app.bmvdigital.global/#/certificate',
    typeParam: 'cdc',
    name: 'SaaS Tesouro Verde'
  }
};

export interface ResolveCertificateParams {
  code?: string;
  certificateType?: string; // from certificate.d_type
  category?: string;        // from category / subCategory query param
  nxtRef?: string;          // from nxt.ref
}

export function resolveCertificateProgram(params: ResolveCertificateParams): {
  programKey: string;
  config: CertificateProgramConfig;
} {
  const { certificateType, category, nxtRef } = params;

  // 1. Tesouro Verde
  if (
    category?.startsWith('tv_') ||
    certificateType === 'TESOURO_VERDE_CERTIFICATE' ||
    nxtRef === 'CERTIFICATE_TESOURO_VERDE'
  ) {
    return { programKey: 'TESOURO_VERDE', config: CERTIFICATE_PROGRAMS.TESOURO_VERDE };
  }

  // 2. SaaS Tesouro Verde
  if (
    category === 'akses_cert_distribuidor_credenciado' ||
    category === 'akses_cert_distribuidor_geral' ||
    category === 'akses_cert_distribuidor_financeiro' ||
    certificateType === 'DISTRIBUTOR_CERTIFICATE' ||
    nxtRef === 'CERTIFICATE_CREDENTIALED_DISTRIBUTOR' ||
    nxtRef === 'CERTIFICATE_GENERAL_DISTRIBUTOR'
  ) {
    return { programKey: 'SAAS_TESOURO_VERDE', config: CERTIFICATE_PROGRAMS.SAAS_TESOURO_VERDE };
  }

  // 3. SaaS BMV (Living Carbon, Cliente, etc.)
  if (
    category === 'akses_living_carbon' ||
    category === 'akses_cert_cliente' ||
    certificateType === 'LIVING_CARBON_CERTIFICATE' ||
    certificateType === 'CLIENT_CERTIFICATE' ||
    nxtRef === 'LIVING_CARBON_CERTIFICATE' ||
    nxtRef === 'CLIENT_CERTIFICATE'
  ) {
    return { programKey: 'SAAS_BMV', config: CERTIFICATE_PROGRAMS.SAAS_BMV };
  }

  // Default fallback
  return { programKey: 'SAAS_BMV', config: CERTIFICATE_PROGRAMS.SAAS_BMV };
}

export function resolveCertificateUrl(params: ResolveCertificateParams): string {
  const { code } = params;
  if (!code) return '';
  
  // Route to the new local dynamic page `/certificate/[code]`
  return `/certificate/${code}`;
}

export function resolveNxtTransactionUrl(transactionId?: string): string {
  if (!transactionId) return '';
  return `https://nxtportal.org/transactions/${transactionId}`;
}
