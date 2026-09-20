import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import "./AreaSectionModal.css";

export default function AreaSectionModal({
    isOpen,
    onClose,
    onSave,
    initialData = null
}) {
    const [name, setName] = useState("Main Lot Boundary");
    const [type, setType] = useState("lot");
    const [color, setColor] = useState("#3b82f6");

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "Main Lot Boundary");
            setType(initialData.type || "lot");
            setColor(initialData.color || "#3b82f6");
        } else {
            setName("Main Lot Boundary");
            setType("lot");
            setColor("#3b82f6");
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const colors = [
        { label: "Blue", hex: "#3b82f6" },
        { label: "Emerald", hex: "#10b981" },
        { label: "Purple", hex: "#8b5cf6" },
        { label: "Amber", hex: "#f59e0b" },
        { label: "Cyan", hex: "#06b6d4" },
        { label: "Rose", hex: "#f43f5e" }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name: name.trim() || "Area", type, color });
        onClose();
    };

    return (
        <div className="unified-modal-overlay" onClick={onClose}>
            <div className="unified-modal area-modal-sm" onClick={e => e.stopPropagation()}>
                <div className="unified-modal-header">
                    <h3 className="area-modal-title">
                        {initialData?.id ? "Edit Area Details" : "Section New Area"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="area-modal-close-btn"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="unified-modal-body area-modal-body">
                        <div>
                            <label className="area-modal-label">
                                Area / Parcel Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Primary Lot Boundary, Back Parcel..."
                                autoFocus
                                className="area-modal-input"
                            />
                        </div>

                        <div>
                            <label className="area-modal-label">
                                Zone Type
                            </label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value)}
                                className="area-modal-input"
                            >
                                <option value="lot">Residential Lot / Parcel</option>
                                <option value="boundary">Site Boundary</option>
                                <option value="courtyard">Courtyard / Patio Zone</option>
                                <option value="landscape">Landscape Enclosure</option>
                                <option value="zone">Custom Planning Zone</option>
                            </select>
                        </div>

                        <div>
                            <label className="area-modal-label">
                                Boundary Accent Color
                            </label>
                            <div className="area-modal-colors">
                                {colors.map(c => (
                                    <button
                                        type="button"
                                        key={c.hex}
                                        onClick={() => setColor(c.hex)}
                                        className={`area-modal-swatch${color === c.hex ? " is-selected" : ""}`}
                                        style={{
                                            backgroundColor: c.hex,
                                            boxShadow: color === c.hex ? `0 0 10px ${c.hex}` : 'none'
                                        }}
                                    >
                                        {color === c.hex && <Check size={14} color="var(--color-on-accent)" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {initialData?.area_sqft && (
                            <div className="area-modal-size-box">
                                📐 Calculated Size: <strong className="area-modal-strong">{Math.round(initialData.area_sqft).toLocaleString()} sq ft</strong> ({initialData.area_acres?.toFixed(2)} acres)
                            </div>
                        )}
                    </div>

                    <div className="unified-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="area-modal-cancel-btn"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="area-modal-save-btn"
                        >
                            Save Area
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
