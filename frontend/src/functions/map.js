export const EARTH_R = 6378137;

export function lngLatToMercator(lng, lat) {
    const x = lng * Math.PI / 180 * EARTH_R;
    const y = Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * EARTH_R;
    return { x, y };
}

export function mercatorToLngLat(x, y) {
    const lng = x / EARTH_R * 180 / Math.PI;
    const lat = (2 * Math.atan(Math.exp(y / EARTH_R)) - Math.PI / 2) * 180 / Math.PI;
    return { lng, lat };
}

export function mercatorDistance(lng1, lat1, lng2, lat2) {
    const a = lngLatToMercator(lng1, lat1);
    const b = lngLatToMercator(lng2, lat2);
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function getHandlePosition(centerLng, centerLat, radiusMeters) {
    const c = lngLatToMercator(centerLng, centerLat);
    return mercatorToLngLat(c.x + radiusMeters, c.y);
}

export const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

export function createRadiusData(centerLng, centerLat, radiusMeters, handleLng, handleLat, id, steps = 64) {
    const c = lngLatToMercator(centerLng, centerLat);
    const coords = [];
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const pt = mercatorToLngLat(
            c.x + radiusMeters * Math.cos(angle),
            c.y + radiusMeters * Math.sin(angle)
        );
        coords.push([pt.lng, pt.lat]);
    }
    return {
        type: "FeatureCollection",
        features: [
            { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: { id } },
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [[centerLng, centerLat], [handleLng, handleLat]]
                },
                properties: { id, part: "spoke" }
            }
        ]
    };
}

export function createLineData(aLng, aLat, bLng, bLat, id) {
    return {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [[aLng, aLat], [bLng, bLat]]
            },
            properties: { id }
        }]
    };
}

/**
 * Calculates the spherical geodesic area of a polygon in square meters.
 * @param {Array<[number, number]>} coords - Array of [lng, lat] coordinate pairs
 * @returns {number} Area in square meters
 */
export function calculatePolygonArea(coords) {
    if (!coords || coords.length < 3) return 0;
    let area = 0;
    const rad = Math.PI / 180;
    const len = coords.length;
    for (let i = 0; i < len; i++) {
        const j = (i + 1) % len;
        const p1 = coords[i];
        const p2 = coords[j];
        area += (p2[0] - p1[0]) * rad * (2 + Math.sin(p1[1] * rad) + Math.sin(p2[1] * rad));
    }
    return Math.abs((area * (EARTH_R ** 2)) / 2);
}

/**
 * Formats square meters into readable imperial (sq ft, acres) and metric representations.
 * @param {number} sqMeters 
 * @returns {string} e.g. "14,200 sq ft (0.33 acres)" or "1,250 sq ft"
 */
export function formatArea(sqMeters) {
    if (!sqMeters || isNaN(sqMeters)) return "0 sq ft";
    const sqFt = sqMeters * 10.7639;
    if (sqFt >= 43560) {
        const acres = (sqFt / 43560).toFixed(2);
        return `${acres} ac (${Math.round(sqFt).toLocaleString()} sq ft)`;
    }
    return `${Math.round(sqFt).toLocaleString()} sq ft`;
}

/**
 * Calculates total cumulative distance along an array of [lng, lat] coordinates.
 * @param {Array<[number, number]>} coords 
 * @returns {number} Total distance in meters
 */
export function calculatePathDistance(coords) {
    if (!coords || coords.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        total += mercatorDistance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    }
    return total;
}

/**
 * Formats meters into readable imperial (ft, miles) and metric representations.
 * @param {number} meters 
 * @returns {string} e.g. "45.2 ft" or "1.2 mi"
 */
export function formatDistance(meters) {
    if (!meters || isNaN(meters)) return "0 ft";
    const feet = meters * 3.28084;
    if (feet >= 5280) {
        return `${(feet / 5280).toFixed(2)} mi (${(meters / 1000).toFixed(2)} km)`;
    }
    return `${feet.toFixed(1)} ft`;
}

/**
 * Generates closed 5-vertex polygon ring from two opposite corner coordinates.
 * @param {[number, number]} c1 - [lng, lat] of first corner
 * @param {[number, number]} c2 - [lng, lat] of second corner
 * @returns {Array<[number, number]>} Closed 5-element array of coordinates
 */
