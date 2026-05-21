import { z } from 'zod';
import { fixEncoding } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const projectMapping: ImporterConfig = {
  importerKey: 'projects',
  csvFile: 'dbo_project.csv',
  collection: COLLECTIONS.projects,
  originalTable: 'dbo_project',
  schema: z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    name: fixEncoding(row.name) || 'Projeto Sem Nome',
    url: row.url || null,
  }),
};

export const configs = [projectMapping];
