import React, { useState, useEffect, useRef } from "react";
import {
    MousePointer,
    Hand,
    Hexagon,
    Square,
    Circle,
    Spline,
    Ruler,
    Columns2,
    Zap,
    Home,
    Wrench,
    Trees,
    AlertCircle,
    Sparkles,
    Type,
    Palette,
    ChevronDown,
    Check,
    X
} from "lucide-react";
import "./FloatingToolbar.css";

export const UTILITY_TYPES = [
    { id: "electric", name: "Electric / Power", color: "#f97316", icon: "⚡" },
    { id: "water", name: "Potable Water", color: "#0284c7", icon: "💧" },
    { id: "gas", name: "Natural Gas", color: "#eab308", icon: "🔥" },
    { id: "sewer", name: "Sewer / Drainage", color: "#16a34a", icon: "🚽" },
    { id: "telecom", name: "Telecom / Fiber", color: "#a855f7", icon: "📡" }
];

export const MATERIAL_TYPES = [
    { id: "lawn", name: "Lawn / Turf", color: "#22c55e", pattern: "grass" },
    { id: "concrete", name: "Poured Concrete", color: "#94a3b8", pattern: "solid" },
    { id: "pavers", name: "Stone Pavers", color: "#b45309", pattern: "cross" },
    { id: "mulch", name: "Organic Mulch", color: "#78350f", pattern: "dots" },
    { id: "gravel", name: "Crushed Gravel", color: "#64748b", pattern: "dense-dots" },
    { id: "deck", name: "Deck Wood", color: "#d97706", pattern: "lines" },
    { id: "water", name: "Pool / Feature", color: "#06b6d4", pattern: "wave" }
];

