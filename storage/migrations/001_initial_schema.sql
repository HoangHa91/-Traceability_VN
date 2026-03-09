-- =============================================================================
-- MoIT National Food Traceability Hub — Initial Database Schema
-- Database: PostgreSQL 16
-- Encoding: UTF-8
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. Establishments (Cơ Sở Đăng Ký)
-- =============================================================================
CREATE TABLE establishments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_code   VARCHAR(20) UNIQUE NOT NULL,   -- MST / mã đăng ký kinh doanh
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    province_code   CHAR(2),                        -- Mã tỉnh/thành
    oauth_client_id VARCHAR(255) UNIQUE,            -- OAuth2 client_id
    digital_cert    TEXT,                           -- PEM public key (chữ ký số)
    tier            VARCHAR(10) NOT NULL DEFAULT 'PORTAL'
                    CHECK (tier IN ('SFTP', 'API', 'PORTAL')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE establishments IS 'Các cơ sở kinh doanh đã đăng ký với MoIT';
COMMENT ON COLUMN establishments.tier IS 'Kênh nộp dữ liệu: SFTP | API | PORTAL';

-- =============================================================================
-- 2. Products (Sản Phẩm)
-- =============================================================================
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code    VARCHAR(50) UNIQUE NOT NULL,    -- Mã sản phẩm từ cơ sở
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    hs_code         VARCHAR(10),                    -- HS code for customs
    owner_id        UUID NOT NULL REFERENCES establishments(id),
    has_expiry      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Danh mục sản phẩm đã đăng ký';

-- =============================================================================
-- 3. Ingestion Batches (Lô Nộp Dữ Liệu)
-- =============================================================================
CREATE TABLE ingestion_batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id),
    batch_reference VARCHAR(255) NOT NULL,          -- idempotency key from submitter
    submission_date DATE NOT NULL,
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('SFTP', 'API', 'PORTAL')),
    source_file     TEXT,                           -- S3/MinIO path to raw file
    record_count    INTEGER NOT NULL DEFAULT 0,
    valid_count     INTEGER NOT NULL DEFAULT 0,
    quarantine_count INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'VALIDATING', 'VALID', 'PARTIAL', 'FAILED')),
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (establishment_id, batch_reference)     -- prevent duplicate submissions
);

COMMENT ON TABLE ingestion_batches IS 'Mỗi lô dữ liệu được nộp bởi một cơ sở';

-- =============================================================================
-- 4. Traceability Events — HOT STORAGE (last 12 months)
-- =============================================================================
CREATE TABLE traceability_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traceability_code   VARCHAR(64) UNIQUE NOT NULL,    -- assembled by Linker
    -- Mandatory MoIT fields
    product_id          VARCHAR(50) NOT NULL,
    lot_number          VARCHAR(50) NOT NULL,
    location_id         VARCHAR(50) NOT NULL,
    actor_id            VARCHAR(50) NOT NULL,           -- establishment business_code
    event_type          VARCHAR(20) NOT NULL
                        CHECK (event_type IN ('STATE_CHANGE', 'PROPERTY_CHANGE', 'OWNERSHIP_CHANGE')),
    event_timestamp     TIMESTAMPTZ NOT NULL,
    -- One-before / one-after (the core traceability chain)
    prev_event_id       UUID REFERENCES traceability_events(id),
    next_event_id       UUID REFERENCES traceability_events(id),
    -- Supplier & customer refs for human-readable display
    supplier_ref        VARCHAR(64),
    customer_ref        VARCHAR(64),
    -- Flexible event payload
    payload             JSONB NOT NULL DEFAULT '{}',
    -- Audit
    batch_id            UUID NOT NULL REFERENCES ingestion_batches(id),
    validation_hash     VARCHAR(64) NOT NULL,           -- SHA-256 dedup key
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes for safety recall and QR lookup
CREATE INDEX idx_te_product_lot       ON traceability_events (product_id, lot_number);
CREATE INDEX idx_te_timestamp         ON traceability_events (event_timestamp DESC);
CREATE INDEX idx_te_actor             ON traceability_events (actor_id);
CREATE INDEX idx_te_traceability_code ON traceability_events (traceability_code);
CREATE INDEX idx_te_payload           ON traceability_events USING GIN (payload);

COMMENT ON TABLE traceability_events IS
    'Hot storage: sự kiện truy xuất 12 tháng gần nhất. Cũ hơn → MinIO cold archive.';

-- =============================================================================
-- 5. Quarantine (Records that failed validation)
-- =============================================================================
CREATE TABLE quarantined_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID NOT NULL REFERENCES ingestion_batches(id),
    raw_data        JSONB NOT NULL,
    error_messages  TEXT[] NOT NULL,
    quarantined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE quarantined_records IS 'Bản ghi không hợp lệ chờ cơ sở sửa và nộp lại';

-- =============================================================================
-- 6. Public API Materialized Views (Read-only consumer-facing)
-- =============================================================================

-- Consumer trace lookup by product_id
CREATE MATERIALIZED VIEW mv_public_trace_lookup AS
SELECT
    te.traceability_code,
    te.product_id,
    te.lot_number,
    te.location_id,
    te.actor_id,
    te.event_type,
    te.event_timestamp,
    te.supplier_ref,
    te.customer_ref,
    p.name              AS product_name,
    p.category          AS product_category,
    e.name              AS establishment_name,
    e.province_code
FROM traceability_events te
LEFT JOIN products       p ON p.product_code = te.product_id
LEFT JOIN establishments e ON e.business_code = te.actor_id
ORDER BY te.event_timestamp DESC;

CREATE UNIQUE INDEX ON mv_public_trace_lookup (traceability_code);
CREATE INDEX ON mv_public_trace_lookup (product_id, lot_number);

COMMENT ON MATERIALIZED VIEW mv_public_trace_lookup IS
    'Read-only replica for Public API / Cổng Thông Tin. Refreshed nightly by Airflow.';

-- =============================================================================
-- 7. Audit log trigger (auto-update updated_at)
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_establishments_updated_at
    BEFORE UPDATE ON establishments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