export function createRectangleCoords(c1, c2) {
    const minLng = Math.min(c1[0], c2[0]);
    const maxLng = Math.max(c1[0], c2[0]);
    const minLat = Math.min(c1[1], c2[1]);
    const maxLat = Math.max(c1[1], c2[1]);
    return [
        [minLng, maxLat], // top-left
        [maxLng, maxLat], // top-right
        [maxLng, minLat], // bottom-right
        [minLng, minLat], // bottom-left
        [minLng, maxLat]  // close ring
    ];
}

/**
 * Generates GeoJSON FeatureCollection for a Polygon.
 */
export function createPolygonData(coords, id) {
    if (!coords || coords.length === 0) return { type: "FeatureCollection", features: [] };
    const closed = [...coords];
    const first = closed[0];
    const last = closed[closed.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
        closed.push([...first]);
    }
    return {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [closed] },
            properties: { id }
        }]
    };
}

/**
 * Generates GeoJSON FeatureCollection for a LineString.
 */
export function createPolylineData(coords, id) {
    if (!coords || coords.length === 0) return { type: "FeatureCollection", features: [] };
    return {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: { id }
        }]
    };
}

/**
 * Catmull-Rom spline interpolation through control points for organic curves.
 */
export function createCatmullRomCurve(pts, segments = 12) {
    if (!pts || pts.length < 2) return pts || [];
    if (pts.length === 2) return pts;

    const result = [];
    const points = [pts[0], ...pts, pts[pts.length - 1]];

    for (let i = 1; i < points.length - 2; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2];

        for (let t = 0; t < 1; t += 1 / segments) {
            const t2 = t * t;
            const t3 = t2 * t;

            const lng = 0.5 * (
                (2 * p1[0]) +
                (-p0[0] + p2[0]) * t +
                (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            );

            const lat = 0.5 * (
                (2 * p1[1]) +
                (-p0[1] + p2[1]) * t +
                (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            );

            result.push([lng, lat]);
        }
    }
    result.push(pts[pts.length - 1]);
    return result;
}

/**
 * Closed Catmull-Rom spline interpolation for organic garden/landscape beds.
 * @param {Array<[number, number]>} pts - Array of [lng, lat]
 * @param {number} segments - Interpolation steps per segment
 * @returns {Array<[number, number]>} Closed smooth ring
 */
export function createClosedCatmullRomCurve(pts, segments = 12) {
    if (!pts || pts.length < 3) return pts || [];
    const k = pts.length;
    const result = [];

    for (let i = 0; i < k; i++) {
        const p0 = pts[(i - 1 + k) % k];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % k];
        const p3 = pts[(i + 2) % k];

        for (let t = 0; t < 1; t += 1 / segments) {
            const t2 = t * t;
            const t3 = t2 * t;

            const lng = 0.5 * (
                (2 * p1[0]) +
                (-p0[0] + p2[0]) * t +
                (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            );

            const lat = 0.5 * (
                (2 * p1[1]) +
                (-p0[1] + p2[1]) * t +
                (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            );

            result.push([lng, lat]);
        }
    }
    // Close the ring with the first point
    result.push([...result[0]]);
    return result;
}

/**
 * Generates an offset corridor ribbon polygon along a polyline.
 * Useful for Setback Buffers, Tape Measure highlighted corridors, and Road/Driveway widths.
 * @param {Array<[number, number]>} pts - [lng, lat] coordinates
 * @param {number} bufferMeters - Width/depth of buffer in meters
 * @param {string} id - Feature ID
 * @param {boolean} oneSided - If true, buffer only offsets to one side (e.g. Setback inside property)
 */
export function createBufferedCorridor(pts, bufferMeters = 5, id = "corridor", oneSided = false) {
    if (!pts || pts.length < 2) return null;

    const left = [];
    const right = [];

    for (let i = 0; i < pts.length; i++) {
        let dx = 0;
        let dy = 0;
        const cur = pts[i];
        const latRad = (cur[1] * Math.PI) / 180;
        const cosLat = Math.max(0.1, Math.cos(latRad));

        if (i < pts.length - 1) {
            const next = pts[i + 1];
            dx += (next[0] - cur[0]) * cosLat;
            dy += next[1] - cur[1];
        }
        if (i > 0) {
            const prev = pts[i - 1];
            dx += (cur[0] - prev[0]) * cosLat;
            dy += cur[1] - prev[1];
        }

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;

        // Perpendicular normal (-dy, dx)
        const nx = -dy / len;
        const ny = dx / len;

        const degPerMeterLat = 1 / 111320;
        const degPerMeterLng = 1 / (111320 * cosLat);

        const offX = nx * bufferMeters * degPerMeterLng;
        const offY = ny * bufferMeters * degPerMeterLat;

        left.push([cur[0] + offX, cur[1] + offY]);
        if (oneSided) {
            right.push([cur[0], cur[1]]);
        } else {
            right.push([cur[0] - offX, cur[1] - offY]);
        }
    }

    if (left.length === 0 || right.length === 0) return null;

    const ring = [...left, ...right.reverse(), left[0]];
    return {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            properties: { id },
            geometry: {
                type: "Polygon",
                coordinates: [ring]
            }
        }]
    };
}

