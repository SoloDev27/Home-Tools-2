import React, { useState, useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import {
    Maximize2, Eye, Compass, Layers, Plus, ArrowUp,
    Sliders, RotateCcw, Box, Home, Trash2, Check, ExternalLink
} from "lucide-react";

// Convert GPS coordinates [lng, lat] to local metric [x, z] in meters relative to parcel centroid
function gpsToMeters(lng, lat, centerLng, centerLat) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(toRad(centerLat));
    const x = (lng - centerLng) * metersPerDegreeLng;
    const z = -(lat - centerLat) * metersPerDegreeLat; // -Z is North in Three.js
    return [x, z];
}

// Extract clean 2D ring of coordinates from Area GeoJSON
function getAreaPolygonPoints(area, centerLng, centerLat) {
    if (!area?.coordinates) return [];
    const ring = Array.isArray(area.coordinates[0]) ? area.coordinates[0] : area.coordinates;
    if (!ring || ring.length < 3) return [];
    return ring.map(([lng, lat]) => gpsToMeters(lng, lat, centerLng, centerLat));
}

// 3D Ground Boundary Line Component
function ParcelBoundary({ points, color = "#6366f1", name = "Parcel Boundary" }) {
    const lineGeo = useMemo(() => {
        if (!points || points.length < 3) return null;
        const pts3D = points.map(([x, z]) => new THREE.Vector3(x, 0.05, z));
        pts3D.push(new THREE.Vector3(points[0][0], 0.05, points[0][1])); // close loop
        return new THREE.BufferGeometry().setFromPoints(pts3D);
    }, [points]);

    const groundShape = useMemo(() => {
        if (!points || points.length < 3) return null;
        const shape = new THREE.Shape();
        points.forEach(([x, z], i) => {
            if (i === 0) shape.moveTo(x, -z);
            else shape.lineTo(x, -z);
        });
        shape.closePath();
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(Math.PI / 2); // lay flat on ground
        return geo;
    }, [points]);

    if (!lineGeo || !groundShape) return null;

    return (
        <group>
            {/* Ground Parcel Tint */}
            <mesh geometry={groundShape} position={[0, 0.01, 0]}>
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.08}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Sharp Architectural Boundary Outline */}
            <line geometry={lineGeo}>
                <lineBasicMaterial color={color} linewidth={3} transparent opacity={0.95} />
            </line>

            {/* Corner Vertex Marker Pillars */}
            {points.map(([x, z], idx) => (
                <mesh key={idx} position={[x, 0.35, z]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.7, 16]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.6} />
                </mesh>
            ))}
        </group>
    );
}

// 3D Divider Cut Line Component on Ground Plane
function Divider3DLine({ coordinates, centerLng, centerLat, color = "#c084fc" }) {
    const lineGeo = useMemo(() => {
        if (!coordinates || coordinates.length < 2) return null;
        const [p1, p2] = coordinates;
        const [x1, z1] = gpsToMeters(p1[0], p1[1], centerLng, centerLat);
        const [x2, z2] = gpsToMeters(p2[0], p2[1], centerLng, centerLat);
        const pts3D = [
            new THREE.Vector3(x1, 0.08, z1),
            new THREE.Vector3(x2, 0.08, z2)
        ];
        return new THREE.BufferGeometry().setFromPoints(pts3D);
    }, [coordinates, centerLng, centerLat]);

    if (!lineGeo) return null;

    return (
        <line geometry={lineGeo}>
            <lineBasicMaterial color={color} linewidth={3} />
        </line>
    );
}

