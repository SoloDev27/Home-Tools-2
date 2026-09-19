import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { useSelector } from "react-redux";
import maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    lngLatToMercator,
    mercatorToLngLat,
    mercatorDistance,
    getHandlePosition,
    createRadiusData,
    createLineData,
    calculatePolygonArea,
    formatArea,
    calculatePathDistance,
    formatDistance,
    createPolygonData,
    createPolylineData,
    createRectangleCoords,
    createCatmullRomCurve,
    createClosedCatmullRomCurve,
    createBufferedCorridor,
    createMeasureWitnessTicks,
    createPointCollectionData
} from "../../../functions/map";

function getMarkerIconSvg(type) {
    switch (type) {
        case "structure":
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
        case "valve":
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
        case "flora":
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7l-3-4.5a1 1 0 0 0-1.7 0l-3 4.5a1 1 0 0 0 .8 1.7H12l-3 3.3a1 1 0 0 0 .7 1.7H10l-3 3.3a1 1 0 0 0 .7 1.7H13Z"/></svg>`;
        case "inspection":
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;
        case "fixture":
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
        case "home":
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
        case "apartment":
        case "unit":
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;
    }
}

function getMarkerColor(type) {
    switch (type) {
        case "structure":
        case "home":
            return "#4f46e5"; // Indigo
        case "apartment":
        case "unit":
            return "#6366f1";
        case "valve":
            return "#ef4444"; // Red
        case "flora":
            return "#10b981"; // Emerald
        case "inspection":
            return "#f59e0b"; // Amber
        case "fixture":
            return "#06b6d4"; // Cyan
        case "callout":
            return "#8b5cf6"; // Purple
        default:
            return "#3b82f6"; // Blue
    }
}

