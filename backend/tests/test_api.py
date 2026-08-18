from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Comp


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    samples = [
        Comp(
            comp_id=1,
            address="100 Main St",
            city="Atlanta",
            state="GA",
            zip="30301",
            market="Atlanta",
            property_type="Office",
            square_footage=100000,
            year_built=2010,
            sale_price=25000000,
            price_per_sf=Decimal("250.00"),
            cap_rate=Decimal("6.00"),
            sale_date=date(2025, 11, 1),
            buyer="Buyer A",
            seller="Seller A",
        ),
        Comp(
            comp_id=2,
            address="200 Industrial Blvd",
            city="Houston",
            state="TX",
            zip="77001",
            market="Houston",
            property_type="Industrial",
            square_footage=200000,
            year_built=2015,
            sale_price=18000000,
            price_per_sf=Decimal("90.00"),
            cap_rate=Decimal("7.50"),
            sale_date=date(2025, 9, 15),
            buyer="Buyer B",
            seller="Seller B",
        ),
        Comp(
            comp_id=3,
            address="50 Peachtree Rd",
            city="Atlanta",
            state="GA",
            zip="30319",
            market="Atlanta",
            property_type="Retail",
            square_footage=50000,
            year_built=2000,
            sale_price=9000000,
            price_per_sf=Decimal("180.00"),
            cap_rate=Decimal("6.80"),
            sale_date=date(2025, 12, 20),
            buyer="Buyer C",
            seller="Seller C",
        ),
    ]
    db.add_all(samples)
    db.commit()
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_comps_pagination(client):
    response = client.get("/api/comps", params={"page": 1, "page_size": 2})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["total_pages"] == 2


def test_search_by_city(client):
    response = client.get("/api/comps", params={"q": "Atlanta"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert all(item["city"] == "Atlanta" for item in data["items"])


def test_filter_property_type(client):
    response = client.get("/api/comps", params={"property_type": "Industrial"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["comp_id"] == 2


def test_invalid_price_range(client):
    response = client.get(
        "/api/comps",
        params={"min_price": 20000000, "max_price": 10000000},
    )
    assert response.status_code == 422


def test_get_comp_not_found(client):
    response = client.get("/api/comps/999")
    assert response.status_code == 404


def test_get_comp_detail(client):
    response = client.get("/api/comps/1")
    assert response.status_code == 200
    data = response.json()
    assert data["address"] == "100 Main St"
    assert data["notes"] == []
    assert data["tags"] == []


def test_add_note_and_tag(client):
    note_resp = client.post("/api/comps/1/notes", json={"note_text": "  Strong comps set  "})
    assert note_resp.status_code == 201
    assert note_resp.json()["note_text"] == "Strong comps set"

    tag_resp = client.post("/api/comps/1/tags", json={"tag": "Follow Up"})
    assert tag_resp.status_code == 201
    assert tag_resp.json()["tag"] == "follow up"

    detail = client.get("/api/comps/1").json()
    assert len(detail["notes"]) == 1
    assert len(detail["tags"]) == 1

    duplicate = client.post("/api/comps/1/tags", json={"tag": "follow up"})
    assert duplicate.status_code == 409

    tagged = client.get("/api/comps", params={"tag": "follow up"})
    assert tagged.status_code == 200
    assert tagged.json()["total"] == 1
    assert tagged.json()["items"][0]["comp_id"] == 1

    meta = client.get("/api/comps/meta/filters").json()
    assert "follow up" in meta["tags"]


def test_analytics(client):
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    markets = {row["market"] for row in data["by_market"]}
    assert markets == {"Atlanta", "Houston"}
    types = {row["property_type"] for row in data["by_property_type"]}
    assert "Office" in types
    assert len(data["price_per_sf_trend"]) >= 1
    assert "sale_month" in data["price_per_sf_trend"][0]
    assert len(data["cap_rate_trend"]) >= 1
    assert len(data["volume_by_month"]) >= 1
    assert "avg_sale_price" in data["by_market"][0]


def test_sort_by_city(client):
    response = client.get("/api/comps", params={"sort_by": "city", "sort_order": "asc"})
    assert response.status_code == 200
    cities = [item["city"] for item in response.json()["items"]]
    assert cities == sorted(cities)


def test_export_csv(client):
    response = client.get("/api/comps/export", params={"market": "Atlanta"})
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    body = response.text
    assert "comp_id,address,city" in body
    assert "Atlanta" in body
    assert "Houston" not in body


def test_export_invalid_range(client):
    response = client.get(
        "/api/comps/export",
        params={"min_price": 20000000, "max_price": 10000000},
    )
    assert response.status_code == 422
