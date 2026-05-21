import { z } from 'zod';
import { toFloat, toInt, toTimestamp } from '../core/helpers';
import { COLLECTIONS } from '../core/collections';
import { ImporterConfig } from '../core/importEngine';

export const consolidatedBalanceMapping: ImporterConfig = {
  importerKey: 'consolidated_balances',
  csvFile: 'dbo_consolidated_balance.csv',
  collection: COLLECTIONS.consolidatedBalances,
  originalTable: 'dbo_consolidated_balance',
  schema: z.object({
    id: z.string(),
    user_id: z.string().optional().nullable(),
    platform_id: z.string().optional().nullable(),
    available_balance: z.string().optional().nullable(),
    reserved_balance: z.string().optional().nullable(),
    blocked_balance: z.string().optional().nullable(),
    retired_balance: z.string().optional().nullable(),
    updated_on: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    userId: row.user_id ? row.user_id.toString() : null,
    platformId: row.platform_id ? row.platform_id.toString() : null,
    availableBalance: toFloat(row.available_balance),
    reservedBalance: toFloat(row.reserved_balance),
    blockedBalance: toFloat(row.blocked_balance),
    retiredBalance: toFloat(row.retired_balance),
    updatedOn: toTimestamp(row.updated_on),
  }),
};

export const consolidatedBalancePerYearMapping: ImporterConfig = {
  importerKey: 'consolidated_balances_per_year',
  csvFile: 'dbo_consolidated_balance_per_year.csv',
  collection: COLLECTIONS.consolidatedBalancesPerYear,
  originalTable: 'dbo_consolidated_balance_per_year',
  schema: z.object({
    id: z.string(),
    user_id: z.string().optional().nullable(),
    platform_id: z.string().optional().nullable(),
    available_balance: z.string().optional().nullable(),
    reserved_balance: z.string().optional().nullable(),
    blocked_balance: z.string().optional().nullable(),
    retired_balance: z.string().optional().nullable(),
    updated_on: z.string().optional().nullable(),
    harvest_year: z.string().optional().nullable(),
  }),
  transform: (row) => ({
    id: row.id.toString(),
    userId: row.user_id ? row.user_id.toString() : null,
    platformId: row.platform_id ? row.platform_id.toString() : null,
    availableBalance: toFloat(row.available_balance),
    reservedBalance: toFloat(row.reserved_balance),
    blockedBalance: toFloat(row.blocked_balance),
    retiredBalance: toFloat(row.retired_balance),
    updatedOn: toTimestamp(row.updated_on),
    harvestYear: toInt(row.harvest_year) || null,
  }),
};

export const configs = [consolidatedBalanceMapping, consolidatedBalancePerYearMapping];
