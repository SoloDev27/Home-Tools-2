import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, Layers, Plus, CheckCircle, Clock, AlertCircle, DollarSign, Trash2, Check, Edit3, Palette, Tag, MapPin } from "lucide-react";
import { thunkCreateNote, thunkEditNote, thunkDeleteNote } from "../../redux/notes";
import { thunkEditProperty } from "../../redux/properties";
import { thunkEditArea } from "../../redux/areas";
import { thunkEditFeature } from "../../redux/features";

const COLOR_PALETTE = [
    "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
    "#eab308", "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#64748b"
];

const STRUCTURE_ICONS = ["🏠", "🏢", "🚗", "🛖", "🏊", "🏡", "🏭", "⛺", "📦", "🚜", "🌲", "🧱", "⚡", "🚰", "💡"];
const FEATURE_ICONS = ["🌳", "🚰", "⚡", "🧱", "🏊", "🚗", "💡", "📐", "📏", "📦", "🚜", "🛖", "🏠", "📍", "🎯"];

export default function StructureNotesModal({
    isOpen,
    onClose,
    item,
    itemType = "structure",
    structure,
    areaName,
    notes = [],
    mapId,
    onUpdateStructure,
    onUpdateArea,
    onUpdateFeature,
    onNavigateStudio
}) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Support both direct item prop or legacy structure prop
    const targetItem = item || structure;
    const effectiveType = item ? itemType : (structure ? "structure" : "area");

    const [itemName, setItemName] = useState("");
    const [itemIcon, setItemIcon] = useState("🏠");
    const [itemColor, setItemColor] = useState("#6366f1");
    const [isSavingName, setIsSavingName] = useState(false);

    // Note form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("inspection");
    const [priority, setPriority] = useState("medium");
    const [costEstimate, setCostEstimate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (targetItem) {
            setItemName(targetItem.name || "");
            const icon = targetItem.properties_data?.icon || targetItem.icon || (effectiveType === "feature" ? "📍" : "🏠");
            setItemIcon(icon);
            const color = targetItem.properties_data?.color || targetItem.color || (effectiveType === "area" ? "#6366f1" : "#3b82f6");
            setItemColor(color);
        }
    }, [targetItem, effectiveType]);

    if (!isOpen || !targetItem) return null;

    // Filter notes for this specific entity
    const targetNotes = notes.filter(n => {
        if (effectiveType === "structure") {
            return Number(n.property_id) === Number(targetItem.id);
        }
        if (effectiveType === "feature") {
            return Number(n.feature_id) === Number(targetItem.id);
        }
        if (effectiveType === "area") {
            return Number(n.area_id) === Number(targetItem.id) && !n.property_id && !n.feature_id;
        }
        return false;
    });

    const handleSaveName = async () => {
        const trimmed = itemName.trim();
        if (!trimmed || !targetItem || trimmed === targetItem.name) return;
        setIsSavingName(true);
        try {
            if (effectiveType === "structure") {
                if (onUpdateStructure) {
                    await onUpdateStructure(targetItem.id, { name: trimmed });
                } else {
                    await dispatch(thunkEditProperty(targetItem.id, { name: trimmed }));
                }
            } else if (effectiveType === "area") {
                if (onUpdateArea) {
                    await onUpdateArea(targetItem.id, { name: trimmed });
                } else {
                    await dispatch(thunkEditArea(targetItem.id, { name: trimmed }));
                }
            } else if (effectiveType === "feature") {
                if (onUpdateFeature) {
                    await onUpdateFeature(targetItem.id, { name: trimmed });
                } else {
                    await dispatch(thunkEditFeature(targetItem.id, { name: trimmed }));
                }
            }
        } catch (err) {
            console.error("Failed to update item name:", err);
        } finally {
            setIsSavingName(false);
        }
    };

    const handleSelectIcon = async (emoji) => {
        if (!targetItem) return;
        setItemIcon(emoji);
        try {
            if (effectiveType === "structure") {
                if (onUpdateStructure) {
                    await onUpdateStructure(targetItem.id, { icon: emoji });
                } else {
                    await dispatch(thunkEditProperty(targetItem.id, { icon: emoji }));
                }
            } else if (effectiveType === "feature") {
                const updatedProps = { ...(targetItem.properties_data || {}), icon: emoji };
                if (onUpdateFeature) {
                    await onUpdateFeature(targetItem.id, { icon: emoji, properties_data: updatedProps });
                } else {
                    await dispatch(thunkEditFeature(targetItem.id, { icon: emoji, properties_data: updatedProps }));
                }
            }
        } catch (err) {
            console.error("Failed to update icon:", err);
        }
    };

    const handleSelectColor = async (colorHex) => {
        if (!targetItem) return;
        setItemColor(colorHex);
        try {
            if (effectiveType === "area") {
                if (onUpdateArea) {
                    await onUpdateArea(targetItem.id, { color: colorHex });
                } else {
                    await dispatch(thunkEditArea(targetItem.id, { color: colorHex }));
                }
            } else if (effectiveType === "feature") {
                const updatedProps = { ...(targetItem.properties_data || {}), color: colorHex };
                if (onUpdateFeature) {
                    await onUpdateFeature(targetItem.id, { color: colorHex, properties_data: updatedProps });
                } else {
                    await dispatch(thunkEditFeature(targetItem.id, { color: colorHex, properties_data: updatedProps }));
                }
            }
        } catch (err) {
            console.error("Failed to update color:", err);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setIsSubmitting(true);
        try {
            const payload = {
                map_id: Number(mapId),
                title: title.trim(),
                content: content.trim(),
                category,
                priority,
                cost_estimate: costEstimate ? parseFloat(costEstimate) : null,
                status: "open",
                area_id: null,
                property_id: null,
                feature_id: null
            };

            if (effectiveType === "structure") {
                payload.property_id = Number(targetItem.id);
                payload.area_id = targetItem.area_id ? Number(targetItem.area_id) : null;
            } else if (effectiveType === "area") {
                payload.area_id = Number(targetItem.id);
            } else if (effectiveType === "feature") {
                payload.feature_id = Number(targetItem.id);
                payload.area_id = targetItem.area_id ? Number(targetItem.area_id) : null;
            }

            await dispatch(thunkCreateNote(payload));
            setTitle("");
            setContent("");
            setCostEstimate("");
        } catch (err) {
            console.error("Failed to create note:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (note) => {
        const nextStatus = note.status === "open" ? "in_progress" : note.status === "in_progress" ? "completed" : "open";
        await dispatch(thunkEditNote(note.id, { status: nextStatus }));
    };

    const handleDeleteNote = async (noteId) => {
        if (window.confirm("Delete this note?")) {
            await dispatch(thunkDeleteNote(noteId));
        }
    };

    const typeTitle = effectiveType === "structure"
        ? "Edit Structure"
        : effectiveType === "area"
            ? "Edit Area Boundary"
            : `Edit Feature (${targetItem.type || "CAD"})`;

    return (
        <div className="unified-modal-overlay" onClick={onClose}>
            <div className="unified-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="unified-modal-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {typeTitle}
                            </span>
                            {areaName && effectiveType !== "area" && (
                                <span style={{
                                    fontSize: '11px',
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    color: '#a5b4fc',
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    padding: '2px 8px',
                                    borderRadius: '12px'
                                }}>
                                    Area: {areaName}
                                </span>
                            )}
                            {effectiveType === "area" && targetItem.area_sqft && (
                                <span style={{
                                    fontSize: '11px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#6ee7b7',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 600
                                }}>
                                    {Math.round(targetItem.area_sqft).toLocaleString()} sq ft
                                    {targetItem.area_acres ? ` (${targetItem.area_acres} acres)` : ''}
                                </span>
                            )}
                            {effectiveType === "structure" && targetItem.lat && targetItem.lng && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    {Number(targetItem.lat).toFixed(5)}, {Number(targetItem.lng).toFixed(5)}
                                </span>
                            )}
                            {effectiveType === "feature" && (
                                <span style={{
                                    fontSize: '11px',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    color: '#93c5fd',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    textTransform: 'capitalize'
                                }}>
                                    Type: {targetItem.type}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Editable Title Input & Icon/Swatch Preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {effectiveType === "area" ? (
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                backgroundColor: itemColor,
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontSize: '18px'
                            }}>
                                📐
                            </div>
                        ) : (
                            <div style={{
                                fontSize: '22px',
                                background: 'rgba(99, 102, 241, 0.25)',
                                border: '1.5px solid #6366f1',
                                borderRadius: '8px',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {itemIcon}
                            </div>
                        )}
                        <input
                            type="text"
                            value={itemName}
                            onChange={e => setItemName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
                            placeholder={`${effectiveType} title / name...`}
                            autoFocus
                            style={{
                                flex: 1,
                                background: '#1e293b',
                                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                color: '#f8fafc',
                                fontSize: '15px',
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleSaveName}
                            disabled={isSavingName || !itemName.trim() || itemName.trim() === targetItem.name}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#4f46e5',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                opacity: (!itemName.trim() || itemName.trim() === targetItem.name) ? 0.5 : 1,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Check size={14} /> {isSavingName ? "Saved" : "Save Title"}
                        </button>
                    </div>

                    {/* Icon Selection Palette (Structures & Features) */}
                    {(effectiveType === "structure" || effectiveType === "feature") && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            flexWrap: 'wrap'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginRight: '4px' }}>
                                Choose Icon:
                            </span>
                            {(effectiveType === "feature" ? FEATURE_ICONS : STRUCTURE_ICONS).map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleSelectIcon(emoji)}
                                    style={{
                                        fontSize: '15px',
                                        background: itemIcon === emoji ? '#4f46e5' : 'rgba(30, 41, 59, 0.8)',
                                        border: itemIcon === emoji ? '1.5px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '5px',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        transform: itemIcon === emoji ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                    title={`Set icon to ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Color Palette (Area Boundaries & Features) */}
                    {(effectiveType === "area" || effectiveType === "feature") && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            flexWrap: 'wrap'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Palette size={12} /> Theme Color:
                            </span>
                            {COLOR_PALETTE.map(col => (
                                <button
                                    key={col}
                                    type="button"
                                    onClick={() => handleSelectColor(col)}
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        backgroundColor: col,
                                        border: itemColor.toLowerCase() === col.toLowerCase() ? '2px solid #ffffff' : '1.5px solid rgba(0,0,0,0.4)',
                                        cursor: 'pointer',
                                        boxShadow: itemColor.toLowerCase() === col.toLowerCase() ? `0 0 8px ${col}` : 'none',
                                        transform: itemColor.toLowerCase() === col.toLowerCase() ? 'scale(1.2)' : 'scale(1)',
                                        transition: 'transform 0.15s ease'
                                    }}
                                    title={`Select ${col}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="unified-modal-body">
                    {/* Drill-down Callout to 2D & 3D Floorplan Studio (For Structures) */}
                    {effectiveType === "structure" && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(124, 58, 237, 0.2))',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>
                                    2D Floorplan & 3D WebGL Studio
                                </div>
                                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                                    Drill into interior walls, furniture placement, and 3D walkthrough
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (onNavigateStudio) {
                                        onNavigateStudio(targetItem.id);
                                    } else {
                                        navigate(`/render/${targetItem.id}`);
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#6366f1',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 14px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Layers size={15} />
                                Enter Studio
                            </button>
                        </div>
                    )}

                    {/* Fast Note Creation Form */}
                    <form onSubmit={handleAddNote} style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                            Add Note / Work Order to this {effectiveType === "area" ? "Boundary" : effectiveType === "feature" ? "Feature" : "Structure"}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <input
                                type="text"
                                placeholder="Note title (e.g., Annual Inspection, Repair, Specification)..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                style={{
                                    gridColumn: '1 / -1',
                                    background: '#1e293b',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    padding: '7px 10px',
                                    color: '#f8fafc',
                                    fontSize: '12px'
                                }}
                            />
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    color: '#f8fafc',
                                    fontSize: '12px'
                                }}
                            >
                                <option value="inspection">Inspection</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="work_order">Work Order</option>
                                <option value="estimate">Cost Estimate</option>
                                <option value="general">General</option>
                            </select>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '8px', color: '#94a3b8', fontSize: '12px' }}>$</span>
                                <input
                                    type="number"
                                    placeholder="Cost Est."
                                    value={costEstimate}
                                    onChange={e => setCostEstimate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: '#1e293b',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '6px',
                                        padding: '6px 10px 6px 20px',
                                        color: '#f8fafc',
                                        fontSize: '12px'
                                    }}
                                />
                            </div>
                        </div>
                        <textarea
                            placeholder="Details, observations, technician notes, or contractor instructions..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={2}
                            style={{
                                width: '100%',
                                background: '#1e293b',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                padding: '7px 10px',
                                color: '#f8fafc',
                                fontSize: '12px',
                                resize: 'vertical',
                                marginBottom: '8px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={!title.trim() || !content.trim() || isSubmitting}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#3b82f6',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    opacity: (!title.trim() || !content.trim() || isSubmitting) ? 0.5 : 1
                                }}
                            >
                                <Plus size={14} />
                                {isSubmitting ? "Adding..." : "Add Note"}
                            </button>
                        </div>
                    </form>

                    {/* Existing Notes List */}
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Attached Notes ({targetNotes.length})
                        </div>
                        {targetNotes.length === 0 ? (
                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                                No notes recorded for this {effectiveType} yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {targetNotes.map(n => (
                                    <div key={n.id} className="unified-note-card">
                                        <div className="unified-note-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(n)}
                                                    title={`Status: ${n.status}. Click to cycle.`}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                                >
                                                    {n.status === 'completed' ? (
                                                        <CheckCircle size={16} color="#4ade80" />
                                                    ) : n.status === 'in_progress' ? (
                                                        <Clock size={16} color="#fbbf24" />
                                                    ) : (
                                                        <AlertCircle size={16} color="#f87171" />
                                                    )}
                                                </button>
                                                <span className="unified-note-title">{n.title}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {n.cost_estimate && (
                                                    <span className="unified-cost-badge">
                                                        ${Number(n.cost_estimate).toLocaleString()}
                                                    </span>
                                                )}
                                                <span className={`unified-note-badge badge-${n.status}`}>
                                                    {n.status}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteNote(n.id)}
                                                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                                                    title="Delete note"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                                            {n.content}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                                            Category: {n.category} • Priority: {n.priority}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="unified-modal-footer">
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#e2e8f0',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export { StructureNotesModal as ItemEditNotesModal };