/**
 * Generates CAD witness tick marks perpendicular to segment endpoints.
 * @param {Array<[number, number]>} pts - Polyline coordinates
 * @param {number} tickLengthMeters - Length of perpendicular tick in meters
 * @param {string} id - Feature ID
 */
export function createMeasureWitnessTicks(pts, tickLengthMeters = 3, id = "ticks") {
    if (!pts || pts.length < 2) return null;
    const lines = [];

    // Indices to put witness marks on: start, end, and all intermediate vertices
    const indices = pts.map((_, i) => i);

    for (const i of indices) {
        const cur = pts[i];
        const latRad = (cur[1] * Math.PI) / 180;
        const cosLat = Math.max(0.1, Math.cos(latRad));
        let dx = 0;
        let dy = 0;

        if (i < pts.length - 1) {
            dx += (pts[i + 1][0] - cur[0]) * cosLat;
            dy += pts[i + 1][1] - cur[1];
        }
        if (i > 0) {
            dx += (cur[0] - pts[i - 1][0]) * cosLat;
            dy += cur[1] - pts[i - 1][1];
        }

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;

        const nx = -dy / len;
        const ny = dx / len;

        const degPerMeterLat = 1 / 111320;
        const degPerMeterLng = 1 / (111320 * cosLat);

        const halfOffX = nx * (tickLengthMeters / 2) * degPerMeterLng;
        const halfOffY = ny * (tickLengthMeters / 2) * degPerMeterLat;

        lines.push([
            [cur[0] - halfOffX, cur[1] - halfOffY],
            [cur[0] + halfOffX, cur[1] + halfOffY]
        ]);
    }

    return {
        type: "FeatureCollection",
        features: lines.map((lineCoords, idx) => ({
            type: "Feature",
            properties: { id: `${id}-tick-${idx}` },
            geometry: {
                type: "LineString",
                coordinates: lineCoords
            }
        }))
    };
}

/**
 * Checks if a [lng, lat] coordinate is inside a polygon ring.
 */
export function isPointInsidePolygon(lngLat, polygonCoords) {
    if (!polygonCoords) return true;
    let coords = polygonCoords;
    if (typeof coords === "string") {
        try { coords = JSON.parse(coords); } catch (e) { return true; }
    }
    while (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        coords = coords[0];
    }
    const ring = Array.isArray(coords) ? coords : [];
    if (!ring || ring.length < 3) return true;

    // Ray-casting algorithm for fast point-in-polygon check without external deps
    const x = Number(lngLat[0]), y = Number(lngLat[1]);
    if (isNaN(x) || isNaN(y)) return true;

    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = Number(ring[i][0]), yi = Number(ring[i][1]);
        const xj = Number(ring[j][0]), yj = Number(ring[j][1]);
        if (isNaN(xi) || isNaN(yi) || isNaN(xj) || isNaN(yj)) continue;
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Shifts all coordinate pairs by delta [dLng, dLat]
 */
export function shiftCoordinates(coords, dLng, dLat) {
    if (!coords) return [];
    if (Array.isArray(coords[0]?.[0])) {
        return coords.map(ring => ring.map(pt => [pt[0] + dLng, pt[1] + dLat]));
    }
    return coords.map(pt => [pt[0] + dLng, pt[1] + dLat]);
}

/**
 * Generates GeoJSON FeatureCollection of Point features for vertex control handles.
 */
export function createPointCollectionData(coords, id = "points") {
    if (!coords || coords.length === 0) return { type: "FeatureCollection", features: [] };
    return {
        type: "FeatureCollection",
        features: coords.map((pt, idx) => ({
            type: "Feature",
            properties: { id: `${id}-pt-${idx}`, index: idx },
            geometry: {
                type: "Point",
                coordinates: pt
            }
        }))
    };
}


