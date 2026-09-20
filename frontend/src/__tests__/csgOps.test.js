import { describe, it, expect } from "vitest";
import { applyBoolean, isValidOp, ADDON_OPS } from "../functions/csgOps";
import { bakeMeshObject, localGeometry, worldGeometry } from "../functions/buildGeometry";
import * as THREE from "three";

// Two 4m cubes side by side: A at origin, B 2m to the +x.
const boxA = { id: "a", kind: "box", x: 0, z: 0, y: 0, w: 4, d: 4, h: 4, rot: 0, color: "#fff" };
const boxB = { id: "b", kind: "box", x: 2, z: 0, y: 0, w: 4, d: 4, h: 4, rot: 0, color: "#fff" };

function bboxOf(obj) {
    const geo = localGeometry(obj);
    geo.computeBoundingBox();
    return geo.boundingBox;
}

describe("buildGeometry", () => {
    it("builds a local geometry centred on the object origin", () => {
        const bb = bboxOf(boxA);
        expect(bb.min.y).toBeCloseTo(-2, 5);
        expect(bb.max.y).toBeCloseTo(2, 5);
    });

    it("bakes the transform for world geometry", () => {
        const geo = worldGeometry(boxB);
        geo.computeBoundingBox();
        // B is 4m tall on the ground at x=2: world y 0..4, x 0..4.
        expect(geo.boundingBox.min.y).toBeCloseTo(0, 5);
        expect(geo.boundingBox.max.y).toBeCloseTo(4, 5);
        expect(geo.boundingBox.min.x).toBeCloseTo(0, 5);
        expect(geo.boundingBox.max.x).toBeCloseTo(4, 5);
    });

    it("re-centres a CSG mesh and stores it as a mesh object", () => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
        const obj = bakeMeshObject(mesh, { id: "m1", name: "Merged", color: "#abc" });
        expect(obj.kind).toBe("mesh");
        expect(obj.w).toBeCloseTo(2, 5);
        expect(obj.h).toBeCloseTo(2, 5);
        expect(obj.y).toBeCloseTo(0, 5);
        expect(obj.geometry.position.length).toBeGreaterThan(0);
        // The stored geometry is centred, so re-centring is a no-op.
        const bb = bboxOf(obj);
        expect(bb.min.y).toBeCloseTo(-1, 5);
        expect(bb.max.y).toBeCloseTo(1, 5);
    });
});

describe("applyBoolean", () => {
    it("isValidOp knows the supported operations", () => {
        expect(ADDON_OPS.map((o) => o.id)).toEqual(["union", "subtract", "intersect"]);
        ADDON_OPS.forEach((o) => expect(isValidOp(o.id)).toBe(true));
        expect(isValidOp("explode")).toBe(false);
    });

    it("unions two overlapping boxes into a wider solid", () => {
        const out = applyBoolean("union", [boxA, boxB], { name: "Union" });
        expect(out).toBeTruthy();
        expect(out.kind).toBe("mesh");
        expect(out.h).toBeCloseTo(4, 4);
        // A spans x -2..2, B x 0..4; the union spans -2..4.
        expect(out.w).toBeCloseTo(6, 4);
    });

    it("subtracts B from A, leaving only what was not overlapping", () => {
        const out = applyBoolean("subtract", [boxA, boxB]);
        expect(out).toBeTruthy();
        // A spans x -2..2 and B x 0..4, so A - B spans x -2..0.
        expect(out.w).toBeCloseTo(2, 4);
        expect(out.h).toBeCloseTo(4, 4);
    });

    it("intersects down to the shared volume", () => {
        const out = applyBoolean("intersect", [boxA, boxB]);
        expect(out).toBeTruthy();
        // Overlap is x 0..2.
        expect(out.w).toBeCloseTo(2, 4);
    });

    it("refuses fewer than two objects or an unknown op", () => {
        expect(applyBoolean("union", [boxA])).toBeNull();
        expect(applyBoolean("union", [])).toBeNull();
        expect(applyBoolean("explode", [boxA, boxB])).toBeNull();
    });
});
