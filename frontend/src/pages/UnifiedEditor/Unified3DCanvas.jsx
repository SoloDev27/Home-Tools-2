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
    ExternalLink, Eye, Grid3x3, SlidersHorizontal, Combine, MousePointerClick
} from "lucide-react";
import {
    PALETTE, findPrimitive, createBuildObject, nextName,
    footprintInside, clampIntoPolygon, polygonRadius, readObjects, withObjects,
    cameraPositionFor, updateObject, applyScaleToObject, snap,
    metersToFeet, feetToMeters, SNAP_METERS, CAMERA_PRESETS, azimuthFromPosition,
    groupCenterY
} from "../../functions/buildObjects";
import { localGeometry } from "../../functions/buildGeometry";
import { applyBoolean, ADDON_OPS } from "../../functions/csgOps";
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
    { id: "box", label: "Block", tip: "Block  ·  1", Icon: BoxIcon, blurb: "Rectangular mass" },
    { id: "wall", label: "Wall", tip: "Wall  ·  2", Icon: Minus, blurb: "Thin vertical panel" },
    { id: "column", label: "Column", tip: "Column  ·  3", Icon: Columns3, blurb: "Support post" },
    { id: "cylinder", label: "Cylinder", tip: "Cylinder  ·  4", Icon: CylinderIcon, blurb: "Round mass / tank" },
    { id: "roof", label: "Roof", tip: "Roof  ·  5", Icon: HomeIcon, blurb: "Pitched gable" },
    { id: "slab", label: "Slab", tip: "Slab  ·  6", Icon: SquareIcon, blurb: "Flat pad / deck" }
];

const MENUS = [
    { id: "objects", label: "Objects", Icon: Layers },
    { id: "controls", label: "Controls", Icon: SlidersHorizontal },
    { id: "shapes", label: "Shapes", Icon: BoxIcon },
    { id: "addons", label: "Addons", Icon: Combine }
];

const SHADING = [
    { id: "solid", label: "Solid" },
    { id: "xray", label: "X-Ray" },
    { id: "wireframe", label: "Wire" }
];

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
 * The shape is drawn in XY with v = -z; with rotateX(-PI/2) that maps to world
 * (x, 0, z) and extrudes upward. rotateX(+PI/2) mirrors in Z and pushes the
 * extrusion below ground.
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

// ---------------------------------------------------------------- scene parts

function ParcelGround({ points, color = "#6366f1", onMove, onPlace }) {
    const { slab, outline } = useMemo(() => {
        if (!points || points.length < 3) return { slab: null, outline: null };
        const shape = ringToShape(points);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: FLOOR_DEPTH, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const pts = points.map(([x, z]) => new THREE.Vector3(x, 0.06, z));
        pts.push(new THREE.Vector3(points[0][0], 0.06, points[0][1]));
        return { slab: geo, outline: pts };
    }, [points]);

    // The pad is the placement surface: the ray lands on its top face, and a
    // separate invisible plane behind it would be occluded.
    const downRef = useRef(null);
    const DRAG_SLOP = 6; // px

    if (!slab || !outline) return null;

    return (
        <group>
            <mesh
                geometry={slab}
                position={[0, -FLOOR_DEPTH, 0]}
                receiveShadow
                onPointerDown={(e) => { downRef.current = { x: e.clientX, y: e.clientY }; }}
                onPointerMove={(e) => {
                    if (!onPlace) return;
                    e.stopPropagation();
                    onMove?.(e.point.x, e.point.z);
                }}
                onPointerOut={() => { downRef.current = null; onMove?.(null, null); }}
                onClick={(e) => {
                    if (!onPlace) return;
                    e.stopPropagation();
                    const down = downRef.current;
                    downRef.current = null;
                    if (down) {
                        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
                        if (moved > DRAG_SLOP) return; // an orbit/pan, not a click
                    }
                    onPlace(e.point.x, e.point.z);
                }}
            >
                <meshStandardMaterial color="#0e1a2e" roughness={0.95} metalness={0.02} />
            </mesh>

            <Line points={outline} color={color} lineWidth={3} transparent opacity={0.95} />

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
    const { geometry, position, edges } = useMemo(() => {
        let geom = null;
        let pos = [0, 0, 0];
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
                geom = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
                geom.rotateX(-Math.PI / 2);
            }
        }
        if (!geom && item.lat && item.lng) {
            const [x, z] = gpsToMeters(item.lng, item.lat, centerLng, centerLat);
            const h = item.height_meters || 3.6;
            geom = new THREE.BoxGeometry(12, h, 9);
            pos = [x, h / 2, z];
        }
        return { geometry: geom, position: pos, edges: geom ? new THREE.EdgesGeometry(geom) : null };
    }, [item, centerLng, centerLat]);

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