export default function FloatingToolbar({
    canvasSelect,
    setCanvasSelect,
    drawingState,
    finishDrawing,
    cancelDrawing
}) {
    const [openDropdown, setOpenDropdown] = useState(null);
    const [utilitySubtype, setUtilitySubtype] = useState(UTILITY_TYPES[0]);
    const [materialSubtype, setMaterialSubtype] = useState(MATERIAL_TYPES[0]);
    const dropdownRef = useRef(null);

    // Close popovers on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.isContentEditable) {
                return;
            }
            const key = e.key.toLowerCase();
            if (e.key === "Escape") {
                if (drawingState?.inProgress) {
                    cancelDrawing?.();
                } else {
                    setCanvasSelect({ type: null, name: null, icon: null });
                }
                setOpenDropdown(null);
                return;
            }
            if (e.key === "Enter" && drawingState?.inProgress) {
                finishDrawing?.();
                return;
            }

            switch (key) {
                case "v":
                    if (e.shiftKey) {
                        setCanvasSelect({ type: "valve", name: "Shut-off Valve", icon: "valve" });
                    } else {
                        setCanvasSelect({ type: null, name: null, icon: null });
                    }
                    break;
                case "h":
                    setCanvasSelect({ type: "pan", name: "Pan Tool", icon: "pan" });
                    break;
                case "p":
                    setCanvasSelect({ type: "polygon", name: "Property Boundary", icon: "polygon" });
                    break;
                case "r":
                    setCanvasSelect({ type: "rectangle", name: "Building Footprint", icon: "rectangle" });
                    break;
                case "c":
                    setCanvasSelect({ type: "radius", name: "Radius Zone", icon: "radius" });
                    break;
                case "b":
                    setCanvasSelect({ type: "curve", name: "Landscape Bed", icon: "curve", color: "#10b981" });
                    break;
                case "m":
                    setCanvasSelect({ type: "measure", name: "Tape Measure", icon: "measure", color: "#0284c7" });
                    break;
                case "o":
                    setCanvasSelect({ type: "setback", name: "Setback Guide (25 ft)", icon: "setback", color: "#f59e0b", setbackDepth: 25 });
                    break;
                case "u":
                    setCanvasSelect({
                        type: "utility",
                        name: utilitySubtype.name,
                        icon: "utility",
                        utilityType: utilitySubtype.id,
                        color: utilitySubtype.color
                    });
                    break;
                case "s":
                    setCanvasSelect({ type: "structure", name: "Structure", icon: "structure" });
                    break;
                case "f":
                    setCanvasSelect({ type: "flora", name: "Tree / Flora", icon: "flora" });
                    break;
                case "w":
                    setCanvasSelect({ type: "inspection", name: "Work Order / Issue", icon: "inspection" });
                    break;
                case "x":
                    setCanvasSelect({ type: "fixture", name: "Outdoor Fixture", icon: "fixture" });
                    break;
                case "t":
                    setCanvasSelect({ type: "callout", name: "Text Callout", icon: "callout" });
                    break;
                case "g":
                    setCanvasSelect({
                        type: "material",
                        name: materialSubtype.name,
                        icon: "material",
                        materialType: materialSubtype.id,
                        color: materialSubtype.color
                    });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [drawingState, cancelDrawing, finishDrawing, setCanvasSelect, utilitySubtype, materialSubtype]);

    const selectTool = (tool) => {
        if (!tool.type) {
            setCanvasSelect({ type: null, name: null, icon: null });
            setOpenDropdown(null);
            return;
        }

        if (canvasSelect.type === tool.type && !tool.utilityType && !tool.materialType) {
            // Deselect to default selection tool
            setCanvasSelect({ type: null, name: null, icon: null });
        } else {
            setCanvasSelect(tool);
        }
        setOpenDropdown(null);
    };

    const isToolActive = (type) => {
        if (!type && (!canvasSelect.type || canvasSelect.type === "select")) return true;
        return canvasSelect.type === type;
    };

    const toolClass = (active) => `map-tool-button${active ? " is-active" : ""}`;

    return (
        <div
            id="map-floating-toolbar"
            ref={dropdownRef}
            className="map-toolbar-root"
        >
            {/* Primary Floating Tool Dock */}
            <div className="map-toolbar-dock">
                {/* 1. Select & Pan */}
                <button
                    type="button"
                    className={toolClass(isToolActive(null))}
                    onClick={() => selectTool({ type: null, name: "Select & Transform" })}
                    title="Select & Move (V)"
                >
                    <MousePointer size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("pan"))}
                    onClick={() => selectTool({ type: "pan", name: "Pan Tool", icon: "pan" })}
                    title="Pan View (H)"
                >
                    <Hand size={17} />
                </button>

                <div className="map-toolbar-divider" />

                {/* 2. Geometry Suite */}
                <button
                    type="button"
                    className={toolClass(isToolActive("polygon"))}
                    onClick={() => selectTool({ type: "polygon", name: "Property Boundary", icon: "polygon" })}
                    title="Property Boundary / Lot Polygon (P)"
                >
                    <Hexagon size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("rectangle"))}
                    onClick={() => selectTool({ type: "rectangle", name: "Building Footprint", icon: "rectangle" })}
                    title="Building Envelope / Footprint (R)"
                >
                    <Square size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("radius"))}
                    onClick={() => selectTool({ type: "radius", name: "Radius Zone", icon: "radius" })}
                    title="Radius & Spray Zone (C)"
                >
                    <Circle size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("curve"))}
                    onClick={() => selectTool({ type: "curve", name: "Landscape Bed", icon: "curve", color: "#10b981" })}
                    title="Organic Landscape Bed / Curve (B)"
                >
                    <Spline size={17} />
                </button>

                <div className="map-toolbar-divider" />

                {/* 3. Linear & Utilities */}
                <button
                    type="button"
                    className={toolClass(isToolActive("measure"))}
                    onClick={() => selectTool({ type: "measure", name: "Tape Measure", icon: "measure", color: "#0284c7" })}
                    title="Tape Measure with CAD Dimension Overlay (M)"
                >
                    <Ruler size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("setback"))}
                    onClick={() => selectTool({ type: "setback", name: "Setback Guide (25 ft)", icon: "setback", color: "#f59e0b", setbackDepth: 25 })}
                    title="Setback Guide & Buffer Zone Overlay (O)"
                >
                    <Columns2 size={17} />
                </button>

                {/* Utility Route with Dropdown */}
                <div className="map-tool-group">
                    <button
                        type="button"
                        className={`${toolClass(isToolActive("utility"))} map-tool-button--split-left`}
                        onClick={() => selectTool({
                            type: "utility",
                            name: utilitySubtype.name,
                            icon: "utility",
                            utilityType: utilitySubtype.id,
                            color: utilitySubtype.color
                        })}
                        title={`Utility Run: ${utilitySubtype.name} (U)`}
                    >
                        <Zap size={17} style={{ color: isToolActive("utility") ? "var(--color-on-accent)" : utilitySubtype.color }} />
                    </button>
                    <button
                        type="button"
                        className={`${toolClass(isToolActive("utility"))} map-tool-button--split-right`}
                        onClick={() => setOpenDropdown(openDropdown === "utility" ? null : "utility")}
                        title="Select Utility Type"
                    >
                        <ChevronDown size={12} />
                    </button>

                    {openDropdown === "utility" && (
                        <div className="map-tool-popover">
                            {UTILITY_TYPES.map((u) => {
                                const selected = utilitySubtype.id === u.id;
                                return (
                                    <div
                                        key={u.id}
                                        className={`map-tool-popover-item${selected ? " is-selected" : ""}`}
                                        onClick={() => {
                                            setUtilitySubtype(u);
                                            selectTool({
                                                type: "utility",
                                                name: u.name,
                                                icon: "utility",
                                                utilityType: u.id,
                                                color: u.color
                                            });
                                        }}
                                    >
                                        <div className="map-tool-popover-label">
                                            <span className="map-tool-swatch" style={{ backgroundColor: u.color }} />
                                            <span>{u.name}</span>
                                        </div>
                                        {selected && <Check size={14} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="map-toolbar-divider" />

                {/* 4. Asset Pins (Replacing Home/Apt/Unit) */}
                <button
                    type="button"
                    className={toolClass(isToolActive("structure"))}
                    onClick={() => selectTool({ type: "structure", name: "Structure", icon: "structure" })}
                    title="Structure & Dwelling (S) - Replaces Home/Apt/Unit"
                >
                    <Home size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("valve"))}
                    onClick={() => selectTool({ type: "valve", name: "Shut-off Valve", icon: "valve" })}
                    title="Utility & Shut-off Valve (Shift+V)"
                >
                    <Wrench size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("flora"))}
                    onClick={() => selectTool({ type: "flora", name: "Tree / Flora", icon: "flora" })}
                    title="Tree & Landscape Specimen (F)"
                >
                    <Trees size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("inspection"))}
                    onClick={() => selectTool({ type: "inspection", name: "Work Order / Issue", icon: "inspection" })}
                    title="Inspection & Work Order (W)"
                >
                    <AlertCircle size={17} />
                </button>
                <button
                    type="button"
                    className={toolClass(isToolActive("fixture"))}
                    onClick={() => selectTool({ type: "fixture", name: "Outdoor Fixture", icon: "fixture" })}
                    title="Outdoor Fixture & HVAC (X)"
                >
                    <Sparkles size={17} />
                </button>

                <div className="map-toolbar-divider" />

                {/* 5. Annotations & Materials */}
                <button
                    type="button"
                    className={toolClass(isToolActive("callout"))}
                    onClick={() => selectTool({ type: "callout", name: "Text Callout", icon: "callout" })}
                    title="Text Callout & Note (T)"
                >
                    <Type size={17} />
                </button>

                {/* Material Fill with Dropdown */}
                <div className="map-tool-group">
                    <button
                        type="button"
                        className={`${toolClass(isToolActive("material"))} map-tool-button--split-left`}
                        onClick={() => selectTool({
                            type: "material",
                            name: materialSubtype.name,
                            icon: "material",
                            materialType: materialSubtype.id,
                            color: materialSubtype.color
                        })}
                        title={`Surface Material: ${materialSubtype.name} (G)`}
                    >
                        <Palette size={17} style={{ color: isToolActive("material") ? "var(--color-on-accent)" : materialSubtype.color }} />
                    </button>
                    <button
                        type="button"
                        className={`${toolClass(isToolActive("material"))} map-tool-button--split-right`}
                        onClick={() => setOpenDropdown(openDropdown === "material" ? null : "material")}
                        title="Select Material Fill"
                    >
                        <ChevronDown size={12} />
                    </button>

                    {openDropdown === "material" && (
                        <div className="map-tool-popover map-tool-popover--right">
                            {MATERIAL_TYPES.map((m) => {
                                const selected = materialSubtype.id === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        className={`map-tool-popover-item${selected ? " is-selected" : ""}`}
                                        onClick={() => {
                                            setMaterialSubtype(m);
                                            selectTool({
                                                type: "material",
                                                name: m.name,
                                                icon: "material",
                                                materialType: m.id,
                                                color: m.color
                                            });
                                        }}
                                    >
                                        <div className="map-tool-popover-label">
                                            <span className="map-tool-swatch map-tool-swatch--square" style={{ backgroundColor: m.color }} />
                                            <span>{m.name}</span>
                                        </div>
                                        {selected && <Check size={14} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Active Drawing Tool Status / In-Progress Actions */}
            {canvasSelect.type && (
                <div className="map-tool-status">
                    <span className="map-tool-status-inline">
                        <span className="map-tool-status-dot" />
                        <strong>{canvasSelect.name || canvasSelect.type}</strong>:
                        {drawingState?.inProgress ? (
                            <span>
                                {drawingState.points?.length || 0} points placed
                                {drawingState.liveMetrics ? ` • ${drawingState.liveMetrics}` : ""}
                            </span>
                        ) : (
                            <span className="map-tool-status-hint">
                                {["structure", "valve", "flora", "inspection", "fixture", "callout"].includes(canvasSelect.type)
                                    ? "Click anywhere on the map to place"
                                    : "Click on map to start drawing"}
                            </span>
                        )}
                    </span>

                    {drawingState?.inProgress && (
                        <div className="map-tool-status-actions">
                            <button
                                type="button"
                                className="map-tool-finish"
                                onClick={finishDrawing}
                            >
                                Done (Enter)
                            </button>
                            <button
                                type="button"
                                className="map-tool-cancel"
                                onClick={cancelDrawing}
                                title="Cancel Drawing (Esc)"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
