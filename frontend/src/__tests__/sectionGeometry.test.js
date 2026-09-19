import { describe, it, expect } from "vitest";
import {
    extractPolygonRing,
    calculatePolygonMetrics,
    splitPolygonByLine,
    subdividePolygonGrid,
    insetPolygonCore,
    clipDividerLineToPolygon,
    applyDividersToPolygon,
    remapDividersToNewBoundary,
    ringTranslationDelta,
    shiftRing,
    buildSectionsFromRings,
    rebuildSectioningForGeometryChange,
    DEFAULT_SECTION_TYPES,
    SECTION_PALETTE
} from "../functions/sectionGeometry";

describe("sectionGeometry utilities", () => {
    // A simple 100m x 100m approximate square in lng/lat near [0, 0]
    const squareCoords = [
        [-0.001, -0.001],
        [0.001, -0.001],
        [0.001, 0.001],
        [-0.001, 0.001],
        [-0.001, -0.001]
    ];

    describe("extractPolygonRing", () => {
        it("returns an unclosed ring closed", () => {
            const openRing = [
                [-0.001, -0.001],
                [0.001, -0.001],
                [0.001, 0.001],
                [-0.001, 0.001]
            ];
            const ring = extractPolygonRing(openRing);
            expect(ring.length).toBe(5);
            expect(ring[0]).toEqual(ring[ring.length - 1]);
        });

        it("unwraps nested Polygon coordinate format", () => {
            const nested = [squareCoords];
            const ring = extractPolygonRing(nested);
            expect(ring.length).toBe(5);
            expect(ring[0]).toEqual(ring[ring.length - 1]);
        });

        it("unwraps object coordinates {lng, lat}", () => {
            const objRing = [
                { lng: -0.001, lat: -0.001 },
                { lng: 0.001, lat: -0.001 },
                { lng: 0.001, lat: 0.001 },
                { lng: -0.001, lat: 0.001 }
            ];
            const ring = extractPolygonRing(objRing);
            expect(ring.length).toBe(5);
            expect(ring[0]).toEqual([-0.001, -0.001]);
        });
    });

    describe("calculatePolygonMetrics", () => {
        it("calculates square footage and centroid", () => {
            const metrics = calculatePolygonMetrics(squareCoords);
            expect(metrics).not.toBeNull();
            expect(metrics.areaSqFt).toBeGreaterThan(0);
            expect(metrics.areaAcres).toBeGreaterThan(0);
            expect(metrics.centerLng).toBeCloseTo(0, 3);
            expect(metrics.centerLat).toBeCloseTo(0, 3);
        });
    });

    describe("splitPolygonByLine", () => {
        it("splits square into two sections when cut through the middle", () => {
            // Cut line vertically across x = 0
            const line = [[0, -0.002], [0, 0.002]];
            const splits = splitPolygonByLine(squareCoords, line);
            expect(splits).not.toBeNull();
            expect(splits.length).toBe(2);
            expect(splits[0].length).toBeGreaterThanOrEqual(4);
            expect(splits[1].length).toBeGreaterThanOrEqual(4);
            // Check areas of splits
            const m1 = calculatePolygonMetrics(splits[0]);
            const m2 = calculatePolygonMetrics(splits[1]);
            expect(m1.areaSqFt).toBeGreaterThan(0);
            expect(m2.areaSqFt).toBeGreaterThan(0);
            const parentMetrics = calculatePolygonMetrics(squareCoords);
            expect(m1.areaSqFt + m2.areaSqFt).toBeCloseTo(parentMetrics.areaSqFt, -2);
        });
    });

    describe("subdividePolygonGrid", () => {
        it("subdivides square into 2 vertical slices", () => {
            const cells = subdividePolygonGrid(squareCoords, 1, 2);
            expect(cells.length).toBe(2);
            cells.forEach(cell => {
                const m = calculatePolygonMetrics(cell);
                expect(m.areaSqFt).toBeGreaterThan(0);
                expect(cell.length).toBeGreaterThanOrEqual(4);
            });
        });

        it("subdivides square into 2x2 (4 grid) cells", () => {
            const cells = subdividePolygonGrid(squareCoords, 2, 2);
            expect(cells.length).toBe(4);
            cells.forEach(cell => {
                const m = calculatePolygonMetrics(cell);
                expect(m.areaSqFt).toBeGreaterThan(0);
            });
        });

        it("subdivides square into 3x3 (9 grid) cells", () => {
            const cells = subdividePolygonGrid(squareCoords, 3, 3);
            expect(cells.length).toBe(9);
            cells.forEach(cell => {
                const m = calculatePolygonMetrics(cell);
                expect(m.areaSqFt).toBeGreaterThan(0);
            });
        });
    });

    describe("insetPolygonCore", () => {
        it("creates core and setback zone from square", () => {
            // Inset by small setback (5 meters)
            const res = insetPolygonCore(squareCoords, 5);
            expect(res).not.toBeNull();
            expect(res.core).not.toBeNull();
            expect(res.setback).not.toBeNull();
            const coreMetrics = calculatePolygonMetrics(res.core);
            const setbackMetrics = calculatePolygonMetrics(res.setback);
            expect(coreMetrics.areaSqFt).toBeGreaterThan(0);
            expect(setbackMetrics.areaSqFt).toBeGreaterThan(0);
            const parentMetrics = calculatePolygonMetrics(squareCoords);
            expect(coreMetrics.areaSqFt).toBeLessThan(parentMetrics.areaSqFt);
        });
    });

    describe("Presets & Palettes", () => {
        it("has default section types and color palette", () => {
            expect(DEFAULT_SECTION_TYPES.length).toBeGreaterThan(0);
            expect(SECTION_PALETTE.length).toBeGreaterThan(0);
            expect(DEFAULT_SECTION_TYPES[0]).toHaveProperty("value");
            expect(DEFAULT_SECTION_TYPES[0]).toHaveProperty("label");
            expect(DEFAULT_SECTION_TYPES[0]).toHaveProperty("icon");
            expect(DEFAULT_SECTION_TYPES[0]).toHaveProperty("color");
        });
    });
});

