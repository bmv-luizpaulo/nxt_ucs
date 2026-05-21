import { z } from 'zod';
import { fixEncoding } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const platformMapping: ImporterConfig = {
  importerKey: 'platforms',
  csvFile: 'dbo_platform.csv',
  collection: COLLECTIONS.platforms,
  originalTable: 'dbo_platform',
  schema: z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    alias: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    final_platform: z.string().optional().nullable(),
    public_only: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    name: fixEncoding(row.name),
    alias: row.alias || null,
    status: row.status || 'ACTIVE',
    isFinalPlatform: row.final_platform === 't' || row.final_platform === 'true',
    isPublicOnly: row.public_only === 't' || row.public_only === 'true',
    description: fixEncoding(row.description),
  }),
};

export const platformTagsMapping: ImporterConfig = {
  importerKey: 'platform_tags',
  csvFile: 'dbo_platform_tags.csv',
  collection: COLLECTIONS.platformTags,
  originalTable: 'dbo_platform_tags',
  schema: z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    alias: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    name: fixEncoding(row.name),
    alias: row.alias || null,
  }),
};
export const configs = [platformMapping, platformTagsMapping];
