import { z } from 'zod';
import { fixEncoding } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const distributionConfigMapping: ImporterConfig = {
  importerKey: 'distribution_configs',
  csvFile: 'dbo_distribution_configuration.csv',
  collection: COLLECTIONS.distributionConfigs,
  originalTable: 'dbo_distribution_configuration',
  schema: z.object({
    id: z.string(),
    description: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    description: fixEncoding(row.description),
    type: row.type || null,
    status: row.status || null,
  }),
};

export const configs = [distributionConfigMapping];
