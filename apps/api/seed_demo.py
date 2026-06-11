"""Наполнить БД демо-данными для пользователя demo (презентация за 5 минут)."""
from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.case import CaseModel
from app.models.diagnostic import DiagnosticSessionModel
from app.models.exam import ExamSessionModel
from app.services import user_service

DEMO_USER = "demo"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def seed(db: Session) -> None:
    user_service.ensure_demo_users(db)
    stmt = (
        select(DiagnosticSessionModel)
        .where(
            DiagnosticSessionModel.owner_username == DEMO_USER,
            DiagnosticSessionModel.status == "completed",
        )
        .limit(1)
    )
    existing = db.scalars(stmt).first()
    if existing is not None:
        print(
            f"У пользователя {DEMO_USER} уже есть завершённый срез "
            f"({existing.id}). Пропуск seed."
        )
        return

    now = _now()
    session_id = str(uuid.uuid4())
    diagnostic = DiagnosticSessionModel(
        id=session_id,
        owner_username=DEMO_USER,
        role_title="Руководитель продукта",
        context=(
            "Запуск B2B-продукта в сегменте SMB: команда 8 человек, "
            "срок выхода на рынок — 4 месяца."
        ),
        kpi_notes="MRR, конверсия в оплату, NPS пилотных клиентов",
        status="completed",
        result_summary="Срез завершён (seed).",
        created_at=now,
        updated_at=now,
    )
    db.add(diagnostic)

    case = CaseModel(
        id=str(uuid.uuid4()),
        owner_username=DEMO_USER,
        diagnostic_session_id=session_id,
        title="Приоритизация фич перед релизом",
        brief=(
            "Два ключевых стейкхолдера требуют противоречащие фичи. "
            "Как вы примете решение?"
        ),
        materials="Roadmap v2, отзывы 12 пилотов",
        user_answer=(
            "Соберу критерии impact/effort, проведу короткое интервью "
            "с пилотами, зафиксирую решение в one-pager."
        ),
        status="submitted",
        score=78,
        feedback="Seed: структурный ответ с опорой на данные.",
        created_at=now,
        updated_at=now,
    )
    db.add(case)

    exam = ExamSessionModel(
        id=str(uuid.uuid4()),
        owner_username=DEMO_USER,
        diagnostic_session_id=session_id,
        title="Экзамен: Руководитель продукта",
        status="draft",
        time_limit_minutes=30,
        created_at=now,
        updated_at=now,
    )
    db.add(exam)
    db.commit()
    print(f"Seed готов для {DEMO_USER}: срез {session_id}, кейс, черновик экзамена.")


def main() -> int:
    db = SessionLocal()
    try:
        seed(db)
    except Exception as exc:
        print(f"Ошибка seed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
