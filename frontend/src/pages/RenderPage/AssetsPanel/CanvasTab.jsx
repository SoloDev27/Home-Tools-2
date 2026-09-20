export default function CanvasTab({
    canvasSettings, setCanvasSettings, mapDistance, setMapDistance,
}) {
    const themes = [
        { key: "dark", label: "Dark" },
        { key: "light", label: "Light" },
        { key: "blueprint", label: "Blueprint" },
    ];

    const toggleTheme = (t) => {
        const themeColors = {
            dark: { bgColor: "#2a2a3e", gridColor: "#888" },
            light: { bgColor: "#f0f0f0", gridColor: "#aaa" },
            blueprint: { bgColor: "#0a1628", gridColor: "#1e3a5f" },
        };
        setCanvasSettings(s => ({ ...s, theme: t, ...themeColors[t] }));
    };

    const label = (text) => <label className="settings-label">{text}</label>;
    const numInput = (key, min, max, step) => (
        <input type="number" className="input settings-input" min={min} max={max} step={step}
            value={canvasSettings[key]}
            onChange={e => setCanvasSettings(s => ({ ...s, [key]: Number(e.target.value) }))} />
    );
    const toggleBtn = (key, labelText, shortcut) => (
        <div className="settings-row">
            <label className="settings-label">{labelText} {shortcut ? <span>({shortcut})</span> : null}</label>
            <button className={`settings-toggle${canvasSettings[key] ? " active" : ""}`}
                onClick={() => setCanvasSettings(s => ({ ...s, [key]: !s[key] }))}>
                {canvasSettings[key] ? "On" : "Off"}
            </button>
        </div>
    );
    const panLimit = canvasSettings?.mapPanLimit ?? 500;

    return (
        <li className="menu-item-container">
            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Theme</h4>
                <div className="settings-button-grid">
                    {themes.map(t => (
                        <button key={t.key} className={`settings-choice${canvasSettings.theme === t.key ? " active" : ""}`}
                            onClick={() => toggleTheme(t.key)}>{t.label}</button>
                    ))}
                </div>
            </div>
            <div className="menu-tools-section">
                <h4>Grid</h4>
                <div className="settings-row">
                    <label className="settings-label">Grid</label>
                    <button className={`settings-toggle${canvasSettings.gridActive ? " active" : ""}`}
                        onClick={() => setCanvasSettings(s => ({ ...s, gridActive: !s.gridActive }))}>
                        {canvasSettings.gridActive ? "On" : "Off"}
                    </button>
                </div>
                <div className="settings-row stacked">
                    {label("Cell Size")}
                    {numInput("gridPixelSize", 10, 200)}
                </div>
                <div className="settings-row stacked">
                    {label("Grid Color")}
                    <input type="color" className="input settings-color"
                        value={canvasSettings.gridColor}
                        onChange={e => setCanvasSettings(s => ({ ...s, gridColor: e.target.value }))} />
                </div>
                <div className="settings-row stacked">
                    {label("Background")}
                    <input type="color" className="input settings-color"
                        value={canvasSettings.bgColor}
                        onChange={e => setCanvasSettings(s => ({ ...s, bgColor: e.target.value }))} />
                </div>
            </div>
            <div className="menu-tools-section">
                <h4>Canvas</h4>
                <div className="settings-row stacked">
                    {label("Width")}
                    {numInput("canvasWidth", 100, 5000, 50)}
                </div>
                <div className="settings-row stacked">
                    {label("Height")}
                    {numInput("canvasHeight", 100, 5000, 50)}
                </div>
            </div>
            <div className="menu-tools-section">
                <h4>Map Background</h4>
                <div className="settings-row stacked">
                    {label("Distance (m)")}
                    <input type="number" className="input settings-input" min={50} max={10000} step={10}
                        value={mapDistance}
                        onChange={e => setMapDistance(Math.max(50, Math.min(10000, Number(e.target.value) || 200)))} />
                    <input type="range" className="input settings-range" min={50} max={5000} step={10}
                        value={Math.min(5000, Math.max(50, mapDistance))}
                        onChange={e => setMapDistance(Number(e.target.value))}
                    />
                </div>
                <div className="settings-row stacked">
                    {label("Pan Limit (m)")}
                    <input type="number" className="input settings-input" min={100} max={50000} step={50}
                        value={panLimit}
                        onChange={e => setCanvasSettings(s => ({ ...s, mapPanLimit: Math.max(100, Math.min(50000, Number(e.target.value) || 500)) }))} />
                    <input type="range" className="input settings-range" min={100} max={10000} step={50}
                        value={Math.min(10000, Math.max(100, panLimit))}
                        onChange={e => setCanvasSettings(s => ({ ...s, mapPanLimit: Number(e.target.value) }))}
                    />
                </div>
            </div>

            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Snapping</h4>
                {toggleBtn("gridSnap", "Grid Snap", "G")}
                {toggleBtn("edgeSnap", "Edge Snap", "E")}
                {toggleBtn("alignmentGuides", "Alignment Guides", "A")}
                <div className="settings-row stacked">
                    {label("Snap Threshold")}
                    {numInput("snapThreshold", 5, 50)}
                </div>
            </div>

            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Measurements</h4>
                {toggleBtn("showMeasurements", "Show Measurements", "M")}
                <div className="settings-row stacked">
                    <label className="settings-label">Unit</label>
                    <div className="settings-button-grid">
                        <button className={`settings-choice${canvasSettings.unit === "metric" ? " active" : ""}`}
                            onClick={() => setCanvasSettings(s => ({ ...s, unit: "metric" }))}>Metric</button>
                        <button className={`settings-choice${canvasSettings.unit === "imperial" ? " active" : ""}`}
                            onClick={() => setCanvasSettings(s => ({ ...s, unit: "imperial" }))}>Imperial</button>
                    </div>
                </div>
            </div>

            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Section Walls</h4>
                <div className="settings-row stacked">
                    {label("Wall Padding")}
                    {numInput("wallPadding", 1, 80, 1)}
                </div>
                <div className="settings-row stacked">
                    {label("Door Width")}
                    {numInput("doorWidth", 12, 160, 2)}
                </div>
                <div className="settings-row stacked">
                    {label("Window Width")}
                    {numInput("windowWidth", 12, 180, 2)}
                </div>
            </div>

            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Rooms</h4>
                {toggleBtn("roomAutoColors", "Room Auto-Colors")}
            </div>
        </li>
    );
}
