# Boliyo - Desify Your Posts in 5 Indian Languages

Paste any LinkedIn or Twitter/X post, get it translated into Hindi, Bengali, Tamil, Telugu, and Marathi with AI-generated spoken audio. Powered by Sarvam AI.

---

## Features

- 5-language parallel translation (Hindi, Bengali, Tamil, Telugu, Marathi)
- Hindi AI voiceover via Sarvam Bulbul v3 TTS
- Copy button per language card
- Share on X / LinkedIn with pre-filled translated text + link back
- Live counter showing total posts desified (in-memory on backend)
- Zero auth, zero database

---

## Project Structure

```
/
backend/
  main.py               FastAPI app
  requirements.txt
  Procfile              Render deploy config
  .env                  Your API key (gitignored)
  .env.example

frontend/
  app/layout.tsx
  app/page.tsx          Main UI
  app/globals.css
  .env.local            Backend URL
  .env.example
```

---

## Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env: SARVAM_API_KEY=sk_...
uvicorn main:app --reload --port 8000
```

API at: http://localhost:8000
Swagger docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Frontend at: http://localhost:3000

---

## Deploy to Production

### Backend to Render

1. Push repo to GitHub
2. Render > New Web Service > connect repo
3. Root Directory: backend
4. Build Command: pip install -r requirements.txt
5. Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
6. Environment Variable: SARVAM_API_KEY=sk_...
7. Deploy > note your URL (e.g. https://boliyo-api.onrender.com)

### Frontend to Vercel

1. Vercel > New Project > import repo
2. Root Directory: frontend
3. Environment Variable: NEXT_PUBLIC_API_URL=https://boliyo-api.onrender.com
4. Deploy > live at e.g. https://boliyo.vercel.app

---

## Environment Variables

### Backend (backend/.env)
| Variable | Description |
|---|---|
| SARVAM_API_KEY | Sarvam AI subscription key from dashboard.sarvam.ai |

### Frontend (frontend/.env.local)
| Variable | Description |
|---|---|
| NEXT_PUBLIC_API_URL | Full URL of deployed backend, no trailing slash |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /desify | Translate + TTS |
| GET | /stats | Post and share click counters |
| POST | /share-click | Increment share counter |
| GET | /health | Health check |

### /desify Request
```json
{
  "text": "Your post here (max 500 chars)",
  "source_language_code": "en-IN"
}
```

### /desify Response
```json
{
  "translations": [
    { "language": "Hindi", "language_code": "hi-IN", "translated_text": "...", "flag": "..." }
  ],
  "hindi_audio_base64": "UklGRiQ...",
  "posts_desified": 42
}
```

---

## Sarvam AI Endpoints Used

| Endpoint | Model | Purpose |
|---|---|---|
| POST /translate | mayura:v1, modern-colloquial | Text translation |
| POST /text-to-speech | bulbul:v3, speaker: shubh | Hindi voiceover |

Language codes: hi-IN (Hindi), bn-IN (Bengali), ta-IN (Tamil), te-IN (Telugu), mr-IN (Marathi)

---

## Tech Stack

- Backend: FastAPI + httpx (async parallel calls)
- Frontend: Next.js 15 App Router + TypeScript + Tailwind CSS
- AI: Sarvam AI (Translation + TTS)
- Deploy: Render + Vercel

Built in a weekend. Go ship it.
