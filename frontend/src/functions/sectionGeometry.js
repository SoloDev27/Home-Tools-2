import * as turf from "@turf/turf";
import { calculatePolygonArea, formatArea } from "./map";

export const DEFAULT_SECTION_TYPES = [
    { value: "residential", label: "Living / Residential", icon: "🏠", color: "#6366f1" },
    { value: "yard", label: "Yard / Lawn", icon: "🌿", color: "#10b981" },
    { value: "patio", label: "Patio / Hardscape", icon: "🧱", color: "#f59e0b" },
    { value: "driveway", label: "Driveway / Parking", icon: "🚗", color: "#64748b" },
    { value: "garden", label: "Garden / Cultivation", icon: "🌻", color: "#84cc16" },
    { value: "utility", label: "Utility / Service", icon: "⚡", color: "#0284c7" },
    { value: "storage", label: "Storage / Shed", icon: "📦", color: "#a855f7" },
    { value: "pool", label: "Pool / Water", icon: "💧", color: "#06b6d4" },
    { value: "other", label: "Custom / Other", icon: "📐", color: "#ec4899" },
];

export const SECTION_PALETTE = [
    "#6366f1", "#10b981", "#f59e0b", "#06b6d4",
    "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
    "#3b82f6", "#84cc16", "#e11d48", "#a855f7"
];

/**
 * Normalizes input polygon coordinates into a clean closed [lng, lat] ring
 */
