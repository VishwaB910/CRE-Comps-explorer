#!/usr/bin/env python3
"""Create schema (if needed) and load sample_comps.csv into Postgres."""

from __future__ import annotations

import csv
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_batch

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "backend" / "sql" / "001_schema.sql"
CSV_PATH = ROOT / "sample_comps.csv"

DB_CONFIG = {
    "host": os.getenv("SQL_HOST", "localhost"),
    "port": int(os.getenv("SQL_PORT", "5432")),
    "user": os.getenv("SQL_USER", "statbrio"),
    "password": os.getenv("SQL_PASS", "2001"),
    "dbname": os.getenv("SQL_DB", "cre_comps"),
}

INSERT_SQL = """
INSERT INTO comps (
    comp_id, address, city, state, zip, market, property_type,
    square_footage, year_built, sale_price, price_per_sf, cap_rate,
    sale_date, buyer, seller
) VALUES (
    %(comp_id)s, %(address)s, %(city)s, %(state)s, %(zip)s, %(market)s,
    %(property_type)s, %(square_footage)s, %(year_built)s, %(sale_price)s,
    %(price_per_sf)s, %(cap_rate)s, %(sale_date)s, %(buyer)s, %(seller)s
)
ON CONFLICT (comp_id) DO UPDATE SET
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip = EXCLUDED.zip,
    market = EXCLUDED.market,
    property_type = EXCLUDED.property_type,
    square_footage = EXCLUDED.square_footage,
    year_built = EXCLUDED.year_built,
    sale_price = EXCLUDED.sale_price,
    price_per_sf = EXCLUDED.price_per_sf,
    cap_rate = EXCLUDED.cap_rate,
    sale_date = EXCLUDED.sale_date,
    buyer = EXCLUDED.buyer,
    seller = EXCLUDED.seller
;
"""


def load_rows(csv_path: Path) -> list[dict]:
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            rows.append(
                {
                    "comp_id": int(row["comp_id"]),
                    "address": row["address"].strip(),
                    "city": row["city"].strip(),
                    "state": row["state"].strip(),
                    "zip": row["zip"].strip(),
                    "market": row["market"].strip(),
                    "property_type": row["property_type"].strip(),
                    "square_footage": int(row["square_footage"]),
                    "year_built": int(row["year_built"]),
                    "sale_price": int(row["sale_price"]),
                    "price_per_sf": float(row["price_per_sf"]),
                    "cap_rate": float(row["cap_rate"]),
                    "sale_date": row["sale_date"].strip(),
                    "buyer": row["buyer"].strip(),
                    "seller": row["seller"].strip(),
                }
            )
        return rows


def main() -> int:
    if not SCHEMA_PATH.exists():
        print(f"Schema file not found: {SCHEMA_PATH}", file=sys.stderr)
        return 1
    if not CSV_PATH.exists():
        print(f"CSV file not found: {CSV_PATH}", file=sys.stderr)
        return 1

    rows = load_rows(CSV_PATH)
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

    print(f"Connecting to {DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}")
    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)
            execute_batch(cur, INSERT_SQL, rows, page_size=100)
            cur.execute("SELECT COUNT(*) FROM comps;")
            count = cur.fetchone()[0]

            demo_notes = [
                (1, "Strong Atlanta office reference — tight cap and recent sale."),
                (1, "Follow up with brokerage for rent roll confirmation."),
                (14, "Austin CBD office — premium $/SF, useful for Class A pricing."),
                (29, "San Francisco outlier on price/SF; flag carefully in client decks."),
                (4, "Multifamily comps set looks clean; check unit mix separately."),
            ]
            for comp_id, note_text in demo_notes:
                cur.execute(
                    """
                    INSERT INTO comp_notes (comp_id, note_text)
                    SELECT %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM comp_notes
                        WHERE comp_id = %s AND note_text = %s
                    )
                    """,
                    (comp_id, note_text, comp_id, note_text),
                )

            demo_tags = [
                (1, "strong comp"),
                (1, "follow up"),
                (14, "strong comp"),
                (29, "outlier"),
                (4, "follow up"),
                (21, "strong comp"),
            ]
            for comp_id, tag in demo_tags:
                cur.execute(
                    """
                    INSERT INTO comp_tags (comp_id, tag)
                    VALUES (%s, %s)
                    ON CONFLICT (comp_id, tag) DO NOTHING
                    """,
                    (comp_id, tag),
                )

            cur.execute("SELECT COUNT(*) FROM comp_notes;")
            note_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM comp_tags;")
            tag_count = cur.fetchone()[0]
        conn.commit()

    print(
        f"Schema applied. Loaded/updated {len(rows)} CSV rows. "
        f"comps={count}, notes={note_count}, tags={tag_count}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
