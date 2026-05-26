-- SQL Schema for Missing Tables

-- dbo_authentication
DROP TABLE IF EXISTS dbo_authentication CASCADE;
CREATE TABLE dbo_authentication (
    "id" TEXT PRIMARY KEY,
    "email" TEXT,
    "password" TEXT,
    "new_password_token" TEXT,
    "password_expiration_date" TEXT,
    "password_reset_required" TEXT,
    "created_by" TEXT,
    "created_date" TEXT,
    "last_modified_by" TEXT,
    "last_modified_date" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_rl_user_address
DROP TABLE IF EXISTS dbo_rl_user_address CASCADE;
CREATE TABLE dbo_rl_user_address (
    "user_id" TEXT,
    "address_id" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_address
DROP TABLE IF EXISTS dbo_address CASCADE;
CREATE TABLE dbo_address (
    "id" TEXT PRIMARY KEY,
    "complement" TEXT,
    "neighborhood" TEXT,
    "number" TEXT,
    "postal_code" TEXT,
    "street" TEXT,
    "address_type" TEXT,
    "city_id" TEXT,
    "country_id" TEXT,
    "active" TEXT,
    "state_registration" TEXT,
    "created_by" TEXT,
    "created_date" TEXT,
    "last_modified_by" TEXT,
    "last_modified_date" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_city
DROP TABLE IF EXISTS dbo_city CASCADE;
CREATE TABLE dbo_city (
    "id" TEXT PRIMARY KEY,
    "correios_code" TEXT,
    "fnde_code" TEXT,
    "ibge_code" TEXT,
    "inss_code" TEXT,
    "siafi_code" TEXT,
    "name" TEXT,
    "state_id" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_state
DROP TABLE IF EXISTS dbo_state CASCADE;
CREATE TABLE dbo_state (
    "id" TEXT PRIMARY KEY,
    "code" TEXT,
    "name" TEXT,
    "uf" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_country
DROP TABLE IF EXISTS dbo_country CASCADE;
CREATE TABLE dbo_country (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_rl_user_system
DROP TABLE IF EXISTS dbo_rl_user_system CASCADE;
CREATE TABLE dbo_rl_user_system (
    "user_id" TEXT,
    "system_type" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_yearly_area_info
DROP TABLE IF EXISTS dbo_yearly_area_info CASCADE;
CREATE TABLE dbo_yearly_area_info (
    "id" TEXT PRIMARY KEY,
    "total_area" TEXT,
    "total_vegetation_area" TEXT,
    "year" TEXT,
    "area_id" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_certificate
DROP TABLE IF EXISTS dbo_certificate CASCADE;
CREATE TABLE dbo_certificate (
    "id" TEXT PRIMARY KEY,
    "code" TEXT,
    "owner_id" TEXT,
    "amount" TEXT,
    "expiration_date" TEXT,
    "d_type" TEXT,
    "nxt_id" TEXT,
    "created_by" TEXT,
    "created_date" TEXT,
    "last_modified_by" TEXT,
    "last_modified_date" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- dbo_nxt
DROP TABLE IF EXISTS dbo_nxt CASCADE;
CREATE TABLE dbo_nxt (
    "id" TEXT PRIMARY KEY,
    "data" TEXT,
    "transaction_id" TEXT,
    "status" TEXT,
    "ref" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- plat_tesouro_verde_certificate
DROP TABLE IF EXISTS plat_tesouro_verde_certificate CASCADE;
CREATE TABLE plat_tesouro_verde_certificate (
    "id" TEXT PRIMARY KEY,
    "certificate_order_id" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- plat_akses_living_carbon_certificate
DROP TABLE IF EXISTS plat_akses_living_carbon_certificate CASCADE;
CREATE TABLE plat_akses_living_carbon_certificate (
    "id" TEXT PRIMARY KEY,
    "certificate_order_id" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- plat_akses_client_certificate
DROP TABLE IF EXISTS plat_akses_client_certificate CASCADE;
CREATE TABLE plat_akses_client_certificate (
    "id" TEXT PRIMARY KEY,
    "certificate_order_id" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- plat_akses_distributor_certificate
DROP TABLE IF EXISTS plat_akses_distributor_certificate CASCADE;
CREATE TABLE plat_akses_distributor_certificate (
    "id" TEXT PRIMARY KEY,
    "certificate_order_id" TEXT,
    "migrated_at" TIMESTAMPTZ DEFAULT now(),
    "migration_version" TEXT,
    "source" TEXT,
    "original_table" TEXT,
    "original_id" TEXT,
    "source_hash" TEXT,
    "document_hash" TEXT
);

-- metadata helper RPC
CREATE OR REPLACE FUNCTION get_tables_metadata()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    columns TEXT[]
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COALESCE(c.reltuples::bigint, 0) AS row_count,
        ARRAY(
            SELECT column_name::TEXT 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t.table_name
            ORDER BY ordinal_position
        ) AS columns
    FROM 
        information_schema.tables t
    LEFT JOIN 
        pg_class c ON c.relname = t.table_name
    WHERE 
        t.table_schema = 'public'
        AND (t.table_name LIKE 'dbo_%' OR t.table_name LIKE 'plat_%' OR t.table_name LIKE 'financial_%' OR t.table_name LIKE 'mundi_%');
END;
$$;
