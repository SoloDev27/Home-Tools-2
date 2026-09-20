import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { X, Plus, Filter, CheckCircle, Clock, AlertCircle, DollarSign, Trash2, FileText, ChevronRight } from "lucide-react";
import { thunkCreateNote, thunkEditNote, thunkDeleteNote } from "../../redux/notes";
import "./MapNotesDrawer.css";

export default function MapNotesDrawer({
    isOpen,
    onClose,
    notes = [],
    areas = [],
    structures = [],
    features = [],
    mapId
}) {
    const dispatch = useDispatch();

    const [filterCategory, setFilterCategory] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterTarget, setFilterTarget] = useState("all");
    const [showAddForm, setShowAddForm] = useState(false);

    // New note form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [targetType, setTargetType] = useState("map"); // 'map', 'area', 'property', 'feature'
    const [targetId, setTargetId] = useState("");
    const [category, setCategory] = useState("general");
    const [priority, setPriority] = useState("medium");
    const [costEstimate, setCostEstimate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtered notes
    const filteredNotes = useMemo(() => {
        return notes.filter(n => {
            if (filterCategory !== "all" && n.category !== filterCategory) return false;
            if (filterStatus !== "all" && n.status !== filterStatus) return false;
            if (filterTarget === "structure" && !n.property_id) return false;
            if (filterTarget === "area" && (!n.area_id || n.property_id || n.feature_id)) return false;
            if (filterTarget === "feature" && !n.feature_id) return false;
            if (filterTarget === "map" && (n.area_id || n.property_id || n.feature_id)) return false;
            return true;
        });
    }, [notes, filterCategory, filterStatus, filterTarget]);

    // Financial calculations
    const totalCost = useMemo(() => {
        return notes.reduce((sum, n) => sum + (parseFloat(n.cost_estimate) || 0), 0);
    }, [notes]);

    const openCount = useMemo(() => {
        return notes.filter(n => n.status === "open").length;
    }, [notes]);

    const handleCreateNote = async (e) => {
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
                area_id: targetType === "area" && targetId ? Number(targetId) : null,
                property_id: targetType === "property" && targetId ? Number(targetId) : null,
                feature_id: targetType === "feature" && targetId ? Number(targetId) : null
            };

            await dispatch(thunkCreateNote(payload));
            setTitle("");
            setContent("");
            setCostEstimate("");
            setShowAddForm(false);
        } catch (err) {
            console.error("Failed to create map note:", err);
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

    return (
        <div className={`unified-drawer ${isOpen ? "open" : ""}`}>
            <div className="unified-drawer-header">
                <div>
                    <h3 className="map-notes-title">
                        <FileText size={17} color="#6366f1" />
                        Project Notes & Log
                    </h3>
                    <div className="map-notes-subtitle">
                        {notes.length} total • {openCount} open issues
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="map-notes-close-btn"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Total Estimated Cost Banner */}
            <div className="map-notes-cost-banner">
                <span className="map-notes-summary-label">Total Cost Estimate:</span>
                <span className="map-notes-cost-value">
                    ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
            </div>

            {/* Quick Filters */}
            <div className="map-notes-filters">
                <div className="map-notes-filter-status">
                    {["all", "open", "in_progress", "completed"].map(st => (
                        <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            className={`map-notes-filter-btn${filterStatus === st ? " is-active" : ""}`}
                        >
                            {st === "in_progress" ? "In Progress" : st}
                        </button>
                    ))}
                </div>

                <div className="map-notes-filter-row">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="map-notes-select"
                    >
                        <option value="all">All Categories</option>
                        <option value="inspection">Inspection</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="work_order">Work Order</option>
                        <option value="estimate">Cost Estimate</option>
                        <option value="general">General</option>
                    </select>

                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`map-notes-add-btn${showAddForm ? " is-open" : ""}`}
                    >
                        <Plus size={13} />
                        {showAddForm ? "Cancel" : "New Note"}
                    </button>
                </div>
            </div>

            {/* Add Note Collapsible Form */}
            {showAddForm && (
                <form onSubmit={handleCreateNote} className="map-notes-note-form">
                    <div className="map-notes-form-title">
                        Create Project Note
                    </div>
                    <input
                        type="text"
                        placeholder="Title..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="map-notes-input"
                    />
                    <textarea
                        placeholder="Details or action items..."
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={2}
                        className="map-notes-textarea"
                    />
                    <div className="map-notes-form-grid">
                        <select
                            value={targetType}
                            onChange={e => {
                                setTargetType(e.target.value);
                                setTargetId("");
                            }}
                            className="map-notes-select-sm"
                        >
                            <option value="map">Map General</option>
                            <option value="area">Attach to Area</option>
                            <option value="property">Attach to Structure</option>
                            <option value="feature">Attach to Feature</option>
                        </select>

                        {targetType === "area" && (
                            <select
                                value={targetId}
                                onChange={e => setTargetId(e.target.value)}
                                className="map-notes-select-sm"
                            >
                                <option value="">Select Area...</option>
                                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        )}

                        {targetType === "property" && (
                            <select
                                value={targetId}
                                onChange={e => setTargetId(e.target.value)}
                                className="map-notes-select-sm"
                            >
                                <option value="">Select Structure...</option>
                                {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}

                        {targetType === "feature" && (
                            <select
                                value={targetId}
                                onChange={e => setTargetId(e.target.value)}
                                className="map-notes-select-sm"
                            >
                                <option value="">Select Feature...</option>
                                {features.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="map-notes-form-grid">
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="map-notes-select-sm"
                        >
                            <option value="general">General</option>
                            <option value="inspection">Inspection</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="work_order">Work Order</option>
                            <option value="estimate">Cost Estimate</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Cost Est. ($)"
                            value={costEstimate}
                            onChange={e => setCostEstimate(e.target.value)}
                            className="map-notes-select-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!title.trim() || !content.trim() || isSubmitting}
                        className="map-notes-save-btn"
                        style={{ opacity: (!title.trim() || !content.trim() || isSubmitting) ? 0.5 : 1 }}
                    >
                        {isSubmitting ? "Saving..." : "Save Note"}
                    </button>
                </form>
            )}

            {/* Notes List */}
            <div className="unified-drawer-content">
                {filteredNotes.length === 0 ? (
                    <div className="map-notes-empty-notes">
                        No notes found for this filter.
                    </div>
                ) : (
                    filteredNotes.map(note => {
                        const targetArea = areas.find(a => Number(a.id) === Number(note.area_id));
                        const targetProp = structures.find(s => Number(s.id) === Number(note.property_id));
                        const targetFeat = features.find(f => Number(f.id) === Number(note.feature_id));

                        return (
                            <div key={note.id} className="unified-note-card">
                                <div className="unified-note-header">
                                    <div className="map-notes-row">
                                        <button
                                            onClick={() => handleToggleStatus(note)}
                                            title={`Status: ${note.status}. Click to change.`}
                                            className="map-notes-bare-btn"
                                        >
                                            {note.status === 'completed' ? (
                                                <CheckCircle size={16} color="#4ade80" />
                                            ) : note.status === 'in_progress' ? (
                                                <Clock size={16} color="#fbbf24" />
                                            ) : (
                                                <AlertCircle size={16} color="#f87171" />
                                            )}
                                        </button>
                                        <span className="unified-note-title">{note.title}</span>
                                    </div>
                                    <div className="map-notes-row-tight">
                                        {note.cost_estimate && (
                                            <span className="unified-cost-badge">
                                                ${parseFloat(note.cost_estimate).toLocaleString()}
                                            </span>
                                        )}
                                        <span className={`unified-note-badge badge-${note.status}`}>
                                            {note.status}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="map-notes-delete-btn"
                                            title="Delete note"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                <div className="map-notes-note-content">
                                    {note.content}
                                </div>

                                <div className="map-notes-note-meta">
                                    <span>
                                        {targetProp ? `🏠 ${targetProp.name}` : targetArea ? `📐 ${targetArea.name}` : targetFeat ? `⚡ ${targetFeat.name}` : "🗺️ Map General"}
                                    </span>
                                    <span>
                                        {note.category}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