export function extractPolygonRing(coords) {
    if (!coords) return null;
    let ring = coords;
    if (typeof ring === "string") {
        try { ring = JSON.parse(ring); } catch (e) { return null; }
    }
    // Unwrap nested GeoJSON array levels if present
    while (Array.isArray(ring) && ring.length > 0 && Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
        ring = ring[0];
    }
    if (!Array.isArray(ring) || ring.length < 3) return null;

    // Ensure valid numerical [lng, lat] pairs
    const cleanRing = ring.map(pt => {
        if (Array.isArray(pt)) {
            return [Number(pt[0]), Number(pt[1])];
        }
        if (pt && typeof pt === "object") {
            const lng = pt.lng ?? pt.longitude ?? pt.x;
            const lat = pt.lat ?? pt.latitude ?? pt.y;
            return [Number(lng), Number(lat)];
        }
        return [NaN, NaN];
    }).filter(pt => Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
    if (cleanRing.length < 3) return null;

    // Ensure closed loop
    const first = cleanRing[0];
    const last = cleanRing[cleanRing.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
        cleanRing.push([first[0], first[1]]);
    }
    return cleanRing;
}

/**
 * Calculates centroid [lng, lat], area in sq ft & acres for a polygon coordinate ring
 */
export function calculatePolygonMetrics(ring) {
    if (!ring || ring.length < 3) {
        return { areaSqFt: 0, areaAcres: 0, centerLng: 0, centerLat: 0 };
    }
    const cleanRing = extractPolygonRing(ring);
    if (!cleanRing) return { areaSqFt: 0, areaAcres: 0, centerLng: 0, centerLat: 0 };

    const poly = turf.polygon([cleanRing]);
    const sqMeters = turf.area(poly);
    const areaSqFt = Math.round(sqMeters * 10.7639);
    const areaAcres = +(areaSqFt / 43560).toFixed(2);

    const centroid = turf.centroid(poly);
    const [centerLng, centerLat] = centroid.geometry.coordinates;

    return { areaSqFt, areaAcres, centerLng, centerLat };
}

/**
 * Computes intersection of extended cut line with polygon perimeter
 * to snap divider line endpoints to the boundary edges.
 */
export function clipDividerLineToPolygon(polygonCoords, linePts) {
    const ring = extractPolygonRing(polygonCoords);
    if (!ring || !linePts || linePts.length < 2) return linePts;

    try {
        const poly = turf.polygon([ring]);
        const bbox = turf.bbox(poly);
        const [minX, minY, maxX, maxY] = bbox;
        const diag = Math.max(Math.hypot(maxX - minX, maxY - minY) * 10, 0.1);

        const [p1, p2] = linePts;
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const len = Math.hypot(dx, dy) || 1e-6;
        const ux = dx / len;
        const uy = dy / len;

        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2;

        const pA = [mx - ux * diag, my - uy * diag];
        const pB = [mx + ux * diag, my + uy * diag];

        const extendedLine = turf.lineString([pA, pB]);
        const perimeter = turf.polygonToLine(poly);
        const intersections = turf.lineIntersect(extendedLine, perimeter);

        if (intersections && intersections.features && intersections.features.length >= 2) {
            // Sort intersection points along ray from pA to pB
            const sorted = intersections.features.map(f => {
                const pt = f.geometry.coordinates;
                const t = (pt[0] - pA[0]) * ux + (pt[1] - pA[1]) * uy;
                return { pt, t };
            }).sort((a, b) => a.t - b.t);

            return [sorted[0].pt, sorted[sorted.length - 1].pt];
        }
        return linePts;
    } catch (err) {
        return linePts;
    }
}

/**
 * Splits a polygon along a 2-point line cut into 2 or more sub-polygons.
 */
export function splitPolygonByLine(polygonCoords, linePts) {
    const ring = extractPolygonRing(polygonCoords);
    if (!ring || !linePts || linePts.length < 2) return null;

    try {
        const poly = turf.polygon([ring]);
        const bbox = turf.bbox(poly);
        const [minX, minY, maxX, maxY] = bbox;
        const diag = Math.max(Math.hypot(maxX - minX, maxY - minY) * 10, 0.1);

        const [p1, p2] = linePts;
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const len = Math.hypot(dx, dy) || 1e-6;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;

        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2;

        // Counter-clockwise half-plane 1 (positive normal)
        const hp1Raw = turf.polygon([[
            [mx - ux * diag, my - uy * diag],
            [mx + ux * diag, my + uy * diag],
            [mx + ux * diag + nx * diag, my + uy * diag + ny * diag],
            [mx - ux * diag + nx * diag, my - uy * diag + ny * diag],
            [mx - ux * diag, my - uy * diag]
        ]]);
        const hp1 = turf.rewind(hp1Raw, { reverse: false });

        // Counter-clockwise half-plane 2 (negative normal)
        const hp2Raw = turf.polygon([[
            [mx + ux * diag, my + uy * diag],
            [mx - ux * diag, my - uy * diag],
            [mx - ux * diag - nx * diag, my - uy * diag - ny * diag],
            [mx + ux * diag - nx * diag, my + uy * diag - ny * diag],
            [mx + ux * diag, my + uy * diag]
        ]]);
        const hp2 = turf.rewind(hp2Raw, { reverse: false });

        const split1 = turf.intersect(turf.featureCollection([poly, hp1]));
        const split2 = turf.intersect(turf.featureCollection([poly, hp2]));

        const results = [];
        const extract = (geom) => {
            if (!geom) return;
            if (geom.geometry.type === "Polygon") {
                const r = extractPolygonRing(geom.geometry.coordinates[0]);
                if (r && r.length >= 4) {
                    const a = turf.area(turf.polygon([r]));
                    if (a > 0.05) results.push(r);
                }
            } else if (geom.geometry.type === "MultiPolygon") {
                geom.geometry.coordinates.forEach(polyCoords => {
                    const r = extractPolygonRing(polyCoords[0]);
                    if (r && r.length >= 4) {
                        const a = turf.area(turf.polygon([r]));
                        if (a > 0.05) results.push(r);
                    }
                });
            }
        };

        extract(split1);
        extract(split2);

        return results.length >= 2 ? results : null;
    } catch (err) {
        console.error("splitPolygonByLine error:", err);
        return null;
    }
}

/**
 * Sequentially applies an array of divider lines to split a base polygon ring into sub-sections.
 */
export function applyDividersToPolygon(polygonCoords, dividers = []) {
    const baseRing = extractPolygonRing(polygonCoords);
    if (!baseRing) return [];
    if (!dividers || dividers.length === 0) {
        return [baseRing];
    }

    let currentSections = [baseRing];

    for (const divider of dividers) {
        const linePts = divider.coordinates || divider.points;
        if (!linePts || linePts.length < 2) continue;

        const nextSections = [];
        let didSplitAny = false;

        for (const secRing of currentSections) {
            const splits = splitPolygonByLine(secRing, linePts);
            if (splits && splits.length >= 2) {
                nextSections.push(...splits);
                didSplitAny = true;
            } else {
                nextSections.push(secRing);
            }
        }

        if (didSplitAny) {
            currentSections = nextSections;
        }
    }

    return currentSections;
}

/**
 * Re-anchors stored divider lines to a new boundary ring.
 *
 * Dividers are stored as absolute [lng, lat] coordinates clipped to the boundary
 * that existed when they were drawn. When that boundary moves (translate) or is
 * reshaped (vertex edit), the raw coordinates no longer touch the new edges.
 *
 * - With a `delta` (pure translation) the line is moved by the same offset so it
 *   keeps its relative position inside the parcel.
 * - Without a delta (vertex reshape) the line stays where it is and is re-clipped
 *   so its endpoints land back on the new perimeter.
 */
export function remapDividersToNewBoundary(dividers = [], newRing, delta = null) {
    if (!Array.isArray(dividers) || !newRing) return dividers || [];
    return dividers.map(div => {
        const pts = div.coordinates || div.points;
        if (!Array.isArray(pts) || pts.length < 2) return div;
        const moved = pts.map(([lng, lat]) => [
            Number(lng) + (delta?.dLng || 0),
            Number(lat) + (delta?.dLat || 0)
        ]);
        return { ...div, coordinates: clipDividerLineToPolygon(newRing, moved) };
    });
}

/**
 * Returns the translation offset between two rings when the shape is unchanged
 * (every vertex moved by the same lng/lat), otherwise null for a reshape.
 */
export function ringTranslationDelta(oldRing, newRing) {
    const a = extractPolygonRing(oldRing);
    const b = extractPolygonRing(newRing);
    if (!a || !b || a.length !== b.length) return null;
    const dLng = b[0][0] - a[0][0];
    const dLat = b[0][1] - a[0][1];
    const tol = 1e-9;
    for (let i = 1; i < a.length; i++) {
        if (Math.abs(b[i][0] - a[i][0] - dLng) > tol) return null;
        if (Math.abs(b[i][1] - a[i][1] - dLat) > tol) return null;
    }
    return { dLng, dLat };
}

/**
 * Translates a coordinate ring by a lng/lat offset.
 */
export function shiftRing(ring, dLng, dLat) {
    if (!Array.isArray(ring)) return ring;
    return ring.map(([lng, lat]) => [Number(lng) + dLng, Number(lat) + dLat]);
}

/**
 * Builds section records from freshly-computed rings, carrying forward the
 * identity (id, name, type, color) of the section it came from.
 *
 * Matching is by nearest centroid, so a split keeps one half's name and a merge
 * keeps the surviving section's name. Matching by array index (the previous
 * behaviour) scrambles names whenever the section count changes.
 */
export function buildSectionsFromRings(
    sectionRings = [],
    existingSections = [],
    autoColors = true,
    idPrefix = "sec"
) {
    const priorCentroids = existingSections.map(sec => {
        const ring = extractPolygonRing(sec.coordinates);
        if (!ring) return null;
        try {
            return turf.centroid(turf.polygon([ring])).geometry.coordinates;
        } catch (e) {
            return null;
        }
    });

    const claimed = new Set();

    return sectionRings.map((sRing, idx) => {
        const metrics = calculatePolygonMetrics(sRing);

        let match = null;
        let matchIdx = -1;
        let best = Infinity;
        priorCentroids.forEach((centroid, i) => {
            if (!centroid || claimed.has(i)) return;
            const dist = Math.hypot(centroid[0] - metrics.centerLng, centroid[1] - metrics.centerLat);
            if (dist < best) {
                best = dist;
                match = existingSections[i];
                matchIdx = i;
            }
        });
        if (!match) {
            match = existingSections[idx] || null;
            matchIdx = idx;
        }
        if (matchIdx >= 0) claimed.add(matchIdx);

        const typeObj = DEFAULT_SECTION_TYPES[idx % DEFAULT_SECTION_TYPES.length];
        return {
            id: match?.id || `${idPrefix}-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            name: match?.name || `Section ${idx + 1} (${typeObj.label.split(" ")[0]})`,
            type: match?.type || typeObj.value,
            color: autoColors
                ? SECTION_PALETTE[idx % SECTION_PALETTE.length]
                : (match?.color || typeObj.color),
            coordinates: [sRing],
            area_sqft: metrics.areaSqFt,
            area_acres: metrics.areaAcres
        };
    });
}

/**
 * Rebuilds a boundary's sectioning after its geometry changed.
 *
 * Dividers and sections are stored as absolute coordinates clipped to the
 * boundary that existed when they were drawn, so moving or reshaping the
 * boundary detaches them. This re-anchors the dividers (translate keeps their
 * relative placement; reshape re-clips to the new perimeter) and regenerates the
 * sections from them.
 *
 * Returns null when there is nothing to adjust, so callers can skip the write.
 */
export function rebuildSectioningForGeometryChange({
    dividers = [],
    sections = [],
    oldRing,
    newRing,
    autoColors = true
} = {}) {
    if ((!dividers.length && !sections.length) || !newRing) return null;
    const delta = oldRing ? ringTranslationDelta(oldRing, newRing) : null;
    const remappedDividers = remapDividersToNewBoundary(dividers, newRing, delta);
    const rebuiltSections = remappedDividers.length
        ? buildSectionsFromRings(
            applyDividersToPolygon(newRing, remappedDividers),
            sections,
            autoColors
        )
        : [];
    return { dividers: remappedDividers, sections: rebuiltSections };
}

/**
 * Subdivides a polygon into rows x cols grid quadrants
 */
export function subdividePolygonGrid(polygonCoords, rows = 2, cols = 2) {
    const ring = extractPolygonRing(polygonCoords);
    if (!ring) return [];

    try {
        const poly = turf.polygon([ring]);
        const bbox = turf.bbox(poly);
        const [minX, minY, maxX, maxY] = bbox;
        const dx = (maxX - minX) / cols;
        const dy = (maxY - minY) / rows;

        const results = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellMinX = minX + c * dx;
                const cellMaxX = minX + (c + 1) * dx;
                const cellMinY = minY + r * dy;
                const cellMaxY = minY + (r + 1) * dy;

                const cellPoly = turf.polygon([[
                    [cellMinX, cellMinY],
                    [cellMaxX, cellMinY],
                    [cellMaxX, cellMaxY],
                    [cellMinX, cellMaxY],
                    [cellMinX, cellMinY]
                ]]);

                try {
                    const intersection = turf.intersect(turf.featureCollection([poly, cellPoly]));
                    if (intersection) {
                        if (intersection.geometry.type === "Polygon") {
                            const cl = extractPolygonRing(intersection.geometry.coordinates[0]);
                            if (cl) results.push(cl);
                        } else if (intersection.geometry.type === "MultiPolygon") {
                            intersection.geometry.coordinates.forEach(mp => {
                                const cl = extractPolygonRing(mp[0]);
                                if (cl) results.push(cl);
                            });
                        }
                    }
                } catch (e) { /* no intersection for this cell; skip it */ }
            }
        }
        return results;
    } catch (err) {
        console.error("subdividePolygonGrid error:", err);
        return [];
    }
}

/**
 * Insets a polygon by setback distance in meters, creating core and setback zones
 */
export function insetPolygonCore(polygonCoords, setbackMeters = 15) {
    const ring = extractPolygonRing(polygonCoords);
    if (!ring) return null;

    try {
        const poly = turf.polygon([ring]);
        const core = turf.buffer(poly, -setbackMeters / 1000, { units: "kilometers" });
        if (!core) return null;

        const setback = turf.difference(turf.featureCollection([poly, core]));

        const coreRing = core.geometry.type === "Polygon"
            ? extractPolygonRing(core.geometry.coordinates[0])
            : extractPolygonRing(core.geometry.coordinates[0][0]);

        let setbackRings = [];
        if (setback) {
            if (setback.geometry.type === "Polygon") {
                const r = extractPolygonRing(setback.geometry.coordinates[0]);
                if (r) setbackRings.push(r);
            } else if (setback.geometry.type === "MultiPolygon") {
                setback.geometry.coordinates.forEach(p => {
                    const r = extractPolygonRing(p[0]);
                    if (r) setbackRings.push(r);
                });
            }
        }

        return {
            core: coreRing,
            setback: setbackRings[0] || null
        };
    } catch (err) {
        console.error("insetPolygonCore error:", err);
        return null;
    }
}
