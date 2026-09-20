/**
 * Build objects for the Unified Editor's 3D creation space.
 *
 * A parcel (Area) is the only buildable surface. Objects placed in the studio are
 * stored on the area as `extra_info.objects3d` and described in local metric
 * coordinates relative to the parcel centroid:
 *
 *   { id, kind, name, x, z, y, w, d, h, rot, color }
 *
 * x/z are metres east/north of the centroid, y is metres above ground, w/d/h are
 * the footprint width, depth and height in metres, rot is radians about Y.
 * Everything the UI shows in feet is converted at the edge.
 */

export const FEET_PER_METER = 3.28084;

export const metersToFeet = (m) => (Number.isFinite(m) ? m * FEET_PER_METER : 0);
export const feetToMeters = (ft) => (Number.isFinite(ft) ? ft / FEET_PER_METER : 0);

/** Primitives a user can place. `dims` are default w/d/h in metres. */
export const PRIMITIVES = [
    { id: "box", label: "Block", hint: "Rectangular building mass", icon: "Box", dims: { w: 12, d: 9, h: 3.6 }, color: "#93c5fd" },
    { id: "wall", label: "Wall", hint: "Thin vertical panel", icon: "Minus", dims: { w: 6, d: 0.25, h: 3 }, color: "#cbd5e1" },
    { id: "column", label: "Column", hint: "Square support post", icon: "Columns3", dims: { w: 0.45, d: 0.45, h: 3 }, color: "#e2e8f0" },
    { id: "cylinder", label: "Cylinder", hint: "Round mass or tank", icon: "Cylinder", dims: { w: 2.4, d: 2.4, h: 3 }, color: "#a5b4fc" },
    { id: "roof", label: "Roof", hint: "Pitched gable roof", icon: "Home", dims: { w: 12, d: 9, h: 2.6 }, color: "#fca5a5" },
    { id: "slab", label: "Slab", hint: "Flat pad or deck", icon: "Square", dims: { w: 8, d: 8, h: 0.25 }, color: "#94a3b8" }
];

export const PRIMITIVE_IDS = PRIMITIVES.map((p) => p.id);

export const findPrimitive = (kind) => PRIMITIVES.find((p) => p.id === kind) || null;

export const PALETTE = [
    "#93c5fd", "#a5b4fc", "#c4b5fd", "#f0abfc", "#fca5a5",
    "#fdba74", "#fcd34d", "#bef264", "#86efac", "#5eead4",
    "#7dd3fc", "#e2e8f0"
];

/** Grid snap in metres. Finer than most UI steps so shapes stay tidy. */
export const SNAP_METERS = 0.25;

export function snap(value, step = SNAP_METERS) {
    if (!Number.isFinite(value) || step <= 0) return value;
    return Math.round(value / step) * step;
}

let idCounter = 0;
export function newObjectId() {
    idCounter += 1;
    return `obj3d-${Date.now().toString(36)}-${idCounter}`;
}

/** Human name for a freshly placed primitive, e.g. "Block 3". */
export function nextName(kind, existing = []) {
    const prim = findPrimitive(kind);
    const base = prim ? prim.label : "Object";
    const count = existing.filter((o) => o.kind === kind).length + 1;
    return `${base} ${count}`;
}

export function createBuildObject(kind, x, z, heightMeters) {
    const prim = findPrimitive(kind) || PRIMITIVES[0];
    const h = Number.isFinite(heightMeters) && heightMeters > 0 ? heightMeters : prim.dims.h;
    return {
        id: newObjectId(),
        kind: prim.id,
        name: prim.label,
        x: snap(x),
        z: snap(z),
        y: 0,
        w: prim.dims.w,
        d: prim.dims.d,
        h: prim.id === "slab" ? prim.dims.h : h,
        rot: 0,
        color: prim.color
    };
}

/**
 * Vertical offset so a primitive sits ON the ground rather than half-buried.
 * Box/cylinder/wall/column are centred on their height; roof and slab rest on
 * their base.
 */
export function baseOffsetY(obj) {
    if (obj.kind === "roof" || obj.kind === "slab") return obj.y || 0;
    return (obj.y || 0) + obj.h / 2;
}

/** Even-odd ray cast. `poly` is [[x, z], ...] in local metres. */
export function pointInPolygon(x, z, poly) {
    if (!Array.isArray(poly) || poly.length < 3) return false;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], zi = poly[i][1];
        const xj = poly[j][0], zj = poly[j][1];
        const intersects = (zi > z) !== (zj > z) &&
            x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