const MapComponent = forwardRef(function MapComponent({
    layer, lngLat, markers, canvasTool,
    createdCanvasObject, deletedCanvasObject,
    getMetadata, onSelect, onCloseSidebar,
    onDrawingStateChange
}, ref) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef({});
    const [isLoaded, setIsLoaded] = useState(false);
    const settings = useSelector(state => state.settings);

    // Active in-flight drawing state
    const drawingPointsRef = useRef([]);
    const isDrawingRef = useRef(false);
    const activeToolRef = useRef(canvasTool);

    const canvasToolRef = useRef(canvasTool);
    const createdCanvasObjectRef = useRef(createdCanvasObject);
    const getMetadataRef = useRef(getMetadata);
    const onSelectRef = useRef(onSelect);
    const onCloseSidebarRef = useRef(onCloseSidebar);
    const onDrawingStateChangeRef = useRef(onDrawingStateChange);

    useEffect(() => {
        canvasToolRef.current = canvasTool;
        activeToolRef.current = canvasTool;
        // If tool changes away from current drawing tool, cancel drawing
        if (!canvasTool?.type && isDrawingRef.current) {
            cancelDrawing();
        }
    }, [canvasTool]);

    useEffect(() => { createdCanvasObjectRef.current = createdCanvasObject; }, [createdCanvasObject]);
    useEffect(() => { getMetadataRef.current = getMetadata; }, [getMetadata]);
    useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
    useEffect(() => { onCloseSidebarRef.current = onCloseSidebar; }, [onCloseSidebar]);
    useEffect(() => { onDrawingStateChangeRef.current = onDrawingStateChange; }, [onDrawingStateChange]);

    const updateMapCursor = useCallback((cursor) => {
        const map = mapInstance.current;
        if (!map) return;
        const canvas = map.getCanvas();
        if (canvas) canvas.style.cursor = cursor;
    }, []);

    // Create custom styled DOM marker
    const createMarkerElement = useCallback((m) => {
        const type = (m.type || "marker").toLowerCase();
        const color = getMarkerColor(type);
        const iconSvg = getMarkerIconSvg(type);

        const container = document.createElement("div");
        container.className = `map-custom-marker ${type}-marker`;
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.cursor = "pointer";
        container.style.userSelect = "none";

        if (type === "callout") {
            const bubble = document.createElement("div");
            bubble.style.backgroundColor = "rgba(15, 23, 42, 0.95)";
            bubble.style.color = "#f8fafc";
            bubble.style.border = "1.5px solid rgba(139, 92, 246, 0.6)";
            bubble.style.borderRadius = "8px";
            bubble.style.padding = "6px 12px";
            bubble.style.fontSize = "13px";
            bubble.style.fontWeight = "500";
            bubble.style.boxShadow = "0 6px 18px rgba(0,0,0,0.55)";
            bubble.style.maxWidth = "260px";
            bubble.style.minWidth = "80px";
            bubble.style.minHeight = "20px";
            bubble.style.wordBreak = "break-word";
            bubble.style.whiteSpace = "pre-line";
            bubble.style.cursor = "text";
            bubble.style.userSelect = "text";
            bubble.style.outline = "none";
            bubble.style.transition = "border-color 0.2s, box-shadow 0.2s";

            const currentText = m.name || m.extra_info?.text || "Click to type note...";
            bubble.innerText = currentText;

            bubble.setAttribute("contenteditable", "true");
            bubble.setAttribute("spellcheck", "false");
            bubble.setAttribute("role", "textbox");
            bubble.title = "Click to edit text directly";

            bubble.addEventListener("focus", (e) => {
                e.stopPropagation();
                bubble.style.borderColor = "#a78bfa";
                bubble.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.4), 0 8px 22px rgba(0,0,0,0.6)";
                if (bubble.innerText === "Click to type note..." || bubble.innerText === "Text Callout") {
                    bubble.innerText = "";
                }
            });

            bubble.addEventListener("blur", () => {
                bubble.style.borderColor = "rgba(139, 92, 246, 0.6)";
                bubble.style.boxShadow = "0 6px 18px rgba(0,0,0,0.55)";
                const trimmed = bubble.innerText.trim();
                const finalText = trimmed || "Note Callout";
                if (!trimmed) bubble.innerText = finalText;
                if (finalText !== currentText) {
                    createdCanvasObjectRef.current?.({
                        ...m,
                        name: finalText,
                        text: finalText,
                        extra_info: { ...(m.extra_info || {}), text: finalText }
                    });
                }
            });

            bubble.addEventListener("keydown", (e) => {
                e.stopPropagation(); // Stop hotkeys (V, P, Space, etc.) while typing
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    bubble.blur();
                } else if (e.key === "Escape") {
                    bubble.innerText = currentText;
                    bubble.blur();
                }
            });

            bubble.addEventListener("keyup", (e) => e.stopPropagation());
            bubble.addEventListener("keypress", (e) => e.stopPropagation());
            bubble.addEventListener("click", (e) => {
                e.stopPropagation();
                bubble.focus();
            });
            bubble.addEventListener("mousedown", (e) => e.stopPropagation());

            const arrow = document.createElement("div");
            arrow.style.width = "0";
            arrow.style.height = "0";
            arrow.style.borderLeft = "6px solid transparent";
            arrow.style.borderRight = "6px solid transparent";
            arrow.style.borderTop = "6px solid rgba(15, 23, 42, 0.95)";
            arrow.style.margin = "0 auto";

            container.appendChild(bubble);
            container.appendChild(arrow);

            if (m.isNewlyCreated) {
                setTimeout(() => {
                    bubble.focus();
                    const range = document.createRange();
                    range.selectNodeContents(bubble);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }, 60);
            }

            return container;
        }

        const badge = document.createElement("div");
        badge.style.width = "30px";
        badge.style.height = "30px";
        badge.style.borderRadius = "50%";
        badge.style.backgroundColor = color;
        badge.style.color = "#ffffff";
        badge.style.display = "flex";
        badge.style.alignItems = "center";
        badge.style.justifyContent = "center";
        badge.style.boxShadow = "0 3px 10px rgba(0,0,0,0.45), 0 0 0 2px #ffffff";
        badge.style.transition = "transform 0.15s ease";

        if (m.icon && (m.icon.startsWith("http") || m.icon.startsWith("/") || m.icon.startsWith("data:"))) {
            const img = document.createElement("img");
            img.src = m.icon;
            img.style.width = "18px";
            img.style.height = "18px";
            img.style.display = "block";
            badge.appendChild(img);
        } else if (m.icon && m.icon.length <= 4) {
            badge.innerText = m.icon;
            badge.style.fontSize = "14px";
        } else {
            badge.innerHTML = iconSvg;
        }

        container.appendChild(badge);

        if (m.name) {
            const label = document.createElement("div");
            label.className = "map-marker-label";
            label.innerText = m.name;
            label.style.fontSize = "11px";
            label.style.fontWeight = "600";
            label.style.color = (settings.theme === "light") ? "#0f172a" : "#f8fafc";
            label.style.textShadow = (settings.theme === "light")
                ? "0 1px 3px rgba(255,255,255,0.9)"
                : "0 1px 4px rgba(0,0,0,1)";
            label.style.marginTop = "3px";
            label.style.whiteSpace = "nowrap";
            container.appendChild(label);
        }

        return container;
    }, [settings.theme]);

    // Create simple point pin
    const createPointMarker = useCallback((lng, lat, tool) => {
        const markerId = `temp-${tool.type}-${Math.random().toString(36).substr(2, 9)}`;
        const name = tool.name || tool.type.charAt(0).toUpperCase() + tool.type.slice(1);
        createdCanvasObjectRef.current?.({
            id: markerId,
            type: tool.type,
            name,
            icon: tool.icon || null,
            lng,
            lat,
            source: "canvas",
            isNewlyCreated: tool.type === "callout"
        });
    }, []);

    // Radius tool
    const createRadiusTool = useCallback((lng, lat, initialRadius = 500, existingId = null, existingName = null, hLng = null, hLat = null) => {
        const map = mapInstance.current;
        if (!map) return;
        const radiusId = existingId || `temp-radius-${Math.random().toString(36).substr(2, 9)}`;
        const radiusName = existingName || "Radius Zone";
        const centerId = `${radiusId}-center`;
        const handleId = `${radiusId}-handle`;
        const handlePos = (hLng && hLat) ? { lng: hLng, lat: hLat } : getHandlePosition(lng, lat, initialRadius);

        [radiusId, `${radiusId}-outline`, centerId, handleId].forEach(sId => {
            if (map.getLayer(sId)) map.removeLayer(sId);
            if (map.getSource(sId)) map.removeSource(sId);
        });

        map.addSource(centerId, { type: "geojson", data: { type: "Feature", properties: { id: radiusId, part: "center" }, geometry: { type: "Point", coordinates: [lng, lat] } } });
        map.addSource(handleId, { type: "geojson", data: { type: "Feature", properties: { id: radiusId, part: "handle" }, geometry: { type: "Point", coordinates: [handlePos.lng, handlePos.lat] } } });
        map.addSource(radiusId, { type: "geojson", data: createRadiusData(lng, lat, initialRadius, handlePos.lng, handlePos.lat, radiusId) });

        map.addLayer({ id: radiusId, type: "fill", source: radiusId, paint: { "fill-color": "#8B5CF6", "fill-opacity": 0.18 } });
        map.addLayer({ id: `${radiusId}-outline`, type: "line", source: radiusId, paint: { "line-color": "#8B5CF6", "line-width": 2, "line-dasharray": [2, 2] } });
        map.addLayer({ id: `${centerId}-layer`, type: "circle", source: centerId, paint: { "circle-radius": 6, "circle-color": "#8B5CF6", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
        map.addLayer({ id: `${handleId}-layer`, type: "circle", source: handleId, paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-width": 2, "circle-stroke-color": "#8B5CF6" } });

        const labelDiv = document.createElement("div");
        labelDiv.className = "map-marker-label";
        labelDiv.style.color = settings.theme === "light" ? "#111827" : "#f8fafc";
        labelDiv.style.textShadow = "0 1px 3px rgba(0,0,0,0.9)";
        labelDiv.style.fontSize = "11px";
        labelDiv.style.fontWeight = "600";
        labelDiv.style.textAlign = "center";
        const labelMarker = new maplibregl.Marker({ element: labelDiv, anchor: "top" }).setLngLat([lng, lat]).addTo(map);

        const sync = () => {
            const cSource = map.getSource(centerId), hSource = map.getSource(handleId);
            if (!cSource || !hSource) return;
            const c = cSource.serialize().data.geometry.coordinates, h = hSource.serialize().data.geometry.coordinates;
            const r = mercatorDistance(c[0], c[1], h[0], h[1]);
            const radiusVal = formatDistance(r);
            const areaVal = formatArea(Math.PI * r * r);
            labelDiv.innerText = `${radiusName}\nRadius: ${radiusVal} • ${areaVal}`;
            labelMarker.setLngLat([c[0], c[1]]);
            map.getSource(radiusId)?.setData(createRadiusData(c[0], c[1], r, h[0], h[1], radiusId));
        };
        sync();

        markersRef.current[radiusId] = { type: "radius", centerId, handleId, labelMarker, sync };
        if (!existingId) {
            createdCanvasObjectRef.current?.({
                id: radiusId,
                type: "radius",
                name: radiusName,
                lng,
                lat,
                radius: initialRadius,
                handleLng: handlePos.lng,
                handleLat: handlePos.lat,
                source: "canvas"
            });
        }
    }, [settings.theme]);

    // Helper to completely remove all sub-layers and sources for a shape ID
    const cleanupShapeLayers = useCallback((map, id) => {
        if (!map) return;
        const subLayerIds = [
            id,
            `${id}-fill`,
            `${id}-casing`,
            `${id}-outline`,
            `${id}-outline-casing`,
            `${id}-line`,
            `${id}-ticks`,
            `${id}-corridor`,
            `${id}-buffer`,
            `${id}-pts`,
            `${id}-setback-inner`,
            `${id}-center`,
            `${id}-handle`,
            `${id}-center-layer`,
            `${id}-handle-layer`,
            `${id}-start`,
            `${id}-end`,
            `${id}-spoke`
        ];
        const subSourceIds = [
            id,
            `${id}-poly-src`,
            `${id}-line-src`,
            `${id}-corridor-src`,
            `${id}-buffer-src`,
            `${id}-ticks-src`,
            `${id}-pts-src`,
            `${id}-center`,
            `${id}-handle`,
            `${id}-start`,
            `${id}-end`
        ];
        subLayerIds.forEach(lId => {
            if (map.getLayer(lId)) map.removeLayer(lId);
        });
        subSourceIds.forEach(sId => {
            if (map.getSource(sId)) map.removeSource(sId);
        });
    }, []);

    // Render polygon / rectangle / material / closed curve bed shape
    const renderPolygonShape = useCallback((m) => {
        const map = mapInstance.current;
        if (!map) return;
        const id = String(m.id);
        const coords = m.coordinates?.[0] || m.coordinates || [];
        if (coords.length < 3) return;

        cleanupShapeLayers(map, id);

        const isCurveBed = m.type === "curve";
        const isMaterial = m.type === "material";
        const isRect = m.type === "rectangle";

        const color = m.color || (isRect ? "#10b981" : isMaterial ? (m.materialType === "water" ? "#06b6d4" : "#22c55e") : isCurveBed ? "#10b981" : "#3b82f6");
        const opacity = isMaterial ? 0.35 : isCurveBed ? 0.28 : 0.20;

        map.addSource(`${id}-poly-src`, {
            type: "geojson",
            data: createPolygonData(coords, id)
        });

        // 1. Fill layer
        map.addLayer({
            id: `${id}-fill`,
            type: "fill",
            source: `${id}-poly-src`,
            paint: { "fill-color": color, "fill-opacity": opacity }
        });

        // 2. High-contrast dark casing under outline (guarantees visibility against satellite / grass / light backgrounds)
        map.addLayer({
            id: `${id}-outline-casing`,
            type: "line",
            source: `${id}-poly-src`,
            paint: { "line-color": "rgba(0, 0, 0, 0.65)", "line-width": 4.5 }
        });

        // 3. Colored outline line
        map.addLayer({
            id: `${id}-outline`,
            type: "line",
            source: `${id}-poly-src`,
            paint: {
                "line-color": color,
                "line-width": 2.5,
                ...(isMaterial ? { "line-dasharray": [4, 2] } : {})
            }
        });

        // Center badge label
        const areaVal = m.area ? formatArea(m.area) : formatArea(calculatePolygonArea(coords));
        const centerLng = m.lng || coords[0][0];
        const centerLat = m.lat || coords[0][1];

        let badgeTitle = m.name;
        if (!badgeTitle) {
            if (isRect) badgeTitle = "Footprint";
            else if (isCurveBed) badgeTitle = "Landscape Bed";
            else if (isMaterial) badgeTitle = "Material Surface";
            else badgeTitle = "Boundary";
        }

        const labelDiv = document.createElement("div");
        labelDiv.style.backgroundColor = "rgba(15, 23, 42, 0.92)";
        labelDiv.style.color = "#f8fafc";
        labelDiv.style.border = `1.5px solid ${color}`;
        labelDiv.style.borderRadius = "6px";
        labelDiv.style.padding = "3px 8px";
        labelDiv.style.fontSize = "11px";
        labelDiv.style.fontWeight = "600";
        labelDiv.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
        labelDiv.style.whiteSpace = "nowrap";
        labelDiv.style.cursor = "pointer";
        labelDiv.innerText = `${isCurveBed ? "🌿 " : isMaterial ? "🎨 " : ""}${badgeTitle}: ${areaVal}`;

        const labelMarker = new maplibregl.Marker({ element: labelDiv, anchor: "center" })
            .setLngLat([centerLng, centerLat])
            .addTo(map);

        labelDiv.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelectRef.current?.(m);
        });

        markersRef.current[id] = { type: m.type, labelMarker };
    }, [cleanupShapeLayers]);

    // Render line / measure / utility / setback / open curve
    const renderLineShape = useCallback((m) => {
        const map = mapInstance.current;
        if (!map) return;
        const id = String(m.id);
        const coords = m.coordinates || [[m.lng, m.lat], [m.endLng || m.end_lng, m.endLat || m.end_lat]];
        if (coords.length < 2 || !coords[0] || !coords[1]) return;

        cleanupShapeLayers(map, id);

        const distVal = formatDistance(m.distance || calculatePathDistance(coords));
        const midIndex = Math.floor(coords.length / 2);
        const midPoint = coords[midIndex] || coords[0];

        // 1. TAPE MEASURE with CAD Dimension Corridor & Witness Ticks
        if (m.type === "measure") {
            const corridorGeoJson = createBufferedCorridor(coords, 3.5, `${id}-corridor-src`);
            if (corridorGeoJson) {
                map.addSource(`${id}-corridor-src`, { type: "geojson", data: corridorGeoJson });
                map.addLayer({
                    id: `${id}-corridor`,
                    type: "fill",
                    source: `${id}-corridor-src`,
                    paint: { "fill-color": "#38bdf8", "fill-opacity": 0.20 }
                });
            }

            const ticksGeoJson = createMeasureWitnessTicks(coords, 6, `${id}-ticks-src`);
            if (ticksGeoJson) {
                map.addSource(`${id}-ticks-src`, { type: "geojson", data: ticksGeoJson });
                map.addLayer({
                    id: `${id}-ticks`,
                    type: "line",
                    source: `${id}-ticks-src`,
                    paint: { "line-color": "#0284c7", "line-width": 2.2 }
                });
            }

            map.addSource(`${id}-line-src`, { type: "geojson", data: createPolylineData(coords, `${id}-line-src`) });
            map.addLayer({
                id: `${id}-casing`,
                type: "line",
                source: `${id}-line-src`,
                paint: { "line-color": "rgba(0, 0, 0, 0.65)", "line-width": 4.5 }
            });
            map.addLayer({
                id: `${id}-line`,
                type: "line",
                source: `${id}-line-src`,
                paint: { "line-color": "#0284c7", "line-width": 2.5, "line-dasharray": [4, 2] }
            });

            map.addSource(`${id}-pts-src`, { type: "geojson", data: createPointCollectionData(coords, `${id}-pts-src`) });
            map.addLayer({
                id: `${id}-pts`,
                type: "circle",
                source: `${id}-pts-src`,
                paint: {
                    "circle-radius": 5,
                    "circle-color": "#38bdf8",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#ffffff"
                }
            });

            const labelDiv = document.createElement("div");
            labelDiv.style.backgroundColor = "#0f172a";
            labelDiv.style.color = "#38bdf8";
            labelDiv.style.border = "1.5px solid #0284c7";
            labelDiv.style.borderRadius = "6px";
            labelDiv.style.padding = "3px 8px";
            labelDiv.style.fontSize = "11px";
            labelDiv.style.fontWeight = "700";
            labelDiv.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
            labelDiv.style.whiteSpace = "nowrap";
            labelDiv.style.cursor = "pointer";
            labelDiv.innerText = `📏 ${m.name || "Tape Measure"}: ${distVal}`;

            const labelMarker = new maplibregl.Marker({ element: labelDiv, anchor: "bottom" })
                .setLngLat(midPoint)
                .addTo(map);

            labelDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                onSelectRef.current?.(m);
            });

            markersRef.current[id] = { type: m.type, labelMarker };
            return;
        }

        // 2. SETBACK GUIDE with Zoning Buffer Zone Exclusion Overlay
        if (m.type === "setback") {
            const corridorGeoJson = createBufferedCorridor(coords, 7.62, `${id}-buffer-src`);
            if (corridorGeoJson) {
                map.addSource(`${id}-buffer-src`, { type: "geojson", data: corridorGeoJson });
                map.addLayer({
                    id: `${id}-buffer`,
                    type: "fill",
                    source: `${id}-buffer-src`,
                    paint: { "fill-color": "#f59e0b", "fill-opacity": 0.22 }
                });
                map.addLayer({
                    id: `${id}-setback-inner`,
                    type: "line",
                    source: `${id}-buffer-src`,
                    paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [4, 3] }
                });
            }

            map.addSource(`${id}-line-src`, { type: "geojson", data: createPolylineData(coords, `${id}-line-src`) });
            map.addLayer({
                id: `${id}-casing`,
                type: "line",
                source: `${id}-line-src`,
                paint: { "line-color": "rgba(0, 0, 0, 0.65)", "line-width": 4.5 }
            });
            map.addLayer({
                id: `${id}-line`,
                type: "line",
                source: `${id}-line-src`,
                paint: { "line-color": "#d97706", "line-width": 2.5 }
            });

            const labelDiv = document.createElement("div");
            labelDiv.style.backgroundColor = "#0f172a";
            labelDiv.style.color = "#fbbf24";
            labelDiv.style.border = "1.5px solid #f59e0b";
            labelDiv.style.borderRadius = "6px";
            labelDiv.style.padding = "3px 8px";
            labelDiv.style.fontSize = "11px";
            labelDiv.style.fontWeight = "700";
            labelDiv.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
            labelDiv.style.whiteSpace = "nowrap";
            labelDiv.style.cursor = "pointer";
            labelDiv.innerText = `⚠️ Setback Guide: 25 ft Zone (${distVal})`;

            const labelMarker = new maplibregl.Marker({ element: labelDiv, anchor: "bottom" })
                .setLngLat(midPoint)
                .addTo(map);

            labelDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                onSelectRef.current?.(m);
            });

            markersRef.current[id] = { type: m.type, labelMarker };
            return;
        }

        // 3. UTILITY RUN
        if (m.type === "utility") {
            const uColor = m.color || (m.utilityType === "water" ? "#0284c7" : m.utilityType === "gas" ? "#eab308" : m.utilityType === "sewer" ? "#16a34a" : "#f97316");
            const corridorGeoJson = createBufferedCorridor(coords, 2, `${id}-corridor-src`);
            if (corridorGeoJson) {
                map.addSource(`${id}-corridor-src`, { type: "geojson", data: corridorGeoJson });
                map.addLayer({
                    id: `${id}-corridor`,
                    type: "fill",
                    source: `${id}-corridor-src`,
                    paint: { "fill-color": uColor, "fill-opacity": 0.22 }
                });
            }

            map.addSource(`${id}-line-src`, { type: "geojson", data: createPolylineData(coords, `${id}-line-src`) });
            map.addLayer({
                id: `${id}-casing`,
                type: "line",
                source: `${id}-line-src`,
                paint: { "line-color": "rgba(0, 0, 0, 0.65)", "line-width": 5 }
            });
            map.addLayer({
                id: `${id}-line`,
                type: "line",
                source: `${id}-line-src`,
                paint: { "line-color": uColor, "line-width": 3.5 }
            });

            const labelDiv = document.createElement("div");
            labelDiv.style.backgroundColor = "rgba(15, 23, 42, 0.92)";
            labelDiv.style.color = "#f8fafc";
            labelDiv.style.border = `1.5px solid ${uColor}`;
            labelDiv.style.borderRadius = "6px";
            labelDiv.style.padding = "2px 6px";
            labelDiv.style.fontSize = "10px";
            labelDiv.style.fontWeight = "600";
            labelDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
            labelDiv.style.whiteSpace = "nowrap";
            labelDiv.style.cursor = "pointer";
            labelDiv.innerText = `⚡ ${m.name || "Utility"}: ${distVal}`;

            const labelMarker = new maplibregl.Marker({ element: labelDiv, anchor: "bottom" })
                .setLngLat(midPoint)
                .addTo(map);

            labelDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                onSelectRef.current?.(m);
            });

            markersRef.current[id] = { type: m.type, labelMarker };
            return;
        }

        // 4. Default Line or Open Landscape Curve
        const color = m.color || (m.type === "curve" ? "#10b981" : "#ef4444");
        map.addSource(`${id}-line-src`, { type: "geojson", data: createPolylineData(coords, `${id}-line-src`) });
        map.addLayer({
            id: `${id}-casing`,
            type: "line",
            source: `${id}-line-src`,
            paint: { "line-color": "rgba(0, 0, 0, 0.65)", "line-width": 4.5 }
        });
        map.addLayer({
            id: `${id}-line`,
            type: "line",
            source: `${id}-line-src`,
            paint: { "line-color": color, "line-width": 3 }
        });

        const labelDiv = document.createElement("div");
        labelDiv.style.backgroundColor = "rgba(15, 23, 42, 0.92)";
        labelDiv.style.color = "#f8fafc";
        labelDiv.style.border = `1.5px solid ${color}`;
        labelDiv.style.borderRadius = "6px";
        labelDiv.style.padding = "2px 6px";
        labelDiv.style.fontSize = "10px";
        labelDiv.style.fontWeight = "600";
        labelDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
        labelDiv.style.whiteSpace = "nowrap";
        labelDiv.style.cursor = "pointer";
        labelDiv.innerText = `${m.type === "curve" ? "🌿 " : ""}${m.name || m.type}: ${distVal}`;

        const labelMarker = new maplibregl.Marker({ element: labelDiv, anchor: "bottom" })
            .setLngLat(midPoint)
            .addTo(map);

        labelDiv.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelectRef.current?.(m);
        });

        markersRef.current[id] = { type: m.type, labelMarker };
    }, [cleanupShapeLayers]);

    // Cleanup interactive drawing preview layers
    const clearDrawingPreview = useCallback(() => {
        const map = mapInstance.current;
        if (!map) return;
        const previewLayerIds = [
            "draw-preview-fill-layer",
            "draw-preview-line-casing",
            "draw-preview-line-layer",
            "draw-preview-ticks-layer",
            "draw-preview-points-layer"
        ];
        const previewSourceIds = [
            "draw-preview-fill-src",
            "draw-preview-line-src",
            "draw-preview-ticks-src",
            "draw-preview-points-src"
        ];
        previewLayerIds.forEach(lId => {
            if (map.getLayer(lId)) map.removeLayer(lId);
        });
        previewSourceIds.forEach(sId => {
            if (map.getSource(sId)) map.removeSource(sId);
        });
    }, []);

    // Cancel current drawing
    const cancelDrawing = useCallback(() => {
        drawingPointsRef.current = [];
        isDrawingRef.current = false;
        clearDrawingPreview();
        onDrawingStateChangeRef.current?.({ inProgress: false, points: [], liveMetrics: "" });
    }, [clearDrawingPreview]);

    // Finish current drawing
    const finishDrawing = useCallback(() => {
        const pts = drawingPointsRef.current;
        const tool = activeToolRef.current;
        if (!tool || pts.length < 2) {
            cancelDrawing();
            return;
        }

        const id = `temp-${tool.type}-${Math.random().toString(36).substr(2, 9)}`;

        if (tool.type === "polygon" || tool.type === "material") {
            if (pts.length < 3) {
                cancelDrawing();
                return;
            }
            const closedCoords = [...pts, pts[0]];
            const area = calculatePolygonArea(closedCoords);
            const perimeter = calculatePathDistance(closedCoords);
            const centerLng = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
            const centerLat = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;

            createdCanvasObjectRef.current?.({
                id,
                type: tool.type,
                name: tool.name || (tool.type === "material" ? "Material Surface" : "Property Boundary"),
                lng: centerLng,
                lat: centerLat,
                coordinates: [closedCoords],
                area,
                perimeter,
                color: tool.color || (tool.type === "material" ? "#22c55e" : "#3b82f6"),
                materialType: tool.materialType || (tool.type === "material" ? "lawn" : null),
                source: "canvas"
            });
        } else if (tool.type === "rectangle") {
            if (pts.length < 2) {
                cancelDrawing();
                return;
            }
            const rectRing = createRectangleCoords(pts[0], pts[1]);
            const area = calculatePolygonArea(rectRing);
            const perimeter = calculatePathDistance(rectRing);
            const centerLng = (pts[0][0] + pts[1][0]) / 2;
            const centerLat = (pts[0][1] + pts[1][1]) / 2;

            createdCanvasObjectRef.current?.({
                id,
                type: "rectangle",
                name: tool.name || "Building Footprint",
                lng: centerLng,
                lat: centerLat,
                coordinates: [rectRing],
                area,
                perimeter,
                color: "#10b981",
                source: "canvas"
            });
        } else if (tool.type === "curve") {
            if (pts.length >= 3) {
                const smoothRing = createClosedCatmullRomCurve(pts, 12);
                const area = calculatePolygonArea(smoothRing);
                const perimeter = calculatePathDistance(smoothRing);
                const centerLng = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
                const centerLat = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;

                createdCanvasObjectRef.current?.({
                    id,
                    type: "curve",
                    name: tool.name || "Landscape Bed",
                    lng: centerLng,
                    lat: centerLat,
                    isClosed: true,
                    coordinates: [smoothRing],
                    controlPoints: pts,
                    area,
                    perimeter,
                    color: "#10b981",
                    source: "canvas"
                });
            } else if (pts.length === 2) {
                const smooth = createCatmullRomCurve(pts, 12);
                const dist = calculatePathDistance(smooth);
                createdCanvasObjectRef.current?.({
                    id,
                    type: "curve",
                    name: "Landscape Border",
                    lng: pts[0][0],
                    lat: pts[0][1],
                    isClosed: false,
                    coordinates: smooth,
                    controlPoints: pts,
                    distance: dist,
                    color: "#10b981",
                    source: "canvas"
                });
            }
        } else if (tool.type === "measure") {
            const dist = calculatePathDistance(pts);
            createdCanvasObjectRef.current?.({
                id,
                type: "measure",
                name: tool.name || "Tape Measure",
                lng: pts[0][0],
                lat: pts[0][1],
                coordinates: pts,
                distance: dist,
                color: "#0284c7",
                source: "canvas"
            });
        } else if (tool.type === "setback") {
            const dist = calculatePathDistance(pts);
            createdCanvasObjectRef.current?.({
                id,
                type: "setback",
                name: tool.name || "Setback Guide (25 ft)",
                lng: pts[0][0],
                lat: pts[0][1],
                coordinates: pts,
                distance: dist,
                setbackDepth: 25,
                color: "#f59e0b",
                source: "canvas"
            });
        } else if (["utility", "line"].includes(tool.type)) {
            const dist = calculatePathDistance(pts);
            createdCanvasObjectRef.current?.({
                id,
                type: tool.type,
                name: tool.name || "Utility Line",
                lng: pts[0][0],
                lat: pts[0][1],
                coordinates: pts,
                distance: dist,
                color: tool.color || "#f97316",
                utilityType: tool.utilityType || null,
                source: "canvas"
            });
        }

        cancelDrawing();
    }, [cancelDrawing]);

    // Expose finish and cancel methods via ref
    useImperativeHandle(ref, () => ({
        finishDrawing,
        cancelDrawing
    }));

    // Update in-flight drawing preview on map
    const updateDrawingPreview = useCallback((currentCursorLngLat) => {
        const map = mapInstance.current;
        if (!map || !isDrawingRef.current) return;
        const pts = [...drawingPointsRef.current];
        if (currentCursorLngLat) pts.push(currentCursorLngLat);
        if (pts.length === 0) return;

        const tool = activeToolRef.current;
        const type = tool?.type;

        let fillGeoJson = null;
        let lineGeoJson = null;
        let ticksGeoJson = null;
        let pointsGeoJson = null;
        let metrics = "";

        let lineColor = tool?.color || "#3b82f6";
        let fillColor = tool?.color || "#3b82f6";
        let fillOpacity = 0.22;
        let lineDash = [3, 2];

        if (type === "curve") {
            lineColor = "#059669";
            fillColor = "#10b981";
            fillOpacity = 0.28;
            lineDash = [];
            pointsGeoJson = createPointCollectionData(pts, "draw-preview-points-src");

            if (pts.length >= 3) {
                const smoothRing = createClosedCatmullRomCurve(pts, 12);
                fillGeoJson = createPolygonData(smoothRing, "draw-preview-fill-src");
                lineGeoJson = createPolylineData(smoothRing, "draw-preview-line-src");
                metrics = `🌿 Bed Area: ${formatArea(calculatePolygonArea(smoothRing))} • ${pts.length} pts (Click first point or Enter to close)`;
            } else if (pts.length === 2) {
                const smooth = createCatmullRomCurve(pts, 12);
                lineGeoJson = createPolylineData(smooth, "draw-preview-line-src");
                metrics = `🌿 Bed Length: ${formatDistance(calculatePathDistance(smooth))} • 2 pts`;
            } else {
                metrics = `🌿 1 pt placed (click to draw curved bed)`;
            }
        } else if (type === "measure") {
            lineColor = "#0284c7";
            fillColor = "#38bdf8";
            fillOpacity = 0.20;
            lineDash = [4, 2];

            pointsGeoJson = createPointCollectionData(pts, "draw-preview-points-src");
            lineGeoJson = createPolylineData(pts, "draw-preview-line-src");
            if (pts.length >= 2) {
                fillGeoJson = createBufferedCorridor(pts, 3.5, "draw-preview-fill-src");
                ticksGeoJson = createMeasureWitnessTicks(pts, 6, "draw-preview-ticks-src");
                metrics = `📏 Distance: ${formatDistance(calculatePathDistance(pts))} • ${pts.length} pts`;
            } else {
                metrics = `📏 Click next point to measure distance`;
            }
        } else if (type === "setback") {
            lineColor = "#d97706";
            fillColor = "#f59e0b";
            fillOpacity = 0.22;
            lineDash = [4, 2];

            pointsGeoJson = createPointCollectionData(pts, "draw-preview-points-src");
            lineGeoJson = createPolylineData(pts, "draw-preview-line-src");
            if (pts.length >= 2) {
                fillGeoJson = createBufferedCorridor(pts, 7.62, "draw-preview-fill-src");
                metrics = `⚠️ Setback Guide: 25 ft Zone Buffer (${formatDistance(calculatePathDistance(pts))})`;
            } else {
                metrics = `⚠️ Click boundary edge to generate 25 ft setback buffer`;
            }
        } else if (type === "material") {
            const matColor = tool?.color || "#22c55e";
            lineColor = matColor;
            fillColor = matColor;
            fillOpacity = 0.35;
            lineDash = [4, 2];

            pointsGeoJson = createPointCollectionData(pts, "draw-preview-points-src");
            if (pts.length >= 3) {
                const ring = [...pts, pts[0]];
                fillGeoJson = createPolygonData(ring, "draw-preview-fill-src");
                lineGeoJson = createPolylineData(ring, "draw-preview-line-src");
                metrics = `🎨 Material Surface: ${formatArea(calculatePolygonArea(ring))} • ${pts.length} pts`;
            } else {
                lineGeoJson = createPolylineData(pts, "draw-preview-line-src");
                metrics = `🎨 ${pts.length} pts (click to enclose material)`;
            }
        } else if (type === "polygon") {
            lineColor = tool?.color || "#3b82f6";
            fillColor = tool?.color || "#3b82f6";
            fillOpacity = 0.22;
            lineDash = [3, 2];

            pointsGeoJson = createPointCollectionData(pts, "draw-preview-points-src");
            if (pts.length >= 3) {
                const ring = [...pts, pts[0]];
                fillGeoJson = createPolygonData(ring, "draw-preview-fill-src");
                lineGeoJson = createPolylineData(ring, "draw-preview-line-src");
                metrics = `${formatArea(calculatePolygonArea(ring))} • ${pts.length} pts`;
            } else {
                lineGeoJson = createPolylineData(pts, "draw-preview-line-src");
                metrics = `${pts.length} pts placed`;
            }
        } else if (type === "rectangle") {
            lineColor = "#10b981";
            fillColor = "#10b981";
            fillOpacity = 0.25;
            lineDash = [3, 2];

            if (pts.length >= 2) {
                const ring = createRectangleCoords(pts[0], pts[pts.length - 1]);
                fillGeoJson = createPolygonData(ring, "draw-preview-fill-src");
                lineGeoJson = createPolylineData(ring, "draw-preview-line-src");
                pointsGeoJson = createPointCollectionData([pts[0], pts[pts.length - 1]], "draw-preview-points-src");
                const w = mercatorDistance(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[0][1]);
                const l = mercatorDistance(pts[0][0], pts[0][1], pts[0][0], pts[pts.length - 1][1]);
                metrics = `${formatDistance(w)} × ${formatDistance(l)} (${formatArea(calculatePolygonArea(ring))})`;
            } else {
                pointsGeoJson = createPointCollectionData(pts, "draw-preview-points-src");
                metrics = `Click opposite corner to complete footprint`;
            }
        } else if (type === "utility") {
            const uColor = tool?.color || "#f97316";
            lineColor = uColor;
            fillColor = uColor;
            fillOpacity = 0.22;
            lineDash = [];

            pointsGeoJson = createPointCollectionData(pts, "draw-preview-points-src");
            lineGeoJson = createPolylineData(pts, "draw-preview-line-src");
            if (pts.length >= 2) {
                fillGeoJson = createBufferedCorridor(pts, 1.8, "draw-preview-fill-src");
                metrics = `⚡ ${tool.name || "Utility Run"}: ${formatDistance(calculatePathDistance(pts))}`;
            } else {
                metrics = `⚡ Click route to place utility run`;
            }
        } else {
            lineGeoJson = createPolylineData(pts, "draw-preview-line-src");
            metrics = formatDistance(calculatePathDistance(pts));
        }

        onDrawingStateChangeRef.current?.({
            inProgress: true,
            points: pts,
            liveMetrics: metrics
        });

        // 1. Fill preview source & layer
        const emptyGeoJson = { type: "FeatureCollection", features: [] };
        const fillSrc = map.getSource("draw-preview-fill-src");
        if (fillSrc) {
            fillSrc.setData(fillGeoJson || emptyGeoJson);
            if (map.getLayer("draw-preview-fill-layer")) {
                map.setPaintProperty("draw-preview-fill-layer", "fill-color", fillColor);
                map.setPaintProperty("draw-preview-fill-layer", "fill-opacity", fillOpacity);
            }
        } else {
            map.addSource("draw-preview-fill-src", { type: "geojson", data: fillGeoJson || emptyGeoJson });
            map.addLayer({
                id: "draw-preview-fill-layer",
                type: "fill",
                source: "draw-preview-fill-src",
                paint: { "fill-color": fillColor, "fill-opacity": fillOpacity }
            });
        }

        // 2. Line preview source & layers (casing + colored line)
        const lineSrc = map.getSource("draw-preview-line-src");
        if (lineSrc) {
            lineSrc.setData(lineGeoJson || emptyGeoJson);
            if (map.getLayer("draw-preview-line-layer")) {
                map.setPaintProperty("draw-preview-line-layer", "line-color", lineColor);
                if (lineDash.length > 0) {
                    map.setPaintProperty("draw-preview-line-layer", "line-dasharray", lineDash);
                }
            }
        } else {
            map.addSource("draw-preview-line-src", { type: "geojson", data: lineGeoJson || emptyGeoJson });
            map.addLayer({
                id: "draw-preview-line-casing",
                type: "line",
                source: "draw-preview-line-src",
                paint: { "line-color": "rgba(0, 0, 0, 0.65)", "line-width": 4.5 }
            });
            const layerDef = {
                id: "draw-preview-line-layer",
                type: "line",
                source: "draw-preview-line-src",
                paint: { "line-color": lineColor, "line-width": 2.5 }
            };
            if (lineDash.length > 0) layerDef.paint["line-dasharray"] = lineDash;
            map.addLayer(layerDef);
        }

        // 3. Ticks preview source & layer (for tape measure witness marks)
        if (ticksGeoJson) {
            const ticksSrc = map.getSource("draw-preview-ticks-src");
            if (ticksSrc) {
                ticksSrc.setData(ticksGeoJson);
            } else {
                map.addSource("draw-preview-ticks-src", { type: "geojson", data: ticksGeoJson });
                map.addLayer({
                    id: "draw-preview-ticks-layer",
                    type: "line",
                    source: "draw-preview-ticks-src",
                    paint: { "line-color": lineColor, "line-width": 2.2 }
                });
            }
        } else {
            const ticksSrc = map.getSource("draw-preview-ticks-src");
            if (ticksSrc) ticksSrc.setData(emptyGeoJson);
        }

        // 4. Points preview source & layer (vertex circle handles)
        if (pointsGeoJson) {
            const ptsSrc = map.getSource("draw-preview-points-src");
            if (ptsSrc) {
                ptsSrc.setData(pointsGeoJson);
                if (map.getLayer("draw-preview-points-layer")) {
                    map.setPaintProperty("draw-preview-points-layer", "circle-color", lineColor);
                }
            } else {
                map.addSource("draw-preview-points-src", { type: "geojson", data: pointsGeoJson });
                map.addLayer({
                    id: "draw-preview-points-layer",
                    type: "circle",
                    source: "draw-preview-points-src",
                    paint: {
                        "circle-radius": 5,
                        "circle-color": lineColor,
                        "circle-stroke-width": 2,
                        "circle-stroke-color": "#ffffff"
                    }
                });
            }
        } else {
            const ptsSrc = map.getSource("draw-preview-points-src");
            if (ptsSrc) ptsSrc.setData(emptyGeoJson);
        }
    }, []);

    // Initialize MapLibre
    useEffect(() => {
        if (mapInstance.current || !mapRef.current) return;

        let initialCenter = [-83.5, 32.9];
        if (lngLat && Array.isArray(lngLat) && !isNaN(lngLat[0]) && !isNaN(lngLat[1])) {
            initialCenter = lngLat;
        }

        const map = new maplibregl.Map({
            container: mapRef.current,
            center: initialCenter,
            zoom: 6,
            maxZoom: 19,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: "raster",
                        tiles: [
                            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        ],
                        tileSize: 256
                    },
                    satellite: {
                        type: "raster",
                        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
                        tileSize: 256
                    }
                },
                layers: [
                    { id: "osm-layer", type: "raster", source: "osm", layout: { visibility: "visible" } },
                    { id: "satellite-layer", type: "raster", source: "satellite", layout: { visibility: "none" } }
                ]
            }
        });
        mapInstance.current = map;

        map.on("load", () => {
            setIsLoaded(true);
        });

        // Click Handler
        map.on("click", (e) => {
            const tool = canvasToolRef.current;
            const currentPoint = [e.lngLat.lng, e.lngLat.lat];

            // If pan tool, do nothing
            if (tool?.type === "pan") return;

            // Check if user clicked on existing object feature
            const features = map.queryRenderedFeatures(e.point).filter(f => f.properties?.id);
            if (features.length > 0 && (!tool?.type || tool.type === "select")) {
                const meta = getMetadataRef.current?.(features[0].properties.id);
                if (meta) {
                    onSelectRef.current?.(meta);
                    return;
                }
            }

            // Interactive Geometry & Line Tools
            const isShapeTool = ["polygon", "rectangle", "measure", "utility", "setback", "curve", "material"].includes(tool?.type);
            if (isShapeTool) {
                if (!isDrawingRef.current) {
                    isDrawingRef.current = true;
                    drawingPointsRef.current = [currentPoint];
                    updateDrawingPreview(currentPoint);
                } else {
                    // Check if clicked close to start point for polygon
                    if (tool.type === "polygon" || tool.type === "material") {
                        const start = drawingPointsRef.current[0];
                        const distMeters = mercatorDistance(start[0], start[1], currentPoint[0], currentPoint[1]);
                        if (drawingPointsRef.current.length >= 3 && distMeters < 8) {
                            finishDrawing();
                            return;
                        }
                    } else if (tool.type === "rectangle") {
                        // 2nd click finishes rectangle
                        drawingPointsRef.current.push(currentPoint);
                        finishDrawing();
                        return;
                    }

                    drawingPointsRef.current.push(currentPoint);
                    updateDrawingPreview(currentPoint);
                }
                return;
            }

            // Radius Tool
            if (tool?.type === "radius") {
                createRadiusTool(e.lngLat.lng, e.lngLat.lat);
                return;
            }

            // Legacy Line Tool
            if (tool?.type === "line") {
                const end = mercatorToLngLat(lngLatToMercator(e.lngLat.lng, e.lngLat.lat).x + 300, lngLatToMercator(e.lngLat.lng, e.lngLat.lat).y);
                const lineId = `temp-line-${Math.random().toString(36).substr(2, 9)}`;
                createdCanvasObjectRef.current?.({
                    id: lineId,
                    type: "line",
                    name: "Line",
                    lng: e.lngLat.lng,
                    lat: e.lngLat.lat,
                    endLng: end.lng,
                    endLat: end.lat,
                    source: "canvas"
                });
                return;
            }

            // Single-click Point Tools (Structure, Valve, Flora, Inspection, Fixture, Callout, Marker, Icon)
            if (tool?.type) {
                createPointMarker(e.lngLat.lng, e.lngLat.lat, tool);
                return;
            }

            // Blank map click
            onCloseSidebarRef.current?.();
        });

        // Double click to finish polygon/line drawing
        map.on("dblclick", (e) => {
            if (isDrawingRef.current) {
                e.preventDefault();
                finishDrawing();
            }
        });

        // Mousemove handler for drawing preview rubberbanding
        map.on("mousemove", (e) => {
            if (isDrawingRef.current) {
                updateDrawingPreview([e.lngLat.lng, e.lngLat.lat]);
            }
        });

        // Radius drag handles
        let isDragging = false, dragId = null, dragPart = null;
        map.on("mousedown", (e) => {
            if (isDrawingRef.current) return;
            const feats = map.queryRenderedFeatures(e.point).filter(f => f.properties?.id);
            if (feats.length > 0 && feats[0].properties?.part) {
                e.preventDefault();
                isDragging = true;
                dragId = feats[0].properties.id;
                dragPart = feats[0].properties.part;
                map.dragPan.disable();
            }
        });

        map.on("mousemove", (e) => {
            if (!isDragging || !dragId || !dragPart) return;
            const measure = markersRef.current[dragId];
            if (measure && dragPart) {
                const s = map.getSource(`${dragId}-${dragPart}`);
                if (s) {
                    s.setData({
                        type: "Feature",
                        properties: { id: dragId, part: dragPart },
                        geometry: { type: "Point", coordinates: [e.lngLat.lng, e.lngLat.lat] }
                    });
                    measure.sync?.();
                }
            }
        });

        map.on("mouseup", (e) => {
            if (isDragging && dragId) {
                const m = markersRef.current[dragId], meta = getMetadataRef.current?.(dragId);
                if (m?.sync && meta) {
                    if (meta.type === "radius") {
                        const c = map.getSource(`${dragId}-center`).serialize().data.geometry.coordinates;
                        const h = map.getSource(`${dragId}-handle`).serialize().data.geometry.coordinates;
                        createdCanvasObjectRef.current?.({
                            ...meta,
                            lng: c[0],
                            lat: c[1],
                            radius: mercatorDistance(c[0], c[1], h[0], h[1]),
                            handleLng: h[0],
                            handleLat: h[1]
                        });
                    }
                }
            }
            isDragging = false;
            dragId = null;
            dragPart = null;
            map.dragPan.enable();
        });

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []);

    // Toggle base layers
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;
        ["osm-layer", "satellite-layer"].forEach(lId => {
            if (map.getLayer(lId)) map.setLayoutProperty(lId, "visibility", lId === layer ? "visible" : "none");
        });
    }, [layer, isLoaded]);

    // Fly to center
    useEffect(() => {
        const map = mapInstance.current;
        if (map && isLoaded && lngLat) map.flyTo({ center: lngLat, zoom: 14 });
    }, [lngLat, isLoaded]);

    const getMId = useCallback((m) => {
        if (m.id && !isNaN(m.id)) {
            const isProp = ["home", "apartment", "unit", "structure"].includes((m.type || "").toLowerCase());
            return `${isProp ? "prop" : "point"}-${m.id}`;
        }
        return String(m.id || `point-${Math.random().toString(36).substr(2, 9)}`);
    }, []);

    // Sync markers & geometries from props
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded || !markers) return;

        const currentIds = new Set(markers.map(m => getMId(m)));

        // Remove unmounted markers/layers
        Object.keys(markersRef.current).forEach(id => {
            if (!currentIds.has(id)) {
                const entry = markersRef.current[id];
                if (entry.marker) entry.marker.remove();
                if (entry.labelMarker) entry.labelMarker.remove();
                cleanupShapeLayers(map, id);
                delete markersRef.current[id];
            }
        });

        markers.forEach(m => {
            const id = getMId(m);
            const lng = m.lng || m.lngLat?.[0];
            const lat = m.lat || m.lngLat?.[1];
            if (!lng || !lat) return;

            const existing = markersRef.current[id];
            const type = (m.type || "marker").toLowerCase();

            if (existing) {
                // Update position if marker exists
                if (existing.marker) {
                    existing.marker.setLngLat([lng, lat]);
                    const label = existing.marker.getElement()?.querySelector(".map-marker-label");
                    if (label) label.innerText = m.name || "";
                }
            } else {
                // Mount new marker / shape
                if (type === "radius") {
                    createRadiusTool(lng, lat, m.radius || 500, id, m.name, m.handleLng, m.handleLat);
                } else if (type === "polygon" || type === "rectangle" || type === "material" || (type === "curve" && (m.isClosed || m.coordinates?.[0]?.length > 2))) {
                    renderPolygonShape({ ...m, id, lng, lat });
                } else if (["measure", "utility", "setback", "curve", "line"].includes(type)) {
                    renderLineShape({ ...m, id, lng, lat });
                } else {
                    // Specialized Pin or Callout
                    const markerElement = createMarkerElement(m);

                    if (m.isOverlay) {
                        markerElement.style.opacity = "0.5";
                        markerElement.style.filter = "grayscale(100%)";
                        markerElement.title = "Overlay Point - Click to import";
                    }

                    const marker = new maplibregl.Marker({
                        element: markerElement,
                        draggable: !m.isOverlay && type !== "callout"
                    })
                        .setLngLat([lng, lat])
                        .addTo(map);

                    if (!m.isOverlay && type !== "callout") {
                        marker.on("dragend", () => {
                            const pos = marker.getLngLat();
                            createdCanvasObjectRef.current?.({ ...m, lng: pos.lng, lat: pos.lat });
                        });
                    }

                    markerElement.addEventListener("click", (e) => {
                        e.stopPropagation();
                        onSelectRef.current?.(m);
                    });

                    markersRef.current[id] = { type, marker };
                }
            }
        });
    }, [markers, isLoaded, createMarkerElement, createRadiusTool, renderPolygonShape, renderLineShape, cleanupShapeLayers, getMId]);

    // Cursor update
    useEffect(() => {
        if (!canvasTool?.type || canvasTool.type === "select") {
            updateMapCursor("default");
        } else if (canvasTool.type === "pan") {
            updateMapCursor("grab");
        } else {
            updateMapCursor("crosshair");
        }
    }, [canvasTool, updateMapCursor]);

    return (
        <div
            id="map-container"
            ref={mapRef}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "#1a1a1a"
            }}
        />
    );
});

export default MapComponent;
