import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
    OrbitControls, Grid, Html, Line, TransformControls,
    Edges, GizmoHelper, GizmoViewport
} from "@react-three/drei";
import * as THREE from "three";
import {
    MousePointer2, Move3d, RotateCw, Scaling, ArrowUpFromLine, Trash2,
    Box as BoxIcon, Minus, Columns3, Cylinder as CylinderIcon, Home as HomeIcon,
    Square as SquareIcon, Maximize2, Copy, Layers, Compass, Plus,
    ExternalLink, Eye, Grid3x3
} from "lucide-react";
import {
    PALETTE, findPrimitive, createBuildObject, nextName,
    footprintInside, clampIntoPolygon, polygonRadius, readObjects, withObjects,
    cameraPositionFor, updateObject, removeObject, applyScaleToObject, snap,
    metersToFeet, feetToMeters, SNAP_METERS, CAMERA_PRESETS
} from "../../functions/buildObjects";
import "./Unified3DCanvas.css";

const FENCE_HEIGHT = 0.65;
const FENCE_THICK = 0.16;
const FLOOR_DEPTH = 0.35;

const TRANSFORM_TOOLS = [
    { id: "select", label: "Select", tip: "Select  ·  V", Icon: MousePointer2 },
    { id: "move", label: "Move", tip: "Move  ·  G", Icon: Move3d },
    { id: "rotate", label: "Rotate", tip: "Rotate  ·  R", Icon: RotateCw },
    { id: "scale", label: "Scale", tip: "Scale  ·  S", Icon: Scaling },
    { id: "extrude", label: "Extrude", tip: "Extrude height  ·  E", Icon: ArrowUpFromLine }
];

const BUILD_TOOLS = [
    { id: "box", label: "Block", tip: "Block  ·  1", Icon: BoxIcon },
    { id: "wall", label: "Wall", tip: "Wall  ·  2", Icon: Minus },
    { id: "column", label: "Column", tip: "Column  ·  3", Icon: Columns3 },
    { id: "cylinder", label: "Cylinder", tip: "Cylinder  ·  4", Icon: CylinderIcon },
    { id: "roof", label: "Roof", tip: "Roof  ·  5", Icon: HomeIcon },
    { id: "slab", label: "Slab", tip: "Slab  ·  6", Icon: SquareIcon }
];

const CAMERA_ICONS = { Orbit: Compass, Plan: Layers, Iso: BoxIcon, Front: SquareIcon };

// ---------------------------------------------------------------- geometry

/** GPS [lng, lat] -> local metres [x, z] anchored at the parcel centroid. */
function gpsToMeters(lng, lat, centerLng, centerLat) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(toRad(centerLat));
    const x = (lng - centerLng) * metersPerDegreeLng;
    const z = -(lat - centerLat) * metersPerDegreeLat;
    return [x, z];
}

function getAreaPolygonPoints(area, centerLng, centerLat) {
    if (!area?.coordinates) return [];
    const ring = Array.isArray(area.coordinates[0]) ? area.coordinates[0] : area.coordinates;
    if (!ring || ring.length < 3) return [];
    return ring.map(([lng, lat]) => gpsToMeters(lng, lat, centerLng, centerLat));
}

/**
 * A 2D shape from local [x, z] points, ready to lay flat with rotateX(-PI/2).
 *
 * The shape is drawn in XY with v = -z. Combined with rotateX(-PI/2) this maps
 * (x, z) -> world (x, 0, z) and extrudes upward. Using rotateX(+PI/2) instead
 * mirrors the result in Z and pushes extrusions below the ground plane.
 */
