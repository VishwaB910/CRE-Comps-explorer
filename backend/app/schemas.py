from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PropertyType = Literal["Office", "Retail", "Industrial", "Multifamily"]
SortField = Literal[
    "address",
    "city",
    "state",
    "market",
    "property_type",
    "square_footage",
    "sale_price",
    "price_per_sf",
    "cap_rate",
    "sale_date",
    "buyer",
    "seller",
]
SortOrder = Literal["asc", "desc"]


class CompOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    comp_id: int
    address: str
    city: str
    state: str
    zip: str
    market: str
    property_type: str
    square_footage: int
    year_built: int | None
    sale_price: int
    price_per_sf: Decimal
    cap_rate: Decimal
    sale_date: date
    buyer: str
    seller: str


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    comp_id: int
    note_text: str
    created_at: datetime


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    comp_id: int
    tag: str
    created_at: datetime


class CompInsights(BaseModel):
    market_avg_price_per_sf: Decimal
    type_avg_cap_rate: Decimal
    price_per_sf_vs_market_pct: Decimal
    cap_rate_vs_type_pct: Decimal


class CompDetailOut(CompOut):
    notes: list[NoteOut] = Field(default_factory=list)
    tags: list[TagOut] = Field(default_factory=list)
    insights: CompInsights | None = None


class CompListResponse(BaseModel):
    items: list[CompOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class CompareResponse(BaseModel):
    items: list[CompOut]


class SavedSearchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    filters: dict
    created_at: datetime


class SavedSearchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    filters: dict = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name cannot be empty")
        return cleaned


class NoteCreate(BaseModel):
    note_text: str = Field(min_length=1, max_length=5000)

    @field_validator("note_text")
    @classmethod
    def strip_note(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("note_text cannot be empty")
        return cleaned


class TagCreate(BaseModel):
    tag: str = Field(min_length=1, max_length=100)

    @field_validator("tag")
    @classmethod
    def strip_tag(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned:
            raise ValueError("tag cannot be empty")
        return cleaned


class MarketAggregate(BaseModel):
    market: str
    avg_price_per_sf: Decimal
    avg_cap_rate: Decimal
    avg_sale_price: Decimal
    comp_count: int


class PropertyTypeAggregate(BaseModel):
    property_type: str
    avg_price_per_sf: Decimal
    avg_cap_rate: Decimal
    avg_sale_price: Decimal
    comp_count: int


class PricePerSfTrendPoint(BaseModel):
    sale_month: str
    avg_price_per_sf: Decimal
    comp_count: int


class CapRateTrendPoint(BaseModel):
    sale_month: str
    avg_cap_rate: Decimal
    comp_count: int


class VolumeByMonthPoint(BaseModel):
    sale_month: str
    deal_count: int
    total_sale_price: int


class AnalyticsResponse(BaseModel):
    by_market: list[MarketAggregate]
    by_property_type: list[PropertyTypeAggregate]
    price_per_sf_trend: list[PricePerSfTrendPoint] = Field(default_factory=list)
    cap_rate_trend: list[CapRateTrendPoint] = Field(default_factory=list)
    volume_by_month: list[VolumeByMonthPoint] = Field(default_factory=list)


class FilterMeta(BaseModel):
    markets: list[str]
    property_types: list[str]
    tags: list[str] = Field(default_factory=list)
