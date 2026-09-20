import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    lngLatToMercator,
    mercatorToLngLat,
    mercatorDistance,
    calculatePolygonArea,
    formatArea,
    calculatePathDistance,
    formatDistance,
    createPolygonData,
    createPolylineData,
    createRectangleCoords,
    createBufferedCorridor,
    isPointInsidePolygon,
    shiftCoordinates
} from "../../functions/map";
import {
    extractPolygonRing,
    calculatePolygonMetrics,
    clipDividerLineToPolygon,
    DEFAULT_SECTION_TYPES
} from "../../functions/sectionGeometry";

const UnifiedMap = forwardRef(function UnifiedMap({
    areas = [],
    activeArea = null,
    features = [],
    structures = [],
    selectedItemId = null,
    hiddenAreas = {},
    hiddenLabels = {},
    hiddenFeatures = {},
    mapViewMode = "realistic", // "realistic" or "2d"
    drawingTool = null,
    onAreaComplete,
    onAreaUpdate,
    onEditArea,
    onFeatureComplete,
    onFeatureUpdate,
    onStructureComplete,
    onStructureUpdate,
    onSelectArea,
    onSelectStructure,
    onSelectFeature,
    onOpenItemModal,
    onDrawingChange,
    onOutsideAreaWarning,
    onSectionDividerComplete,
    selectedSectionId = null,
    onSelectSection,
    selectedDividerId = null,
    onSelectDivider,
    onMoveDivider,
    onDeleteDivider,
    showSectionLabels = true
}, ref) {
    const mapContainerRef = useRef(null);
    const mapInstance = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Drawing & interaction state
    const isDrawingRef = useRef(false);
    const drawingPointsRef = useRef([]);
    const drawingToolRef = useRef(drawingTool);
    const activeAreaRef = useRef(activeArea);
    const markersRef = useRef({});
    const vertexHandlesRef = useRef([]);
    const dividerHandlesRef = useRef([]);

    // Robust native pointer drag handler for MapLibre markers
    const setupDraggableMarker = (marker, element, map, { onDragStart, onDrag, onDragEnd, onClick, onDblClick } = {}) => {
        let startX = 0;
        let startY = 0;
        let hasMoved = false;
        let isDragging = false;

        const onPointerDown = (e) => {
            if (e.button !== 0 && e.pointerType === "mouse") return;
            startX = e.clientX;
            startY = e.clientY;
            hasMoved = false;
            isDragging = true;

            e.stopPropagation();

            if (element.setPointerCapture && e.pointerId != null) {
                // Pointer capture is best-effort: some elements reject the request
                // and dragging must still proceed without it.
                try { element.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            }

            const onPointerMove = (moveEvt) => {
                if (!isDragging) return;
                const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
                if (!hasMoved && dist >= 3) {
                    hasMoved = true;
                    map.dragPan.disable();
                    if (map.doubleClickZoom) map.doubleClickZoom.disable();
                    element.style.cursor = "grabbing";
                    onDragStart?.(marker.getLngLat());
                }

                if (hasMoved) {
                    moveEvt.preventDefault();
                    moveEvt.stopPropagation();

                    const canvas = map.getCanvas();
                    const rect = canvas.getBoundingClientRect();
                    const x = moveEvt.clientX - rect.left;
                    const y = moveEvt.clientY - rect.top;
                    const newLngLat = map.unproject([x, y]);

                    marker.setLngLat(newLngLat);
                    onDrag?.(newLngLat);
                }
            };

            const onPointerUp = (upEvt) => {
                if (!isDragging) return;
                isDragging = false;

                window.removeEventListener("pointermove", onPointerMove, true);
                window.removeEventListener("pointerup", onPointerUp, true);
                window.removeEventListener("pointercancel", onPointerUp, true);

                if (element.releasePointerCapture && upEvt.pointerId != null) {
                    try { element.releasePointerCapture(upEvt.pointerId); } catch (err) { /* already released */ }
                }

                element.style.cursor = "";

                if (hasMoved) {
                    upEvt.preventDefault();
                    upEvt.stopPropagation();
                    map.dragPan.enable();
                    if (map.doubleClickZoom) map.doubleClickZoom.enable();
                    const finalPos = marker.getLngLat();
                    onDragEnd?.(finalPos);
                } else {
                    onClick?.(upEvt);
                }
            };

            window.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
            window.addEventListener("pointerup", onPointerUp, { capture: true, passive: false });
            window.addEventListener("pointercancel", onPointerUp, { capture: true, passive: false });
        };

        element.addEventListener("pointerdown", onPointerDown);

        if (onDblClick) {
            element.addEventListener("dblclick", (e) => {
                e.preventDefault();
                e.stopPropagation();
                onDblClick(e);
            });
        }

        return () => {
            element.removeEventListener("pointerdown", onPointerDown);
        };
    };

    // Helper to calculate centroid of coordinate list
    const calculateCentroid = (coords) => {
        if (!coords || coords.length === 0) return [0, 0];
        let sumLng = 0, sumLat = 0;
        for (let i = 0; i < coords.length; i++) {
            sumLng += Number(coords[i][0]);
            sumLat += Number(coords[i][1]);
        }
        return [sumLng / coords.length, sumLat / coords.length];
    };

    // Helper to get designated feature icon
    const getFeatureIcon = (type) => {
        switch (type) {
            case "material": return "🧱";
            case "footprint": return "📐";
            case "flora":
            case "tree": return "🌲";
            case "valve": return "🚰";
            case "utility": return "⚡";
            case "setback": return "📏";
            case "structure": return "🏠";
            default: return "📍";
        }
    };

    const getFeatureDefaultColor = (type) => {
        switch (type) {
            case "material": return "#8b5cf6";
            case "footprint": return "#3b82f6";
            case "flora":
            case "tree": return "#10b981";
            case "valve": return "#06b6d4";
            case "utility": return "#0284c7";
            case "setback": return "#f59e0b";
            case "structure": return "#4f46e5";
            default: return "#6366f1";
        }
    };

    // Unambiguous 4-directional CAD Move Crosshair Icon
    const MOVE_HANDLE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>`;

    // Inline Click-to-Edit Structure Name on Map
    const createEditableStructureLabel = (s, onSave, onSelect) => {
        const label = document.createElement("div");
        label.className = "unified-structure-map-label";
        label.title = "Click to rename directly";
        label.style.fontSize = "11px";
        label.style.fontWeight = "700";
        label.style.color = "var(--color-text-primary)";
        label.style.backgroundColor = "rgba(15, 23, 42, 0.95)";
        label.style.border = "1px solid var(--color-border-emphasized)";
        label.style.borderRadius = "4px";
        label.style.padding = "2px 6px";
        label.style.marginTop = "3px";
        label.style.whiteSpace = "nowrap";
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "4px";
        label.style.cursor = "pointer";
        label.style.transition = "all 0.15s ease";

        const textSpan = document.createElement("span");
        textSpan.innerText = s.name || "Residence";

        const pencilSpan = document.createElement("span");
        pencilSpan.innerHTML = "✏️";
        pencilSpan.style.fontSize = "9px";
        pencilSpan.style.opacity = "0.7";
        pencilSpan.style.pointerEvents = "none";

        label.appendChild(textSpan);
        label.appendChild(pencilSpan);

        label.addEventListener("mouseenter", () => {
            label.style.borderColor = "#818cf8";
            label.style.backgroundColor = "rgba(30, 27, 75, 0.98)";
            pencilSpan.style.opacity = "1";
        });
        label.addEventListener("mouseleave", () => {
            label.style.borderColor = "var(--color-border-emphasized)";
            label.style.backgroundColor = "rgba(15, 23, 42, 0.95)";
            pencilSpan.style.opacity = "0.7";
        });

        label.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelect?.();

            if (label.querySelector("input")) return;

            const input = document.createElement("input");
            input.type = "text";
            input.value = textSpan.innerText;
            input.className = "unified-inline-map-input";
            input.style.fontSize = "11px";
            input.style.fontWeight = "700";
            input.style.color = "var(--color-text-primary)";
            input.style.backgroundColor = "#0f172a";
            input.style.border = "1.5px solid #6366f1";
            input.style.borderRadius = "4px";
            input.style.padding = "2px 6px";
            input.style.width = `${Math.max(90, (input.value.length + 3) * 7.5)}px`;
            input.style.textAlign = "center";
            input.style.outline = "none";
            input.style.boxShadow = "0 0 10px rgba(99, 102, 241, 0.6)";

            label.innerHTML = "";
            label.appendChild(input);

            let finished = false;
            const finish = (commitVal) => {
                if (finished) return;
                finished = true;
                const trimmed = commitVal.trim();
                if (trimmed && trimmed !== s.name) {
                    textSpan.innerText = trimmed;
                    onSave?.(trimmed);
                } else {
                    textSpan.innerText = s.name || "Residence";
                }
                label.innerHTML = "";
                label.appendChild(textSpan);
                label.appendChild(pencilSpan);
            };

            input.addEventListener("click", (evt) => evt.stopPropagation());
            input.addEventListener("mousedown", (evt) => evt.stopPropagation());
            input.addEventListener("dblclick", (evt) => evt.stopPropagation());
            input.addEventListener("keydown", (evt) => {
                evt.stopPropagation();
                if (evt.key === "Enter") {
                    finish(input.value);
                } else if (evt.key === "Escape") {
                    finished = true;
                    textSpan.innerText = s.name || "Residence";
                    label.innerHTML = "";
                    label.appendChild(textSpan);
                    label.appendChild(pencilSpan);
                }
            });
            input.addEventListener("blur", () => {
                finish(input.value);
            });

            setTimeout(() => {
                input.focus();
                input.select();
            }, 10);
        });

        return label;
    };

    useEffect(() => {
        drawingToolRef.current = drawingTool;
        const map = mapInstance.current;
        if (map?.doubleClickZoom) {
            if (drawingTool) {
                map.doubleClickZoom.disable();
            } else {
                map.doubleClickZoom.enable();
            }
        }
        if (!drawingTool && isDrawingRef.current) {
            cancelDrawing();
        }
    }, [drawingTool]);

    useEffect(() => {
        activeAreaRef.current = activeArea;
    }, [activeArea]);

    // Imperative methods exposed to parent
    const flyTo = useCallback((center, zoom = 17) => {
        if (mapInstance.current) {
            mapInstance.current.flyTo({
                center,
                zoom,
                speed: 1.2,
                curve: 1.4,
                essential: true
            });
        }
    }, []);

    // Helper to unwrap polygon coordinates
    const extractPolygonCoords = (rawCoords) => {
        if (!rawCoords) return [];
        let coords = rawCoords;
        if (typeof coords === "string") {
            try { coords = JSON.parse(coords); } catch (e) { return []; }
        }
        while (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
            coords = coords[0];
        }
        if (!Array.isArray(coords)) return [];
        return coords.filter(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]));
    };

    // Helper to calculate bounding box & centroid
    const calculateCoordsBounds = (coords) => {
        if (!coords || coords.length === 0) return null;
        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        let sumLng = 0, sumLat = 0;
        for (const [lng, lat] of coords) {
            const numLng = Number(lng);
            const numLat = Number(lat);
            if (numLng < minLng) minLng = numLng;
            if (numLng > maxLng) maxLng = numLng;
            if (numLat < minLat) minLat = numLat;
            if (numLat > maxLat) maxLat = numLat;
            sumLng += numLng;
            sumLat += numLat;
        }
        return {
            center: [sumLng / coords.length, sumLat / coords.length],
            bounds: [
                [minLng, minLat],
                [maxLng, maxLat]
            ]
        };
    };

    const fitBounds = useCallback((bounds, options = {}) => {
        const map = mapInstance.current;
        if (!map || !bounds) return;
        const rightPad = options.isDrawerOpen ? 400 : 70;
        const defaultPadding = { top: 70, bottom: 70, left: 380, right: rightPad };
        try {
            map.fitBounds(bounds, {
                padding: options.padding || defaultPadding,
                maxZoom: options.maxZoom || 18,
                speed: 1.3,
                curve: 1.4,
                essential: true,
                ...options
            });
        } catch (err) {
            console.warn("fitBounds failed:", err);
        }
    }, []);

    const flyToArea = useCallback((area, options = {}) => {
        const map = mapInstance.current;
        if (!map || !area) return;

        const coords = extractPolygonCoords(area.coordinates);
        let center = null;
        let bounds = null;

        if (coords.length > 0) {
            const calculated = calculateCoordsBounds(coords);
            if (calculated) {
                center = calculated.center;
                bounds = calculated.bounds;
            }
        }

        if (!center && area.lat !== undefined && area.lng !== undefined) {
            center = [Number(area.lng), Number(area.lat)];
            bounds = [
                [center[0] - 0.001, center[1] - 0.001],
                [center[0] + 0.001, center[1] + 0.001]
            ];
        }

        if (!center) return;

        const isPoint = !bounds || (Math.abs(bounds[0][0] - bounds[1][0]) < 0.00005 && Math.abs(bounds[0][1] - bounds[1][1]) < 0.00005);
        const leftPad = options.isSidebarOpen === false ? 70 : 360;
        const rightPad = options.isDrawerOpen ? 400 : 70;
        const defaultPadding = { top: 70, bottom: 70, left: leftPad, right: rightPad };

        if (isPoint) {
            map.flyTo({
                center,
                zoom: 17.5,
                speed: 1.3,
                curve: 1.4,
                essential: true,
                ...options
            });
        } else {
            try {
                map.fitBounds(bounds, {
                    padding: options.padding || defaultPadding,
                    maxZoom: 18,
                    speed: 1.3,
                    curve: 1.4,
                    essential: true,
                    ...options
                });
            } catch (e) {
                map.flyTo({
                    center,
                    zoom: 17,
                    speed: 1.3,
                    essential: true
                });
            }
        }
    }, []);

    const flyToFeature = useCallback((feature, options = {}) => {
        const map = mapInstance.current;
        if (!map || !feature) return;

        const geom = feature.geometry || {};
        let pts = [];
        if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
            map.flyTo({
                center: [Number(geom.coordinates[0]), Number(geom.coordinates[1])],
                zoom: 18.5,
                speed: 1.3,
                essential: true,
                ...options
            });
            return;
        } else if (geom.type === "LineString") {
            pts = geom.coordinates || [];
        } else if (geom.type === "Polygon") {
            pts = extractPolygonCoords(geom.coordinates);
        }

        if (pts.length > 0) {
            const calculated = calculateCoordsBounds(pts);
            if (calculated) {
                const { center, bounds } = calculated;
                const isPoint = Math.abs(bounds[0][0] - bounds[1][0]) < 0.00005 && Math.abs(bounds[0][1] - bounds[1][1]) < 0.00005;
                const leftPad = options.isSidebarOpen === false ? 70 : 360;
                const rightPad = options.isDrawerOpen ? 400 : 70;
                const defaultPadding = { top: 70, bottom: 70, left: leftPad, right: rightPad };

                if (isPoint) {
                    map.flyTo({
                        center,
                        zoom: 18.5,
                        speed: 1.3,
                        essential: true,
                        ...options
                    });
                } else {
                    try {
                        map.fitBounds(bounds, {
                            padding: options.padding || defaultPadding,
                            maxZoom: 19,
                            speed: 1.3,
                            curve: 1.4,
                            essential: true,
                            ...options
                        });
                    } catch (e) {
                        map.flyTo({
                            center,
                            zoom: 18,
                            speed: 1.3,
                            essential: true
                        });
                    }
                }
            }
        }
    }, []);

    const flyToStructure = useCallback((structure, options = {}) => {
        const map = mapInstance.current;
        if (!map || !structure) return;

        const coords = extractPolygonCoords(structure.hierarchy?.coordinates || structure.coordinates);
        if (coords.length >= 3) {
            const calculated = calculateCoordsBounds(coords);
            if (calculated) {
                const leftPad = options.isSidebarOpen === false ? 70 : 360;
                const rightPad = options.isDrawerOpen ? 400 : 70;
                const defaultPadding = { top: 70, bottom: 70, left: leftPad, right: rightPad };
                try {
                    map.fitBounds(calculated.bounds, {
                        padding: options.padding || defaultPadding,
                        maxZoom: 19,
                        speed: 1.3,
                        curve: 1.4,
                        essential: true,
                        ...options
                    });
                    return;
                } catch (e) { /* flyTo rejected; fall through to the plain jump below */ }
            }
        }

        if (structure.lat && structure.lng) {
            map.flyTo({
                center: [Number(structure.lng), Number(structure.lat)],
                zoom: 18.5,
                speed: 1.3,
                essential: true,
                ...options
            });
        }
    }, []);

    const finishDrawing = useCallback(() => {
        if (!isDrawingRef.current) return;
        const pts = [...drawingPointsRef.current];
        const tool = drawingToolRef.current;
        isDrawingRef.current = false;
        drawingPointsRef.current = [];
        clearDrawingPreview();
        onDrawingChange?.({ inProgress: false, liveMetrics: "" });

        if (!tool || pts.length < 2) return;

        if (tool.mode === "area_polygon" || tool.mode === "area_rect") {
            let finalCoords = pts;
            if (tool.mode === "area_rect" && pts.length === 2) {
                finalCoords = createRectangleCoords(pts[0], pts[1]);
            }
            if (finalCoords.length >= 3) {
                const first = finalCoords[0], last = finalCoords[finalCoords.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                    finalCoords.push([...first]);
                }
                const sqMeters = calculatePolygonArea(finalCoords);
                const sqFt = sqMeters * 10.7639;
                const acres = sqFt / 43560;

                const lngs = finalCoords.map(c => c[0]);
                const lats = finalCoords.map(c => c[1]);
                const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                const widthMeters = mercatorDistance(minLng, minLat, maxLng, minLat);
                const lengthMeters = mercatorDistance(minLng, minLat, minLng, maxLat);

                onAreaComplete?.({
                    coordinates: [finalCoords],
                    width: Math.round(widthMeters * 3.28084),
                    length: Math.round(lengthMeters * 3.28084),
                    area_sqft: Math.round(sqFt),
                    area_acres: parseFloat(acres.toFixed(2)),
                    type: tool.areaType || "lot"
                });
            }
        } else if (tool.mode === "structure_polygon") {
            let finalCoords = pts;
            if (finalCoords.length < 3) return;
            const first = finalCoords[0], last = finalCoords[finalCoords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                finalCoords.push([...first]);
            }

            // Verify inside active area
            if (activeAreaRef.current?.coordinates) {
                const ring = extractPolygonCoords(activeAreaRef.current.coordinates);
                if (ring.length >= 3) {
                    const outside = finalCoords.some(pt => !isPointInsidePolygon(pt, ring));
                    if (outside) {
                        onOutsideAreaWarning?.(`Structure should be placed inside "${activeAreaRef.current.name}".`);
                    }
                }
            }

            const [centerLng, centerLat] = calculateCentroid(finalCoords);
            onStructureComplete?.({
                name: tool.name || "Main Residence",
                type: "structure",
                lat: centerLat,
                lng: centerLng,
                coordinates: [finalCoords]
            });
        } else if (tool.mode === "feature_polygon" || tool.mode === "feature_line") {
            let finalCoords = pts;
            if (tool.mode === "feature_polygon") {
                if (finalCoords.length < 3) return;
                const first = finalCoords[0], last = finalCoords[finalCoords.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                    finalCoords.push([...first]);
                }
            } else if (tool.mode === "feature_line") {
                finalCoords = finalCoords.filter((pt, idx) => {
                    if (idx === 0) return true;
                    const prev = finalCoords[idx - 1];
                    return pt[0] !== prev[0] || pt[1] !== prev[1];
                });
                if (finalCoords.length < 2) return;
            }

            // Verify inside active area
            if (activeAreaRef.current?.coordinates) {
                const ring = extractPolygonCoords(activeAreaRef.current.coordinates);
                if (ring.length >= 3) {
                    const outside = finalCoords.some(pt => !isPointInsidePolygon(pt, ring));
                    if (outside) {
                        onOutsideAreaWarning?.(`Features should be placed inside "${activeAreaRef.current.name}".`);
                    }
                }
            }

            const color = tool.color || getFeatureDefaultColor(tool.type);
            const icon = tool.icon || getFeatureIcon(tool.type);

            onFeatureComplete?.({
                type: tool.type,
                name: tool.name || tool.type,
                geometry: {
                    type: tool.mode === "feature_polygon" ? "Polygon" : "LineString",
                    coordinates: tool.mode === "feature_polygon" ? [finalCoords] : finalCoords
                },
                properties_data: {
                    color,
                    icon,
                    ...(tool.extra || {})
                }
            });
        } else if (tool.mode === "section_divider") {
            if (pts.length >= 2) {
                onSectionDividerComplete?.(pts, tool.target);
            }
            drawingToolRef.current = null;
            cancelDrawing();
        }
    }, [onAreaComplete, onFeatureComplete, onStructureComplete, onSectionDividerComplete, onDrawingChange, onOutsideAreaWarning]);

    const cancelDrawing = useCallback(() => {
        isDrawingRef.current = false;
        drawingPointsRef.current = [];
        clearDrawingPreview();
        onDrawingChange?.({ inProgress: false, liveMetrics: "" });
    }, [onDrawingChange]);

    useImperativeHandle(ref, () => ({
        finishDrawing,
        cancelDrawing,
        flyTo,
        flyToArea,
        flyToFeature,
        flyToStructure,
        fitBounds
    }));

    const clearDrawingPreview = () => {
        const map = mapInstance.current;
        if (!map) return;
        const empty = { type: "FeatureCollection", features: [] };
        if (map.getSource("unified-draw-fill-src")) map.getSource("unified-draw-fill-src").setData(empty);
        if (map.getSource("unified-draw-line-src")) map.getSource("unified-draw-line-src").setData(empty);
        if (map.getSource("unified-draw-pts-src")) map.getSource("unified-draw-pts-src").setData(empty);
    };

    const updateDrawingPreview = (cursorPt) => {
        const map = mapInstance.current;
        if (!map || !isDrawingRef.current) return;
        const tool = drawingToolRef.current;
        if (!tool) return;

        const pts = [...drawingPointsRef.current, cursorPt];
        let fillGeo = null, lineGeo = null, ptsGeo = null, metrics = "";

        if (tool.mode === "area_rect") {
            const startPt = drawingPointsRef.current[0] || cursorPt;
            const rect = createRectangleCoords(startPt, cursorPt);
            fillGeo = { type: "Feature", geometry: { type: "Polygon", coordinates: [rect] } };
            lineGeo = { type: "Feature", geometry: { type: "LineString", coordinates: rect } };
            const sqMeters = calculatePolygonArea(rect);
            const wMeters = mercatorDistance(rect[0][0], rect[0][1], rect[1][0], rect[1][1]);
            const lMeters = mercatorDistance(rect[1][0], rect[1][1], rect[2][0], rect[2][1]);
            metrics = `${formatDistance(wMeters)} × ${formatDistance(lMeters)} • ${formatArea(sqMeters)}`;
        } else if (tool.mode === "area_polygon" || tool.mode === "feature_polygon" || tool.mode === "structure_polygon") {
            if (pts.length >= 3) {
                const closed = [...pts, pts[0]];
                fillGeo = { type: "Feature", geometry: { type: "Polygon", coordinates: [closed] } };
                const sqMeters = calculatePolygonArea(closed);
                metrics = `Area: ${formatArea(sqMeters)}`;
            }
            lineGeo = { type: "Feature", geometry: { type: "LineString", coordinates: pts } };
            ptsGeo = {
                type: "FeatureCollection",
                features: pts.map(p => ({ type: "Feature", geometry: { type: "Point", coordinates: p } }))
            };
        } else if (tool.mode === "feature_line" || tool.mode === "section_divider") {
            lineGeo = { type: "Feature", geometry: { type: "LineString", coordinates: pts } };
            const dist = calculatePathDistance(pts);
            metrics = tool.mode === "section_divider" ? `✂ Divider Line: ${formatDistance(dist)}` : `Length: ${formatDistance(dist)}`;
            ptsGeo = {
                type: "FeatureCollection",
                features: pts.map(p => ({ type: "Feature", geometry: { type: "Point", coordinates: p } }))
            };
        }

        onDrawingChange?.({ inProgress: true, liveMetrics: metrics });

        const empty = { type: "FeatureCollection", features: [] };
        if (map.getSource("unified-draw-fill-src")) map.getSource("unified-draw-fill-src").setData(fillGeo || empty);
        if (map.getSource("unified-draw-line-src")) map.getSource("unified-draw-line-src").setData(lineGeo || empty);
        if (map.getSource("unified-draw-pts-src")) map.getSource("unified-draw-pts-src").setData(ptsGeo || empty);
    };

    // Initialize MapLibre
    useEffect(() => {
        if (mapInstance.current || !mapContainerRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            center: [-83.5055, 32.9075],
            zoom: 16,
            pitch: mapViewMode === "realistic" ? 25 : 0,
            style: {
                version: 8,
                sources: {
                    satellite: {
                        type: "raster",
                        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
                        tileSize: 256
                    },
                    osm: {
                        type: "raster",
                        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
                        tileSize: 256
                    }
                },
                layers: [
                    {
                        id: "satellite-layer",
                        type: "raster",
                        source: "satellite",
                        layout: { visibility: mapViewMode === "realistic" ? "visible" : "none" }
                    },
                    {
                        id: "osm-layer",
                        type: "raster",
                        source: "osm",
                        layout: { visibility: mapViewMode === "2d" ? "visible" : "none" }
                    }
                ]
            }
        });

        map.addControl(new maplibregl.NavigationControl(), "bottom-right");
        map.addControl(new maplibregl.ScaleControl(), "bottom-left");

        map.on("load", () => {
            setIsLoaded(true);

            // Preview sources & layers
            const empty = { type: "FeatureCollection", features: [] };
            map.addSource("unified-draw-fill-src", { type: "geojson", data: empty });
            map.addLayer({
                id: "unified-draw-fill-layer",
                type: "fill",
                source: "unified-draw-fill-src",
                paint: { "fill-color": "#6366f1", "fill-opacity": 0.3 }
            });

            map.addSource("unified-draw-line-src", { type: "geojson", data: empty });
            map.addLayer({
                id: "unified-draw-line-casing",
                type: "line",
                source: "unified-draw-line-src",
                paint: { "line-color": "#000000", "line-width": 4.5 }
            });
            map.addLayer({
                id: "unified-draw-line-layer",
                type: "line",
                source: "unified-draw-line-src",
                paint: { "line-color": "#a5b4fc", "line-width": 2.5, "line-dasharray": [2, 2] }
            });

            map.addSource("unified-draw-pts-src", { type: "geojson", data: empty });
            map.addLayer({
                id: "unified-draw-pts-layer",
                type: "circle",
                source: "unified-draw-pts-src",
                paint: { "circle-radius": 5, "circle-color": "#6366f1", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" }
            });
        });

        // Click Handler for Points, Polygons, and Lines
        map.on("click", (e) => {
            const tool = drawingToolRef.current;
            const currentPoint = [e.lngLat.lng, e.lngLat.lat];

            if (!tool) return;

            // 0. SECTION DIVIDER TOOL (2 clicks or click-drag to cut)
            if (tool.mode === "section_divider") {
                if (!isDrawingRef.current) {
                    isDrawingRef.current = true;
                    drawingPointsRef.current = [currentPoint];
                    updateDrawingPreview(currentPoint);
                } else {
                    drawingPointsRef.current.push(currentPoint);
                    finishDrawing();
                }
                return;
            }

            // 1. SINGLE-CLICK POINT FEATURE (fallback/pins if any)
            if (tool.mode === "feature_point") {
                if (activeAreaRef.current?.coordinates) {
                    const ring = extractPolygonCoords(activeAreaRef.current.coordinates);
                    if (ring && ring.length >= 3) {
                        const inside = isPointInsidePolygon(currentPoint, ring);
                        if (!inside) {
                            onOutsideAreaWarning?.(`Please place ${tool.name || 'this item'} inside "${activeAreaRef.current.name}".`);
                            return;
                        }
                    }
                }

                onFeatureComplete?.({
                    name: tool.name || tool.type,
                    type: tool.type,
                    geometry: {
                        type: "Point",
                        coordinates: currentPoint
                    },
                    properties_data: {
                        color: tool.color || getFeatureDefaultColor(tool.type),
                        icon: tool.icon || getFeatureIcon(tool.type)
                    }
                });
                return;
            }

            // 2. SINGLE-CLICK STRUCTURE (legacy fallback)
            if (tool.mode === "structure") {
                if (activeAreaRef.current?.coordinates) {
                    const ring = extractPolygonCoords(activeAreaRef.current.coordinates);
                    if (ring && ring.length >= 3) {
                        const inside = isPointInsidePolygon(currentPoint, ring);
                        if (!inside) {
                            onOutsideAreaWarning?.(`Please place structure inside "${activeAreaRef.current.name}".`);
                            return;
                        }
                    }
                }

                onStructureComplete?.({
                    name: tool.name || "Structure",
                    type: "structure",
                    lat: e.lngLat.lat,
                    lng: e.lngLat.lng
                });
                return;
            }

            // 3. MULTI-CLICK LINE-BY-LINE DRAWING: Structure, Features (Footprint, Material, Tree, Valve), Boundary, Setback, Utility
            if (tool.mode === "structure_polygon" || tool.mode === "feature_polygon" || tool.mode === "feature_line" || tool.mode?.startsWith("area_")) {
                if (!isDrawingRef.current) {
                    isDrawingRef.current = true;
                    drawingPointsRef.current = [currentPoint];
                    updateDrawingPreview(currentPoint);
                } else {
                    if (tool.mode === "area_rect") {
                        drawingPointsRef.current.push(currentPoint);
                        finishDrawing();
                        return;
                    }

                    // Check if clicked close to start point to close polygon
                    const start = drawingPointsRef.current[0];
                    if (drawingPointsRef.current.length >= 3 && start) {
                        const p1 = map.project(start);
                        const p2 = map.project(currentPoint);
                        const pixelDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        const mDist = mercatorDistance(start[0], start[1], currentPoint[0], currentPoint[1]);
                        if (pixelDist < 22 || mDist < 12) {
                            finishDrawing();
                            return;
                        }
                    }

                    drawingPointsRef.current.push(currentPoint);
                    updateDrawingPreview(currentPoint);
                }
            }
        });

        // Mouse Move for drawing previews
        map.on("mousemove", (e) => {
            const currentPoint = [e.lngLat.lng, e.lngLat.lat];
            if (isDrawingRef.current) {
                updateDrawingPreview(currentPoint);
            }
        });

        map.on("dblclick", (e) => {
            if (isDrawingRef.current) {
                e.preventDefault();
                finishDrawing();
            }
        });

        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isDrawingRef.current) {
                cancelDrawing();
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        mapInstance.current = map;

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            map.remove();
            mapInstance.current = null;
        };
    }, []);

    // Toggle 2D vs Realistic Base Layer
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;

        if (mapViewMode === "2d") {
            if (map.getLayer("satellite-layer")) map.setLayoutProperty("satellite-layer", "visibility", "none");
            if (map.getLayer("osm-layer")) map.setLayoutProperty("osm-layer", "visibility", "visible");
            map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
        } else {
            if (map.getLayer("satellite-layer")) map.setLayoutProperty("satellite-layer", "visibility", "visible");
            if (map.getLayer("osm-layer")) map.setLayoutProperty("osm-layer", "visibility", "none");
            map.easeTo({ pitch: 25, duration: 400 });
        }
    }, [mapViewMode, isLoaded]);

    // RENDER AREAS (BOUNDARIES) & CENTROID BADGES
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;

        // Clean up old area layers
        const currentLayers = map.getStyle().layers || [];
        currentLayers.forEach(l => {
            if (l.id.startsWith("area-")) {
                try { if (map.getLayer(l.id)) map.removeLayer(l.id); } catch (e) { /* layer absent */ }
            }
        });
        const currentSources = Object.keys(map.getStyle().sources || {});
        currentSources.forEach(s => {
            if (s.startsWith("area-")) {
                try { if (map.getSource(s)) map.removeSource(s); } catch (e) { /* source busy/absent */ }
            }
        });

        // Clean up area labels
        Object.keys(markersRef.current).forEach(k => {
            if (k.startsWith("area-label-")) {
                markersRef.current[k].remove();
                delete markersRef.current[k];
            }
        });

        areas.forEach(a => {
            if (hiddenAreas[a.id]) return; // Skip if hidden

            const coords = a.coordinates?.[0] || a.coordinates;
            if (!coords || coords.length < 3) return;

            const id = `area-${a.id}`;
            const isActive = (activeArea && Number(activeArea.id) === Number(a.id)) || (selectedItemId?.type === "area" && Number(selectedItemId.id) === Number(a.id));
            const color = a.color || (isActive ? "#6366f1" : "#3b82f6");

            map.addSource(id, {
                type: "geojson",
                data: createPolygonData(coords, id)
            });

            // Fill Layer
            map.addLayer({
                id: `${id}-fill`,
                type: "fill",
                source: id,
                paint: {
                    "fill-color": color,
                    "fill-opacity": isActive ? 0.32 : 0.16
                }
            });

            // Click into boundary to select/activate Area
            map.on("click", `${id}-fill`, (e) => {
                if (!drawingToolRef.current) {
                    e.originalEvent?.stopPropagation();
                    onSelectArea?.(a);
                }
            });
            map.on("dblclick", `${id}-fill`, (e) => {
                if (!drawingToolRef.current) {
                    e.originalEvent?.preventDefault();
                    e.originalEvent?.stopPropagation();
                    onOpenItemModal?.("area", a);
                }
            });
            map.on("mouseenter", `${id}-fill`, () => {
                if (!drawingToolRef.current) map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", `${id}-fill`, () => {
                if (!drawingToolRef.current) map.getCanvas().style.cursor = "";
            });

            // Outline Casing
            map.addLayer({
                id: `${id}-outline-casing`,
                type: "line",
                source: id,
                paint: {
                    "line-color": "#000000",
                    "line-width": isActive ? 5.5 : 3.5
                }
            });

            // Outline
            map.addLayer({
                id: `${id}-outline`,
                type: "line",
                source: id,
                paint: {
                    "line-color": color,
                    "line-width": isActive ? 3.5 : 2,
                    "line-dasharray": isActive ? [1] : [2, 2]
                }
            });
            map.on("dblclick", `${id}-outline`, (e) => {
                if (!drawingToolRef.current) {
                    e.originalEvent?.preventDefault();
                    e.originalEvent?.stopPropagation();
                    onOpenItemModal?.("area", a);
                }
            });

            // Centroid Dimension Badge (if not hidden)
            const [centerLng, centerLat] = calculateCentroid(coords);

            if (!hiddenLabels[a.id]) {
                const el = document.createElement("div");
                el.className = "unified-map-area-badge";
                el.style.backgroundColor = isActive ? "rgba(49, 46, 129, 0.95)" : "rgba(15, 23, 42, 0.9)";
                el.style.color = "var(--color-text-primary)";
                el.style.border = `1.5px solid ${color}`;
                el.style.borderRadius = "8px";
                el.style.padding = "4px 10px";
                el.style.fontSize = "11px";
                el.style.fontWeight = "600";
                el.style.boxShadow = isActive ? `0 0 16px ${color}` : "0 4px 12px rgba(0,0,0,0.5)";
                el.style.cursor = "pointer";
                el.style.zIndex = "100";
                el.title = `${a.name} (Click to select, double-click to edit boundary & notes)`;
                el.innerHTML = `📐 <strong>${a.name}</strong>${a.area_sqft ? ` • ${Math.round(a.area_sqft).toLocaleString()} sq ft` : ''}`;

                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onSelectArea?.(a);
                });

                el.addEventListener("dblclick", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenItemModal?.("area", a);
                });

                const marker = new maplibregl.Marker({
                    element: el,
                    anchor: isActive ? "bottom" : "center",
                    offset: isActive ? [0, -22] : [0, 0]
                })
                    .setLngLat([centerLng, centerLat])
                    .addTo(map);

                markersRef.current[`area-label-${a.id}`] = marker;
            }
        });
    }, [areas, activeArea, selectedItemId, hiddenAreas, hiddenLabels, isLoaded, onSelectArea, onAreaUpdate, onEditArea, onOpenItemModal]);

    // RENDER FEATURES (POLYGONS, LINES, POINTS WITH EMOJI MARKERS)
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;

        // Clean up previous feature layers and sources safely
        const style = map.getStyle();
        if (style) {
            (style.layers || []).forEach(l => {
                if (l.id.startsWith("feat-") || (l.source && l.source.startsWith("feat-"))) {
                    try { if (map.getLayer(l.id)) map.removeLayer(l.id); } catch (e) { /* layer absent */ }
                }
            });
            Object.keys(style.sources || {}).forEach(s => {
                if (s.startsWith("feat-")) {
                    try { if (map.getSource(s)) map.removeSource(s); } catch (e) { /* source busy/absent */ }
                }
            });
        }

        // Clean up feature markers
        Object.keys(markersRef.current).forEach(k => {
            if (k.startsWith("feat-marker-")) {
                markersRef.current[k].remove();
                delete markersRef.current[k];
            }
        });

        features.forEach(f => {
            if (hiddenFeatures[f.id]) return; // Skip if toggled hidden

            const id = `feat-${f.id}`;
            let geom = f.geometry || {};
            if (typeof geom === "string") {
                try { geom = JSON.parse(geom); } catch (e) { geom = {}; }
            }
            let props = f.properties_data || {};
            if (typeof props === "string") {
                try { props = JSON.parse(props); } catch (e) { props = {}; }
            }

            const isSelected = selectedItemId?.type === "feature" && Number(selectedItemId.id) === Number(f.id);
            const color = props.color || getFeatureDefaultColor(f.type);
            const icon = props.icon || getFeatureIcon(f.type);

            if (geom.type === "Polygon") {
                const coords = extractPolygonCoords(geom.coordinates);
                if (!coords || coords.length < 3) return;

                const polygonGeo = createPolygonData(coords, id);
                try {
                    map.addSource(id, { type: "geojson", data: polygonGeo });
                    map.addLayer({
                        id: `${id}-fill`,
                        type: "fill",
                        source: id,
                        paint: {
                            "fill-color": color,
                            "fill-opacity": isSelected ? 0.45 : (f.type === "material" ? 0.38 : 0.28)
                        }
                    });

                    map.addLayer({
                        id: `${id}-casing`,
                        type: "line",
                        source: id,
                        paint: {
                            "line-color": "#000000",
                            "line-width": isSelected ? 5.5 : 3.5
                        }
                    });

                    map.addLayer({
                        id: `${id}-line`,
                        type: "line",
                        source: id,
                        paint: {
                            "line-color": color,
                            "line-width": isSelected ? 3.5 : 2
                        }
                    });

                    map.on("click", `${id}-fill`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.stopPropagation();
                            onSelectFeature?.(f);
                        }
                    });
                    map.on("dblclick", `${id}-fill`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.preventDefault();
                            e.originalEvent?.stopPropagation();
                            onOpenItemModal?.("feature", f);
                        }
                    });
                    map.on("mouseenter", `${id}-fill`, () => {
                        if (!drawingToolRef.current) map.getCanvas().style.cursor = "pointer";
                    });
                    map.on("mouseleave", `${id}-fill`, () => {
                        if (!drawingToolRef.current) map.getCanvas().style.cursor = "";
                    });

                    // CENTROID EMOJI MARKER (Render emoji in the center of the polygon)
                    const [cLng, cLat] = calculateCentroid(coords);
                    const badge = document.createElement("div");
                    badge.className = "unified-polygon-emoji-badge";
                    badge.style.width = "32px";
                    badge.style.height = "32px";
                    badge.style.borderRadius = "50%";
                    badge.style.backgroundColor = isSelected ? "rgba(30, 27, 75, 0.95)" : "rgba(15, 23, 42, 0.92)";
                    badge.style.border = `2.5px solid ${color}`;
                    badge.style.boxShadow = isSelected ? `0 0 14px ${color}` : "0 4px 12px rgba(0,0,0,0.55)";
                    badge.style.display = "flex";
                    badge.style.alignItems = "center";
                    badge.style.justifyContent = "center";
                    badge.style.fontSize = "16px";
                    badge.style.cursor = "pointer";
                    badge.innerHTML = icon;
                    badge.title = `${f.name || f.type} (Click to select, double-click to edit & notes)`;

                    badge.addEventListener("click", (e) => {
                        e.stopPropagation();
                        onSelectFeature?.(f);
                    });
                    badge.addEventListener("dblclick", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenItemModal?.("feature", f);
                    });

                    const marker = new maplibregl.Marker({
                        element: badge,
                        anchor: isSelected ? "bottom" : "center",
                        offset: isSelected ? [0, -22] : [0, 0]
                    })
                        .setLngLat([cLng, cLat])
                        .addTo(map);

                    markersRef.current[`feat-marker-${f.id}`] = marker;
                } catch (err) {
                    console.warn(`Error adding polygon feature ${f.id}:`, err);
                }
            } else if (geom.type === "LineString") {
                let coords = geom.coordinates || [];
                if (typeof coords === "string") {
                    try { coords = JSON.parse(coords); } catch (e) { coords = []; }
                }
                while (Array.isArray(coords) && coords.length === 1 && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                    coords = coords[0];
                }
                if (!Array.isArray(coords) || coords.length < 2) return;
                const cleanCoords = coords.filter((pt, idx) => {
                    if (idx === 0) return true;
                    const prev = coords[idx - 1];
                    return pt[0] !== prev[0] || pt[1] !== prev[1];
                });
                if (cleanCoords.length < 2) return;

                const lineGeo = createPolylineData(cleanCoords, id);
                try {
                    map.addSource(id, { type: "geojson", data: lineGeo });
                    map.addLayer({
                        id: `${id}-casing`,
                        type: "line",
                        source: id,
                        paint: {
                            "line-color": "#000000",
                            "line-width": isSelected ? 6.5 : 4.5
                        }
                    });
                    map.addLayer({
                        id: `${id}-line`,
                        type: "line",
                        source: id,
                        paint: {
                            "line-color": color,
                            "line-width": isSelected ? 4 : 2.5,
                            "line-dasharray": f.type === "setback" ? [2, 2] : [1]
                        }
                    });

                    map.on("click", `${id}-casing`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.stopPropagation();
                            onSelectFeature?.(f);
                        }
                    });
                    map.on("dblclick", `${id}-casing`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.preventDefault();
                            e.originalEvent?.stopPropagation();
                            onOpenItemModal?.("feature", f);
                        }
                    });
                    map.on("click", `${id}-line`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.stopPropagation();
                            onSelectFeature?.(f);
                        }
                    });
                    map.on("dblclick", `${id}-line`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.preventDefault();
                            e.originalEvent?.stopPropagation();
                            onOpenItemModal?.("feature", f);
                        }
                    });
                    map.on("mouseenter", `${id}-line`, () => {
                        if (!drawingToolRef.current) map.getCanvas().style.cursor = "pointer";
                    });
                    map.on("mouseleave", `${id}-line`, () => {
                        if (!drawingToolRef.current) map.getCanvas().style.cursor = "";
                    });

                    // MIDPOINT EMOJI MARKER FOR LINE TOOLS (Setback, Utility)
                    const [midLng, midLat] = calculateCentroid(cleanCoords);
                    const badge = document.createElement("div");
                    badge.className = "unified-line-emoji-badge";
                    badge.style.width = "28px";
                    badge.style.height = "28px";
                    badge.style.borderRadius = "50%";
                    badge.style.backgroundColor = isSelected ? "rgba(30, 27, 75, 0.95)" : "rgba(15, 23, 42, 0.92)";
                    badge.style.border = `2px solid ${color}`;
                    badge.style.boxShadow = isSelected ? `0 0 14px ${color}` : "0 3px 10px rgba(0,0,0,0.55)";
                    badge.style.display = "flex";
                    badge.style.alignItems = "center";
                    badge.style.justifyContent = "center";
                    badge.style.fontSize = "14px";
                    badge.style.cursor = "pointer";
                    badge.innerHTML = icon;
                    badge.title = `${f.name || f.type} (Click to select, double-click to edit & notes)`;

                    badge.addEventListener("click", (e) => {
                        e.stopPropagation();
                        onSelectFeature?.(f);
                    });
                    badge.addEventListener("dblclick", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenItemModal?.("feature", f);
                    });

                    const marker = new maplibregl.Marker({
                        element: badge,
                        anchor: isSelected ? "bottom" : "center",
                        offset: isSelected ? [0, -22] : [0, 0]
                    })
                        .setLngLat([midLng, midLat])
                        .addTo(map);

                    markersRef.current[`feat-marker-${f.id}`] = marker;
                } catch (err) {
                    console.warn(`Error adding line feature ${f.id}:`, err);
                }
            } else if (geom.type === "Point") {
                let coords = geom.coordinates;
                if (typeof coords === "string") {
                    try { coords = JSON.parse(coords); } catch (e) { coords = null; }
                }
                if (!Array.isArray(coords) || coords.length < 2) return;
                const lng = Number(coords[0]);
                const lat = Number(coords[1]);
                if (isNaN(lng) || isNaN(lat)) return;

                const el = document.createElement("div");
                el.style.width = "32px";
                el.style.height = "32px";
                el.style.borderRadius = "50%";
                el.style.backgroundColor = isSelected ? "rgba(30, 27, 75, 0.95)" : "#0f172a";
                el.style.border = `2.5px solid ${color}`;
                el.style.display = "flex";
                el.style.alignItems = "center";
                el.style.justifyContent = "center";
                el.style.fontSize = "16px";
                el.style.boxShadow = isSelected ? `0 0 14px ${color}` : "0 4px 14px rgba(0,0,0,0.6)";
                el.style.cursor = "grab";
                el.innerText = icon;
                el.title = `${f.name} (Drag to reposition, double-click to edit & notes)`;

                const marker = new maplibregl.Marker({ element: el, anchor: "center" })
                    .setLngLat([lng, lat])
                    .addTo(map);

                setupDraggableMarker(marker, el, map, {
                    onClick: () => onSelectFeature?.(f),
                    onDblClick: () => onOpenItemModal?.("feature", f),
                    onDragEnd: (pos) => {
                        onFeatureUpdate?.(f.id, {
                            geometry: {
                                type: "Point",
                                coordinates: [pos.lng, pos.lat]
                            }
                        });
                    }
                });

                markersRef.current[`feat-marker-${f.id}`] = marker;
            }
        });
    }, [features, selectedItemId, hiddenFeatures, isLoaded, onFeatureUpdate, onSelectFeature, onOpenItemModal]);

    // RENDER STRUCTURES (POLYGONS AND/OR MARKERS WITH 🏠 CENTROID BADGE)
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;

        // Clean up previous structure layers and sources
        const style = map.getStyle();
        if (style) {
            (style.layers || []).forEach(l => {
                if (l.id.startsWith("struct-") || (l.source && l.source.startsWith("struct-"))) {
                    try { if (map.getLayer(l.id)) map.removeLayer(l.id); } catch (e) { /* layer absent */ }
                }
            });
            Object.keys(style.sources || {}).forEach(s => {
                if (s.startsWith("struct-")) {
                    try { if (map.getSource(s)) map.removeSource(s); } catch (e) { /* source busy/absent */ }
                }
            });
        }

        Object.keys(markersRef.current).forEach(k => {
            if (k.startsWith("struct-marker-")) {
                markersRef.current[k].remove();
                delete markersRef.current[k];
            }
        });

        structures.forEach(s => {
            const id = `struct-${s.id}`;
            const isSelected = selectedItemId?.type === "structure" && Number(selectedItemId.id) === Number(s.id);
            const color = "#4f46e5";

            // Check if structure has polygon coordinates
            const polyCoords = extractPolygonCoords(s.hierarchy?.coordinates || s.coordinates);

            if (polyCoords.length >= 3) {
                // Render Structure as Polygon with 🏠 in the center
                const polygonGeo = createPolygonData(polyCoords, id);
                try {
                    map.addSource(id, { type: "geojson", data: polygonGeo });
                    map.addLayer({
                        id: `${id}-fill`,
                        type: "fill",
                        source: id,
                        paint: {
                            "fill-color": color,
                            "fill-opacity": isSelected ? 0.45 : 0.32
                        }
                    });

                    map.addLayer({
                        id: `${id}-casing`,
                        type: "line",
                        source: id,
                        paint: {
                            "line-color": "#000000",
                            "line-width": isSelected ? 5.5 : 3.5
                        }
                    });

                    map.addLayer({
                        id: `${id}-line`,
                        type: "line",
                        source: id,
                        paint: {
                            "line-color": color,
                            "line-width": isSelected ? 3.5 : 2
                        }
                    });

                    map.on("click", `${id}-fill`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.stopPropagation();
                            onSelectStructure?.(s, false);
                        }
                    });
                    map.on("dblclick", `${id}-fill`, (e) => {
                        if (!drawingToolRef.current) {
                            e.originalEvent?.preventDefault();
                            e.originalEvent?.stopPropagation();
                            onOpenItemModal?.("structure", s);
                        }
                    });
                    map.on("mouseenter", `${id}-fill`, () => {
                        if (!drawingToolRef.current) map.getCanvas().style.cursor = "pointer";
                    });
                    map.on("mouseleave", `${id}-fill`, () => {
                        if (!drawingToolRef.current) map.getCanvas().style.cursor = "";
                    });

                    // CENTROID EMOJI MARKER WITH EDITABLE LABEL
                    const [cLng, cLat] = calculateCentroid(polyCoords);
                    const el = document.createElement("div");
                    el.style.display = "flex";
                    el.style.flexDirection = "column";
                    el.style.alignItems = "center";
                    el.style.cursor = "pointer";

                    const badge = document.createElement("div");
                    badge.style.position = "relative";
                    badge.style.width = "36px";
                    badge.style.height = "36px";
                    badge.style.borderRadius = "50%";
                    badge.style.backgroundColor = isSelected ? "#312e81" : "#4f46e5";
                    badge.style.border = "2.5px solid var(--color-text-primary)";
                    badge.style.boxShadow = isSelected ? "0 0 16px rgba(99, 102, 241, 0.9)" : "0 6px 20px rgba(79, 70, 229, 0.65)";
                    badge.style.display = "flex";
                    badge.style.alignItems = "center";
                    badge.style.justifyContent = "center";
                    badge.style.fontSize = "18px";
                    badge.title = `${s.name || "Residence"} (Click to select, double-click to edit & notes)`;

                    const iconText = document.createElement("span");
                    iconText.innerHTML = s.icon || "🏠";
                    badge.appendChild(iconText);

                    const label = createEditableStructureLabel(
                        s,
                        (newName) => onStructureUpdate?.(s.id, { name: newName }),
                        () => onSelectStructure?.(s, false)
                    );

                    el.appendChild(badge);
                    el.appendChild(label);

                    el.addEventListener("click", (e) => {
                        e.stopPropagation();
                        onSelectStructure?.(s, false);
                    });
                    el.addEventListener("dblclick", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenItemModal?.("structure", s);
                    });

                    const marker = new maplibregl.Marker({
                        element: el,
                        anchor: isSelected ? "bottom" : "center",
                        offset: isSelected ? [0, -22] : [0, 0]
                    })
                        .setLngLat([cLng, cLat])
                        .addTo(map);

                    markersRef.current[`struct-marker-${s.id}`] = marker;
                } catch (err) {
                    console.warn(`Error adding polygon structure ${s.id}:`, err);
                }
            } else {
                // Legacy point structure pin
                const lat = Number(s.lat);
                const lng = Number(s.lng);
                if (isNaN(lat) || isNaN(lng) || !lat || !lng) return;

                const el = document.createElement("div");
                el.style.display = "flex";
                el.style.flexDirection = "column";
                el.style.alignItems = "center";
                el.style.cursor = "grab";

                const badge = document.createElement("div");
                badge.style.position = "relative";
                badge.style.width = "36px";
                badge.style.height = "36px";
                badge.style.borderRadius = "50%";
                badge.style.backgroundColor = isSelected ? "#312e81" : "#4f46e5";
                badge.style.border = "2.5px solid var(--color-text-primary)";
                badge.style.boxShadow = isSelected ? "0 0 16px rgba(99, 102, 241, 0.9)" : "0 6px 20px rgba(79, 70, 229, 0.65)";
                badge.style.display = "flex";
                badge.style.alignItems = "center";
                badge.style.justifyContent = "center";
                badge.style.fontSize = "18px";
                badge.title = `${s.name || "Residence"} (Drag to reposition, double-click to edit & notes)`;

                const iconText = document.createElement("span");
                iconText.innerHTML = s.icon || "🏠";
                badge.appendChild(iconText);

                const label = createEditableStructureLabel(
                    s,
                    (newName) => onStructureUpdate?.(s.id, { name: newName }),
                    () => onSelectStructure?.(s, false)
                );

                el.appendChild(badge);
                el.appendChild(label);

                const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
                    .setLngLat([lng, lat])
                    .addTo(map);

                setupDraggableMarker(marker, el, map, {
                    onClick: () => onSelectStructure?.(s, false),
                    onDblClick: () => onOpenItemModal?.("structure", s),
                    onDragEnd: (pos) => {
                        onStructureUpdate?.(s.id, {
                            lat: pos.lat,
                            lng: pos.lng
                        });
                    }
                });

                markersRef.current[`struct-marker-${s.id}`] = marker;
            }
        });
    }, [structures, selectedItemId, isLoaded, onSelectStructure, onStructureUpdate, onOpenItemModal]);

    // DEDICATED EFFECT: DRAGGABLE VERTEX HANDLES & CENTER MOVE HANDLES FOR SHAPE RESHAPING
    // "All line tools should be able to to be edited and reshaped like the boundary can"
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;

        // Clean up all existing vertex and center handles
        vertexHandlesRef.current.forEach(h => h.remove());
        vertexHandlesRef.current = [];

        // 1. If a Feature is selected
        if (selectedItemId?.type === "feature") {
            const f = features.find(item => Number(item.id) === Number(selectedItemId.id));
            if (!f) return;

            let geom = f.geometry || {};
            if (typeof geom === "string") {
                try { geom = JSON.parse(geom); } catch (e) { geom = {}; }
            }

            if (geom.type === "Polygon") {
                const coords = extractPolygonCoords(geom.coordinates);
                if (coords.length < 3) return;

                const [cLng, cLat] = calculateCentroid(coords);
                const id = `feat-${f.id}`;

                // Draggable Center Move Handle
                const centerEl = document.createElement("div");
                centerEl.className = "unified-center-handle";
                centerEl.title = "Move Feature (Drag to reposition entire shape)";
                centerEl.innerHTML = MOVE_HANDLE_SVG;

                const centerMarker = new maplibregl.Marker({ element: centerEl, anchor: "center" })
                    .setLngLat([cLng, cLat])
                    .addTo(map);

                const cornerMarkers = [];

                setupDraggableMarker(centerMarker, centerEl, map, {
                    onDrag: (newCenter) => {
                        const dLng = newCenter.lng - cLng;
                        const dLat = newCenter.lat - cLat;
                        const shifted = shiftCoordinates(coords, dLng, dLat);
                        map.getSource(id)?.setData(createPolygonData(shifted, id));
                        cornerMarkers.forEach((cm, i) => {
                            if (shifted[i]) cm.setLngLat(shifted[i]);
                        });
                    },
                    onDragEnd: (finalCenter) => {
                        const dLng = finalCenter.lng - cLng;
                        const dLat = finalCenter.lat - cLat;
                        const shifted = shiftCoordinates(coords, dLng, dLat);

                        onFeatureUpdate?.(f.id, {
                            geometry: {
                                type: "Polygon",
                                coordinates: [shifted]
                            }
                        });
                    },
                    onDblClick: () => onOpenItemModal?.("feature", f)
                });
                vertexHandlesRef.current.push(centerMarker);

                // Draggable Corner Vertex Handles
                coords.forEach((pt, idx) => {
                    if (idx === coords.length - 1 && pt[0] === coords[0][0] && pt[1] === coords[0][1]) return;

                    const handleEl = document.createElement("div");
                    handleEl.className = "unified-vertex-handle";
                    handleEl.title = `Corner #${idx + 1} - Drag to reshape feature`;

                    const handleMarker = new maplibregl.Marker({ element: handleEl, anchor: "center" })
                        .setLngLat(pt)
                        .addTo(map);

                    setupDraggableMarker(handleMarker, handleEl, map, {
                        onDrag: (newPos) => {
                            const updatedCoords = [...coords];
                            updatedCoords[idx] = [newPos.lng, newPos.lat];
                            if (idx === 0) {
                                updatedCoords[updatedCoords.length - 1] = [newPos.lng, newPos.lat];
                            }
                            map.getSource(id)?.setData(createPolygonData(updatedCoords, id));
                            const [newCLng, newCLat] = calculateCentroid(updatedCoords);
                            centerMarker.setLngLat([newCLng, newCLat]);
                        },
                        onDragEnd: (finalPos) => {
                            const updatedCoords = [...coords];
                            updatedCoords[idx] = [finalPos.lng, finalPos.lat];
                            if (idx === 0) {
                                updatedCoords[updatedCoords.length - 1] = [finalPos.lng, finalPos.lat];
                            }

                            onFeatureUpdate?.(f.id, {
                                geometry: {
                                    type: "Polygon",
                                    coordinates: [updatedCoords]
                                }
                            });
                        },
                        onDblClick: () => onOpenItemModal?.("feature", f)
                    });

                    cornerMarkers.push(handleMarker);
                    vertexHandlesRef.current.push(handleMarker);
                });
            } else if (geom.type === "LineString") {
                let coords = geom.coordinates || [];
                if (typeof coords === "string") {
                    try { coords = JSON.parse(coords); } catch (e) { coords = []; }
                }
                while (Array.isArray(coords) && coords.length === 1 && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                    coords = coords[0];
                }
                const cleanCoords = (Array.isArray(coords) ? coords : []).filter((pt, idx) => {
                    if (idx === 0) return true;
                    const prev = coords[idx - 1];
                    return pt[0] !== prev[0] || pt[1] !== prev[1];
                });
                if (cleanCoords.length < 2) return;

                const [midLng, midLat] = calculateCentroid(cleanCoords);
                const id = `feat-${f.id}`;

                // Draggable Center Move Handle
                const centerEl = document.createElement("div");
                centerEl.className = "unified-center-handle";
                centerEl.title = "Move Line (Drag to reposition entire line)";
                centerEl.innerHTML = MOVE_HANDLE_SVG;

                const centerMarker = new maplibregl.Marker({ element: centerEl, anchor: "center" })
                    .setLngLat([midLng, midLat])
                    .addTo(map);

                const lineMarkers = [];

                setupDraggableMarker(centerMarker, centerEl, map, {
                    onDrag: (newCenter) => {
                        const dLng = newCenter.lng - midLng;
                        const dLat = newCenter.lat - midLat;
                        const shifted = shiftCoordinates(cleanCoords, dLng, dLat);
                        map.getSource(id)?.setData(createPolylineData(shifted, id));
                        lineMarkers.forEach((lm, i) => {
                            if (shifted[i]) lm.setLngLat(shifted[i]);
                        });
                    },
                    onDragEnd: (finalCenter) => {
                        const dLng = finalCenter.lng - midLng;
                        const dLat = finalCenter.lat - midLat;
                        const shifted = shiftCoordinates(cleanCoords, dLng, dLat);

                        onFeatureUpdate?.(f.id, {
                            geometry: {
                                type: "LineString",
                                coordinates: shifted
                            }
                        });
                    },
                    onDblClick: () => onOpenItemModal?.("feature", f)
                });
                vertexHandlesRef.current.push(centerMarker);

                // Draggable Vertex Handles along line
                cleanCoords.forEach((pt, idx) => {
                    const handleEl = document.createElement("div");
                    handleEl.className = "unified-vertex-handle";
                    handleEl.title = `Point #${idx + 1} - Drag to reshape line`;

                    const handleMarker = new maplibregl.Marker({ element: handleEl, anchor: "center" })
                        .setLngLat(pt)
                        .addTo(map);

                    setupDraggableMarker(handleMarker, handleEl, map, {
                        onDrag: (newPos) => {
                            const updatedCoords = [...cleanCoords];
                            updatedCoords[idx] = [newPos.lng, newPos.lat];
                            map.getSource(id)?.setData(createPolylineData(updatedCoords, id));
                            const [newMidLng, newMidLat] = calculateCentroid(updatedCoords);
                            centerMarker.setLngLat([newMidLng, newMidLat]);
                        },
                        onDragEnd: (finalPos) => {
                            const updatedCoords = [...cleanCoords];
                            updatedCoords[idx] = [finalPos.lng, finalPos.lat];

                            onFeatureUpdate?.(f.id, {
                                geometry: {
                                    type: "LineString",
                                    coordinates: updatedCoords
                                }
                            });
                        },
                        onDblClick: () => onOpenItemModal?.("feature", f)
                    });

                    lineMarkers.push(handleMarker);
                    vertexHandlesRef.current.push(handleMarker);
                });
            }
            return;
        }

        // 2. If a Structure is selected
        if (selectedItemId?.type === "structure") {
            const s = structures.find(item => Number(item.id) === Number(selectedItemId.id));
            if (!s) return;

            const coords = extractPolygonCoords(s.hierarchy?.coordinates || s.coordinates);
            if (coords.length < 3) return;

            const [cLng, cLat] = calculateCentroid(coords);
            const id = `struct-${s.id}`;

            // Draggable Center Move Handle
            const centerEl = document.createElement("div");
            centerEl.className = "unified-center-handle";
            centerEl.title = "Move Structure (Drag to reposition entire structure)";
            centerEl.innerHTML = MOVE_HANDLE_SVG;

            const centerMarker = new maplibregl.Marker({ element: centerEl, anchor: "center" })
                .setLngLat([cLng, cLat])
                .addTo(map);

            const structMarkers = [];

            setupDraggableMarker(centerMarker, centerEl, map, {
                onDrag: (newCenter) => {
                    const dLng = newCenter.lng - cLng;
                    const dLat = newCenter.lat - cLat;
                    const shifted = shiftCoordinates(coords, dLng, dLat);
                    map.getSource(id)?.setData(createPolygonData(shifted, id));
                    structMarkers.forEach((sm, i) => {
                        if (shifted[i]) sm.setLngLat(shifted[i]);
                    });
                },
                onDragEnd: (finalCenter) => {
                    const dLng = finalCenter.lng - cLng;
                    const dLat = finalCenter.lat - cLat;
                    const shifted = shiftCoordinates(coords, dLng, dLat);
                    const [newCLng, newCLat] = calculateCentroid(shifted);

                    onStructureUpdate?.(s.id, {
                        lat: newCLat,
                        lng: newCLng,
                        hierarchy: {
                            ...(s.hierarchy || {}),
                            coordinates: [shifted]
                        }
                    });
                },
                onDblClick: () => onOpenItemModal?.("structure", s)
            });
            vertexHandlesRef.current.push(centerMarker);

            // Draggable Corner Vertex Handles
            coords.forEach((pt, idx) => {
                if (idx === coords.length - 1 && pt[0] === coords[0][0] && pt[1] === coords[0][1]) return;

                const handleEl = document.createElement("div");
                handleEl.className = "unified-vertex-handle";
                handleEl.title = `Corner #${idx + 1} - Drag to reshape structure`;

                const handleMarker = new maplibregl.Marker({ element: handleEl, anchor: "center" })
                    .setLngLat(pt)
                    .addTo(map);

                setupDraggableMarker(handleMarker, handleEl, map, {
                    onDrag: (newPos) => {
                        const updatedCoords = [...coords];
                        updatedCoords[idx] = [newPos.lng, newPos.lat];
                        if (idx === 0) {
                            updatedCoords[updatedCoords.length - 1] = [newPos.lng, newPos.lat];
                        }
                        map.getSource(id)?.setData(createPolygonData(updatedCoords, id));
                        const [newCLng, newCLat] = calculateCentroid(updatedCoords);
                        centerMarker.setLngLat([newCLng, newCLat]);
                    },
                    onDragEnd: (finalPos) => {
                        const updatedCoords = [...coords];
                        updatedCoords[idx] = [finalPos.lng, finalPos.lat];
                        if (idx === 0) {
                            updatedCoords[updatedCoords.length - 1] = [finalPos.lng, finalPos.lat];
                        }

                        const [newCLng, newCLat] = calculateCentroid(updatedCoords);
                        onStructureUpdate?.(s.id, {
                            lat: newCLat,
                            lng: newCLng,
                            hierarchy: {
                                ...(s.hierarchy || {}),
                                coordinates: [updatedCoords]
                            }
                        });
                    },
                    onDblClick: () => onOpenItemModal?.("structure", s)
                });

                structMarkers.push(handleMarker);
                vertexHandlesRef.current.push(handleMarker);
            });
            return;
        }

        // 3. If an Area is selected or active
        const targetArea = selectedItemId?.type === "area"
            ? areas.find(a => Number(a.id) === Number(selectedItemId.id))
            : activeArea;

        if (targetArea) {
            const coords = extractPolygonCoords(targetArea.coordinates);
            if (!coords || coords.length < 3) return;

            const [centerLng, centerLat] = calculateCentroid(coords);
            const id = `area-${targetArea.id}`;

            // Draggable Center Move Handle
            const centerEl = document.createElement("div");
            centerEl.className = "unified-center-handle";
            centerEl.title = "Move Area Boundary (Drag to reposition entire area)";
            centerEl.innerHTML = MOVE_HANDLE_SVG;

            const centerMarker = new maplibregl.Marker({ element: centerEl, anchor: "center" })
                .setLngLat([centerLng, centerLat])
                .addTo(map);

            const cornerMarkers = [];

            setupDraggableMarker(centerMarker, centerEl, map, {
                onDrag: (newCenter) => {
                    const dLng = newCenter.lng - centerLng;
                    const dLat = newCenter.lat - centerLat;
                    const shifted = shiftCoordinates(coords, dLng, dLat);
                    map.getSource(id)?.setData(createPolygonData(shifted, id));
                    cornerMarkers.forEach((cm, i) => {
                        if (shifted[i]) cm.setLngLat(shifted[i]);
                    });
                },
                onDragEnd: (finalCenter) => {
                    const dLng = finalCenter.lng - centerLng;
                    const dLat = finalCenter.lat - centerLat;
                    const shifted = shiftCoordinates(coords, dLng, dLat);

                    const sqMeters = calculatePolygonArea(shifted);
                    const sqFt = sqMeters * 10.7639;
                    const acres = sqFt / 43560;

                    const lngs = shifted.map(c => c[0]);
                    const lats = shifted.map(c => c[1]);
                    const widthMeters = mercatorDistance(Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.min(...lats));
                    const lengthMeters = mercatorDistance(Math.min(...lngs), Math.min(...lats), Math.min(...lngs), Math.max(...lats));

                    onAreaUpdate?.(targetArea.id, {
                        coordinates: [shifted],
                        area_sqft: Math.round(sqFt),
                        area_acres: parseFloat(acres.toFixed(2)),
                        width: Math.round(widthMeters * 3.28084),
                        length: Math.round(lengthMeters * 3.28084)
                    });
                },
                onDblClick: () => onOpenItemModal?.("area", targetArea)
            });
            vertexHandlesRef.current.push(centerMarker);

            // Draggable Vertex Handles for each corner
            coords.forEach((pt, idx) => {
                if (idx === coords.length - 1 && pt[0] === coords[0][0] && pt[1] === coords[0][1]) return;

                const handleEl = document.createElement("div");
                handleEl.className = "unified-vertex-handle";
                handleEl.title = `Vertex #${idx + 1} - Drag to reshape boundary`;

                const handleMarker = new maplibregl.Marker({ element: handleEl, anchor: "center" })
                    .setLngLat(pt)
                    .addTo(map);

                setupDraggableMarker(handleMarker, handleEl, map, {
                    onDrag: (newPos) => {
                        const updatedCoords = [...coords];
                        updatedCoords[idx] = [newPos.lng, newPos.lat];
                        if (idx === 0) {
                            updatedCoords[updatedCoords.length - 1] = [newPos.lng, newPos.lat];
                        }
                        map.getSource(id)?.setData(createPolygonData(updatedCoords, id));
                        const [cLng, cLat] = calculateCentroid(updatedCoords);
                        centerMarker.setLngLat([cLng, cLat]);
                    },
                    onDragEnd: (finalPos) => {
                        const updatedCoords = [...coords];
                        updatedCoords[idx] = [finalPos.lng, finalPos.lat];
                        if (idx === 0) {
                            updatedCoords[updatedCoords.length - 1] = [finalPos.lng, finalPos.lat];
                        }

                        const sqMeters = calculatePolygonArea(updatedCoords);
                        const sqFt = sqMeters * 10.7639;
                        const acres = sqFt / 43560;

                        const lngs = updatedCoords.map(c => c[0]);
                        const lats = updatedCoords.map(c => c[1]);
                        const widthMeters = mercatorDistance(Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.min(...lats));
                        const lengthMeters = mercatorDistance(Math.min(...lngs), Math.min(...lats), Math.min(...lngs), Math.max(...lats));

                        onAreaUpdate?.(targetArea.id, {
                            coordinates: [updatedCoords],
                            area_sqft: Math.round(sqFt),
                            area_acres: parseFloat(acres.toFixed(2)),
                            width: Math.round(widthMeters * 3.28084),
                            length: Math.round(lengthMeters * 3.28084)
                        });
                    },
                    onDblClick: () => onOpenItemModal?.("area", targetArea)
                });

                cornerMarkers.push(handleMarker);
                vertexHandlesRef.current.push(handleMarker);
            });
        }
    }, [selectedItemId, activeArea, areas, features, structures, isLoaded, onAreaUpdate, onFeatureUpdate, onStructureUpdate, onOpenItemModal]);

    // DEDICATED EFFECT: SECTIONS RENDERING (FILLS, CASINGS, LINES, & INTERACTIVE CENTROID BADGES)
    // "and the sections are visible in view like Done on Render Page"
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;

        // Clean up old section markers
        Object.keys(markersRef.current).forEach(k => {
            if (k.startsWith("sec-marker-")) {
                markersRef.current[k].remove();
                delete markersRef.current[k];
            }
        });

        // Collect all sections from areas and features
        const sectionFeatures = [];
        const sectionBadgeItems = [];

        areas.forEach(a => {
            const rawSections = a.extra_info?.sections;
            if (Array.isArray(rawSections) && rawSections.length > 0) {
                rawSections.forEach((sec, idx) => {
                    const ring = extractPolygonRing(sec.coordinates);
                    if (ring && ring.length >= 3) {
                        const secId = `area-${a.id}-sec-${sec.id || idx}`;
                        const isSecSelected = selectedSectionId === sec.id || selectedSectionId === secId;
                        const secColor = sec.color || "#8b5cf6";
                        const typeObj = DEFAULT_SECTION_TYPES.find(t => t.value === sec.type) || DEFAULT_SECTION_TYPES[0];

                        sectionFeatures.push({
                            type: "Feature",
                            id: secId,
                            properties: {
                                id: sec.id || secId,
                                fullId: secId,
                                parentId: a.id,
                                parentType: "area",
                                name: sec.name || `Section ${idx + 1}`,
                                color: secColor,
                                type: sec.type || "residential",
                                isSelected: isSecSelected,
                                area_sqft: sec.area_sqft || 0
                            },
                            geometry: {
                                type: "Polygon",
                                coordinates: [ring]
                            }
                        });

                        const metrics = calculatePolygonMetrics(ring);
                        sectionBadgeItems.push({
                            id: sec.id || secId,
                            fullId: secId,
                            parent: a,
                            parentType: "area",
                            name: sec.name || `Section ${idx + 1}`,
                            typeObj,
                            color: secColor,
                            area_sqft: sec.area_sqft || metrics.areaSqFt,
                            percent: a.area_sqft > 0 ? Math.round(((sec.area_sqft || metrics.areaSqFt) / a.area_sqft) * 100) : null,
                            centerLng: metrics.centerLng,
                            centerLat: metrics.centerLat,
                            isSelected: isSecSelected,
                            sectionData: sec
                        });
                    }
                });
            }
        });

        features.forEach(f => {
            const rawSections = f.properties_data?.sections;
            if (Array.isArray(rawSections) && rawSections.length > 0) {
                rawSections.forEach((sec, idx) => {
                    const ring = extractPolygonRing(sec.coordinates);
                    if (ring && ring.length >= 3) {
                        const secId = `feat-${f.id}-sec-${sec.id || idx}`;
                        const isSecSelected = selectedSectionId === sec.id || selectedSectionId === secId;
                        const secColor = sec.color || "#10b981";
                        const typeObj = DEFAULT_SECTION_TYPES.find(t => t.value === sec.type) || DEFAULT_SECTION_TYPES[0];

                        sectionFeatures.push({
                            type: "Feature",
                            id: secId,
                            properties: {
                                id: sec.id || secId,
                                fullId: secId,
                                parentId: f.id,
                                parentType: "feature",
                                name: sec.name || `Section ${idx + 1}`,
                                color: secColor,
                                type: sec.type || "yard",
                                isSelected: isSecSelected,
                                area_sqft: sec.area_sqft || 0
                            },
                            geometry: {
                                type: "Polygon",
                                coordinates: [ring]
                            }
                        });

                        const metrics = calculatePolygonMetrics(ring);
                        sectionBadgeItems.push({
                            id: sec.id || secId,
                            fullId: secId,
                            parent: f,
                            parentType: "feature",
                            name: sec.name || `Section ${idx + 1}`,
                            typeObj,
                            color: secColor,
                            area_sqft: sec.area_sqft || metrics.areaSqFt,
                            percent: null,
                            centerLng: metrics.centerLng,
                            centerLat: metrics.centerLat,
                            isSelected: isSecSelected,
                            sectionData: sec
                        });
                    }
                });
            }
        });

        const sectionsFC = {
            type: "FeatureCollection",
            features: sectionFeatures
        };

        const srcName = "unified-sections-source";
        if (!map.getSource(srcName)) {
            map.addSource(srcName, {
                type: "geojson",
                data: sectionsFC
            });

            // Sections Fill Layer
            map.addLayer({
                id: "unified-sections-fill",
                type: "fill",
                source: srcName,
                paint: {
                    "fill-color": ["get", "color"],
                    "fill-opacity": [
                        "case",
                        ["get", "isSelected"],
                        0.62,
                        0.38
                    ]
                }
            });

            // Outline Casing
            map.addLayer({
                id: "unified-sections-outline-casing",
                type: "line",
                source: srcName,
                paint: {
                    "line-color": "#000000",
                    "line-width": 3.5
                }
            });

            // Crisp dividing lines between sections
            map.addLayer({
                id: "unified-sections-line",
                type: "line",
                source: srcName,
                paint: {
                    "line-color": ["get", "color"],
                    "line-width": 2,
                    "line-dasharray": [3, 2]
                }
            });

            // Click interaction
            map.on("click", "unified-sections-fill", (e) => {
                if (drawingToolRef.current) return;
                const feat = e.features?.[0];
                if (feat?.properties) {
                    e.originalEvent?.stopPropagation();
                    const props = feat.properties;
                    onSelectSection?.(props.id);
                    if (props.parentType === "area") {
                        const targetA = areas.find(a => Number(a.id) === Number(props.parentId));
                        if (targetA) onSelectArea?.(targetA);
                    } else if (props.parentType === "feature") {
                        const targetF = features.find(f => Number(f.id) === Number(props.parentId));
                        if (targetF) onSelectFeature?.(targetF);
                    }
                }
            });

            map.on("mouseenter", "unified-sections-fill", () => {
                if (!drawingToolRef.current) map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "unified-sections-fill", () => {
                if (!drawingToolRef.current) map.getCanvas().style.cursor = "";
            });
        } else {
            map.getSource(srcName).setData(sectionsFC);
        }

        // Render Centroid Badges
        if (showSectionLabels !== false) {
            sectionBadgeItems.forEach(item => {
                if (!item.centerLng || !item.centerLat) return;

                const badgeEl = document.createElement("div");
                badgeEl.className = `unified-section-marker-badge ${item.isSelected ? "active" : ""}`;
                badgeEl.style.borderColor = item.color;

                const pctStr = item.percent != null ? ` (${item.percent}%)` : "";
                const areaStr = item.area_sqft ? ` • ${Math.round(item.area_sqft).toLocaleString()} sq ft${pctStr}` : "";

                badgeEl.innerHTML = `
                    <span class="unified-section-badge-icon">${item.typeObj.icon}</span>
                    <span class="unified-section-badge-name">${item.name}</span>
                    ${areaStr ? `<span class="unified-section-badge-area">${areaStr}</span>` : ""}
                `;

                badgeEl.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onSelectSection?.(item.id);
                    if (item.parentType === "area") onSelectArea?.(item.parent);
                    else onSelectFeature?.(item.parent);
                });

                badgeEl.addEventListener("dblclick", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenItemModal?.(item.parentType, item.parent);
                });

                const marker = new maplibregl.Marker({
                    element: badgeEl,
                    anchor: "center"
                })
                    .setLngLat([item.centerLng, item.centerLat])
                    .addTo(map);

                markersRef.current[`sec-marker-${item.fullId}`] = marker;
            });
        }
    }, [areas, features, selectedSectionId, showSectionLabels, isLoaded, onSelectSection, onSelectArea, onSelectFeature, onOpenItemModal]);

    // DEDICATED EFFECT: DIVIDER LINES RENDERING & INTERACTIVE MOVE/ENDPOINT HANDLES
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !isLoaded) return;

        // Clean up previous divider handles
        dividerHandlesRef.current.forEach(h => h.remove());
        dividerHandlesRef.current = [];

        // Collect all dividers across areas and features for map rendering
        const allDividers = [];
        areas.forEach(a => {
            const divs = a.extra_info?.dividers;
            if (Array.isArray(divs)) {
                divs.forEach(d => {
                    allDividers.push({
                        ...d,
                        parentId: a.id,
                        parentType: "area",
                        parentItem: a
                    });
                });
            }
        });
        features.forEach(f => {
            const divs = f.properties_data?.dividers;
            if (Array.isArray(divs)) {
                divs.forEach(d => {
                    allDividers.push({
                        ...d,
                        parentId: f.id,
                        parentType: "feature",
                        parentItem: f
                    });
                });
            }
        });

        // 1. Render all divider lines on the map
        const divFeatures = allDividers.filter(d => Array.isArray(d.coordinates) && d.coordinates.length >= 2).map(d => ({
            type: "Feature",
            id: d.id,
            properties: {
                id: d.id,
                name: d.name || "Divider Line",
                color: d.color || "#8b5cf6",
                isSelected: d.id === selectedDividerId,
                parentId: d.parentId,
                parentType: d.parentType
            },
            geometry: {
                type: "LineString",
                coordinates: d.coordinates
            }
        }));

        const divFC = {
            type: "FeatureCollection",
            features: divFeatures
        };

        const divSrc = "unified-dividers-source";
        if (!map.getSource(divSrc)) {
            map.addSource(divSrc, {
                type: "geojson",
                data: divFC
            });

            // Wide invisible hit line for easy clicking
            map.addLayer({
                id: "unified-dividers-hit",
                type: "line",
                source: divSrc,
                paint: {
                    "line-color": "#ffffff",
                    "line-opacity": 0,
                    "line-width": 22
                }
            });

            // High-contrast casing outline
            map.addLayer({
                id: "unified-dividers-casing",
                type: "line",
                source: divSrc,
                paint: {
                    "line-color": "#090d16",
                    "line-width": [
                        "case",
                        ["get", "isSelected"],
                        6.5,
                        4
                    ]
                }
            });

            // Distinctive purple/neon divider line
            map.addLayer({
                id: "unified-dividers-line",
                type: "line",
                source: divSrc,
                paint: {
                    "line-color": [
                        "case",
                        ["get", "isSelected"],
                        "#e9d5ff",
                        ["get", "color"]
                    ],
                    "line-width": [
                        "case",
                        ["get", "isSelected"],
                        3.5,
                        2.5
                    ],
                    "line-dasharray": [3, 2]
                }
            });

            map.on("click", "unified-dividers-hit", (e) => {
                if (drawingToolRef.current) return;
                const feat = e.features?.[0];
                if (feat?.properties) {
                    e.originalEvent?.stopPropagation();
                    const props = feat.properties;
                    onSelectDivider?.(props.id);
                    onSelectSection?.(null);
                    if (props.parentType === "area") {
                        const targetA = areas.find(a => Number(a.id) === Number(props.parentId));
                        if (targetA) onSelectArea?.(targetA);
                    } else if (props.parentType === "feature") {
                        const targetF = features.find(f => Number(f.id) === Number(props.parentId));
                        if (targetF) onSelectFeature?.(targetF);
                    }
                }
            });

            map.on("mouseenter", "unified-dividers-hit", () => {
                if (!drawingToolRef.current) map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "unified-dividers-hit", () => {
                if (!drawingToolRef.current) map.getCanvas().style.cursor = "";
            });
        } else {
            map.getSource(divSrc).setData(divFC);
        }

        // 2. Active Target Divider Handles (Center move handle + endpoint handles)
        const activeTarget = selectedItemId?.type === "feature"
            ? { type: "feature", item: features.find(f => Number(f.id) === Number(selectedItemId.id)) }
            : selectedItemId?.type === "area"
                ? { type: "area", item: areas.find(a => Number(a.id) === Number(selectedItemId.id)) }
                : activeArea
                    ? { type: "area", item: activeArea }
                    : null;

        if (!activeTarget || !activeTarget.item) return;

        const targetDividers = activeTarget.type === "area"
            ? (activeTarget.item.extra_info?.dividers || [])
            : (activeTarget.item.properties_data?.dividers || []);

        const rawTargetCoords = activeTarget.type === "area"
            ? activeTarget.item.coordinates
            : activeTarget.item.geometry?.coordinates;
        const baseRing = extractPolygonRing(rawTargetCoords);

        if (!baseRing || targetDividers.length === 0) return;

        targetDividers.forEach((div) => {
            const pts = div.coordinates;
            if (!pts || pts.length < 2) return;

            const isSelected = div.id === selectedDividerId;
            const midLng = (pts[0][0] + pts[1][0]) / 2;
            const midLat = (pts[0][1] + pts[1][1]) / 2;

            // Draggable Center Move Handle
            const centerEl = document.createElement("div");
            centerEl.className = `unified-center-handle unified-divider-center-handle ${isSelected ? "active" : ""}`;
            centerEl.title = `Move ${div.name || "Divider Line"} (Drag to shift across section)`;
            centerEl.innerHTML = MOVE_HANDLE_SVG;

            const centerMarker = new maplibregl.Marker({ element: centerEl, anchor: "center" })
                .setLngLat([midLng, midLat])
                .addTo(map);
            dividerHandlesRef.current.push(centerMarker);

            // If selected (or if single divider and no section selected), also show endpoint vertex handles
            const endpointMarkers = [];
            if (isSelected || (targetDividers.length === 1 && !selectedSectionId)) {
                pts.forEach((pt, pIdx) => {
                    const epEl = document.createElement("div");
                    epEl.className = "unified-vertex-handle unified-divider-vertex-handle";
                    epEl.title = `Divider Point #${pIdx + 1} - Drag to adjust angle or cut line`;

                    const epMarker = new maplibregl.Marker({ element: epEl, anchor: "center" })
                        .setLngLat(pt)
                        .addTo(map);
                    dividerHandlesRef.current.push(epMarker);
                    endpointMarkers.push(epMarker);

                    setupDraggableMarker(epMarker, epEl, map, {
                        onDragStart: () => {
                            onSelectDivider?.(div.id);
                            onSelectSection?.(null);
                        },
                        onDrag: (newPos) => {
                            const updatedPts = [
                                pIdx === 0 ? [newPos.lng, newPos.lat] : pts[0],
                                pIdx === 1 ? [newPos.lng, newPos.lat] : pts[1]
                            ];
                            const updatedFC = {
                                type: "FeatureCollection",
                                features: allDividers.map(d => {
                                    if (d.id === div.id) {
                                        return {
                                            type: "Feature",
                                            id: d.id,
                                            properties: { ...d, isSelected: true },
                                            geometry: { type: "LineString", coordinates: updatedPts }
                                        };
                                    }
                                    return {
                                        type: "Feature",
                                        id: d.id,
                                        properties: { ...d, isSelected: d.id === selectedDividerId },
                                        geometry: { type: "LineString", coordinates: d.coordinates }
                                    };
                                })
                            };
                            map.getSource(divSrc)?.setData(updatedFC);
                            const newMidLng = (updatedPts[0][0] + updatedPts[1][0]) / 2;
                            const newMidLat = (updatedPts[0][1] + updatedPts[1][1]) / 2;
                            centerMarker.setLngLat([newMidLng, newMidLat]);
                        },
                        onDragEnd: (finalPos) => {
                            const updatedPts = [
                                pIdx === 0 ? [finalPos.lng, finalPos.lat] : pts[0],
                                pIdx === 1 ? [finalPos.lng, finalPos.lat] : pts[1]
                            ];
                            const clipped = clipDividerLineToPolygon(baseRing, updatedPts);
                            onMoveDivider?.(div.id, clipped, activeTarget);
                        },
                        onClick: () => {
                            onSelectDivider?.(div.id);
                            onSelectSection?.(null);
                        }
                    });
                });
            }

            setupDraggableMarker(centerMarker, centerEl, map, {
                onDragStart: () => {
                    onSelectDivider?.(div.id);
                    onSelectSection?.(null);
                },
                onDrag: (newCenter) => {
                    const dLng = newCenter.lng - midLng;
                    const dLat = newCenter.lat - midLat;
                    const shifted = [
                        [pts[0][0] + dLng, pts[0][1] + dLat],
                        [pts[1][0] + dLng, pts[1][1] + dLat]
                    ];
                    const updatedFC = {
                        type: "FeatureCollection",
                        features: allDividers.map(d => {
                            if (d.id === div.id) {
                                return {
                                    type: "Feature",
                                    id: d.id,
                                    properties: { ...d, isSelected: true },
                                    geometry: { type: "LineString", coordinates: shifted }
                                };
                            }
                            return {
                                type: "Feature",
                                id: d.id,
                                properties: { ...d, isSelected: d.id === selectedDividerId },
                                geometry: { type: "LineString", coordinates: d.coordinates }
                            };
                        })
                    };
                    map.getSource(divSrc)?.setData(updatedFC);
                    if (endpointMarkers[0] && shifted[0]) endpointMarkers[0].setLngLat(shifted[0]);
                    if (endpointMarkers[1] && shifted[1]) endpointMarkers[1].setLngLat(shifted[1]);
                },
                onDragEnd: (finalCenter) => {
                    const dLng = finalCenter.lng - midLng;
                    const dLat = finalCenter.lat - midLat;
                    const shifted = [
                        [pts[0][0] + dLng, pts[0][1] + dLat],
                        [pts[1][0] + dLng, pts[1][1] + dLat]
                    ];
                    const clipped = clipDividerLineToPolygon(baseRing, shifted);
                    onMoveDivider?.(div.id, clipped, activeTarget);
                },
                onClick: () => {
                    onSelectDivider?.(div.id);
                    onSelectSection?.(null);
                }
            });
        });

        return () => {
            dividerHandlesRef.current.forEach(h => h.remove());
            dividerHandlesRef.current = [];
        };
    }, [areas, features, selectedItemId, activeArea, selectedDividerId, selectedSectionId, isLoaded, onSelectDivider, onSelectSection, onMoveDivider, onSelectArea, onSelectFeature]);

    return (
        <div ref={mapContainerRef} className="unified-map-root" />
    );
});

export default UnifiedMap;
