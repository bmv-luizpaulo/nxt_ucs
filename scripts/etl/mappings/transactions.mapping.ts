import { z } from 'zod';
import { fixEncoding, toFloat, toTimestamp, readCSVFile } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

interface TxAuxData {
  platformMap: Record<string, string>;
  roleUserMap: Record<string, { name: string; role: string }>;
}

export const transactionMapping: ImporterConfig<any, any, TxAuxData> = {
  importerKey: 'transactions',
  csvFile: 'dbo_transaction.csv',
  collection: COLLECTIONS.transactions,
  originalTable: 'dbo_transaction',
  schema: z.object({
    id: z.string(),
    amount: z.string().optional().nullable(),
    issuer_id: z.string().optional().nullable(),
    recipient_id: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    target_balance: z.string().optional().nullable(),
    origin_balance: z.string().optional().nullable(),
    created_on: z.string().optional().nullable(),
    finished_on: z.string().optional().nullable(),
    cpr_area_id: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    origin_platform_id: z.string().optional().nullable(),
    origin_platform: z.string().optional().nullable(),
    recipient_platform_id: z.string().optional().nullable(),
  }),
  loadAuxiliaryData: async () => {
    const [users, roleUsers, platforms] = await Promise.all([
      readCSVFile('dbo_user.csv'),
      readCSVFile('dbo_role_user.csv'),
      readCSVFile('dbo_platform.csv'),
    ]);

    const platformMap: Record<string, string> = {};
    for (const p of platforms) {
      platformMap[p.id] = p.alias || p.name;
    }

    const userMap: Record<string, any> = {};
    for (const u of users) {
      userMap[u.id] = u;
    }

    const roleUserMap: Record<string, { name: string; role: string }> = {};
    for (const ru of roleUsers) {
      const u = userMap[ru.user_id] || {};
      const name = [u.name, u.surname].filter(Boolean).join(' ').trim() || '—';
      roleUserMap[ru.id] = {
        name: fixEncoding(name) || '—',
        role: ru.role,
      };
    }

    return { platformMap, roleUserMap };
  },
  transform: (row, auxData) => {
    const roleUserMap = auxData?.roleUserMap || {};
    const platformMap = auxData?.platformMap || {};
    const issuer = roleUserMap[row.issuer_id] || { name: '—', role: '—' };
    const recipient = roleUserMap[row.recipient_id] || { name: '—', role: '—' };

    const translatedRoles: Record<string, string> = {
      'IMEI': 'IMEI',
      'GOVERNMENT': 'Governo',
      'CUSTOMER': 'Cliente',
      'PRODUCER': 'Produtor',
      'PARTNER': 'Parceiro',
      'DISTRIBUTOR': 'Distribuidor',
    };

    return {
      id: row.id.toString(),
      amount: toFloat(row.amount),
      issuerId: row.issuer_id ? row.issuer_id.toString() : null,
      recipientId: row.recipient_id ? row.recipient_id.toString() : null,
      description: fixEncoding(row.description) || null,
      targetBalance: row.target_balance || null,
      originBalance: row.origin_balance || null,
      originalCreatedOn: toTimestamp(row.created_on),
      originalFinishedOn: toTimestamp(row.finished_on),
      cprAreaId: row.cpr_area_id ? row.cpr_area_id.toString() : null,
      distribution_id: row.distribution_id ? row.distribution_id.toString() : null,
      issuer_name: issuer.name,
      issuer_role: translatedRoles[issuer.role] || issuer.role || '—',
      recipient_name: recipient.name,
      recipient_role: translatedRoles[recipient.role] || recipient.role || '—',
      origin_platform: platformMap[row.origin_platform_id] || row.origin_platform || '—',
      recipient_platform: platformMap[row.recipient_platform_id] || '—',
    };
  },
};

export const configs = [transactionMapping];
