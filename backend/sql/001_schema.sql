-- CRE Comps Explorer schema
-- Database: cre_comps

CREATE TABLE IF NOT EXISTS comps (
    comp_id         INTEGER PRIMARY KEY,
    address         TEXT NOT NULL,
    city            TEXT NOT NULL,
    state           CHAR(2) NOT NULL,
    zip             VARCHAR(10) NOT NULL,
    market          TEXT NOT NULL,
    property_type   TEXT NOT NULL
                    CHECK (property_type IN ('Office', 'Retail', 'Industrial', 'Multifamily')),
    square_footage  INTEGER NOT NULL CHECK (square_footage > 0),
    year_built      INTEGER CHECK (year_built >= 1800),
    sale_price      BIGINT NOT NULL CHECK (sale_price > 0),
    price_per_sf    NUMERIC(12, 2) NOT NULL CHECK (price_per_sf > 0),
    cap_rate        NUMERIC(5, 2) NOT NULL CHECK (cap_rate > 0),
    sale_date       DATE NOT NULL,
    buyer           TEXT NOT NULL,
    seller          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comps_market ON comps (market);
CREATE INDEX IF NOT EXISTS idx_comps_property_type ON comps (property_type);
CREATE INDEX IF NOT EXISTS idx_comps_sale_date ON comps (sale_date);
CREATE INDEX IF NOT EXISTS idx_comps_sale_price ON comps (sale_price);
CREATE INDEX IF NOT EXISTS idx_comps_price_per_sf ON comps (price_per_sf);
CREATE INDEX IF NOT EXISTS idx_comps_cap_rate ON comps (cap_rate);
CREATE INDEX IF NOT EXISTS idx_comps_city ON comps (city);

CREATE TABLE IF NOT EXISTS comp_notes (
    id          BIGSERIAL PRIMARY KEY,
    comp_id     INTEGER NOT NULL REFERENCES comps (comp_id) ON DELETE CASCADE,
    note_text   TEXT NOT NULL CHECK (length(trim(note_text)) > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_notes_comp_id ON comp_notes (comp_id);

CREATE TABLE IF NOT EXISTS comp_tags (
    id          BIGSERIAL PRIMARY KEY,
    comp_id     INTEGER NOT NULL REFERENCES comps (comp_id) ON DELETE CASCADE,
    tag         TEXT NOT NULL CHECK (length(trim(tag)) > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (comp_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_comp_tags_comp_id ON comp_tags (comp_id);
CREATE INDEX IF NOT EXISTS idx_comp_tags_tag ON comp_tags (tag);

CREATE TABLE IF NOT EXISTS saved_searches (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
    filters     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches (created_at DESC);

