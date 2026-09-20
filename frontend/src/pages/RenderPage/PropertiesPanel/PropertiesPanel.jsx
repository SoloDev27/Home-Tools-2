import { useState, useEffect, useRef, useCallback } from "react";
import ObjectProperties from "./ObjectProperties";
import "./PropertiesPanel.css";
import { getOutlineArea, getOutlinePerimeter, metersToUnit, metersToAreaUnit } from "../../../functions/outlineValidation";

const ROOM_TYPES = [
    { value: "bedroom", label: "Bedroom" },
    { value: "bathroom", label: "Bathroom" },
    { value: "kitchen", label: "Kitchen" },
    { value: "living_room", label: "Living Room" },
    { value: "dining_room", label: "Dining Room" },
    { value: "office", label: "Office" },
    { value: "garage", label: "Garage" },
    { value: "closet", label: "Closet" },
    { value: "hallway", label: "Hallway" },
    { value: "other", label: "Other" },
];

export default function PropertiesPanel({
    stage, selectedShape, updateShape,
    floors, elements, sectionElements = [], activeFloorId, selectedLevel, onSelectLevel,
    onSelectFloor, onSelectShape,
    addFloor, addRoomToFloor,
    deleteElement, moveElement, outlines, addLevel,
    objects, selectedObjectId, onSelectObject, onUpdateObject,
    vertexMode = false, selectedVertexIndex = -1, onSelectVertex,
    multiSelectIds = [],
    validationResults = { isValid: true, warnings: [], measurements: [] },
    showMeasurements = false,
    unit = "metric",
    sectionWarnings = [],
    objectValidationResults = { isValid: true, warnings: [] },
    liveMeasurements = null,
    updateRoomType,
    mapRef,
}) {
    const containerRef = useRef(null);
    const [splitHeight, setSplitHeight] = useState(250);
    const [isDragging, setIsDragging] = useState(false);
    const [expandedFloors, setExpandedFloors] = useState({});

    const toggleFloor = (fid) => setExpandedFloors(prev => ({ ...prev, [fid]: !(prev[fid] ?? true) }));
    const toggleLevel = (lvl) => setExpandedFloors(prev => ({ ...prev, [`level-${lvl}`]: !(prev[`level-${lvl}`] ?? true) }));

    const flyToElement = useCallback((element) => {
        if (!mapRef?.current || !element) return;
        const map = mapRef.current;

        try {
            let center = null;

            const isValidLngLat = (lng, lat) => (
                Number.isFinite(lng)
                && Number.isFinite(lat)
                && Math.abs(lng) <= 180
                && Math.abs(lat) <= 90
                && Math.abs(lng) + Math.abs(lat) > 0.000001
            );

            const lng = Number(element.lng);
            const lat = Number(element.lat);
            if (isValidLngLat(lng, lat)) {
                center = [lng, lat];
            } else if (Array.isArray(element.pointsGeo) && element.pointsGeo.length >= 2) {
                const geoPoints = element.pointsGeo
                    .map(point => [Number(point?.[1]), Number(point?.[0])])
                    .filter(([pointLng, pointLat]) => isValidLngLat(pointLng, pointLat));
                if (geoPoints.length > 0) {
                    center = [
                        geoPoints.reduce((sum, point) => sum + point[0], 0) / geoPoints.length,
                        geoPoints.reduce((sum, point) => sum + point[1], 0) / geoPoints.length,
                    ];
                }
            } else if (element.x != null && element.y != null && element.width && element.height) {
                const cx = element.x + element.width / 2;
                const cy = element.y + element.height / 2;
                const unprojected = map.unproject([cx, cy]);
                if (isValidLngLat(unprojected.lng, unprojected.lat)) {
                    center = [unprojected.lng, unprojected.lat];
                }
            }

            if (center) {
                const currentCenter = map.getCenter();
                const currentZoom = map.getZoom();
                const maxZoom = typeof map.getMaxZoom === "function" ? map.getMaxZoom() : 22;
                const minZoom = typeof map.getMinZoom === "function" ? map.getMinZoom() : 0;
                const zoom = Math.max(minZoom, Math.min(maxZoom, Math.max(currentZoom, 19)));

                if (Math.abs(center[0] - currentCenter.lng) < 0.0001 && Math.abs(center[1] - currentCenter.lat) < 0.0001 && Math.abs(zoom - currentZoom) < 0.5) {
                    return;
                }

                map.stop?.();
                map.flyTo({
                    center,
                    zoom,
                    duration: 900,
                    curve: 1.25,
                    easing: (t) => t * (2 - t),
                    essential: true,
                });
            }
        } catch (e) {
            console.error("flyTo failed:", e);
        }
    }, [mapRef]);

    const handleMouseDown = useCallback((e) => { setIsDragging(true); e.preventDefault(); }, []);

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            setSplitHeight(Math.max(120, Math.min(relY, rect.height - 120)));
        };
        const onUp = () => setIsDragging(false);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    }, [isDragging]);

    const s = selectedShape;
    const update = (changes) => s && updateShape({ ...s, ...changes });
    const roundSize = (value) => Math.round((Number(value) || 0) * 100) / 100;
    const roundCoordinate = (value) => Math.round((Number(value) || 0) * 1000000) / 1000000;

    const roomColors = {
        bedroom: "#6366f1", bathroom: "#22c55e", kitchen: "#f59e0b",
        living_room: "#06b6d4", dining_room: "#a855f7", office: "#ec4899",
        garage: "#78716c", closet: "#a1a1aa", hallway: "#d4d4d8", other: "#888",
    };
    const elementLabel = (el) => {
        const t = el.type || "shape";
        if (t === "room") return (el.roomType || "room").replace("_", " ");
        if (t === "wall") return el.wallType === "wall_square" ? "Full Wall" : "Section Wall";
        if (t === "opening") return el.openingType === "window" ? "Window" : "Door";
        if (t === "divider_line") return "Divider Line";
        if (el.name) return el.name;
        return t;
    };
    const outlineSummary = (outline) => {
        const sectionEls = sectionElements || [];
        const outlineRooms = sectionEls.filter(item => item.floor_id === outline.id && item.type === "room" && item.sectionRole !== "base");
        const roomIds = new Set(outlineRooms.map(room => room.id));
        const outlineObjects = (objects || []).filter(obj => obj.floor_id === outline.id || roomIds.has(obj.room_id));
        const wallOpenings = sectionEls.filter(item => item.floor_id === outline.id && (item.type === "wall" || item.type === "opening"));
        return { rooms: outlineRooms.length, objects: outlineObjects.length, wallOpenings: wallOpenings.length };
    };

    // Objects mode — placed objects list + property editing
    if (stage === "objects") {
        const selectedObj = objects?.find(o => o.id === selectedObjectId) || null;
        const rooms = elements?.filter(el => el.type === "room" && el.floor_id && el.sectionRole !== "base") || [];
        const levels = [...new Set((outlines || []).map(f => f.level || 1))].sort((a, b) => a - b);
        const activeLevelOutlines = (outlines || []).filter(outline => (outline.level || 1) === selectedLevel);
        const visibleFloorIds = new Set(rooms.map(room => room.floor_id));
        const visibleRoomIds = new Set(rooms.map(room => room.id));
        const visibleObjects = (objects || []).filter(obj => {
            if (!visibleFloorIds.size) return true;
            return visibleFloorIds.has(obj.floor_id) || visibleRoomIds.has(obj.room_id);
        });
        const allRoomIds = new Set(rooms.map(room => room.id));
        const unassignedObjects = visibleObjects.filter(obj => !obj.room_id || !allRoomIds.has(obj.room_id));
        const renderObjectNode = (obj, style = {}) => (
            <div key={obj.id} className={`render-tree-node render-tree-child render-tree-indent${obj.id === selectedObjectId ? " is-selected" : ""}`}
                onClick={() => { onSelectObject?.(obj.id); flyToElement(obj); }}
                style={style}>
                <span className="render-tree-icon">{obj.icon || "□"}</span>
                <span className="render-tree-label">{obj.name || "Object"}</span>
                <button className="tb-btn render-tree-btn render-tree-btn-accent"
                    onClick={(e) => { e.stopPropagation(); flyToElement(obj); }} title="Fly to">↗</button>
                <button className="tb-btn render-tree-btn render-tree-btn-danger"
                    onClick={(e) => { e.stopPropagation(); deleteElement?.(obj.id); }} title="Delete">✕</button>
            </div>
        );

        return (
            <aside className="app-slider-right" ref={containerRef}>
                <div className="render-props-section render-props-section-scroll" style={{ height: splitHeight }}>
                    <h4 className="render-props-title">Floor Layouts</h4>
                    <div className="render-tree">
                        {levels.map(lvl => {
                            const isLevelExpanded = expandedFloors[`objects-level-${lvl}`] ?? true;
                            const isSelectedLevel = lvl === selectedLevel;
                            const lvlOutlines = (outlines || []).filter(outline => (outline.level || 1) === lvl);
                            return (
                                <div key={`objects-level-${lvl}`}>
                                    <div className={`render-tree-node render-tree-node-level${isSelectedLevel ? " is-level-selected" : ""}`}
                                        onClick={() => {
                                            onSelectLevel?.(lvl);
                                            setExpandedFloors(prev => ({ ...prev, [`objects-level-${lvl}`]: !(prev[`objects-level-${lvl}`] ?? true) }));
                                        }}>
                                        <span className="render-tree-chevron">{isLevelExpanded ? "▼" : "▶"}</span>
                                        <span>Level {lvl}</span>
                                        <span className="render-tree-meta render-tree-meta-end">
                                            {lvlOutlines.length} outline{lvlOutlines.length === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                    {isSelectedLevel && isLevelExpanded && (
                                        <div className="render-tree render-tree-indent">
                                            {activeLevelOutlines.map(outline => {
                                                const outlineRooms = rooms.filter(room => room.floor_id === outline.id);
                                                const roomIds = new Set(outlineRooms.map(room => room.id));
                                                const outlineChildren = (elements || []).filter(item => (
                                                    (item.type === "wall" || item.type === "opening")
                                                    && item.floor_id === outline.id
                                                    && !roomIds.has(item.parent_id)
                                                ));
                                                const isOutlineExpanded = expandedFloors[`objects-${outline.id}`] ?? true;
                                                const isOutlineActive = outline.id === activeFloorId;
                                                return (
                                                    <div key={`objects-outline-${outline.id}`}>
                                                        <div className={`render-tree-node${isOutlineActive ? " is-selected" : ""}`}
                                                            onClick={() => { onSelectFloor?.(outline.id); toggleFloor(`objects-${outline.id}`); flyToElement(outline); }}>
                                                            <span className="render-tree-chevron">{isOutlineExpanded ? "▼" : "▶"}</span>
                                                            <span className="render-tree-label">{outline.name || outline.type || "Outline"}</span>
                                                            <span className="render-tree-meta">
                                                                {outlineRooms.length} room{outlineRooms.length === 1 ? "" : "s"}
                                                            </span>
                                                        </div>
                                                        {isOutlineExpanded && (
                                                            <div className="render-tree render-tree-indent">
                                                                {outlineChildren.map(child => (
                                                                    <div key={child.id} className={`render-tree-node render-tree-child${child.id === selectedShape?.id ? " is-selected" : ""}`}
                                                                        onClick={() => { onSelectShape?.(child.id); flyToElement(child); }}>
                                                                        <span className={`render-tree-icon-sm${child.type === "opening" ? " render-tree-icon-accent" : " render-tree-icon-muted"}`}>{child.type === "opening" ? "▱" : "▮"}</span>
                                                                        <span className="render-tree-label">{child.name || elementLabel(child)}</span>
                                                                    </div>
                                                                ))}
	                                                                {outlineRooms.map(room => {
	                                                                    const roomChildren = (elements || []).filter(item => (
	                                                                        (item.type === "wall" || item.type === "opening")
	                                                                        && item.parent_id === room.id
	                                                                    ));
                                                                        const roomObjects = visibleObjects.filter(obj => obj.room_id === room.id);
	                                                                    return (
	                                                                        <div key={`objects-room-${room.id}`}>
	                                                                            <div className={`render-tree-node render-tree-child${room.id === selectedShape?.id ? " is-selected" : ""}`}
	                                                                                onClick={() => { onSelectShape?.(room.id); flyToElement(room); }}>
	                                                                                <span className="render-tree-icon-sm" style={{ color: roomColors[room.roomType] || "var(--color-accent)" }}>■</span>
	                                                                                <span className="render-tree-label">{room.name || elementLabel(room)}</span>
                                                                                    {roomObjects.length > 0 && (
                                                                                        <span className="render-tree-count">{roomObjects.length} obj</span>
                                                                                    )}
	                                                                            </div>
	                                                                            {roomChildren.map(child => (
	                                                                                <div key={child.id} className={`render-tree-node render-tree-child render-tree-indent${child.id === selectedShape?.id ? " is-selected" : ""}`}
                                                                                    onClick={() => { onSelectShape?.(child.id); flyToElement(child); }}>
                                                                                    <span className={`render-tree-icon-sm${child.type === "opening" ? " render-tree-icon-accent" : " render-tree-icon-muted"}`}>{child.type === "opening" ? "▱" : "▮"}</span>
	                                                                                    <span className="render-tree-label">{child.name || elementLabel(child)}</span>
	                                                                                </div>
	                                                                            ))}
                                                                            {roomObjects.map(obj => renderObjectNode(obj, { marginLeft: 24 }))}
	                                                                        </div>
	                                                                    );
	                                                                })}
                                                                {unassignedObjects
                                                                    .filter(obj => obj.floor_id === outline.id)
                                                                    .map(obj => renderObjectNode(obj))}
	                                                            </div>
	                                                        )}
	                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
	                        })}
	                    </div>
	                    {visibleObjects.length === 0 && (
	                        <p className="render-props-empty">
	                            Select furniture from the catalog to place
	                        </p>
	                    )}
	                    {unassignedObjects.some(obj => !obj.floor_id) && (
	                        <>
	                            <h4 className="render-props-title render-props-title-gap">Unassigned Objects</h4>
	                            <div className="render-tree">
	                                {unassignedObjects.filter(obj => !obj.floor_id).map(obj => renderObjectNode(obj, { marginLeft: 0 }))}
	                            </div>
	                        </>
	                    )}
	                </div>
                <div className="split-divider" onMouseDown={handleMouseDown}>
                    <div className="divider-handle"></div>
                </div>
                <div className="render-props-section render-props-section-fill">
                    <ObjectProperties
                        selectedObject={selectedObj}
                        onUpdateObject={onUpdateObject}
                        rooms={rooms}
                    />
                    {objectValidationResults.warnings?.length > 0 && (
                        <div className="props-section props-warning">
                            <div className="props-warning-title">Object Warnings</div>
                            {objectValidationResults.warnings.slice(0, 5).map((warning, index) => (
                                <div key={`${warning.type}-${index}`} className="props-warning-item">
                                    {warning.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        );
    }

    // 3D Render mode — Full hierarchy: Outlines → Rooms → Objects
    if (stage === "render3d") {
        const rooms = elements?.filter(el => el.type === "room" && el.floor_id && el.sectionRole !== "base") || [];
        const selectedObj = objects?.find(o => o.id === selectedObjectId) || null;
        const levels = [...new Set((outlines || []).map(f => f.level || 1))].sort((a, b) => a - b);

        return (
            <aside className="app-slider-right" ref={containerRef}>
                <div className="render-props-section render-props-section-full">
                    <h4 className="render-props-title">3D Scene</h4>
                    <div className="render-tree">
                        {levels.map(lvl => {
                            const lvlOutlines = (outlines || []).filter(f => (f.level || 1) === lvl);
                            return (
                                <div key={lvl}>
                                    <div className="render-tree-node render-tree-node-bold">
                                        <span className="render-tree-icon">📁</span>
                                        <span className="render-tree-label">Level {lvl}</span>
                                    </div>
                                    {lvlOutlines.map(outline => {
                                        const outlineRooms = rooms.filter(r => r.floor_id === outline.id);
                                        const outlineObjects = (objects || []).filter(o => o.floor_id === outline.id || outlineRooms.some(r => r.id === o.room_id));
                                        return (
                                            <div key={outline.id} className="render-tree-indent">
                                                <div className="render-tree-node">
                                                    <span className="render-tree-icon">▲</span>
                                                    <span className="render-tree-label">{outline.name || "Outline"}</span>
                                                </div>
                                                {outlineRooms.map(room => {
                                                    const roomObjects = (objects || []).filter(o => o.room_id === room.id);
                                                    return (
                                                        <div key={room.id} className="render-tree-indent">
                                                            <div className="render-tree-node">
                                                                <span className="render-tree-icon">■</span>
                                                                <span className="render-tree-label">{room.name || "Room"}</span>
                                                            </div>
                                                            {roomObjects.map(obj => (
                                                                <div key={obj.id} className={`render-tree-node render-tree-child render-tree-indent${obj.id === selectedObjectId ? " is-selected" : ""}`}
                                                                    onClick={() => onSelectObject?.(obj.id)}>
                                                                    <span className="render-tree-icon">{obj.icon || "□"}</span>
                                                                    <span className="render-tree-label">{obj.name || "Object"}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                                {outlineRooms.length === 0 && outlineObjects.length === 0 && (
                                                    <p className="render-tree-empty">No rooms</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                        {levels.length === 0 && (
                            <p className="render-props-empty">
                                Add outlines in the Outline stage first
                            </p>
                        )}
                    </div>
                </div>
                {selectedObj && (
                    <div className="render-props-section render-props-object-editor">
                        <h4 className="render-props-title">Object Properties</h4>
                        <div className="render-props-field">
                            <label className="render-props-label">Name</label>
                            <input className="input" value={selectedObj.name || ""} onChange={e => onUpdateObject?.({ ...selectedObj, name: e.target.value })} />
                        </div>
                        <div className="render-props-field">
                            <label className="render-props-label">X Position</label>
                            <input className="input" type="number" value={selectedObj.x || 0} onChange={e => onUpdateObject?.({ ...selectedObj, x: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="render-props-field">
                            <label className="render-props-label">Y Position</label>
                            <input className="input" type="number" value={selectedObj.y || 0} onChange={e => onUpdateObject?.({ ...selectedObj, y: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="render-props-field">
                            <label className="render-props-label">Rotation</label>
                            <input className="input" type="number" value={selectedObj.rotation || 0} onChange={e => onUpdateObject?.({ ...selectedObj, rotation: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="render-props-field">
                            <label className="render-props-label">Elevation (m)</label>
                            <input className="input" type="number" step={0.1} value={selectedObj.elevation || 0} onChange={e => onUpdateObject?.({ ...selectedObj, elevation: parseFloat(e.target.value) || 0 })} />
                        </div>
                    </div>
                )}
            </aside>
        );
    }

    // Sections mode — Level → Outline → Rooms hierarchy
    if (stage === "sections") {
        const sectionFloors = outlines || [];
        const sectionItems = elements || [];
        const levels = [...new Set(sectionFloors.map(f => f.level || 1))].sort((a, b) => a - b);

        return (
            <aside className="app-slider-right" ref={containerRef}>
                <div className="render-props-section render-props-section-scroll" style={{ height: splitHeight }}>
                    <h4 className="render-props-title">Floor Levels</h4>
                    {levels.length === 0 && (
                        <p className="render-props-empty">
                            Add outlines in the Outline stage first
                        </p>
                    )}
                    <div className="render-tree">
                        {levels.map(lvl => {
                            const isLevelExpanded = expandedFloors[`level-${lvl}`] ?? true;
                            const lvlFloors = sectionFloors.filter(f => (f.level || 1) === lvl);
                            const isSelectedLevel = lvl === selectedLevel;
                            return (
                                <div key={lvl}>
                                    <div className={`render-tree-node render-tree-node-level${isSelectedLevel ? " is-level-selected" : ""}`}
                                        onClick={() => { onSelectLevel(lvl); toggleLevel(lvl); }}>
                                        <span className="render-tree-chevron">{isLevelExpanded ? "▼" : "▶"}</span>
                                        <span>Level {lvl}</span>
                                        <span className="render-tree-meta render-tree-meta-end">
                                            {lvlFloors.length} outline{(lvlFloors.length !== 1 ? "s" : "")}
                                        </span>
                                    </div>
                                    {isLevelExpanded && isSelectedLevel && (
                                        <div className="render-tree render-tree-indent">
	                                            {lvlFloors.map(outline => {
	                                                const outlineRooms = sectionItems.filter(r => r.floor_id === outline.id && r.type === "room" && r.sectionRole !== "base");
	                                                const roomIds = new Set(outlineRooms.map(room => room.id));
	                                                const outlineChildren = sectionItems.filter(item => (
	                                                    (item.type === "wall" || item.type === "opening")
	                                                    && item.floor_id === outline.id
	                                                    && !roomIds.has(item.parent_id)
	                                                ));
	                                                const isOutlineExpanded = expandedFloors[outline.id] ?? true;
	                                                const isOutlineActive = outline.id === activeFloorId;
                                                return (
                                                    <div key={outline.id}>
                                                        <div className={`render-tree-node${isOutlineActive ? " is-selected" : ""}`}
                                                            onClick={() => { onSelectFloor(outline.id); toggleFloor(outline.id); flyToElement(outline); }}>
                                                            <span className="render-tree-chevron">{isOutlineExpanded ? "▼" : "▶"}</span>
                                                            <span className="render-tree-label">{outline.name || outline.type || "Outline"}</span>
                                                            <span className="render-tree-meta">
                                                                {outlineRooms.length} room{(outlineRooms.length !== 1 ? "s" : "")}
                                                            </span>
                                                        </div>
                                                        {isOutlineExpanded && (
                                                            <div className="render-tree render-tree-indent">
	                                                                {outlineRooms.length === 0 && (
	                                                                    <p className="render-tree-empty-sm">
	                                                                        No rooms yet - use Divider or Templates
	                                                                    </p>
	                                                                )}
	                                                                {outlineChildren.map(child => (
	                                                                    <div key={child.id} className={`render-tree-node render-tree-child${child.id === selectedShape?.id ? " is-selected" : ""}`}
                                                                        onClick={() => { onSelectShape?.(child.id); flyToElement(child); }}>
	                                                                        <span className={`render-tree-icon-sm${child.type === "opening" ? " render-tree-icon-accent" : " render-tree-icon-muted"}`}>{child.type === "opening" ? "▱" : "▮"}</span>
	                                                                        <span className="render-tree-label">{child.name || elementLabel(child)}</span>
	                                                                        <button className="tb-btn render-tree-btn-sm render-tree-btn-danger"
	                                                                            onClick={(e) => { e.stopPropagation(); deleteElement?.(child.id); }} title="Delete">✕</button>
	                                                                    </div>
	                                                                ))}
	                                                                {outlineRooms.map(room => {
	                                                                        const roomWalls = sectionItems.filter(w => w.type === "wall" && w.parent_id === room.id);
	                                                                        const roomOpenings = sectionItems.filter(w => w.type === "opening" && w.parent_id === room.id);
	                                                                        return (
                                                                            <div key={room.id}>
                                                                                <div className={`render-tree-node render-tree-child${(room.id === selectedShape?.id || multiSelectIds.includes(room.id)) ? " is-selected" : ""}`}
                                                                                    onClick={(e) => {
                                                                                        const isBatchClick = e.ctrlKey || e.metaKey;
                                                                                        onSelectShape?.(room.id, isBatchClick);
                                                                                        if (!isBatchClick) flyToElement(room);
                                                                                    }}>
                                                                                    <span className="render-tree-icon-sm" style={{ color: roomColors[room.roomType] || "var(--color-accent)" }}>●</span>
                                                                                    <span className="render-tree-label">{room.name || room.roomType || "room"}</span>
                                                                                    <button className="tb-btn render-tree-btn-sm render-tree-btn-danger"
                                                                                        onClick={(e) => { e.stopPropagation(); deleteElement?.(room.id); }} title="Delete">✕</button>
                                                                                </div>
                                                                                {roomWalls.map(wall => (
                                                                                    <div key={wall.id} className={`render-tree-node render-tree-child render-tree-indent-lg${wall.id === selectedShape?.id ? " is-selected" : ""}`}
                                                                                        onClick={() => { onSelectShape?.(wall.id); flyToElement(wall); }}>
                                                                                        <span className="render-tree-icon-sm render-tree-icon-muted">▮</span>
                                                                                        <span className="render-tree-label">{wall.name || elementLabel(wall)}</span>
                                                                                        <button className="tb-btn render-tree-btn-sm render-tree-btn-danger"
                                                                                            onClick={(e) => { e.stopPropagation(); deleteElement?.(wall.id); }} title="Delete">✕</button>
                                                                                    </div>
                                                                                ))}
                                                                                {roomOpenings.map(opening => (
                                                                                    <div key={opening.id} className={`render-tree-node render-tree-child render-tree-indent-lg${opening.id === selectedShape?.id ? " is-selected" : ""}`}
                                                                                        onClick={() => { onSelectShape?.(opening.id); flyToElement(opening); }}>
                                                                                        <span className={`render-tree-icon-sm${opening.openingType === "window" ? " render-tree-icon-accent" : " render-tree-icon-primary"}`}>▱</span>
                                                                                        <span className="render-tree-label">{opening.name || elementLabel(opening)}</span>
                                                                                        <button className="tb-btn render-tree-btn-sm render-tree-btn-danger"
                                                                                            onClick={(e) => { e.stopPropagation(); deleteElement?.(opening.id); }} title="Delete">✕</button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        );
	                                                                    })}
	                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="render-props-add-level">
                        <button className="tb-btn render-props-add-level-btn"
                            onClick={() => addLevel?.()}>
                            + Add Level
                        </button>
                    </div>
                </div>
                <div className="split-divider" onMouseDown={handleMouseDown}>
                    <div className="divider-handle"></div>
                </div>
                <div className="render-props-section render-props-section-fill">
                    {s ? (
                        <>
                            <h4 className="render-props-title">{s.name || elementLabel(s)}</h4>
                            <div className="props-section props-section-flush">
                                <label>Name</label>
                                <input type="text" className="input" value={s.name || ""} onChange={e => update({ name: e.target.value })} />
                            </div>
                            {s.roomType !== undefined && (
                                <div className="props-section">
                                    <label>Type</label>
                                    <select className="input" value={s.roomType || "other"} onChange={e => updateRoomType ? updateRoomType(s.id, e.target.value) : update({ roomType: e.target.value })}>
                                        {ROOM_TYPES.map(rt => (
                                            <option key={rt.value} value={rt.value}>{rt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {s.type === "divider_line" ? (
                                <div className="props-section">
                                    <label>X1</label><input type="number" value={Math.round(s.x1 || 0)} onChange={e => update({ x1: Number(e.target.value) })} />
                                    <label>Y1</label><input type="number" value={Math.round(s.y1 || 0)} onChange={e => update({ y1: Number(e.target.value) })} />
                                    <label>X2</label><input type="number" value={Math.round(s.x2 || 0)} onChange={e => update({ x2: Number(e.target.value) })} />
                                    <label>Y2</label><input type="number" value={Math.round(s.y2 || 0)} onChange={e => update({ y2: Number(e.target.value) })} />
                                </div>
                            ) : (
                                <>
                                    <div className="props-section">
                                        <label>X</label><input type="number" value={Math.round(s.x || 0)} onChange={e => update({ x: Number(e.target.value) })} />
                                        <label>Y</label><input type="number" value={Math.round(s.y || 0)} onChange={e => update({ y: Number(e.target.value) })} />
                                    </div>
                                    {s.width !== undefined && <div className="props-section">
                                        <label>Width</label><input type="number" value={Math.round(s.width)} onChange={e => update({ width: Number(e.target.value) })} />
                                        <label>Height</label><input type="number" value={Math.round(s.height)} onChange={e => update({ height: Number(e.target.value) })} />
                                    </div>}
                                    {s.type === "wall" && (
                                        <div className="props-section">
                                            <label>Wall Padding</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={80}
                                                value={Math.round(s.wallThickness || Math.min(s.width || 8, s.height || 8) || 8)}
                                                onChange={e => {
                                                    const nextPadding = Math.max(1, Math.min(80, Number(e.target.value) || 1));
                                                    const sideResize = s.wallType === "wall_line"
                                                        ? (s.edge === "left" || s.edge === "right" ? { width: nextPadding } : { height: nextPadding })
                                                        : {};
                                                    update({ wallThickness: nextPadding, ...sideResize });
                                                }}
                                            />
                                            {s.edge && <span className="props-edge">Edge: {s.edge}</span>}
                                        </div>
                                    )}
                                    {s.type === "opening" && (
                                        <div className="props-section">
                                            <label>Opening</label>
                                            <select className="input" value={s.openingType || "door"} onChange={e => update({ openingType: e.target.value, name: e.target.value === "window" ? "Window" : "Door" })}>
                                                <option value="door">Door</option>
                                                <option value="window">Window</option>
                                            </select>
                                            {s.edge && <span className="props-edge">Edge: {s.edge}</span>}
                                        </div>
                                    )}
                                    <div className="props-section props-section-flush">
                                        <label>Fill</label><input type="color" value={s.fill || "#6366f1"} onChange={e => update({ fill: e.target.value })} />
                                    </div>
                                </>
                            )}
                            {showMeasurements && s?.type === "room" && (
                                <div className="props-section props-panel">
                                    <div className="props-panel-title">Measurements</div>
                                    <div className="props-measure-row">
                                        <div className="props-measure-cell">
                                            <label className="props-measure-label">Area:</label>
                                            <span>
                                                {(() => {
                                                    const area = liveMeasurements?.area ?? getOutlineArea(s);
                                                    const { value, label } = metersToAreaUnit(area, unit);
                                                    return `${value.toFixed(2)} ${label}`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="props-measure-cell">
                                            <label className="props-measure-label">Perimeter:</label>
                                            <span>
                                                {(() => {
                                                    const perimeter = liveMeasurements?.perimeter ?? getOutlinePerimeter(s);
                                                    const { value, label } = metersToUnit(perimeter, unit);
                                                    return `${value.toFixed(2)} ${label}`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {sectionWarnings.length > 0 && (
                                <div className="props-section props-warning">
                                    <div className="props-warning-title">Section Warnings</div>
                                    {sectionWarnings.slice(0, 4).map((warning, index) => (
                                        <div key={`${warning.type}-${index}`} className="props-warning-item">
                                            {warning.message}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="render-props-placeholder">
                            Select a room to edit properties
                        </p>
                    )}
                </div>
            </aside>
        );
    }

    // Outline mode — shapes/properties only, no floors
    return (
        <aside className="app-slider-right" ref={containerRef}>
            <div className="render-props-section render-props-section-scroll" style={{ height: splitHeight }}>
                <h4 className="render-props-title">Outlines ({elements.length})</h4>
                {elements.length === 0 && <p className="render-props-empty">Add outlines from the left panel</p>}
                {elements.map(el => {
                    const summary = outlineSummary(el);
                    const hasDeps = summary.rooms + summary.objects + summary.wallOpenings > 0;
                    return (
                        <div key={el.id} className={`render-tree-node${(el.id === selectedShape?.id || multiSelectIds.includes(el.id)) ? " is-selected" : ""}`}
                            onClick={(e) => { onSelectShape?.(el.id, e.ctrlKey || e.metaKey); flyToElement(el); }}>
                            <span className="render-tree-icon" style={{ color: hasDeps ? "#f59e0b" : "var(--color-accent)" }}>
                                {el.type === "circle" ? "○" : el.type === "rectangle" ? "▭" : "⬡"}
                            </span>
                            <span className="render-tree-label">{elementLabel(el)}</span>
                            {hasDeps && (
                                <span className="render-tree-deps">
                                    {summary.rooms}r · {summary.objects}o · {summary.wallOpenings}w
                                </span>
                            )}
                            <button className="tb-btn render-tree-btn render-tree-btn-danger"
                                onClick={(e) => { e.stopPropagation(); deleteElement?.(el.id); }} title="Delete">✕</button>
                        </div>
                    );
                })}
            </div>
            <div className="split-divider" onMouseDown={handleMouseDown}>
                <div className="divider-handle"></div>
            </div>
            <div className="render-props-section render-props-section-fill">
                {s ? (
                    <>
                        <h4 className="render-props-title">{s.name || s.type || "Shape"}</h4>
                        <div className="props-section props-section-flush">
                            <label>Name</label><input type="text" className="input" value={s.name || ""} onChange={e => update({ name: e.target.value })} />
                        </div>
                        {s.lat != null && s.lng != null ? (
                            <div className="props-section">
                                <label>Lat</label>
                                <input type="number" step="0.000001" value={roundCoordinate(s.lat)} onChange={e => update({ lat: Number(e.target.value), x: undefined, y: undefined })} />
                                <label>Lng</label>
                                <input type="number" step="0.000001" value={roundCoordinate(s.lng)} onChange={e => update({ lng: Number(e.target.value), x: undefined, y: undefined })} />
                            </div>
                        ) : (
                            <div className="props-section">
                                <label>Screen X</label><input type="number" value={Math.round(s.x || 0)} onChange={e => update({ x: Number(e.target.value) })} />
                                <label>Screen Y</label><input type="number" value={Math.round(s.y || 0)} onChange={e => update({ y: Number(e.target.value) })} />
                            </div>
                        )}
                        {(s.width !== undefined || s.widthMeters !== undefined) && <div className="props-section">
                            <label>{s.widthMeters !== undefined ? "Width (m)" : "Width (px)"}</label>
                            <input
                                type="number"
                                value={s.widthMeters !== undefined ? roundSize(s.widthMeters) : Math.round(s.width || 0)}
                                onChange={e => s.widthMeters !== undefined
                                    ? update({ widthMeters: Number(e.target.value), width: undefined })
                                    : update({ width: Number(e.target.value) })}
                            />
                            <label>{s.heightMeters !== undefined ? "Length (m)" : "Height (px)"}</label>
                            <input
                                type="number"
                                value={s.heightMeters !== undefined ? roundSize(s.heightMeters) : Math.round(s.height || 0)}
                                onChange={e => s.heightMeters !== undefined
                                    ? update({ heightMeters: Number(e.target.value), height: undefined })
                                    : update({ height: Number(e.target.value) })}
                            />
                        </div>}
                        {(s.radius !== undefined || s.radiusMeters !== undefined) && <div className="props-section">
                            <label>{s.radiusMeters !== undefined ? "Radius (m)" : "Radius"}</label>
                            <input
                                type="number"
                                value={s.radiusMeters !== undefined ? roundSize(s.radiusMeters) : Math.round(s.radius || 0)}
                                onChange={e => s.radiusMeters !== undefined
                                    ? update({ radiusMeters: Number(e.target.value), radius: undefined })
                                    : update({ radius: Number(e.target.value) })}
                            />
                        </div>}
                        <div className="props-section props-section-flush">
                            <label>Fill</label><input type="color" value={s.fill || "#6366f1"} onChange={e => update({ fill: e.target.value })} />
                            <label>Stroke Width</label><input type="number" min={0} max={20} step={0.5} value={s.strokeWidth || 2} onChange={e => update({ strokeWidth: Number(e.target.value) })} />
                            <label>Opacity</label><input type="range" min={0.1} max={1} step={0.1} value={s.opacity ?? 1} onChange={e => update({ opacity: Number(e.target.value) })} />
                        </div>

                        {multiSelectIds.length >= 2 && (
                            <div className="props-section props-panel">
                                <div className="props-panel-title">Multi-select: {multiSelectIds.length} outlines</div>
                                {multiSelectIds.map((id, i) => {
                                    const o = outlines.find(x => x.id === id);
                                    return o ? (
                                        <div key={id} className="props-panel-item">
                                            {i + 1}. {o.name || o.type || "outline"}
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        )}

                        {validationResults.warnings.length > 0 && (
                            <div className="props-section props-validation">
                                <div className="props-validation-title">Validation Warnings</div>
                                {validationResults.warnings.map((w, i) => (
                                    <div key={i} className="props-validation-item" style={{ color: w.severity === "error" ? "#dc2626" : "#d97706" }}>
                                        <span>{w.severity === "error" ? "✕" : "⚠"}</span>
                                        <span>{w.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showMeasurements && s && (
                            <div className="props-section props-panel">
                                <div className="props-panel-title">Measurements</div>
                                <div className="props-measure-row">
                                    <div className="props-measure-cell">
                                        <label className="props-measure-label">Area:</label>
                                        <span>
                                            {(() => {
                                                const area = getOutlineArea(s);
                                                const { value, label } = metersToAreaUnit(area, unit);
                                                return `${value.toFixed(2)} ${label}`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="props-measure-cell">
                                        <label className="props-measure-label">Perimeter:</label>
                                        <span>
                                            {(() => {
                                                const perimeter = getOutlinePerimeter(s);
                                                const { value, label } = metersToUnit(perimeter, unit);
                                                return `${value.toFixed(2)} ${label}`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="render-props-placeholder">Select an outline to edit properties</p>
                )}
            </div>
        </aside>
    );
}
