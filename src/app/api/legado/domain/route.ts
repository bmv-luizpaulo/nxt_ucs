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
  limit = 2000
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
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const [users, roleUsers] = await Promise.all([
    readCSVStream('dbo_user.csv'),
    readCSVStream('dbo_role_user.csv'),
  ]);

  // Map roleUser by user_id
  const roleMap: Record<string, Record<string, string>[]> = {};
  for (const ru of roleUsers) {
    if (!roleMap[ru.user_id]) roleMap[ru.user_id] = [];
    roleMap[ru.user_id].push(ru);
  }

  let enriched: any[] = users.map(u => ({
    ...u,
    roles: roleMap[u.id] || [],
    primaryRole: (roleMap[u.id] || [])[0]?.role || '—',
  }));

  if (role) {
    enriched = enriched.filter(u => u.roles.some((r: Record<string, string>) => r.role === role));
  }
  if (search) {
    enriched = enriched.filter(u =>
      `${u.name} ${u.surname}`.toLowerCase().includes(search) ||
      u.document?.includes(search) ||
      u.primaryRole.toLowerCase().includes(search)
    );
  }

  const total = enriched.length;
  const rows = enriched.slice((page - 1) * pageSize, page * pageSize);

  // Unique roles for filter chips
  const allRoles = [...new Set(roleUsers.map(r => r.role).filter(Boolean))].sort();

  return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, allRoles };
}

async function handleHarvests(searchParams: URLSearchParams) {
  const year = searchParams.get('year') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const [harvests, areas] = await Promise.all([
    readCSVStream('dbo_harvest.csv', year ? (row) => row.year === year : undefined),
    readCSVStream('dbo_area.csv'),
  ]);

  const areaMap: Record<string, Record<string, string>> = {};
  for (const a of areas) areaMap[a.id] = a;

  const enriched = harvests.map(h => ({
    ...h,
    area: areaMap[h.area_id] || null,
  }));

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
  const CATEGORY_MAP: Record<string, { file: string; roleIdFields: string[]; userIdFields: string[] }> = {
    akses_cert_distribuidor: { file: 'plat_akses_distributor_certificate_order.csv',    roleIdFields: ['issuer_id'],              userIdFields: ['created_by'] },
    akses_cert_cliente:      { file: 'plat_akses_client_certificate_order.csv',          roleIdFields: ['issuer_id'],              userIdFields: ['created_by'] },
    akses_living_carbon:     { file: 'plat_akses_living_carbon_certificate_order.csv',   roleIdFields: ['issuer_id', 'payer_id', 'unit_id'], userIdFields: ['created_by'] },
    akses_transferencia:     { file: 'plat_akses_transfer_order.csv',                    roleIdFields: ['issuer_id', 'recipient_id'], userIdFields: ['created_by'] },
    akses_compra:            { file: 'plat_akses_purchase_order.csv',                    roleIdFields: ['buyer_id'],               userIdFields: ['created_by'] },
    tv_pedidos_selo:         { file: 'plat_tesouro_verde_certificate_order.csv',         roleIdFields: ['issuer_id'],              userIdFields: ['created_by'] },
    tv_dare_royalties:       { file: 'plat_tesouro_verde_dare_royalties.csv',            roleIdFields: [],                        userIdFields: ['created_by'] },
    tv_compensacao:          { file: 'plat_tesouro_verde_compensation_intent.csv',       roleIdFields: [],                        userIdFields: ['created_by'] },
    tv_programas:            { file: 'plat_tesouro_verde_campaigns.csv',                 roleIdFields: [],                        userIdFields: [] },
  };

  const cfg = CATEGORY_MAP[category] || CATEGORY_MAP['akses_cert_distribuidor'];

  const [orders, roleUsers, users] = await Promise.all([
    readCSVStream(cfg.file, status ? (row) => row.status === status : undefined),
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
      responsibleName: fixEncoding(o.responsible_name) || null,
      responsibleDocument: o.responsible_document || null,
    };
  });

  if (search) {
    enriched = enriched.filter(o =>
      o._primaryName.toLowerCase().includes(search) ||
      o._primaryDocument.includes(search) ||
      (o.responsibleName || '').toLowerCase().includes(search) ||
      o.id.includes(search) ||
      (o.distribution_id || '').includes(search)
    );
  }

  const allStatuses = [...new Set(orders.map(o => o.status).filter(Boolean))].sort();
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    if (o.status) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  const totals = {
    ucs: enriched.reduce((s, o: any) => s + parseFloat(o.ucs_amount || '0'), 0),
    value: enriched.reduce((s, o: any) => s + parseFloat(o.total || o.royalties_total || '0'), 0),
  };

  const total = enriched.length;
  const rows = enriched.slice((page - 1) * pageSize, page * pageSize);
  return { rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, allStatuses, statusCounts, totals };
}

async function handlePartners(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const partners = await readCSVStream('plat_tesouro_verde_partners.csv');
  const filtered = search
    ? partners.filter(p => p.name?.toLowerCase().includes(search) || p.document?.includes(search))
    : partners;

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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const domain = searchParams.get('domain');

  try {
    switch (domain) {
      case 'areas':       return NextResponse.json(await handleAreas(searchParams));
      case 'users':       return NextResponse.json(await handleUsers(searchParams));
      case 'harvests':    return NextResponse.json(await handleHarvests(searchParams));
      case 'orders':      return NextResponse.json(await handleOrders(searchParams));
      case 'partners':    return NextResponse.json(await handlePartners(searchParams));
      case 'produtores':  return NextResponse.json(await handleProdutores(searchParams));
      case 'imei':        return NextResponse.json(await handleImei(searchParams));
      default:
        return NextResponse.json({ error: `Domain desconhecido: ${domain}` }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
