import * as THREE from "three";
import { groupCenterY } from "./buildObjects";

/**
 * Three.js geometry for a build object.
 *
 * `localGeometry` is centred on the object's own origin (its vertical centre),
 * which is what the scene renders: the group carries position and rotation and
 * the mesh sits at the group origin.
 *
 * `worldGeometry` bakes the object's transform into the vertices. CSG needs
 * both operands in one coordinate space, and three-csg-ts reads the geometry
 * only — it does not apply the mesh matrix — so transforms are baked before a
 * boolean.
 */

export function localGeometry(obj) {
    const w = Math.max(0.02, obj.w || 0.02);
    const d = Math.max(0.02, obj.d || 0.02);
    const h = Math.max(0.02, obj.h || 0.02);

    if (obj.kind === "mesh" && obj.geometry?.position) {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(obj.geometry.position, 3));
        if (obj.geometry.normal) {
            g.setAttribute("normal", new THREE.Float32BufferAttribute(obj.geometry.normal, 3));
        }
        if (obj.geometry.index) g.setIndex(obj.geometry.index);
        if (!obj.geometry.normal) g.computeVertexNormals();
        return g;
    }

    if (obj.kind === "roof") {
        const hw = w / 2;
        const shape = new THREE.Shape();
        shape.moveTo(-hw, 0);
        shape.lineTo(hw, 0);
        shape.lineTo(0, h);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
        geo.translate(0, 0, -d / 2);
        geo.translate(0, -h / 2, 0); // centre on the group origin
        geo.computeVertexNormals();
        return geo;
    }

    if (obj.kind === "cylinder") {
        const r = w / 2;
        return new THREE.CylinderGeometry(r, r, h, 28);
    }

    return new THREE.BoxGeometry(w, h, d);
}

export function objectMatrix(obj) {
    return new THREE.Matrix4().compose(
        new THREE.Vector3(obj.x || 0, groupCenterY(obj), obj.z || 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, obj.rot || 0, 0)),
        new THREE.Vector3(1, 1, 1)
    );
}

export function worldGeometry(obj) {
    const geo = localGeometry(obj);
    geo.applyMatrix4(objectMatrix(obj));
    return geo;
}

/**
 * Freeze a CSG result (a three Mesh in world space) into a build object of kind
 * "mesh": the geometry is re-centred on its own origin and its transform reset,
 * so the ordinary move/rotate gizmos keep working on it.
 */
export function bakeMeshObject(mesh, { id, name, color }) {
    const geo = mesh.geometry.clone();
    geo.computeBoundingBox();
    const box = geo.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox.getSize(size);

    const normal = geo.attributes.normal ? Array.from(geo.attributes.normal.array) : null;
    if (!normal) geo.computeVertexNormals();

    return {
        id,
        kind: "mesh",
        name: name || "Combined",
        color: color || "#93c5fd",
        x: center.x,
        z: center.z,
        y: Math.max(0, center.y - size.y / 2),
        w: Math.max(0.02, size.x),
        d: Math.max(0.02, size.z),
        h: Math.max(0.02, size.y),
        rot: 0,
        geometry: {
            position: Array.from(geo.attributes.position.array),
            normal: normal || Array.from(geo.attributes.normal.array),
            index: geo.index ? Array.from(geo.index.array) : null
        }
    };
}
