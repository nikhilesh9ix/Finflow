from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from pymongo.database import Database

from app.core.security import decode_token_claims
from app.db.mongo import REVOKED_TOKENS, USERS, get_db
from app.models import User


def get_current_user(
    db: Annotated[Database, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = authorization.split(" ", 1)[1]
    claims = decode_token_claims(token)
    if not claims:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    # Tokens issued before jti existed cannot be revoked; they simply expire.
    if claims.get("jti") and db[REVOKED_TOKENS].find_one({"jti": claims["jti"]}, {"_id": 1}):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session has been signed out")

    user = User.from_doc(db[USERS].find_one({"email": claims["sub"]}))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
