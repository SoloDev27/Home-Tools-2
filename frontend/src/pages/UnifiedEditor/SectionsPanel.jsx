import React, { useState } from "react";
import {
    Scissors, Grid3X3, Layers, Lock, Unlock, Check, Trash2,
    Sparkles, ArrowRight, LayoutGrid, Box, Eye, EyeOff, Tag,
    CornerDownRight, RotateCcw, AlertTriangle, ShieldCheck,
    Move, Sliders, Info, CheckCircle2, ChevronRight
} from "lucide-react";
import { DEFAULT_SECTION_TYPES, SECTION_PALETTE } from "../../functions/sectionGeometry";

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '10px',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: 0
                            }}
                            title="Deselect active target"
                        >
                            Deselect
                        </button>
                    )}
                </div>

                {!target ? (
                    <div className="unified-locked-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, fontSize: '12px' }}>
                            <Lock size={14} />
                            <span>Select a Boundary or Feature</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                            You must either have a Boundary or a Feature selected to section it into rooms, zones, and building parcels.
                        </div>
                    </div>
                ) : (
                    <div className="unified-active-parcel-card" style={{ borderColor: 'rgba(139, 92, 246, 0.4)' }}>
                        <div className="unified-active-parcel-info">
                            <span
                                style={{
                                    width: '9px',
                                    height: '9px',
                                    borderRadius: '50%',
                                    backgroundColor: targetItem?.color || targetItem?.properties_data?.color || '#8b5cf6',
                                    flexShrink: 0
                                }}
                            />
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {target.type === "area" ? "📐 " : "🧱 "}
                                    {targetItem?.name}
                                </div>
                                <div style={{ fontSize: '10px', color: '#a5b4fc', marginTop: '1px' }}>
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
                        <span className="unified-step-title" style={{ fontSize: '11px', color: '#cbd5e1' }}>
                            Choose Target to Section:
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                        {areas.map(area => (
                            <div
                                key={`area-${area.id}`}
                                className="unified-boundary-select-item"
                                onClick={() => onSelectTarget("area", area)}
                                title="Click to section this boundary"
                                style={{ padding: '6px 8px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: area.color || '#3b82f6', flexShrink: 0 }} />
                                    <span className="unified-boundary-name" style={{ fontSize: '11px' }}>📐 {area.name}</span>
                                </div>
                                <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 600 }}>Section</span>
                            </div>
                        ))}

                        {polygonFeatures.map(feat => (
                            <div
                                key={`feat-${feat.id}`}
                                className="unified-boundary-select-item"
                                onClick={() => onSelectTarget("feature", feat)}
                                title="Click to section this feature"
                                style={{ padding: '6px 8px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: feat.properties_data?.color || '#10b981', flexShrink: 0 }} />
                                    <span className="unified-boundary-name" style={{ fontSize: '11px' }}>🧱 {feat.name}</span>
                                </div>
                                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Section</span>
                            </div>
                        ))}

                        {areas.length === 0 && polygonFeatures.length === 0 && (
                            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '6px 4px' }}>
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
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Subdivide Grid
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                <button
                                    className="unified-cad-tool"
                                    onClick={() => onSubdivide("grid_2h")}
                                    title="Split horizontally with a movable divider line"
                                    style={{ padding: '6px' }}
                                >
                                    <span>2 Split (Horiz)</span>
                                </button>
                                <button
                                    className="unified-cad-tool"
                                    onClick={() => onSubdivide("grid_2v")}
                                    title="Split vertically with a movable divider line"
                                    style={{ padding: '6px' }}
                                >
                                    <span>2 Split (Vert)</span>
                                </button>
                                <button
                                    className="unified-cad-tool"
                                    onClick={() => onSubdivide("grid_4")}
                                    title="Subdivide into 4 quadrants with movable divider lines"
                                    style={{ padding: '6px' }}
                                >
                                    <span>4 Grid (2×2)</span>
                                </button>
                                <button
                                    className="unified-cad-tool"
                                    onClick={() => onSubdivide("grid_9")}
                                    title="Subdivide into 9 zones (3x3)"
                                    style={{ padding: '6px' }}
                                >
                                    <span>9 Grid (3×3)</span>
                                </button>
                            </div>
                        </div>

                        {/* Perimeter & Setback Inset */}
                        <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Perimeter & Core Buffer
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <select
                                    className="unified-filter-select"
                                    value={setbackDist}
                                    onChange={(e) => setSetbackDist(Number(e.target.value))}
                                    style={{ flex: 1, padding: '5px 8px', fontSize: '11px' }}
                                >
                                    <option value={10}>10 ft Setback</option>
                                    <option value={15}>15 ft Setback</option>
                                    <option value={25}>25 ft Setback</option>
                                    <option value={50}>50 ft Setback</option>
                                </select>
                                <button
                                    className="unified-btn-primary"
                                    onClick={() => onInsetCore(setbackDist * 0.3048)}
                                    style={{ padding: '5px 10px', fontSize: '11px' }}
                                    title="Create interior core and perimeter setback zone"
                                >
                                    Inset Core
                                </button>
                            </div>
                        </div>

                        {/* ACTIVE DIVIDER LINES LIST */}
                        {dividers.length > 0 && (
                            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        ✂ Divider Lines ({dividers.length})
                                    </span>
                                    <span style={{ fontSize: '9px', color: '#64748b' }}>
                                        Drag on map to shift
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {dividers.map((div, dIdx) => {
                                        const isDivActive = selectedDividerId === div.id;
                                        return (
                                            <div
                                                key={div.id || dIdx}
                                                className={`unified-boundary-select-item ${isDivActive ? "active" : ""}`}
                                                onClick={() => onSelectDivider?.(div.id)}
                                                style={{
                                                    padding: '6px 8px',
                                                    cursor: 'pointer',
                                                    borderColor: isDivActive ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                                                    background: isDivActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.4)'
                                                }}
                                                title="Click to select divider line and show move/angle handles on map"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                    <Scissors size={12} color={isDivActive ? "#c084fc" : "#8b5cf6"} />
                                                    <span style={{ fontSize: '11px', fontWeight: isDivActive ? 700 : 500, color: isDivActive ? '#ffffff' : '#cbd5e1' }}>
                                                        {div.name || `Divider Line ${dIdx + 1}`}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {isDivActive && (
                                                        <span style={{ fontSize: '9px', color: '#a78bfa', background: 'rgba(139,92,246,0.3)', padding: '1px 5px', borderRadius: '4px' }}>
                                                            Active
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMergeDivider?.(div.id);
                                                        }}
                                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '1px' }}
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
                            <span className="unified-step-title" style={{ color: selectedSectionId ? '#f8fafc' : '#94a3b8' }}>
                                {selectedSectionId ? <Unlock size={12} color="#10b981" /> : <Lock size={12} color="#94a3b8" />}
                                2. Section Zone Types
                            </span>
                            {selectedSectionId && (
                                <button
                                    onClick={() => onSelectSection?.(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        padding: 0
                                    }}
                                    title="Deselect current section"
                                >
                                    Deselect Section
                                </button>
                            )}
                        </div>

                        {!selectedSectionId ? (
                            /* Disabled Locked Helper Notice */
                            <div style={{
                                padding: '10px 12px',
                                background: 'rgba(30, 41, 59, 0.55)',
                                borderRadius: '8px',
                                border: '1px dashed rgba(255, 255, 255, 0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                marginBottom: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '11px', fontWeight: 600 }}>
                                    <Info size={13} color="#818cf8" />
                                    <span>Select a section to customize</span>
                                </div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.4' }}>
                                    Zone types and section properties are disabled until you click on a section on the map or from the list below.
                                </div>
                            </div>
                        ) : (
                            /* Active Section Card */
                            <div style={{
                                padding: '8px 10px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: `1px solid ${activeSection?.color || '#6366f1'}`,
                                borderRadius: '6px',
                                marginBottom: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '14px' }}>
                                            {DEFAULT_SECTION_TYPES.find(t => t.value === activeSection?.type)?.icon || "✂"}
                                        </span>
                                        <input
                                            type="text"
                                            value={activeSection?.name || ""}
                                            onChange={(e) => onUpdateSection?.(selectedSectionId, { name: e.target.value })}
                                            style={{
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '4px',
                                                color: '#ffffff',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                outline: 'none',
                                                width: '130px'
                                            }}
                                            placeholder="Section Name"
                                        />
                                    </div>
                                    <button
                                        onClick={() => onDeleteSection?.(selectedSectionId)}
                                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                                        title="Delete section"
                                    >
                                        <Trash2 size={12} color="#f87171" />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                                    <span>{activeSection?.area_sqft ? `${Math.round(activeSection.area_sqft).toLocaleString()} sq ft` : ""}</span>
                                    {targetAreaSqFt > 0 && activeSection?.area_sqft && (
                                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                                            {Math.round((activeSection.area_sqft / targetAreaSqFt) * 100)}% of parcel
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Zone Types Grid (Disabled with visual indicator if no section is active) */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '4px',
                            opacity: selectedSectionId ? 1 : 0.42,
                            pointerEvents: selectedSectionId ? 'auto' : 'none',
                            filter: selectedSectionId ? 'none' : 'grayscale(40%)'
                        }}>
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
                                        className={`unified-cad-tool ${isCurrent ? "active" : ""}`}
                                        style={{
                                            flexDirection: 'column',
                                            padding: '6px 4px',
                                            gap: '2px',
                                            height: 'auto',
                                            borderLeft: `3px solid ${st.color}`,
                                            cursor: selectedSectionId ? 'pointer' : 'not-allowed'
                                        }}
                                        title={selectedSectionId ? `Assign ${st.label} to active section` : "Select a section first"}
                                    >
                                        <span style={{ fontSize: '14px' }}>{st.icon}</span>
                                        <span style={{ fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75px' }}>
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                                <span>Auto Colors</span>
                                <button
                                    onClick={onToggleAutoColors}
                                    className={`unified-icon-btn ${autoColors ? "active" : "muted"}`}
                                    style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 600, width: 'auto', height: 'auto', borderRadius: '4px' }}
                                >
                                    {autoColors ? "On" : "Off"}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                                <span>Section Badges</span>
                                <button
                                    onClick={onToggleShowLabels}
                                    className={`unified-icon-btn ${showLabels ? "active" : "muted"}`}
                                    style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 600, width: 'auto', height: 'auto', borderRadius: '4px' }}
                                >
                                    {showLabels ? "Visible" : "Hidden"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 6. Active Sections List */}
                    <div className="unified-sidebar-section" style={{ flex: 1 }}>
                        <div className="unified-step-header">
                            <span className="unified-step-title">
                                <LayoutGrid size={12} color="#6366f1" />
                                4. Sections ({sections.length})
                            </span>
                        </div>

                        {sections.length === 0 ? (
                            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '6px 2px' }}>
                                No sections created yet. Use <strong>Divider Line (✂)</strong> or <strong>Subdivide Grid</strong> above to slice this boundary into rooms/zones.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                                {sections.map((sec, idx) => {
                                    const isSelected = selectedSectionId === sec.id;
                                    const typeObj = DEFAULT_SECTION_TYPES.find(t => t.value === sec.type) || DEFAULT_SECTION_TYPES[0];
                                    const percent = targetAreaSqFt > 0 ? Math.round((sec.area_sqft / targetAreaSqFt) * 100) : 0;

                                    return (
                                        <div
                                            key={sec.id || idx}
                                            className={`unified-boundary-select-item ${isSelected ? "active" : ""}`}
                                            onClick={() => onSelectSection?.(sec.id)}
                                            style={{
                                                padding: '8px 10px',
                                                cursor: 'pointer',
                                                borderLeft: `3px solid ${sec.color || typeObj.color}`,
                                                flexDirection: 'column',
                                                alignItems: 'stretch',
                                                gap: '6px',
                                                background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(30, 41, 59, 0.4)'
                                            }}
                                            title="Click to select section and customize its zone type"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                                                    <span style={{ fontSize: '14px' }}>{typeObj.icon}</span>
                                                    <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                                                        {sec.name || `Section ${idx + 1}`}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {isSelected && (
                                                        <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                                                            Active
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteSection?.(sec.id);
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#94a3b8',
                                                            cursor: 'pointer',
                                                            padding: '2px'
                                                        }}
                                                        title="Delete this section"
                                                    >
                                                        <Trash2 size={11} color="#f87171" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                                                <span>{Math.round(sec.area_sqft).toLocaleString()} sq ft</span>
                                                <span style={{ color: '#818cf8', fontWeight: 600 }}>{percent}% of parcel</span>
                                            </div>

                                            {/* Color preset chips for this section when active */}
                                            {isSelected && (
                                                <div style={{ display: 'flex', gap: '4px', marginTop: '2px', alignItems: 'center' }}>
                                                    {SECTION_PALETTE.slice(0, 8).map(c => (
                                                        <span
                                                            key={c}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onUpdateSection?.(sec.id, { color: c });
                                                            }}
                                                            style={{
                                                                width: '12px',
                                                                height: '12px',
                                                                borderRadius: '50%',
                                                                backgroundColor: c,
                                                                cursor: 'pointer',
                                                                border: sec.color === c ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                                                                transform: sec.color === c ? 'scale(1.2)' : 'none'
                                                            }}
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
