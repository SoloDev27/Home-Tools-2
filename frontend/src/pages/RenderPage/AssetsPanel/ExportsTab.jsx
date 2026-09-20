import { useState } from "react";
import "./ExportsTab.css";

const FORMATS = [
    { value: "gltf", label: "GLTF", description: "JSON format" },
    { value: "glb", label: "GLB", description: "Binary format" },
];

const QUALITY = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "ultra", label: "Ultra" },
];

export default function ExportsTab({
    onExportGLTF,
    onExportSelectedGLTF,
    selectedObjectId,
}) {
    const [format, setFormat] = useState("gltf");
    const [quality, setQuality] = useState("high");
    const [includeCamera, setIncludeCamera] = useState(true);
    const [includeLighting, setIncludeLighting] = useState(true);
    const [includeMaterials, setIncludeMaterials] = useState(true);

    const handleExport = (type) => {
        const settings = {
            format,
            quality,
            includeCamera,
            includeLighting,
            includeMaterials,
        };
        
        if (type === "scene") {
            onExportGLTF?.(settings);
        } else if (type === "selected" && selectedObjectId) {
            onExportSelectedGLTF?.(settings);
        }
    };

    return (
        <div className="exports-tab">
            {/* Format Selection */}
            <div className="exports-section">
                <div className="exports-section-title">
                    FORMAT
                </div>
                <div className="exports-options">
                    {FORMATS.map(f => (
                        <label
                            key={f.value}
                            className={`exports-option${format === f.value ? " is-active" : ""}`}
                        >
                            <input
                                type="radio"
                                name="format"
                                value={f.value}
                                checked={format === f.value}
                                onChange={() => setFormat(f.value)}
                            />
                            <span>{f.label}</span>
                            <span className="exports-option-desc">({f.description})</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Quality Selection */}
            <div className="exports-section">
                <div className="exports-section-title">
                    QUALITY
                </div>
                <div className="exports-options">
                    {QUALITY.map(q => (
                        <label
                            key={q.value}
                            className={`exports-option${quality === q.value ? " is-active" : ""}`}
                        >
                            <input
                                type="radio"
                                name="quality"
                                value={q.value}
                                checked={quality === q.value}
                                onChange={() => setQuality(q.value)}
                            />
                            <span>{q.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Include Options */}
            <div className="exports-section">
                <div className="exports-section-title">
                    INCLUDE
                </div>
                <div className="exports-options">
                    <label className="exports-option">
                        <input
                            type="checkbox"
                            checked={includeCamera}
                            onChange={e => setIncludeCamera(e.target.checked)}
                        />
                        <span>Camera Position</span>
                    </label>
                    <label className="exports-option">
                        <input
                            type="checkbox"
                            checked={includeLighting}
                            onChange={e => setIncludeLighting(e.target.checked)}
                        />
                        <span>Lighting</span>
                    </label>
                    <label className="exports-option">
                        <input
                            type="checkbox"
                            checked={includeMaterials}
                            onChange={e => setIncludeMaterials(e.target.checked)}
                        />
                        <span>Materials</span>
                    </label>
                </div>
            </div>

            {/* Export Buttons */}
            <div className="exports-actions">
                <button
                    className="tool-item exports-action"
                    onClick={() => handleExport("scene")}
                >
                    <span className="exports-action-icon">📦</span>
                    <span>Export Entire Scene</span>
                </button>
                {selectedObjectId && (
                    <button
                        className="tool-item exports-action"
                        onClick={() => handleExport("selected")}
                    >
                        <span className="exports-action-icon">🎯</span>
                        <span>Export Selected Object</span>
                    </button>
                )}
            </div>

            <div className="exports-note">
                Downloads as .{format} file
            </div>
        </div>
    );
}
