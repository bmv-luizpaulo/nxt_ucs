import { z } from 'zod';
import { fixEncoding, toFloat, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const cprMapping: ImporterConfig = {
  importerKey: 'cprs',
  csvFile: 'dbo_cpr.csv',
  collection: COLLECTIONS.cprs,
  originalTable: 'dbo_cpr',
  schema: z.object({
    id: z.string(),
    isin: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    representative_name: z.string().optional().nullable(),
    representative_document: z.string().optional().nullable(),
    representative_contact: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    ucs_amount: z.string().optional().nullable(),
    nominal_value: z.string().optional().nullable(),
    emission_date: z.string().optional().nullable(),
    expiration_date: z.string().optional().nullable(),
    created_date: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    processing_message: z.string().optional().nullable(),
    role_user_id: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    isin: row.isin || null,
    name: fixEncoding(row.name) || 'Sem Nome',
    representativeName: fixEncoding(row.representative_name),
    representativeDocument: row.representative_document || null,
    representativeContact: row.representative_contact || null,
    status: row.status || 'UNKNOWN',
    ucsAmount: toFloat(row.ucs_amount),
    nominalValue: toFloat(row.nominal_value),
    emissionDate: toTimestamp(row.emission_date),
    expirationDate: toTimestamp(row.expiration_date),
    originalCreatedAt: toTimestamp(row.created_date),
    description: fixEncoding(row.description),
    processingMessage: fixEncoding(row.processing_message),
    roleUserId: row.role_user_id ? row.role_user_id.toString() : null,
  }),
};

export const configs = [cprMapping];
