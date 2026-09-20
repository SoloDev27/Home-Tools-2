import { useState } from "react";
import "./BuildToolsTab.css";

const PRIMITIVES = [
    { id: "primitive-cube", label: "Cube", icon: "□", widthMeters: 1, heightMeters: 1, heightMeters3d: 1, fill: "#38bdf8" },
    { id: "primitive-slab", label: "Slab", icon: "▭", widthMeters: 2, heightMeters: 1, heightMeters3d: 0.2, fill: "#94a3b8" },
    { id: "primitive-column", label: "Column", icon: "▮", widthMeters: 0.35, heightMeters: 0.35, heightMeters3d: 2.4, fill: "#cbd5e1" },
    { id: "primitive-panel", label: "Panel", icon: "▯", widthMeters: 1.2, heightMeters: 0.16, heightMeters3d: 2.4, fill: "#64748b" },
];

const OPERATIONS = [
    { type: "extrude-up", label: "Extrude +0.25m", icon: "↑" },
    { type: "extrude-down", label: "Extrude -0.25m", icon: "↓" },
];

export default function BuildToolsTab({
    onSelectCatalogItem,
    activeTool,
    onSelectTool,
    wallHeight,
    onWallHeightChange,
    viewMode,
    onViewModeChange,
    blockSize,
    onBlockSizeChange,
}) {
    const [gridSnap, setGridSnap] = useState(true);
    const [surfaceSnap, setSurfaceSnap] = useState(false);

    const selectPrimitive = (primitive) => {
        onSelectCatalogItem?.({
            ...primitive,
            id: primitive.id,
            name: primitive.label,
            type: "object",
            category: "3D Primitive",
            width: primitive.widthMeters * 100,
            height: primitive.heightMeters * 100,
            height3d: primitive.heightMeters3d * 100,
            icon: primitive.icon,
            modelUrl: null,
        });
    };

    const handleOperation = (type) => {
        if (type === "extrude-up") {
            onWallHeightChange?.(Math.min(10, Number(wallHeight || 2.4) + 0.25));
            return;
        }
        if (type === "extrude-down") {
            onWallHeightChange?.(Math.max(0.5, Number(wallHeight || 2.4) - 0.25));
            return;
        }
        onSelectTool?.({ type });
    };

    return (
        <li className="menu-item-container">
            <div className="menu-tools-section">
                <h4>Build</h4>
                <div className="render3d-view-row">
                    <button
                        className={`tb-btn render3d-mode-btn${viewMode === "block" ? " tb-btn-active" : ""}`}
                        onClick={() => onViewModeChange?.("block")}
                        title="Block View"
                    >
                        Block
                    </button>
                    <button
                        className={`tb-btn render3d-mode-btn${viewMode === "pure" ? " tb-btn-active" : ""}`}
                        onClick={() => onViewModeChange?.("pure")}
                        title="Pure View"
                    >
                        Pure
                    </button>
                </div>

                <h4>Primitives</h4>
                <div className="render3d-primitive-grid">
                    {PRIMITIVES.map(shape => (
                        <button
                            key={shape.id}
                            className="tool-item"
                            onClick={() => selectPrimitive(shape)}
                        >
                            <span className="tool-icon">{shape.icon}</span>
                            <span>{shape.label}</span>
                        </button>
                    ))}
                </div>

                <h4>Extrude</h4>
                <div className="tool-list">
                    {OPERATIONS.map(op => (
                        <button
                            key={op.type}
                            className={`tool-item ${activeTool?.type === op.type ? "tool-item-active" : ""}`}
                            onClick={() => handleOperation(op.type)}
                        >
                            <span className="tool-icon">{op.icon}</span>
                            <span>{op.label}</span>
                        </button>
                    ))}
                </div>

                <h4>Wall Height</h4>
                <input
                    type="number"
                    className="input build-wall-height-input"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={wallHeight ?? 2.4}
                    onChange={e => onWallHeightChange?.(Math.max(0.5, Math.min(10, parseFloat(e.target.value) || 2.4)))}
                />

                <h4>Block Size</h4>
                <div className="render3d-view-row">
                    {[1, 5].map(size => (
                        <button
                            key={size}
                            className={`tb-btn render3d-mode-btn${Number(blockSize || 1) === size ? " tb-btn-active" : ""}`}
                            onClick={() => onBlockSizeChange?.(size)}
                            title={`${size} meter blocks`}
                        >
                            {size}m
                        </button>
                    ))}
                </div>

                <h4>Snapping</h4>
                <div className="build-snap-list">
                    <label className="build-snap-option">
                        <input
                            type="checkbox"
                            checked={gridSnap}
                            onChange={e => setGridSnap(e.target.checked)}
                        />
                        <span>Grid Snap</span>
                    </label>
                    <label className="build-snap-option">
                        <input
                            type="checkbox"
                            checked={surfaceSnap}
                            onChange={e => setSurfaceSnap(e.target.checked)}
                        />
                        <span>Surface Snap</span>
                    </label>
                </div>
            </div>
        </li>
    );
}
