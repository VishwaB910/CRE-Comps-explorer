from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Comp, CompNote
from app.schemas import NoteCreate, NoteOut

router = APIRouter(prefix="/comps/{comp_id}/notes", tags=["notes"])


def _require_comp(comp_id: int, db: Session) -> Comp:
    comp = db.get(Comp, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Comp {comp_id} not found")
    return comp


@router.get("", response_model=list[NoteOut])
def list_notes(comp_id: int, db: Session = Depends(get_db)) -> list[NoteOut]:
    _require_comp(comp_id, db)
    notes = db.scalars(
        select(CompNote)
        .where(CompNote.comp_id == comp_id)
        .order_by(CompNote.created_at.desc())
    ).all()
    return [NoteOut.model_validate(n) for n in notes]


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    comp_id: int, payload: NoteCreate, db: Session = Depends(get_db)
) -> NoteOut:
    _require_comp(comp_id, db)
    note = CompNote(comp_id=comp_id, note_text=payload.note_text)
    db.add(note)
    db.commit()
    db.refresh(note)
    return NoteOut.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(comp_id: int, note_id: int, db: Session = Depends(get_db)) -> None:
    _require_comp(comp_id, db)
    note = db.scalar(
        select(CompNote).where(CompNote.id == note_id, CompNote.comp_id == comp_id)
    )
    if not note:
        raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
    db.delete(note)
    db.commit()
