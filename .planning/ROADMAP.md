# Roadmap: Home Tools 2

## Phase 1: Page Reorganization
**Goal:** Move page components from `components/` into `pages/` directory
**Status:** ✓ Complete
**Requirements:** (infrastructure — no REQ-IDs)
**Plans:** 5/5 ✓

**Success Criteria:**
1. All page components exist in `frontend/src/pages/` with barrel exports
2. Router imports point to `pages/` instead of `components/`
3. Frontend build passes

---

## Phase 2: Import Audit & Cleanup
**Goal:** Remove dead code, fix stale imports, clean up unused files
**Status:** ✓ Complete
**Requirements:** (infrastructure — no REQ-IDs)
**Plans:** 3/3 ✓

**Success Criteria:**
1. Dead page directories removed from `components/`
2. `createPointMarker.js` deleted from both locations
3. Unused imports (`combineReducers`, `DEMO_BACKEND_API`) removed
4. Frontend build passes

---

## Phase 3: Component Restructuring
**Goal:** Reorganize components into logical subfolders, extract utilities and hooks, split MapPage
**Status:** ✓ Complete
**Requirements:** (infrastructure — no REQ-IDs)
**Plans:** (executed inline)

**Success Criteria:**
1. Components organized into Page, Forms, MapPageComponents, Popups, RenderPageComponents
2. Cartographic utilities extracted to `functions/map.js`
3. Staging/undo/redo logic extracted to `hooks/mapHooks.js`
4. `validatePoint` extracted to `functions/validations.js`
5. MapPage ToolPanel + DetailPanel extracted
6. Umami analytics running with custom event tracking

---

## Phase 4: Code Cleanup
**Goal:** Remove debug logging, dead code, and implement stub reducers
**Status:** ○ Pending
**Requirements:** CLEAN-01, CLEAN-02, CLEAN-03

**Success Criteria:**
1. No console.log/console.error statements in production code (except intentional error logging)
2. No unused import or variable ESLint warnings
3. `redux/floors.js`, `redux/images.js`, `redux/users.js` have proper reducer logic
4. Frontend build passes with zero warnings

---

## Phase 5: Render Page Enhancements — 2D Tools
**Goal:** Build out the render page with assets panel, properties panel, and 2D shape tools
**Status:** ○ Pending
**Requirements:** RENDER-01, RENDER-02, RENDER-03, RENDER-04

**Success Criteria:**
1. Assets menu panel shows available drawing primitives (rectangle, circle, polygon)
2. Properties menu panel shows selected item's properties (position, size, color)
3. User can add 2D shapes to the render canvas via click-drag
4. User can select, move, resize, rotate, and delete placed shapes
5. User can change shape properties (fill color, stroke, opacity) via properties panel

---

## Phase 6: Objects Stage + 3D Render
**Goal:** Enable the Objects stage (stage 3) for furniture placement and the 3D Render stage (stage 4) using Three.js
**Status:** ○ Pending
**Requirements:** RENDER-05
**Plans:** 7 plans

**Plans:**
- [ ] 06-01-PLAN.md — Install Three.js deps, create useObjectsHistory hook, enable Objects stage button
- [ ] 06-02-PLAN.md — Furniture catalog data (6 categories, 18+ items) and ObjectsTab UI
- [ ] 06-03-PLAN.md — ThreeCanvas with OrthographicCamera, RoomWalls extrusion, dual-canvas CSS
- [ ] 06-04-PLAN.md — useObjectsPlacement hook, GhostPreview, FurnitureObject, RoomBoundary utils
- [ ] 06-05-PLAN.md — ObjectProperties panel, selection/drag/rotate/delete, RenderPage wiring
- [ ] 06-06-PLAN.md — 3D Render stage: PerspectiveCamera, GLB loading, enhanced lighting/shadows
- [ ] 06-07-PLAN.md — Persistence: API load/save, localStorage TTL, undo/redo verification

**Success Criteria:**
1. Objects stage (stage 3) is active with furniture catalog, placement mode, ghost preview, room snapping
2. Placed objects render as 3D meshes in Three.js canvas layered on Konva floor grid
3. Objects can be selected, dragged within rooms, rotated, and deleted
4. Properties panel shows object position, rotation, size, color, room assignment
5. 3D Render stage (stage 4) provides perspective camera walkthrough with shadows
6. GLB/GLTF models load for user-uploaded furniture
7. Objects persist via API (objects_data column) and localStorage (6h TTL)
8. Undo/redo works for all object operations

