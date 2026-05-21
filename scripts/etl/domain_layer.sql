-- Custom Business Domain Layer for Anti-Corruption Layer (ACL)
CREATE SCHEMA IF NOT EXISTS domain;

-- 1. domain.customers
-- Maps operational users to clean business names
CREATE OR REPLACE VIEW domain.customers
WITH (security_barrier=true)
AS
SELECT
    id,
    name,
    surname,
    full_name,
    document,
    document_type,
    cell_phone,
    phone,
    type,
    status,
    created_at
FROM operational.vw_users;

-- 2. domain.initiatives
-- Maps operational projects to business initiatives
CREATE OR REPLACE VIEW domain.initiatives
WITH (security_barrier=true)
AS
SELECT
    id,
    name,
    url
FROM operational.vw_projects;

-- 3. domain.wallet_activities
-- Maps operational transactions to clean financial wallet activity logs
CREATE OR REPLACE VIEW domain.wallet_activities
WITH (security_barrier=true)
AS
SELECT
    id,
    amount,
    description,
    created_at,
    finished_at,
    issuer_id,
    issuer_name,
    issuer_document,
    issuer_role,
    recipient_id,
    recipient_name,
    recipient_document,
    recipient_role,
    origin_balance AS origin_balance_id,
    target_balance AS target_balance_id,
    origin_platform,
    recipient_platform
FROM operational.vw_transactions;

-- 4. domain.portfolio_positions
-- Maps operational balances to customer portfolio positions
CREATE OR REPLACE VIEW domain.portfolio_positions
WITH (security_barrier=true)
AS
SELECT
    id,
    user_id,
    user_name,
    user_document,
    platform_id,
    platform_name,
    available_balance,
    reserved_balance,
    blocked_balance,
    retired_balance,
    updated_on
FROM operational.vw_balances;

-- 5. analytics.financial_summary
-- Replaces analytics.mv_financial_summary with a clean, semantic name
DROP MATERIALIZED VIEW IF EXISTS analytics.financial_summary CASCADE;

CREATE MATERIALIZED VIEW analytics.financial_summary AS
SELECT
    p.id AS participant_id,
    p.name AS participant_name,
    p.document AS participant_document,
    DATE_TRUNC('month', b.due_date) AS billing_month,
    COUNT(b.id) AS total_bills,
    SUM(b.amount) AS total_amount_due,
    COALESCE(SUM(wo.amount), 0) AS total_amount_paid,
    SUM(b.amount) - COALESCE(SUM(wo.amount), 0) AS total_amount_pending
FROM public.financial_bill_to_pay b
JOIN public.financial_participant p ON p.id = b.participant_id
LEFT JOIN public.financial_bill_write_off wo ON wo.bill_id = b.id
GROUP BY p.id, p.name, p.document, DATE_TRUNC('month', b.due_date);

-- Unique and month index for performance and concurrent refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_summary ON analytics.financial_summary (participant_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_financial_summary_month ON analytics.financial_summary (billing_month);

-- 6. RPC Function: analytics.get_customer_balance
-- Returns consolidated aggregate balances for a customer across all platforms
CREATE OR REPLACE FUNCTION analytics.get_customer_balance(p_user_id TEXT)
RETURNS TABLE (
    user_id TEXT,
    user_name TEXT,
    user_document TEXT,
    total_available NUMERIC,
    total_reserved NUMERIC,
    total_blocked NUMERIC,
    total_retired NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.user_id,
        MAX(b.user_name) AS user_name,
        MAX(b.user_document) AS user_document,
        COALESCE(SUM(b.available_balance), 0) AS total_available,
        COALESCE(SUM(b.reserved_balance), 0) AS total_reserved,
        COALESCE(SUM(b.blocked_balance), 0) AS total_blocked,
        COALESCE(SUM(b.retired_balance), 0) AS total_retired
    FROM domain.portfolio_positions b
    WHERE b.user_id = p_user_id
    GROUP BY b.user_id;
END;
$$;

-- 6b. RPC Function: analytics.get_wallet_summary
-- Returns platform-specific balances breakdown for a user
CREATE OR REPLACE FUNCTION analytics.get_wallet_summary(p_user_id TEXT)
RETURNS TABLE (
    platform_id TEXT,
    platform_name TEXT,
    available_balance NUMERIC,
    reserved_balance NUMERIC,
    blocked_balance NUMERIC,
    retired_balance NUMERIC,
    updated_on TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.platform_id,
        b.platform_name,
        b.available_balance,
        b.reserved_balance,
        b.blocked_balance,
        b.retired_balance,
        b.updated_on
    FROM domain.portfolio_positions b
    WHERE b.user_id = p_user_id;
END;
$$;

-- 6c. RPC Function: analytics.get_transaction_history
-- Returns list of financial wallet activity records where the user was sender or recipient
CREATE OR REPLACE FUNCTION analytics.get_transaction_history(
    p_user_id TEXT,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    amount NUMERIC,
    description TEXT,
    created_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    other_party_id TEXT,
    other_party_name TEXT,
    direction TEXT,
    platform_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.amount,
        t.description,
        t.created_at,
        t.finished_at,
        CASE 
            WHEN t.issuer_id = p_user_id THEN t.recipient_id 
            ELSE t.issuer_id 
        END AS other_party_id,
        CASE 
            WHEN t.issuer_id = p_user_id THEN t.recipient_name 
            ELSE t.issuer_name 
        END AS other_party_name,
        CASE 
            WHEN t.issuer_id = p_user_id THEN 'OUT'::TEXT 
            ELSE 'IN'::TEXT 
        END AS direction,
        CASE 
            WHEN t.issuer_id = p_user_id THEN t.origin_platform 
            ELSE t.recipient_platform 
        END AS platform_name
    FROM domain.wallet_activities t
    WHERE t.issuer_id = p_user_id OR t.recipient_id = p_user_id
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 7. Query Observability extension setup
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Helper view for Query Performance tracking
CREATE OR REPLACE VIEW analytics.query_performance AS
SELECT 
    query, 
    calls, 
    total_exec_time AS total_time_ms, 
    mean_exec_time AS mean_time_ms, 
    rows AS total_rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC;

-- 8. Scheduled Refreshes setup (pg_cron support check)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
        -- Safely unschedule existing one to prevent duplicates
        PERFORM cron.unschedule('refresh-financial-summary');
        -- Schedule to run hourly
        PERFORM cron.schedule('refresh-financial-summary', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.financial_summary');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
END;
$$;

-- 9. Grant schema/view privileges to roles
GRANT USAGE ON SCHEMA domain TO service_role, authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA domain TO service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA domain GRANT SELECT ON TABLES TO service_role, authenticated, anon;

GRANT USAGE ON SCHEMA analytics TO service_role, authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO service_role, authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA analytics TO service_role, authenticated, anon;
