import { z } from 'zod';
import { toFloat, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const quoteMapping: ImporterConfig = {
  importerKey: 'quotes',
  csvFile: 'dbo_ucs_quote.csv',
  collection: COLLECTIONS.ucsQuotes,
  originalTable: 'dbo_ucs_quote',
  schema: z.object({
    id: z.string(),
    currency: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    created_on: z.string().optional().nullable(),
    user_id: z.string().optional().nullable(),
  }),
  docId: (row) => {
    const currency = (row.currency || 'UNKNOWN').toUpperCase();
    const dateStr = row.created_on ? row.created_on.substring(0, 7) : row.id;
    return `${currency}_${dateStr}`;
  },
  transform: (row) => {
    const currency = (row.currency || 'UNKNOWN').toUpperCase();
    const dateStr = row.created_on ? row.created_on.substring(0, 7) : row.id;
    return {
      legacyId: row.id.toString(),
      currency,
      price: toFloat(row.price),
      referenceMonth: dateStr,
      originalCreatedOn: toTimestamp(row.created_on),
      updatedBy: row.user_id ? row.user_id.toString() : null,
    };
  },
};

export const configs = [quoteMapping];