## Phase 5.1: Outline Stage Enhancements — Boolean ops, vertex editing, templates, import/export, validation, geocoding, snapping/measurements

**Goal:** Extend the Outline stage with advanced tools: boolean operations, vertex editing, templates, import/export, validation, geocoding, and snapping/measurements
**Requirements:** (infrastructure — no REQ-IDs)
**Depends on:** Phase 5
**Plans:** 5 plans

**Plans:**
- [ ] 05.1-01-PLAN.md — Reorganize ShapesTab menu, create parametric template generators, add offset/buffer controls
- [ ] 05.1-02-PLAN.md — Build TemplateTab with save/load/delete, GeoJSON/DXF import, GeoJSON/SVG/PDF export, copy/paste
- [ ] 05.1-03-PLAN.md — Implement multi-select (Ctrl+click), vertex editing mode, boolean operations (Union/Subtract/Intersect)
- [ ] 05.1-04-PLAN.md — Create validation engine (self-intersection, overlap, min-size), snapping settings, live measurements
- [ ] 05.1-05-PLAN.md — Add geocoding search, right-click placement, template→sections validation, final integration

**Success Criteria:**
1. ShapesTab reorganized with Primitives (Polygon first), Templates, Configure sections
2. TemplateTab with save/load/delete, GeoJSON/DXF import, GeoJSON/SVG/PDF export
3. Multi-select with Ctrl+click and boolean operations (Union, Subtract, Intersect)
4. Vertex editing mode with add/remove/chamfer/fillet on polygons
5. Validation engine detects self-intersections, overlaps, min-size violations
6. Snapping settings (grid, edge, alignment) with keyboard shortcuts G/E/A
7. Geocoding search centers map, right-click places outline with reverse geocode
8. Live measurements with metric/imperial toggle
9. Template→sections validates room areas > 0 and no orphan spaces

### Phase 5.2: Sections Stage Enhancements — Fix gaps, wall placement, select tool, measurements, snapping, templates, room colors

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 5.2 to break down)

### Phase 6.1: Objects Stage Enhancements — Furniture Selection, Templates, Doors/Windows/Walls, Imports, 2.5D improvements

**Goal:** Enhance Objects Stage with furniture catalog improvements, templates, doors/windows/walls controls, imports management, and 3D enhancements
**Requirements**: (infrastructure — no REQ-IDs)
**Depends on:** Phase 5.1, 5.2
**Plans:** 7 plans

**Plans:**
- [ ] 06.1-01-PLAN.md — Fix floor/level filtering, fly-to, tool deactivation, active tool indicator
- [ ] 06.1-02-PLAN.md — Enhance furniture catalog (36+ items, better search)
- [ ] 06.1-03-PLAN.md — Object placement templates (bedroom set, kitchen layout, save/load)
- [ ] 06.1-04-PLAN.md — Imports menu with GLB upload and management
- [ ] 06.1-05-PLAN.md — Doors/Windows/Walls menu with type selection and height control
- [ ] 06.1-06-PLAN.md — 3D enhancements (drag, rotate, layer ordering, validation)
- [ ] 06.1-07-PLAN.md — Final integration and verification

**Success Criteria:**
1. Objects filtered by floor/level
2. Fly-to for objects in PropertiesPanel
3. Tool deactivation works (click again to deactivate)
4. Active tool has clear visual indicator
5. Furniture catalog has 36+ items with better search
6. Object placement templates available
7. Imports menu with GLB upload and management
8. Doors/Windows/Walls menu with type selection and height control
9. 3D object manipulation (drag, rotate)
10. Layer ordering controls
11. Object validation warnings

### Phase 6.2: 3D Render Stage — TransformControls, view modes, wall cutouts, GLTF export, map integration

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 6.2 to break down)

### Phase 6.4: 3D Render Stage Enhancements — Build Tools, TransformControls, CSG, Elevation, Navigation Gizmo, Export

**Goal:** Transform 3D render stage into complete Blender-like building platform with proper menus, interactive manipulation, wall cutouts, and navigation gizmo
**Requirements**: (infrastructure — no REQ-IDs)
**Depends on:** Phase 6.2
**Plans:** 8 plans

