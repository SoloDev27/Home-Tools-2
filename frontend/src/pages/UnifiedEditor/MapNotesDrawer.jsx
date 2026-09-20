import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { X, Plus, Filter, CheckCircle, Clock, AlertCircle, DollarSign, Trash2, FileText, ChevronRight } from "lucide-react";
import { thunkCreateNote, thunkEditNote, thunkDeleteNote } from "../../redux/notes";

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
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={17} color="#6366f1" />
                        Project Notes & Log
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                        {notes.length} total • {openCount} open issues
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Total Estimated Cost Banner */}
            <div style={{
                margin: '12px 16px 0 16px',
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Total Cost Estimate:</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
                    ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
            </div>

            {/* Quick Filters */}
            <div style={{ padding: '12px 16px 0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {["all", "open", "in_progress", "completed"].map(st => (
                        <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                border: 'none',
                                cursor: 'pointer',
                                background: filterStatus === st ? '#6366f1' : 'var(--color-overlay-hover)',
                                color: 'var(--color-text-primary)',
                                textTransform: 'capitalize',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {st === "in_progress" ? "In Progress" : st}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        style={{
                            flex: 1,
                            background: '#1e293b',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: 'var(--color-text-secondary)',
                            fontSize: '11px'
                        }}
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
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: showAddForm ? '#475569' : '#3b82f6',
                            color: 'var(--color-on-accent)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Plus size={13} />
                        {showAddForm ? "Cancel" : "New Note"}
                    </button>
                </div>
            </div>

            {/* Add Note Collapsible Form */}
            {showAddForm && (
                <form onSubmit={handleCreateNote} style={{
                    margin: '12px 16px 0 16px',
                    padding: '12px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase' }}>
                        Create Project Note
                    </div>
                    <input
                        type="text"
                        placeholder="Title..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={{
                            background: '#0f172a',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            color: 'var(--color-text-primary)',
                            fontSize: '11px'
                        }}
                    />
                    <textarea
                        placeholder="Details or action items..."
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={2}
                        style={{
                            background: '#0f172a',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            color: 'var(--color-text-primary)',
                            fontSize: '11px',
                            resize: 'vertical'
                        }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <select
                            value={targetType}
                            onChange={e => {
                                setTargetType(e.target.value);
                                setTargetId("");
                            }}
                            style={{
                                background: '#0f172a',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                color: 'var(--color-text-primary)',
                                fontSize: '11px'
                            }}
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
                                style={{
                                    background: '#0f172a',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '11px'
                                }}
                            >
                                <option value="">Select Area...</option>
                                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        )}

                        {targetType === "property" && (
                            <select
                                value={targetId}
                                onChange={e => setTargetId(e.target.value)}
                                style={{
                                    background: '#0f172a',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '11px'
                                }}
                            >
                                <option value="">Select Structure...</option>
                                {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}

                        {targetType === "feature" && (
                            <select
                                value={targetId}
                                onChange={e => setTargetId(e.target.value)}
                                style={{
                                    background: '#0f172a',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '11px'
                                }}
                            >
                                <option value="">Select Feature...</option>
                                {features.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            style={{
                                background: '#0f172a',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                color: 'var(--color-text-primary)',
                                fontSize: '11px'
                            }}
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
                            style={{
                                background: '#0f172a',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                color: 'var(--color-text-primary)',
                                fontSize: '11px'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!title.trim() || !content.trim() || isSubmitting}
                        style={{
                            background: '#22c55e',
                            color: 'var(--color-on-accent)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '4px',
                            opacity: (!title.trim() || !content.trim() || isSubmitting) ? 0.5 : 1
                        }}
                    >
                        {isSubmitting ? "Saving..." : "Save Note"}
                    </button>
                </form>
            )}

            {/* Notes List */}
            <div className="unified-drawer-content">
                {filteredNotes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '40px' }}>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={() => handleToggleStatus(note)}
                                            title={`Status: ${note.status}. Click to change.`}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                                            title="Delete note"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                                    {note.content}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
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
