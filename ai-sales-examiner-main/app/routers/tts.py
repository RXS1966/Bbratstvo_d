from fastapi import APIRouter, Response
from pydantic import BaseModel
import openai
import os



router = APIRouter()


openai.api_key = os.getenv("OPENAI_API_KEY")
# openai.api_key = ваш_openai_api_key


class TTSRequest(BaseModel):
    text: str

@router.post("/api/tts")
def tts(req: TTSRequest):
    try:
        response = openai.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="alloy",
            input=req.text
        )

        return Response(content=response.content, media_type="audio/mpeg")
        # return Response(content=audio, media_type="audio/mpeg")

    except Exception as e:
        print("TTS ERROR:", e)
        return {"error": str(e)}