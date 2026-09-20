import { useState } from "react";

const ROOM_TOOLS = [
    { type: "divider", label: "Divider", icon: "✂", desc: "Split a room with a full divider" },
    { type: "select", label: "Select", icon: "↗", desc: "Select and move divider lines" },
    { type: "combine", label: "Merge", icon: "⊞", desc: "Remove a divider and merge rooms" },
];

const OPENING_TOOLS = [
    { type: "door", label: "Door", icon: "▯", desc: "Place a door opening on a room edge" },
    { type: "window", label: "Window", icon: "▭", desc: "Place a window opening on a room edge" },
];

const WALL_TOOLS = [
    { type: "wall_square", label: "Full Wall", icon: "▣", desc: "Pad all room sides with a wall border" },
    { type: "wall_line", label: "Section Wall", icon: "▌", desc: "Pad one clicked room side" },
];

const ROOM_TYPES = [
    { value: "bedroom", label: "Bedroom" },
    { value: "bathroom", label: "Bathroom" },
    { value: "kitchen", label: "Kitchen" },
    { value: "living_room", label: "Living" },
    { value: "dining_room", label: "Dining" },
    { value: "office", label: "Office" },
    { value: "garage", label: "Garage" },
    { value: "closet", label: "Closet" },
    { value: "hallway", label: "Hallway" },
    { value: "other", label: "Other" },
];

function ToolItem({ tool, activeTool, disabled, disabledReason, onClick }) {
    return (
        <li
            className={`tool-item${activeTool?.type === tool.type ? " tool-item-active" : ""}${disabled ? " tool-item-disabled" : ""}`}
            onClick={() => { if (!disabled) onClick?.(); }}
            title={disabled ? disabledReason : tool.desc}
        >
            <span className="tool-icon tool-icon-md">{tool.icon}</span>
            <span>{tool.label}</span>
        </li>
    );
}

export default function SectionsTab({
    activeTool,
    onSelectTool,
    canCombine,
    canSelect,
    onBatchMerge,
    onBatchDelete,
    onBatchChangeType,
    onBatchFullWall,
    multiSelectIds = [],
    canvasSettings,
    setCanvasSettings,
}) {
    const [batchRoomType, setBatchRoomType] = useState("other");
    const isBatchMode = multiSelectIds.length >= 2;
    const wallPadding = canvasSettings?.wallPadding ?? 8;
    const doorWidth = canvasSettings?.doorWidth ?? 34;
    const windowWidth = canvasSettings?.windowWidth ?? 46;

    const updateSetting = (key, value) => {
        setCanvasSettings?.(settings => ({ ...settings, [key]: value }));
    };

    const batchDisabledReason = "Finish batch selection first";

    return (
        <li className="menu-item-container">
            <div className="menu-tools-section">
                <h4>Room Tools</h4>
                <ul className="tool-list">
                    {ROOM_TOOLS.map(tool => {
                        const disabled = (isBatchMode && tool.type !== "select")
                            || (tool.type === "combine" && !canCombine)
                            || (tool.type === "select" && !canSelect);
                        return (
                            <ToolItem
                                key={tool.type}
                                tool={tool}
                                activeTool={activeTool}
                                disabled={disabled}
                                disabledReason={isBatchMode ? batchDisabledReason : "No divider lines to work with"}
                                onClick={() => onSelectTool?.(tool.type)}
                            />
                        );
                    })}
                </ul>
            </div>

            <div className="menu-tools-section">
                <h4>Openings</h4>
                <ul className="tool-list">
                    {OPENING_TOOLS.map(tool => (
                        <ToolItem
                            key={tool.type}
                            tool={tool}
                            activeTool={activeTool}
                            disabled={isBatchMode}
                            disabledReason={batchDisabledReason}
                            onClick={() => onSelectTool?.(tool.type)}
                        />
                    ))}
                </ul>
            </div>

            <div className="menu-tools-section">
                <h4>Walls</h4>
                <ul className="tool-list">
                    {WALL_TOOLS.map(tool => {
                        const sectionWallDisabled = isBatchMode && tool.type === "wall_line";
                        return (
                            <ToolItem
                                key={tool.type}
                                tool={tool}
                                activeTool={activeTool}
                                disabled={sectionWallDisabled}
                                disabledReason="Section Wall needs one room edge"
                                onClick={() => {
                                    if (isBatchMode && tool.type === "wall_square") {
                                        onBatchFullWall?.();
                                        return;
                                    }
                                    onSelectTool?.(tool.type);
                                }}
                            />
                        );
                    })}
                </ul>
            </div>

            {isBatchMode && (
                <div className="menu-tools-section section-batch-panel">
                    <h4>Batch Operations</h4>
                    <div className="section-batch-count">{multiSelectIds.length} rooms selected</div>
                    <div className="panel-action-row">
                        <button className="panel-btn" onClick={onBatchMerge}>Merge All</button>
                        <button className="panel-btn" onClick={onBatchDelete}>Delete All</button>
                        <button className="panel-btn" onClick={onBatchFullWall}>Full Wall</button>
                    </div>
                    <div className="settings-row stacked">
                        <label className="settings-label">Room Type</label>
                        <select className="input settings-input" value={batchRoomType} onChange={e => setBatchRoomType(e.target.value)}>
                            {ROOM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                        <button className="panel-btn" onClick={() => onBatchChangeType?.(batchRoomType)}>Apply Type</button>
                    </div>
                </div>
            )}

            <div className="menu-tools-section">
                <h4>Configure</h4>
                <div className="settings-row stacked">
                    <label className="settings-label">Wall Padding</label>
                    <input
                        type="number"
                        className="input settings-input"
                        min={1}
                        max={80}
                        step={1}
                        value={wallPadding}
                        onChange={e => updateSetting("wallPadding", Math.max(1, Math.min(80, Number(e.target.value) || 1)))}
                    />
                </div>
                <div className="settings-row stacked">
                    <label className="settings-label">Door Width</label>
                    <input
                        type="number"
                        className="input settings-input"
                        min={12}
                        max={160}
                        step={2}
                        value={doorWidth}
                        onChange={e => updateSetting("doorWidth", Math.max(12, Math.min(160, Number(e.target.value) || 12)))}
                    />
                </div>
                <div className="settings-row stacked">
                    <label className="settings-label">Window Width</label>
                    <input
                        type="number"
                        className="input settings-input"
                        min={12}
                        max={180}
                        step={2}
                        value={windowWidth}
                        onChange={e => updateSetting("windowWidth", Math.max(12, Math.min(180, Number(e.target.value) || 12)))}
                    />
                </div>
                <div className="settings-row">
                    <label className="settings-label">Grid Snap <span>(G)</span></label>
                    <button
                        className={`settings-toggle${canvasSettings?.gridSnap ? " active" : ""}`}
                        onClick={() => updateSetting("gridSnap", !canvasSettings?.gridSnap)}
                    >
                        {canvasSettings?.gridSnap ? "On" : "Off"}
                    </button>
                </div>
                <div className="settings-row">
                    <label className="settings-label">Auto Colors</label>
                    <button
                        className={`settings-toggle${canvasSettings?.roomAutoColors ? " active" : ""}`}
                        onClick={() => updateSetting("roomAutoColors", !canvasSettings?.roomAutoColors)}
                    >
                        {canvasSettings?.roomAutoColors ? "On" : "Off"}
                    </button>
                </div>
            </div>
        </li>
    );
}