describe("clipDividerLineToPolygon & applyDividersToPolygon", () => {
    const squareCoords = [
        [-0.001, -0.001],
        [0.001, -0.001],
        [0.001, 0.001],
        [-0.001, 0.001],
        [-0.001, -0.001]
    ];

    it("clips divider line endpoints to polygon boundary", () => {
        // Short line segment inside square
        const shortLine = [[0, -0.0005], [0, 0.0005]];
        const clipped = clipDividerLineToPolygon(squareCoords, shortLine);
        expect(clipped.length).toBe(2);
        // Snapped to y = -0.001 and y = 0.001
        expect(clipped[0][1]).toBeCloseTo(-0.001, 4);
        expect(clipped[1][1]).toBeCloseTo(0.001, 4);
    });

    it("applies multiple divider lines to create multiple sections", () => {
        const dividers = [
            { id: "d1", coordinates: [[0, -0.002], [0, 0.002]] }, // vertical cut at x=0
            { id: "d2", coordinates: [[-0.002, 0], [0.002, 0]] }, // horizontal cut at y=0
        ];
        const sections = applyDividersToPolygon(squareCoords, dividers);
        expect(sections.length).toBe(4);
        sections.forEach(sec => {
            const m = calculatePolygonMetrics(sec);
            expect(m.areaSqFt).toBeGreaterThan(0);
        });
    });

    it("shifts divider line across polygon and dynamically updates section areas", () => {
        // Shift vertical divider to x = 0.0005 (shifting right)
        const dLng = 0.0005;
        const initialLine = [[0, -0.001], [0, 0.001]];
        const shiftedLine = initialLine.map(([x, y]) => [x + dLng, y]);
        const clippedShifted = clipDividerLineToPolygon(squareCoords, shiftedLine);

        expect(clippedShifted.length).toBe(2);
        expect(clippedShifted[0][0]).toBeCloseTo(0.0005, 4);
        expect(clippedShifted[1][0]).toBeCloseTo(0.0005, 4);

        const sections = applyDividersToPolygon(squareCoords, [{ id: "d1", coordinates: clippedShifted }]);
        expect(sections.length).toBe(2);

        const m1 = calculatePolygonMetrics(sections[0]);
        const m2 = calculatePolygonMetrics(sections[1]);
        // One section should be ~3x larger than the other (75% vs 25%)
        const larger = Math.max(m1.areaSqFt, m2.areaSqFt);
        const smaller = Math.min(m1.areaSqFt, m2.areaSqFt);
        expect(larger).toBeGreaterThan(smaller * 2);
    });

    it("tilts divider line by moving one endpoint and slices polygon diagonally", () => {
        // Line from bottom-left corner to top-right corner
        const diagonalCut = [[-0.001, -0.001], [0.001, 0.001]];
        const clipped = clipDividerLineToPolygon(squareCoords, diagonalCut);
        const sections = applyDividersToPolygon(squareCoords, [{ id: "d1", coordinates: clipped }]);
        expect(sections.length).toBe(2);
        const m1 = calculatePolygonMetrics(sections[0]);
        const m2 = calculatePolygonMetrics(sections[1]);
        // Two triangles should be approximately equal in area
        expect(Math.abs(m1.areaSqFt - m2.areaSqFt)).toBeLessThan(m1.areaSqFt * 0.1);
    });
});

