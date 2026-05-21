import { supabaseAdmin, supabaseDomain, supabaseAnalytics } from '../supabase';

export interface DatabaseTransaction {
  id: string;
  amount: number;
  issuer_id?: string | null;
  recipient_id?: string | null;
  description?: string | null;
  target_balance?: string | null;
  target_balance_id?: string | null;
  origin_balance?: string | null;
  origin_balance_id?: string | null;
  original_created_on?: string | Date | null;
  original_finished_on?: string | Date | null;
  cpr_area_id?: string | null;
  distribution_id?: string | null;
  issuer_name?: string | null;
  issuer_document?: string | null;
  issuer_role?: string | null;
  recipient_name?: string | null;
  recipient_document?: string | null;
  recipient_role?: string | null;
  origin_platform?: string | null;
  recipient_platform?: string | null;
  migrated_at?: string | Date | null;
  migration_version?: string | null;
  source?: string | null;
  original_table?: string | null;
  original_id?: string | null;
  source_hash?: string | null;
  document_hash?: string | null;
}

export interface WalletActivityHistoryItem {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  finished_at: string;
  other_party_id: string;
  other_party_name: string;
  direction: 'IN' | 'OUT';
  platform_name: string;
}

export const TransactionsRepository = {
  /**
   * Find a transaction by its unique ID from the domain wallet activities view.
   */
  async getById(id: string): Promise<DatabaseTransaction | null> {
    const { data, error } = await supabaseDomain
      .from('wallet_activities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[TransactionsRepository] error fetching transaction ${id} from domain wallet activities view:`, error.message);
      return null;
    }
    return data;
  },

  /**
   * Fetch paginated transaction history logs for a user where they are sender or receiver.
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WalletActivityHistoryItem[] | null> {
    const { data, error } = await supabaseAnalytics
      .rpc('get_transaction_history', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
      });

    if (error) {
      console.error(`[TransactionsRepository] error calling get_transaction_history RPC:`, error.message);
      return null;
    }
    return data as WalletActivityHistoryItem[] | null;
  },

  /**
   * Upsert a transaction record.
   */
  async upsertTransaction(tx: DatabaseTransaction): Promise<DatabaseTransaction> {
    const { data, error } = await supabaseAdmin
      .from('dbo_transaction')
      .upsert(tx)
      .select()
      .single();

    if (error) {
      console.error(`[TransactionsRepository] error upserting transaction:`, error.message);
      throw error;
    }
    return data;
  },

  /**
   * Bulk insert/upsert transactions.
   */
  async bulkUpsert(transactions: DatabaseTransaction[]): Promise<void> {
    if (transactions.length === 0) return;
    const { error } = await supabaseAdmin
      .from('dbo_transaction')
      .upsert(transactions);

    if (error) {
      console.error(`[TransactionsRepository] error in bulk upsert:`, error.message);
      throw error;
    }
  }
};
