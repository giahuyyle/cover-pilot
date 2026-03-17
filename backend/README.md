# Cover Pilot — Backend

Django REST Framework API for AI-powered resume generation. Takes a user's PDF resume and a job description, then returns an optimized resume rendered in LaTeX using a chosen template style.

---

## Stack

- **Django + Django REST Framework** — API framework
- **Firebase Admin SDK** — authentication (ID token verification)
- **Firestore** — user profile storage
- **AI API (TBD)** — resume optimization and LaTeX generation

---

## Project Structure

```
backend/
├── manage.py
├── requirements.txt
│
├── config/                         # Project-level config
│   ├── settings.py                 # Settings (DRF, CORS, Firebase, AI key)
│   ├── urls.py                     # Root URL router
│   └── wsgi.py
│
├── core/                           # Shared utilities
│   ├── auth.py                     # FirebaseAuthentication (DRF BaseAuthentication)
│   ├── firebase.py                 # Firebase Admin SDK initializer
│   ├── permissions.py              # IsFirebaseAuthenticated permission
│   ├── exceptions.py               # Custom DRF exception handler
│   └── urls.py                     # GET /  and  GET /health/
│
└── apps/
    ├── users/                      # User profile (Firestore-backed)
    │   ├── models.py               # User dataclass
    │   ├── services.py             # Firestore CRUD
    │   ├── views.py                # ProfileView
    │   └── urls.py
    │
    └── generator/                  # Resume generation pipeline
        ├── enums.py                # ResumeTemplate enum (classic/modern/minimal/academic)
        ├── serializers.py          # Request validation (pdf, template, prompt, job_description)
        ├── services.py             # PDF extraction + AI API call + LaTeX output
        ├── views.py                # GenerateResumeView
        └── urls.py
```

---

## API Endpoints

### General

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Welcome message |
| GET | `/health/` | No | Health check |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me/` | Yes | Get current user's profile |
| PUT | `/api/users/me/` | Yes | Update current user's profile |

### Generator

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/generate/` | Yes | Generate optimized resume as LaTeX |

#### POST `/api/generate/` — Request (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pdf` | File | Yes | User's resume as a PDF |
| `job_description` | string | Yes | Target job description |
| `template` | string | No | Template style (default: `classic`) |
| `prompt` | string | No | Additional user instructions |

**Template choices:** `classic` · `modern` · `minimal` · `academic`

#### POST `/api/generate/` — Response

```json
{
  "latex": "\\documentclass{...} ...",
  "template": "modern"
}
```

---

## Setup

```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables (copy and fill in)
cp .env.example .env

# 4. Run the development server
python manage.py runserver
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `change-me` |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `*` |
| `FIREBASE_CREDENTIALS` | Path to Firebase service account JSON | `serviceAccountKey.json` |
| `AI_API_KEY` | API key for the AI provider | — |

---

## Authentication

All protected endpoints require a Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

The token is verified server-side via Firebase Admin SDK. On success, `request.user` is the decoded token dict containing `uid`, `email`, etc.
