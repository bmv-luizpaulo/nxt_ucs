import { supabaseAdmin, supabaseDomain, supabaseAnalytics } from '../supabase';

export interface DatabaseConsolidatedBalance {
  id: string;
  user_id?: string | null;
  user_name?: string;
  user_document?: string;
  platform_id?: string | null;
  platform_name?: string;
  available_balance: number;
  reserved_balance: number;
  blocked_balance: number;
  retired_balance: number;
  updated_on?: string | Date | null;
  migrated_at?: string | Date | null;
  migration_version?: string | null;
  source?: string | null;
  original_table?: string | null;
  original_id?: string | null;
  source_hash?: string | null;
  document_hash?: string | null;
}

export interface DatabaseConsolidatedBalancePerYear extends DatabaseConsolidatedBalance {
  harvest_year: number;
}

export interface CustomerBalanceSummary {
  user_id: string;
  user_name: string;
  user_document: string;
  total_available: number;
  total_reserved: number;
  total_blocked: number;
  total_retired: number;
}

export interface WalletPlatformBalance {
  platform_id: string;
  platform_name: string;
  available_balance: number;
  reserved_balance: number;
  blocked_balance: number;
  retired_balance: number;
  updated_on: string;
}

export const BalancesRepository = {
  /**
   * Find consolidated balance by user and platform from domain portfolio positions view.
   */
  async getBalance(userId: string, platformId: string): Promise<DatabaseConsolidatedBalance | null> {
    const { data, error } = await supabaseDomain
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('platform_id', platformId)
      .maybeSingle();

    if (error) {
      console.error(`[BalancesRepository] error fetching consolidated balance from domain portfolio positions view:`, error.message);
      return null;
    }
    return data;
  },

  /**
   * Get consolidated aggregate balances for a customer across all platforms via database RPC.
   */
  async getCustomerBalanceSummary(userId: string): Promise<CustomerBalanceSummary | null> {
    const { data, error } = await supabaseAnalytics
      .rpc('get_customer_balance', { p_user_id: userId })
      .maybeSingle();

    if (error) {
      console.error(`[BalancesRepository] error calling get_customer_balance RPC:`, error.message);
      return null;
    }
    return data as CustomerBalanceSummary | null;
  },

  /**
   * Get platform-specific balance breakdown for a customer via database RPC.
   */
  async getWalletSummary(userId: string): Promise<WalletPlatformBalance[] | null> {
    const { data, error } = await supabaseAnalytics
      .rpc('get_wallet_summary', { p_user_id: userId });

    if (error) {
      console.error(`[BalancesRepository] error calling get_wallet_summary RPC:`, error.message);
      return null;
    }
    return data as WalletPlatformBalance[] | null;
  },

  /**
   * Bulk insert/upsert consolidated balances.
   */
  async bulkUpsertBalances(balances: DatabaseConsolidatedBalance[]): Promise<void> {
    if (balances.length === 0) return;
    const { error } = await supabaseAdmin
      .from('dbo_consolidated_balance')
      .upsert(balances);

    if (error) {
      console.error(`[BalancesRepository] error in bulk upsert balances:`, error.message);
      throw error;
    }
  },

  /**
   * Bulk insert/upsert consolidated balances per year.
   */
  async bulkUpsertBalancesPerYear(balancesPerYear: DatabaseConsolidatedBalancePerYear[]): Promise<void> {
    if (balancesPerYear.length === 0) return;
    const { error } = await supabaseAdmin
      .from('dbo_consolidated_balance_per_year')
      .upsert(balancesPerYear);

    if (error) {
      console.error(`[BalancesRepository] error in bulk upsert balances per year:`, error.message);
      throw error;
    }
  }
};
