import { z } from 'zod';
import { toFloat, toInt, toBoolean, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

const createBatchConfig = (fileName: string, suffix = ''): ImporterConfig => {
  const key = suffix ? `ucs_batches_${suffix}` : 'ucs_batches';
  return {
    importerKey: key,
    csvFile: fileName,
    collection: COLLECTIONS.ucs_batches,
    originalTable: 'dbo_ucs_batch',
    schema: z.object({
      id: z.string(),
      initial_amount: z.string().optional().nullable(),
      available_balance: z.string().optional().nullable(),
      harvest_year: z.string().optional().nullable(),
      user_id: z.string().optional().nullable(),
      harvest_id: z.string().optional().nullable(),
      transaction_id: z.string().optional().nullable(),
      retired: z.string().optional().nullable(),
      updated_on: z.string().optional().nullable(),
    }),
    transform: (row) => ({
      id: row.id.toString(),
      initialAmount: toFloat(row.initial_amount),
      availableBalance: toFloat(row.available_balance),
      harvestYear: toInt(row.harvest_year) || null,
      userId: row.user_id ? row.user_id.toString() : null,
      harvestId: row.harvest_id ? row.harvest_id.toString() : null,
      transactionId: row.transaction_id ? row.transaction_id.toString() : null,
      isRetired: toBoolean(row.retired),
      originalUpdatedOn: toTimestamp(row.updated_on),
      sourcePartition: fileName,
    }),
  };
};

export const configs = [
  createBatchConfig('dbo_ucs_batch.csv'),
  createBatchConfig('dbo_ucs_batch__2010.csv', '2010'),
  createBatchConfig('dbo_ucs_batch__2020.csv', '2020'),
  createBatchConfig('dbo_ucs_batch__2022.csv', '2022'),
  createBatchConfig('dbo_ucs_batch__2023.csv', '2023'),
];
