import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const CSV_DIR = path.resolve(process.cwd(), 'docs/banco_legado_csvs_completo');

function fixEncoding(str: string): string {
  if (!str) return '';
  try { return Buffer.from(str, 'latin1').toString('utf8'); } catch { return str; }
}

function fixRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) out[k] = fixEncoding(v);
  return out;
}

function readCSVStream(
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

// ─── Domain handlers ──────────────────────────────────────────────────────────

async function handleAreas(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const isPrivate = searchParams.get('private');

  const [areas, yearlyInfo] = await Promise.all([
    readCSVStream('dbo_area.csv', (row) => {
      if (isPrivate !== null && row.private !== (isPrivate === 'true' ? 't' : 'f')) return false;
      if (!search) return true;
      return row.name?.toLowerCase().includes(search) || row.code?.includes(search);
    }),
    readCSVStream('dbo_yearly_area_info.csv'),
  ]);

  // Group yearly info by area_id (get latest year per area)
  const yearlyMap: Record<string, Record<string, string>> = {};
  for (const y of yearlyInfo) {
    const id = y.area_id;
    if (!yearlyMap[id] || parseInt(y.year) > parseInt(yearlyMap[id].year)) {
      yearlyMap[id] = y;
    }
  }

  const enriched = areas.map(a => ({
    ...a,
    latestYearlyInfo: yearlyMap[a.id] || null,
  }));

  const total = enriched.length;
  const rows = enriched.slice((page - 1) * pageSize, page * pageSize);
  return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

async function handleUsers(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const profileId = searchParams.get('profileId') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const dateInicio = searchParams.get('dateInicio') || '';
  const dateFim = searchParams.get('dateFim') || '';
  
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const [
    users,
    roleUsers,
    authentications,
    userAddresses,
    addresses,
    cities,
    states,
    countries,
    userSystems
  ] = await Promise.all([
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_authentication.csv'),
    readCSVStream('dbo_rl_user_address.csv'),
    readCSVStream('dbo_address.csv'),
    readCSVStream('dbo_city.csv'),
    readCSVStream('dbo_state.csv'),
    readCSVStream('dbo_country.csv'),
    readCSVStream('dbo_rl_user_system.csv'),
  ]);

  // Map authentications by id
  const authMap: Record<string, string> = {};
  for (const auth of authentications) {
    if (auth.id) {
      authMap[auth.id] = auth.email || '';
    }
  }

  // Map userAddress by user_id
  const userAddressMap: Record<string, string> = {};
  for (const ua of userAddresses) {
    if (ua.user_id) {
      userAddressMap[ua.user_id] = ua.address_id || '';
    }
  }

  // Map address by id
  const addressMap: Record<string, Record<string, string>> = {};
  for (const addr of addresses) {
    if (addr.id) {
      addressMap[addr.id] = addr;
    }
  }

  // Map city by id
  const cityMap: Record<string, Record<string, string>> = {};
  for (const city of cities) {
    if (city.id) {
      cityMap[city.id] = city;
    }
  }

  // Map state by id
  const stateMap: Record<string, Record<string, string>> = {};
  for (const state of states) {
    if (state.id) {
      stateMap[state.id] = state;
    }
  }

  // Map country by id
  const countryMap: Record<string, Record<string, string>> = {};
  for (const country of countries) {
    if (country.id) {
      countryMap[country.id] = country;
    }
  }

  // Map userSystem by user_id
  const systemMap: Record<string, string[]> = {};
  for (const us of userSystems) {
    if (us.user_id && us.system_type) {
      if (!systemMap[us.user_id]) systemMap[us.user_id] = [];
      systemMap[us.user_id].push(us.system_type);
    }
  }

  // Map roleUser by user_id
  const roleMap: Record<string, Record<string, string>[]> = {};
  for (const ru of roleUsers) {
    if (ru.user_id) {
      if (!roleMap[ru.user_id]) roleMap[ru.user_id] = [];
      roleMap[ru.user_id].push(ru);
    }
  }

  const enriched: any[] = users.map(u => {
    const authEmail = u.authentication_id ? authMap[u.authentication_id] : '';
    const addressId = userAddressMap[u.id];
    let postalCode = '';
    let street = '';
    let complement = '';
    let neighborhood = '';
    let cityName = '';
    let stateName = '';
    let countryName = '';

    if (addressId) {
      const addr = addressMap[addressId];
      if (addr) {
        postalCode = addr.postal_code || '';
        street = addr.street || '';
        complement = addr.complement || '';
        neighborhood = addr.neighborhood || '';
        const cityId = addr.city_id;
        const countryId = addr.country_id;

        if (cityId) {
          const cityObj = cityMap[cityId];
          if (cityObj) {
            cityName = cityObj.name || '';
            const stateId = cityObj.state_id;
            if (stateId) {
              stateName = stateMap[stateId]?.name || '';
            }
          }
        }
        if (countryId) {
          countryName = countryMap[countryId]?.name || '';
        }
      }
    }

    return {
      ...u,
      email: authEmail || u.email || '',
      systems: systemMap[u.id] || [],
      roles: roleMap[u.id] || [],
      primaryRole: (roleMap[u.id] || [])[0]?.role || '—',
      postal_code: postalCode,
      street,
      complement,
      neighborhood,
      city_name: cityName,
      state_name: stateName,
      country_name: countryName,
    };
  });

  // Calculate global totals before filtering
  let totalUsers = enriched.length;
  let activeUsers = enriched.filter(u => u.status === 'ACTIVE').length;
  let inactiveUsers = enriched.filter(u => u.status === 'INACTIVE').length;

  let filtered = enriched;

  if (role) {
    filtered = filtered.filter(u => u.roles.some((r: Record<string, string>) => r.role === role));
  }

  if (status) {
    filtered = filtered.filter(u => u.status === status);
  }

  if (search) {
    filtered = filtered.filter(u =>
      u.id === search ||
      `${u.name} ${u.surname}`.toLowerCase().includes(search) ||
      u.document?.includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  }

  if (profileId) {
    filtered = filtered.filter(u =>
      u.roles.some((r: Record<string, string>) => r.id === profileId)
    );
  }

  if (dateInicio) {
    filtered = filtered.filter(u => {
      const d = u.created_on ? u.created_on.substring(0, 10) : '';
      return d >= dateInicio;
    });
  }

  if (dateFim) {
    filtered = filtered.filter(u => {
      const d = u.created_on ? u.created_on.substring(0, 10) : '';
      return d <= dateFim;
    });
  }

  // Sort by id descending
  filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const total = filtered.length;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Unique roles for filter dropdown
  const allRoles = [...new Set(roleUsers.map(r => r.role).filter(Boolean))].sort();

  return {
    rows,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    allRoles,
    summary: {
      totalUsers,
      activeUsers,
      inactiveUsers
    }
  };
}

async function handleHarvests(searchParams: URLSearchParams) {
  const year = searchParams.get('year') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const [harvests, areas, distributions, users, roleUsers] = await Promise.all([
    readCSVStream('dbo_harvest.csv', year ? (row) => row.year === year : undefined),
    readCSVStream('dbo_area.csv'),
    readCSVStream('dbo_distribution.csv', (row) => row.type === 'PARTITION_HARVEST'),
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
  ]);

  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const roleUserMap: Record<string, { name: string; document: string; role: string }> = {};
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
    roleUserMap[ru.id] = {
      name: fixEncoding(name),
      document: u.document || '—',
      role: ru.role,
    };
  }

  const distMap: Record<string, Record<string, string>> = {};
  for (const d of distributions) {
    if (d.harvest_id) {
      distMap[d.harvest_id] = d;
    }
  }

  const areaMap: Record<string, any> = {};
  for (const a of areas) {
    const ownerRoleUser = roleUserMap[a.owner_id] || null;
    const assocRoleUser = roleUserMap[a.association_id] || null;

    let nucleo = '';
    let association = '';
    if (assocRoleUser) {
      if (assocRoleUser.name.toUpperCase().includes('MATA VIVA')) {
        nucleo = assocRoleUser.name;
      } else {
        association = assocRoleUser.name;
      }
    }

    areaMap[a.id] = {
      ...a,
      name: fixEncoding(a.name),
      owner_name: ownerRoleUser?.name || '—',
      association_name: association || '—',
      nucleo_name: nucleo || '—',
    };
  }

  const enriched = harvests.map(h => {
    const dist = distMap[h.id] || null;
    return {
      ...h,
      area: areaMap[h.area_id] || null,
      distribution: dist,
    };
  });

  // Stats by year
  const byYear: Record<string, { count: number; totalUcs: number }> = {};
  for (const h of harvests) {
    if (!byYear[h.year]) byYear[h.year] = { count: 0, totalUcs: 0 };
    byYear[h.year].count++;
    byYear[h.year].totalUcs += parseFloat(h.amount || '0');
  }

  const total = enriched.length;
  const rows = enriched.slice((page - 1) * pageSize, page * pageSize);
  const years = [...new Set(harvests.map(h => h.year))].sort((a, b) => b.localeCompare(a));

  return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, byYear, years };
}

async function handleOrders(searchParams: URLSearchParams) {
  const category = searchParams.get('category') || 'akses_cert_distribuidor';
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  if (category === 'tv_dare_royalties') {
    const [dareRoyalties, tvOrders, users, roleUsers] = await Promise.all([
      readCSVStream('plat_tesouro_verde_dare_royalties.csv'),
      readCSVStream('plat_tesouro_verde_certificate_order.csv'),
      readCSVStream('dbo_user.csv'),
      readCSVStream('dbo_role_user.csv'),
    ]);

    // Build lookup maps
    const userMap: Record<string, Record<string, string>> = {};
    for (const u of users) userMap[u.id] = u;
    const roleUserMap: Record<string, { user: Record<string, string>; role: string }> = {};
    for (const ru of roleUsers) {
      const u = userMap[ru.user_id] || {};
      roleUserMap[ru.id] = { user: u, role: ru.role };
    }

    function resolveRoleUser(id: string) {
      const r = roleUserMap[id];
      if (!r) return { name: '—', document: '—', role: '—' };
      return {
        name: [r.user.name, r.user.surname].filter(Boolean).join(' ').trim() || '—',
        document: r.user.document || '—',
        role: r.role,
      };
    }

    // Build map of tvOrders by distribution_id
    const orderMap: Record<string, Record<string, string>> = {};
    for (const ord of tvOrders) {
      if (ord.distribution_id) {
        orderMap[ord.distribution_id] = ord;
      }
    }

    // Enrich DARE/Royalties with order data
    let enriched = dareRoyalties.map(dr => {
      const ord = orderMap[dr.distribution_id] || {};
      const issuer = ord.issuer_id ? resolveRoleUser(ord.issuer_id) : { name: '—', document: '—', role: '—' };

      const ucsAmount = parseFloat(ord.ucs_amount || '0');
      const price = parseFloat(ord.price || '0');
      const orderTotal = parseFloat(ord.total || '0');

      const dareTotal = parseFloat(dr.dare_total || '0');
      const royaltiesTotal = parseFloat(dr.royalties_total || '0');

      // Calculate public / private splits
      const ucsPub = price > 0 ? Math.round(dareTotal / price) : 0;
      const totalPub = dareTotal;
      const ucsPri = Math.max(0, ucsAmount - ucsPub);
      const totalPri = Math.max(0, orderTotal - dareTotal);

      return {
        ...dr,
        order_id: ord.id || '—',
        order_date: ord.created_date || dr.created_date || '—',
        ucs_amount: String(ucsAmount),
        price: String(price),
        order_total: String(orderTotal),
        responsible_name: fixEncoding(ord.responsible_name) || issuer.name || '—',
        responsible_document: ord.responsible_document || issuer.document || '—',
        issuerName: issuer.name,
        issuerDocument: issuer.document,
        issuerRole: issuer.role,
        ucs_pub: String(ucsPub),
        total_pub: String(totalPub),
        ucs_pri: String(ucsPri),
        total_pri: String(totalPri),
        dare_status: dr.dare_code || dr.dare_file_id ? 'EMITIDO' : (dareTotal > 0 ? 'PENDENTE' : 'ISENTO'),
        royalties_status: dr.royalties_code || dr.royalties_file_id ? 'EMITIDO' : (royaltiesTotal > 0 ? 'PENDENTE' : 'ISENTO'),
        status: ord.status || 'PROCESSED', // Use order status for general filters
      };
    });

    // Apply search filter if present
    if (search) {
      enriched = enriched.filter((o: any) =>
        o.order_id.toLowerCase().includes(search) ||
        o.responsible_name.toLowerCase().includes(search) ||
        o.responsible_document.includes(search) ||
        (o.distribution_id || '').includes(search) ||
        (o.dare_code || '').includes(search) ||
        (o.royalties_code || '').includes(search)
      );
    }

    // Filter by general status if present
    if (status) {
      enriched = enriched.filter((o: any) => o.status === status);
    }

    const allStatuses = [...new Set(enriched.map((o: any) => o.status).filter(Boolean))].sort();
    const statusCounts: Record<string, number> = {};
    for (const o of enriched as any[]) {
      if (o.status) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    // Totals
    const totals = {
      ucs: enriched.reduce((s, o: any) => s + parseFloat(o.ucs_amount || '0'), 0),
      value: enriched.reduce((s, o: any) => s + parseFloat(o.order_total || '0'), 0),
      dare: enriched.reduce((s, o: any) => s + parseFloat(o.dare_total || '0'), 0),
      royalties: enriched.reduce((s, o: any) => s + parseFloat(o.royalties_total || '0'), 0),
    };

    const total = enriched.length;
    const rows = enriched.slice((page - 1) * pageSize, page * pageSize);
    return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, allStatuses, statusCounts, totals };
  }

  // Map each category to its CSV and the key columns to enrich
  interface CategoryCfg {
    file: string;
    roleIdFields: string[];
    userIdFields: string[];
    filter?: (row: Record<string, string>) => boolean;
  }

  const CATEGORY_MAP: Record<string, CategoryCfg> = {
    akses_cert_distribuidor_financeiro: {
      file: 'plat_akses_distributor_certificate_order.csv',
      roleIdFields: ['issuer_id'],
      userIdFields: ['created_by'],
      filter: (row) => row.certificate_type === 'FINANCIAL_DISTRIBUTOR'
    },
    akses_cert_distribuidor_geral: {
      file: 'plat_akses_distributor_certificate_order.csv',
      roleIdFields: ['issuer_id'],
      userIdFields: ['created_by'],
      filter: (row) => row.certificate_type === 'GENERAL_DISTRIBUTOR'
    },
    akses_cert_distribuidor_credenciado: {
      file: 'plat_akses_distributor_certificate_order.csv',
      roleIdFields: ['issuer_id'],
      userIdFields: ['created_by'],
      filter: (row) => row.certificate_type === 'CREDENTIALED_DISTRIBUTOR'
    },
    akses_cert_cliente: {
      file: 'plat_akses_client_certificate_order.csv',
      roleIdFields: ['issuer_id'],
      userIdFields: ['created_by']
    },
    akses_living_carbon: {
      file: 'plat_akses_living_carbon_certificate_order.csv',
      roleIdFields: ['issuer_id', 'payer_id', 'unit_id'],
      userIdFields: ['created_by']
    },
    akses_transferencia: {
      file: 'plat_akses_transfer_order.csv',
      roleIdFields: ['issuer_id', 'recipient_id'],
      userIdFields: ['created_by']
    },
    akses_compra: {
      file: 'plat_akses_purchase_order.csv',
      roleIdFields: ['buyer_id'],
      userIdFields: ['created_by']
    },
    akses_venda: {
      file: 'plat_akses_sale_order.csv',
      roleIdFields: ['seller_id'],
      userIdFields: ['created_by']
    },
    akses_cde: {
      file: 'dbo_stock_availability_certificate_order.csv',
      roleIdFields: ['issuer_id'],
      userIdFields: ['created_by']
    },
    akses_intencao_movimentacao: {
      file: 'dbo_movement_intention_order.csv',
      roleIdFields: ['issuer_id'],
      userIdFields: ['created_by']
    },
    tv_pedidos_selo: {
      file: 'plat_tesouro_verde_certificate_order.csv',
      roleIdFields: ['issuer_id'],
      userIdFields: ['created_by']
    },
    tv_dare_royalties: {
      file: 'plat_tesouro_verde_dare_royalties.csv',
      roleIdFields: [],
      userIdFields: ['created_by']
    },
    tv_compensacao: {
      file: 'plat_tesouro_verde_compensation_intent.csv',
      roleIdFields: [],
      userIdFields: ['created_by']
    },
    tv_programas: {
      file: 'plat_tesouro_verde_campaigns.csv',
      roleIdFields: [],
      userIdFields: []
    },
  };

  const cfg = CATEGORY_MAP[category] || CATEGORY_MAP['akses_cert_distribuidor_credenciado'];

  const [orders, roleUsers, users] = await Promise.all([
    readCSVStream(cfg.file, (row) => {
      if (cfg.filter && !cfg.filter(row)) return false;
      return true;
    }),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_user.csv'),
  ]);

  // Build lookup maps
  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) userMap[u.id] = u;
  const roleUserMap: Record<string, { user: Record<string, string>; role: string }> = {};
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    roleUserMap[ru.id] = { user: u, role: ru.role };
  }

  function resolveRoleUser(id: string) {
    const r = roleUserMap[id];
    if (!r) return { name: '—', document: '—', role: '—' };
    return {
      name: [r.user.name, r.user.surname].filter(Boolean).join(' ').trim() || '—',
      document: r.user.document || '—',
      role: r.role,
    };
  }

  let enriched: any[] = orders.map(o => {
    const resolved: Record<string, unknown> = {};
    for (const field of cfg.roleIdFields) {
      if (o[field]) resolved[`_${field}_resolved`] = resolveRoleUser(o[field]);
    }

    const primaryField = cfg.roleIdFields.find(f => o[f]) || '';
    const primary = primaryField ? resolveRoleUser(o[primaryField]) : { name: '—', document: '—', role: '—' };

    const secondaryField = cfg.roleIdFields[1] || '';
    const secondary = secondaryField && o[secondaryField] ? resolveRoleUser(o[secondaryField]) : null;

    return {
      ...o,
      ...resolved,
      _primaryName: primary.name,
      _primaryDocument: primary.document,
      _primaryRole: primary.role,
      _secondaryName: secondary?.name || null,
      _secondaryDocument: secondary?.document || null,
      _secondaryRole: secondary?.role || null,
      issuerName: primary.name,
      issuerDocument: primary.document,
      issuerRole: primary.role,
      responsibleName: fixEncoding(o.responsible_name) || secondary?.name || null,
      responsibleDocument: o.responsible_document || secondary?.document || null,
    };
  });

  // Calculate status counts on all items belonging to this category
  const statusCounts: Record<string, number> = {
    PENDING_VALIDATION: 0,
    PENDING_DOCUMENTATION_VALIDATION: 0,
    PENDING_PAYMENT: 0,
    PAID: 0,
    PRE_PROCESSED: 0,
    PROCESSED: 0,
    FAILED: 0,
    DENIED: 0,
    ARCHIVED: 0,
  };
  
  for (const o of orders) {
    let s = o.status || '';
    if (s === 'PENDING' || s === 'PENDING_APPROVAL') s = 'PENDING_VALIDATION';
    if (s) {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
  }
  
  const allStatuses = Object.keys(statusCounts).filter(k => statusCounts[k] > 0);

  // Apply filters
  let filtered = enriched;

  if (status) {
    filtered = filtered.filter(o => {
      let s = o.status || '';
      if (s === 'PENDING' || s === 'PENDING_APPROVAL') s = 'PENDING_VALIDATION';
      return s === status;
    });
  }

  if (search) {
    filtered = filtered.filter(o =>
      (o.id || '').toLowerCase().includes(search) ||
      (o.distribution_id || '').toLowerCase().includes(search) ||
      (o._primaryName || '').toLowerCase().includes(search) ||
      (o._primaryDocument || '').toLowerCase().includes(search) ||
      (o._secondaryName || '').toLowerCase().includes(search) ||
      (o._secondaryDocument || '').toLowerCase().includes(search) ||
      (o.responsibleName || '').toLowerCase().includes(search) ||
      (o.responsible_name || '').toLowerCase().includes(search) ||
      (o.seller_name || '').toLowerCase().includes(search)
    );
  }

  const paymentType = searchParams.get('paymentType') || '';
  if (paymentType) {
    filtered = filtered.filter(o => o.payment_type === paymentType);
  }

  const nxtStatus = searchParams.get('nxtStatus') || '';
  if (nxtStatus === 'fila') {
    filtered = filtered.filter(o => o.order_book_queue_id && o.order_book_queue_id !== '—' && o.order_book_queue_id !== '');
  }

  const dateInicio = searchParams.get('dateInicio') || '';
  const dateFim = searchParams.get('dateFim') || '';

  if (dateInicio) {
    filtered = filtered.filter(o => {
      const d = o.created_date || o.original_created_at || '';
      return d >= dateInicio;
    });
  }

  if (dateFim) {
    filtered = filtered.filter(o => {
      const d = o.created_date || o.original_created_at || '';
      return d <= dateFim;
    });
  }

  // Sort by id descending
  filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const totals = {
    ucs: filtered.reduce((s, o: any) => s + parseFloat(o.ucs_amount || '0'), 0),
    value: filtered.reduce((s, o: any) => s + parseFloat(o.total || o.royalties_total || '0'), 0),
  };

  const total = filtered.length;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, allStatuses, statusCounts, totals };
}

