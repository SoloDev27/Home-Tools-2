import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
    X, Plus, Eye, EyeOff, Tag, Edit3, Trash2, Layers,
    FileText, CheckCircle, Clock, AlertCircle, DollarSign,
    ChevronRight, ChevronDown, Check, Home, Zap, Grid3X3, Trees, Droplets, Scissors
} from "lucide-react";
import { thunkCreateNote, thunkEditNote, thunkDeleteNote } from "../../redux/notes";
import "./UnifiedRightDrawer.css";

export default function UnifiedRightDrawer({
    mode, // null | 'view' | 'notes'
    onClose,
    onSwitchMode, // (nextMode) => void
    areas = [],
    activeArea = null,
    structures = [],
    features = [],
    notes = [],
    mapId,
    // Tree state & handlers
    expandedAreas = {},
    toggleAreaExpand,
    hiddenAreas = {},
    toggleAreaVisibility,
    hiddenLabels = {},
    toggleAreaLabel,
    hiddenFeatures = {},
    toggleFeatureVisibility,
    selectedItemId = null,
    selectedSectionId = null,
    onSelectArea,
    onDeselectArea,
    onSelectStructure,
    onSelectFeature,
    onSelectSection,
    onSelectItem,
    onOpenItemModal,
    onEditArea,
    onDeleteArea,
    onDeleteStructure,
    onDeleteFeature,
    onNavigateStudio
}) {
    const dispatch = useDispatch();

    // Notes tab state
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
        <div className={`unified-drawer ${mode ? "open" : ""}`}>
            {/* Drawer Header with Dual-Tab Switcher */}
            <div className="unified-drawer-header">
                <div>
                    <div className="u-drawer-title-row">
                        {mode === "view" ? (
                            <>
                                <Eye size={17} color="#6366f1" />
                                <h3 className="u-drawer-title">
                                    Boundary & Layer View
                                </h3>
                            </>
                        ) : (
                            <>
                                <FileText size={17} color="#6366f1" />
                                <h3 className="u-drawer-title">
                                    Project Notes & Log
                                </h3>
                            </>
                        )}
                    </div>
                    <div className="u-drawer-subtitle">
                        {mode === "view"
                            ? `${areas.length} Boundaries • ${structures.length} Structures • ${features.length} Features`
                            : `${notes.length} total • ${openCount} open issues`}
                    </div>
                </div>

                <div className="u-drawer-title-row">
                    {/* Compact Mode Switcher inside Drawer */}
                    <div className="u-drawer-switcher">
                        <button
                            onClick={() => onSwitchMode?.("view")}
                            className={`u-drawer-switch-btn${mode === "view" ? " is-active" : ""}`}
                        >
                            View ({areas.length})
                        </button>
                        <button
                            onClick={() => onSwitchMode?.("notes")}
                            className={`u-drawer-switch-btn${mode === "notes" ? " is-active" : ""}`}
                        >
                            Notes ({notes.length})
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="u-drawer-close-btn"
                        title="Close sidebar"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* TAB 1: BOUNDARY & LAYER HIERARCHY TREE */}
            {mode === "view" && (
                <div className="unified-drawer-content u-drawer-content--tight">
                    <div className="u-drawer-list-head">
                        <span className="u-drawer-list-title">
                            Boundaries & Child Overlays
                        </span>
                        <div className="u-drawer-title-row">
                            {activeArea && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeselectArea?.();
                                    }}
                                    className="u-drawer-link-btn--danger"
                                    title="Deselect active boundary"
                                >
                                    Deselect Active
                                </button>
                            )}
                            <span className="u-drawer-tiny-muted">
                                Click to fly to on map
                            </span>
                        </div>
                    </div>

                    {areas.length === 0 ? (
                        <div className="u-drawer-empty">
                            No boundaries sectioned yet.<br />Use <strong>Freehand Poly</strong> or <strong>Lot Box</strong> on the left to section your site.
                        </div>
                    ) : (
                        areas.map(area => {
                            const isActive = activeArea?.id === area.id;
                            const isExpanded = expandedAreas[area.id] !== false; // expanded by default
                            const areaStructures = structures.filter(s => Number(s.area_id) === Number(area.id));
                            const areaFeatures = features.filter(f => Number(f.area_id) === Number(area.id));
                            const areaSections = area.extra_info?.sections || [];
                            const areaNotes = notes.filter(n => Number(n.area_id) === Number(area.id) && !n.property_id && !n.feature_id);
                            const isHidden = !!hiddenAreas[area.id];
                            const isLabelHidden = !!hiddenLabels[area.id];

                            return (
                                <div key={area.id} className="unified-tree-group">
                                    {/* Area Tree Node */}
                                    <div
                                        onClick={() => onSelectArea?.(area)}
                                        onDoubleClick={() => onOpenItemModal?.("area", area)}
                                        title="Click to select & fly to boundary (double click for Edit & Notes)"
                                        className={`unified-tree-node u-drawer-clickable ${isActive ? "active-area" : ""}`}
                                    >
                                        <span
                                            className="unified-tree-arrow"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAreaExpand?.(area.id);
                                            }}
                                        >
                                            {isExpanded ? "▼" : "▶"}
                                        </span>

                                        <div className="unified-tree-node-label">
                                            <span className="unified-color-dot" style={{ backgroundColor: area.color || '#3b82f6' }} />
                                            <span className="u-drawer-strong">{area.name}</span>
                                            {area.area_sqft && (
                                                <span className="u-drawer-meta">
                                                    ({Math.round(area.area_sqft).toLocaleString()} sq ft)
                                                </span>
                                            )}
                                        </div>

                                        <div className="unified-tree-node-actions">
                                            {areaNotes.length > 0 && (
                                                <span className="u-drawer-note-chip">
                                                    📝 {areaNotes.length}
                                                </span>
                                            )}
                                            {/* Visibility Toggle */}
                                            <button
                                                className={`unified-icon-btn ${isHidden ? "muted" : "active"}`}
                                                onClick={(e) => toggleAreaVisibility?.(e, area.id)}
                                                title={isHidden ? "Show Boundary" : "Hide Boundary"}
                                            >
                                                {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>

                                            {/* Centroid Tag Label Toggle */}
                                            <button
                                                className={`unified-icon-btn ${isLabelHidden ? "muted" : "active"}`}
                                                onClick={(e) => toggleAreaLabel?.(e, area.id)}
                                                title={isLabelHidden ? "Show Dimension Tag" : "Hide Dimension Tag"}
                                            >
                                                <Tag size={13} />
                                            </button>

                                            {/* Edit Area Modal */}
                                            <button
                                                className="unified-icon-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onOpenItemModal) {
                                                        onOpenItemModal("area", area);
                                                    } else {
                                                        onEditArea?.(area);
                                                    }
                                                }}
                                                title="Edit Area Details & Notes"
                                            >
                                                <Edit3 size={12} color="#6366f1" />
                                            </button>

                                            {/* Delete Area */}
                                            <button
                                                className="unified-icon-btn"
                                                onClick={(e) => onDeleteArea?.(e, area.id)}
                                                title="Delete Area"
                                            >
                                                <Trash2 size={12} color="#f87171" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Nested Children (Sections, Structures and Features under this Area) */}
                                    {isExpanded && (
                                        <div className="unified-tree-children">
                                            {/* Sections under this Area */}
                                            {areaSections.map((sec, idx) => {
                                                const isSecSelected = selectedSectionId === sec.id;
                                                return (
                                                    <div
                                                        key={`sec-${sec.id || idx}`}
                                                        className={`unified-tree-child-node u-drawer-section-child ${isSecSelected ? "active" : ""}`}
                                                        onClick={() => {
                                                            onSelectArea?.(area);
                                                            onSelectSection?.(sec.id);
                                                        }}
                                                        title="Click to view section in editor"
                                                        style={{ borderLeft: `2px solid ${sec.color || '#8b5cf6'}` }}
                                                    >
                                                        <div className="u-drawer-row-clip">
                                                            <Scissors size={12} color={sec.color || "#8b5cf6"} />
                                                            <span className="u-drawer-icon-md">{sec.icon || "✂"}</span>
                                                            <span className="u-drawer-item-label">
                                                                {sec.name || `Section ${idx + 1}`}
                                                            </span>
                                                        </div>

                                                        <div className="u-drawer-row">
                                                            {sec.area_sqft && (
                                                                <span className="u-drawer-meta">
                                                                    {Math.round(sec.area_sqft).toLocaleString()} sq ft
                                                                </span>
                                                            )}
                                                            <span
                                                                className="u-drawer-dot"
                                                                style={{ backgroundColor: sec.color || '#8b5cf6' }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Structures under this Area */}
                                            {areaStructures.map(struct => {
                                                const isSelected = selectedItemId?.type === "structure" && selectedItemId?.id === struct.id;
                                                const structNotes = notes.filter(n => Number(n.property_id) === Number(struct.id));

                                                return (
                                                    <div
                                                        key={`s-${struct.id}`}
                                                        onClick={() => onSelectStructure?.(struct, false)}
                                                        onDoubleClick={() => onOpenItemModal?.("structure", struct)}
                                                        title="Click to focus on map (double click for Edit & Notes)"
                                                        className={`unified-tree-child-node u-drawer-clickable ${isSelected ? "active" : ""}`}
                                                    >
                                                        <div className="u-drawer-row-clip">
                                                            <span className="u-drawer-icon-md">{struct.icon || "🏠"}</span>
                                                            <span className="u-drawer-item-label">
                                                                {struct.name}
                                                            </span>
                                                        </div>

                                                        <div className="u-drawer-row-tight">
                                                            {structNotes.length > 0 && (
                                                                <span className="u-drawer-note-chip">
                                                                    📝 {structNotes.length}
                                                                </span>
                                                            )}
                                                            <button
                                                                className="unified-icon-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onOpenItemModal) {
                                                                        onOpenItemModal("structure", struct);
                                                                    } else {
                                                                        onSelectStructure?.(struct, true);
                                                                    }
                                                                }}
                                                                title="Edit Structure Details & Notes"
                                                            >
                                                                <Edit3 size={11} color="#6366f1" />
                                                            </button>
                                                            <button
                                                                className="unified-icon-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onNavigateStudio?.(struct.id);
                                                                }}
                                                                title="Open in 2D/3D Studio"
                                                            >
                                                                <Layers size={12} color="#6366f1" />
                                                            </button>
                                                            <button
                                                                className="unified-icon-btn"
                                                                onClick={(e) => onDeleteStructure?.(e, struct.id)}
                                                                title="Delete structure"
                                                            >
                                                                <Trash2 size={11} color="var(--color-text-secondary)" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Features under this Area */}
                                            {areaFeatures.map(feat => {
                                                const isFeatHidden = !!hiddenFeatures[feat.id];
                                                const isSelected = selectedItemId?.type === "feature" && selectedItemId?.id === feat.id;
                                                const featNotes = notes.filter(n => Number(n.feature_id) === Number(feat.id));
                                                const featSections = feat.properties_data?.sections || [];

                                                return (
                                                    <React.Fragment key={`f-${feat.id}`}>
                                                        <div
                                                            className={`unified-tree-child-node u-drawer-clickable ${isSelected ? "active" : ""} ${isFeatHidden ? "hidden-item" : ""}`}
                                                            onClick={() => {
                                                                onSelectItem?.({ type: "feature", id: feat.id });
                                                                onSelectFeature?.(feat);
                                                            }}
                                                            onDoubleClick={() => onOpenItemModal?.("feature", feat)}
                                                            title="Click to focus & fly to feature on map (double click for Edit & Notes)"
                                                        >
                                                            <div className="u-drawer-row-clip">
                                                                {feat.type === "valve" ? <Droplets size={13} color="#06b6d4" /> :
                                                                feat.type === "flora" ? <Trees size={13} color="#10b981" /> :
                                                                feat.type === "utility" ? <Zap size={13} color="#0284c7" /> :
                                                                feat.type === "material" ? <Grid3X3 size={13} color="#8b5cf6" /> :
                                                                <Layers size={13} color="#3b82f6" />}
                                                                <span className="u-drawer-ellipsis">
                                                                    {feat.name}
                                                                </span>
                                                            </div>

                                                            <div className="u-drawer-row-tight">
                                                                {featNotes.length > 0 && (
                                                                    <span className="u-drawer-note-chip">
                                                                        📝 {featNotes.length}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    className="unified-icon-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onOpenItemModal?.("feature", feat);
                                                                    }}
                                                                    title="Edit Feature Details & Notes"
                                                                >
                                                                    <Edit3 size={11} color="#6366f1" />
                                                                </button>
                                                                <button
                                                                    className={`unified-icon-btn ${isFeatHidden ? "muted" : ""}`}
                                                                    onClick={(e) => toggleFeatureVisibility?.(e, feat.id)}
                                                                    title={isFeatHidden ? "Show Feature" : "Hide Feature"}
                                                                >
                                                                    {isFeatHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                                                                </button>
                                                                <button
                                                                    className="unified-icon-btn"
                                                                    onClick={(e) => onDeleteFeature?.(e, feat.id)}
                                                                    title="Delete feature"
                                                                >
                                                                    <Trash2 size={11} color="var(--color-text-secondary)" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {featSections.map((sec, sIdx) => {
                                                            const isSecSelected = selectedSectionId === sec.id;
                                                            return (
                                                                <div
                                                                    key={`fsec-${sec.id || sIdx}`}
                                                                    className={`unified-tree-child-node u-drawer-subsection-child ${isSecSelected ? "active" : ""}`}
                                                                    onClick={() => {
                                                                        onSelectItem?.({ type: "feature", id: feat.id });
                                                                        onSelectFeature?.(feat);
                                                                        onSelectSection?.(sec.id);
                                                                    }}
                                                                    title="Click to view section in editor"
                                                                    style={{ borderLeft: `2px solid ${sec.color || '#8b5cf6'}` }}
                                                                >
                                                                    <div className="u-drawer-row-clip">
                                                                        <Scissors size={11} color={sec.color || "#8b5cf6"} />
                                                                        <span className="u-drawer-icon-sm">{sec.icon || "✂"}</span>
                                                                        <span className="u-drawer-sub-label">
                                                                            {sec.name || `Section ${sIdx + 1}`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="u-drawer-row">
                                                                        {sec.area_sqft && (
                                                                            <span className="u-drawer-tiny">
                                                                                {Math.round(sec.area_sqft).toLocaleString()} sq ft
                                                                            </span>
                                                                        )}
                                                                        <span
                                                                            className="u-drawer-dot-sm"
                                                                            style={{ backgroundColor: sec.color || '#8b5cf6' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}

                                            {areaStructures.length === 0 && areaFeatures.length === 0 && areaSections.length === 0 && (
                                                <div className="u-drawer-empty-sm">
                                                    Empty area. Use tools on the left to add elements or sections.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* TAB 2: PROJECT NOTES & FINANCIAL LOG */}
            {mode === "notes" && (
                <>
                    {/* Total Estimated Cost Banner */}
                    <div className="u-drawer-cost-banner">
                        <span className="u-drawer-summary-label">Total Cost Estimate:</span>
                        <span className="u-drawer-cost-value">
                            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Quick Filters */}
                    <div className="u-drawer-filters">
                        <div className="u-drawer-filter-status">
                            {["all", "open", "in_progress", "completed"].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setFilterStatus(st)}
                                    className={`u-drawer-filter-btn${filterStatus === st ? " is-active" : ""}`}
                                >
                                    {st === "in_progress" ? "In Progress" : st}
                                </button>
                            ))}
                        </div>

                        <div className="u-drawer-filter-row">
                            <select
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                                className="u-drawer-select"
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
                                className={`u-drawer-add-btn${showAddForm ? " is-open" : ""}`}
                            >
                                <Plus size={13} />
                                {showAddForm ? "Cancel" : "New Note"}
                            </button>
                        </div>
                    </div>

                    {/* Add Note Collapsible Form */}
                    {showAddForm && (
                        <form onSubmit={handleCreateNote} className="u-drawer-note-form">
                            <div className="u-drawer-form-title">
                                Create Project Note
                            </div>
                            <input
                                type="text"
                                placeholder="Title..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="u-drawer-input"
                            />
                            <textarea
                                placeholder="Details or action items..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={2}
                                className="u-drawer-textarea"
                            />
                            <div className="u-drawer-form-grid">
                                <select
                                    value={targetType}
                                    onChange={e => {
                                        setTargetType(e.target.value);
                                        setTargetId("");
                                    }}
                                    className="u-drawer-select-sm"
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
                                        className="u-drawer-select-sm"
                                    >
                                        <option value="">Select Area...</option>
                                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                )}

                                {targetType === "property" && (
                                    <select
                                        value={targetId}
                                        onChange={e => setTargetId(e.target.value)}
                                        className="u-drawer-select-sm"
                                    >
                                        <option value="">Select Structure...</option>
                                        {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )}

                                {targetType === "feature" && (
                                    <select
                                        value={targetId}
                                        onChange={e => setTargetId(e.target.value)}
                                        className="u-drawer-select-sm"
                                    >
                                        <option value="">Select Feature...</option>
                                        {features.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                )}
                            </div>

                            <div className="u-drawer-form-grid">
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="u-drawer-select-sm"
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
                                    className="u-drawer-select-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!title.trim() || !content.trim() || isSubmitting}
                                className="u-drawer-save-btn"
                                style={{ opacity: (!title.trim() || !content.trim() || isSubmitting) ? 0.5 : 1 }}
                            >
                                {isSubmitting ? "Saving..." : "Save Note"}
                            </button>
                        </form>
                    )}

                    {/* Notes List */}
                    <div className="unified-drawer-content">
                        {filteredNotes.length === 0 ? (
                            <div className="u-drawer-empty-notes">
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
                                            <div className="u-drawer-title-row">
                                                <button
                                                    onClick={() => handleToggleStatus(note)}
                                                    title={`Status: ${note.status}. Click to change.`}
                                                    className="u-drawer-bare-btn"
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
                                            <div className="u-drawer-row">
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
                                                    className="u-drawer-delete-note"
                                                    title="Delete note"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="u-drawer-note-content">
                                            {note.content}
                                        </div>

                                        <div className="u-drawer-note-meta">
                                            <span
                                                onClick={() => {
                                                    if (targetProp) onSelectStructure?.(targetProp);
                                                    else if (targetArea) onSelectArea?.(targetArea);
                                                    else if (targetFeat) onSelectFeature?.(targetFeat);
                                                }}
                                                style={{
                                                    cursor: (targetProp || targetArea || targetFeat) ? 'pointer' : 'default',
                                                    color: (targetProp || targetArea || targetFeat) ? '#818cf8' : '#64748b',
                                                    textDecoration: (targetProp || targetArea || targetFeat) ? 'underline' : 'none'
                                                }}
                                                title={targetProp || targetArea || targetFeat ? "Click to fly to location on map" : undefined}
                                            >
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
                </>
            )}
        </div>
    );
}
