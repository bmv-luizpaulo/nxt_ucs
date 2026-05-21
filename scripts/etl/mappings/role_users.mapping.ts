import { z } from 'zod';
import { toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const roleUserMapping: ImporterConfig = {
  importerKey: 'role_users',
  csvFile: 'dbo_role_user.csv',
  collection: COLLECTIONS.roleUsers,
  originalTable: 'dbo_role_user',
  schema: z.object({
    id: z.string(),
    user_id: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    created_by: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
    last_modified_by: z.string().optional().nullable(),
    last_modified_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    userId: row.user_id ? row.user_id.toString() : null,
    role: row.role || null,
    status: row.status || null,
    createdBy: row.created_by ? row.created_by.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
    lastModifiedBy: row.last_modified_by ? row.last_modified_by.toString() : null,
    originalUpdatedAt: toTimestamp(row.last_modified_date),
  }),
};

export const configs = [roleUserMapping];
