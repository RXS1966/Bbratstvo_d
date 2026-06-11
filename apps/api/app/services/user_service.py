"""Пользователи: хранение в PostgreSQL, демо-учётки при первом запуске."""
from __future__ import annotations

from datetime import datetime, timezone

import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import UserModel
from app.roles import (
    ROLE_ADMIN,
    ROLE_CANDIDATE,
    ROLE_MANAGER,
    normalize_role,
)

DEMO_ACCOUNTS: tuple[tuple[str, str, str], ...] = (
    ("admin", "admin", ROLE_ADMIN),
    ("demo", "demo", ROLE_CANDIDATE),
    ("manager", "manager", ROLE_MANAGER),
)


def _hash_password(plain: str) -> bytes:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt())


def ensure_demo_users(db: Session) -> None:
    """Создать demo/admin/manager, если таблица пуста."""
    if db.scalars(select(UserModel).limit(1)).first() is not None:
        return
    now = datetime.now(timezone.utc)
    for username, password, role in DEMO_ACCOUNTS:
        db.add(
            UserModel(
                username=username,
                password_hash=_hash_password(password),
                role=role,
                created_at=now,
            )
        )
    db.commit()


def get_user(db: Session, username: str) -> UserModel | None:
    key = username.strip().lower()
    return db.get(UserModel, key)


def authenticate_user(
    db: Session,
    username: str,
    password: str,
) -> dict[str, str] | None:
    row = get_user(db, username)
    if row is None:
        return None
    if not bcrypt.checkpw(
        password.encode("utf-8"),
        row.password_hash,
    ):
        return None
    return {
        "username": row.username,
        "role": normalize_role(row.role),
    }
