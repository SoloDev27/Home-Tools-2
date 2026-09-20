import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, Layers, Plus, CheckCircle, Clock, AlertCircle, DollarSign, Trash2, Check, Edit3, Palette, Tag, MapPin } from "lucide-react";
import { thunkCreateNote, thunkEditNote, thunkDeleteNote } from "../../redux/notes";
import { thunkEditProperty } from "../../redux/properties";
import { thunkEditArea } from "../../redux/areas";
import { thunkEditFeature } from "../../redux/features";
import "./StructureNotesModal.css";

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
            <div className="unified-modal item-modal-wide" onClick={e => e.stopPropagation()}>
                <div className="unified-modal-header item-modal-header">
                    <div className="item-modal-header-row">
                        <div className="item-modal-title-row">
                            <span className="item-modal-type-title">
                                {typeTitle}
                            </span>
                            {areaName && effectiveType !== "area" && (
                                <span className="item-modal-badge-indigo">
                                    Area: {areaName}
                                </span>
                            )}
                            {effectiveType === "area" && targetItem.area_sqft && (
                                <span className="item-modal-badge-green">
                                    {Math.round(targetItem.area_sqft).toLocaleString()} sq ft
                                    {targetItem.area_acres ? ` (${targetItem.area_acres} acres)` : ''}
                                </span>
                            )}
                            {effectiveType === "structure" && targetItem.lat && targetItem.lng && (
                                <span className="item-modal-muted">
                                    {Number(targetItem.lat).toFixed(5)}, {Number(targetItem.lng).toFixed(5)}
                                </span>
                            )}
                            {effectiveType === "feature" && (
                                <span className="item-modal-badge-blue">
                                    Type: {targetItem.type}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="item-modal-close-btn"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Editable Title Input & Icon/Swatch Preview */}
                    <div className="item-modal-name-row">
                        {effectiveType === "area" ? (
                            <div className="item-modal-swatch-box" style={{ backgroundColor: itemColor }}>
                                📐
                            </div>
                        ) : (
                            <div className="item-modal-icon-box">
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
                            className="item-modal-title-input"
                        />
                        <button
                            type="button"
                            onClick={handleSaveName}
                            disabled={isSavingName || !itemName.trim() || itemName.trim() === targetItem.name}
                            className="item-modal-save-btn"
                            style={{ opacity: (!itemName.trim() || itemName.trim() === targetItem.name) ? 0.5 : 1 }}
                        >
                            <Check size={14} /> {isSavingName ? "Saved" : "Save Title"}
                        </button>
                    </div>

                    {/* Icon Selection Palette (Structures & Features) */}
                    {(effectiveType === "structure" || effectiveType === "feature") && (
                        <div className="item-modal-palette">
                            <span className="item-modal-palette-label">
                                Choose Icon:
                            </span>
                            {(effectiveType === "feature" ? FEATURE_ICONS : STRUCTURE_ICONS).map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleSelectIcon(emoji)}
                                    className={`item-modal-icon-choice${itemIcon === emoji ? " is-selected" : ""}`}
                                    title={`Set icon to ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Color Palette (Area Boundaries & Features) */}
                    {(effectiveType === "area" || effectiveType === "feature") && (
                        <div className="item-modal-palette item-modal-palette--colors">
                            <span className="item-modal-color-label">
                                <Palette size={12} /> Theme Color:
                            </span>
                            {COLOR_PALETTE.map(col => (
                                <button
                                    key={col}
                                    type="button"
                                    onClick={() => handleSelectColor(col)}
                                    className={`item-modal-swatch${itemColor.toLowerCase() === col.toLowerCase() ? " is-selected" : ""}`}
                                    style={{ backgroundColor: col }}
                                    title={`Select ${col}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="unified-modal-body">
                    {/* Drill-down Callout to 2D & 3D Floorplan Studio (For Structures) */}
                    {effectiveType === "structure" && (
                        <div className="item-modal-studio-cta">
                            <div>
                                <div className="item-modal-studio-title">
                                    2D Floorplan & 3D WebGL Studio
                                </div>
                                <div className="item-modal-studio-sub">
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
                                className="item-modal-studio-btn"
                            >
                                <Layers size={15} />
                                Enter Studio
                            </button>
                        </div>
                    )}

                    {/* Fast Note Creation Form */}
                    <form onSubmit={handleAddNote} className="item-modal-note-form">
                        <div className="item-modal-form-title">
                            Add Note / Work Order to this {effectiveType === "area" ? "Boundary" : effectiveType === "feature" ? "Feature" : "Structure"}
                        </div>
                        <div className="item-modal-form-grid">
                            <input
                                type="text"
                                placeholder="Note title (e.g., Annual Inspection, Repair, Specification)..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="item-modal-input-full"
                            />
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="item-modal-input"
                            >
                                <option value="inspection">Inspection</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="work_order">Work Order</option>
                                <option value="estimate">Cost Estimate</option>
                                <option value="general">General</option>
                            </select>
                            <div className="item-modal-cost-wrap">
                                <span className="item-modal-cost-symbol">$</span>
                                <input
                                    type="number"
                                    placeholder="Cost Est."
                                    value={costEstimate}
                                    onChange={e => setCostEstimate(e.target.value)}
                                    className="item-modal-cost-input"
                                />
                            </div>
                        </div>
                        <textarea
                            placeholder="Details, observations, technician notes, or contractor instructions..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={2}
                            className="item-modal-textarea"
                        />
                        <div className="item-modal-submit-row">
                            <button
                                type="submit"
                                disabled={!title.trim() || !content.trim() || isSubmitting}
                                className="item-modal-submit-btn"
                                style={{ opacity: (!title.trim() || !content.trim() || isSubmitting) ? 0.5 : 1 }}
                            >
                                <Plus size={14} />
                                {isSubmitting ? "Adding..." : "Add Note"}
                            </button>
                        </div>
                    </form>

                    {/* Existing Notes List */}
                    <div>
                        <div className="item-modal-notes-title">
                            Attached Notes ({targetNotes.length})
                        </div>
                        {targetNotes.length === 0 ? (
                            <div className="item-modal-notes-empty">
                                No notes recorded for this {effectiveType} yet.
                            </div>
                        ) : (
                            <div className="item-modal-notes-list">
                                {targetNotes.map(n => (
                                    <div key={n.id} className="unified-note-card">
                                        <div className="unified-note-header">
                                            <div className="item-modal-name-row">
                                                <button
                                                    onClick={() => handleToggleStatus(n)}
                                                    title={`Status: ${n.status}. Click to cycle.`}
                                                    className="item-modal-bare-btn"
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
                                            <div className="item-modal-row">
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
                                                    className="item-modal-delete-btn"
                                                    title="Delete note"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="item-modal-note-content">
                                            {n.content}
                                        </div>
                                        <div className="item-modal-note-meta">
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
                        className="item-modal-footer-close"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export { StructureNotesModal as ItemEditNotesModal };