async function handlePartners(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const partners = await readCSVStream('plat_tesouro_verde_partners.csv');
  let filtered = partners;

  if (search) {
    filtered = filtered.filter(p => p.name?.toLowerCase().includes(search) || p.document?.includes(search));
  }

  // Sort by id ascending as seen in original screen
  filtered.sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));

  const total = filtered.length;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

async function handleProdutores(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const [users, roleUsers, areas, yearlyInfo] = await Promise.all([
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_area.csv'),
    readCSVStream('dbo_yearly_area_info.csv'),
  ]);

  const yearlyMap: Record<string, Record<string, string>> = {};
  for (const y of yearlyInfo) {
    const id = y.area_id;
    if (!yearlyMap[id] || parseInt(y.year) > parseInt(yearlyMap[id].year)) {
      yearlyMap[id] = y;
    }
  }

  const roleMap: Record<string, string[]> = {};
  for (const ru of roleUsers) {
    if (!roleMap[ru.user_id]) roleMap[ru.user_id] = [];
    roleMap[ru.user_id].push(ru.role);
  }

  const areasByOwner: Record<string, Record<string, string>[]> = {};
  for (const a of areas) {
    const ownerId = a.owner_id;
    if (!ownerId) continue;
    if (!areasByOwner[ownerId]) areasByOwner[ownerId] = [];
    const yInfo = yearlyMap[a.id] || {};
    areasByOwner[ownerId].push({
      ...a,
      total_area: yInfo.total_area || '0',
      total_vegetation_area: yInfo.total_vegetation_area || '0',
      year: yInfo.year || '—',
    });
  }

  let enriched: any[] = users.map(u => {
    const userRoles = roleMap[u.id] || [];
    const userAreas = areasByOwner[u.id] || [];
    const isProducer = userRoles.includes('PRODUCER') || userAreas.length > 0;
    const isClient = userRoles.includes('CUSTOMER');
    const isPartner = userRoles.includes('PARTNER') || userRoles.includes('DISTRIBUTOR');

    return {
      ...u,
      roles: userRoles,
      areas: userAreas,
      totalAreas: userAreas.length,
      totalAreaHa: userAreas.reduce((sum, a) => sum + parseFloat(a.total_area || '0'), 0),
      totalVegHa: userAreas.reduce((sum, a) => sum + parseFloat(a.total_vegetation_area || '0'), 0),
      isProducer,
      isClient,
      isPartner,
    };
  }).filter(u => u.isProducer);

  if (search) {
    enriched = enriched.filter(u =>
      `${u.name} ${u.surname}`.toLowerCase().includes(search) ||
      u.document?.includes(search) ||
      u.areas.some((a: Record<string, string>) => a.name?.toLowerCase().includes(search) || a.code?.includes(search))
    );
  }

  const total = enriched.length;
  const rows = enriched.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
     total,
     totalAreaHa: enriched.reduce((s, p) => s + p.totalAreaHa, 0),
     totalVegHa: enriched.reduce((s, p) => s + p.totalVegHa, 0),
     totalProperties: enriched.reduce((s, p) => s + p.totalAreas, 0),
  };

  return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, stats };
}