function BuildObjectMesh({ obj, isSelected, materialStyle, onSelect, onReady }) {
    const groupRef = useRef();
    const geometry = useMemo(() => localGeometry(obj), [obj]);
    useEffect(() => () => geometry.dispose(), [geometry]);

    useEffect(() => {
        onReady(obj.id, groupRef.current);
        return () => onReady(obj.id, null);
    }, [obj.id, onReady]);

    const opacity = materialStyle === "wireframe" ? 0.16
        : materialStyle === "xray" ? 0.45
            : 0.92;

    return (
        <group
            ref={groupRef}
            position={[obj.x, groupCenterY(obj), obj.z]}
            rotation={[0, obj.rot || 0, 0]}
        >
            <mesh
                geometry={geometry}
                castShadow
                receiveShadow
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(obj.id, e.nativeEvent?.shiftKey || e.nativeEvent?.metaKey);
                }}
            >
                <meshStandardMaterial
                    color={isSelected ? "#c7d2fe" : (obj.color || "#93c5fd")}
                    roughness={0.38}
                    metalness={0.12}
                    transparent={opacity < 1}
                    opacity={opacity}
                    wireframe={materialStyle === "wireframe"}
                />
                <Edges threshold={15} color={isSelected ? "#ffffff" : "#c7d2fe"} />
            </mesh>
        </group>
    );
}

function GhostPreview({ obj, valid }) {
    const color = valid ? "#4ade80" : "#f87171";
    const geometry = useMemo(() => localGeometry(obj), [obj]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return (
        <group position={[obj.x, groupCenterY(obj), obj.z]} rotation={[0, obj.rot || 0, 0]}>
            <mesh geometry={geometry}>
                <meshStandardMaterial color={color} transparent opacity={0.4} depthWrite={false} />
                <Edges threshold={15} color={color} />
            </mesh>
        </group>
    );
}

/**
 * Extrude handle, anchored to the TOP face so dragging it raises the shape
 * instead of moving the whole object.
 */
function TopExtrudeGizmo({ obj, onLive, onCommit }) {
    const pivot = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        pivot.position.set(obj.x, (obj.y || 0) + obj.h, obj.z);
    }, [pivot, obj.x, obj.y, obj.h, obj.z]);

    return (
        <>
            <primitive object={pivot} />
            <TransformControls
                object={pivot}
                mode="translate"
                showX={false}
                showZ={false}
                size={0.85}
                translationSnap={SNAP_METERS}
                onObjectChange={() => onLive(Math.max(0.2, pivot.position.y - (obj.y || 0)))}
                onMouseUp={onCommit}
            />
        </>
    );
}

