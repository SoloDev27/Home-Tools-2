import * as THREE from "three";
import { CSG } from "three-csg-ts";
import { worldGeometry, bakeMeshObject } from "./buildGeometry";
import { newObjectId } from "./buildObjects";

/**
 * Boolean operations on build objects, for the Addons menu.
 *
 * Shapes are parametric (kind + dimensions) and carry their own transform; CSG
 * reads raw vertices, so each operand's transform is baked into a world-space
 * geometry first. The result is frozen into a `mesh` object so the scene keeps
 * rendering it through the same code path as everything else.
 */

export const ADDON_OPS = [
    { id: "union", label: "Union", hint: "Merge the selected shapes into one solid" },
    { id: "subtract", label: "Subtract", hint: "Cut the others out of the first selected shape" },
    { id: "intersect", label: "Intersect", hint: "Keep only the overlap of the selected shapes" }
];

const EVALUATE = {
    union: CSG.union,
    subtract: CSG.subtract,
    intersect: CSG.intersect
};

export function isValidOp(op) {
    return Object.prototype.hasOwnProperty.call(EVALUATE, op);
}

/**
 * Apply `op` across `objects` (earlier entries first) and return a new mesh
 * object, or null when the operation could not produce geometry.
 */
export function applyBoolean(op, objects, { name, color } = {}) {
    if (!isValidOp(op) || !Array.isArray(objects) || objects.length < 2) return null;

    let result = new THREE.Mesh(worldGeometry(objects[0]));
    for (let i = 1; i < objects.length; i++) {
        const next = new THREE.Mesh(worldGeometry(objects[i]));
        try {
            result = EVALUATE[op](result, next);
        } catch {
            return null;
        }
        if (!result?.geometry?.attributes?.position?.count) return null;
    }

    return bakeMeshObject(result, { id: newObjectId(), name, color });
}
