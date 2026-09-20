import { useState, useRef, useCallback } from "react";
import "./ImportsTab.css";

export default function ImportsTab({ onSelectCatalogItem, activeItemId = null, importedObjects = [], onDeleteImport, onUploadImport }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const filteredObjects = importedObjects.filter(obj =>
        !searchQuery || obj.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleFileUpload = useCallback((file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            onUploadImport?.({
                id: `imported-${Date.now()}`,
                name: file.name.replace(/\.(glb|gltf)$/i, ""),
                category: "Imported",
                width: 100,
                height: 100,
                height3d: 80,
                widthMeters: 1,
                heightMeters: 1,
                heightMeters3d: 0.8,
                fill: "#8B5CF6",
                icon: "📦",
                modelUrl: reader.result,
                isCustom: true,
            });
        };
        reader.readAsDataURL(file);
    }, [onUploadImport]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    return (
        <li className="menu-item-container">
            <div className="menu-tools-section">
                <h4>Imports</h4>
                <div
                    className={`objects-upload-dropzone ${dragOver ? "dropzone-active" : ""}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <span className="imports-upload-icon">📎</span>
                    <span>Drop GLB/GLTF here or click to upload</span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".glb,.gltf"
                        className="imports-file-input"
                        onChange={(e) => {
                            if (e.target.files[0]) handleFileUpload(e.target.files[0]);
                            e.target.value = "";
                        }}
                    />
                </div>

                <input
                    type="text"
                    className="input objects-catalog-search imports-search-input"
                    placeholder="Search imports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <ul className="tool-list objects-catalog-list">
                    {filteredObjects.map(obj => (
                        <li
                            key={obj.id}
                            className={`tool-item object-tool-item${activeItemId === obj.id ? " tool-item-active" : ""}`}
                            onClick={() => onSelectCatalogItem?.(obj)}
                            title={`Click to place: ${obj.name}`}
                        >
                            <span className="object-tool-icon">{obj.icon || "📦"}</span>
                            <span className="object-tool-name">{obj.name}</span>
                            <button
                                className="panel-icon-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteImport?.(obj.id);
                                }}
                                title="Delete"
                            >✕</button>
                        </li>
                    ))}
                    {filteredObjects.length === 0 && (
                        <p className="objects-empty-state">No imported objects</p>
                    )}
                </ul>
            </div>
        </li>
    );
}
