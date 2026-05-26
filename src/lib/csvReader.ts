import { supabaseAdmin } from './db/supabase';

// Maps database row keys back to the original CSV headers for full compatibility
function dbToCsvRow(tableName: string, dbRow: any): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, val] of Object.entries(dbRow)) {
    let csvKey = key;
    let csvVal: any = val;

    if (val === null || val === undefined) {
      csvVal = '';
    } else if (typeof val === 'boolean') {
      csvVal = val ? 't' : 'f';
    } else if (val instanceof Date) {
      csvVal = val.toISOString();
    } else {
      csvVal = String(val);
    }

    // Mapping rules
    if (tableName === 'dbo_area' && key === 'is_private') {
      csvKey = 'private';
    } else if (tableName === 'dbo_platform' && key === 'is_final_platform') {
      csvKey = 'final_platform';
    } else if (tableName === 'dbo_platform' && key === 'is_public_only') {
      csvKey = 'public_only';
    } else if (key === 'original_created_at') {
      if (tableName === 'dbo_role_user' || tableName === 'dbo_blocked_ucs' || tableName === 'plat_tesouro_verde_certificate_order') {
        csvKey = 'created_date';
      } else if (tableName === 'dbo_user') {
        csvKey = 'created_on';
      } else {
        csvKey = 'created_date';
      }
    } else if (key === 'original_updated_at') {
      if (tableName === 'dbo_account_adjustments_order') {
        csvKey = 'last_modified_date';
      } else if (tableName === 'dbo_role_user' || tableName === 'dbo_blocked_ucs' || tableName === 'plat_tesouro_verde_certificate_order') {
        csvKey = 'updated_date';
      } else {
        csvKey = 'last_modified_date';
      }
    } else if (key === 'original_created_on') {
      csvKey = 'created_on';
    } else if (key === 'original_finished_on') {
      csvKey = 'finished_on';
    } else if (key === 'original_updated_on') {
      csvKey = 'updated_on';
    } else if (tableName === 'dbo_ucs_quote' && key === 'legacy_id') {
      csvKey = 'id';
    }

    out[csvKey] = csvVal;
  }

  return out;
}

export async function readCSVStream(
  file: string,
  filter?: (row: Record<string, string>) => boolean,
  limit = 200000
): Promise<Record<string, string>[]> {
  const tableName = file.replace('.csv', '');
  
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select('*')
    .limit(limit);

  if (error) {
    console.error(`[csvReader:readCSVStream] Error fetching table ${tableName} from Supabase:`, error.message);
    return [];
  }

  if (!data) return [];

  const mappedData = data.map((dbRow: any) => dbToCsvRow(tableName, dbRow));

  if (filter) {
    return mappedData.filter(filter);
  }

  return mappedData;
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
