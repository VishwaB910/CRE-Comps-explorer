from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Comp
from app.schemas import (
    AnalyticsResponse,
    CapRateTrendPoint,
    MarketAggregate,
    PricePerSfTrendPoint,
    PropertyTypeAggregate,
    VolumeByMonthPoint,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsResponse:
    # Load once so SQLite tests and Postgres share the same aggregation path.
    rows = db.execute(
        select(
            Comp.market,
            Comp.property_type,
            Comp.sale_date,
            Comp.price_per_sf,
            Comp.cap_rate,
            Comp.sale_price,
        )
    ).all()

    by_market_map: dict[str, list] = {}
    by_type_map: dict[str, list] = {}
    by_month_map: dict[str, list] = {}

    for row in rows:
        by_market_map.setdefault(row.market, []).append(row)
        by_type_map.setdefault(row.property_type, []).append(row)
        month = row.sale_date.strftime("%Y-%m")
        by_month_map.setdefault(month, []).append(row)

    def avg(values: list[Decimal | float | int]) -> Decimal:
        if not values:
            return Decimal("0")
        return Decimal(str(round(sum(float(v) for v in values) / len(values), 2)))

    by_market = [
        MarketAggregate(
            market=market,
            avg_price_per_sf=avg([r.price_per_sf for r in items]),
            avg_cap_rate=avg([r.cap_rate for r in items]),
            avg_sale_price=avg([r.sale_price for r in items]),
            comp_count=len(items),
        )
        for market, items in sorted(by_market_map.items())
    ]

    by_type = [
        PropertyTypeAggregate(
            property_type=ptype,
            avg_price_per_sf=avg([r.price_per_sf for r in items]),
            avg_cap_rate=avg([r.cap_rate for r in items]),
            avg_sale_price=avg([r.sale_price for r in items]),
            comp_count=len(items),
        )
        for ptype, items in sorted(by_type_map.items())
    ]

    price_trend = [
        PricePerSfTrendPoint(
            sale_month=month,
            avg_price_per_sf=avg([r.price_per_sf for r in items]),
            comp_count=len(items),
        )
        for month, items in sorted(by_month_map.items())
    ]

    cap_trend = [
        CapRateTrendPoint(
            sale_month=month,
            avg_cap_rate=avg([r.cap_rate for r in items]),
            comp_count=len(items),
        )
        for month, items in sorted(by_month_map.items())
    ]

    volume = [
        VolumeByMonthPoint(
            sale_month=month,
            deal_count=len(items),
            total_sale_price=int(sum(int(r.sale_price) for r in items)),
        )
        for month, items in sorted(by_month_map.items())
    ]

    return AnalyticsResponse(
        by_market=by_market,
        by_property_type=by_type,
        price_per_sf_trend=price_trend,
        cap_rate_trend=cap_trend,
        volume_by_month=volume,
    )
