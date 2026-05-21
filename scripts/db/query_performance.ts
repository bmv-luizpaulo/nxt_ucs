import 'dotenv/config';
import { supabaseAnalytics } from '../../src/lib/db/supabase';

async function main() {
  console.log('======================================================');
  console.log('📊 DATABASE QUERY OBSERVABILITY - TOP 10 SLOWEST QUERIES');
  console.log('======================================================');
  console.log('⏳ Fetching execution telemetry from pg_stat_statements...');

  const { data, error } = await supabaseAnalytics
    .from('query_performance')
    .select('*')
    .limit(10);

  if (error) {
    console.error('❌ Error fetching query performance telemetry:', error.message);
    console.log('\n💡 Make sure you have run the scripts/etl/domain_layer.sql script and have pg_stat_statements enabled.');
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('ℹ️ No query telemetry recorded in pg_stat_statements yet.');
    return;
  }

  console.log('\n✅ Top 10 queries sorted by total execution time:');
  console.table(
    data.map((item: any) => ({
      'Total Time (ms)': parseFloat(Number(item.total_time_ms).toFixed(2)),
      'Calls Count': item.calls,
      'Avg Time (ms)': parseFloat(Number(item.mean_time_ms).toFixed(2)),
      'Rows Count': item.total_rows,
      'Query Text': item.query.substring(0, 120).replace(/\s+/g, ' ') + (item.query.length > 120 ? '...' : '')
    }))
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
