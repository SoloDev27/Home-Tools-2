import React, { useState } from "react";
import {
    Scissors, Grid3X3, Layers, Lock, Unlock, Check, Trash2,
    Sparkles, ArrowRight, LayoutGrid, Box, Eye, EyeOff, Tag,
    CornerDownRight, RotateCcw, AlertTriangle, ShieldCheck,
    Move, Sliders, Info, CheckCircle2, ChevronRight
} from "lucide-react";
import { DEFAULT_SECTION_TYPES, SECTION_PALETTE } from "../../functions/sectionGeometry";
import "./SectionsPanel.css";

export default function SectionsPanel({
    target, // { type: "area" | "feature", item: Area | Feature } | null
    areas = [],
    features = [],
    onSelectTarget,
    onDeselectTarget,
    drawingTool,
    onStartDivider,
    onSubdivide,
    onInsetCore,
    onMergeAll,
    onMergeDivider,
    onUpdateSection,
    onDeleteSection,
    selectedSectionId,
    onSelectSection,
    selectedDividerId,
    onSelectDivider,
    autoColors,
    onToggleAutoColors,
    showLabels,
    onToggleShowLabels
}) {
    const [selectedZoneType, setSelectedZoneType] = useState("residential");
    const [setbackDist, setSetbackDist] = useState(15); // feet

    // Extract sections & dividers from target
    const targetItem = target?.item;
    const sections = target?.type === "area"
        ? (targetItem?.extra_info?.sections || [])
        : (targetItem?.properties_data?.sections || []);

    const dividers = target?.type === "area"
        ? (targetItem?.extra_info?.dividers || [])
        : (targetItem?.properties_data?.dividers || []);

    const targetAreaSqFt = target?.type === "area"
        ? (targetItem?.area_sqft || 0)
        : (targetItem?.properties_data?.area_sqft || 0);

    const isDividerActive = drawingTool?.mode === "section_divider";
    const activeSection = sections.find(s => s.id === selectedSectionId) || null;
    const activeDivider = dividers.find(d => d.id === selectedDividerId) || null;

    // Polygon features suitable for sectioning
    const polygonFeatures = features.filter(f => {
        const geom = f.geometry;
        return geom?.type === "Polygon" || (Array.isArray(geom?.coordinates) && geom?.coordinates.length > 2);
    });

    return (
        <div className="unified-sections-panel">
            {/* 1. Header */}
            <div className="unified-panel-header">
                <div className="sections-header-title">
                    <Scissors size={15} color="#8b5cf6" />
                    <h2 className="unified-panel-title">Sections</h2>
                </div>
                <span className={`unified-step-badge ${target ? "ready" : "locked"}`}>
                    {target ? `${sections.length} ${sections.length === 1 ? 'Section' : 'Sections'}` : "Select Target"}
                </span>
            </div>

            {/* 2. Active Target / Selection Requirement Card */}
            <div className="unified-sidebar-section">
                <div className="unified-step-header">
                    <span className="unified-step-title">
                        {target ? <Unlock size={12} color="#10b981" /> : <Lock size={12} color="#f87171" />}
                        Active Target
                    </span>
                    {target && (
                        <button
                            onClick={onDeselectTarget}
                            className="sections-link-btn"
                            title="Deselect active target"
                        >
                            Deselect
                        </button>
                    )}
                </div>

                {!target ? (
                    <div className="unified-locked-banner sections-locked-banner">
                        <div className="sections-locked-title">
                            <Lock size={14} />
                            <span>Select a Boundary or Feature</span>
                        </div>
                        <div className="sections-hint">
                            You must either have a Boundary or a Feature selected to section it into rooms, zones, and building parcels.
                        </div>
                    </div>
                ) : (
                    <div className="unified-active-parcel-card sections-active-parcel">
                        <div className="unified-active-parcel-info">
                            <span
                                className="sections-color-dot"
                                style={{
                                    backgroundColor: targetItem?.color || targetItem?.properties_data?.color || '#8b5cf6'
                                }}
                            />
                            <div className="sections-clip">
                                <div className="sections-item-name">
                                    {target.type === "area" ? "📐 " : "🧱 "}
                                    {targetItem?.name}
                                </div>
                                <div className="sections-item-sub">
                                    {targetAreaSqFt ? `${Math.round(targetAreaSqFt).toLocaleString()} sq ft` : ""}
                                    {` • ${target.type === "area" ? "Boundary Parcel" : "Site Feature"}`}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Pick Target if None Selected */}
            {!target && (
                <div className="unified-sidebar-section">
                    <div className="unified-step-header">
                        <span className="unified-step-title sections-step-title-muted">
                            Choose Target to Section:
                        </span>
                    </div>

                    <div className="sections-target-list">
                        {areas.map(area => (
                            <div
                                key={`area-${area.id}`}
                                className="unified-boundary-select-item sections-select-item"
                                onClick={() => onSelectTarget("area", area)}
                                title="Click to section this boundary"
                            >
                                <div className="sections-row sections-row--clip">
                                    <span className="sections-swatch-dot" style={{ backgroundColor: area.color || '#3b82f6' }} />
                                    <span className="unified-boundary-name sections-item-name-sm">📐 {area.name}</span>
                                </div>
                                <span className="sections-tag-indigo">Section</span>
                            </div>
                        ))}

                        {polygonFeatures.map(feat => (
                            <div
                                key={`feat-${feat.id}`}
                                className="unified-boundary-select-item sections-select-item"
                                onClick={() => onSelectTarget("feature", feat)}
                                title="Click to section this feature"
                            >
                                <div className="sections-row sections-row--clip">
                                    <span className="sections-swatch-dot" style={{ backgroundColor: feat.properties_data?.color || '#10b981' }} />
                                    <span className="unified-boundary-name sections-item-name-sm">🧱 {feat.name}</span>
                                </div>
                                <span className="sections-tag-green">Section</span>
                            </div>
                        ))}

                        {areas.length === 0 && polygonFeatures.length === 0 && (
                            <div className="sections-empty-note">
                                No boundaries or features available. Draw a boundary first in the Boundaries tab.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content when Target is Selected */}
            {target && (
                <>
                    {/* 3. Sectioning Tools & Divider Lines */}
                    <div className="unified-sidebar-section">
                        <div className="unified-step-header">
                            <span className="unified-step-title">
                                <Scissors size={12} color="#8b5cf6" />
                                1. Sectioning Tools
                            </span>
                        </div>

                        <div className="unified-tool-grid">
                            {/* Divider Tool */}
                            <button
                                className={`unified-cad-tool ${isDividerActive ? "active" : ""}`}
                                onClick={onStartDivider}
                                title="Draw a divider line across the polygon to split it into two sections"
                            >
                                <Scissors size={13} color="#8b5cf6" />
                                <span>{isDividerActive ? "Drawing Divider..." : "Divider Line (✂)"}</span>
                            </button>

                            {/* Reset / Merge All */}
                            <button
                                className="unified-cad-tool"
                                onClick={onMergeAll}
                                disabled={sections.length === 0 && dividers.length === 0}
                                title="Merge all sections and divider lines back into a single boundary"
                                style={{ opacity: sections.length === 0 && dividers.length === 0 ? 0.45 : 1 }}
                            >
                                <RotateCcw size={13} color="#f59e0b" />
                                <span>Merge All (⊞)</span>
                            </button>
                        </div>

                        {/* Subdivide Presets */}
                        <div className="sections-block">
                            <div className="sections-group-label">
                                Subdivide Grid
                            </div>
                            <div className="sections-split-grid">
                                <button
                                    className="unified-cad-tool sections-tool-compact"
                                    onClick={() => onSubdivide("grid_2h")}
                                    title="Split horizontally with a movable divider line"
                                >
                                    <span>2 Split (Horiz)</span>
                                </button>
                                <button
                                    className="unified-cad-tool sections-tool-compact"
                                    onClick={() => onSubdivide("grid_2v")}
                                    title="Split vertically with a movable divider line"
                                >
                                    <span>2 Split (Vert)</span>
                                </button>
                                <button
                                    className="unified-cad-tool sections-tool-compact"
                                    onClick={() => onSubdivide("grid_4")}
                                    title="Subdivide into 4 quadrants with movable divider lines"
                                >
                                    <span>4 Grid (2×2)</span>
                                </button>
                                <button
                                    className="unified-cad-tool sections-tool-compact"
                                    onClick={() => onSubdivide("grid_9")}
                                    title="Subdivide into 9 zones (3x3)"
                                >
                                    <span>9 Grid (3×3)</span>
                                </button>
                            </div>
                        </div>

                        {/* Perimeter & Setback Inset */}
                        <div className="sections-block-lg">
                            <div className="sections-group-label">
                                Perimeter & Core Buffer
                            </div>
                            <div className="sections-inline-row">
                                <select
                                    className="unified-filter-select sections-select-compact"
                                    value={setbackDist}
                                    onChange={(e) => setSetbackDist(Number(e.target.value))}
                                >
                                    <option value={10}>10 ft Setback</option>
                                    <option value={15}>15 ft Setback</option>
                                    <option value={25}>25 ft Setback</option>
                                    <option value={50}>50 ft Setback</option>
                                </select>
                                <button
                                    className="unified-btn-primary sections-btn-compact"
                                    onClick={() => onInsetCore(setbackDist * 0.3048)}
                                    title="Create interior core and perimeter setback zone"
                                >
                                    Inset Core
                                </button>
                            </div>
                        </div>

                        {/* ACTIVE DIVIDER LINES LIST */}
                        {dividers.length > 0 && (
                            <div className="sections-divider-block">
                                <div className="sections-between sections-between--mb6">
                                    <span className="sections-divider-title">
                                        ✂ Divider Lines ({dividers.length})
                                    </span>
                                    <span className="sections-tiny-muted">
                                        Drag on map to shift
                                    </span>
                                </div>
                                <div className="sections-col-sm">
                                    {dividers.map((div, dIdx) => {
                                        const isDivActive = selectedDividerId === div.id;
                                        return (
                                            <div
                                                key={div.id || dIdx}
                                                className={`unified-boundary-select-item sections-divider-item ${isDivActive ? "is-active" : ""}`}
                                                onClick={() => onSelectDivider?.(div.id)}
                                                title="Click to select divider line and show move/angle handles on map"
                                            >
                                                <div className="sections-row sections-row--clip">
                                                    <Scissors size={12} color={isDivActive ? "#c084fc" : "#8b5cf6"} />
                                                    <span className={`sections-divider-name${isDivActive ? " is-active" : ""}`}>
                                                        {div.name || `Divider Line ${dIdx + 1}`}
                                                    </span>
                                                </div>
                                                <div className="sections-row">
                                                    {isDivActive && (
                                                        <span className="sections-active-chip">
                                                            Active
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMergeDivider?.(div.id);
                                                        }}
                                                        className="sections-icon-link-btn"
                                                        title="Merge across this divider line only (rejoins the sections it separates)"
                                                    >
                                                        <RotateCcw size={11} color="#f59e0b" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. ACTIVE SECTION INSPECTOR / ZONE TYPES (DISABLED UNTIL USER CLICKS A SECTION) */}
                    <div className="unified-sidebar-section">
                        <div className="unified-step-header">
                            <span className={`unified-step-title${selectedSectionId ? " is-active" : ""}`}>
                                {selectedSectionId ? <Unlock size={12} color="#10b981" /> : <Lock size={12} color="var(--color-text-secondary)" />}
                                2. Section Zone Types
                            </span>
                            {selectedSectionId && (
                                <button
                                    onClick={() => onSelectSection?.(null)}
                                    className="sections-link-btn"
                                    title="Deselect current section"
                                >
                                    Deselect Section
                                </button>
                            )}
                        </div>

                        {!selectedSectionId ? (
                            /* Disabled Locked Helper Notice */
                            <div className="sections-disabled-box">
                                <div className="sections-disabled-title">
                                    <Info size={13} color="#818cf8" />
                                    <span>Select a section to customize</span>
                                </div>
                                <div className="sections-disabled-hint">
                                    Zone types and section properties are disabled until you click on a section on the map or from the list below.
                                </div>
                            </div>
                        ) : (
                            /* Active Section Card */
                            <div className="sections-active-card" style={{ border: `1px solid ${activeSection?.color || '#6366f1'}` }}>
                                <div className="sections-between sections-between--mb6">
                                    <div className="sections-row">
                                        <span className="sections-icon-md">
                                            {DEFAULT_SECTION_TYPES.find(t => t.value === activeSection?.type)?.icon || "✂"}
                                        </span>
                                        <input
                                            type="text"
                                            value={activeSection?.name || ""}
                                            onChange={(e) => onUpdateSection?.(selectedSectionId, { name: e.target.value })}
                                            className="sections-name-input"
                                            placeholder="Section Name"
                                        />
                                    </div>
                                    <button
                                        onClick={() => onDeleteSection?.(selectedSectionId)}
                                        className="sections-delete-btn"
                                        title="Delete section"
                                    >
                                        <Trash2 size={12} color="#f87171" />
                                    </button>
                                </div>
                                <div className="sections-meta-row">
                                    <span>{activeSection?.area_sqft ? `${Math.round(activeSection.area_sqft).toLocaleString()} sq ft` : ""}</span>
                                    {targetAreaSqFt > 0 && activeSection?.area_sqft && (
                                        <span className="sections-pct-soft">
                                            {Math.round((activeSection.area_sqft / targetAreaSqFt) * 100)}% of parcel
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Zone Types Grid (Disabled with visual indicator if no section is active) */}
                        <div className={`sections-zone-grid${selectedSectionId ? "" : " is-disabled"}`}>
                            {DEFAULT_SECTION_TYPES.map(st => {
                                const isCurrent = activeSection?.type === st.value;
                                return (
                                    <button
                                        key={st.value}
                                        disabled={!selectedSectionId}
                                        onClick={() => {
                                            if (selectedSectionId) {
                                                onUpdateSection?.(selectedSectionId, {
                                                    type: st.value,
                                                    color: st.color,
                                                    name: st.label
                                                });
                                            }
                                        }}
                                        className={`unified-cad-tool sections-zone-btn ${isCurrent ? "active" : ""}`}
                                        style={{ borderLeft: `3px solid ${st.color}` }}
                                        title={selectedSectionId ? `Assign ${st.label} to active section` : "Select a section first"}
                                    >
                                        <span className="sections-icon-md">{st.icon}</span>
                                        <span className="sections-zone-label">
                                            {st.label.split(" ")[0]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 5. Display Settings */}
                    <div className="unified-sidebar-section">
                        <div className="unified-step-header">
                            <span className="unified-step-title">
                                <Tag size={12} color="#06b6d4" />
                                3. Display Settings
                            </span>
                        </div>

                        <div className="sections-display-col">
                            <div className="sections-toggle-row">
                                <span>Auto Colors</span>
                                <button
                                    onClick={onToggleAutoColors}
                                    className={`unified-icon-btn sections-toggle-btn ${autoColors ? "active" : "muted"}`}
                                >
                                    {autoColors ? "On" : "Off"}
                                </button>
                            </div>

                            <div className="sections-toggle-row">
                                <span>Section Badges</span>
                                <button
                                    onClick={onToggleShowLabels}
                                    className={`unified-icon-btn sections-toggle-btn ${showLabels ? "active" : "muted"}`}
                                >
                                    {showLabels ? "Visible" : "Hidden"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 6. Active Sections List */}
                    <div className="unified-sidebar-section sections-flex">
                        <div className="unified-step-header">
                            <span className="unified-step-title">
                                <LayoutGrid size={12} color="#6366f1" />
                                4. Sections ({sections.length})
                            </span>
                        </div>

                        {sections.length === 0 ? (
                            <div className="sections-empty-note sections-empty-note--tight">
                                No sections created yet. Use <strong>Divider Line (✂)</strong> or <strong>Subdivide Grid</strong> above to slice this boundary into rooms/zones.
                            </div>
                        ) : (
                            <div className="sections-list">
                                {sections.map((sec, idx) => {
                                    const isSelected = selectedSectionId === sec.id;
                                    const typeObj = DEFAULT_SECTION_TYPES.find(t => t.value === sec.type) || DEFAULT_SECTION_TYPES[0];
                                    const percent = targetAreaSqFt > 0 ? Math.round((sec.area_sqft / targetAreaSqFt) * 100) : 0;

                                    return (
                                        <div
                                            key={sec.id || idx}
                                            className={`unified-boundary-select-item sections-list-item ${isSelected ? "is-selected" : ""}`}
                                            onClick={() => onSelectSection?.(sec.id)}
                                            style={{ borderLeft: `3px solid ${sec.color || typeObj.color}` }}
                                            title="Click to select section and customize its zone type"
                                        >
                                            <div className="sections-between">
                                                <div className="sections-row-flex">
                                                    <span className="sections-icon-md">{typeObj.icon}</span>
                                                    <span className={`sections-list-name${isSelected ? " is-selected" : ""}`}>
                                                        {sec.name || `Section ${idx + 1}`}
                                                    </span>
                                                </div>

                                                <div className="sections-row">
                                                    {isSelected && (
                                                        <span className="sections-active-chip-green">
                                                            Active
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteSection?.(sec.id);
                                                        }}
                                                        className="sections-remove-btn"
                                                        title="Delete this section"
                                                    >
                                                        <Trash2 size={11} color="#f87171" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="sections-meta-row">
                                                <span>{Math.round(sec.area_sqft).toLocaleString()} sq ft</span>
                                                <span className="sections-pct-indigo">{percent}% of parcel</span>
                                            </div>

                                            {/* Color preset chips for this section when active */}
                                            {isSelected && (
                                                <div className="sections-chip-row">
                                                    {SECTION_PALETTE.slice(0, 8).map(c => (
                                                        <span
                                                            key={c}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onUpdateSection?.(sec.id, { color: c });
                                                            }}
                                                            className={`sections-swatch-chip${sec.color === c ? " is-selected" : ""}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
