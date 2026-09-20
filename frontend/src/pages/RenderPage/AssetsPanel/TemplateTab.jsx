import { useCallback, useEffect, useRef, useState } from "react";
import "./TemplateTab.css";
import { BUILTIN_TEMPLATES } from "../../../functions/outlineTemplates";
import { BUILTIN_ROOM_TEMPLATES } from "../../../functions/roomTemplates";
import { BUILTIN_OBJECT_TEMPLATES } from "../../../functions/objectTemplates";
import { exportGeoJSON, exportSVG, exportPDF, parseGeoJSON, parseDXF } from "../../../functions/outlineExport";

export default function TemplateTab({ outlines, onLoadTemplate, onLoadBuiltin, onImport, stage, onApplyTemplate, onApplyObjectTemplate, activeObjectTemplateId = null }) {
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [importError, setImportError] = useState(null);
    const geoJsonInputRef = useRef(null);
    const dxfInputRef = useRef(null);

    const loadSavedTemplates = useCallback(() => {
        try {
            const stored = localStorage.getItem("render_templates");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setSavedTemplates(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load templates:", e);
        }
    }, []);

    useEffect(() => {
        loadSavedTemplates();
    }, [loadSavedTemplates]);

    const saveTemplate = () => {
        if (!outlines || outlines.length === 0) {
            alert("No outlines to save");
            return;
        }
        const name = window.prompt("Enter template name:", "Building Template");
        if (!name) return;

        const template = {
            id: `custom-${Date.now()}`,
            name,
            outlines: outlines.map(o => ({
                ...o,
                points: Array.isArray(o.points) ? o.points.map(p => [...p]) : undefined,
            })),
            createdAt: new Date().toISOString(),
        };

        const updated = [...savedTemplates, template];
        localStorage.setItem("render_templates", JSON.stringify(updated));
        setSavedTemplates(updated);
    };

    const deleteTemplate = (id) => {
        if (!window.confirm("Delete this template?")) return;
        const updated = savedTemplates.filter(t => t.id !== id);
        localStorage.setItem("render_templates", JSON.stringify(updated));
        setSavedTemplates(updated);
    };

    const handleFileImport = async (file, parser) => {
        setImportError(null);
        const text = await file.text();
        try {
            const imported = await parser(text);
            if (imported.length > 0) {
                onImport?.(imported);
            } else {
                setImportError("No valid outlines found in file");
            }
        } catch (e) {
            setImportError(`Import failed: ${e.message}`);
        }
    };

    const handlePaste = async () => {
        setImportError(null);
        try {
            const text = await navigator.clipboard.readText();
            const imported = parseGeoJSON(text);
            if (imported.length > 0) {
                onImport?.(imported);
            } else {
                setImportError("Clipboard doesn't contain valid GeoJSON");
            }
        } catch (e) {
            setImportError("Failed to read clipboard");
        }
    };

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExport = async (format) => {
        if (!outlines || outlines.length === 0) {
            alert("No outlines to export");
            return;
        }

        try {
            if (format === "geojson") {
                const json = exportGeoJSON(outlines);
                const blob = new Blob([json], { type: "application/geo+json" });
                downloadBlob(blob, `outlines-${Date.now()}.geojson`);
            } else if (format === "svg") {
                const svg = exportSVG(outlines);
                const blob = new Blob([svg], { type: "image/svg+xml" });
                downloadBlob(blob, `outlines-${Date.now()}.svg`);
            } else if (format === "pdf") {
                const blob = await exportPDF(outlines);
                downloadBlob(blob, `outlines-${Date.now()}.pdf`);
            } else if (format === "copy") {
                const json = JSON.stringify(outlines.map(o => ({
                    ...o,
                    points: Array.isArray(o.points) ? o.points.map(p => [...p]) : undefined,
                })), null, 2);
                await navigator.clipboard.writeText(json);
                alert("Outlines copied to clipboard");
            }
        } catch (e) {
            console.error("Export failed:", e);
            alert(`Export failed: ${e.message}`);
        }
    };

    return (
        <li className="menu-item-container">
            <div className="menu-tools-section">
                <h4>Templates</h4>
                <div className="panel-action-row">
                    <button className="panel-btn" onClick={saveTemplate} title="Save current outlines as template">⊞ Save Current</button>
                </div>
                <ul className="tool-list">
                    {savedTemplates.length === 0 ? (
                        <li className="tool-item tool-item-muted">
                            <span>No saved templates yet</span>
                        </li>
                    ) : (
                        savedTemplates.map(template => (
                            <li key={template.id} className="tool-item template-list-item" onClick={() => onLoadTemplate?.(template)}>
                                <span className="template-list-name">
                                    {template.name} <span className="template-outline-count">({template.outlines.length} outlines)</span>
                                </span>
                                <button
                                    className="panel-icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTemplate(template.id);
                                    }}
                                    title="Delete">✕</button>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Import</h4>
                <input ref={geoJsonInputRef} type="file" accept=".geojson,.json" className="template-file-input" onChange={e => {
                    if (e.target.files[0]) handleFileImport(e.target.files[0], parseGeoJSON);
                    e.target.value = "";
                }} />
                <input ref={dxfInputRef} type="file" accept=".dxf" className="template-file-input" onChange={e => {
                    if (e.target.files[0]) handleFileImport(e.target.files[0], parseDXF);
                    e.target.value = "";
                }} />
                <div className="panel-action-row">
                    <button className="panel-btn" onClick={() => geoJsonInputRef.current?.click()}>GeoJSON</button>
                    <button className="panel-btn" onClick={() => dxfInputRef.current?.click()}>DXF</button>
                    <button className="panel-btn" onClick={handlePaste}>Paste</button>
                </div>
                {importError && <p className="template-import-error">{importError}</p>}
            </div>

            <div className="menu-tools-section menu-tools-section-spaced">
                <h4>Export</h4>
                <div className="panel-action-row">
                    <button className="panel-btn" onClick={() => handleExport("geojson")}>GeoJSON</button>
                    <button className="panel-btn" onClick={() => handleExport("svg")}>SVG</button>
                    <button className="panel-btn" onClick={() => handleExport("pdf")}>PDF</button>
                    <button className="panel-btn" onClick={() => handleExport("copy")}>Copy</button>
                </div>
            </div>

            {stage === "sections" && (
                <div className="menu-tools-section menu-tools-section-spaced">
                    <h4>Room Templates</h4>
                    <ul className="tool-list">
                        {BUILTIN_ROOM_TEMPLATES.map(template => (
                            <li key={template.id}
                                className="tool-item"
                                onClick={() => onApplyTemplate?.(template.id)}
                                title={template.description}>
                                <span className="template-icon">{template.icon}</span>
                                <span>{template.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {stage === "objects" && (
                <div className="menu-tools-section menu-tools-section-spaced">
                    <h4>Object Templates</h4>
                    <ul className="tool-list">
                        {BUILTIN_OBJECT_TEMPLATES.map(template => (
                            <li key={template.id}
                                className={`tool-item${activeObjectTemplateId === template.id ? " tool-item-active" : ""}`}
                                onClick={() => onApplyObjectTemplate?.(template.id)}
                                title={template.description}>
                                <span className="template-icon">{template.icon}</span>
                                <span>{template.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {stage === "outline" && (
                <div className="menu-tools-section menu-tools-section-spaced">
                    <h4>Built-in Templates</h4>
                    <ul className="tool-list">
                        {BUILTIN_TEMPLATES.map(template => (
                            <li key={template.id}
                                className="tool-item"
                                onClick={() => onLoadBuiltin?.(template.id)}
                                title={template.description}>
                                <span className="template-icon">{template.icon}</span>
                                <span>{template.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
}
