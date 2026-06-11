# tts_fallback.py
import asyncio
from typing import Literal, Optional
from pathlib import Path

def _ensure_parent(path: Path) -> None:
    if path.parent:
        path.parent.mkdir(parents=True, exist_ok=True)

async def tts_say(
    text: str,
    out_path: str = "check.mp3",
    engine: Literal["gtts", "edge"] = "gtts",
    voice: str = "ru-RU-DmitryNeural",
    rate: Optional[str] = None,
    pitch: Optional[str] = None,
) -> str:
    """
    Возвращает путь к сохранённому mp3.
    По умолчанию используем gTTS, можно переключить на 'edge' позже.
    При ошибке edge-tts автоматически падаем на gTTS.
    """
    path = Path(out_path)
    _ensure_parent(path)

    if engine == "edge":
        try:
            import edge_tts  # noqa
            comm = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate or "+0%",
                pitch=pitch or "+0Hz",
            )
            await comm.save(str(path))
            return str(path)
        except Exception as e:
            print(f"[edge-tts] ошибка: {e}\n→ Переключаюсь на gTTS...")

    # --- gTTS (надёжный вариант на сейчас)
    from gtts import gTTS
    # gTTS сам разобьёт длинный текст на фрагменты
    tts = gTTS(text=text, lang="ru")
    tts.save(str(path))
    return str(path)

if __name__ == "__main__":
    # Быстрый тест
    asyncio.run(tts_say("Проверка связи. Временная озвучка через gTTS.", "check.mp3", engine="gtts"))
    print("Saved: check.mp3")