function ringToShape(points) {
    const shape = new THREE.Shape();
    points.forEach(([x, z], i) => {
        if (i === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
    });
    shape.closePath();
    return shape;
}

function meshOffsetY(obj) {
    // Roof and slab rest their base on the group origin; the rest are centred.
    if (obj.kind === "roof") return 0;
    return obj.h / 2;
}

// ---------------------------------------------------------------- scene parts

function ParcelGround({ points, color = "#6366f1" }) {
    const { slab, outline } = useMemo(() => {
        if (!points || points.length < 3) return { slab: null, outline: null };
        const shape = ringToShape(points);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: FLOOR_DEPTH, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const pts = points.map(([x, z]) => new THREE.Vector3(x, 0.06, z));
        pts.push(new THREE.Vector3(points[0][0], 0.06, points[0][1]));
        return { slab: geo, outline: pts };
    }, [points]);

    if (!slab || !outline) return null;

    return (
        <group>
            {/* Buildable pad — the only surface that accepts objects. */}
            <mesh geometry={slab} position={[0, -FLOOR_DEPTH, 0]} receiveShadow>
                <meshStandardMaterial color="#0e1a2e" roughness={0.95} metalness={0.02} />
            </mesh>

            {/* Bright boundary line (Line2, so lineWidth actually renders). */}
            <Line points={outline} color={color} lineWidth={3} transparent opacity={0.95} />

            {/* Low glowing fence so the edge reads from any camera angle. */}
            {points.map(([x, z], i) => {
                const [nx, nz] = points[(i + 1) % points.length];
                const len = Math.hypot(nx - x, nz - z);
                if (len < 0.01) return null;
                const mid = [(x + nx) / 2, (z + nz) / 2];
                const angle = Math.atan2(nz - z, nx - x);
                return (
                    <mesh key={i} position={[mid[0], FENCE_HEIGHT / 2, mid[1]]} rotation={[0, -angle, 0]}>
                        <boxGeometry args={[len, FENCE_HEIGHT, FENCE_THICK]} />
                        <meshStandardMaterial
                            color={color}
                            emissive={color}
                            emissiveIntensity={0.45}
                            transparent
                            opacity={0.42}
                        />
                    </mesh>
                );
            })}

            {/* Corner posts anchor the corners visually. */}
            {points.map(([x, z], i) => (
                <mesh key={`c-${i}`} position={[x, FENCE_HEIGHT * 0.8, z]}>
                    <cylinderGeometry args={[0.16, 0.16, FENCE_HEIGHT * 1.6, 16]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.7} />
                </mesh>
            ))}
        </group>
    );
}

function Section3DGround({ section, centerLng, centerLat, isSelected }) {
    const { geo, outline, center } = useMemo(() => {
        const raw = section.coordinates;
        if (!raw) return { geo: null, outline: null, center: [0, 0, 0] };
        let ring = raw;
        while (Array.isArray(ring) && ring.length && Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
            ring = ring[0];
        }
        if (!Array.isArray(ring) || ring.length < 3) return { geo: null, outline: null, center: [0, 0, 0] };
        const local = ring.map(([lng, lat]) => gpsToMeters(lng, lat, centerLng, centerLat));
        const shape = ringToShape(local);
        const g = new THREE.ShapeGeometry(shape);
        g.rotateX(-Math.PI / 2);
        const pts = local.map(([x, z]) => new THREE.Vector3(x, 0.07, z));
        pts.push(new THREE.Vector3(local[0][0], 0.07, local[0][1]));
        const cx = local.reduce((s, p) => s + p[0], 0) / local.length;
        const cz = local.reduce((s, p) => s + p[1], 0) / local.length;
        return { geo: g, outline: pts, center: [cx, 0.9, cz] };
    }, [section.coordinates, centerLng, centerLat]);

    if (!geo || !outline) return null;
    const color = section.color || "#8b5cf6";

    return (
        <group>
            <mesh geometry={geo} position={[0, 0.04, 0]}>
                <meshStandardMaterial
                    color={color}
                    roughness={0.5}
                    metalness={0.05}
                    transparent
                    opacity={isSelected ? 0.6 : 0.3}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <Line points={outline} color={color} lineWidth={2} transparent opacity={0.9} />
            <Html position={center} center distanceFactor={26} zIndexRange={[100, 0]}>
                <div className={`unified-3d-section-tag ${isSelected ? "active" : ""}`} style={{ borderColor: color }}>
                    <span>{section.name || "Section"}</span>
                </div>
            </Html>
        </group>
    );
}

function Divider3DLine({ coordinates, centerLng, centerLat, color = "#c084fc" }) {
    const points = useMemo(() => {
        if (!coordinates || coordinates.length < 2) return null;
        const [a, b] = coordinates;
        const [x1, z1] = gpsToMeters(a[0], a[1], centerLng, centerLat);
        const [x2, z2] = gpsToMeters(b[0], b[1], centerLng, centerLat);
        return [new THREE.Vector3(x1, 0.09, z1), new THREE.Vector3(x2, 0.09, z2)];
    }, [coordinates, centerLng, centerLat]);

    if (!points) return null;
    return <Line points={points} color={color} lineWidth={2} dashed dashSize={0.6} gapSize={0.4} />;
}

/** Legacy "structures" are real Properties with floorplans; shown as masses. */
function StructureMass({ item, centerLng, centerLat, isSelected, onSelect }) {
    const { geometry, position } = useMemo(() => {
        const raw = item.hierarchy?.coordinates || item.coordinates;
        if (raw) {
            let ring = raw;
            if (typeof ring === "string") {
                try { ring = JSON.parse(ring); } catch { ring = []; }
            }
            while (Array.isArray(ring) && ring.length && Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
                ring = ring[0];
            }
            if (Array.isArray(ring) && ring.length >= 3) {
                const local = ring.map(([lng, lat]) => gpsToMeters(lng, lat, centerLng, centerLat));
                const shape = ringToShape(local);
                const h = item.height_meters || 3.6;
                const geom = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
                geom.rotateX(-Math.PI / 2);
                return { geometry: geom, position: [0, 0, 0] };
            }
        }
        if (item.lat && item.lng) {
            const [x, z] = gpsToMeters(item.lng, item.lat, centerLng, centerLat);
            const h = item.height_meters || 3.6;
            return {
                geometry: new THREE.BoxGeometry(12, h, 9),
                position: [x, h / 2, z]
            };
        }
        return { geometry: null, position: [0, 0, 0] };
    }, [item, centerLng, centerLat]);

    const edges = useMemo(() => (geometry ? new THREE.EdgesGeometry(geometry) : null), [geometry]);
    useEffect(() => () => { edges?.dispose(); }, [edges]);

    if (!geometry) return null;
    const color = isSelected ? "#6366f1" : (item.color || "#3b82f6");

    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(item); }}>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} transparent opacity={0.85} />
            </mesh>
            {edges && (
                <lineSegments geometry={edges}>
                    <lineBasicMaterial color={isSelected ? "#ffffff" : "#93c5fd"} transparent opacity={0.7} />
                </lineSegments>
            )}
        </group>
    );
}

