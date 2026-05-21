import { z } from 'zod';
import { fixEncoding, toFloat, toInt, toBoolean, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const ownershipTransferMapping: ImporterConfig = {
  importerKey: 'ownership_transfers',
  csvFile: 'dbo_ownership_transfer_order.csv',
  collection: COLLECTIONS.ownershipTransfers,
  originalTable: 'dbo_ownership_transfer_order',
  schema: z.object({
    id: z.string(),
    ucs_transfer_amount: z.string().optional().nullable(),
    issuer_id: z.string().optional().nullable(),
    recipient_id: z.string().optional().nullable(),
    distribution_id: z.string().optional().nullable(),
    ownership_transfer_type_id: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    retired: z.string().optional().nullable(),
    negotiated_total: z.string().optional().nullable(),
    created_by: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
    last_modified_by: z.string().optional().nullable(),
    last_modified_date: z.string().optional().nullable(),
    reason_description: z.string().optional().nullable(),
    type_reason: z.string().optional().nullable(),
    nxt_id: z.string().optional().nullable(),
    year: z.string().optional().nullable(),
    origin_platform_id: z.string().optional().nullable(),
    recipient_platform_id: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    ucsTransferAmount: toFloat(row.ucs_transfer_amount),
    issuerId: row.issuer_id ? row.issuer_id.toString() : null,
    recipientId: row.recipient_id ? row.recipient_id.toString() : null,
    distributionId: row.distribution_id ? row.distribution_id.toString() : null,
    ownershipTransferTypeId: row.ownership_transfer_type_id ? row.ownership_transfer_type_id.toString() : null,
    status: row.status || null,
    retired: toBoolean(row.retired),
    negotiatedTotal: row.negotiated_total ? toFloat(row.negotiated_total) : null,
    createdBy: row.created_by ? row.created_by.toString() : null,
    originalCreatedAt: toTimestamp(row.created_date),
    lastModifiedBy: row.last_modified_by ? row.last_modified_by.toString() : null,
    originalUpdatedAt: toTimestamp(row.last_modified_date),
    reasonDescription: fixEncoding(row.reason_description),
    typeReason: row.type_reason || null,
    nxtId: row.nxt_id ? row.nxt_id.toString() : null,
    year: toInt(row.year) || null,
    originPlatformId: row.origin_platform_id ? row.origin_platform_id.toString() : null,
    recipientPlatformId: row.recipient_platform_id ? row.recipient_platform_id.toString() : null,
  }),
};

export const configs = [ownershipTransferMapping];