describe("moving a boundary keeps its sections valid", () => {
    const squareCoords = [
        [-0.001, -0.001],
        [0.001, -0.001],
        [0.001, 0.001],
        [-0.001, 0.001],
        [-0.001, -0.001]
    ];

    it("detects a pure translation as a delta", () => {
        const moved = shiftRing(squareCoords, 0.01, 0.02);
        const delta = ringTranslationDelta(squareCoords, moved);
        expect(delta).not.toBeNull();
        expect(delta.dLng).toBeCloseTo(0.01, 9);
        expect(delta.dLat).toBeCloseTo(0.02, 9);
    });

    it("returns null when a vertex is reshaped rather than translated", () => {
        const reshaped = squareCoords.map(r => [...r]);
        reshaped[2] = [0.003, 0.001];
        expect(ringTranslationDelta(squareCoords, reshaped)).toBeNull();
    });

    it("moves dividers with the boundary so sections survive a translate", () => {
        const divider = { id: "d1", coordinates: [[0, -0.001], [0, 0.001]] };
        const movedRing = shiftRing(squareCoords, 0.01, 0.02);
        const delta = ringTranslationDelta(squareCoords, movedRing);
        const remapped = remapDividersToNewBoundary([divider], movedRing, delta);

        // The line should now sit on x = 0.01, spanning the moved square.
        expect(remapped[0].coordinates[0][0]).toBeCloseTo(0.01, 4);
        expect(remapped[0].coordinates[1][0]).toBeCloseTo(0.01, 4);

        const sections = applyDividersToPolygon(movedRing, remapped);
        expect(sections.length).toBe(2);
        const parent = calculatePolygonMetrics(movedRing);
        const total = sections.reduce((sum, s) => sum + calculatePolygonMetrics(s).areaSqFt, 0);
        // The two sections together should account for the whole parcel.
        expect(total).toBeCloseTo(parent.areaSqFt, -2);
    });

    it("re-clips dividers to a reshaped boundary so they still split it", () => {
        const divider = { id: "d1", coordinates: [[0, -0.001], [0, 0.001]] };
        const reshaped = squareCoords.map(r => [...r]);
        reshaped[1] = [0.003, -0.001];
        const reshapedClosed = extractPolygonRing(reshaped);

        const remapped = remapDividersToNewBoundary([divider], reshapedClosed, null);
        const sections = applyDividersToPolygon(reshapedClosed, remapped);
        expect(sections.length).toBe(2);
        sections.forEach(s => {
            expect(calculatePolygonMetrics(s).areaSqFt).toBeGreaterThan(0);
        });
    });
});

