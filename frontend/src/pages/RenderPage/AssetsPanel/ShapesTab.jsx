const PRIMITIVE_ITEMS = [
    { type: "polygon", label: "Polygon", icon: "✎" },
    { type: "rectangle", label: "Rectangle", icon: "▭" },
    { type: "circle", label: "Circle", icon: "○" },
    { type: "triangle", label: "Triangle", icon: "△", sides: 3 },
    { type: "pentagon", label: "Pentagon", icon: "⬠", sides: 5 },
    { type: "hexagon", label: "Hexagon", icon: "⬡", sides: 6 },
    { type: "octagon", label: "Octagon", icon: "⯃", sides: 8 },
];

const OUTLINE_TOOLS = [
    { type: "union", label: "Union", icon: "⊕", desc: "Merge selected outlines" },
    { type: "subtract", label: "Subtract", icon: "⊖", desc: "Subtract outlines" },
    { type: "intersect", label: "Intersect", icon: "⊗", desc: "Intersect outlines" },
];

export default function ShapesTab({ setPendingPlacement, activeTool, selectedCount = 0, onBooleanOp }) {
    const handleAdd = (item) => {
        if (item.type === "polygon") {
            setPendingPlacement({ type: "polygon", active: true });
        } else {
            setPendingPlacement({ type: item.type, sides: item.sides, active: true });
        }
    };

    const handleConfigure = (toolType) => onBooleanOp?.(toolType);

    const getToolDisabledReason = (toolType) => {
        return selectedCount < 2 ? "Select 2+ outlines first" : "";
    };

    return (
        <li className="menu-item-container">
            <div className="menu-tools-section">
                <h4>Primitives</h4>
                <ul className="tool-list">
                    {PRIMITIVE_ITEMS.map(item => {
                        const isActive = activeTool?.type === "polygon" && item.type === "polygon";
                        return (
                            <li key={item.type}
                                className={`tool-item${isActive ? " tool-item-active" : ""}${item.type === "polygon" ? " is-crosshair" : ""}`}
                                onClick={() => handleAdd(item)}
                                title="Click to select, then click on map to place">
                                <span className="tool-icon tool-icon-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Join</h4>
                <ul className="tool-list">
                    {OUTLINE_TOOLS.map(tool => {
                        const disabledReason = getToolDisabledReason(tool.type);
                        return (
                            <li key={tool.type}
                                className={`tool-item${disabledReason ? " tool-item-disabled" : ""}`}
                                onClick={() => { if (disabledReason) return; handleConfigure(tool.type); }}
                                title={disabledReason || tool.desc}>
                                <span className="tool-icon tool-icon-md">{tool.icon}</span>
                                <span>{tool.label}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </li>
    );
}
