import { z } from 'zod';
import { fixEncoding, toFloat, toBoolean, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const blockedUcsMapping: ImporterConfig = {
  importerKey: 'blocked_ucs',
  csvFile: 'dbo_blocked_ucs.csv',
  collection: COLLECTIONS.blockedUcs,
  originalTable: 'dbo_blocked_ucs',
  schema: z.object({
    id: z.string(),
    role_user_id: z.string().optional().nullable(),
    user_id: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    processing_message: z.string().optional().nullable(),
    reason: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    active: z.string().optional().nullable(),
    block: z.string().optional().nullable(),
    area_id: z.string().optional().nullable(),
    amount: z.string().optional().nullable(),
    created_by: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
    last_modified_by: z.string().optional().nullable(),
    last_modified_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    roleUserId: row.role_user_id ? row.role_user_id.toString() : null,
    userId: row.user_id ? row.user_id.toString() : null,
    status: row.status || null,
    processingMessage: fixEncoding(row.processing_message),
    reason: row.reason || null,
    description: fixEncoding(row.description),
    active: toBoolean(row.active),
    block: toBoolean(row.block),
    areaId: row.area_id ? row.area_id.toString() : null,
    amount: row.amount ? toFloat(row.amount) : null,
    createdBy: row.created_by ? row.created_by.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
    lastModifiedBy: row.last_modified_by ? row.last_modified_by.toString() : null,
    originalUpdatedAt: toTimestamp(row.last_modified_date),
  }),
};

export const configs = [blockedUcsMapping];