// 3D Sub-Section Ground Slabs & Division Walls (Render Page-style)
function Section3DGround({
    section,
    centerLng,
    centerLat,
    isSelected = false
}) {
    const { groundShape, lineGeo, centerPos } = useMemo(() => {
        const raw = section.coordinates;
        if (!raw) return { groundShape: null, lineGeo: null, centerPos: [0, 0, 0] };
        let ring = raw;
        while (Array.isArray(ring) && ring.length > 0 && Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
            ring = ring[0];
        }
        if (!Array.isArray(ring) || ring.length < 3) return { groundShape: null, lineGeo: null, centerPos: [0, 0, 0] };

        const localPts = ring.map(([lng, lat]) => gpsToMeters(lng, lat, centerLng, centerLat));

        let avgX = 0, avgZ = 0;
        localPts.forEach(([x, z]) => { avgX += x; avgZ += z; });
        avgX /= localPts.length;
        avgZ /= localPts.length;

        const shape = new THREE.Shape();
        localPts.forEach(([x, z], i) => {
            if (i === 0) shape.moveTo(x, -z);
            else shape.lineTo(x, -z);
        });
        shape.closePath();
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(Math.PI / 2);

        const pts3D = localPts.map(([x, z]) => new THREE.Vector3(x, 0.08, z));
        pts3D.push(new THREE.Vector3(localPts[0][0], 0.08, localPts[0][1]));
        const lGeo = new THREE.BufferGeometry().setFromPoints(pts3D);

        return { groundShape: geo, lineGeo: lGeo, centerPos: [avgX, 0.5, avgZ] };
    }, [section.coordinates, centerLng, centerLat]);

    if (!groundShape || !lineGeo) return null;

    const color = section.color || "#8b5cf6";

    return (
        <group>
            {/* Ground section tile / slab */}
            <mesh geometry={groundShape} position={[0, 0.03, 0]}>
                <meshStandardMaterial
                    color={color}
                    roughness={0.4}
                    metalness={0.1}
                    transparent
                    opacity={isSelected ? 0.65 : 0.38}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Division Line Border */}
            <line geometry={lineGeo}>
                <lineBasicMaterial color={color} linewidth={2.5} transparent opacity={0.9} />
            </line>

            {/* 3D Floating Section Label (like Done on Render Page) */}
            <Html position={centerPos} center distanceFactor={28} zIndexRange={[100, 0]}>
                <div
                    className={`unified-3d-section-tag ${isSelected ? 'active' : ''}`}
                    style={{ borderColor: color }}
                >
                    <span>{section.name || "Section"}</span>
                    {section.area_sqft && (
                        <span style={{ fontSize: '9px', opacity: 0.85 }}>
                            • {Math.round(section.area_sqft).toLocaleString()} sq ft
                        </span>
                    )}
                </div>
            </Html>
        </group>
    );
}

// 3D Extruded Building / Footprint Mesh
function ExtrudedStructure({
    item,
    type = "structure", // 'structure' or 'footprint'
    centerLng,
    centerLat,
    isSelected = false,
    extrusionHeight = 3.6, // meters (~12 ft per story)
    materialStyle = "solid",
    onSelect
}) {
    const meshRef = useRef(null);

    // Calculate relative local metric position or shape
    const { geometry, edgesGeometry, position } = useMemo(() => {
        const rawCoords = item.hierarchy?.coordinates || item.coordinates || (type === "footprint" ? item.geometry?.coordinates : null);
        if (rawCoords) {
            let ring = rawCoords;
            if (typeof ring === "string") {
                try { ring = JSON.parse(ring); } catch (e) { ring = []; }
            }
            while (Array.isArray(ring) && ring.length > 0 && Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
                ring = ring[0];
            }
            if (Array.isArray(ring) && ring.length >= 3) {
                const localPts = ring.map(([lng, lat]) => gpsToMeters(lng, lat, centerLng, centerLat));
                const shape = new THREE.Shape();
                localPts.forEach(([x, z], i) => {
                    if (i === 0) shape.moveTo(x, -z);
                    else shape.lineTo(x, -z);
                });
                shape.closePath();

                const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
                    depth: extrusionHeight,
                    bevelEnabled: false
                });
                extrudeGeom.rotateX(Math.PI / 2); // Extrude up on Y axis
                const edges = new THREE.EdgesGeometry(extrudeGeom);
                return { geometry: extrudeGeom, edgesGeometry: edges, position: [0, 0, 0] };
            }
        }

        // Point Structure: Create customizable 3D box mass (default 12m x 9m ~ 40ft x 30ft)
        if (item.lat && item.lng) {
            const [x, z] = gpsToMeters(item.lng, item.lat, centerLng, centerLat);
            const width = item.width_meters || 12;
            const depth = item.length_meters || 9;
            const boxGeom = new THREE.BoxGeometry(width, extrusionHeight, depth);
            const edges = new THREE.EdgesGeometry(boxGeom);
            return {
                geometry: boxGeom,
                edgesGeometry: edges,
                position: [x, extrusionHeight / 2, z]
            };
        }

        return { geometry: null, edgesGeometry: null, position: [0, 0, 0] };
    }, [item, type, centerLng, centerLat, extrusionHeight]);

    if (!geometry) return null;

    const baseColor = isSelected ? "#6366f1" : (item.color || (type === "structure" ? "#3b82f6" : "#10b981"));
    const opacity = materialStyle === "wireframe" ? 0.2 : materialStyle === "xray" ? 0.45 : 0.88;

    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(item); }}>
            {/* Solid Extruded Volume */}
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial
                    color={baseColor}
                    roughness={0.3}
                    metalness={0.15}
                    transparent={opacity < 1}
                    opacity={opacity}
                />
            </mesh>

            {/* Crisp CAD Edges */}
            {edgesGeometry && (
                <lineSegments geometry={edgesGeometry}>
                    <lineBasicMaterial
                        color={isSelected ? "#ffffff" : "#c7d2fe"}
                        linewidth={isSelected ? 3 : 1.5}
                        transparent
                        opacity={0.9}
                    />
                </lineSegments>
            )}

            {/* Selected Indicator Overhead Halo */}
            {isSelected && (
                <Html position={[0, extrusionHeight / 2 + 1.2, 0]} center distanceFactor={25}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1.5px solid #6366f1',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.6)',
                        pointerEvents: 'none'
                    }}>
                        🏢 {item.name || "Selected Structure"} • {Math.round(extrusionHeight * 3.28084)} ft
                    </div>
                </Html>
            )}
        </group>
    );
}

