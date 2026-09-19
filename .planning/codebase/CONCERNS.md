# Codebase Concerns

**Original analysis:** 2026-05-28
**Reconciled:** 2026-09-19 — rewritten from the working tree. Items that no longer
reproduce are listed under "Resolved" rather than silently dropped.

---

## Resolved since last analysis

| Old concern | Status | Evidence |
|-------------|--------|----------|
| Stub reducers (`floors`, `images`, `users`) | Fixed | `floors.js` has real reducer bodies; `images.js`/`users.js` are gone |
| Health check returned a set | Fixed | `backend/app/routes/__init__.py` returns `{"status": "API running"}` |
| Teams routes/models are stubs | Gone | `teams.py`, `team.py`, `user_team.py`, `notifications.py` deleted |
| Bare `except:` blocks | Fixed | none remain under `backend/app` |
| Hardcoded DB/JWT secrets in compose | Fixed | `${POSTGRES_PASSWORD:?…}` / `${SECRET_KEY:?…}` / `${APP_SECRET:?…}` |
| No backend tests | Fixed | 50 tests pass (`backend/tests/`) |
| Only one backend test file | Fixed | 10 test modules |
| Stale CRA/Jest toolchain docs | Fixed | Vite 8 + Vitest 4 are in use |

## Fixed 2026-09-19

### Image uploads were written under a `None` owner

**Issue:** `upload_image()` built its path from `image.owner_id`, but
`ImageSchema.owner_id` defaults to `None` and is never populated from the request.
Every upload landed in `app/uploads/None/property/None/` and was unreachable by the
owner. Nine such files were committed to git, so this reached production.

**Files:** `backend/app/utils/image_utils.py`, `backend/app/routes/images.py`

**Fix:** the route now passes `owner_id=current_user["id"]` explicitly, and
`upload_image()` refuses a `None` owner instead of silently creating a `None`
directory. Verified live: an upload now lands in
`backend/app/uploads/<owner_id>/property/`.

### `UPLOAD_ROOT` was relative to the process cwd

**Issue:** `UPLOAD_ROOT = "app/uploads/"` resolved differently depending on where
uvicorn started, splitting a user's files between `./app/uploads` and
`backend/app/uploads`.

**Fix:** `UPLOAD_ROOT` is now absolute, derived from the module's own location.

## Open — security

### Development auth bypass returns a real user

**Risk:** `GET /api/auth/session` falls back to user id 42 (or the first user) when no
token is present and `PROJECT_ENV=development`
(`backend/app/routes/auth.py:166-190`). Combined with the default `PROJECT_ENV`, any
unauthenticated caller is treated as that user.

**Mitigation:** gated on `PROJECT_ENV == "development"`. Ensure production sets
`PROJECT_ENV=production`.

### Weak JWT fallback secret

**Risk:** `backend/app/utils/jwt.py:14` — `os.getenv("SECRET_KEY") or secrets.token_urlsafe(64)`.
With no `SECRET_KEY`, every process and restart gets a different key, silently
invalidating all tokens and rejecting other workers' tokens.

**Fix:** raise at import when `SECRET_KEY` is unset (the `manatee` worktree already has
this change; it is not in this tree). `.env` currently sets it, so this is latent.

### Auth cookies not sent on some fetch calls

- `frontend/src/redux/savedTypes.js:23,32,45` — no `credentials: "include"`.
- `frontend/src/redux/session.js:64` — `thunkLogout` DELETE without credentials.

Outside the Vite dev proxy the session cookie is not sent, so these can silently fail.

### Integrity error details leaked to clients

Several routes raise `HTTPException(status_code=500, detail=str(e))` with the raw
exception (e.g. `backend/app/routes/property.py`). Log server-side, return a generic
message.

## Open — data layer

### No database migration system

Schema is managed by `Base.metadata.create_all()`, which does not alter existing
tables. Add Alembic with an initial revision matching current models.

### Foreign keys lack explicit indexes

31 `ForeignKey(...)` declarations across `backend/app/models/` do not set `index=True`.
Postgres does not index FK columns automatically, so `filter(owner_id == …)` — the
shape of nearly every "get all" endpoint — sequential-scans as data grows.

### No pagination on collection endpoints

`GET /api/property/all`, `/api/points/all`, `/api/areas/all`, etc. return the full
result set with no `limit`/`offset`.

## Open — test coverage

The suites are green (**50 backend, 60 frontend**) but thin relative to the codebase:

- `UnifiedEditor`, `UnifiedMap`, and `SectionsPanel` have **no component tests**; the
  sectioning geometry is tested (`sectionGeometry.test.js`), the wiring is guarded by a
  source-reading test (`unifiedEditorWiring.test.js`), but the map interactions are not.
- `RenderPage` (3,028 lines) has no direct tests.

## Open — maintainability

### Very large files

| File | Lines |
|------|-------|
| `frontend/src/pages/RenderPage/RenderPage.jsx` | 3,028 |
| `frontend/src/pages/UnifiedEditor/UnifiedMap.jsx` | 2,621 |
| `frontend/src/components/RenderPageComponents/RenderComponent/RenderComponent.jsx` | 2,369 |
| `frontend/src/pages/UnifiedEditor/UnifiedEditor.jsx` | 1,766 |

### ~40 `console.*` statements remain

CLEAN-01 is not met. Concentrated in `RenderPage.jsx` (12),
`StructureNotesModal.jsx` (4), `useMapStaging.js` (4).

### Silent `catch {}` blocks

`frontend/src/pages/UnifiedEditor/UnifiedMap.jsx` has ~8 empty `catch (e) {}` blocks
around MapLibre layer/source cleanup, plus `sectionGeometry.js:430`. Some are
defensible (removing an absent layer), but a failure there is currently invisible.

## Open — planning vs reality

`.planning/` is git-ignored, so the roadmap does not travel with the code and drifted
badly: it claimed "stopped at Phase 5.1" while the tree had a whole Unified Editor and
a UI-system pivot. `STATE.md` and `ROADMAP.md` were reconciled on 2026-09-19; keep them
in the same commit as the work, or stop tracking them.

---

*Concerns analysis: 2026-05-28 · reconciled 2026-09-19*
