-- SQL Schema definition for Supabase Relational Migrations
-- Run this script in the Supabase SQL Editor to initialize all 34 legacy tables.

-- Drop tables if they exist (for rollback/clean reset purposes)
DROP TABLE IF EXISTS dbo_account_adjustments_order CASCADE;
DROP TABLE IF EXISTS plat_akses_distributor_certificate_order CASCADE;
DROP TABLE IF EXISTS plat_akses_client_certificate_order CASCADE;
DROP TABLE IF EXISTS plat_akses_transfer_order CASCADE;
DROP TABLE IF EXISTS plat_akses_purchase_order CASCADE;
DROP TABLE IF EXISTS plat_akses_living_carbon_certificate_order CASCADE;
DROP TABLE IF EXISTS plat_akses_sale_order CASCADE;
DROP TABLE IF EXISTS dbo_stock_availability_certificate_order CASCADE;
DROP TABLE IF EXISTS dbo_movement_intention_order CASCADE;
DROP TABLE IF EXISTS dbo_area CASCADE;
DROP TABLE IF EXISTS dbo_consolidated_balance CASCADE;
DROP TABLE IF EXISTS dbo_consolidated_balance_per_year CASCADE;
DROP TABLE IF EXISTS dbo_blocked_ucs CASCADE;
DROP TABLE IF EXISTS dbo_cpr CASCADE;
DROP TABLE IF EXISTS dbo_distribution CASCADE;
DROP TABLE IF EXISTS dbo_distribution_configuration CASCADE;
DROP TABLE IF EXISTS financial_participant CASCADE;
DROP TABLE IF EXISTS financial_bill_to_pay CASCADE;
DROP TABLE IF EXISTS financial_bill_write_off CASCADE;
DROP TABLE IF EXISTS dbo_harvest CASCADE;
DROP TABLE IF EXISTS dbo_ownership_transfer_order CASCADE;
DROP TABLE IF EXISTS dbo_platform CASCADE;
DROP TABLE IF EXISTS dbo_platform_tags CASCADE;
DROP TABLE IF EXISTS dbo_project CASCADE;
DROP TABLE IF EXISTS dbo_ucs_quote CASCADE;
DROP TABLE IF EXISTS dbo_role_user CASCADE;
DROP TABLE IF EXISTS dbo_transaction CASCADE;
DROP TABLE IF EXISTS plat_tesouro_verde_certificate_order CASCADE;
DROP TABLE IF EXISTS plat_tesouro_verde_partners CASCADE;
DROP TABLE IF EXISTS plat_tesouro_verde_campaigns CASCADE;
DROP TABLE IF EXISTS plat_tesouro_verde_dare_royalties CASCADE;
DROP TABLE IF EXISTS plat_tesouro_verde_compensation_intent CASCADE;
DROP TABLE IF EXISTS dbo_ucs_batch CASCADE;
DROP TABLE IF EXISTS dbo_user CASCADE;

