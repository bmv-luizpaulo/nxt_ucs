import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const CSV_DIR = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo');

function fixEncoding(str: string): string {
  if (!str) return '';
  try {
    const decoded = Buffer.from(str, 'latin1').toString('utf8');
    if (decoded.includes('\uFFFD') && !str.includes('\uFFFD')) {
      return str;
    }
    return decoded;
  } catch {
    return str;
  }
}

function fixRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) out[k] = fixEncoding(v);
  return out;
}

export function readCSVStream(
  file: string,
  filter?: (row: Record<string, string>) => boolean,
  limit = 200000
): Promise<Record<string, string>[]> {
  return new Promise((resolve) => {
    const filePath = path.join(CSV_DIR, file);
    if (!fs.existsSync(filePath)) return resolve([]);
    const results: Record<string, string>[] = [];
    const parser = fs.createReadStream(filePath, { encoding: 'latin1' }).pipe(csv());
    parser.on('data', (row: Record<string, string>) => {
      const fixed = fixRow(row);
      if (!filter || filter(fixed)) {
        results.push(fixed);
        if (results.length >= limit) parser.destroy();
      }
    });
    parser.on('close', () => resolve(results));
    parser.on('end', () => resolve(results));
    parser.on('error', () => resolve(results));
  });
}

export interface ResolvedCertificateData {
  certificate: {
    id: string;
    code: string;
    owner_id: string;
    amount: number;
    expiration_date: string;
    d_type: string;
    created_date: string;
  };
  owner: {
    id: string;
    name: string;
    document: string;
    type: string;
  };
  order: {
    id: string;
    created_date: string;
    status: string;
  } | null;
  certificationPeriod: {
    start: string;
    end: string;
  };
}

export async function getCertificateByCode(code: string): Promise<ResolvedCertificateData | null> {
  if (!code) return null;

  // 1. Find Certificate in dbo_certificate.csv
  const certs = await readCSVStream('dbo_certificate.csv', (row) => row.code?.toLowerCase() === code.toLowerCase(), 1);
  const certRow = certs[0];
  if (!certRow) return null;

  const certificate = {
    id: certRow.id,
    code: certRow.code,
    owner_id: certRow.owner_id,
    amount: parseFloat(certRow.amount || '0'),
    expiration_date: certRow.expiration_date,
    d_type: certRow.d_type,
    created_date: certRow.created_date,
  };

  // 2. Find Owner Role User
  let owner = {
    id: '',
    name: 'Desconhecido',
    document: '',
    type: '',
  };

  if (certificate.owner_id) {
    const roleUsers = await readCSVStream('dbo_role_user.csv', (row) => row.id === certificate.owner_id, 1);
    const roleUserRow = roleUsers[0];
    if (roleUserRow && roleUserRow.user_id) {
      const users = await readCSVStream('dbo_user.csv', (row) => row.id === roleUserRow.user_id, 1);
      const userRow = users[0];
      if (userRow) {
        owner = {
          id: userRow.id,
          name: userRow.name || `${userRow.surname || ''}`,
          document: userRow.document || '',
          type: userRow.type || '',
        };
      }
    }
  }

  // 3. Find Mapping and Certificate Order
  let order: ResolvedCertificateData['order'] = null;
  let orderId = '';
  let orderFile = '';

  // Determine which files to check based on d_type
  const dType = certificate.d_type || '';
  if (dType === 'TESOURO_VERDE_CERTIFICATE' || dType.includes('TESOURO_VERDE')) {
    const mappings = await readCSVStream('plat_tesouro_verde_certificate.csv', (row) => row.id === certificate.id, 1);
    if (mappings[0]) {
      orderId = mappings[0].certificate_order_id;
      orderFile = 'plat_tesouro_verde_certificate_order.csv';
    }
  } else if (dType === 'LIVING_CARBON_CERTIFICATE') {
    const mappings = await readCSVStream('plat_akses_living_carbon_certificate.csv', (row) => row.id === certificate.id, 1);
    if (mappings[0]) {
      orderId = mappings[0].certificate_order_id;
      orderFile = 'plat_akses_living_carbon_certificate_order.csv';
    }
  } else if (dType === 'CLIENT_CERTIFICATE') {
    const mappings = await readCSVStream('plat_akses_client_certificate.csv', (row) => row.id === certificate.id, 1);
    if (mappings[0]) {
      orderId = mappings[0].certificate_order_id;
      orderFile = 'plat_akses_client_certificate_order.csv';
    }
  } else {
    // DISTRIBUTOR_CERTIFICATE or fallback
    const mappings = await readCSVStream('plat_akses_distributor_certificate.csv', (row) => row.id === certificate.id, 1);
    if (mappings[0]) {
      orderId = mappings[0].certificate_order_id;
      orderFile = 'plat_akses_distributor_certificate_order.csv';
    }
  }

  // Fallback search across all mapping files if no orderId found yet
  if (!orderId) {
    const files = [
      { map: 'plat_tesouro_verde_certificate.csv', ord: 'plat_tesouro_verde_certificate_order.csv' },
      { map: 'plat_akses_living_carbon_certificate.csv', ord: 'plat_akses_living_carbon_certificate_order.csv' },
      { map: 'plat_akses_client_certificate.csv', ord: 'plat_akses_client_certificate_order.csv' },
      { map: 'plat_akses_distributor_certificate.csv', ord: 'plat_akses_distributor_certificate_order.csv' },
    ];
    for (const f of files) {
      const mappings = await readCSVStream(f.map, (row) => row.id === certificate.id, 1);
      if (mappings[0]) {
        orderId = mappings[0].certificate_order_id;
        orderFile = f.ord;
        break;
      }
    }
  }

  if (orderId && orderFile) {
    const orders = await readCSVStream(orderFile, (row) => row.id === orderId, 1);
    const orderRow = orders[0];
    if (orderRow) {
      order = {
        id: orderRow.id,
        created_date: orderRow.created_date,
        status: orderRow.status,
      };
    }
  }

  // 4. Calculate Certification Period
  const startRaw = order?.created_date || certificate.created_date || '';
  const endRaw = certificate.expiration_date || '';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const certificationPeriod = {
    start: formatDate(startRaw),
    end: formatDate(endRaw),
  };

  return {
    certificate,
    owner,
    order,
    certificationPeriod,
  };
}
