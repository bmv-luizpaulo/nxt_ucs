import { supabaseAdmin } from '../src/lib/db/supabase';

async function test() {
  console.log("Checking tables in Supabase...");
  const tables = [
    'dbo_certificate',
    'dbo_nxt',
    'plat_tesouro_verde_certificate',
    'plat_akses_living_carbon_certificate',
    'plat_akses_client_certificate',
    'plat_akses_distributor_certificate',
    'dbo_address',
    'dbo_city',
    'dbo_state',
    'dbo_country',
    'dbo_rl_user_address',
    'dbo_rl_user_system',
    'dbo_yearly_area_info',
    'dbo_authentication'
  ];

  for (const t of tables) {
    const { data, error } = await supabaseAdmin.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ Table ${t} is NOT available or error:`, error.message);
    } else {
      console.log(`✅ Table ${t} is available! Row count (limit 1):`, data.length);
    }
  }
}

test().catch(console.error);
