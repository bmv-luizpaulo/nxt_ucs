import { z } from 'zod';
import { toInt, toFloat, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const harvestMapping: ImporterConfig = {
  importerKey: 'harvests',
  csvFile: 'dbo_harvest.csv',
  collection: COLLECTIONS.harvests,
  originalTable: 'dbo_harvest',
  schema: z.object({
    id: z.string(),
    area_id: z.string().optional().nullable(),
    year: z.string().optional().nullable(),
    amount: z.string().optional().nullable(),
    platform_id: z.string().optional().nullable(),
    registered_on: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    areaId: row.area_id ? row.area_id.toString() : null,
    year: toInt(row.year) || null,
    amount: toFloat(row.amount),
    platformId: row.platform_id ? row.platform_id.toString() : null,
    registeredOn: toTimestamp(row.registered_on),
    originalCreatedAt: toTimestamp(row.created_date),
  }),
};

export const configs = [harvestMapping];
