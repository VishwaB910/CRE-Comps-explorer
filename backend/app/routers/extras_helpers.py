from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Comp
from app.schemas import CompDetailOut, CompInsights


def _pct_delta(value: Decimal, baseline: Decimal) -> Decimal:
    if baseline == 0:
        return Decimal("0")
    return Decimal(str(round((float(value) - float(baseline)) / float(baseline) * 100, 1)))


def build_insights(db: Session, comp: Comp) -> CompInsights:
    market_avg = db.scalar(
        select(func.avg(Comp.price_per_sf)).where(Comp.market == comp.market)
    ) or comp.price_per_sf
    type_avg_cap = db.scalar(
        select(func.avg(Comp.cap_rate)).where(Comp.property_type == comp.property_type)
    ) or comp.cap_rate
    market_avg_d = Decimal(str(round(float(market_avg), 2)))
    type_avg_d = Decimal(str(round(float(type_avg_cap), 2)))
    return CompInsights(
        market_avg_price_per_sf=market_avg_d,
        type_avg_cap_rate=type_avg_d,
        price_per_sf_vs_market_pct=_pct_delta(comp.price_per_sf, market_avg_d),
        cap_rate_vs_type_pct=_pct_delta(comp.cap_rate, type_avg_d),
    )


def get_comp_with_insights(comp_id: int, db: Session) -> CompDetailOut:
    comp = db.scalar(
        select(Comp)
        .options(selectinload(Comp.notes), selectinload(Comp.tags))
        .where(Comp.comp_id == comp_id)
    )
    if not comp:
        raise HTTPException(status_code=404, detail=f"Comp {comp_id} not found")
    detail = CompDetailOut.model_validate(comp)
    detail.insights = build_insights(db, comp)
    return detail
