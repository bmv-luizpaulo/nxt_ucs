import { z } from 'zod';
import { fixEncoding, toFloat, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const adjustmentMapping: ImporterConfig = {
  importerKey: 'adjustments',
  csvFile: 'dbo_account_adjustments_order.csv',
  collection: COLLECTIONS.accountAdjustments,
  originalTable: 'dbo_account_adjustments_order',
  schema: z.object({
    id: z.string(),
    issuer_id: z.string().optional().nullable(),
    recipient_id: z.string().optional().nullable(),
    ucs_transfer_amount: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    observations: z.string().optional().nullable(),
    created_by: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
    last_modified_by: z.string().optional().nullable(),
    last_modified_date: z.string().optional().nullable(),
    reason_description: z.string().optional().nullable(),
    type_reason: z.string().optional().nullable(),
    origin_platform_id: z.string().optional().nullable(),
    recipient_platform_id: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    issuerId: row.issuer_id ? row.issuer_id.toString() : null,
    recipientId: row.recipient_id ? row.recipient_id.toString() : null,
    ucsTransferAmount: toFloat(row.ucs_transfer_amount),
    distributionId: row.distribution_id ? row.distribution_id.toString() : null,
    status: row.status || null,
    observations: fixEncoding(row.observations),
    createdBy: row.created_by ? row.created_by.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
    lastModifiedBy: row.last_modified_by ? row.last_modified_by.toString() : null,
    originalUpdatedAt: toTimestamp(row.last_modified_date),
    reasonDescription: fixEncoding(row.reason_description),
    typeReason: row.type_reason || null,
    originPlatformId: row.origin_platform_id ? row.origin_platform_id.toString() : null,
    recipientPlatformId: row.recipient_platform_id ? row.recipient_platform_id.toString() : null,
  }),
};

export const configs = [adjustmentMapping];
