from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Comp, CompTag
from app.schemas import TagCreate, TagOut

router = APIRouter(prefix="/comps/{comp_id}/tags", tags=["tags"])


def _require_comp(comp_id: int, db: Session) -> Comp:
    comp = db.get(Comp, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Comp {comp_id} not found")
    return comp


@router.get("", response_model=list[TagOut])
def list_tags(comp_id: int, db: Session = Depends(get_db)) -> list[TagOut]:
    _require_comp(comp_id, db)
    tags = db.scalars(
        select(CompTag).where(CompTag.comp_id == comp_id).order_by(CompTag.created_at.desc())
    ).all()
    return [TagOut.model_validate(t) for t in tags]


@router.post("", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(comp_id: int, payload: TagCreate, db: Session = Depends(get_db)) -> TagOut:
    _require_comp(comp_id, db)
    tag = CompTag(comp_id=comp_id, tag=payload.tag)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail=f"Tag '{payload.tag}' already exists on this comp"
        ) from exc
    db.refresh(tag)
    return TagOut.model_validate(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(comp_id: int, tag_id: int, db: Session = Depends(get_db)) -> None:
    _require_comp(comp_id, db)
    tag = db.scalar(
        select(CompTag).where(CompTag.id == tag_id, CompTag.comp_id == comp_id)
    )
    if not tag:
        raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
    db.delete(tag)
    db.commit()