**Plans:**
- [ ] 06.4-01-PLAN.md — Restructure AssetsPanel into 4-menu structure (Build Tools, Objects, Imports, Exports)
- [ ] 06.4-02-PLAN.md — Create BuildToolsTab with shape primitives and transform tools
- [ ] 06.4-03-PLAN.md — Implement interactive TransformControls for 3D manipulation
- [ ] 06.4-04-PLAN.md — Implement wall cutouts for doors/windows using CSG
- [ ] 06.4-05-PLAN.md — Add object elevation for placing items at different heights
- [ ] 06.4-06-PLAN.md — Add 3D navigation gizmo in top right corner
- [ ] 06.4-07-PLAN.md — Create enhanced export with customization options
- [ ] 06.4-08-PLAN.md — Final integration and polish

**Success Criteria:**
1. 4-menu structure with proper icons (Build Tools, Objects, Imports, Exports)
2. Build Tools menu with shape primitives and transform tools
3. Interactive TransformControls for move/rotate/scale
4. Wall cutouts for doors/windows using CSG
5. Object elevation control
6. 3D navigation gizmo in top right corner
7. Enhanced export with format/quality settings
8. Block View shows 1m grid (Minecraft-style)
9. Pure View shows clean 3D without outlines
10. Keyboard shortcuts (G/R/S) for transform modes
11. Build passes, tests pass

---
## Phase 7: UI Overhaul — Global to Page-by-Page

**Goal:** Migrate the project off plain CSS to a component system. **The chosen
system changed mid-phase: shadcn/ui was replaced by `@astryxdesign`** (`core`,
`theme-neutral`, `cli`). shadcn's `components/ui/` and `components.json` have been
removed, so the plans below describe the abandoned path; treat them as history.
**Requirements:** (infrastructure — no REQ-IDs)
**Depends on:** None (standalone styling phase)
**Status:** ◆ In Progress — migrated: HomePage, LoginPage, SignupPage, Dashboard,
MapsPage, MapEditor. Not yet: UnifiedEditor, RenderPage, RenderHomePage, NotFoundPage.
**Plans:** 7 plans (written for shadcn; see `frontend/AGENTS.md` for Astryx rules)

**Plans:**
- [ ] 07-01-PLAN.md — Initialize shadcn: run init with mira preset, set up Tailwind, install core components, migrate global index.css
- [ ] 07-02-PLAN.md — HomePage: convert to shadcn Card/Button/Typography, remove HomePage.css
- [ ] 07-03-PLAN.md — Auth Pages (Login + Signup): convert forms to shadcn Card/Input/Button/FieldGroup
- [ ] 07-04-PLAN.md — Dashboard: convert property listing to shadcn Card grid
- [ ] 07-05-PLAN.md — MapPage: convert panels to shadcn Sheet/Tabs/Button, style sidebar
- [ ] 07-06-PLAN.md — RenderHomePage + Navbar: convert landing page and navigation
- [ ] 07-07-PLAN.md — RenderPage (largest): convert left panel, right panel, StageBar, Toolbar, canvas layer

**Success Criteria:**
1. shadcn init completes with mira preset
2. Tailwind CSS working with dark/light themes
3. All pages use shadcn components (no custom CSS buttons/inputs/cards)
4. No broken layouts or regressions
5. Old CSS files removed per-page after conversion
6. Build passes after each page conversion
7. All 31 tests pass

---

## Summary

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Page Reorganization | ✓ Complete | — |
| 2 | Import Audit & Cleanup | ✓ Complete | — |
| 3 | Component Restructuring | ✓ Complete | — |
| 4 | Code Cleanup | ◆ In Progress | CLEAN-01, CLEAN-02, CLEAN-03 |
| 5 | Render Page — 2D Tools | ✓ Implemented | RENDER-01 to RENDER-04 |
| 5.1 | Outline Stage Enhancements | ✓ Implemented | (infrastructure) |
| 5.2 | Sections Stage Enhancements | ✓ Implemented | (infrastructure) |
| 6 | Objects Stage + 3D Render | ✓ Implemented | RENDER-05 |
| 6.1 | Objects Stage Enhancements | ✓ Implemented | (infrastructure) |
| 6.2 | 3D Render Stage | ✓ Implemented | (infrastructure) |
| 6.4 | 3D Render Stage Enhancements | ◆ In Progress | (infrastructure) |
| 7 | UI Overhaul (now Astryx, was shadcn) | ◆ In Progress | (infrastructure) |

**10 requirements** | 10 phases implemented, 3 in progress (4, 6.4, 7)

Outstanding: commit the uncommitted Unified Editor / Maps work; finish Astryx migration
(UnifiedEditor, RenderPage, RenderHomePage, NotFoundPage); 06.4-04 wall cutouts via CSG;
remove remaining `console.*` statements.
