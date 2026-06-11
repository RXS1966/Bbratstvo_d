from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas import SectionResponse
from app.security import get_current_user

router = APIRouter(prefix="/sections", tags=["sections"])

SECTIONS: dict[str, dict[str, str]] = {
    "diagnostic": {
        "title": "Диагностика",
        "description": (
            "Стартовый экран диагностического среза: ввод/выбор "
            "контекста, запуск среза, статус."
        ),
        "status": "live",
        "message": (
            "Данные из PostgreSQL: срезы, статусы draft/running/completed "
            "(GET/POST /api/diagnostic)."
        ),
    },
    "case": {
        "title": "Кейс",
        "description": (
            "Экран кейса: условие, материалы, ответ пользователя, "
            "отправка на оценку."
        ),
        "status": "live",
        "message": (
            "Данные из PostgreSQL: кейсы по срезу, LLM-оценка "
            "(GET/POST /api/cases)."
        ),
    },
    "result": {
        "title": "Результат",
        "description": (
            "Итоги оценки: сводка по завершённому срезу, кейсам "
            "и экзаменам (GET /api/results)."
        ),
        "status": "live",
        "message": (
            "Данные из PostgreSQL: срез, кейсы, экзамены, "
            "баллы и feedback."
        ),
    },
    "exam": {
        "title": "Экзаменатор",
        "description": (
            "Финальный сценарий экзаменатора: вопросы, тайминг, "
            "фиксация ответов."
        ),
        "status": "live",
        "message": (
            "Данные из PostgreSQL: при старте — LLM-вопросы "
            "(или шаблоны без ключа), LLM-оценка ответов."
        ),
    },
    "manager": {
        "title": "Кабинет руководителя",
        "description": (
            "Обзор прогресса команды/кандидатов (GET /api/manager/overview)."
        ),
        "status": "live",
        "message": "Доступно ролям manager и admin.",
    },
}


@router.get("/{section_id}", response_model=SectionResponse)
def get_section(
    section_id: str,
    _current_user: dict[str, str] = Depends(get_current_user),
) -> SectionResponse:
    data = SECTIONS.get(section_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Раздел не найден",
        )
    return SectionResponse(id=section_id, **data)
