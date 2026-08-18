from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SavedSearch
from app.schemas import SavedSearchCreate, SavedSearchOut

router = APIRouter(prefix="/saved-searches", tags=["saved-searches"])


@router.get("", response_model=list[SavedSearchOut])
def list_saved_searches(db: Session = Depends(get_db)) -> list[SavedSearchOut]:
    rows = db.scalars(select(SavedSearch).order_by(SavedSearch.created_at.desc())).all()
    return [SavedSearchOut.model_validate(r) for r in rows]


@router.post("", response_model=SavedSearchOut, status_code=status.HTTP_201_CREATED)
def create_saved_search(
    payload: SavedSearchCreate, db: Session = Depends(get_db)
) -> SavedSearchOut:
    row = SavedSearch(name=payload.name, filters=payload.filters or {})
    db.add(row)
    db.commit()
    db.refresh(row)
    return SavedSearchOut.model_validate(row)


@router.delete("/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_search(search_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(SavedSearch, search_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Saved search {search_id} not found")
    db.delete(row)
    db.commit()
