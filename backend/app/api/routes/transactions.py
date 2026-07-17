import csv
from datetime import date
from io import StringIO
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.finance import Transaction, User
from app.schemas.finance import TransactionCreate, TransactionRead
from app.services.categorizer import categorize

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionRead])
def list_transactions(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> list[Transaction]:
    return list(db.scalars(select(Transaction).where(Transaction.user_id == user.id).order_by(Transaction.posted_at.desc())))


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> Transaction:
    category = payload.category or categorize(payload.description, payload.amount)
    transaction = Transaction(user_id=user.id, category=category, source="manual", **payload.model_dump(exclude={"category"}))
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.post("/upload-csv")
async def upload_csv(file: Annotated[UploadFile, File()], db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> dict:
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV file")
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(StringIO(content))
    required = {"date", "description", "amount"}
    if not reader.fieldnames or not required.issubset({field.lower() for field in reader.fieldnames}):
        raise HTTPException(status_code=400, detail="CSV must include date, description, amount columns")

    created = 0
    for row_number, row in enumerate(reader, start=2):
        normalized = {key.lower(): value for key, value in row.items()}
        try:
            amount = float(normalized["amount"])
            posted_at = date.fromisoformat(normalized["date"])
        except (KeyError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid CSV row {row_number}: amount and date must be valid",
            ) from exc

        transaction = Transaction(
            user_id=user.id,
            posted_at=posted_at,
            description=normalized["description"],
            merchant=normalized.get("merchant", ""),
            category=normalized.get("category") or categorize(normalized["description"], amount),
            amount=amount,
            transaction_type="income" if amount > 0 else "expense",
            source="csv",
        )
        db.add(transaction)
        created += 1
    db.commit()
    return {"created": created}