// Camera Controller for Preset Angles
function CameraDirector({ cameraPreset }) {
    const { camera } = useThree();

    useEffect(() => {
        if (cameraPreset === "top") {
            camera.position.set(0, 70, 0.01);
            camera.lookAt(0, 0, 0);
        } else if (cameraPreset === "iso") {
            camera.position.set(45, 45, 45);
            camera.lookAt(0, 0, 0);
        } else if (cameraPreset === "front") {
            camera.position.set(0, 15, 60);
            camera.lookAt(0, 5, 0);
        } else if (cameraPreset === "perspective") {
            camera.position.set(30, 35, 40);
            camera.lookAt(0, 2, 0);
        }
    }, [cameraPreset, camera]);

    return null;
}

export default function Unified3DCanvas({
    activeArea,
    areas = [],
    structures = [],
    features = [],
    selectedSectionId = null,
    onNavigateStudio,
    onAddStructureMass
}) {
    const [selectedObject, setSelectedObject] = useState(null);
    const [extrudeFeet, setExtrudeFeet] = useState(20); // default 2 stories = 20 ft
    const [materialStyle, setMaterialStyle] = useState("solid"); // 'solid', 'xray', 'wireframe'
    const [cameraPreset, setCameraPreset] = useState("perspective"); // 'perspective', 'top', 'iso', 'front'
    const controlsRef = useRef(null);

    // Compute centroid of active area to anchor 3D scene (meters)
    const { centerLng, centerLat } = useMemo(() => {
        if (!activeArea?.coordinates) return { centerLng: -83.5055, centerLat: 32.9075 };
        const ring = Array.isArray(activeArea.coordinates[0]) ? activeArea.coordinates[0] : activeArea.coordinates;
        if (!ring || !ring.length) return { centerLng: -83.5055, centerLat: 32.9075 };
        const sumLng = ring.reduce((sum, p) => sum + p[0], 0);
        const sumLat = ring.reduce((sum, p) => sum + p[1], 0);
        return {
            centerLng: sumLng / ring.length,
            centerLat: sumLat / ring.length
        };
    }, [activeArea]);

    // Active Area Local Polygon Points in meters
    const boundaryPoints = useMemo(() => {
        return getAreaPolygonPoints(activeArea, centerLng, centerLat);
    }, [activeArea, centerLng, centerLat]);

    // Sub-sections from active area and features
    const activeSections = useMemo(() => {
        const list = [];
        if (activeArea?.extra_info?.sections) {
            list.push(...activeArea.extra_info.sections);
        }
        features.forEach(f => {
            if (f.properties_data?.sections) {
                list.push(...f.properties_data.sections);
            }
        });
        return list;
    }, [activeArea, features]);

    // Divider cut lines from active area and features
    const activeDividers = useMemo(() => {
        const list = [];
        if (activeArea?.extra_info?.dividers) {
            list.push(...activeArea.extra_info.dividers);
        }
        features.forEach(f => {
            if (f.properties_data?.dividers) {
                list.push(...f.properties_data.dividers);
            }
        });
        return list;
    }, [activeArea, features]);

    // Footprints & structures belonging to this active parcel
    const parcelStructures = useMemo(() => {
        if (!activeArea) return structures;
        return structures.filter(s => !s.area_id || Number(s.area_id) === Number(activeArea.id));
    }, [structures, activeArea]);

    const parcelFootprints = useMemo(() => {
        if (!activeArea) return features.filter(f => f.type === "footprint");
        return features.filter(f => f.type === "footprint" && (!f.area_id || Number(f.area_id) === Number(activeArea.id)));
    }, [features, activeArea]);

    // Height in meters for Three.js
    const extrusionMeters = extrudeFeet / 3.28084;

    const handleResetView = () => {
        setCameraPreset("perspective");
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#090d16', overflow: 'hidden' }}>
            {/* Blank Canvas Three.js WebGL Scene */}
            <Canvas
                shadows
                camera={{ position: [30, 35, 40], fov: 45, near: 0.1, far: 1000 }}
                style={{ width: '100%', height: '100%', background: '#090d16' }}
            >
                <CameraDirector cameraPreset={cameraPreset} />
                <ambientLight intensity={0.7} />
                <directionalLight
                    position={[30, 60, 30]}
                    intensity={1.4}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />
                <hemisphereLight args={["#ffffff", "#090d16", 0.4]} />

                {/* Infinite Studio Grid on Floor for Clean CAD Depth */}
                <Grid
                    position={[0, 0, 0]}
                    args={[120, 120]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellColor="#1e293b"
                    sectionSize={5}
                    sectionThickness={1}
                    sectionColor="#334155"
                    fadeDistance={100}
                    fadeStrength={1.2}
                    infiniteGrid
                />

                {/* 1. Parcel Boundary Outline on Ground */}
                {boundaryPoints.length >= 3 && (
                    <ParcelBoundary
                        points={boundaryPoints}
                        color={activeArea?.color || "#6366f1"}
                        name={activeArea?.name}
                    />
                )}

                {/* 1b. Sub-Sections on Ground (like Done on Render Page) */}
                {activeSections.map((sec, idx) => (
                    <Section3DGround
                        key={`sec-3d-${sec.id || idx}`}
                        section={sec}
                        centerLng={centerLng}
                        centerLat={centerLat}
                        isSelected={selectedSectionId === sec.id}
                    />
                ))}

                {/* 1c. Divider Cut Lines on Ground Plane */}
                {activeDividers.map((div, idx) => (
                    <Divider3DLine
                        key={`div-3d-${div.id || idx}`}
                        coordinates={div.coordinates}
                        centerLng={centerLng}
                        centerLat={centerLat}
                        color={div.color || "#c084fc"}
                    />
                ))}

                {/* 2. Immediate Extruded Structures */}
                {parcelStructures.map(struct => (
                    <ExtrudedStructure
                        key={`s-${struct.id}`}
                        item={struct}
                        type="structure"
                        centerLng={centerLng}
                        centerLat={centerLat}
                        isSelected={selectedObject?.id === struct.id}
                        extrusionHeight={selectedObject?.id === struct.id ? extrusionMeters : 4.5}
                        materialStyle={materialStyle}
                        onSelect={(item) => setSelectedObject(item)}
                    />
                ))}

                {/* 3. Extruded Foundation Footprints */}
                {parcelFootprints.map(fp => (
                    <ExtrudedStructure
                        key={`fp-${fp.id}`}
                        item={fp}
                        type="footprint"
                        centerLng={centerLng}
                        centerLat={centerLat}
                        isSelected={selectedObject?.id === fp.id}
                        extrusionHeight={selectedObject?.id === fp.id ? extrusionMeters : 1.2}
                        materialStyle={materialStyle}
                        onSelect={(item) => setSelectedObject(item)}
                    />
                ))}

                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below ground plane
                    minDistance={3}
                    maxDistance={250}
                    dampingFactor={0.05}
                />
            </Canvas>

            {/* TOP FLOATING CAD CAMERA & WORKSPACE BAR */}
            <div style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pointerEvents: 'none',
                zIndex: 20
            }}>
                {/* Active Boundary Chip */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    pointerEvents: 'auto',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                }}>
                    <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: activeArea?.color || '#6366f1',
                        boxShadow: `0 0 8px ${activeArea?.color || '#6366f1'}`
                    }} />
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                            {activeArea ? activeArea.name : "Select an Area to Extrude"}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {activeArea?.area_sqft ? `${Math.round(activeArea.area_sqft).toLocaleString()} sq ft • 3D Focus Workspace` : "Isolated Boundary View"}
                        </div>
                    </div>
                </div>

                {/* Camera Preset Toolbar */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '3px',
                    gap: '4px',
                    pointerEvents: 'auto',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                }}>
                    <button
                        onClick={() => setCameraPreset("perspective")}
                        style={{
                            background: cameraPreset === "perspective" ? '#6366f1' : 'transparent',
                            color: cameraPreset === "perspective" ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <Compass size={13} /> 3D Orbit
                    </button>
                    <button
                        onClick={() => setCameraPreset("top")}
                        style={{
                            background: cameraPreset === "top" ? '#6366f1' : 'transparent',
                            color: cameraPreset === "top" ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <Layers size={13} /> Top (Plan)
                    </button>
                    <button
                        onClick={() => setCameraPreset("iso")}
                        style={{
                            background: cameraPreset === "iso" ? '#6366f1' : 'transparent',
                            color: cameraPreset === "iso" ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <Box size={13} /> Isometric
                    </button>
                    <button
                        onClick={handleResetView}
                        title="Reset Camera"
                        style={{
                            background: 'transparent',
                            color: '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            cursor: 'pointer'
                        }}
                    >
                        <RotateCcw size={13} />
                    </button>
                </div>
            </div>

            {/* BOTTOM FLOATING EXTRUSION & BUILDING CONTROLS PANEL */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
                zIndex: 20,
                maxWidth: '90%'
            }}>
                {/* Extrude Height Control */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowUp size={12} color="#6366f1" /> Extrude Height
                        </span>
                        <strong style={{ color: '#ffffff' }}>{extrudeFeet} ft ({Math.round(extrudeFeet / 10)} Stories)</strong>
                    </div>
                    <input
                        type="range"
                        min="6"
                        max="50"
                        step="2"
                        value={extrudeFeet}
                        onChange={(e) => setExtrudeFeet(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                        {[
                            { label: "1 Story", feet: 10 },
                            { label: "2 Stories", feet: 20 },
                            { label: "3 Stories", feet: 30 }
                        ].map(p => (
                            <button
                                key={p.feet}
                                onClick={() => setExtrudeFeet(p.feet)}
                                style={{
                                    flex: 1,
                                    background: extrudeFeet === p.feet ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    padding: '2px 4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ width: '1px', height: '40px', background: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Shading Style */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Shading</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { id: "solid", label: "Solid CAD" },
                            { id: "xray", label: "X-Ray" },
                            { id: "wireframe", label: "Wireframe" }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMaterialStyle(m.id)}
                                style={{
                                    background: materialStyle === m.id ? '#4338ca' : 'rgba(255, 255, 255, 0.08)',
                                    color: materialStyle === m.id ? '#ffffff' : '#cbd5e1',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ width: '1px', height: '40px', background: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedObject && (
                        <button
                            onClick={() => onNavigateStudio?.(selectedObject.id)}
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.5)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <ExternalLink size={14} />
                            Floorplan Studio
                        </button>
                    )}

                    <button
                        onClick={() => onAddStructureMass?.()}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#f8fafc',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Plus size={14} /> Add 3D Mass
                    </button>
                </div>
            </div>
        </div>
    );
}
