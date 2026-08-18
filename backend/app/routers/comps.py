import csv
import io
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.comp_filters import build_comp_filters, sort_expression
from app.database import get_db
from app.models import Comp, CompTag
from app.routers.extras_helpers import get_comp_with_insights
from app.schemas import (
    CompDetailOut,
    CompListResponse,
    CompOut,
    CompareResponse,
    FilterMeta,
    PropertyType,
    SortField,
    SortOrder,
)

router = APIRouter(prefix="/comps", tags=["comps"])

CSV_COLUMNS = [
    "comp_id",
    "address",
    "city",
    "state",
    "zip",
    "market",
    "property_type",
    "square_footage",
    "year_built",
    "sale_price",
    "price_per_sf",
    "cap_rate",
    "sale_date",
    "buyer",
    "seller",
]


@router.get("/meta/filters", response_model=FilterMeta)
def get_filter_meta(db: Session = Depends(get_db)) -> FilterMeta:
    markets = db.scalars(select(Comp.market).distinct().order_by(Comp.market)).all()
    property_types = db.scalars(
        select(Comp.property_type).distinct().order_by(Comp.property_type)
    ).all()
    tags = db.scalars(select(CompTag.tag).distinct().order_by(CompTag.tag)).all()
    return FilterMeta(
        markets=list(markets),
        property_types=list(property_types),
        tags=list(tags),
    )


@router.get("/export")
def export_comps(
    q: str | None = Query(None, description="Search address or city"),
    property_type: PropertyType | None = None,
    market: str | None = None,
    tag: str | None = Query(None, description="Filter by tag (exact, case-insensitive)"),
    min_price: int | None = Query(None, ge=0),
    max_price: int | None = Query(None, ge=0),
    min_cap_rate: float | None = Query(None, ge=0),
    max_cap_rate: float | None = Query(None, ge=0),
    sale_date_from: str | None = Query(None, description="YYYY-MM-DD"),
    sale_date_to: str | None = Query(None, description="YYYY-MM-DD"),
    sort_by: SortField = "sale_date",
    sort_order: SortOrder = "desc",
    db: Session = Depends(get_db),
) -> StreamingResponse:
    filters = build_comp_filters(
        q=q,
        property_type=property_type,
        market=market,
        tag=tag,
        min_price=min_price,
        max_price=max_price,
        min_cap_rate=min_cap_rate,
        max_cap_rate=max_cap_rate,
        sale_date_from=sale_date_from,
        sale_date_to=sale_date_to,
    )
    order_expr = sort_expression(sort_by, sort_order)
    items = db.scalars(
        select(Comp).where(*filters).order_by(order_expr, Comp.comp_id)
    ).all()

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    for item in items:
        writer.writerow(
            {
                "comp_id": item.comp_id,
                "address": item.address,
                "city": item.city,
                "state": item.state,
                "zip": item.zip,
                "market": item.market,
                "property_type": item.property_type,
                "square_footage": item.square_footage,
                "year_built": item.year_built,
                "sale_price": item.sale_price,
                "price_per_sf": item.price_per_sf,
                "cap_rate": item.cap_rate,
                "sale_date": item.sale_date.isoformat(),
                "buyer": item.buyer,
                "seller": item.seller,
            }
        )
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="filtered_comps.csv"'},
    )


@router.get("/compare", response_model=CompareResponse)
def compare_comps(
    ids: str = Query(..., description="Comma-separated comp IDs, 2–4 items"),
    db: Session = Depends(get_db),
) -> CompareResponse:
    try:
        id_list = [int(part.strip()) for part in ids.split(",") if part.strip()]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="ids must be comma-separated integers") from exc

    if len(id_list) < 2 or len(id_list) > 4:
        raise HTTPException(status_code=422, detail="Select between 2 and 4 comps to compare")

    comps = db.scalars(select(Comp).where(Comp.comp_id.in_(id_list))).all()
    by_id = {c.comp_id: c for c in comps}
    missing = [i for i in id_list if i not in by_id]
    if missing:
        raise HTTPException(status_code=404, detail=f"Comps not found: {missing}")

    ordered = [by_id[i] for i in id_list]
    return CompareResponse(items=[CompOut.model_validate(c) for c in ordered])


@router.get("", response_model=CompListResponse)
def list_comps(
    q: str | None = Query(None, description="Search address or city"),
    property_type: PropertyType | None = None,
    market: str | None = None,
    tag: str | None = Query(None, description="Filter by tag (exact, case-insensitive)"),
    min_price: int | None = Query(None, ge=0),
    max_price: int | None = Query(None, ge=0),
    min_cap_rate: float | None = Query(None, ge=0),
    max_cap_rate: float | None = Query(None, ge=0),
    sale_date_from: str | None = Query(None, description="YYYY-MM-DD"),
    sale_date_to: str | None = Query(None, description="YYYY-MM-DD"),
    sort_by: SortField = "sale_date",
    sort_order: SortOrder = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> CompListResponse:
    filters = build_comp_filters(
        q=q,
        property_type=property_type,
        market=market,
        tag=tag,
        min_price=min_price,
        max_price=max_price,
        min_cap_rate=min_cap_rate,
        max_cap_rate=max_cap_rate,
        sale_date_from=sale_date_from,
        sale_date_to=sale_date_to,
    )
    order_expr = sort_expression(sort_by, sort_order)

    total = db.scalar(select(func.count()).select_from(Comp).where(*filters)) or 0
    total_pages = ceil(total / page_size) if total else 0
    offset = (page - 1) * page_size

    items = db.scalars(
        select(Comp)
        .where(*filters)
        .order_by(order_expr, Comp.comp_id)
        .offset(offset)
        .limit(page_size)
    ).all()

    return CompListResponse(
        items=[CompOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{comp_id}", response_model=CompDetailOut)
def get_comp(comp_id: int, db: Session = Depends(get_db)) -> CompDetailOut:
    return get_comp_with_insights(comp_id, db)
