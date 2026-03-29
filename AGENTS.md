# Repository Guidelines

## General Instructions
- ALWAYS run "npm run lint" after making changes in the frontend folder => fix any linting errors

## Project Structure & Module Organization
- Root: `backend/` (Django REST API), `frontend/` (Vite + React UI).
- Backend:
  - `config/` (settings, urls, wsgi), `core/` (auth, permissions, exceptions), `apps/users/`, `apps/generator/`.
  - Tests live in `backend/tests/`.
- Frontend:
  - `src/` (components, pages, layouts, lib), `public/` (assets).

## Build, Test, and Development Commands
- Backend (from `backend/`):
  - Setup: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
  - Run API: `python manage.py runserver` (reads `.env` via `python-dotenv`).
  - Tests: `python manage.py test` (runs Django test suite under `backend/tests`).
- Frontend (from `frontend/`):
  - Install: `npm install`
  - Dev server: `npm run dev` (Vite on localhost)
  - Build: `npm run build` → `dist/`
  - Lint: `npm run lint`; Preview: `npm run preview`

## Coding Style & Naming Conventions
- Python (backend): 4‑space indent, snake_case for functions/modules, PascalCase for classes. Keep app boundaries (`apps/users`, `apps/generator`) clean; reusable code in `core/`.
- JavaScript/React (frontend): 4‑space indentation across React/JS files; ESLint enforced. Components and page files use PascalCase (e.g., `Navbar.jsx`, `TemplateMarket.jsx`). Utilities in `src/lib/` use camelCase.
- API: Add endpoints under app `views.py` + `urls.py`; register in `config/urls.py` via app `urls`.

## Testing Guidelines
- Backend: Prefer Django `TestCase` and request tests for endpoints. Place tests in `backend/tests/` with names like `test_users.py`, `test_templates.py`.
- Aim for coverage on critical flows: auth, `/api/users/me/`, `/api/generate/` happy/error paths.

## Commit & Pull Request Guidelines
- Commits: Follow Conventional Commits where possible: `feat:`, `fix:`, `chore:`, `docs:`, `test:`. Keep messages imperative and scoped (e.g., `feat(generator): add LaTeX template enum`).
- PRs:
  - Include clear description, linked issues, and impact.
  - Backend: list new endpoints, request/response examples.
  - Frontend: add screenshots/GIFs for visible changes.
  - Ensure `npm run lint` passes and backend tests run locally.

## Security & Configuration Tips
- Never commit secrets. Configure `.env` in `backend/` (`SECRET_KEY`, `FIREBASE_CREDENTIALS`, `AI_API_KEY`) and `.env` in `frontend/` for client config.
- Keep `serviceAccountKey.json` local; reference via `FIREBASE_CREDENTIALS`.
- CORS and auth live in `config/settings.py` and `core/auth.py`—update thoughtfully when exposing new routes.
