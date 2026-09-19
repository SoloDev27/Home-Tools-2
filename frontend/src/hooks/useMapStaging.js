import { useState, useEffect, useRef, useCallback } from "react";
import { trackEvent } from "../functions/analytics";
import { reverseLookupAddress } from "../functions/nominatim";
import { lngLatToMercator, mercatorToLngLat, mercatorDistance, getHandlePosition, debounce } from "../functions/map";
import {
    thunkGetAllProperties,
    thunkCreateProperty,
    thunkEditProperty,
    thunkDeleteProperty
} from "../redux/properties";
import { thunkGetPoints, thunkCreatePoint, thunkEditPoint, thunkDeletePoint } from "../redux/points";
import { thunkGetSavedTypes } from "../redux/savedTypes";
import { thunkGetSettings } from "../redux/settings";

export default function useCanvasStaging(propertyStore, pointStore, dispatch, externalLoaded, mapId, overlaysStore) {
    const [initialized, setInitialized] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyIndexRef = useRef(-1);
    const mapIdRef = useRef(mapId);
    const pendingHistoryRef = useRef(false);
    const savingRef = useRef(false);
    const isSavingAllRef = useRef(false);
    const currentCanvasObjectsRef = useRef({});
    const currentDeletedPropertiesRef = useRef([]);
    const currentDeletedPointsRef = useRef([]);

    const [canvasObjects, setCanvasObjects] = useState({});
    const [deletedProperties, setDeletedProperties] = useState([]);
    const [deletedPoints, setDeletedPoints] = useState([]);

    const debouncedSaveToLocal = useRef(debounce(() => {
        const currentMapId = mapIdRef.current;
        if (!currentMapId) return;
        const data = {
            canvasObjects: currentCanvasObjectsRef.current,
            deletedProperties: currentDeletedPropertiesRef.current,
            deletedPoints: currentDeletedPointsRef.current,
        };
        localStorage.setItem(`workspace_${currentMapId}`, JSON.stringify({
            data,
            expires: (Date.now() + (6 * 60 * 60 * 1000))
        }));
    }, 2000)).current;

    const pushHistory = useCallback((cObjs, dProps, dPts) => {
        const snapshot = {
            canvasObjects: { ...cObjs },
            deletedProperties: [...dProps],
            deletedPoints: [...dPts],
        };
        const newIndex = historyIndexRef.current + 1;
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
        setHistory(prev => {
            let trimmed = prev.slice(0, newIndex);
            trimmed = [...trimmed, snapshot];
            if (trimmed.length > 50) {
                trimmed.shift();
                historyIndexRef.current = trimmed.length - 1;
                setHistoryIndex(trimmed.length - 1);
            }
            return trimmed;
        });
    }, []);

    useEffect(() => {
        currentCanvasObjectsRef.current = canvasObjects;
        currentDeletedPropertiesRef.current = deletedProperties;
        currentDeletedPointsRef.current = deletedPoints;
        mapIdRef.current = mapId;
    });

    useEffect(() => {
        const initialData = async () => {
            if (!mapId) return;
            setInitialized(false);
            setLoaded(false);
            setCanvasObjects({});
            setDeletedProperties([]);
            setDeletedPoints([]);
            setHistory([]);
            setHistoryIndex(-1);
            
            await dispatch(thunkGetAllProperties(mapId));
            dispatch(thunkGetSettings());
            dispatch(thunkGetSavedTypes());
            dispatch(thunkGetPoints(mapId));

            // Cleanup legacy keys
            localStorage.removeItem(`canvasObjects_${mapId}`);
            localStorage.removeItem(`deletedProperties_${mapId}`);
            localStorage.removeItem(`deletedPoints_${mapId}`);

            let stored = localStorage.getItem(`workspace_${mapId}`);
            let parsed = stored ? JSON.parse(stored) : null;
            
            if (parsed && Date.now() > parsed?.expires) {
                localStorage.removeItem(`workspace_${mapId}`);
            } else if (parsed?.data) {
                if (parsed.data.canvasObjects) setCanvasObjects(parsed.data.canvasObjects);
                if (parsed.data.deletedProperties) setDeletedProperties(parsed.data.deletedProperties);
                if (parsed.data.deletedPoints) setDeletedPoints(parsed.data.deletedPoints);
            }

            setInitialized(true);
            setSaving(false);
        }
        initialData()
    }, [mapId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!initialized || !propertyStore?.data || !pointStore?.data) return;

        setCanvasObjects(prev => {
            const merged = { ...prev };

            propertyStore.data.forEach(p => {
                const id = `prop-${p.id}`;
                if (deletedProperties.includes(p.id)) return;
                if (!merged[id]) {
                    merged[id] = { ...p, id, propertyId: p.id, source: 'db', map_id: Number(mapId) };
                }
            });

            pointStore.data.forEach(p => {
                const id = `point-${p.id}`;
                if (deletedPoints.includes(p.id)) return;
                if (!merged[id]) {
                    merged[id] = { ...p, id, pointId: p.id, source: 'db', map_id: Number(mapId) };
                }
            });

            // Seed overlay points
            if (overlaysStore && overlaysStore.workspaceMapIds) {
                overlaysStore.workspaceMapIds.forEach(oMapId => {
                    const oProps = overlaysStore.properties[oMapId] || [];
                    const oPoints = overlaysStore.points[oMapId] || [];
                    
                    oProps.forEach(p => {
                        const id = `overlay-${oMapId}-prop-${p.id}`;
                        if (!merged[id]) {
                            merged[id] = { ...p, id, propertyId: p.id, source: 'db', map_id: Number(oMapId), isOverlay: true };
                        }
                    });
                    
                    oPoints.forEach(p => {
                        const id = `overlay-${oMapId}-point-${p.id}`;
                        if (!merged[id]) {
                            merged[id] = { ...p, id, pointId: p.id, source: 'db', map_id: Number(oMapId), isOverlay: true };
                        }
                    });
                });
            }

            return merged;
        });

        setLoaded(true);
        setInitialized(false);
        pendingHistoryRef.current = true;
    }, [initialized, propertyStore?.data, pointStore?.data, overlaysStore]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!loaded || savingRef.current || isSavingAllRef.current) return;
        debouncedSaveToLocal();
        if (pendingHistoryRef.current) {
            pendingHistoryRef.current = false;
            pushHistory(canvasObjects, deletedProperties, deletedPoints);
        }
    }, [canvasObjects, pushHistory, debouncedSaveToLocal]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!loaded || savingRef.current || isSavingAllRef.current) return;
        debouncedSaveToLocal();
    }, [deletedProperties, debouncedSaveToLocal]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!loaded || savingRef.current || isSavingAllRef.current) return;
        debouncedSaveToLocal();
    }, [deletedPoints, debouncedSaveToLocal]); // eslint-disable-line react-hooks/exhaustive-deps

    const restoreSnapshot = useCallback((snapshot) => {
        setCanvasObjects(snapshot.canvasObjects);
        setDeletedProperties(snapshot.deletedProperties);
        setDeletedPoints(snapshot.deletedPoints);

        savingRef.current = true;
        setTimeout(() => { savingRef.current = false; }, 100);
    }, []);

    const undo = () => {
        if (historyIndexRef.current <= 0) return;
        const newIndex = historyIndexRef.current - 1;
        const snapshot = history[newIndex];
        if (!snapshot) return;
        restoreSnapshot(snapshot);
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
    }

    const redo = () => {
        if (historyIndexRef.current >= history.length - 1) return;
        const newIndex = historyIndexRef.current + 1;
        const snapshot = history[newIndex];
        if (!snapshot) return;
        restoreSnapshot(snapshot);
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
    }

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [history, historyIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    const addCanvasObjects = (originalObj) => {
        if (!originalObj || !originalObj.id) return;
        const obj = { ...originalObj };
        const idStr = String(obj.id);
        const split = idStr.split("-");
        const isNumeric = !isNaN(idStr) && !idStr.includes("-");
        const isTemp = split[0] === "temp";
        const numId = isTemp ? split[2] : (split[1] || idStr);
        let oldPrefix = split[0];
        let subType = split[1];
        let targetId = idStr;

        obj.endLng = obj.endLng || obj.end_lng;
        obj.endLat = obj.endLat || obj.end_lat;
        obj.handleLng = obj.handleLng || obj.handlelng;
        obj.handleLat = obj.handleLat || obj.handlelat;
        obj.radius = (obj.radius !== undefined && obj.radius !== null) ? obj.radius : obj.extra_info?.radius;

        const isCurrentlyRadius = (obj.type === "radius" || oldPrefix === "radius" || subType === "radius" || obj.radius);
        const isCurrentlyLine = (obj.type === "line" || oldPrefix === "line" || subType === "line" || obj.endLng);

        if (isCurrentlyRadius && obj.type === "line") {
            const r = obj.radius || 500;
            const cPos = { lng: obj.lng, lat: obj.lat };
            let hLng = obj.handleLng;
            let hLat = obj.handleLat;
            if (hLng === undefined || hLat === undefined || (hLng === cPos.lng && hLat === cPos.lat)) {
               const h = getHandlePosition(cPos.lng, cPos.lat, r);
               hLng = h.lng; hLat = h.lat;
            }
            const a = lngLatToMercator(cPos.lng, cPos.lat);
            const b = lngLatToMercator(hLng, hLat);
            const vx = b.x - a.x;
            const vy = b.y - a.y;
            const end = mercatorToLngLat(a.x - vx, a.y - vy);
            obj.lng = hLng;
            obj.lat = hLat;
            obj.endLng = end.lng;
            obj.endLat = end.lat;
        } else if (isCurrentlyLine && obj.type === "radius") {
            const oldStartLng = obj.lng;
            const oldStartLat = obj.lat;
            const a = lngLatToMercator(oldStartLng, oldStartLat);
            const b = lngLatToMercator(obj.endLng || oldStartLng, obj.endLat || oldStartLat);
            const mid = mercatorToLngLat((a.x + b.x) / 2, (a.y + b.y) / 2);
            const r = mercatorDistance(mid.lng, mid.lat, oldStartLng, oldStartLat);
            obj.lng = mid.lng;
            obj.lat = mid.lat;
            obj.radius = r;
            obj.handleLng = oldStartLng;
            obj.handleLat = oldStartLat;
            delete obj.endLng;
            delete obj.endLat;
        }

        if (["home", "apartment", "unit", "structure", "marker", "icon", "valve", "flora", "inspection", "fixture", "callout"].includes(obj.type)) {
            if (isCurrentlyRadius || isCurrentlyLine) {
                delete obj.radius;
                delete obj.endLng;
                delete obj.endLat;
            }
        }

        if (isNumeric || isTemp || (["point", "prop"].includes(oldPrefix))) {
            const isProp = ["home", "apartment", "unit", "structure"].includes(obj.type);
            const wasProp = ["home", "apartment", "unit", "structure"].includes(subType || oldPrefix);

            if (wasProp && !isProp && !obj.icon) {
                const typeKey = (subType || oldPrefix).toLowerCase();
                obj.icon = typeKey === "home" || typeKey === "structure" ? "/icons/home-point.svg" :
                           typeKey === "apartment" ? "/icons/building-point.svg" :
                           typeKey === "unit" ? "/icons/unit-point.svg" : null;
            }

            let newPrefix = isProp ? "prop" : (isTemp ? `temp-${obj.type}` : "point");
            targetId = isNumeric ? `${isProp ? "prop" : "point"}-${numId}` : (isTemp ? `${newPrefix}-${numId}` : `${newPrefix}-${numId}`);

            if (idStr !== targetId) {
                setCanvasObjects(prev => {
                    const copy = { ...prev };
                    delete copy[idStr];
                    return copy;
                });

                if (!isTemp && isNumeric) {
                    if (oldPrefix === "prop" && !isProp) {
                        setDeletedProperties(prev => Array.from(new Set([...prev, parseInt(numId)])));
                    } else if (oldPrefix === "point" && isProp) {
                        setDeletedPoints(prev => Array.from(new Set([...prev, parseInt(numId)])));
                    }
                }
            }
        }

        const finalObj = { ...obj, id: targetId, map_id: obj.map_id || Number(mapId), source: (isNumeric || (!isTemp && !targetId.startsWith("temp-"))) ? 'mod' : 'canvas' };
        pendingHistoryRef.current = true;
        setCanvasObjects(prev => ({ ...prev, [targetId]: finalObj }));
    };

    const deleteCanvasObjects = (id) => {
        if (!id) return;
        const idStr = String(id);
        pendingHistoryRef.current = true;

        const split = idStr.split("-");
        const typePrefix = split[0];
        const numId = Number(split[1] || idStr);

        setCanvasObjects(prev => {
            const copy = { ...prev };
            delete copy[idStr];
            delete copy[numId];
            delete copy[`prop-${numId}`];
            delete copy[`point-${numId}`];
            return copy;
        });

        if (!isNaN(numId) && typePrefix !== "temp") {
            const isProp = ["home", "apartment", "unit", "prop"].includes(typePrefix) ||
                           (propertyStore.data || []).some(p => p.id === numId);

            if (isProp) {
                setDeletedProperties(prev => [...prev, numId]);
                trackEvent("object_deleted", { type: "property", id: numId });
            } else {
                setDeletedPoints(prev => [...prev, numId]);
                trackEvent("object_deleted", { type: "point", id: numId });
            }
        }
    };

    const getMetadata = (id) => {
        if (!id) return null;
        const idStr = String(id);
        const canvas = currentCanvasObjectsRef.current;

        if (canvas[idStr]) return canvas[idStr];

        const isNumeric = !isNaN(idStr) && !idStr.includes("-");
        if (isNumeric) {
            const numId = Number(idStr);
            const dbProp = (propertyStore.data || []).find(p => p.id === numId);
            if (dbProp) return dbProp;
            const dbPoint = (pointStore.data || []).find(p => p.id === numId);
            if (dbPoint) return dbPoint;
        }

        return null;
    };

    const formatProperty = async (point) => {
        if (!point.name) return false;
        if (!point.lngLat && (!point.lng && !point.lat)) return false;

        const finalLng = point.lng ?? (point.lngLat ? point.lngLat[0] : null);
        const finalLat = point.lat ?? (point.lngLat ? point.lngLat[1] : null);

        const pointObj = {
            map_id: point.map_id ? Number(point.map_id) : Number(mapId),
            type: point.type || "home",
            icon: point.icon || null,
            name: point.name,
            lng: finalLng,
            lat: finalLat,
            address: point.address ?? null,
            city: point.city ?? null,
            county: point.county ?? null,
            state: point.state ?? null,
            country: point.country ?? null,
            zip: point.zip ?? null,
            details: point.extra_info ?? null,
            hierarchy: point.hierarchy ?? null
        }

        if (!pointObj.city && !pointObj.address &&
            !pointObj.county && !pointObj.state &&
            !pointObj.country && !pointObj.zip) {
            const addressObj = await reverseLookupAddress(pointObj.lng, pointObj.lat);
            pointObj.address = addressObj.address ?? null;
            pointObj.city = addressObj.city ?? null;
            pointObj.county = addressObj.county ?? null;
            pointObj.state = addressObj.state ?? null;
            pointObj.country = addressObj.country ?? null;
            pointObj.zip = addressObj.zip ?? null;
        }

        pointObj.zip = pointObj.zip === "" ? null : pointObj.zip;

        const nameSource = point.name || (point.type || "home").charAt(0).toUpperCase() + (point.type || "home").slice(1);
        if (nameSource.includes("(Unsaved)")) {
            pointObj.name = nameSource.split("(Unsaved)")[1].trim();
        } else {
            pointObj.name = nameSource;
        }

        return pointObj;
    }

    const formatPoint = (point) => {
        const lng = point.lng ?? point.lngLat?.[0];
        const lat = point.lat ?? point.lngLat?.[1];

        if (!lng || !lat) {
            console.error("No lng/lat for point", point);
            return false;
        }

        const nameSource = point.name || (point.type || "point").charAt(0).toUpperCase() + (point.type || "point").slice(1);
        const pointObj = {
            map_id: point.map_id ? Number(point.map_id) : Number(mapId),
            type: (point.type === "marker" || point.type === "icon") ? "icon" : point.type,
            name: nameSource.includes("(Unsaved)") ? nameSource.split("(Unsaved)")[1].trim() : nameSource,
            lng,
            lat,
            icon: point.icon || null,
            extra_info: point.extra_info || null,
            unit_id: point.unit_id || null,
        };

        switch (point.type) {
            case "marker":
            case "icon":
            case "structure":
            case "valve":
            case "flora":
            case "inspection":
            case "fixture":
            case "callout":
                return pointObj;
            case "home":
            case "apartment":
            case "unit":
                return pointObj;
            case "point":
                pointObj.type = "icon";
                return pointObj;
            case "radius":
                if (!point.radius) {
                    console.error("Radius type point missing radius field", point);
                    return false;
                }
                pointObj.radius = point.radius;
                return pointObj;
            case "line":
                if (!point.endLng && !point.end_lng) {
                    console.error("Line type point missing endLng/endLat", point);
                    return false;
                }
                pointObj.end_lng = point.end_lng || point.endLng;
                pointObj.end_lat = point.end_lat || point.endLat;
                return pointObj;
            case "polygon":
            case "rectangle":
            case "measure":
            case "setback":
            case "utility":
            case "curve":
            case "material":
                pointObj.extra_info = {
                    ...(pointObj.extra_info || {}),
                    coordinates: point.coordinates,
                    area: point.area,
                    perimeter: point.perimeter,
                    distance: point.distance,
                    color: point.color,
                    utilityType: point.utilityType,
                    materialType: point.materialType
                };
                return pointObj;
            default:
                return pointObj;
        }
    }

    const handleSaveAll = async (e) => {
        e.preventDefault();
        if (isSavingAllRef.current) return;
        isSavingAllRef.current = true;
        setSaving(true);

        const currentCanvas = { ...currentCanvasObjectsRef.current };
        const currentDeletedProps = [...currentDeletedPropertiesRef.current];
        const currentDeletedPts = [...currentDeletedPointsRef.current];

        try {
            const propCreates = [];
            const propUpdates = [];
            const pointCreates = [];
            const pointUpdates = [];

            Object.values(currentCanvas).forEach(obj => {
                const idStr = String(obj.id);
                const isNumeric = !isNaN(idStr) && !idStr.includes("-");
                const isProperty = ["home", "apartment", "unit", "structure"].includes(obj.type);
                const isNew = idStr.startsWith("temp-") || obj.source === "canvas" || (!obj.propertyId && !obj.pointId && !isNumeric);

                if (isNew) {
                    if (isProperty) propCreates.push(obj);
                    else pointCreates.push(obj);
                } else {
                    const existingId = Number(obj.propertyId || obj.pointId || (isNumeric ? idStr : idStr.split("-").pop()));
                    if (!isNaN(existingId)) {
                        if (isProperty) propUpdates.push({ id: existingId, data: obj });
                        else pointUpdates.push({ id: existingId, data: obj });
                    }
                }
            });

            trackEvent("save_all", {
                props_created: propCreates.length,
                props_edited: propUpdates.length,
                points_created: pointCreates.length,
                points_edited: pointUpdates.length,
                props_deleted: currentDeletedProps.length,
                points_deleted: currentDeletedPts.length,
            });

            await Promise.all([
                ...currentDeletedProps.map(id => dispatch(thunkDeleteProperty(id))),
                ...currentDeletedPts.map(id => dispatch(thunkDeletePoint(id))),

                ...propCreates.map(async p => {
                    const formatted = await formatProperty(p);
                    if (formatted) return dispatch(thunkCreateProperty(formatted));
                }),
                ...propUpdates.map(async ({ id, data }) => {
                    const formatted = await formatProperty(data);
                    if (formatted) return dispatch(thunkEditProperty(id, formatted));
                }),

                ...pointCreates.map(p => {
                    const formatted = formatPoint(p);
                    if (formatted) return dispatch(thunkCreatePoint(formatted));
                    return null;
                }),
                ...pointUpdates.map(({ id, data }) => {
                    const formatted = formatPoint(data);
                    if (formatted) return dispatch(thunkEditPoint(id, formatted));
                    return null;
                })
            ]);

            localStorage.removeItem(`workspace_${mapId}`);

            savingRef.current = true;
            setHistory([]);
            setHistoryIndex(-1);
            historyIndexRef.current = -1;
            setDeletedPoints([]);
            setDeletedProperties([]);
            setCanvasObjects({});

            await dispatch(thunkGetAllProperties(mapId));
            await dispatch(thunkGetPoints(mapId));
            savingRef.current = false;
            setInitialized(true);

        } catch (err) {
            console.error("Save All failed:", err);
        } finally {
            isSavingAllRef.current = false;
            setSaving(false);
        }
    };

    const hasUnsavedChanges = Object.values(canvasObjects).some(obj => obj.source === 'canvas' || obj.source === 'mod') || deletedPoints.length > 0 || deletedProperties.length > 0;

    return {
        canvasObjects, setCanvasObjects,
        hasUnsavedChanges,
        deletedProperties, setDeletedProperties,
        deletedPoints, setDeletedPoints,
        history, historyIndex,
        loaded, saving,
        handleSaveAll,
        addCanvasObjects,
        deleteCanvasObjects,
        getMetadata,
        pendingHistoryRef,
        undo, redo,
    };
}
