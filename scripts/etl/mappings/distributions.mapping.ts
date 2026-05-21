import { z } from 'zod';
import { fixEncoding, toFloat, toInt, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const distributionMapping: ImporterConfig = {
  importerKey: 'distributions',
  csvFile: 'dbo_distribution.csv',
  collection: COLLECTIONS.distributions,
  originalTable: 'dbo_distribution',
  schema: z.object({
    id: z.string(),
    amount: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    harvest_year: z.string().optional().nullable(),
    harvest_id: z.string().optional().nullable(),
    distribution_origin_id: z.string().optional().nullable(),
    private_ucs_amount: z.string().optional().nullable(),
    public_ucs_amount: z.string().optional().nullable(),
    error_description: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
    created_by: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    amount: toFloat(row.amount),
    status: row.status || null,
    type: row.type || null,
    harvestYear: toInt(row.harvest_year) || null,
    harvestId: row.harvest_id ? row.harvest_id.toString() : null,
    distributionOriginId: row.distribution_origin_id ? row.distribution_origin_id.toString() : null,
    privateUcsAmount: toFloat(row.private_ucs_amount),
    publicUcsAmount: toFloat(row.public_ucs_amount),
    errorDescription: fixEncoding(row.error_description),
    originalCreatedAt: toTimestamp(row.created_date),
    createdBy: row.created_by ? row.created_by.toString() : null,
  }),
};

export const configs = [distributionMapping];
