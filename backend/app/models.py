from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Comp(Base):
    __tablename__ = "comps"

    comp_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    zip: Mapped[str] = mapped_column(String(10), nullable=False)
    market: Mapped[str] = mapped_column(Text, nullable=False)
    property_type: Mapped[str] = mapped_column(Text, nullable=False)
    square_footage: Mapped[int] = mapped_column(Integer, nullable=False)
    year_built: Mapped[int | None] = mapped_column(Integer)
    sale_price: Mapped[int] = mapped_column(BigInteger, nullable=False)
    price_per_sf: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cap_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    buyer: Mapped[str] = mapped_column(Text, nullable=False)
    seller: Mapped[str] = mapped_column(Text, nullable=False)

    notes: Mapped[list["CompNote"]] = relationship(
        back_populates="comp",
        cascade="all, delete-orphan",
        order_by="CompNote.created_at.desc()",
    )
    tags: Mapped[list["CompTag"]] = relationship(
        back_populates="comp",
        cascade="all, delete-orphan",
        order_by="CompTag.created_at.desc()",
    )


class CompNote(Base):
    __tablename__ = "comp_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    comp_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("comps.comp_id", ondelete="CASCADE"), nullable=False
    )
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    comp: Mapped[Comp] = relationship(back_populates="notes")


class CompTag(Base):
    __tablename__ = "comp_tags"
    __table_args__ = (UniqueConstraint("comp_id", "tag", name="comp_tags_comp_id_tag_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    comp_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("comps.comp_id", ondelete="CASCADE"), nullable=False
    )
    tag: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    comp: Mapped[Comp] = relationship(back_populates="tags")


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    filters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
