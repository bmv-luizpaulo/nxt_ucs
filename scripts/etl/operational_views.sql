-- Create Custom Schemas for Anti-Corruption Layer (ACL)
CREATE SCHEMA IF NOT EXISTS operational;
CREATE SCHEMA IF NOT EXISTS analytics;

-- 1. operational.vw_users
CREATE OR REPLACE VIEW operational.vw_users 
WITH (security_barrier=true)
AS
SELECT
    u.id,
    u.name,
    u.surname,
    COALESCE(u.name || ' ' || COALESCE(u.surname, ''), '') AS full_name,
    u.document,
    u.document_type,
    u.cell_phone,
    u.phone,
    u.type,
    u.status,
    u.original_created_at AS created_at,
    u.migration_version
FROM public.dbo_user u;

-- 2. operational.vw_projects
CREATE OR REPLACE VIEW operational.vw_projects
WITH (security_barrier=true)
AS
SELECT
    p.id,
    p.name,
    p.url,
    p.migration_version
FROM public.dbo_project p;

-- 3. operational.vw_transactions
CREATE OR REPLACE VIEW operational.vw_transactions
WITH (security_barrier=true)
AS
SELECT
    t.id,
    t.amount,
    t.description,
    t.original_created_on AS created_at,
    t.original_finished_on AS finished_at,
    t.issuer_id,
    COALESCE(u_iss.name || ' ' || COALESCE(u_iss.surname, ''), t.issuer_name) AS issuer_name,
    COALESCE(u_iss.document, '') AS issuer_document,
    COALESCE(t.issuer_role, '') AS issuer_role,
    t.recipient_id,
    COALESCE(u_rec.name || ' ' || COALESCE(u_rec.surname, ''), t.recipient_name) AS recipient_name,
    COALESCE(u_rec.document, '') AS recipient_document,
    COALESCE(t.recipient_role, '') AS recipient_role,
    t.origin_balance,
    t.target_balance,
    t.origin_platform,
    t.recipient_platform,
    t.migration_version
FROM public.dbo_transaction t
LEFT JOIN public.dbo_user u_iss ON u_iss.id = t.issuer_id
LEFT JOIN public.dbo_user u_rec ON u_rec.id = t.recipient_id;

-- 4. operational.vw_balances
CREATE OR REPLACE VIEW operational.vw_balances
WITH (security_barrier=true)
AS
SELECT
    b.id,
    b.user_id,
    COALESCE(u.name || ' ' || COALESCE(u.surname, ''), '') AS user_name,
    COALESCE(u.document, '') AS user_document,
    b.platform_id,
    p.name AS platform_name,
    b.available_balance,
    b.reserved_balance,
    b.blocked_balance,
    b.retired_balance,
    b.updated_on,
    b.migration_version
FROM public.dbo_consolidated_balance b
LEFT JOIN public.dbo_user u ON u.id = b.user_id
LEFT JOIN public.dbo_platform p ON p.id = b.platform_id;

-- 5. operational.vw_balances_per_year
CREATE OR REPLACE VIEW operational.vw_balances_per_year
WITH (security_barrier=true)
AS
SELECT
    by.id,
    by.user_id,
    COALESCE(u.name || ' ' || COALESCE(u.surname, ''), '') AS user_name,
    COALESCE(u.document, '') AS user_document,
    by.platform_id,
    p.name AS platform_name,
    by.available_balance,
    by.reserved_balance,
    by.blocked_balance,
    by.retired_balance,
    by.harvest_year,
    by.updated_on,
    by.migration_version
FROM public.dbo_consolidated_balance_per_year by
LEFT JOIN public.dbo_user u ON u.id = by.user_id
LEFT JOIN public.dbo_platform p ON p.id = by.platform_id;

-- 6. analytics.mv_financial_summary
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_financial_summary CASCADE;

CREATE MATERIALIZED VIEW analytics.mv_financial_summary AS
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

-- Index for analytics and performance on Materialized View
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_financial_summary ON analytics.mv_financial_summary (participant_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_mv_financial_summary_month ON analytics.mv_financial_summary (billing_month);

-- Grant privileges for service_role to access operational and analytics schemas and tables/views
GRANT USAGE ON SCHEMA operational TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA operational TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA operational GRANT ALL ON TABLES TO service_role;

GRANT USAGE ON SCHEMA analytics TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT ALL ON TABLES TO service_role;
