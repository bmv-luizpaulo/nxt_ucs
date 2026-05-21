import { z } from 'zod';
import { toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const userMapping: ImporterConfig = {
  importerKey: 'users',
  csvFile: 'dbo_user.csv',
  collection: COLLECTIONS.users,
  originalTable: 'dbo_user',
  schema: z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    surname: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    document_type: z.string().optional().nullable(),
    cell_phone: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    created_on: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    name: row.name || 'Sem Nome',
    surname: row.surname || null,
    document: row.document || null,
    documentType: row.document_type || null,
    cellPhone: row.cell_phone || null,
    phone: row.phone || null,
    type: row.type || null,
    status: row.status || 'ACTIVE',
    originalCreatedAt: toTimestamp(row.created_on),
  }),
};
export const configs = [userMapping];
