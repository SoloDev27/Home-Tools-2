# Technology Stack

**Analysis Date:** 2026-05-28
**Reconciled:** 2026-09-19 — the UI system is now `@astryxdesign`, not shadcn/Tailwind,
and a Unified Editor / Maps feature set plus Areas/Features/Notes backend have landed.

## Languages

**Primary:**
- JavaScript (ES2020+) - Frontend application code (`frontend/src/`)
- Python 3.11 - Backend API (`backend/`)

**Secondary:**
- None detected — no TypeScript, no JSX typing. All frontend files use `.js`/`.jsx` extensions without type annotations.

## Runtime

**Environment:**
- **Node.js 20** (Alpine, via `frontend/Dockerfile`) — React build and dev server
- **Python 3.11** (via `backend/Dockerfile`) — FastAPI backend

**Package Manager:**
- **npm** — Frontend (`frontend/package-lock.json` present)
- **pip** — Backend (`backend/requirements.txt`)

## Frameworks

**Core:**
- **React 19.2.4** — UI framework (`frontend/package.json`)
- **Vite 8.1** + `@vitejs/plugin-react` — build/dev server (replaced Create React App)
- **FastAPI** — Python REST API framework (`backend/requirements.txt`)

**Styling / UI:**
- **@astryxdesign/core, /theme-neutral, /cli 0.6.2** + **@stylexjs/stylex** — component
  system and styling. This replaced shadcn/ui and Tailwind; `frontend/components.json`
  and `frontend/src/components/ui/` no longer exist. See `frontend/AGENTS.md` for the
  Astryx usage rules.

**State Management:**
- **Redux Toolkit 2.11.2** + **React-Redux 9.2.0** — Client-side state (`frontend/src/redux/`)

**Routing:**
- **React Router DOM 7.13.1** — Client-side SPA routing (`frontend/src/router/index.jsx`)

**ORM/Database:**
- **SQLAlchemy 2.0.49** — Python ORM (`backend/requirements.txt`, `backend/app/db/session.py`)
- **Pydantic v2** — Data validation/serialization (used alongside SQLAlchemy models, `backend/app/models/`)

**Testing:**
- **Vitest 4.1** + **jsdom** — Frontend testing (`frontend/src/__tests__/`, `frontend/vitest.config.js`)
- **pytest 9.0.3** + **pytest-asyncio 1.3.0** — Backend testing (`backend/tests/`)

**Build/Dev:**
- **Vite 8.1** — Frontend build tooling
- **Uvicorn** — ASGI server for FastAPI

## Key Dependencies

**Critical:**
- **@reduxjs/toolkit 2.11.2** — Core state management pattern; all Redux slices use `configureStore` with reducer map (`frontend/src/redux/store.js`)
- **react-router-dom 7.13.1** — All navigation, `createBrowserRouter` pattern (`frontend/src/router/index.jsx`)
- **maplibre-gl 5.19.0** — Interactive map rendering; primary data visualization surface (`frontend/src/components/EditorPage/Map/MapComponent.jsx`)
- **SQLAlchemy 2.0.49** — All database CRUD, session management, model definitions across `backend/app/models/` and `backend/app/routes/`
- **python-jose** — JWT token creation/decoding (`backend/app/utils/jwt.py`)

**Map & Drawing:**
- **maplibre-gl 5.19.0** — Open-source map rendering, GeoJSON layers, marker management
- **konva 10.2.3** + **react-konva 19.2.3** — Canvas-based drawing tools for floor plan rendering (`frontend/src/components/RenderPageComponents/`)
- **three 0.184.0** + **@react-three/fiber** + **@react-three/drei** — 3D objects and render stages
- **@turf/turf 7.3.4** — Geospatial analysis (`functions/booleanOps.js`, `functions/outlineValidation.js`, `functions/sectionGeometry.js`)
- **dxf-parser** + **jspdf** — outline import/export

**WYSIWYG Editor:**
- **@milkdown/core, @milkdown/crepe, @milkdown/kit, @milkdown/react, @milkdown/preset-commonmark, @milkdown/plugin-listener, @milkdown/theme-nord** all ^7.20.0 — Markdown WYSIWYG editor for property notes (`frontend/src/components/EditorPage/PropertyDetailsSidebar/MilkdownEditor.jsx`, `NodeDetailsEditor.jsx`)

**UI Utilities:**
- **react-arborist 3.5.0** — Tree view component (likely for hierarchy/navigation)
- **react-konva** — Canvas rendering for floor plan render page

**Authentication:**
- **passlib[bcrypt] 1.7.4** + **bcrypt 3.2.2** — Password hashing/verification (`backend/app/routes/auth.py`)
- **python-jose[cryptography]** — JWT token encode/decode (`backend/app/utils/jwt.py`)

**Infrastructure:**
- **psycopg2-binary** — PostgreSQL adapter for SQLAlchemy
- **python-multipart** — File upload handling (`backend/app/routes/images.py`)
- **httpx 0.28.1** — HTTP client (installed, usage not confirmed in source)

## Configuration

**Environment:**
- `.env` file at project root — loaded by `backend/main.py`, `backend/app/db/session.py`, `backend/app/utils/jwt.py`, and `frontend/src/setupProxy.js`
- `.env.example` committed to repo — documents available vars

**Key config values:**
| Variable | Default | Purpose |
|----------|---------|---------|
| `POSTGRES_URL` | — | Database connection string |
| `SECRET_KEY` | `CHANGE_ME_IN_PRODUCTION!..` | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token expiry |
| `PROJECT_ENV` | `development` | Environment toggle (affects cookie security) |
| `FRONTEND` | `3000` | Frontend port |
| `BACKEND` | `8888` | Backend port (prod) |
| `BACKEND_INTERNAL_PORT` | `8000` | Backend container port |
| `ADMINER` | `8881` | Adminer port |

**Build:**
- `frontend/Dockerfile` — Multi-stage build: Node 20-alpine → nginx:stable-alpine
- `backend/Dockerfile` — Single-stage: Python 3.11 → uvicorn
- `docker-compose.yml` — Orchestrates db (postgres:15), backend, frontend, adminer
- `frontend/default.conf` — nginx template with envsubst for `BACKEND_INTERNAL_PORT`

## Platform Requirements

**Development:**
- Python 3.11+ with `venv`
- Node.js 20+
- Docker (for PostgreSQL via `docker-compose up -d db`)
- npm (for frontend dependencies)
- Start script: `start_local.sh` (loads `.env`, starts uvicorn + react-scripts)

**Production:**
- Docker + Docker Compose (full stack via `docker-compose up`)
- Deployment: containerized services behind nginx reverse proxy

---

*Stack analysis: 2026-05-28*