-- 1. dbo_account_adjustments_order
CREATE TABLE dbo_account_adjustments_order (
    id TEXT PRIMARY KEY,
    issuer_id TEXT,
    recipient_id TEXT,
    ucs_transfer_amount NUMERIC,
    distribution_id TEXT,
    status TEXT,
    observations TEXT,
    created_by TEXT,
    original_created_at TIMESTAMPTZ,
    last_modified_by TEXT,
    original_updated_at TIMESTAMPTZ,
    reason_description TEXT,
    type_reason TEXT,
    origin_platform_id TEXT,
    recipient_platform_id TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 2. plat_akses_distributor_certificate_order
CREATE TABLE plat_akses_distributor_certificate_order (
    id TEXT PRIMARY KEY,
    distributor_id TEXT,
    certificate_id TEXT,
    ucs_amount NUMERIC,
    price NUMERIC,
    fee NUMERIC,
    total NUMERIC,
    status TEXT,
    payment_type TEXT,
    distribution_id TEXT,
    billet_id TEXT,
    origin_platform_id TEXT,
    recipient_platform_id TEXT,
    additional_info TEXT,
    created_by TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 3. plat_akses_client_certificate_order
CREATE TABLE plat_akses_client_certificate_order (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    certificate_id TEXT,
    ucs_amount NUMERIC,
    status TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 4. plat_akses_transfer_order
CREATE TABLE plat_akses_transfer_order (
    id TEXT PRIMARY KEY,
    from_id TEXT,
    to_id TEXT,
    ucs_amount NUMERIC,
    harvest_year INTEGER,
    status TEXT,
    description TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 5. plat_akses_purchase_order
CREATE TABLE plat_akses_purchase_order (
    id TEXT PRIMARY KEY,
    buyer_id TEXT,
    ucs_amount NUMERIC,
    price NUMERIC,
    status TEXT,
    distribution_id TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 6. plat_akses_living_carbon_certificate_order
CREATE TABLE plat_akses_living_carbon_certificate_order (
    id TEXT PRIMARY KEY,
    buyer_id TEXT,
    certificate_id TEXT,
    ucs_amount NUMERIC,
    status TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 7. plat_akses_sale_order
CREATE TABLE plat_akses_sale_order (
    id TEXT PRIMARY KEY,
    seller_id TEXT,
    ucs_amount NUMERIC,
    price NUMERIC,
    status TEXT,
    distribution_id TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 8. dbo_stock_availability_certificate_order
CREATE TABLE dbo_stock_availability_certificate_order (
    id TEXT PRIMARY KEY,
    issuer_id TEXT,
    ucs_amount NUMERIC,
    price NUMERIC,
    status TEXT,
    distribution_id TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 9. dbo_movement_intention_order
CREATE TABLE dbo_movement_intention_order (
    id TEXT PRIMARY KEY,
    issuer_id TEXT,
    ucs_amount NUMERIC,
    price NUMERIC,
    status TEXT,
    distribution_id TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 10. dbo_area
CREATE TABLE dbo_area (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    is_private BOOLEAN,
    association_id TEXT,
    owner_id TEXT,
    uf TEXT,
    url TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 11. dbo_consolidated_balance
CREATE TABLE dbo_consolidated_balance (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    platform_id TEXT,
    available_balance NUMERIC,
    reserved_balance NUMERIC,
    blocked_balance NUMERIC,
    retired_balance NUMERIC,
    updated_on TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 12. dbo_consolidated_balance_per_year
CREATE TABLE dbo_consolidated_balance_per_year (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    platform_id TEXT,
    available_balance NUMERIC,
    reserved_balance NUMERIC,
    blocked_balance NUMERIC,
    retired_balance NUMERIC,
    updated_on TIMESTAMPTZ,
    harvest_year INTEGER,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 13. dbo_blocked_ucs
CREATE TABLE dbo_blocked_ucs (
    id TEXT PRIMARY KEY,
    role_user_id TEXT,
    user_id TEXT,
    status TEXT,
    processing_message TEXT,
    reason TEXT,
    description TEXT,
    active BOOLEAN,
    block BOOLEAN,
    area_id TEXT,
    amount NUMERIC,
    created_by TEXT,
    original_created_at TIMESTAMPTZ,
    last_modified_by TEXT,
    original_updated_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 14. dbo_cpr
CREATE TABLE dbo_cpr (
    id TEXT PRIMARY KEY,
    isin TEXT,
    name TEXT,
    representative_name TEXT,
    representative_document TEXT,
    representative_contact TEXT,
    status TEXT,
    ucs_amount NUMERIC,
    nominal_value NUMERIC,
    emission_date TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    original_created_at TIMESTAMPTZ,
    description TEXT,
    processing_message TEXT,
    role_user_id TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 15. dbo_distribution
CREATE TABLE dbo_distribution (
    id TEXT PRIMARY KEY,
    amount NUMERIC,
    status TEXT,
    type TEXT,
    harvest_year INTEGER,
    harvest_id TEXT,
    distribution_origin_id TEXT,
    private_ucs_amount NUMERIC,
    public_ucs_amount NUMERIC,
    error_description TEXT,
    original_created_at TIMESTAMPTZ,
    created_by TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 16. dbo_distribution_configuration
CREATE TABLE dbo_distribution_configuration (
    id TEXT PRIMARY KEY,
    description TEXT,
    type TEXT,
    status TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 17. financial_participant
CREATE TABLE financial_participant (
    id TEXT PRIMARY KEY,
    name TEXT,
    document TEXT,
    document_type TEXT,
    email TEXT,
    status TEXT,
    phone_number TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 18. financial_bill_to_pay
CREATE TABLE financial_bill_to_pay (
    id TEXT PRIMARY KEY,
    participant_id TEXT,
    amount NUMERIC,
    due_date TIMESTAMPTZ,
    status TEXT,
    type TEXT,
    description TEXT,
    cost_center_id TEXT,
    branch_company_id TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 19. financial_bill_write_off
CREATE TABLE financial_bill_write_off (
    id TEXT PRIMARY KEY,
    bill_id TEXT,
    amount NUMERIC,
    write_off_date TIMESTAMPTZ,
    type TEXT,
    description TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 20. dbo_harvest
CREATE TABLE dbo_harvest (
    id TEXT PRIMARY KEY,
    area_id TEXT,
    year INTEGER,
    amount NUMERIC,
    platform_id TEXT,
    registered_on TIMESTAMPTZ,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 21. dbo_ownership_transfer_order
CREATE TABLE dbo_ownership_transfer_order (
    id TEXT PRIMARY KEY,
    ucs_transfer_amount NUMERIC,
    issuer_id TEXT,
    recipient_id TEXT,
    distribution_id TEXT,
    ownership_transfer_type_id TEXT,
    status TEXT,
    retired BOOLEAN,
    negotiated_total NUMERIC,
    created_by TEXT,
    original_created_at TIMESTAMPTZ,
    last_modified_by TEXT,
    original_updated_at TIMESTAMPTZ,
    reason_description TEXT,
    type_reason TEXT,
    nxt_id TEXT,
    year INTEGER,
    origin_platform_id TEXT,
    recipient_platform_id TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 22. dbo_platform
CREATE TABLE dbo_platform (
    id TEXT PRIMARY KEY,
    name TEXT,
    alias TEXT,
    status TEXT,
    is_final_platform BOOLEAN,
    is_public_only BOOLEAN,
    description TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 23. dbo_platform_tags
CREATE TABLE dbo_platform_tags (
    id TEXT PRIMARY KEY,
    name TEXT,
    alias TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 24. dbo_project
CREATE TABLE dbo_project (
    id TEXT PRIMARY KEY,
    name TEXT,
    url TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 25. dbo_ucs_quote
CREATE TABLE dbo_ucs_quote (
    legacy_id TEXT PRIMARY KEY,
    currency TEXT,
    price NUMERIC,
    reference_month TEXT,
    original_created_on TIMESTAMPTZ,
    updated_by TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 26. dbo_role_user
CREATE TABLE dbo_role_user (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT,
    status TEXT,
    created_by TEXT,
    original_created_at TIMESTAMPTZ,
    last_modified_by TEXT,
    original_updated_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 27. dbo_transaction
CREATE TABLE dbo_transaction (
    id TEXT PRIMARY KEY,
    amount NUMERIC,
    issuer_id TEXT,
    recipient_id TEXT,
    description TEXT,
    target_balance TEXT,
    origin_balance TEXT,
    original_created_on TIMESTAMPTZ,
    original_finished_on TIMESTAMPTZ,
    cpr_area_id TEXT,
    distribution_id TEXT,
    issuer_name TEXT,
    issuer_role TEXT,
    recipient_name TEXT,
    recipient_role TEXT,
    origin_platform TEXT,
    recipient_platform TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 28. plat_tesouro_verde_certificate_order
CREATE TABLE plat_tesouro_verde_certificate_order (
    id TEXT PRIMARY KEY,
    issuer_id TEXT,
    rl_partners_campaigns_certificates_id TEXT,
    ucs_amount NUMERIC,
    price NUMERIC,
    fee NUMERIC,
    total NUMERIC,
    discount NUMERIC,
    commission_sum NUMERIC,
    status TEXT,
    payment_type TEXT,
    template_type TEXT,
    distribution_id TEXT,
    billet_id TEXT,
    basket_fee_id TEXT,
    promo_code_id TEXT,
    commission_id TEXT,
    origin_platform_id TEXT,
    recipient_platform_id TEXT,
    public_origin_platform_id TEXT,
    public_recipient_platform_id TEXT,
    public_order_book_queue_id TEXT,
    order_book_queue_id TEXT,
    responsible_document TEXT,
    responsible_name TEXT,
    all_documentation_viewed BOOLEAN,
    additional_info TEXT,
    reason_description TEXT,
    type_reason TEXT,
    created_by TEXT,
    original_created_at TIMESTAMPTZ,
    original_updated_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 29. plat_tesouro_verde_partners
CREATE TABLE plat_tesouro_verde_partners (
    id TEXT PRIMARY KEY,
    name TEXT,
    document TEXT,
    document_type TEXT,
    email TEXT,
    status TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 30. plat_tesouro_verde_campaigns
CREATE TABLE plat_tesouro_verde_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT,
    partner_id TEXT,
    status TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 31. plat_tesouro_verde_dare_royalties
CREATE TABLE plat_tesouro_verde_dare_royalties (
    id TEXT PRIMARY KEY,
    area_id TEXT,
    amount NUMERIC,
    year INTEGER,
    status TEXT,
    reference_date TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 32. plat_tesouro_verde_compensation_intent
CREATE TABLE plat_tesouro_verde_compensation_intent (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    ucs_amount NUMERIC,
    status TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 33. dbo_ucs_batch
CREATE TABLE dbo_ucs_batch (
    id TEXT PRIMARY KEY,
    initial_amount NUMERIC,
    available_balance NUMERIC,
    harvest_year INTEGER,
    user_id TEXT,
    harvest_id TEXT,
    transaction_id TEXT,
    is_retired BOOLEAN,
    original_updated_on TIMESTAMPTZ,
    source_partition TEXT,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- 34. dbo_user
CREATE TABLE dbo_user (
    id TEXT PRIMARY KEY,
    name TEXT,
    surname TEXT,
    document TEXT,
    document_type TEXT,
    cell_phone TEXT,
    phone TEXT,
    type TEXT,
    status TEXT,
    original_created_at TIMESTAMPTZ,
    -- Metadata
    migrated_at TIMESTAMPTZ DEFAULT now(),
    migration_version TEXT,
    source TEXT,
    original_table TEXT,
    original_id TEXT,
    source_hash TEXT,
    document_hash TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dbo_transaction_issuer_id ON dbo_transaction(issuer_id);
CREATE INDEX IF NOT EXISTS idx_dbo_transaction_recipient_id ON dbo_transaction(recipient_id);
CREATE INDEX IF NOT EXISTS idx_dbo_ucs_batch_user_id ON dbo_ucs_batch(user_id);
CREATE INDEX IF NOT EXISTS idx_dbo_consolidated_balance_user_id ON dbo_consolidated_balance(user_id);
CREATE INDEX IF NOT EXISTS idx_dbo_consolidated_balance_per_year_user_id ON dbo_consolidated_balance_per_year(user_id);

-- Grant privileges to service_role (needed for backend/ETL bypass)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