/** Frames the camera to the parcel; reframes on preset change or fit request. */
function CameraRig({ preset, radius, azimuth, fitNonce, controlsRef }) {
    const { camera } = useThree();
    useEffect(() => {
        const [x, y, z] = cameraPositionFor(preset, radius, azimuth);
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    }, [preset, radius, azimuth, fitNonce, camera, controlsRef]);
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
    const [menu, setMenu] = useState("objects");
    const [tool, setTool] = useState("select");
    const [materialStyle, setMaterialStyle] = useState("solid");
    const [cameraPreset, setCameraPreset] = useState("orbit");
    const [frontAzimuth, setFrontAzimuth] = useState(0);
    const [fitNonce, setFitNonce] = useState(0);
    const [showGrid, setShowGrid] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [gizmoTarget, setGizmoTarget] = useState(null);
    const [hoverPoint, setHoverPoint] = useState(null);
    const [buildHeightFeet, setBuildHeightFeet] = useState(12);
    const [notice, setNotice] = useState(null);
    const controlsRef = useRef(null);
    const objectRefs = useRef({});
    const noticeTimer = useRef(null);

    const primaryId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;

    // ---- scene anchoring ----
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
    const objectsRef = useRef(objects);
    useEffect(() => { objectsRef.current = objects; }, [objects]);

    useEffect(() => {
        const restored = readObjects(activeArea);
        objectsRef.current = restored;
        setObjects(restored);
        setSelectedIds([]);
        setSelectedStructure(null);
        // Resync only when the parcel changes; object edits stay local until committed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeArea?.id]);

    const commit = useCallback((next) => {
        objectsRef.current = next;
        setObjects(next);
        if (activeArea && onUpdateArea) {
            onUpdateArea(activeArea.id, { extra_info: withObjects(activeArea, next) });
        }
    }, [activeArea, onUpdateArea]);

    const selected = useMemo(
        () => objects.find((o) => o.id === primaryId) || null,
        [objects, primaryId]
    );
    const selectedObjects = useMemo(
        () => selectedIds.map((id) => objects.find((o) => o.id === id)).filter(Boolean),
        [objects, selectedIds]
    );

    const selectObject = useCallback((id, additive = false) => {
        setSelectedStructure(null);
        setSelectedIds((prev) => {
            if (!additive) return [id];
            return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        });
    }, []);

    const registerObject = useCallback((id, node) => {
        if (node) objectRefs.current[id] = node;
        else delete objectRefs.current[id];
    }, []);

    useEffect(() => {
        setGizmoTarget(primaryId ? objectRefs.current[primaryId] || null : null);
    }, [primaryId, objects, tool]);

    const flash = useCallback((msg) => {
        setNotice(msg);
        window.clearTimeout(noticeTimer.current);
        noticeTimer.current = window.setTimeout(() => setNotice(null), 2600);
    }, []);
    useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

    // A parcel has no inherent front, so "Front" only means something once the
    // user points at it. Capture the current viewing direction as front.
    const setFrontFromView = useCallback(() => {
        const cam = controlsRef.current?.object;
        if (!cam) return;
        setFrontAzimuth(azimuthFromPosition(cam.position));
        setCameraPreset("front");
        flash("Front set to this viewing direction.");
    }, [flash]);

    const isPlacing = BUILD_TOOLS.some((t) => t.id === tool);

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
        commit([...objects, candidate]);
        selectObject(candidate.id);
        flash(`Placed ${candidate.name}. Click again to add another, or press V to select.`);
    };

    // The gizmo is attached to the object's group, whose origin is the centre,
    // so a translation has to be converted back to a base elevation.
    const handleGizmoCommit = useCallback(() => {
        const target = gizmoTarget;
        const obj = objects.find((o) => o.id === primaryId);
        if (!target || !obj) return;

        if (tool === "move") {
            let candidate = {
                ...obj,
                x: snap(target.position.x),
                z: snap(target.position.z),
                y: Math.max(0, snap(target.position.y - obj.h / 2))
            };
            candidate = clampIntoPolygon(candidate, boundaryPoints);
            commit(updateObject(objects, primaryId, { x: candidate.x, z: candidate.z, y: candidate.y }));
            target.position.set(candidate.x, groupCenterY(candidate), candidate.z);
        } else if (tool === "rotate") {
            commit(updateObject(objects, primaryId, { rot: target.rotation.y }));
        } else if (tool === "scale") {
            const scaled = applyScaleToObject(obj, target.scale);
            target.scale.set(1, 1, 1);
            const clamped = clampIntoPolygon(
                { ...obj, w: scaled.w, d: scaled.d, h: scaled.h },
                boundaryPoints
            );
            commit(updateObject(objects, primaryId, {
                w: scaled.w, d: scaled.d, h: scaled.h, x: clamped.x, z: clamped.z
            }));
        }
    }, [gizmoTarget, objects, primaryId, tool, boundaryPoints, commit]);

    const setObjectLocal = useCallback((patch) => {
        const next = updateObject(objectsRef.current, primaryId, patch);
        objectsRef.current = next;
        setObjects(next);
    }, [primaryId]);

    const handleExtrudeLive = useCallback((h) => {
        setObjectLocal({ h });
    }, [setObjectLocal]);
    const handleExtrudeCommit = useCallback(() => {
        commit(objectsRef.current);
    }, [commit]);

    const handleDelete = useCallback((id) => {
        const ids = id ? [id] : selectedIds;
        if (!ids.length) return;
        commit(objectsRef.current.filter((o) => !ids.includes(o.id)));
        setSelectedIds([]);
    }, [selectedIds, commit]);

    const handleDuplicate = useCallback(() => {
        if (!selectedObjects.length || !activeArea) return;
        const copies = selectedObjects.map((src) => {
            const placed = createBuildObject(src.kind === "mesh" ? "box" : src.kind, snap(src.x + 1), snap(src.z + 1), src.h);
            return clampIntoPolygon({ ...placed, ...src, id: placed.id, x: snap(src.x + 1), z: snap(src.z + 1), name: `${src.name} copy` }, boundaryPoints);
        });
        commit([...objectsRef.current, ...copies]);
        setSelectedIds(copies.map((c) => c.id));
    }, [selectedObjects, boundaryPoints, commit, activeArea]);

    const patchTimer = useRef(null);
    useEffect(() => () => window.clearTimeout(patchTimer.current), []);

    const patchSelected = useCallback((patch) => {
        if (!primaryId) return;
        const next = updateObject(objectsRef.current, primaryId, patch);
        objectsRef.current = next;
        setObjects(next);
        window.clearTimeout(patchTimer.current);
        patchTimer.current = window.setTimeout(() => {
            if (activeArea && onUpdateArea) {
                onUpdateArea(activeArea.id, { extra_info: withObjects(activeArea, objectsRef.current) });
            }
        }, 450);
    }, [primaryId, activeArea, onUpdateArea]);

    const runBoolean = useCallback((op) => {
        if (selectedObjects.length < 2) {
            flash("Select two or more shapes first (Shift-click).");
            return;
        }
        const opLabel = ADDON_OPS.find((o) => o.id === op)?.label || op;
        const result = applyBoolean(op, selectedObjects, {
            name: `${opLabel} result`,
            color: selectedObjects[0].color || "#93c5fd"
        });
        if (!result) {
            flash(`${opLabel} could not be computed for those shapes.`);
            return;
        }
        const ids = selectedObjects.map((o) => o.id);
        commit([...objectsRef.current.filter((o) => !ids.includes(o.id)), result]);
        setSelectedIds([result.id]);
        flash(`${opLabel} applied to ${ids.length} shapes.`);
    }, [selectedObjects, commit, flash]);

    // ---- keyboard shortcuts ----
    useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) return;
            const key = e.key.toLowerCase();
            if (e.key === "Escape") { setSelectedIds([]); setSelectedStructure(null); setTool("select"); return; }
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
            : tool === "scale" ? "scale"
                : null;

    const activeColor = activeArea?.color || "#6366f1";
    const canBuild = Boolean(activeArea) && boundaryPoints.length >= 3;

    const statusHint = !activeArea
        ? "Choose a parcel to build on."
        : isPlacing
            ? (hoverPoint && !ghostValid
                ? "Outside the buildable parcel — move inside the boundary."
                : `Click inside the parcel to place a ${findPrimitive(tool)?.label.toLowerCase()}.`)
            : tool === "select"
                ? "Click to select, Shift-click to add. Left-drag orbits, right-drag pans, the wheel zooms."
                : `Drag the gizmo to ${tool} the selected object.`;

    return (
        <div className="u3d-root">
            {/* ---------------- left menu + panel ---------------- */}
            <aside className="unified-sidebar u3d-menu">
                <ul className="unified-icon-strip">
                    {MENUS.map(({ id, label, Icon }) => (
                        <li
                            key={id}
                            className={`unified-icon-tab ${menu === id ? "active" : ""}`}
                            onClick={() => setMenu(id)}
                            title={label}
                        >
                            <Icon size={20} />
                            <span className="unified-icon-tab-label">{label}</span>
                        </li>
                    ))}
                </ul>

                <div className="unified-sidebar-panel">
                    <div className="unified-panel-header">
                        <div className="u3d-panel-title-row">
                            {menu === "objects" && <Layers size={15} color="#8b5cf6" />}
                            {menu === "controls" && <SlidersHorizontal size={15} color="#06b6d4" />}
                            {menu === "shapes" && <BoxIcon size={15} color="#6366f1" />}
                            {menu === "addons" && <Combine size={15} color="#f59e0b" />}
                            <h2 className="unified-panel-title">
                                {MENUS.find((m) => m.id === menu)?.label}
                            </h2>
                        </div>
                        <span className={`unified-step-badge ${canBuild ? "ready" : "locked"}`}>
                            {objects.length} {objects.length === 1 ? "object" : "objects"}
                        </span>
                    </div>

                    {/* ---- OBJECTS ---- */}
                    {menu === "objects" && (
                        <>
                            <div className="unified-sidebar-section">
                                <div className="unified-step-header">
                                    <span className="unified-step-title">Tools</span>
                                </div>
                                <div className="unified-tool-grid">
                                    {TRANSFORM_TOOLS.map(({ id, label, Icon, tip }) => (
                                        <button
                                            key={id}
                                            className={`unified-cad-tool ${tool === id ? "active" : ""}`}
                                            onClick={() => setTool(id)}
                                            title={tip}
                                        >
                                            <Icon size={13} />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                    <button
                                        className="unified-cad-tool"
                                        onClick={() => handleDelete()}
                                        disabled={!selectedIds.length}
                                        title="Delete selected  ·  ⌫"
                                        style={{ opacity: selectedIds.length ? 1 : 0.45 }}
                                    >
                                        <Trash2 size={13} color="#f87171" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>

                            {selectedStructure ? (
                                <div className="unified-sidebar-section">
                                    <div className="unified-step-header">
                                        <span className="unified-step-title">Building</span>
                                    </div>
                                    <div className="u3d-section-title">
                                        {selectedStructure.name}
                                    </div>
                                    <div className="u3d-hint">
                                        A real building with a floorplan. Open it in the Render studio
                                        to edit floors, rooms and objects.
                                    </div>
                                    {onNavigateStudio && (
                                        <button className="u3d-btn primary" onClick={() => onNavigateStudio(selectedStructure.id)}>
                                            <ExternalLink size={12} /> Floorplan Studio
                                        </button>
                                    )}
                                </div>
                            ) : selected ? (
                                <div className="unified-sidebar-section">
                                    <div className="unified-step-header">
                                        <span className="unified-step-title">
                                            {selectedIds.length > 1 ? `${selectedIds.length} selected` : "Selected Object"}
                                        </span>
                                        <button className="u3d-link" onClick={() => setSelectedIds([])}>Deselect</button>
                                    </div>

                                    <div className="u3d-field">
                                        <label>Name</label>
                                        <input type="text" value={selected.name || ""}
                                            onChange={(e) => patchSelected({ name: e.target.value })} />
                                    </div>

                                    <div className="u3d-field">
                                        <label>Dimensions (ft · W / H / D)</label>
                                        <div className="u3d-dim-grid">
                                            <input type="number" step="0.5" min="0.5"
                                                value={Math.round(metersToFeet(selected.w) * 10) / 10}
                                                onChange={(e) => patchSelected({ w: feetToMeters(Number(e.target.value)) })} />
                                            <input type="number" step="0.5" min="0.5"
                                                value={Math.round(metersToFeet(selected.h) * 10) / 10}
                                                onChange={(e) => patchSelected({ h: feetToMeters(Number(e.target.value)) })} />
                                            <input type="number" step="0.5" min="0.5"
                                                value={Math.round(metersToFeet(selected.d) * 10) / 10}
                                                onChange={(e) => patchSelected({ d: feetToMeters(Number(e.target.value)) })} />
                                        </div>
                                    </div>

                                    <div className="u3d-field">
                                        <label>Rotation · {Math.round(((selected.rot || 0) * 180) / Math.PI)}°</label>
                                        <input type="range" min="-180" max="180" step="5"
                                            value={Math.round(((selected.rot || 0) * 180) / Math.PI)}
                                            onChange={(e) => patchSelected({ rot: (Number(e.target.value) * Math.PI) / 180 })} />
                                    </div>

                                    <div className="u3d-field">
                                        <label>Colour</label>
                                        <div className="u3d-swatches">
                                            {PALETTE.map((c) => (
                                                <span key={c}
                                                    className={`u3d-swatch ${selected.color === c ? "active" : ""}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => patchSelected({ color: c })} />
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
                                </div>
                            ) : (
                                <div className="unified-sidebar-section">
                                    <div className="unified-step-header">
                                        <span className="unified-step-title">Nothing selected</span>
                                    </div>
                                    <div className="u3d-hint">
                                        {isPlacing
                                            ? "Move over the parcel and click to place."
                                            : "Click a shape on the canvas or pick one below, then use Tools to move, rotate, extrude or scale it."}
                                    </div>
                                </div>
                            )}

                            <div className="unified-sidebar-section u3d-flex">
                                <div className="unified-step-header">
                                    <span className="unified-step-title">Objects ({objects.length})</span>
                                    <span className="u3d-hint">Shift-click to multi-select</span>
                                </div>
                                {objects.length === 0 ? (
                                    <div className="u3d-hint">
                                        No shapes yet. Open <strong>Shapes</strong> to place one.
                                    </div>
                                ) : (
                                    <div className="u3d-object-list">
                                        {objects.map((o) => (
                                            <button
                                                key={o.id}
                                                className={`u3d-object-row ${selectedIds.includes(o.id) ? "active" : ""}`}
                                                onClick={(e) => selectObject(o.id, e.shiftKey || e.metaKey)}
                                                title="Select this object (Shift to add)"
                                            >
                                                <span className="u3d-object-name">{o.name || o.kind}</span>
                                                <span className="u3d-object-meta">
                                                    {Math.round(metersToFeet(o.w))}×{Math.round(metersToFeet(o.d))}×{Math.round(metersToFeet(o.h))} ft
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {onAddStructureMass && (
                                <div className="unified-sidebar-section">
                                    <button className="u3d-btn" onClick={() => onAddStructureMass()} disabled={!activeArea}>
                                        <Plus size={12} /> Building (with floorplan)
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* ---- CONTROLS ---- */}
                    {menu === "controls" && (
                        <>
                            <div className="unified-sidebar-section">
                                <div className="unified-step-header">
                                    <span className="unified-step-title">Camera</span>
                                </div>
                                <div className="unified-tool-grid">
                                    {CAMERA_PRESETS.map((p) => (
                                        <button
                                            key={p.id}
                                            className={`unified-cad-tool ${cameraPreset === p.id ? "active" : ""}`}
                                            onClick={() => setCameraPreset(p.id)}
                                            title={`${p.label} view`}
                                        >
                                            <Compass size={13} />
                                            <span>{p.label}</span>
                                        </button>
                                    ))}
                                    <button className="unified-cad-tool" onClick={setFrontFromView}
                                        title="Set Front to the current view — the Front elevation then looks from here">
                                        <MousePointerClick size={13} />
                                        <span>Set Front</span>
                                    </button>
                                    <button className="unified-cad-tool" onClick={() => setFitNonce((n) => n + 1)}
                                        title="Frame the parcel  ·  F">
                                        <Maximize2 size={13} />
                                        <span>Fit</span>
                                    </button>
                                </div>
                                <div className="u3d-hint">
                                    Front is measured from the direction you set, so elevations look the
                                    way you expect. Left-drag orbits, right-drag pans, the wheel zooms.
                                </div>
                            </div>

                            <div className="unified-sidebar-section">
                                <div className="unified-step-header">
                                    <span className="unified-step-title">Display</span>
                                </div>
                                <div className="unified-tool-grid">
                                    {SHADING.map((s) => (
                                        <button
                                            key={s.id}
                                            className={`unified-cad-tool ${materialStyle === s.id ? "active" : ""}`}
                                            onClick={() => setMaterialStyle(s.id)}
                                            title={`${s.label} shading`}
                                        >
                                            <Eye size={13} />
                                            <span>{s.label}</span>
                                        </button>
                                    ))}
                                    <button
                                        className={`unified-cad-tool ${showGrid ? "active" : ""}`}
                                        onClick={() => setShowGrid((v) => !v)}
                                        title="Toggle the measurement grid"
                                    >
                                        <Grid3x3 size={13} />
                                        <span>Grid</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ---- SHAPES ---- */}
                    {menu === "shapes" && (
                        <div className="unified-sidebar-section">
                            <div className="unified-step-header">
                                <span className="unified-step-title">Primitives</span>
                            </div>
                            <div className="unified-tool-grid">
                                {BUILD_TOOLS.map(({ id, label, tip, Icon, blurb }) => (
                                    <button
                                        key={id}
                                        className={`unified-cad-tool ${tool === id ? "active" : ""}`}
                                        onClick={() => setTool(id)}
                                        disabled={!canBuild}
                                        title={canBuild ? `${tip} — ${blurb}` : "Select a parcel first"}
                                        style={{ opacity: canBuild ? 1 : 0.45 }}
                                    >
                                        <Icon size={13} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="u3d-field u3d-field--offset">
                                <label>New shape height · {buildHeightFeet} ft</label>
                                <input
                                    type="range" min="4" max="60" step="1"
                                    value={buildHeightFeet}
                                    onChange={(e) => setBuildHeightFeet(Number(e.target.value))}
                                />
                            </div>

                            <div className="u3d-hint">
                                {!canBuild
                                    ? "Choose a parcel to build on."
                                    : isPlacing
                                        ? "Click inside the parcel to place. The ghost turns green where the footprint fits."
                                        : "Pick a primitive, then click the parcel. Press 1–6 for quick access."}
                            </div>
                        </div>
                    )}

                    {/* ---- ADDONS ---- */}
                    {menu === "addons" && (
                        <>
                            <div className="unified-sidebar-section">
                                <div className="unified-step-header">
                                    <span className="unified-step-title">Operands</span>
                                    <span className="u3d-inline-row">
                                        <button className="u3d-link" onClick={() => setSelectedIds(objects.map((o) => o.id))}>
                                            All
                                        </button>
                                        <button className="u3d-link" onClick={() => setSelectedIds([])}>
                                            Clear
                                        </button>
                                    </span>
                                </div>
                                {objects.length === 0 ? (
                                    <div className="u3d-hint">No shapes yet. Place some in the Shapes menu.</div>
                                ) : (
                                    <div className="u3d-object-list">
                                        {objects.map((o) => (
                                            <label key={o.id} className="u3d-check-row">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(o.id)}
                                                    onChange={() => selectObject(o.id, true)}
                                                />
                                                <span className="u3d-object-name">{o.name || o.kind}</span>
                                                <span className="u3d-object-meta">{o.kind}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="unified-sidebar-section">
                                <div className="unified-step-header">
                                    <span className="unified-step-title">Boolean Operations</span>
                                    <span className="u3d-hint">{selectedIds.length} selected</span>
                                </div>
                                <div className="unified-tool-grid">
                                    {ADDON_OPS.map((op) => (
                                        <button
                                            key={op.id}
                                            className="unified-cad-tool"
                                            onClick={() => runBoolean(op.id)}
                                            disabled={selectedIds.length < 2}
                                            title={selectedIds.length < 2 ? "Select two or more shapes" : op.hint}
                                            style={{ opacity: selectedIds.length < 2 ? 0.45 : 1 }}
                                        >
                                            <Combine size={13} color="#f59e0b" />
                                            <span>{op.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="u3d-hint">
                                    Select two or more shapes (Shift-click on the canvas or in the
                                    Objects list), then combine them. Union merges, Subtract cuts the
                                    others out of the first, Intersect keeps the overlap.
                                </div>
                            </div>

                            <div className="unified-sidebar-section">
                                <div className="unified-step-header">
                                    <span className="unified-step-title">Quick Actions</span>
                                </div>
                                <div className="unified-tool-grid">
                                    <button className="unified-cad-tool" onClick={handleDuplicate}
                                        disabled={!selectedIds.length}
                                        style={{ opacity: selectedIds.length ? 1 : 0.45 }}>
                                        <Copy size={13} />
                                        <span>Duplicate</span>
                                    </button>
                                    <button className="unified-cad-tool" onClick={() => handleDelete()}
                                        disabled={!selectedIds.length}
                                        style={{ opacity: selectedIds.length ? 1 : 0.45 }}>
                                        <Trash2 size={13} color="#f87171" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* ---------------- 3D stage ---------------- */}
            <div className="u3d-stage">
                <Canvas
                    className="u3d-canvas"
                    shadows
                    camera={{ position: [40, 30, 50], fov: 45, near: 0.1, far: 2000 }}
                    onPointerMissed={() => { if (!isPlacing) { setSelectedIds([]); setSelectedStructure(null); } }}
                >
                    <CameraRig
                        preset={cameraPreset}
                        radius={radius}
                        azimuth={frontAzimuth}
                        fitNonce={fitNonce}
                        controlsRef={controlsRef}
                    />

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

                    {/* Sits just above the pad so the grid is legible on the
                        buildable surface, not only on the ground around it. */}
                    {showGrid && (
                        <Grid
                            position={[0, 0.012, 0]}
                            args={[radius * 6, radius * 6]}
                            cellSize={1}
                            cellThickness={0.6}
                            cellColor="#22304a"
                            sectionSize={5}
                            sectionThickness={1.2}
                            sectionColor="#3b5a86"
                            fadeDistance={radius * 8}
                            fadeStrength={1.4}
                            infiniteGrid
                        />
                    )}

                    {canBuild && (
                        <ParcelGround
                            points={boundaryPoints}
                            color={activeColor}
                            onMove={isPlacing ? (x, z) => setHoverPoint(x == null ? null : [x, z]) : undefined}
                            onPlace={isPlacing ? (x, z) => placeAt(x, z) : undefined}
                        />
                    )}

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
                            onSelect={(item) => { setSelectedIds([]); setSelectedStructure(item); }}
                        />
                    ))}

                    {objects.map((obj) => (
                        <BuildObjectMesh
                            key={obj.id}
                            obj={obj}
                            isSelected={selectedIds.includes(obj.id)}
                            materialStyle={materialStyle}
                            onSelect={selectObject}
                            onReady={registerObject}
                        />
                    ))}

                    {ghost && <GhostPreview obj={ghost} valid={ghostValid} />}

                    {gizmoTarget && transformMode && (
                        <TransformControls
                            object={gizmoTarget}
                            mode={transformMode}
                            size={0.85}
                            showX={tool !== "rotate"}
                            showZ={tool !== "rotate"}
                            translationSnap={SNAP_METERS}
                            rotationSnap={Math.PI / 12}
                            scaleSnap={0.05}
                            onMouseUp={handleGizmoCommit}
                        />
                    )}

                    {tool === "extrude" && selected && (
                        <TopExtrudeGizmo
                            obj={selected}
                            onLive={handleExtrudeLive}
                            onCommit={handleExtrudeCommit}
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

                {/* top bar: parcel identity + quick framing */}
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
                        <button onClick={() => setFitNonce((n) => n + 1)} title="Frame the parcel  ·  F">
                            <Maximize2 size={13} /> Fit
                        </button>
                        <button
                            className={showGrid ? "active" : ""}
                            onClick={() => setShowGrid((v) => !v)}
                            title="Toggle the measurement grid"
                        >
                            <Grid3x3 size={13} /> Grid
                        </button>
                    </div>
                </div>

                {/* bottom status */}
                <div className="u3d-statusbar">
                    <span className={`u3d-status-hint ${notice ? "" : ghostValid && isPlacing ? "ready" : ""}`}>
                        {notice || statusHint}
                    </span>
                    <span className="u3d-kbd-hint">
                        <kbd>V</kbd><kbd>G</kbd><kbd>R</kbd><kbd>S</kbd><kbd>E</kbd>
                        <kbd>1</kbd>–<kbd>6</kbd>
                        <kbd>F</kbd>
                        <kbd>⇧</kbd>+click
                        <kbd>⌫</kbd>
                    </span>
                </div>

                {!canBuild && (
                    <div className="u3d-empty">
                        <BoxIcon size={34} color="#475569" />
                        <strong>Choose a parcel to build on</strong>
                        <span>The parcel is the only buildable surface in this workspace.</span>
                        <div className="u3d-empty-areas">
                            {areas.map((a) => (
                                <button key={a.id} className="u3d-btn u3d-btn--fixed"
                                    onClick={() => onSelectArea?.(a)}>
                                    <span className="u3d-area-dot" style={{ backgroundColor: a.color || "#3b82f6" }} />
                                    {a.name}
                                    {a.area_sqft ? ` · ${Math.round(a.area_sqft).toLocaleString()} sq ft` : ""}
                                </button>
                            ))}
                            {areas.length === 0 && <span>No boundaries yet — draw one in the 2D workspace first.</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