/**
 * True when every corner of the object's rotated footprint is inside the parcel.
 * The whole footprint must fit, not just the centre, so a block can't overhang
 * the buildable edge. `margin` widens the tested footprint, requiring the object
 * to sit at least that far from the boundary.
 */
export function footprintInside(obj, poly, margin = 0) {
    if (!obj || !Array.isArray(poly) || poly.length < 3) return false;
    const w = Math.max(0.01, obj.w + margin * 2);
    const d = Math.max(0.01, obj.d + margin * 2);
    const cos = Math.cos(obj.rot || 0);
    const sin = Math.sin(obj.rot || 0);
    const half = [
        [-w / 2, -d / 2], [w / 2, -d / 2],
        [w / 2, d / 2], [-w / 2, d / 2]
    ];
    return half.every(([lx, lz]) => {
        const rx = obj.x + lx * cos - lz * sin;
        const rz = obj.z + lx * sin + lz * cos;
        return pointInPolygon(rx, rz, poly);
    });
}

/** Move an object to the nearest position that is fully inside the parcel. */
export function clampIntoPolygon(obj, poly, step = SNAP_METERS) {
    if (footprintInside(obj, poly)) return obj;
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
    const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    // March from the requested spot toward the parcel centre until it fits.
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
        const candidate = {
            ...obj,
            x: snap(obj.x + (cx - obj.x) * t, step),
            z: snap(obj.z + (cz - obj.z) * t, step)
        };
        if (footprintInside(candidate, poly)) return candidate;
    }
    return { ...obj, x: snap(cx, step), z: snap(cz, step) };
}

/** Bounding radius of a parcel ring, used to frame the camera. */
export function polygonRadius(poly) {
    if (!Array.isArray(poly) || !poly.length) return 30;
    let max = 0;
    for (const [x, z] of poly) {
        max = Math.max(max, Math.hypot(x, z));
    }
    return max > 0.5 ? max : 30;
}

/** Count of objects currently on a parcel's extra_info. */
export function readObjects(area) {
    const list = area?.extra_info?.objects3d;
    return Array.isArray(list) ? list : [];
}

/** Build the extra_info payload that persists a new object list. */
export function withObjects(area, objects) {
    return {
        ...(area?.extra_info || {}),
        objects3d: objects
    };
}

export const CAMERA_PRESETS = [
    { id: "orbit", label: "Orbit", icon: "Orbit" },
    { id: "top", label: "Plan", icon: "Layers" },
    { id: "iso", label: "Iso", icon: "Box" },
    { id: "front", label: "Front", icon: "Square" }
];

/** Camera azimuth (radians about +Y) that the elevation presets are measured from. */
export function azimuthFromPosition(position) {
    if (!position) return 0;
    return Math.atan2(position.x ?? 0, position.z ?? 0);
}

/**
 * Camera position for a preset, framed to a scene radius.
 *
 * `orbit` is a free three-quarter view that shows the parcel edge clearly; the
 * elevation presets (`front`, `right`, `back`, `left`) orbit the scene at
 * `azimuth`, which the user sets from the current view — without that, "front"
 * has no meaning on a plan of a parcel.
 */
export function cameraPositionFor(preset, radius, azimuth = 0) {
    const r = Math.max(6, radius);
    const dist = r * 2.05;
    const height = r * 0.4;
    const at = (theta) => [
        dist * Math.sin(theta),
        height,
        dist * Math.cos(theta)
    ];
    switch (preset) {
        case "top":
            return [0, r * 2.1, 0.01];
        case "iso":
            return [r * 1.5, r * 1.5, r * 1.5];
        case "front":
            return at(azimuth);
        case "right":
            return at(azimuth + Math.PI / 2);
        case "back":
            return at(azimuth + Math.PI);
        case "left":
            return at(azimuth - Math.PI / 2);
        case "orbit":
        default:
            return [r * 1.25, r * 0.95, r * 1.6];
    }
}

/** Object list with one entry replaced by id. */
export function updateObject(objects, id, patch) {
    return objects.map((o) => (o.id === id ? { ...o, ...patch } : o));
}

export function removeObject(objects, id) {
    return objects.filter((o) => o.id !== id);
}

/** Rebuild an object's width/depth/height from a transform scale, then reset. */
export function applyScaleToObject(obj, scale) {
    const sx = Math.abs(scale?.x ?? 1) || 1;
    const sy = Math.abs(scale?.y ?? 1) || 1;
    const sz = Math.abs(scale?.z ?? 1) || 1;
    return {
        ...obj,
        w: Math.max(0.1, obj.w * sx),
        h: Math.max(0.1, obj.h * sy),
        d: Math.max(0.1, obj.d * sz)
    };
}