describe("rebuildSectioningForGeometryChange (the move/reshape fix)", () => {
    const square = [
        [-0.001, -0.001],
        [0.001, -0.001],
        [0.001, 0.001],
        [-0.001, 0.001],
        [-0.001, -0.001]
    ];
    const divider = { id: "d1", coordinates: [[0, -0.001], [0, 0.001]] };
    const sections = [
        { id: "sec-1", name: "Yard", type: "yard", color: "#10b981", coordinates: [] },
        { id: "sec-2", name: "Patio", type: "patio", color: "#f59e0b", coordinates: [] }
    ];

    it("returns null when there is no sectioning to adjust", () => {
        expect(rebuildSectioningForGeometryChange({
            dividers: [], sections: [], oldRing: square, newRing: square
        })).toBeNull();
    });

    it("keeps sections when the boundary is translated", () => {
        const moved = shiftRing(square, 0.01, 0.02);
        const rebuilt = rebuildSectioningForGeometryChange({
            dividers: [divider], sections, oldRing: square, newRing: moved, autoColors: false
        });
        expect(rebuilt).not.toBeNull();
        expect(rebuilt.sections.length).toBe(2);
        // The divider followed the shape.
        expect(rebuilt.dividers[0].coordinates[0][0]).toBeCloseTo(0.01, 4);
        // Section identity survived, not just the count.
        expect(rebuilt.sections.map(s => s.id).sort()).toEqual(["sec-1", "sec-2"]);
    });

    it("keeps sections when the boundary is reshaped", () => {
        const reshaped = square.map(r => [...r]);
        reshaped[1] = [0.003, -0.001];
        const closed = extractPolygonRing(reshaped);
        const rebuilt = rebuildSectioningForGeometryChange({
            dividers: [divider], sections, oldRing: square, newRing: closed, autoColors: false
        });
        expect(rebuilt.sections.length).toBe(2);
        rebuilt.sections.forEach(s => {
            expect(calculatePolygonMetrics(s.coordinates[0]).areaSqFt).toBeGreaterThan(0);
        });
    });

    it("collapses to no sections when the last divider is gone", () => {
        const rebuilt = rebuildSectioningForGeometryChange({
            dividers: [], sections, oldRing: square, newRing: square, autoColors: false
        });
        expect(rebuilt.sections).toEqual([]);
    });
});

describe("buildSectionsFromRings", () => {
    const ringAt = (cx, cy) => [
        [cx - 0.001, cy - 0.001],
        [cx + 0.001, cy - 0.001],
        [cx + 0.001, cy + 0.001],
        [cx - 0.001, cy + 0.001],
        [cx - 0.001, cy - 0.001]
    ];

    it("carries section identity forward by nearest centroid, not array index", () => {
        const existing = [
            { id: "keep-yard", name: "Yard", type: "yard", color: "#10b981", coordinates: [ringAt(0, 0)] },
            { id: "keep-patio", name: "Patio", type: "patio", color: "#f59e0b", coordinates: [ringAt(1, 1)] }
        ];
        // Rings come back in the opposite order; names must follow the geometry.
        const rebuilt = buildSectionsFromRings([ringAt(1, 1), ringAt(0, 0)], existing, false);
        expect(rebuilt[0].id).toBe("keep-patio");
        expect(rebuilt[0].name).toBe("Patio");
        expect(rebuilt[1].id).toBe("keep-yard");
        expect(rebuilt[1].name).toBe("Yard");
    });

    it("assigns a fresh id and default name to a newly created section", () => {
        const existing = [
            { id: "only-one", name: "Yard", type: "yard", color: "#10b981", coordinates: [ringAt(0, 0)] }
        ];
        const rebuilt = buildSectionsFromRings([ringAt(0, 0), ringAt(2, 2)], existing, false);
        expect(rebuilt[0].id).toBe("only-one");
        expect(rebuilt[1].id).not.toBe("only-one");
        expect(rebuilt[1].name).toMatch(/Section 2/);
    });
});
