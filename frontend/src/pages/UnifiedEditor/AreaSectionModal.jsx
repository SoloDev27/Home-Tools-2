import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

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
            <div className="unified-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div className="unified-modal-header">
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                        {initialData?.id ? "Edit Area Details" : "Section New Area"}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="unified-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                                Area / Parcel Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Primary Lot Boundary, Back Parcel..."
                                autoFocus
                                style={{
                                    width: '100%',
                                    background: '#1e293b',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                                Zone Type
                            </label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: '#1e293b',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="lot">Residential Lot / Parcel</option>
                                <option value="boundary">Site Boundary</option>
                                <option value="courtyard">Courtyard / Patio Zone</option>
                                <option value="landscape">Landscape Enclosure</option>
                                <option value="zone">Custom Planning Zone</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                                Boundary Accent Color
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {colors.map(c => (
                                    <button
                                        type="button"
                                        key={c.hex}
                                        onClick={() => setColor(c.hex)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: c.hex,
                                            border: color === c.hex ? '2px solid #ffffff' : '2px solid transparent',
                                            boxShadow: color === c.hex ? `0 0 10px ${c.hex}` : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0
                                        }}
                                    >
                                        {color === c.hex && <Check size={14} color="#ffffff" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {initialData?.area_sqft && (
                            <div style={{
                                background: 'rgba(30, 41, 59, 0.5)',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#94a3b8'
                            }}>
                                📐 Calculated Size: <strong style={{ color: '#f8fafc' }}>{Math.round(initialData.area_sqft).toLocaleString()} sq ft</strong> ({initialData.area_acres?.toFixed(2)} acres)
                            </div>
                        )}
                    </div>

                    <div className="unified-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                color: '#94a3b8',
                                border: 'none',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                background: '#6366f1',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 16px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Save Area
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