async function handleImei(searchParams: URLSearchParams) {
  const [harvests, adjustments] = await Promise.all([
    readCSVStream('dbo_harvest.csv'),
    readCSVStream('dbo_account_adjustments_order.csv'),
  ]);

  const safrasMap: Record<string, number> = {};
  for (const h of harvests) {
    const year = h.year;
    if (!year) continue;
    safrasMap[year] = (safrasMap[year] || 0) + parseFloat(h.amount || '0');
  }

  const partitionHistory = Object.entries(safrasMap).map(([safra, total]) => {
    const partBase = Math.floor((total / 3) * 10000) / 10000;
    const produtor = partBase;
    const associacao = partBase;
    const imei = Math.round((total - (produtor + associacao)) * 10000) / 10000;
    return {
      safra,
      total,
      produtor,
      associacao,
      imei,
      timestamp: new Date().toISOString(),
    };
  }).sort((a, b) => b.safra.localeCompare(a.safra));

  const totalOriginadoIMEI = partitionHistory.reduce((acc, curr) => acc + curr.imei, 0);

  const transactions = adjustments.map(adj => {
    const recipientId = adj.recipient_id;
    const issuerId = adj.issuer_id;

    let tipo = 'consumo';
    if (recipientId === '1') {
      tipo = 'entrada';
    } else if (recipientId !== issuerId) {
      tipo = 'saida';
    }

    return {
      id: adj.id,
      tipo,
      valor: Math.abs(parseFloat(adj.ucs_transfer_amount || '0')),
      timestamp: adj.created_date || adj.last_modified_date || new Date().toISOString(),
      descricao: fixEncoding(adj.observations) || fixEncoding(adj.reason_description) || 'Ajuste de Saldo Legado',
      distribution_id: adj.distribution_id || '—',
      status: adj.status || 'PROCESSED',
    };
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const consumoTotal = transactions.filter(t => t.tipo === 'consumo').reduce((acc, t) => acc + t.valor, 0);
  const transferenciaEntrada = transactions.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
  const transferenciaSaida = transactions.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0);

  const saldoFinal = (totalOriginadoIMEI + transferenciaEntrada) - (consumoTotal + transferenciaSaida);

  return {
    consolidated: {
      totalOriginado: totalOriginadoIMEI,
      partitionHistory,
      consumoTotal,
      transferenciaEntrada,
      transferenciaSaida,
      saldoFinal,
    },
    transactions,
  };
}

async function handleAbastecimento(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const rows = await readCSVStream('dbo_ucs_batch.csv');
  const filtered = search
    ? rows.filter(r => 
        r.id.toLowerCase().includes(search) || 
        (r.harvest_year || '').includes(search) || 
        (r.distribution_id || '').includes(search) ||
        (r.transaction_id || '').includes(search)
      )
    : rows;

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { rows: paginated, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

async function handleConfigDistribuicao(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const rows = await readCSVStream('dbo_distribution_configuration.csv');
  const filtered = search
    ? rows.filter(r => 
        r.id.toLowerCase().includes(search) || 
        (r.description || '').toLowerCase().includes(search) || 
        (r.type || '').toLowerCase().includes(search) ||
        (r.status || '').toLowerCase().includes(search)
      )
    : rows;

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { rows: paginated, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

async function handleMovimentacoes(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const dateInicio = searchParams.get('dateInicio') || '';
  const dateFim = searchParams.get('dateFim') || '';
  const userOrigem = searchParams.get('userOrigem')?.toLowerCase() || '';
  const userDestino = searchParams.get('userDestino')?.toLowerCase() || '';
  const distId = searchParams.get('distId') || '';
  const platOrigem = searchParams.get('platOrigem') || '';
  const platDestino = searchParams.get('platDestino') || '';
  const saldoOrigem = searchParams.get('saldoOrigem') || '';
  const saldoDestino = searchParams.get('saldoDestino') || '';

  const [transactions, users, roleUsers, platforms] = await Promise.all([
    readCSVStream('dbo_transaction.csv'),
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_platform.csv'),
  ]);

  const platformMap: Record<string, string> = {};
  for (const p of platforms) {
    platformMap[p.id] = p.alias || p.name;
  }

  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const roleUserMap: Record<string, { name: string; role: string }> = {};
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
    roleUserMap[ru.id] = {
      name: fixEncoding(name),
      role: ru.role,
    };
  }

  const translatedRoles: Record<string, string> = {
    'IMEI': 'IMEI',
    'GOVERNMENT': 'Governo',
    'CUSTOMER': 'Cliente',
    'PRODUCER': 'Produtor',
    'PARTNER': 'Parceiro',
    'DISTRIBUTOR': 'Distribuidor',
  };

  const enriched = transactions.map(t => {
    const issuer = roleUserMap[t.issuer_id] || { name: '—', role: '—' };
    const recipient = roleUserMap[t.recipient_id] || { name: '—', role: '—' };

    return {
      id: t.id,
      amount: t.amount,
      created_on: t.created_on,
      finished_on: t.finished_on,
      distribution_id: t.distribution_id,
      origin_platform: platformMap[t.origin_platform_id] || t.origin_platform || '—',
      recipient_platform: platformMap[t.recipient_platform_id] || '—',
      issuer_name: issuer.name,
      issuer_role: translatedRoles[issuer.role] || issuer.role || '—',
      recipient_name: recipient.name,
      recipient_role: translatedRoles[recipient.role] || recipient.role || '—',
      origin_balance: t.origin_balance,
      target_balance: t.target_balance,
      description: fixEncoding(t.description) || '—',
    };
  });

  let filtered = enriched;

  if (search) {
    filtered = filtered.filter(r => 
      r.id.toLowerCase().includes(search) || 
      (r.distribution_id || '').includes(search) ||
      r.issuer_name.toLowerCase().includes(search) ||
      r.recipient_name.toLowerCase().includes(search) ||
      r.origin_platform.toLowerCase().includes(search) ||
      r.recipient_platform.toLowerCase().includes(search)
    );
  }

  if (dateInicio) {
    filtered = filtered.filter(r => r.created_on >= dateInicio);
  }
  if (dateFim) {
    filtered = filtered.filter(r => r.created_on <= dateFim);
  }
  if (userOrigem) {
    filtered = filtered.filter(r => r.issuer_name.toLowerCase().includes(userOrigem));
  }
  if (userDestino) {
    filtered = filtered.filter(r => r.recipient_name.toLowerCase().includes(userDestino));
  }
  if (distId) {
    filtered = filtered.filter(r => r.distribution_id === distId);
  }
  if (platOrigem) {
    filtered = filtered.filter(r => r.origin_platform === platOrigem);
  }
  if (platDestino) {
    filtered = filtered.filter(r => r.recipient_platform === platDestino);
  }
  if (saldoOrigem) {
    filtered = filtered.filter(r => r.origin_balance === saldoOrigem);
  }
  if (saldoDestino) {
    filtered = filtered.filter(r => r.target_balance === saldoDestino);
  }

  // Sort by ID descending (latest transactions first)
  filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { rows: paginated, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

async function handleTransfTitularidade(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const statusFilter = searchParams.get('status') || ''; // TAB filter
  const dateInicio = searchParams.get('dateInicio') || '';
  const dateFim = searchParams.get('dateFim') || '';

  const [transfers, users, roleUsers, platforms] = await Promise.all([
    readCSVStream('dbo_ownership_transfer_order.csv'),
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_platform.csv'),
  ]);

  const platformMap: Record<string, string> = {};
  for (const p of platforms) {
    platformMap[p.id] = p.alias || p.name;
  }

  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const roleUserMap: Record<string, { name: string; document: string; role: string }> = {};
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
    roleUserMap[ru.id] = {
      name: fixEncoding(name),
      document: u.document || '—',
      role: ru.role,
    };
  }

  const translatedRoles: Record<string, string> = {
    'IMEI': 'IMEI',
    'GOVERNMENT': 'Governo',
    'CUSTOMER': 'Cliente',
    'PRODUCER': 'Produtor',
    'PARTNER': 'Parceiro',
    'DISTRIBUTOR': 'Distribuidor',
  };

  const enriched = transfers.map(t => {
    const requester = roleUserMap[t.created_by] || { name: '—', document: '—', role: '—' };
    const requesterName = requester.name;
    
    const seller = roleUserMap[t.issuer_id] || { name: '—', document: '—', role: '—' };
    const buyer = roleUserMap[t.recipient_id] || { name: '—', document: '—', role: '—' };

    return {
      id: t.id,
      ucs_transfer_amount: t.ucs_transfer_amount,
      negotiated_total: t.negotiated_total,
      created_date: t.created_date,
      year: t.year || '—',
      status: t.status,
      type_reason: t.type_reason || t.reason_description || '—',
      nxt_id: t.nxt_id || '—',
      requester_name: requesterName,
      requester_document: requester.document || '—',
      seller_name: seller.name,
      seller_document: seller.document,
      seller_role: translatedRoles[seller.role] || seller.role || '—',
      buyer_name: buyer.name,
      buyer_document: buyer.document,
      buyer_role: translatedRoles[buyer.role] || buyer.role || '—',
      platform: platformMap[t.origin_platform_id] || '—',
      distribution_id: t.distribution_id || null,
      retired: t.retired === 't' || t.retired === 'true',
      reason_description: fixEncoding(t.reason_description) || null,
    };
  });

  // Calculate status counts on all items before filtering by status tab
  const statusCounts: Record<string, number> = {
    PENDING: 0,
    PRE_PROCESSED: 0,
    PROCESSED: 0,
    FAILED: 0,
    DENIED: 0,
  };
  for (const e of enriched) {
    const s = e.status || '';
    if (s in statusCounts) {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    } else {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
  }

  let filtered = enriched;

  if (statusFilter) {
    filtered = filtered.filter(e => e.status === statusFilter);
  }

  if (search) {
    filtered = filtered.filter(e => 
      e.id.toLowerCase().includes(search) || 
      e.requester_name.toLowerCase().includes(search) ||
      e.seller_name.toLowerCase().includes(search) ||
      e.buyer_name.toLowerCase().includes(search) ||
      e.platform.toLowerCase().includes(search)
    );
  }

  if (dateInicio) {
    filtered = filtered.filter(e => e.created_date >= dateInicio);
  }
  if (dateFim) {
    filtered = filtered.filter(e => e.created_date <= dateFim);
  }

  // Sort by id descending
  filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { 
    rows: paginated, 
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    statusCounts
  };
}

async function handleAjustesContas(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const statusFilter = searchParams.get('status') || ''; // TAB filter
  const dateInicio = searchParams.get('dateInicio') || '';
  const dateFim = searchParams.get('dateFim') || '';

  const [adjustments, users, roleUsers, platforms] = await Promise.all([
    readCSVStream('dbo_account_adjustments_order.csv'),
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_platform.csv'),
  ]);

  const platformMap: Record<string, string> = {};
  for (const p of platforms) {
    platformMap[p.id] = p.alias || p.name;
  }

  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const roleUserMap: Record<string, { name: string; document: string; role: string }> = {};
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
    roleUserMap[ru.id] = {
      name: fixEncoding(name),
      document: u.document || '—',
      role: ru.role,
    };
  }

  const translatedRoles: Record<string, string> = {
    'IMEI': 'IMEI',
    'GOVERNMENT': 'Governo',
    'CUSTOMER': 'Cliente',
    'PRODUCER': 'Produtor',
    'PARTNER': 'Parceiro',
    'DISTRIBUTOR': 'Distribuidor',
  };

  const enriched = adjustments.map(t => {
    const requester = roleUserMap[t.created_by] || { name: '—', document: '—', role: '—' };
    const requesterName = requester.name;
    
    const sender = roleUserMap[t.issuer_id] || { name: '—', document: '—', role: '—' };
    const receiver = roleUserMap[t.recipient_id] || { name: '—', document: '—', role: '—' };

    return {
      id: t.id,
      ucs_transfer_amount: t.ucs_transfer_amount,
      distribution_id: t.distribution_id || '',
      reason_description: fixEncoding(t.reason_description) || '—',
      type_reason: fixEncoding(t.type_reason) || '—',
      created_date: t.created_date,
      status: t.status,
      observations: fixEncoding(t.observations) || '—',
      requester_name: requesterName,
      requester_document: requester.document || '—',
      sender_name: sender.name,
      sender_document: sender.document,
      sender_role: translatedRoles[sender.role] || sender.role || '—',
      sender_platform: platformMap[t.origin_platform_id] || '—',
      receiver_name: receiver.name,
      receiver_document: receiver.document,
      receiver_role: translatedRoles[receiver.role] || receiver.role || '—',
      receiver_platform: platformMap[t.recipient_platform_id] || '—',
    };
  });

  // Calculate status counts on all items before filtering by status tab
  const statusCounts: Record<string, number> = {
    PENDING_VALIDATION: 0,
    PRE_PROCESSED: 0,
    PROCESSED: 0,
    FAILED: 0,
    DENIED: 0,
  };
  for (const e of enriched) {
    const s = e.status || '';
    if (s in statusCounts) {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    } else {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
  }

  let filtered = enriched;

  if (statusFilter) {
    filtered = filtered.filter(e => e.status === statusFilter);
  }

  if (search) {
    filtered = filtered.filter(e => 
      e.id.toLowerCase().includes(search) || 
      e.requester_name.toLowerCase().includes(search) ||
      e.sender_name.toLowerCase().includes(search) ||
      e.receiver_name.toLowerCase().includes(search) ||
      e.sender_platform.toLowerCase().includes(search) ||
      e.receiver_platform.toLowerCase().includes(search)
    );
  }

  if (dateInicio) {
    filtered = filtered.filter(e => e.created_date >= dateInicio);
  }
  if (dateFim) {
    filtered = filtered.filter(e => e.created_date <= dateFim);
  }

  // Sort by id descending
  filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { 
    rows: paginated, 
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    statusCounts
  };
}

async function handleBloqueioUcs(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const blockId = searchParams.get('blockId') || '';
  const userQuery = searchParams.get('userQuery')?.toLowerCase() || '';
  const perfil = searchParams.get('perfil') || '';
  const status = searchParams.get('status') || '';
  const areaQuery = searchParams.get('areaQuery')?.toLowerCase() || '';

  const [blockedUcsRaw, users, roleUsers, areas] = await Promise.all([
    readCSVStream('dbo_blocked_ucs.csv'),
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_area.csv'),
  ]);

  const blockedUcs = blockedUcsRaw.filter(b => b.active === 't');

  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const roleUserMap: Record<string, { name: string; role: string }> = {};
  const userRolesMap: Record<string, string> = {}; // user_id -> role
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
    roleUserMap[ru.id] = {
      name: fixEncoding(name),
      role: ru.role,
    };
    userRolesMap[ru.user_id] = ru.role;
  }

  const areaMap: Record<string, { name: string; code: string }> = {};
  for (const a of areas) {
    areaMap[a.id] = {
      name: fixEncoding(a.name),
      code: a.code || '—',
    };
  }

  const translatedRoles: Record<string, string> = {
    'IMEI': 'IMEI',
    'GOVERNMENT': 'Governo',
    'CUSTOMER': 'Cliente',
    'PRODUCER': 'Produtor',
    'PARTNER': 'Parceiro',
    'DISTRIBUTOR': 'Distribuidor',
  };

  const enriched = blockedUcs.map(t => {
    // Resolve user details (by user_id or role_user_id)
    let name = '—';
    let role = '—';
    if (t.role_user_id && roleUserMap[t.role_user_id]) {
      name = roleUserMap[t.role_user_id].name;
      role = roleUserMap[t.role_user_id].role;
    } else if (t.user_id && userMap[t.user_id]) {
      const u = userMap[t.user_id];
      name = [u.name, u.surname].filter(Boolean).join(' ').trim();
      role = userRolesMap[t.user_id] || '—';
    }

    const area = areaMap[t.area_id] || { name: '—', code: '—' };

    return {
      id: t.id,
      created_date: t.created_date,
      status: t.status,
      user_name: fixEncoding(name),
      user_role: translatedRoles[role] || role || '—',
      area_name: area.name,
      area_code: area.code,
      reason: fixEncoding(t.reason) || '—',
      description: fixEncoding(t.description) || '—',
      amount: t.amount,
    };
  });

  let filtered = enriched;

  if (blockId) {
    filtered = filtered.filter(e => e.id === blockId);
  }
  if (userQuery) {
    filtered = filtered.filter(e => e.user_name.toLowerCase().includes(userQuery));
  }
  if (perfil) {
    filtered = filtered.filter(e => e.user_role === perfil);
  }
  if (status) {
    filtered = filtered.filter(e => e.status === status);
  }
  if (areaQuery) {
    filtered = filtered.filter(e => 
      e.area_name.toLowerCase().includes(areaQuery) || 
      e.area_code.toLowerCase().includes(areaQuery)
    );
  }

  // Sort by id descending
  filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { rows: paginated, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

async function handleCprVerde(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const statusFilter = searchParams.get('status') || ''; // TAB filter
  const nameOrIsin = searchParams.get('nameOrIsin')?.toLowerCase() || '';
  const userNameQuery = searchParams.get('userName')?.toLowerCase() || '';
  const endorsedNameQuery = searchParams.get('endorsedName')?.toLowerCase() || '';
  const emissionDate = searchParams.get('emissionDate') || '';
  const expirationDate = searchParams.get('expirationDate') || '';

  const [cprList, users, roleUsers] = await Promise.all([
    readCSVStream('dbo_cpr.csv'),
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
  ]);

  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const roleUserMap: Record<string, { name: string; document: string }> = {};
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
    roleUserMap[ru.id] = {
      name: fixEncoding(name),
      document: u.document || '—',
    };
  }

  const enriched = cprList.map(t => {
    const userDetail = roleUserMap[t.role_user_id] || { name: '—', document: '—' };
    const endorsedDetail = roleUserMap[t.endorsed_role_user_id] || { name: '—', document: '—' };

    return {
      id: t.id,
      isin: t.isin,
      name: fixEncoding(t.name),
      representative_name: fixEncoding(t.representative_name) || '—',
      representative_document: t.representative_document || '—',
      emission_date: t.emission_date,
      expiration_date: t.expiration_date,
      ucs_amount: t.ucs_amount,
      nominal_value: t.nominal_value,
      fee: t.fee,
      total: t.total,
      status: t.status,
      user_name: userDetail.name,
      user_document: userDetail.document,
      endorsed_name: endorsedDetail.name,
      endorsed_document: endorsedDetail.document,
    };
  });

  // Calculate status counts on all items before filtering by status tab
  const statusCounts: Record<string, number> = {
    PENDING_APPROVAL: 0,
    PENDING_PAYMENT: 0,
    PAID: 0,
    PRE_PROCESSED: 0,
    PROCESSED: 0,
    EXECUTED: 0,
    REVOKED: 0,
    DENIED: 0,
    FAILED: 0,
  };
  for (const e of enriched) {
    const s = e.status || '';
    let mappedStatus = s;
    if (s === 'PENDING') mappedStatus = 'PENDING_APPROVAL';
    
    if (mappedStatus in statusCounts) {
      statusCounts[mappedStatus] = (statusCounts[mappedStatus] || 0) + 1;
    } else {
      statusCounts[mappedStatus] = (statusCounts[mappedStatus] || 0) + 1;
    }
  }

  let filtered = enriched;

  if (statusFilter) {
    filtered = filtered.filter(e => {
      let mappedStatus = e.status || '';
      if (mappedStatus === 'PENDING') mappedStatus = 'PENDING_APPROVAL';
      return mappedStatus === statusFilter;
    });
  }

  if (nameOrIsin) {
    filtered = filtered.filter(e => 
      e.isin.toLowerCase().includes(nameOrIsin) || 
      e.name.toLowerCase().includes(nameOrIsin) ||
      e.representative_name.toLowerCase().includes(nameOrIsin)
    );
  }

  if (userNameQuery) {
    filtered = filtered.filter(e => e.user_name.toLowerCase().includes(userNameQuery));
  }

  if (endorsedNameQuery) {
    filtered = filtered.filter(e => e.endorsed_name.toLowerCase().includes(endorsedNameQuery));
  }

  if (emissionDate) {
    filtered = filtered.filter(e => e.emission_date >= emissionDate);
  }

  if (expirationDate) {
    filtered = filtered.filter(e => e.expiration_date <= expirationDate);
  }

  // Sort by id descending
  filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { 
    rows: paginated, 
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    statusCounts
  };
}

async function handleCertificate(searchParams: URLSearchParams) {
  const orderId = searchParams.get('orderId') || '';
  const category = searchParams.get('category') || '';

  if (!orderId || !category) {
    throw new Error('Parâmetros orderId e category são obrigatórios.');
  }

  // 1. Determine files
  let orderFile = '';
  let certificateMappingFile = '';

  if (category.startsWith('tv_')) {
    orderFile = 'plat_tesouro_verde_certificate_order.csv';
    certificateMappingFile = 'plat_tesouro_verde_certificate.csv';
  } else if (category === 'akses_living_carbon') {
    orderFile = 'plat_akses_living_carbon_certificate_order.csv';
    certificateMappingFile = 'plat_akses_living_carbon_certificate.csv';
  } else if (category === 'akses_cert_cliente') {
    orderFile = 'plat_akses_client_certificate_order.csv';
    certificateMappingFile = 'plat_akses_client_certificate.csv';
  } else {
    orderFile = 'plat_akses_distributor_certificate_order.csv';
    certificateMappingFile = 'plat_akses_distributor_certificate.csv';
  }

  // 2. Fetch the order row
  const orders = await readCSVStream(orderFile, (row) => row.id === orderId, 1);
  const order = orders[0] || null;

  if (!order) {
    return { error: 'Pedido não encontrado.' };
  }

  // 3. Fetch the certificate mapping row
  const mappings = await readCSVStream(certificateMappingFile, (row) => row.certificate_order_id === orderId, 1);
  const mapping = mappings[0] || null;

  if (!mapping) {
    return {
      order,
      certificate: null,
      nxt: null,
      status: 'Aguardando Emissão',
    };
  }

  const certId = mapping.id;

  // 4. Fetch the core certificate from dbo_certificate
  const certs = await readCSVStream('dbo_certificate.csv', (row) => row.id === certId, 1);
  const certificate = certs[0] || null;

  if (!certificate) {
    return {
      order,
      certificate: null,
      nxt: null,
      status: 'Aguardando Emissão',
    };
  }

  // 5. Fetch the NXT transaction row
  let nxt = null;
  if (certificate.nxt_id) {
    const nxtRows = await readCSVStream('dbo_nxt.csv', (row) => row.id === certificate.nxt_id, 1);
    nxt = nxtRows[0] || null;
  }

  return {
    order,
    certificate,
    nxt,
    status: order.status || 'PROCESSED',
  };
}

async function handleEstoqueDashboard() {
  const [batches, blocked, transactions, transfers, adjustments] = await Promise.all([
    readCSVStream('dbo_ucs_batch.csv'),
    readCSVStream('dbo_blocked_ucs.csv'),
    readCSVStream('dbo_transaction.csv'),
    readCSVStream('dbo_ownership_transfer_order.csv'),
    readCSVStream('dbo_account_adjustments_order.csv'),
  ]);

  const totalInitial = batches.reduce((sum, b) => sum + parseFloat(b.initial_amount || '0'), 0);
  const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.available_balance || '0'), 0);
  const totalBlocked = blocked.filter(b => b.active === 't').reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0);
  const totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.ucs_transfer_amount || '0'), 0);
  const totalAdjustments = adjustments.reduce((sum, a) => sum + parseFloat(a.ucs_transfer_amount || '0'), 0);

  // Group by harvest year
  const harvestStats: Record<string, { initial: number; available: number }> = {};
  for (const b of batches) {
    const year = b.harvest_year || 'Desconhecido';
    if (!harvestStats[year]) harvestStats[year] = { initial: 0, available: 0 };
    harvestStats[year].initial += parseFloat(b.initial_amount || '0');
    harvestStats[year].available += parseFloat(b.available_balance || '0');
  }

  return {
    summary: {
      totalInitial,
      totalAvailable,
      totalBlocked,
      totalTransactionsCount: transactions.length,
      totalTransfers,
      totalAdjustments,
    },
    harvestStats,
  };
}

async function handleSaldos(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const platformFilter = searchParams.get('platform') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const [balances, users, roleUsers, platforms] = await Promise.all([
    readCSVStream('dbo_consolidated_balance.csv'),
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
    readCSVStream('dbo_platform.csv'),
  ]);

  const platformMap: Record<string, { name: string; alias: string }> = {};
  for (const p of platforms) {
    platformMap[p.id] = {
      name: fixEncoding(p.name),
      alias: fixEncoding(p.alias || p.name),
    };
  }

  const userMap: Record<string, Record<string, string>> = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const roleUserMap: Record<string, { name: string; document: string; role: string }> = {};
  for (const ru of roleUsers) {
    const u = userMap[ru.user_id] || {};
    const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
    roleUserMap[ru.id] = {
      name: fixEncoding(name),
      document: u.document || '—',
      role: ru.role,
    };
  }

  const translatedRoles: Record<string, string> = {
    'IMEI': 'IMEI',
    'GOVERNMENT': 'Governo',
    'CUSTOMER': 'Cliente',
    'PRODUCER': 'Produtor',
    'PARTNER': 'Parceiro',
    'DISTRIBUTOR': 'Distribuidor',
  };

  const enriched = balances.map(b => {
    const roleUser = roleUserMap[b.user_id] || { name: '—', document: '—', role: '—' };
    const platform = platformMap[b.platform_id] || { name: '—', alias: '—' };

    return {
      id: b.id,
      available_balance: b.available_balance,
      reserved_balance: b.reserved_balance,
      blocked_balance: b.blocked_balance,
      retired_balance: b.retired_balance,
      user_id: b.user_id,
      updated_on: b.updated_on,
      platform_id: b.platform_id,
      platform_name: platform.name,
      platform_alias: platform.alias,
      user_name: roleUser.name,
      user_document: roleUser.document,
      user_role: translatedRoles[roleUser.role] || roleUser.role || '—',
    };
  });

  const filtered = enriched.filter(b => {
    if (search) {
      const matchName = b.user_name.toLowerCase().includes(search);
      const matchDoc = b.user_document.includes(search);
      if (!matchName && !matchDoc) return false;
    }
    if (platformFilter) {
      if (b.platform_id !== platformFilter && b.platform_alias !== platformFilter) return false;
    }
    return true;
  });

  // Sort by updated_on descending, then id descending
  filtered.sort((a, b) => {
    const dateA = a.updated_on || '';
    const dateB = b.updated_on || '';
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    return parseInt(b.id || '0') - parseInt(a.id || '0');
  });

  const total = filtered.length;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const domain = searchParams.get('domain');

  try {
    switch (domain) {
      case 'saldos':      return NextResponse.json(await handleSaldos(searchParams));
      case 'areas':       return NextResponse.json(await handleAreas(searchParams));
      case 'users':       return NextResponse.json(await handleUsers(searchParams));
      case 'harvests':    return NextResponse.json(await handleHarvests(searchParams));
      case 'orders':      return NextResponse.json(await handleOrders(searchParams));
      case 'partners':    return NextResponse.json(await handlePartners(searchParams));
      case 'produtores':  return NextResponse.json(await handleProdutores(searchParams));
      case 'imei':        return NextResponse.json(await handleImei(searchParams));
      case 'abastecimento': return NextResponse.json(await handleAbastecimento(searchParams));
      case 'config-distribuicao': return NextResponse.json(await handleConfigDistribuicao(searchParams));
      case 'movimentacoes': return NextResponse.json(await handleMovimentacoes(searchParams));
      case 'transf-titularidade': return NextResponse.json(await handleTransfTitularidade(searchParams));
      case 'ajustes-contas': return NextResponse.json(await handleAjustesContas(searchParams));
      case 'bloqueio-ucs': return NextResponse.json(await handleBloqueioUcs(searchParams));
      case 'cpr-verde': return NextResponse.json(await handleCprVerde(searchParams));
      case 'certificate': return NextResponse.json(await handleCertificate(searchParams));
      case 'estoque-dashboard': return NextResponse.json(await handleEstoqueDashboard());
      default:
        return NextResponse.json({ error: `Domain desconhecido: ${domain}` }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
