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

    const buttonStyle = (active) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "34px",
        height: "34px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        backgroundColor: active ? "var(--color-primary-default, #3b82f6)" : "transparent",
        color: active ? "#ffffff" : "var(--color-text-secondary, #94a3b8)",
        transition: "all 0.15s ease",
        position: "relative",
        outline: "none",
        padding: 0
    });

    const dividerStyle = {
        width: "1px",
        height: "20px",
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        margin: "0 2px"
    };

    return (
        <div
            id="map-floating-toolbar"
            ref={dropdownRef}
            style={{
                position: "absolute",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                pointerEvents: "auto"
            }}
        >
            {/* Primary Floating Tool Dock */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "4px 8px",
                    gap: "4px",
                    backgroundColor: "rgba(24, 24, 27, 0.92)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: "12px",
                    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35)",
                    userSelect: "none"
                }}
            >
                {/* 1. Select & Pan */}
                <button
                    type="button"
                    style={buttonStyle(isToolActive(null))}
                    onClick={() => selectTool({ type: null, name: "Select & Transform" })}
                    title="Select & Move (V)"
                >
                    <MousePointer size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("pan"))}
                    onClick={() => selectTool({ type: "pan", name: "Pan Tool", icon: "pan" })}
                    title="Pan View (H)"
                >
                    <Hand size={17} />
                </button>

                <div style={dividerStyle} />

                {/* 2. Geometry Suite */}
                <button
                    type="button"
                    style={buttonStyle(isToolActive("polygon"))}
                    onClick={() => selectTool({ type: "polygon", name: "Property Boundary", icon: "polygon" })}
                    title="Property Boundary / Lot Polygon (P)"
                >
                    <Hexagon size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("rectangle"))}
                    onClick={() => selectTool({ type: "rectangle", name: "Building Footprint", icon: "rectangle" })}
                    title="Building Envelope / Footprint (R)"
                >
                    <Square size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("radius"))}
                    onClick={() => selectTool({ type: "radius", name: "Radius Zone", icon: "radius" })}
                    title="Radius & Spray Zone (C)"
                >
                    <Circle size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("curve"))}
                    onClick={() => selectTool({ type: "curve", name: "Landscape Bed", icon: "curve", color: "#10b981" })}
                    title="Organic Landscape Bed / Curve (B)"
                >
                    <Spline size={17} />
                </button>

                <div style={dividerStyle} />

                {/* 3. Linear & Utilities */}
                <button
                    type="button"
                    style={buttonStyle(isToolActive("measure"))}
                    onClick={() => selectTool({ type: "measure", name: "Tape Measure", icon: "measure", color: "#0284c7" })}
                    title="Tape Measure with CAD Dimension Overlay (M)"
                >
                    <Ruler size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("setback"))}
                    onClick={() => selectTool({ type: "setback", name: "Setback Guide (25 ft)", icon: "setback", color: "#f59e0b", setbackDepth: 25 })}
                    title="Setback Guide & Buffer Zone Overlay (O)"
                >
                    <Columns2 size={17} />
                </button>

                {/* Utility Route with Dropdown */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button
                        type="button"
                        style={{
                            ...buttonStyle(isToolActive("utility")),
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            paddingRight: "2px"
                        }}
                        onClick={() => selectTool({
                            type: "utility",
                            name: utilitySubtype.name,
                            icon: "utility",
                            utilityType: utilitySubtype.id,
                            color: utilitySubtype.color
                        })}
                        title={`Utility Run: ${utilitySubtype.name} (U)`}
                    >
                        <Zap size={17} style={{ color: isToolActive("utility") ? "#fff" : utilitySubtype.color }} />
                    </button>
                    <button
                        type="button"
                        style={{
                            ...buttonStyle(isToolActive("utility")),
                            width: "16px",
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            paddingLeft: "0px"
                        }}
                        onClick={() => setOpenDropdown(openDropdown === "utility" ? null : "utility")}
                        title="Select Utility Type"
                    >
                        <ChevronDown size={12} />
                    </button>

                    {openDropdown === "utility" && (
                        <div
                            style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                left: 0,
                                width: "190px",
                                backgroundColor: "rgba(24, 24, 27, 0.96)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                borderRadius: "8px",
                                padding: "4px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                zIndex: 100,
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px"
                            }}
                        >
                            {UTILITY_TYPES.map((u) => {
                                const selected = utilitySubtype.id === u.id;
                                return (
                                    <div
                                        key={u.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "6px 10px",
                                            fontSize: "12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            backgroundColor: selected ? "rgba(255, 255, 255, 0.12)" : "transparent",
                                            color: "#f8fafc"
                                        }}
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
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: u.color }} />
                                            <span>{u.name}</span>
                                        </div>
                                        {selected && <Check size={14} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={dividerStyle} />

                {/* 4. Asset Pins (Replacing Home/Apt/Unit) */}
                <button
                    type="button"
                    style={buttonStyle(isToolActive("structure"))}
                    onClick={() => selectTool({ type: "structure", name: "Structure", icon: "structure" })}
                    title="Structure & Dwelling (S) - Replaces Home/Apt/Unit"
                >
                    <Home size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("valve"))}
                    onClick={() => selectTool({ type: "valve", name: "Shut-off Valve", icon: "valve" })}
                    title="Utility & Shut-off Valve (Shift+V)"
                >
                    <Wrench size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("flora"))}
                    onClick={() => selectTool({ type: "flora", name: "Tree / Flora", icon: "flora" })}
                    title="Tree & Landscape Specimen (F)"
                >
                    <Trees size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("inspection"))}
                    onClick={() => selectTool({ type: "inspection", name: "Work Order / Issue", icon: "inspection" })}
                    title="Inspection & Work Order (W)"
                >
                    <AlertCircle size={17} />
                </button>
                <button
                    type="button"
                    style={buttonStyle(isToolActive("fixture"))}
                    onClick={() => selectTool({ type: "fixture", name: "Outdoor Fixture", icon: "fixture" })}
                    title="Outdoor Fixture & HVAC (X)"
                >
                    <Sparkles size={17} />
                </button>

                <div style={dividerStyle} />

                {/* 5. Annotations & Materials */}
                <button
                    type="button"
                    style={buttonStyle(isToolActive("callout"))}
                    onClick={() => selectTool({ type: "callout", name: "Text Callout", icon: "callout" })}
                    title="Text Callout & Note (T)"
                >
                    <Type size={17} />
                </button>

                {/* Material Fill with Dropdown */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button
                        type="button"
                        style={{
                            ...buttonStyle(isToolActive("material")),
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            paddingRight: "2px"
                        }}
                        onClick={() => selectTool({
                            type: "material",
                            name: materialSubtype.name,
                            icon: "material",
                            materialType: materialSubtype.id,
                            color: materialSubtype.color
                        })}
                        title={`Surface Material: ${materialSubtype.name} (G)`}
                    >
                        <Palette size={17} style={{ color: isToolActive("material") ? "#fff" : materialSubtype.color }} />
                    </button>
                    <button
                        type="button"
                        style={{
                            ...buttonStyle(isToolActive("material")),
                            width: "16px",
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            paddingLeft: "0px"
                        }}
                        onClick={() => setOpenDropdown(openDropdown === "material" ? null : "material")}
                        title="Select Material Fill"
                    >
                        <ChevronDown size={12} />
                    </button>

                    {openDropdown === "material" && (
                        <div
                            style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: 0,
                                width: "180px",
                                backgroundColor: "rgba(24, 24, 27, 0.96)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                borderRadius: "8px",
                                padding: "4px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                zIndex: 100,
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px"
                            }}
                        >
                            {MATERIAL_TYPES.map((m) => {
                                const selected = materialSubtype.id === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "6px 10px",
                                            fontSize: "12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            backgroundColor: selected ? "rgba(255, 255, 255, 0.12)" : "transparent",
                                            color: "#f8fafc"
                                        }}
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
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: m.color }} />
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
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "6px 14px",
                        borderRadius: "20px",
                        backgroundColor: "rgba(15, 23, 42, 0.90)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                        fontSize: "12px",
                        color: "#f8fafc"
                    }}
                >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6", boxShadow: "0 0 8px #3b82f6" }} />
                        <strong>{canvasSelect.name || canvasSelect.type}</strong>:
                        {drawingState?.inProgress ? (
                            <span>
                                {drawingState.points?.length || 0} points placed
                                {drawingState.liveMetrics ? ` • ${drawingState.liveMetrics}` : ""}
                            </span>
                        ) : (
                            <span style={{ opacity: 0.85 }}>
                                {["structure", "valve", "flora", "inspection", "fixture", "callout"].includes(canvasSelect.type)
                                    ? "Click anywhere on the map to place"
                                    : "Click on map to start drawing"}
                            </span>
                        )}
                    </span>

                    {drawingState?.inProgress && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "4px" }}>
                            <button
                                type="button"
                                style={{
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    backgroundColor: "#22c55e",
                                    color: "#fff",
                                    border: "none",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                                onClick={finishDrawing}
                            >
                                Done (Enter)
                            </button>
                            <button
                                type="button"
                                style={{
                                    padding: "3px 6px",
                                    borderRadius: "12px",
                                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                                    color: "#ef4444",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center"
                                }}
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