function PrimitiveGeometry({ kind, w, d, h }) {
    const roof = useMemo(() => {
        if (kind !== "roof") return null;
        const hw = Math.max(0.1, w) / 2;
        const dd = Math.max(0.1, d);
        const shape = new THREE.Shape();
        shape.moveTo(-hw, 0);
        shape.lineTo(hw, 0);
        shape.lineTo(0, h);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: dd, bevelEnabled: false });
        geo.translate(0, 0, -dd / 2);
        geo.computeVertexNormals();
        return geo;
    }, [kind, w, d, h]);

    useEffect(() => () => { if (roof) roof.dispose(); }, [roof]);

    if (kind === "roof" && roof) return <primitive object={roof} attach="geometry" />;
    if (kind === "cylinder") {
        const r = Math.max(0.08, w / 2);
        return <cylinderGeometry args={[r, r, h, 28]} />;
    }
    return <boxGeometry args={[Math.max(0.08, w), h, Math.max(0.08, d)]} />;
}

function BuildObjectMesh({ obj, isSelected, materialStyle, onSelect, onReady }) {
    const groupRef = useRef();

    useEffect(() => {
        onReady(obj.id, groupRef.current);
        return () => onReady(obj.id, null);
    }, [obj.id, onReady]);

    // Colour communicates validity: a ghost over the boundary shows red.
    const opacity = materialStyle === "wireframe" ? 0.16
        : materialStyle === "xray" ? 0.45
            : 0.92;
    const wireframe = materialStyle === "wireframe";

    return (
        <group
            ref={groupRef}
            position={[obj.x, obj.y || 0, obj.z]}
            rotation={[0, obj.rot || 0, 0]}
        >
            <mesh
                position={[0, meshOffsetY(obj), 0]}
                castShadow
                receiveShadow
                onClick={(e) => { e.stopPropagation(); onSelect(obj.id); }}
            >
                <PrimitiveGeometry kind={obj.kind} w={obj.w} d={obj.d} h={obj.h} />
                <meshStandardMaterial
                    color={obj.color || "#93c5fd"}
                    roughness={0.38}
                    metalness={0.12}
                    transparent={opacity < 1}
                    opacity={opacity}
                    wireframe={wireframe}
                />
                <Edges
                    threshold={15}
                    color={isSelected ? "#ffffff" : "#c7d2fe"}
                    scale={1.001}
                />
            </mesh>
        </group>
    );
}

function GhostPreview({ obj, valid }) {
    const color = valid ? "#4ade80" : "#f87171";
    return (
        <group position={[obj.x, obj.y || 0, obj.z]} rotation={[0, obj.rot || 0, 0]}>
            <mesh position={[0, meshOffsetY(obj), 0]}>
                <PrimitiveGeometry kind={obj.kind} w={obj.w} d={obj.d} h={obj.h} />
                <meshStandardMaterial color={color} transparent opacity={0.4} depthWrite={false} />
                <Edges threshold={15} color={color} />
            </mesh>
        </group>
    );
}

