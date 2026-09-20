import { describe, it, expect } from "vitest";
import {
    PRIMITIVES, findPrimitive, createBuildObject, nextName, snap,
    pointInPolygon, footprintInside, clampIntoPolygon, polygonRadius,
    readObjects, withObjects, cameraPositionFor, azimuthFromPosition,
    updateObject, removeObject, applyScaleToObject, metersToFeet, feetToMeters
} from "../functions/buildObjects";

// 20m x 20m square parcel centred on the origin (local metres).
const SQUARE = [[-10, -10], [10, -10], [10, 10], [-10, 10]];

describe("buildObjects", () => {
    describe("unit conversion", () => {
        it("round-trips feet and metres", () => {
            expect(feetToMeters(10)).toBeCloseTo(3.048, 3);
            expect(metersToFeet(3.048)).toBeCloseTo(10, 2);
        });
    });

    describe("snap", () => {
        it("snaps to the nearest grid step", () => {
            expect(snap(1.13)).toBeCloseTo(1.25, 6);
            expect(snap(-1.13)).toBeCloseTo(-1.25, 6);
            expect(snap(0.4, 1)).toBe(0);
        });
    });

    describe("pointInPolygon", () => {
        it("accepts the centre and rejects points outside", () => {
            expect(pointInPolygon(0, 0, SQUARE)).toBe(true);
            expect(pointInPolygon(9.9, 9.9, SQUARE)).toBe(true);
            expect(pointInPolygon(12, 0, SQUARE)).toBe(false);
            expect(pointInPolygon(0, -30, SQUARE)).toBe(false);
        });

        it("returns false for a degenerate ring", () => {
            expect(pointInPolygon(0, 0, [[0, 0], [1, 1]])).toBe(false);
            expect(pointInPolygon(0, 0, null)).toBe(false);
        });
    });

    describe("footprintInside", () => {
        it("requires the whole footprint, not just the centre", () => {
            // 12m wide block centred at x=8 overhangs the x=10 edge.
            const straddling = { x: 8, z: 0, w: 12, d: 4, rot: 0 };
            expect(footprintInside(straddling, SQUARE)).toBe(false);
            const inside = { x: 0, z: 0, w: 12, d: 4, rot: 0 };
            expect(footprintInside(inside, SQUARE)).toBe(true);
        });

        it("accounts for rotation", () => {
            // A 14x2 plank fits vertically but not rotated 90 degrees in a 20m box.
            const vertical = { x: 0, z: 0, w: 14, d: 2, rot: Math.PI / 2 };
            expect(footprintInside(vertical, SQUARE)).toBe(true);
            const horizontal = { x: 0, z: 0, w: 14, d: 2, rot: 0 };
            expect(footprintInside(horizontal, SQUARE)).toBe(true);
            const tooLong = { x: 0, z: 0, w: 22, d: 2, rot: 0 };
            expect(footprintInside(tooLong, SQUARE)).toBe(false);
        });

        it("requires a margin when one is given", () => {
            const nearEdge = { x: 9, z: 0, w: 1, d: 1, rot: 0 }; // spans 8.5..9.5
            expect(footprintInside(nearEdge, SQUARE)).toBe(true);
            expect(footprintInside(nearEdge, SQUARE, 1)).toBe(false); // spans 7.5..10.5
        });
    });

    describe("clampIntoPolygon", () => {
        it("pulls an overhanging object inside the parcel", () => {
            const outside = { x: 30, z: 0, w: 6, d: 6, rot: 0 };
            const clamped = clampIntoPolygon(outside, SQUARE);
            expect(footprintInside(clamped, SQUARE)).toBe(true);
        });

        it("leaves an object that already fits untouched", () => {
            const inside = { x: 1, z: 1, w: 4, d: 4, rot: 0 };
            expect(clampIntoPolygon(inside, SQUARE)).toBe(inside);
        });
    });

    describe("createBuildObject", () => {
        it("creates a primitive from the catalogue at a snapped position", () => {
            const twelveFeet = feetToMeters(12);
            const obj = createBuildObject("box", 3.13, -2.07, twelveFeet);
            expect(obj.kind).toBe("box");
            expect(obj.x).toBeCloseTo(3.25, 6);
            expect(obj.z).toBeCloseTo(-2, 6);
            expect(obj.h).toBeCloseTo(twelveFeet, 4);
            expect(obj.w).toBeGreaterThan(0);
            expect(obj.d).toBeGreaterThan(0);
            expect(obj.id).toMatch(/^obj3d-/);
        });

        it("uses the catalogue default height when none is given", () => {
            const prim = findPrimitive("wall");
            const obj = createBuildObject("wall", 0, 0, 0);
            expect(obj.h).toBeCloseTo(prim.dims.h, 6);
        });

        it("covers every catalogue primitive", () => {
            PRIMITIVES.forEach((p) => {
                const obj = createBuildObject(p.id, 0, 0, 10);
                expect(obj.kind).toBe(p.id);
                expect(obj.w).toBe(p.dims.w);
            });
        });
    });

    describe("nextName", () => {
        it("counts existing objects of the same kind", () => {
            const existing = [{ kind: "box" }, { kind: "box" }, { kind: "wall" }];
            expect(nextName("box", existing)).toBe("Block 3");
            expect(nextName("wall", existing)).toBe("Wall 2");
        });
    });

    describe("persistence helpers", () => {
        it("reads an empty list from an area without objects", () => {
            expect(readObjects(null)).toEqual([]);
            expect(readObjects({ extra_info: {} })).toEqual([]);
        });

        it("reads a stored list and merges it back without dropping other keys", () => {
            const area = { extra_info: { sections: [{ id: "s1" }] } };
            const payload = withObjects(area, [{ id: "o1" }]);
            expect(payload.sections).toEqual([{ id: "s1" }]);
            expect(payload.objects3d).toEqual([{ id: "o1" }]);
        });
    });

    describe("object list edits", () => {
        const list = [{ id: "a", h: 1 }, { id: "b", h: 2 }];
        it("updates one object", () => {
            expect(updateObject(list, "a", { h: 5 })).toEqual([{ id: "a", h: 5 }, { id: "b", h: 2 }]);
        });
        it("removes one object", () => {
            expect(removeObject(list, "a")).toEqual([{ id: "b", h: 2 }]);
        });
    });

    describe("applyScaleToObject", () => {
        it("bakes a transform scale into the dimensions", () => {
            const out = applyScaleToObject({ w: 2, h: 3, d: 4 }, { x: 2, y: 3, z: 1 });
            expect(out.w).toBe(4);
            expect(out.h).toBe(9);
            expect(out.d).toBe(4);
        });

        it("never collapses a dimension to zero", () => {
            const out = applyScaleToObject({ w: 2, h: 3, d: 4 }, { x: 0, y: 0, z: 0 });
            expect(out.w).toBeGreaterThan(0);
            expect(out.h).toBeGreaterThan(0);
            expect(out.d).toBeGreaterThan(0);
        });
    });

    describe("framing", () => {
        it("bounds the parcel radius", () => {
            expect(polygonRadius(SQUARE)).toBeCloseTo(Math.hypot(10, 10), 3);
            expect(polygonRadius([])).toBe(30);
        });

        it("returns a camera position that scales with the parcel", () => {
            const near = cameraPositionFor("orbit", 10);
            const far = cameraPositionFor("orbit", 100);
            const dist = (p) => Math.hypot(...p);
            expect(dist(far)).toBeGreaterThan(dist(near));
            expect(cameraPositionFor("top", 10)[0]).toBe(0);
        });

        it("orbits the elevation views around a settable front", () => {
            // Front at azimuth 0 looks from +Z; back from -Z; right from +X.
            expect(cameraPositionFor("front", 10, 0)[2]).toBeGreaterThan(0);
            expect(cameraPositionFor("back", 10, 0)[2]).toBeLessThan(0);
            expect(cameraPositionFor("right", 10, 0)[0]).toBeGreaterThan(0);

            // Rotating front by 90 degrees moves the camera to +X.
            const turned = cameraPositionFor("front", 10, Math.PI / 2);
            expect(turned[0]).toBeGreaterThan(0);
            expect(turned[2]).toBeCloseTo(0, 6);
        });

        it("reads the front azimuth from a camera position", () => {
            expect(azimuthFromPosition({ x: 0, z: 5 })).toBeCloseTo(0, 6);
            expect(azimuthFromPosition({ x: 5, z: 0 })).toBeCloseTo(Math.PI / 2, 6);
            expect(azimuthFromPosition(null)).toBe(0);
        });
    });
});
