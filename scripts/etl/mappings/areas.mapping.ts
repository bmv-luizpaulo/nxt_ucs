import { z } from 'zod';
import { fixEncoding, toBoolean } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const areaMapping: ImporterConfig = {
  importerKey: 'areas',
  csvFile: 'dbo_area.csv',
  collection: COLLECTIONS.areas,
  originalTable: 'dbo_area',
  schema: z.object({
    id: z.string(),
    code: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    private: z.string().optional().nullable(),
    association_id: z.string().optional().nullable(),
    owner_id: z.string().optional().nullable(),
    uf: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    code: row.code || null,
    name: fixEncoding(row.name) || 'Área Sem Nome',
    isPrivate: toBoolean(row.private),
    associationId: row.association_id ? row.association_id.toString() : null,
    ownerId: row.owner_id ? row.owner_id.toString() : null,
    uf: row.uf || null,
    url: row.url || null,
  }),
};

export const configs = [areaMapping];
