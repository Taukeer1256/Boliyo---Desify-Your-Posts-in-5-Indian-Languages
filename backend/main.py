import os
import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = "https://api.sarvam.ai"

app = FastAPI(title="Boliyo API", description="Translate social media posts into Indian languages with audio.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory counters
posts_desified = 0
share_clicks = 0


class TranslateRequest(BaseModel):
    text: str = Field(..., max_length=500, description="Text to translate (max 500 chars)")
    source_language_code: str = Field(default="en-IN", description="Source language code")


class TranslationResult(BaseModel):
    language: str
    language_code: str
    translated_text: str
    flag: str


class DesifyResponse(BaseModel):
    translations: list[TranslationResult]
    hindi_audio_base64: Optional[str]
    posts_desified: int
    error: Optional[str] = None


LANGUAGES = [
    {"code": "hi-IN", "name": "Hindi",   "flag": "🇮🇳"},
    {"code": "bn-IN", "name": "Bengali", "flag": "🔵"},
    {"code": "ta-IN", "name": "Tamil",   "flag": "🌴"},
    {"code": "te-IN", "name": "Telugu",  "flag": "🌺"},
    {"code": "mr-IN", "name": "Marathi", "flag": "🏔️"},
]


async def translate_text(client: httpx.AsyncClient, text: str, target_lang: str, source_lang: str = "en-IN") -> str:
    """Call Sarvam /translate endpoint."""
    payload = {
        "input": text,
        "source_language_code": source_lang,
        "target_language_code": target_lang,
        "model": "mayura:v1",
        "mode": "modern-colloquial",
    }
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        resp = await client.post(f"{SARVAM_BASE_URL}/translate", json=payload, headers=headers, timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        return data.get("translated_text", "")
    except httpx.HTTPStatusError as e:
        body = e.response.text
        raise HTTPException(status_code=e.response.status_code, detail=f"Sarvam translate error: {body}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sarvam API timed out during translation.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")


async def text_to_speech(client: httpx.AsyncClient, text: str, lang_code: str = "hi-IN") -> Optional[str]:
    """Call Sarvam /text-to-speech endpoint. Returns base64 WAV audio or None on error."""
    # bulbul:v3 max 2500 chars; truncate just in case
    safe_text = text[:2500]
    payload = {
        "inputs": [safe_text],
        "target_language_code": lang_code,
        "speaker": "shubh",
        "model": "bulbul:v3",
        "speech_sample_rate": 22050,
    }
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        resp = await client.post(f"{SARVAM_BASE_URL}/text-to-speech", json=payload, headers=headers, timeout=45.0)
        resp.raise_for_status()
        data = resp.json()
        audios = data.get("audios", [])
        return audios[0] if audios else None
    except Exception:
        # TTS failure is non-fatal — return None and let frontend handle it
        return None


@app.get("/health")
async def health():
    return {"status": "ok", "posts_desified": posts_desified}


@app.get("/stats")
async def stats():
    return {"posts_desified": posts_desified, "share_clicks": share_clicks}


@app.post("/share-click")
async def record_share_click():
    global share_clicks
    share_clicks += 1
    return {"share_clicks": share_clicks}


@app.post("/desify", response_model=DesifyResponse)
async def desify(req: TranslateRequest):
    global posts_desified

    if not SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="SARVAM_API_KEY not configured on server.")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")
    if len(text) > 500:
        raise HTTPException(status_code=400, detail="Text too long. Max 500 characters.")

    source_lang = req.source_language_code or "en-IN"

    async with httpx.AsyncClient() as client:
        # Fire all 5 translations in parallel
        translation_tasks = [
            translate_text(client, text, lang["code"], source_lang)
            for lang in LANGUAGES
        ]

        translated_texts = await asyncio.gather(*translation_tasks, return_exceptions=True)

    translations: list[TranslationResult] = []
    hindi_text = ""

    for i, lang in enumerate(LANGUAGES):
        result = translated_texts[i]
        if isinstance(result, Exception):
            translated = f"[Translation failed: {str(result)}]"
        else:
            translated = result

        if lang["code"] == "hi-IN":
            hindi_text = translated if not isinstance(result, Exception) else text

        translations.append(TranslationResult(
            language=lang["name"],
            language_code=lang["code"],
            translated_text=translated,
            flag=lang["flag"],
        ))

    # TTS for Hindi (non-fatal)
    hindi_audio = None
    if hindi_text:
        async with httpx.AsyncClient() as client:
            hindi_audio = await text_to_speech(client, hindi_text, "hi-IN")

    posts_desified += 1

    return DesifyResponse(
        translations=translations,
        hindi_audio_base64=hindi_audio,
        posts_desified=posts_desified,
    )