/** Invisible catcher for placement: gives the ground point under the cursor. */
function GroundCatcher({ size, onMove, onClick }) {
    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.01, 0]}
            onPointerMove={(e) => { e.stopPropagation(); onMove(e.point.x, e.point.z); }}
            onPointerOut={() => onMove(null, null)}
            onClick={(e) => { e.stopPropagation(); onClick(e.point.x, e.point.z); }}
        >
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
    );
}

/** Frames the camera to the parcel; reframes on preset change or fit request. */
function CameraRig({ preset, radius, fitNonce, controlsRef }) {
    const { camera } = useThree();
    useEffect(() => {
        const [x, y, z] = cameraPositionFor(preset, radius);
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    }, [preset, radius, fitNonce, camera, controlsRef]);
    return null;
}

// ---------------------------------------------------------------- main

export default function Unified3DCanvas({
    activeArea,
    areas = [],
    structures = [],
    features = [],
    selectedSectionId = null,
    onNavigateStudio,
    onAddStructureMass,
    onUpdateArea,
    onSelectArea
}) {
    const [tool, setTool] = useState("select");
    const [materialStyle, setMaterialStyle] = useState("solid");
    const [cameraPreset, setCameraPreset] = useState("orbit");
    const [fitNonce, setFitNonce] = useState(0);
    const [showGrid, setShowGrid] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [gizmoTarget, setGizmoTarget] = useState(null);
    const [hoverPoint, setHoverPoint] = useState(null);
    const [buildHeightFeet, setBuildHeightFeet] = useState(12);
    const [notice, setNotice] = useState(null);
    const controlsRef = useRef(null);
    const objectRefs = useRef({});
    const noticeTimer = useRef(null);

    const selectObject = useCallback((id) => {
        setSelectedStructure(null);
        setSelectedId(id);
    }, []);

    const { centerLng, centerLat } = useMemo(() => {
        if (!activeArea?.coordinates) return { centerLng: -83.5055, centerLat: 32.9075 };
        const ring = Array.isArray(activeArea.coordinates[0]) ? activeArea.coordinates[0] : activeArea.coordinates;
        if (!ring?.length) return { centerLng: -83.5055, centerLat: 32.9075 };
        return {
            centerLng: ring.reduce((s, p) => s + p[0], 0) / ring.length,
            centerLat: ring.reduce((s, p) => s + p[1], 0) / ring.length
        };
    }, [activeArea]);

    const boundaryPoints = useMemo(
        () => getAreaPolygonPoints(activeArea, centerLng, centerLat),
        [activeArea, centerLng, centerLat]
    );
    const radius = useMemo(() => polygonRadius(boundaryPoints), [boundaryPoints]);

    const sections = useMemo(() => {
        const list = [];
        if (activeArea?.extra_info?.sections) list.push(...activeArea.extra_info.sections);
        features.forEach((f) => { if (f.properties_data?.sections) list.push(...f.properties_data.sections); });
        return list;
    }, [activeArea, features]);

    const dividers = useMemo(() => {
        const list = [];
        if (activeArea?.extra_info?.dividers) list.push(...activeArea.extra_info.dividers);
        features.forEach((f) => { if (f.properties_data?.dividers) list.push(...f.properties_data.dividers); });
        return list;
    }, [activeArea, features]);

    const parcelStructures = useMemo(() => {
        if (!activeArea) return structures;
        return structures.filter((s) => !s.area_id || Number(s.area_id) === Number(activeArea.id));
    }, [structures, activeArea]);

    // ---- objects (persisted on the parcel) ----
    const [objects, setObjects] = useState(() => readObjects(activeArea));
    useEffect(() => {
        setObjects(readObjects(activeArea));
        setSelectedId(null);
        setSelectedStructure(null);
        // Resync only when the parcel changes; object edits stay local until committed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeArea?.id]);

    const commit = useCallback((next) => {
        setObjects(next);
        if (activeArea && onUpdateArea) {
            onUpdateArea(activeArea.id, { extra_info: withObjects(activeArea, next) });
        }
    }, [activeArea, onUpdateArea]);

    const selected = useMemo(
        () => objects.find((o) => o.id === selectedId) || null,
        [objects, selectedId]
    );

    const registerObject = useCallback((id, node) => {
        if (node) objectRefs.current[id] = node;
        else delete objectRefs.current[id];
    }, []);

    useEffect(() => {
        setGizmoTarget(selectedId ? objectRefs.current[selectedId] || null : null);
    }, [selectedId, objects, tool]);

    const isPlacing = tool !== "select" && tool !== "move" && tool !== "rotate"
        && tool !== "scale" && tool !== "extrude";

    const ghost = useMemo(() => {
        if (!isPlacing || !hoverPoint) return null;
        const prim = findPrimitive(tool);
        if (!prim) return null;
        return {
            kind: prim.id,
            x: snap(hoverPoint[0]),
            z: snap(hoverPoint[1]),
            y: 0,
            w: prim.dims.w,
            d: prim.dims.d,
            h: prim.id === "slab" ? prim.dims.h : feetToMeters(buildHeightFeet),
            rot: 0
        };
    }, [isPlacing, hoverPoint, tool, buildHeightFeet]);

    const ghostValid = ghost ? footprintInside(ghost, boundaryPoints, 0.05) : false;

    const flash = useCallback((msg) => {
        setNotice(msg);
        window.clearTimeout(noticeTimer.current);
        noticeTimer.current = window.setTimeout(() => setNotice(null), 2200);
    }, []);
    useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

    const placeAt = (x, z) => {
        const prim = findPrimitive(tool);
        if (!prim || !activeArea) return;
        const base = createBuildObject(tool, x, z, feetToMeters(buildHeightFeet));
        const candidate = footprintInside(base, boundaryPoints, 0.02)
            ? base
            : clampIntoPolygon(base, boundaryPoints);
        if (!footprintInside(candidate, boundaryPoints)) {
            flash("That footprint does not fit inside the parcel.");
            return;
        }
        candidate.name = nextName(tool, objects);
        const next = [...objects, candidate];
        commit(next);
        selectObject(candidate.id);
    };

    const handleGizmoCommit = useCallback(() => {
        const target = gizmoTarget;
        const obj = objects.find((o) => o.id === selectedId);
        if (!target || !obj) return;

        if (tool === "move") {
            let candidate = {
                ...obj,
                x: snap(target.position.x),
                z: snap(target.position.z),
                y: Math.max(0, snap(target.position.y))
            };
            candidate = clampIntoPolygon(candidate, boundaryPoints);
            commit(updateObject(objects, selectedId, { x: candidate.x, z: candidate.z, y: candidate.y }));
            target.position.set(candidate.x, candidate.y, candidate.z);
        } else if (tool === "rotate") {
            const rot = target.rotation.y;
            commit(updateObject(objects, selectedId, { rot }));
        } else if (tool === "scale" || tool === "extrude") {
            const scaled = applyScaleToObject(obj, target.scale);
            target.scale.set(1, 1, 1);
            const next = updateObject(objects, selectedId, { w: scaled.w, d: scaled.d, h: scaled.h });
            // A scaled footprint may no longer fit; pull it back inside.
            const clamped = clampIntoPolygon(
                { ...obj, w: scaled.w, d: scaled.d, h: scaled.h },
                boundaryPoints
            );
            commit(updateObject(next, selectedId, { x: clamped.x, z: clamped.z }));
        }
    }, [gizmoTarget, objects, selectedId, tool, boundaryPoints, commit]);

    const handleDelete = useCallback((id = selectedId) => {
        if (!id) return;
        commit(removeObject(objects, id));
        setSelectedId(null);
    }, [objects, selectedId, commit]);

    const handleDuplicate = useCallback(() => {
        if (!selected || !activeArea) return;
        const copy = {
            ...selected,
            id: undefined,
            name: `${selected.name} copy`,
            x: snap(selected.x + 1),
            z: snap(selected.z + 1)
        };
        const placed = createBuildObject(copy.kind, copy.x, copy.z, copy.h);
        const merged = { ...placed, ...copy, id: placed.id };
        const clamped = clampIntoPolygon(merged, boundaryPoints);
        const next = [...objects, clamped];
        commit(next);
        selectObject(clamped.id);
    }, [selected, objects, boundaryPoints, commit, activeArea, selectObject]);

    const patchSelected = useCallback((patch) => {
        if (!selectedId) return;
        commit(updateObject(objects, selectedId, patch));
    }, [objects, selectedId, commit]);

    // ---- keyboard shortcuts ----
    useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) return;
            const key = e.key.toLowerCase();
            if (e.key === "Escape") { setSelectedId(null); setSelectedStructure(null); setTool("select"); return; }
            if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); handleDelete(); return; }
            const map = { v: "select", g: "move", r: "rotate", s: "scale", e: "extrude" };
            if (map[key]) { setTool(map[key]); return; }
            if (key === "f") { setFitNonce((n) => n + 1); return; }
            const num = { "1": "box", "2": "wall", "3": "column", "4": "cylinder", "5": "roof", "6": "slab" };
            if (num[key]) { setTool(num[key]); return; }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [handleDelete]);

    const transformMode = tool === "move" ? "translate"
        : tool === "rotate" ? "rotate"
            : (tool === "scale" || tool === "extrude") ? "scale"
                : null;
    const yOnly = tool === "rotate" || tool === "extrude";

    const activeColor = activeArea?.color || "#6366f1";
    const canBuild = Boolean(activeArea) && boundaryPoints.length >= 3;

    const statusHint = !activeArea
        ? "Choose a parcel to build on."
        : isPlacing
            ? (hoverPoint && !ghostValid
                ? "Outside the buildable parcel — move inside the boundary."
                : `Click inside the parcel to place a ${findPrimitive(tool)?.label.toLowerCase()}.`)
            : tool === "select"
                ? "Click an object to select it. Left-drag orbits, right-drag pans, the wheel zooms."
                : `Drag the gizmo to ${tool} the selected object.`;

    return (
        <div className="u3d-root">
            <Canvas
                className="u3d-canvas"
                shadows
                camera={{ position: [40, 30, 50], fov: 45, near: 0.1, far: 2000 }}
                onPointerMissed={() => { if (!isPlacing) { setSelectedId(null); setSelectedStructure(null); } }}
            >
                <CameraRig preset={cameraPreset} radius={radius} fitNonce={fitNonce} controlsRef={controlsRef} />

                <ambientLight intensity={0.55} />
                <hemisphereLight args={["#dbeafe", "#0b1220", 0.5]} />
                <directionalLight
                    position={[radius, radius * 1.8, radius]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                    shadow-camera-far={radius * 8}
                    shadow-camera-left={-radius * 2}
                    shadow-camera-right={radius * 2}
                    shadow-camera-top={radius * 2}
                    shadow-camera-bottom={-radius * 2}
                />

                {showGrid && (
                    <Grid
                        position={[0, -0.02, 0]}
                        args={[radius * 6, radius * 6]}
                        cellSize={1}
                        cellThickness={0.5}
                        cellColor="#16233b"
                        sectionSize={5}
                        sectionThickness={1}
                        sectionColor="#24405f"
                        fadeDistance={radius * 8}
                        fadeStrength={1.4}
                        infiniteGrid
                    />
                )}

                {canBuild && <ParcelGround points={boundaryPoints} color={activeColor} />}

                {sections.map((sec, i) => (
                    <Section3DGround
                        key={`sec-${sec.id || i}`}
                        section={sec}
                        centerLng={centerLng}
                        centerLat={centerLat}
                        isSelected={selectedSectionId === sec.id}
                    />
                ))}

                {dividers.map((div, i) => (
                    <Divider3DLine
                        key={`div-${div.id || i}`}
                        coordinates={div.coordinates}
                        centerLng={centerLng}
                        centerLat={centerLat}
                        color={div.color || "#c084fc"}
                    />
                ))}

                {parcelStructures.map((s) => (
                    <StructureMass
                        key={`s-${s.id}`}
                        item={s}
                        centerLng={centerLng}
                        centerLat={centerLat}
                        isSelected={selectedStructure?.id === s.id}
                        onSelect={(item) => { setSelectedId(null); setSelectedStructure(item); }}
                    />
                ))}

                {objects.map((obj) => (
                    <BuildObjectMesh
                        key={obj.id}
                        obj={obj}
                        isSelected={selectedId === obj.id}
                        materialStyle={materialStyle}
                        onSelect={selectObject}
                        onReady={registerObject}
                    />
                ))}

                {ghost && <GhostPreview obj={ghost} valid={ghostValid} />}

                {isPlacing && canBuild && (
                    <GroundCatcher
                        size={radius * 6}
                        onMove={(x, z) => setHoverPoint(x == null ? null : [x, z])}
                        onClick={(x, z) => placeAt(x, z)}
                    />
                )}

                {gizmoTarget && transformMode && (
                    <TransformControls
                        object={gizmoTarget}
                        mode={transformMode}
                        size={0.85}
                        showX={!yOnly}
                        showZ={!yOnly}
                        translationSnap={SNAP_METERS}
                        rotationSnap={Math.PI / 12}
                        scaleSnap={0.05}
                        onMouseUp={handleGizmoCommit}
                    />
                )}

                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    enableDamping
                    dampingFactor={0.08}
                    rotateSpeed={0.85}
                    zoomSpeed={1.15}
                    panSpeed={0.9}
                    screenSpacePanning
                    zoomToCursor
                    minDistance={Math.max(1.5, radius * 0.12)}
                    maxDistance={Math.max(30, radius * 7)}
                    minPolarAngle={0.05}
                    maxPolarAngle={Math.PI / 2 - 0.02}
                />

                <GizmoHelper alignment="bottom-right" margin={[78, 110]}>
                    <GizmoViewport axisColors={["#f87171", "#4ade80", "#60a5fa"]} labelColor="#e2e8f0" />
                </GizmoHelper>
            </Canvas>

            {/* ---------- top bar ---------- */}
            <div className="u3d-topbar">
                <div className="u3d-chip">
                    <span className="u3d-dot" style={{ backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}` }} />
                    <div>
                        <div className="u3d-chip-title">
                            {activeArea ? activeArea.name : "No parcel selected"}
                        </div>
                        <div className="u3d-chip-sub">
                            {canBuild
                                ? `${Math.round(metersToFeet(radius * 2)).toLocaleString()} ft across · ${objects.length} object${objects.length === 1 ? "" : "s"}`
                                : "Choose an area to build on"}
                        </div>
                    </div>
                </div>

                <div className="u3d-segmented">
                    {CAMERA_PRESETS.map((p) => {
                        const Icon = CAMERA_ICONS[p.icon] || Compass;
                        return (
                            <button
                                key={p.id}
                                className={cameraPreset === p.id ? "active" : ""}
                                onClick={() => setCameraPreset(p.id)}
                                title={`${p.label} view`}
                            >
                                <Icon size={13} /> {p.label}
                            </button>
                        );
                    })}
                    <button onClick={() => setFitNonce((n) => n + 1)} title="Frame the parcel  ·  F">
                        <Maximize2 size={13} /> Fit
                    </button>
                    <button
                        className={showGrid ? "active" : ""}
                        onClick={() => setShowGrid((v) => !v)}
                        title="Toggle grid"
                    >
                        <Grid3x3 size={13} />
                    </button>
                </div>
            </div>

            {/* ---------- left tool rail ---------- */}
            <div className="u3d-rail">
                {TRANSFORM_TOOLS.map(({ id, label, tip, Icon }) => (
                    <button
                        key={id}
                        className={`u3d-tool ${tool === id ? "active" : ""}`}
                        title={tip}
                        aria-label={label}
                        aria-pressed={tool === id}
                        onClick={() => setTool(id)}
                    >
                        <Icon size={16} />
                    </button>
                ))}
                <button
                    className="u3d-tool danger"
                    title="Delete selected  ·  ⌫"
                    aria-label="Delete selected"
                    onClick={() => handleDelete()}
                    disabled={!selectedId}
                >
                    <Trash2 size={16} />
                </button>

                <div className="u3d-rail-divider" />

                {BUILD_TOOLS.map(({ id, label, tip, Icon }) => (
                    <button
                        key={id}
                        className={`u3d-tool ${tool === id ? "active" : ""}`}
                        title={canBuild ? tip : "Select a parcel first"}
                        aria-label={label}
                        aria-pressed={tool === id}
                        onClick={() => setTool(id)}
                        disabled={!canBuild}
                    >
                        <Icon size={16} />
                    </button>
                ))}
            </div>

            {/* ---------- inspector ---------- */}
            <div className="u3d-inspector">
                <h3>{selected ? "Object" : selectedStructure ? "Building" : "Build"}</h3>

                {selectedStructure ? (
                    <>
                        <div className="u3d-field">
                            <label>Name</label>
                            <input type="text" value={selectedStructure.name || ""} readOnly />
                        </div>
                        <div className="u3d-inspector-empty" style={{ marginBottom: 10 }}>
                            A real building with a floorplan. Open it in the Render studio to edit
                            floors, rooms and objects.
                        </div>
                        {onNavigateStudio && (
                            <div className="u3d-inspector-actions">
                                <button
                                    className="u3d-btn primary"
                                    onClick={() => onNavigateStudio(selectedStructure.id)}
                                >
                                    <ExternalLink size={12} /> Floorplan Studio
                                </button>
                            </div>
                        )}
                    </>
                ) : !selected ? (
                    <div className="u3d-inspector-empty">
                        {isPlacing
                            ? "Move over the parcel and click to place. The ghost turns green where the footprint fits."
                            : "Select an object to edit its size, height, rotation and colour. Use the rail to place new blocks."}
                    </div>
                ) : (
                    <>
                        <div className="u3d-field">
                            <label>Name</label>
                            <input
                                type="text"
                                value={selected.name || ""}
                                onChange={(e) => patchSelected({ name: e.target.value })}
                            />
                        </div>

                        <div className="u3d-field">
                            <label>Dimensions (ft · W / H / D)</label>
                            <div className="u3d-dim-grid">
                                <input
                                    type="number" step="0.5" min="0.5"
                                    value={Math.round(metersToFeet(selected.w) * 10) / 10}
                                    onChange={(e) => patchSelected({ w: feetToMeters(Number(e.target.value)) })}
                                />
                                <input
                                    type="number" step="0.5" min="0.5"
                                    value={Math.round(metersToFeet(selected.h) * 10) / 10}
                                    onChange={(e) => patchSelected({ h: feetToMeters(Number(e.target.value)) })}
                                />
                                <input
                                    type="number" step="0.5" min="0.5"
                                    value={Math.round(metersToFeet(selected.d) * 10) / 10}
                                    onChange={(e) => patchSelected({ d: feetToMeters(Number(e.target.value)) })}
                                />
                            </div>
                        </div>

                        <div className="u3d-field">
                            <label>Rotation · {Math.round(((selected.rot || 0) * 180) / Math.PI)}°</label>
                            <input
                                type="range" min="-180" max="180" step="5"
                                value={Math.round(((selected.rot || 0) * 180) / Math.PI)}
                                onChange={(e) => patchSelected({ rot: (Number(e.target.value) * Math.PI) / 180 })}
                            />
                        </div>

                        <div className="u3d-field">
                            <label>Colour</label>
                            <div className="u3d-swatches">
                                {PALETTE.map((c) => (
                                    <span
                                        key={c}
                                        className={`u3d-swatch ${selected.color === c ? "active" : ""}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => patchSelected({ color: c })}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="u3d-inspector-actions">
                            <button className="u3d-btn" onClick={handleDuplicate}>
                                <Copy size={12} /> Duplicate
                            </button>
                            <button className="u3d-btn danger" onClick={() => handleDelete()}>
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    </>
                )}

                {onAddStructureMass && (
                    <div className="u3d-inspector-actions" style={{ marginTop: 12 }}>
                        <button
                            className="u3d-btn"
                            onClick={() => onAddStructureMass()}
                            disabled={!activeArea}
                            title="Add a real structure with a floorplan, openable in the Render studio"
                        >
                            <Plus size={12} /> Building (with floorplan)
                        </button>
                    </div>
                )}

            </div>

            {/* ---------- bottom status ---------- */}
            <div className="u3d-statusbar">
                {isPlacing && (
                    <>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <ArrowUpFromLine size={13} color="#818cf8" />
                            New height
                            <input
                                type="range" min="4" max="60" step="1"
                                value={buildHeightFeet}
                                onChange={(e) => setBuildHeightFeet(Number(e.target.value))}
                                style={{ width: 90, accentColor: "#6366f1" }}
                            />
                            <strong style={{ color: "#f8fafc" }}>{buildHeightFeet} ft</strong>
                        </span>
                        <span style={{ width: 1, height: 18, background: "rgba(148,163,184,0.25)" }} />
                    </>
                )}

                <span className={`u3d-status-hint ${notice ? "" : ghostValid && isPlacing ? "ready" : ""}`}>
                    {notice || statusHint}
                </span>

                <span className="u3d-kbd-hint">
                    <kbd>V</kbd><kbd>G</kbd><kbd>R</kbd><kbd>S</kbd><kbd>E</kbd>
                    <kbd>1</kbd>–<kbd>6</kbd>
                    <kbd>F</kbd>
                    <kbd>⌫</kbd>
                </span>
            </div>

            {/* ---------- shading switch ---------- */}
            <div className="u3d-segmented" style={{ position: "absolute", right: 16, bottom: 16, zIndex: 20 }}>
                <button
                    className={materialStyle === "solid" ? "active" : ""}
                    onClick={() => setMaterialStyle("solid")}
                    title="Solid"
                >
                    <Eye size={13} /> Solid
                </button>
                <button
                    className={materialStyle === "xray" ? "active" : ""}
                    onClick={() => setMaterialStyle("xray")}
                    title="X-Ray"
                >
                    X-Ray
                </button>
                <button
                    className={materialStyle === "wireframe" ? "active" : ""}
                    onClick={() => setMaterialStyle("wireframe")}
                    title="Wireframe"
                >
                    Wire
                </button>
            </div>

            {!canBuild && (
                <div className="u3d-empty">
                    <BoxIcon size={34} color="#475569" />
                    <strong>Choose a parcel to build on</strong>
                    <span>The parcel is the only buildable surface in this workspace.</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", pointerEvents: "auto", maxWidth: 460 }}>
                        {areas.map((a) => (
                            <button
                                key={a.id}
                                className="u3d-btn"
                                style={{ flex: "0 0 auto" }}
                                onClick={() => onSelectArea?.(a)}
                            >
                                <span
                                    style={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        backgroundColor: a.color || "#3b82f6", display: "inline-block"
                                    }}
                                />
                                {a.name}
                                {a.area_sqft ? ` · ${Math.round(a.area_sqft).toLocaleString()} sq ft` : ""}
                            </button>
                        ))}
                        {areas.length === 0 && (
                            <span>No boundaries yet — draw one in the 2D workspace first.</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
