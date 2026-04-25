# Cover Pilot

Cover Pilot is a full-stack web app that helps users generate tailored, ATS-friendly resumes from an existing resume PDF and a target job description.

It includes:
- a React frontend for auth, profile, and resume generation
- a Django REST backend for PDF parsing, AI prompt orchestration, LaTeX generation, and PDF output
- provider/model routing for OpenAI and Anthropic resume generation

## Tech Stack

### Frontend
- React 19 + Vite
- Tailwind CSS + shadcn/ui + Radix UI
- Firebase Auth (client-side)
- ESLint

### Backend
- Django 6 + Django REST Framework
- Firebase Admin SDK (token verification/profile storage)
- Firestore + AWS S3
- OpenAI SDK + Anthropic SDK
- pdfplumber + pdflatex (LaTeX -> PDF)

## Project Structure

```text
cover-pilot/
├── backend/     # Django API + resume generation pipeline
├── frontend/    # Vite + React web app
└── README.md    # This file
```

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.11+
- `pdflatex` installed and available on PATH
  - macOS commonly via MacTeX (`/Library/TeX/texbin/pdflatex`)

## Environment Variables

Create these files locally (do not commit secrets):

### `backend/.env`

Required/commonly used:

```bash
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=*

FIREBASE_CREDENTIALS=serviceAccountKey.json

OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
# Optional legacy fallback
AI_API_KEY=

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
AWS_S3_REGION=us-east-1
```

### `frontend/.env`

```bash
VITE_API_URL=http://localhost:8000

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## How to Run (Local Development)

### 1) Run backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

Backend default URL: `http://localhost:8000`

### 2) Run frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Docker (Backend Only)

The backend can be run in Docker with TeX dependencies preinstalled. The frontend remains a separate static app.

```bash
# from repo root
docker compose build backend
docker compose up backend
```

Backend URL in this setup: `http://localhost:8000`

Notes:
- `backend/serviceAccountKey.json` is excluded from Docker build context for security.
- Use `FIREBASE_CREDENTIALS_JSON` in `backend/.env` (or mount credentials at runtime) for Firebase auth flows in containers.
- Point frontend production env to the backend container URL with `VITE_PROD_API_URL`.

## Common Scripts

### Frontend (`frontend/`)

```bash
npm run dev      # start Vite dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # lint frontend code
```

### Backend (`backend/`)

```bash
python manage.py runserver
python manage.py test
```

## API Quick Reference

### Health
- `GET /health/`

### Resume generation
- `POST /api/generate/{provider}/{model}/`
- multipart fields:
  - `pdf` (required)
  - `job_description` (required)
  - `template` (optional)
  - `prompt` (optional)

Supported providers/models:
- `openai`: `gpt-5.4-mini`, `gpt-5.2`
- `anthropic`: `claude-sonnet-4-5`, `claude-sonnet-4-6`

Supported templates:
- `classic`, `modern`, `minimal`, `academic`, `jakes`

## Notes

- The generator compiles LaTeX to PDF server-side, so `pdflatex` must be installed on the backend machine.
- Generated PDFs are stored in S3 and returned as presigned URLs.
- Firebase credentials and API keys must be configured before auth/profile and generation flows work end-to-end.

## Troubleshooting

- `pdflatex not found`: install MacTeX (or another TeX distribution) and ensure `pdflatex` is on PATH.
- `File 'fullpage.sty' not found` (or `titlesec.sty` / `enumitem.sty`) with `template=jakes`: ensure backend build installs `texlive-latex-extra` (configured in `backend/Aptfile` for Heroku apt buildpack).
- Firebase auth/profile errors: verify `serviceAccountKey.json` path and Firebase project permissions.
- Empty/failed generation response: verify AI provider key for the selected provider/model.
- CORS or frontend API errors: confirm `VITE_API_URL` points to the running backend.

## License

This project is licensed under the MIT License. See [LICENSE](/Users/huylegia/Coding-Projects/cover-pilot/LICENSE).
