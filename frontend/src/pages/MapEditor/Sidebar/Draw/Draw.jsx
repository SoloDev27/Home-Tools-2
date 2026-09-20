import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
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
    MapPin
} from "lucide-react";
import "./Draw.css";

export default function DrawTab({ canvasSelect, savedTypesStore, selectCanvasAddon, setCanvasSelect }) {
    const [tooltip, setTooltip] = useState(null);

    const handleMouseEnter = (name, e) => {
        setTooltip({ name, x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const handleFocus = (name, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            name,
            x: rect.right + 8,
            y: rect.top + rect.height / 2 - 12
        });
    };

    const handleBlur = () => {
        setTooltip(null);
    };

    const geometryTools = [
        {
            id: "polygon",
            name: "Property Boundary",
            icon: <Hexagon size={18} color="#3b82f6" />,
            onClick: () => selectCanvasAddon(null, "Property Boundary", "polygon"),
            isSelected: canvasSelect.type === "polygon",
        },
        {
            id: "rectangle",
            name: "Building Footprint",
            icon: <Square size={18} color="#6366f1" />,
            onClick: () => selectCanvasAddon(null, "Building Footprint", "rectangle"),
            isSelected: canvasSelect.type === "rectangle",
        },
        {
            id: "radius",
            name: "Radius Zone",
            icon: <Circle size={18} color="#8b5cf6" />,
            onClick: () => selectCanvasAddon(null, "Radius Zone", "radius"),
            isSelected: canvasSelect.type === "radius",
        },
        {
            id: "curve",
            name: "Organic Bed / Curve",
            icon: <Spline size={18} color="#10b981" />,
            onClick: () => selectCanvasAddon(null, "Landscape Bed", "curve", { color: "#10b981" }),
            isSelected: canvasSelect.type === "curve",
        },
    ];

    const linearTools = [
        {
            id: "measure",
            name: "Tape Measure",
            icon: <Ruler size={18} color="#0284c7" />,
            onClick: () => selectCanvasAddon(null, "Tape Measure", "measure", { color: "#0284c7" }),
            isSelected: canvasSelect.type === "measure",
        },
        {
            id: "setback",
            name: "Setback Guide (25 ft)",
            icon: <Columns2 size={18} color="#f59e0b" />,
            onClick: () => selectCanvasAddon(null, "Setback Guide (25 ft)", "setback", { color: "#f59e0b", setbackDepth: 25 }),
            isSelected: canvasSelect.type === "setback",
        },
        {
            id: "utility",
            name: "Utility Line",
            icon: <Zap size={18} color="#f97316" />,
            onClick: () => selectCanvasAddon(null, "Electric / Power Run", "utility", { color: "#f97316", utilityType: "electric" }),
            isSelected: canvasSelect.type === "utility",
        },
    ];

    const pinTools = [
        {
            id: "structure",
            name: "Structure & Dwelling",
            icon: <Home size={18} color="#6366f1" />,
            onClick: () => selectCanvasAddon(null, "Structure", "structure"),
            isSelected: canvasSelect.type === "structure",
        },
        {
            id: "valve",
            name: "Shut-off Valve",
            icon: <Wrench size={18} color="#ef4444" />,
            onClick: () => selectCanvasAddon(null, "Shut-off Valve", "valve"),
            isSelected: canvasSelect.type === "valve",
        },
        {
            id: "flora",
            name: "Tree & Flora",
            icon: <Trees size={18} color="#10b981" />,
            onClick: () => selectCanvasAddon(null, "Tree / Flora", "flora"),
            isSelected: canvasSelect.type === "flora",
        },
        {
            id: "inspection",
            name: "Work Order / Issue",
            icon: <AlertCircle size={18} color="#f59e0b" />,
            onClick: () => selectCanvasAddon(null, "Work Order / Issue", "inspection"),
            isSelected: canvasSelect.type === "inspection",
        },
        {
            id: "fixture",
            name: "Outdoor Fixture & HVAC",
            icon: <Sparkles size={18} color="#06b6d4" />,
            onClick: () => selectCanvasAddon(null, "Outdoor Fixture", "fixture"),
            isSelected: canvasSelect.type === "fixture",
        },
        {
            id: "marker",
            name: "General Marker Pin",
            icon: <MapPin size={18} color="#ef4444" />,
            onClick: () => selectCanvasAddon("/icons/geo-alt-fill.svg", "Marker", "marker"),
            isSelected: canvasSelect.type === "marker" || (canvasSelect.type === "icon" && !canvasSelect.savedTypeId),
        },
    ];

    const annotationTools = [
        {
            id: "callout",
            name: "Text Callout Note",
            icon: <Type size={18} color="#8b5cf6" />,
            onClick: () => selectCanvasAddon(null, "Text Callout", "callout", { color: "#8b5cf6" }),
            isSelected: canvasSelect.type === "callout",
        },
        {
            id: "material",
            name: "Surface Material Fill",
            icon: <Palette size={18} color="#22c55e" />,
            onClick: () => selectCanvasAddon(null, "Lawn / Turf Fill", "material", { color: "#22c55e", materialType: "lawn" }),
            isSelected: canvasSelect.type === "material",
        },
    ];

    const renderToolBtn = (tool) => (
        <button
            key={tool.id}
            type="button"
            className={`draw-tool-btn ${tool.isSelected ? 'active' : ''}`}
            onClick={tool.onClick}
            onMouseEnter={(e) => handleMouseEnter(tool.name, e)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onFocus={(e) => handleFocus(tool.name, e)}
            onBlur={handleBlur}
            aria-label={tool.name}
            title=""
        >
            {tool.icon}
        </button>
    );

    const renderTooltipPortal = () => {
        if (!tooltip) return null;

        const offset = 12;
        let left = tooltip.x + offset;
        let top = tooltip.y + offset;

        // Flip to left if too close to right edge
        if (left > window.innerWidth - 180) {
            left = Math.max(10, tooltip.x - offset - 140);
        }
        // Flip to top if too close to bottom edge
        if (top > window.innerHeight - 45) {
            top = Math.max(10, tooltip.y - 32);
        }

        return ReactDOM.createPortal(
            <div
                className="draw-mouse-tooltip"
                style={{ left: `${left}px`, top: `${top}px` }}
                role="tooltip"
            >
                {tooltip.name}
            </div>,
            document.body
        );
    };

    return (
        <div className="draw-tab-container">
            {/* Geometry Tools */}
            <div className="draw-section">
                <h4 className="draw-section-title">Geometry & Enclosures</h4>
                <div className="draw-grid">
                    {geometryTools.map(renderToolBtn)}
                </div>
            </div>

            {/* Linear & Measures */}
            <div className="draw-section">
                <h4 className="draw-section-title">Linear & Utilities</h4>
                <div className="draw-grid">
                    {linearTools.map(renderToolBtn)}
                </div>
            </div>

            {/* Asset Pins */}
            <div className="draw-section">
                <h4 className="draw-section-title">Site Asset Pins</h4>
                <div className="draw-grid">
                    {pinTools.map(renderToolBtn)}
                </div>
            </div>

            {/* Annotations & Materials */}
            <div className="draw-section">
                <h4 className="draw-section-title">Annotations & Style</h4>
                <div className="draw-grid">
                    {annotationTools.map(renderToolBtn)}
                </div>
            </div>

            {/* Custom Saved Types */}
            {savedTypesStore?.data?.length > 0 && (
                <div className="draw-section">
                    <h4 className="draw-section-title">Custom Markers</h4>
                    <div className="draw-grid">
                        {savedTypesStore.data.map(type => {
                            const isSelected = canvasSelect.savedTypeId === type.id;
                            return (
                                <button
                                    key={`saved-type-${type.id}`}
                                    type="button"
                                    className={`draw-tool-btn ${isSelected ? 'active' : ''}`}
                                    onClick={() => setCanvasSelect({
                                        type: "icon",
                                        savedTypeId: type.id,
                                        name: type.name,
                                        icon: type.type
                                    })}
                                    onMouseEnter={(e) => handleMouseEnter(type.name, e)}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                    onFocus={(e) => handleFocus(type.name, e)}
                                    onBlur={handleBlur}
                                    aria-label={type.name}
                                    title=""
                                >
                                    {type.type.length > 5 ? (
                                        <img src={type.type} alt="" className="draw-type-img" />
                                    ) : (
                                        <span className="draw-type-emoji">{type.type}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {renderTooltipPortal()}
        </div>
    );
}
