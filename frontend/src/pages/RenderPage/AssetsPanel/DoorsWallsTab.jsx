import { useState } from "react";
import "./DoorsWallsTab.css";

const DOOR_TYPES = [
    { id: "door-single", name: "Single Door", icon: "🚪", width: 90, height: 210, height3d: 210 },
    { id: "door-double", name: "Double Door", icon: "🚪", width: 160, height: 210, height3d: 210 },
    { id: "door-sliding", name: "Sliding Door", icon: "🚪", width: 180, height: 210, height3d: 210 },
    { id: "door-french", name: "French Door", icon: "🚪", width: 140, height: 210, height3d: 210 },
];

const WINDOW_TYPES = [
    { id: "window-single", name: "Single Window", icon: "🪟", width: 100, height: 100, height3d: 100 },
    { id: "window-double", name: "Double Window", icon: "🪟", width: 160, height: 100, height3d: 100 },
    { id: "window-bay", name: "Bay Window", icon: "🪟", width: 180, height: 120, height3d: 120 },
    { id: "window-skylight", name: "Skylight", icon: "🪟", width: 120, height: 80, height3d: 80 },
];

const WALL_TYPES = [
    { id: "wall-standard", name: "Standard Wall", icon: "🧱", width: 100, height: 10, height3d: 240 },
    { id: "wall-half", name: "Half Wall", icon: "🧱", width: 100, height: 10, height3d: 120 },
    { id: "wall-full", name: "Full Wall", icon: "🧱", width: 100, height: 10, height3d: 360 },
];

export default function DoorsWallsTab({ selectedElement, onApplyElementStyle, wallHeight, onWallHeightChange }) {
    const [activeCategory, setActiveCategory] = useState("doors");

    const categories = [
        { id: "doors", label: "Doors", icon: "🚪" },
        { id: "windows", label: "Windows", icon: "🪟" },
        { id: "walls", label: "Walls", icon: "🧱" },
    ];

    const getItems = () => {
        switch (activeCategory) {
            case "doors": return DOOR_TYPES;
            case "windows": return WINDOW_TYPES;
            case "walls": return WALL_TYPES;
            default: return [];
        }
    };

    const selectedKind = selectedElement?.type === "wall"
        ? "walls"
        : selectedElement?.openingType === "door"
            ? "doors"
            : selectedElement?.openingType === "window"
                ? "windows"
                : null;
    const canApply = selectedKind === activeCategory;

    return (
        <li className="menu-item-container">
            <div className="menu-tools-section">
                <h4>Architectural Elements</h4>
                <div className="objects-category-row">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`tb-btn${activeCategory === cat.id ? " active" : ""}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>

                <div className={`objects-target-card${canApply ? " target-ready" : ""}`}>
                    <span>{selectedElement ? (selectedElement.name || selectedElement.styleName || selectedElement.openingType || selectedElement.wallType || "Selected element") : "No section element selected"}</span>
                    <small>{canApply ? "Ready" : `Select a ${activeCategory === "doors" ? "door" : activeCategory === "windows" ? "window" : "wall"} from the layout tree`}</small>
                </div>

                <ul className="tool-list objects-catalog-list">
                    {getItems().map(item => (
                        <li
                            key={item.id}
                            className={`tool-item object-tool-item${!canApply ? " tool-item-disabled" : ""}${selectedElement?.styleId === item.id ? " tool-item-active" : ""}`}
                            onClick={() => {
                                if (!canApply) return;
                                onApplyElementStyle?.({
                                    ...item,
                                    category: activeCategory,
                                    fill: activeCategory === "walls" ? "#9CA3AF" : "#D1D5DB",
                                });
                            }}
                            title={item.name}
                        >
                            <span className="object-tool-icon">{item.icon}</span>
                            <span className="object-tool-name">{item.name}</span>
                        </li>
                    ))}
                </ul>

                <div className="menu-tools-section menu-tools-section-spaced">
                    <h4>Wall Height</h4>
                    <div className="settings-row stacked">
                        <input
                            type="range"
                            className="input"
                            min={2.4}
                            max={3.6}
                            step={0.1}
                            value={wallHeight || 2.4}
                            onChange={(e) => {
                                const next = Number(e.target.value);
                                onWallHeightChange?.(next);
                                if (selectedElement?.type === "wall") {
                                    onApplyElementStyle?.({
                                        id: selectedElement.styleId || "wall-standard",
                                        name: selectedElement.styleName || selectedElement.name || "Wall",
                                        height3d: next * 100,
                                    });
                                }
                            }}
                        />
                        <span className="doors-walls-height-value">
                            {wallHeight || 2.4}m
                        </span>
                    </div>
                </div>
            </div>
        </li>
    );
}
