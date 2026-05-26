import { NextRequest, NextResponse } from 'next/server';
import { readCSVStream } from '@/lib/csvReader';

// Stream a CSV and collect rows where column === value (stops early if limit reached)
async function queryCSV(
  file: string,
  column: string,
  value: string,
  limit = 500
): Promise<Record<string, string>[]> {
  return readCSVStream(file, (row) => row[column] === value, limit);
}

// Fetch a single row by id
async function getById(file: string, id: string): Promise<Record<string, string> | null> {
  const results = await readCSVStream(file, (row) => row.id === id, 1);
  return results[0] || null;
}

// Build a user lookup map from dbo_user for a set of IDs
async function getUserMap(ids: string[]): Promise<Record<string, Record<string, string>>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(unique.map(async id => {
    const u = await getById('dbo_user.csv', id);
    return [id, u ?? { id, name: '—', document: '—' }] as [string, Record<string, string>];
  }));
  return Object.fromEntries(entries);
}

// Build role_user lookup (user profiles)
async function getRoleUserMap(ids: string[]): Promise<Record<string, Record<string, string>>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(unique.map(async id => {
    const r = await getById('dbo_role_user.csv', id);
    return [id, r ?? { id, role: '—', user_id: '—' }] as [string, Record<string, string>];
  }));
  return Object.fromEntries(entries);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const distId = searchParams.get('distributionId');
  const txId   = searchParams.get('transactionId');
  const orderId = searchParams.get('orderId');  // certificate order id

  if (!distId && !txId && !orderId) {
    return NextResponse.json({
      error: 'Forneça ao menos um parâmetro: distributionId, transactionId ou orderId'
    }, { status: 400 });
  }

  // ── 1. Resolve the distribution_id ────────────────────────────────────────
  let resolvedDistId = distId;

  if (!resolvedDistId && txId) {
    // Find distribution_id via transaction
    const tx = await getById('dbo_transaction.csv', txId);
    resolvedDistId = tx?.distribution_id ?? null;
  }

  if (!resolvedDistId && orderId) {
    // Try both order tables
    const akses = await getById('plat_akses_distributor_certificate_order.csv', orderId);
    const tv    = await getById('plat_tesouro_verde_certificate_order.csv', orderId);
    resolvedDistId = (akses ?? tv)?.distribution_id ?? null;
  }

  if (!resolvedDistId) {
    return NextResponse.json({ error: 'Distribution ID não encontrado para os parâmetros fornecidos.' }, { status: 404 });
  }

  const DID = resolvedDistId;

  // ── 2. Fetch all linked data in parallel ──────────────────────────────────
  const [
    distribution,
    transactions,
    ucsBatch2010,
    ucsBatch2020,
    ucsBatch2022,
    ucsBatch2023,
    aksesOrder,
    tvOrder,
    aksesTransfer,
    ownershipTransfer,
  ] = await Promise.all([
    getById('dbo_distribution.csv', DID),
    queryCSV('dbo_transaction.csv', 'distribution_id', DID),
    queryCSV('dbo_ucs_batch__2010.csv', 'distribution_id', DID),
    queryCSV('dbo_ucs_batch__2020.csv', 'distribution_id', DID),
    queryCSV('dbo_ucs_batch__2022.csv', 'distribution_id', DID),
    queryCSV('dbo_ucs_batch__2023.csv', 'distribution_id', DID),
    queryCSV('plat_akses_distributor_certificate_order.csv', 'distribution_id', DID),
    queryCSV('plat_tesouro_verde_certificate_order.csv', 'distribution_id', DID),
    queryCSV('plat_akses_transfer_order.csv', 'distribution_id', DID),
    queryCSV('dbo_ownership_transfer_order.csv', 'distribution_id', DID),
  ]);

  const ucsBatches = [...ucsBatch2010, ...ucsBatch2020, ...ucsBatch2022, ...ucsBatch2023];

  // ── 3. Enrich harvest info ────────────────────────────────────────────────
  const harvestId = distribution?.harvest_id;
  const harvest = harvestId ? await getById('dbo_harvest.csv', harvestId) : null;
  const areaId  = harvest?.area_id;
  const area    = areaId ? await getById('dbo_area.csv', areaId) : null;

  // ── 4. Enrich user/role_user references ──────────────────────────────────
  // Collect all user IDs and role_user IDs across transactions and orders
  const allUserIds: string[] = [];
  const allRoleUserIds: string[] = [];

  for (const tx of transactions) {
    if (tx.issuer_id)    allRoleUserIds.push(tx.issuer_id);
    if (tx.recipient_id) allRoleUserIds.push(tx.recipient_id);
  }
  for (const batch of ucsBatches) {
    if (batch.user_id) allRoleUserIds.push(batch.user_id);
  }
  const allOrders = [...aksesOrder, ...tvOrder];
  for (const ord of allOrders) {
    if (ord.issuer_id) allRoleUserIds.push(ord.issuer_id);
    if (ord.created_by) allRoleUserIds.push(ord.created_by);
  }

  const [roleUserMap, userMap] = await Promise.all([
    getRoleUserMap(allRoleUserIds),
    getUserMap(allUserIds),
  ]);

  // For role_users, fetch their underlying user records too
  const roleUserUserIds = Object.values(roleUserMap).map(r => r.user_id).filter(Boolean);
  const roleUserUsers = await getUserMap(roleUserUserIds);

  // Merge: roleUser + user info into one enriched object
  function enrichRoleUser(roleUserId: string) {
    const ru = roleUserMap[roleUserId];
    if (!ru) return null;
    const u = roleUserUsers[ru.user_id] ?? {};
    return {
      roleUserId,
      role: ru.role,
      status: ru.status,
      userId: ru.user_id,
      name: [u.name, u.surname].filter(Boolean).join(' ').trim() || '—',
      document: u.document || '—',
      documentType: u.document_type || '—',
      type: u.type || '—',
    };
  }

  // ── 5. Enrich transactions with user info ────────────────────────────────
  const enrichedTxs = transactions.map(tx => ({
    ...tx,
    issuer: enrichRoleUser(tx.issuer_id),
    recipient: enrichRoleUser(tx.recipient_id),
  }));

  // ── 6. Enrich UCS batches ────────────────────────────────────────────────
  const enrichedBatches = ucsBatches.map(b => ({
    ...b,
    owner: enrichRoleUser(b.user_id),
  }));

  // ── 7. Enrich certificate orders ─────────────────────────────────────────
  const enrichedAksesOrders = aksesOrder.map(o => ({
    ...o,
    issuer: enrichRoleUser(o.issuer_id),
    createdByUser: enrichRoleUser(o.created_by),
  }));
  const enrichedTvOrders = tvOrder.map(o => ({
    ...o,
    issuer: enrichRoleUser(o.issuer_id),
    createdByUser: enrichRoleUser(o.created_by),
  }));

  // ── 8. Summary ────────────────────────────────────────────────────────────
  const totalUcs = ucsBatches.reduce((s, b) => s + parseFloat(b.initial_amount || '0'), 0);
  const availableUcs = ucsBatches.reduce((s, b) => s + parseFloat(b.available_balance || '0'), 0);

  return NextResponse.json({
    distributionId: DID,
    summary: {
      distributionType:  distribution?.type || '—',
      distributionStatus:distribution?.status || '—',
      harvestYear:       distribution?.harvest_year || '—',
      totalUcsAmount:    distribution?.amount ? parseFloat(distribution.amount) : 0,
      totalUcsInBatches: totalUcs,
      availableUcsInBatches: availableUcs,
      transactionCount:  transactions.length,
      ucsBatchCount:     ucsBatches.length,
      ordersFound:       allOrders.length,
    },
    distribution,
    harvest,
    area,
    transactions: enrichedTxs,
    ucsBatches:   enrichedBatches,
    orders: {
      akses: enrichedAksesOrders,
      tesouroVerde: enrichedTvOrders,
      transfers: aksesTransfer,
      ownership: ownershipTransfer,
    },
  });
}
