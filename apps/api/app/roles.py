"""Роли пользователей."""

ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_CANDIDATE = "candidate"


def normalize_role(role: str) -> str:
    if role == "user":
        return ROLE_CANDIDATE
    return role
