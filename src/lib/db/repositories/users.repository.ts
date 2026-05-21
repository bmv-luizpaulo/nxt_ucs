import { supabaseAdmin, supabaseDomain } from '../supabase';

export interface DatabaseUser {
  id: string;
  name: string;
  surname: string;
  full_name?: string;
  document: string;
  document_type: string;
  cell_phone?: string;
  phone?: string;
  type: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const UsersRepository = {
  /**
   * Find a user by their unique database ID from the domain customers view.
   */
  async getById(id: string): Promise<DatabaseUser | null> {
    const { data, error } = await supabaseDomain
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[UsersRepository] error fetching user ${id} from domain customers view:`, error.message);
      return null;
    }
    return data;
  },

  /**
   * Upsert a user record.
   */
  async upsertUser(user: DatabaseUser): Promise<DatabaseUser> {
    const { data, error } = await supabaseAdmin
      .from('dbo_user')
      .upsert(user)
      .select()
      .single();

    if (error) {
      console.error(`[UsersRepository] error upserting user:`, error.message);
      throw error;
    }
    return data;
  },

  /**
   * Bulk insert/upsert users for ETL performance.
   */
  async bulkUpsert(users: DatabaseUser[]): Promise<void> {
    if (users.length === 0) return;
    const { error } = await supabaseAdmin
      .from('dbo_user')
      .upsert(users);

    if (error) {
      console.error(`[UsersRepository] error in bulk upsert:`, error.message);
      throw error;
    }
  }
};
