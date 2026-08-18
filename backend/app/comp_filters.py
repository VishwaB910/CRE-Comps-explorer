from fastapi import HTTPException
from sqlalchemy import exists, or_

from app.models import Comp, CompTag
from app.schemas import PropertyType, SortField, SortOrder

SORTABLE = {
    "address": Comp.address,
    "city": Comp.city,
    "state": Comp.state,
    "market": Comp.market,
    "property_type": Comp.property_type,
    "square_footage": Comp.square_footage,
    "sale_price": Comp.sale_price,
    "price_per_sf": Comp.price_per_sf,
    "cap_rate": Comp.cap_rate,
    "sale_date": Comp.sale_date,
    "buyer": Comp.buyer,
    "seller": Comp.seller,
}


def build_comp_filters(
    *,
    q: str | None = None,
    property_type: PropertyType | None = None,
    market: str | None = None,
    tag: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    min_cap_rate: float | None = None,
    max_cap_rate: float | None = None,
    sale_date_from: str | None = None,
    sale_date_to: str | None = None,
) -> list:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=422,
            detail="min_price cannot be greater than max_price",
        )
    if min_cap_rate is not None and max_cap_rate is not None and min_cap_rate > max_cap_rate:
        raise HTTPException(
            status_code=422,
            detail="min_cap_rate cannot be greater than max_cap_rate",
        )
    if sale_date_from and sale_date_to and sale_date_from > sale_date_to:
        raise HTTPException(
            status_code=422,
            detail="sale_date_from cannot be after sale_date_to",
        )

    filters = []

    if q:
        term = f"%{q.strip()}%"
        filters.append(or_(Comp.address.ilike(term), Comp.city.ilike(term)))
    if property_type:
        filters.append(Comp.property_type == property_type)
    if market:
        filters.append(Comp.market == market)
    if tag:
        normalized = tag.strip().lower()
        if normalized:
            filters.append(
                exists().where(CompTag.comp_id == Comp.comp_id, CompTag.tag == normalized)
            )
    if min_price is not None:
        filters.append(Comp.sale_price >= min_price)
    if max_price is not None:
        filters.append(Comp.sale_price <= max_price)
    if min_cap_rate is not None:
        filters.append(Comp.cap_rate >= min_cap_rate)
    if max_cap_rate is not None:
        filters.append(Comp.cap_rate <= max_cap_rate)
    if sale_date_from:
        filters.append(Comp.sale_date >= sale_date_from)
    if sale_date_to:
        filters.append(Comp.sale_date <= sale_date_to)

    return filters


def sort_expression(sort_by: SortField, sort_order: SortOrder):
    from sqlalchemy import asc, desc

    sort_col = SORTABLE[sort_by]
    return asc(sort_col) if sort_order == "asc" else desc(sort_col)
