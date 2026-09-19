import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
    X, Plus, Eye, EyeOff, Tag, Edit3, Trash2, Layers,
    FileText, CheckCircle, Clock, AlertCircle, DollarSign,
    ChevronRight, ChevronDown, Check, Home, Zap, Grid3X3, Trees, Droplets, Scissors
} from "lucide-react";
import { thunkCreateNote, thunkEditNote, thunkDeleteNote } from "../../redux/notes";

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {mode === "view" ? (
                            <>
                                <Eye size={17} color="#6366f1" />
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                                    Boundary & Layer View
                                </h3>
                            </>
                        ) : (
                            <>
                                <FileText size={17} color="#6366f1" />
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                                    Project Notes & Log
                                </h3>
                            </>
                        )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                        {mode === "view"
                            ? `${areas.length} Boundaries • ${structures.length} Structures • ${features.length} Features`
                            : `${notes.length} total • ${openCount} open issues`}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Compact Mode Switcher inside Drawer */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '2px'
                    }}>
                        <button
                            onClick={() => onSwitchMode?.("view")}
                            style={{
                                background: mode === "view" ? '#6366f1' : 'transparent',
                                color: mode === "view" ? '#ffffff' : '#94a3b8',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            View ({areas.length})
                        </button>
                        <button
                            onClick={() => onSwitchMode?.("notes")}
                            style={{
                                background: mode === "notes" ? '#6366f1' : 'transparent',
                                color: mode === "notes" ? '#ffffff' : '#94a3b8',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Notes ({notes.length})
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                        title="Close sidebar"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* TAB 1: BOUNDARY & LAYER HIERARCHY TREE */}
            {mode === "view" && (
                <div className="unified-drawer-content" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 8px 4px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Boundaries & Child Overlays
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeArea && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeselectArea?.();
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f87171',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        padding: 0
                                    }}
                                    title="Deselect active boundary"
                                >
                                    Deselect Active
                                </button>
                            )}
                            <span style={{ fontSize: '10px', color: '#64748b' }}>
                                Click to fly to on map
                            </span>
                        </div>
                    </div>

                    {areas.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '32px 16px', textAlign: 'center' }}>
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
                                        className={`unified-tree-node ${isActive ? "active-area" : ""}`}
                                        onClick={() => onSelectArea?.(area)}
                                        onDoubleClick={() => onOpenItemModal?.("area", area)}
                                        title="Click to select & fly to boundary (double click for Edit & Notes)"
                                        style={{ cursor: 'pointer' }}
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
                                            <span style={{ fontWeight: 600 }}>{area.name}</span>
                                            {area.area_sqft && (
                                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                    ({Math.round(area.area_sqft).toLocaleString()} sq ft)
                                                </span>
                                            )}
                                        </div>

                                        <div className="unified-tree-node-actions">
                                            {areaNotes.length > 0 && (
                                                <span style={{ fontSize: '10px', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.25)', padding: '1px 5px', borderRadius: '4px' }}>
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
                                                        className={`unified-tree-child-node ${isSecSelected ? "active" : ""}`}
                                                        onClick={() => {
                                                            onSelectArea?.(area);
                                                            onSelectSection?.(sec.id);
                                                        }}
                                                        title="Click to view section in editor"
                                                        style={{
                                                            cursor: 'pointer',
                                                            borderLeft: `2px solid ${sec.color || '#8b5cf6'}`,
                                                            paddingLeft: '8px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                            <Scissors size={12} color={sec.color || "#8b5cf6"} />
                                                            <span style={{ fontSize: '13px' }}>{sec.icon || "✂"}</span>
                                                            <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                                {sec.name || `Section ${idx + 1}`}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {sec.area_sqft && (
                                                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                                    {Math.round(sec.area_sqft).toLocaleString()} sq ft
                                                                </span>
                                                            )}
                                                            <span
                                                                style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: sec.color || '#8b5cf6',
                                                                    display: 'inline-block'
                                                                }}
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
                                                        className={`unified-tree-child-node ${isSelected ? "active" : ""}`}
                                                        onClick={() => onSelectStructure?.(struct, false)}
                                                        onDoubleClick={() => onOpenItemModal?.("structure", struct)}
                                                        title="Click to focus on map (double click for Edit & Notes)"
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                            <span style={{ fontSize: '13px' }}>{struct.icon || "🏠"}</span>
                                                            <span style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                                {struct.name}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {structNotes.length > 0 && (
                                                                <span style={{ fontSize: '10px', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.25)', padding: '1px 5px', borderRadius: '4px' }}>
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
                                                                <Trash2 size={11} color="#94a3b8" />
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
                                                            className={`unified-tree-child-node ${isSelected ? "active" : ""} ${isFeatHidden ? "hidden-item" : ""}`}
                                                            onClick={() => {
                                                                onSelectItem?.({ type: "feature", id: feat.id });
                                                                onSelectFeature?.(feat);
                                                            }}
                                                            onDoubleClick={() => onOpenItemModal?.("feature", feat)}
                                                            title="Click to focus & fly to feature on map (double click for Edit & Notes)"
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                                {feat.type === "valve" ? <Droplets size={13} color="#06b6d4" /> :
                                                                feat.type === "flora" ? <Trees size={13} color="#10b981" /> :
                                                                feat.type === "utility" ? <Zap size={13} color="#0284c7" /> :
                                                                feat.type === "material" ? <Grid3X3 size={13} color="#8b5cf6" /> :
                                                                <Layers size={13} color="#3b82f6" />}
                                                                <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                                    {feat.name}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {featNotes.length > 0 && (
                                                                    <span style={{ fontSize: '10px', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.25)', padding: '1px 5px', borderRadius: '4px' }}>
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
                                                                    <Trash2 size={11} color="#94a3b8" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {featSections.map((sec, sIdx) => {
                                                            const isSecSelected = selectedSectionId === sec.id;
                                                            return (
                                                                <div
                                                                    key={`fsec-${sec.id || sIdx}`}
                                                                    className={`unified-tree-child-node ${isSecSelected ? "active" : ""}`}
                                                                    onClick={() => {
                                                                        onSelectItem?.({ type: "feature", id: feat.id });
                                                                        onSelectFeature?.(feat);
                                                                        onSelectSection?.(sec.id);
                                                                    }}
                                                                    title="Click to view section in editor"
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        borderLeft: `2px solid ${sec.color || '#8b5cf6'}`,
                                                                        paddingLeft: '16px',
                                                                        opacity: 0.9
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                                        <Scissors size={11} color={sec.color || "#8b5cf6"} />
                                                                        <span style={{ fontSize: '12px' }}>{sec.icon || "✂"}</span>
                                                                        <span style={{ fontSize: '11px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                                            {sec.name || `Section ${sIdx + 1}`}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        {sec.area_sqft && (
                                                                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                                                                                {Math.round(sec.area_sqft).toLocaleString()} sq ft
                                                                            </span>
                                                                        )}
                                                                        <span
                                                                            style={{
                                                                                width: '6px',
                                                                                height: '6px',
                                                                                borderRadius: '50%',
                                                                                backgroundColor: sec.color || '#8b5cf6',
                                                                                display: 'inline-block'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}

                                            {areaStructures.length === 0 && areaFeatures.length === 0 && areaSections.length === 0 && (
                                                <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', padding: '4px 6px' }}>
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
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Total Cost Estimate:</span>
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
                                        background: filterStatus === st ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                                        color: '#ffffff',
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
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    color: '#e2e8f0',
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
                                    color: '#ffffff',
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
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '4px',
                                    padding: '6px 8px',
                                    color: '#f8fafc',
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
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '4px',
                                    padding: '6px 8px',
                                    color: '#f8fafc',
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
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '4px',
                                        padding: '4px 6px',
                                        color: '#f8fafc',
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
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: '4px',
                                            padding: '4px 6px',
                                            color: '#f8fafc',
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
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: '4px',
                                            padding: '4px 6px',
                                            color: '#f8fafc',
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
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: '4px',
                                            padding: '4px 6px',
                                            color: '#f8fafc',
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
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '4px',
                                        padding: '4px 6px',
                                        color: '#f8fafc',
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
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '4px',
                                        padding: '4px 6px',
                                        color: '#f8fafc',
                                        fontSize: '11px'
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!title.trim() || !content.trim() || isSubmitting}
                                style={{
                                    background: '#22c55e',
                                    color: '#ffffff',
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

                                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                                            {note.content}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
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
