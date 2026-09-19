import { Button } from "@astryxdesign/core/Button";
import { 
    Trash2, 
    ChevronDown, 
    GripVertical,
    Home,
    Wrench,
    Trees,
    AlertCircle,
    Sparkles,
    Type,
    Zap,
    Hexagon,
    Square,
    Circle,
    Spline,
    Ruler,
    Columns2,
    Palette,
    MapPin
} from "lucide-react";
import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function DataTab({ 
    mapProperties, 
    mapPoints, 
    handlePointSelect, 
    deleteCanvasObjects,
    addCanvasObjects,
    mapStore,
    mapId,
    overlaysStore
}) {
    const [openMaps, setOpenMaps] = useState({ [mapId]: true });

    const toggleMapOpen = (mId) => {
        setOpenMaps(prev => ({ ...prev, [mId]: !prev[mId] }));
    };

    const renderItemIcon = (p, isProperty) => {
        if (p.icon && (p.icon.startsWith("http") || p.icon.startsWith("/") || p.icon.startsWith("data:"))) {
            return <img src={p.icon} alt="Icon" style={{ width: 18, height: 18, objectFit: 'contain' }} />;
        }
        switch (p.type) {
            case "structure":
            case "home":
                return <Home size={18} color="#6366f1" />;
            case "valve":
                return <Wrench size={18} color="#ef4444" />;
            case "flora":
                return <Trees size={18} color="#10b981" />;
            case "inspection":
                return <AlertCircle size={18} color="#f59e0b" />;
            case "fixture":
                return <Sparkles size={18} color="#06b6d4" />;
            case "callout":
                return <Type size={18} color="#8b5cf6" />;
            case "utility":
                return <Zap size={18} color="#f97316" />;
            case "polygon":
                return <Hexagon size={18} color="#3b82f6" />;
            case "rectangle":
                return <Square size={18} color="#6366f1" />;
            case "radius":
                return <Circle size={18} color="#8b5cf6" />;
            case "curve":
                return <Spline size={18} color="#10b981" />;
            case "measure":
                return <Ruler size={18} color="#ec4899" />;
            case "setback":
                return <Columns2 size={18} color="#f59e0b" />;
            case "material":
                return <Palette size={18} color="#22c55e" />;
            case "line":
                return <Ruler size={18} color="#3b82f6" />;
            case "apartment":
                return <img src="/icons/building-point.svg" alt="Apartment" style={{ width: 18, height: 18, filter: 'invert(1)' }} />;
            case "unit":
                return <img src="/icons/unit-point.svg" alt="Unit" style={{ width: 18, height: 18, filter: 'invert(1)' }} />;
            default:
                if (p.icon && p.icon.length <= 4) {
                    return <span style={{ fontSize: '16px' }}>{p.icon}</span>;
                }
                return <MapPin size={18} color="#ef4444" />;
        }
    };

    const mapGroups = useMemo(() => {
        const groups = {};
        
        // Base Map
        const baseMap = mapStore?.data?.find(m => m.id === Number(mapId));
        groups[mapId] = {
            id: Number(mapId),
            name: baseMap ? baseMap.name : "Main Map",
            items: []
        };

        // Overlays
        if (overlaysStore && overlaysStore.workspaceMapIds) {
            overlaysStore.workspaceMapIds.forEach(oId => {
                const overlayMap = overlaysStore.maps?.find(m => m.id === Number(oId));
                groups[oId] = {
                    id: Number(oId),
                    name: overlayMap ? overlayMap.name : `Layer ${oId}`,
                    items: []
                };
            });
        }

        // Distribute items
        const allItems = [...mapProperties, ...mapPoints];
        allItems.forEach(item => {
            const mId = item.map_id || Number(mapId);
            if (groups[mId]) {
                groups[mId].items.push(item);
            }
        });

        return Object.values(groups);
    }, [mapProperties, mapPoints, mapStore, mapId, overlaysStore]);

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        const newMapId = Number(destination.droppableId);
        
        // Find the dragged object
        const allItems = [...mapProperties, ...mapPoints];
        const draggedObj = allItems.find(p => String(p.id) === draggableId);
        
        if (draggedObj) {
            const updatedObj = { ...draggedObj, map_id: newMapId };
            addCanvasObjects(updatedObj);
        }
    };

    const renderItem = (p, index) => {
        const isProperty = ["home", "apartment", "unit"].includes(p.type);
        
        return (
            <Draggable key={String(p.id)} draggableId={String(p.id)} index={index}>
                {(provided, snapshot) => (
                    <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: snapshot.isDragging ? 'var(--color-border)' : 'var(--color-background-card)',
                            border: '1px solid var(--color-border)',
                            boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                            zIndex: snapshot.isDragging ? 50 : 1,
                            transition: 'background-color 0.2s'
                        }}
                        onClick={() => handlePointSelect(p)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                            <div 
                                {...provided.dragHandleProps}
                                style={{ cursor: 'grab', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GripVertical size={16} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, flexShrink: 0 }}>
                                {renderItemIcon(p, isProperty)}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 500 }}>
                                    {(p.text || p.extra_info?.text || p.name || (p.type === "marker" || p.type === "icon" ? "Icon" : `${isProperty ? 'Property' : 'Point'} ${p.id}`)).replace("(Unsaved)", "").trim()}
                                </span>
                                {(p.name?.includes("(Unsaved)") || p.source === "canvas" || p.source === "mod") && (
                                    <div style={{ width: 8, height: 8, backgroundColor: '#f59e0b', borderRadius: '50%', flexShrink: 0 }} title="Unsaved changes" />
                                )}
                            </div>
                        </div>
                        
                        <Button 
                            variant="ghost" 
                            size="small"
                            label="Delete"
                            icon={<Trash2 size={14} />}
                            onClick={(e) => { e.stopPropagation(); deleteCanvasObjects(p.id); }}
                        />
                    </div>
                )}
            </Draggable>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 12px', gap: '12px', height: '100%', overflowY: 'auto' }}>
            <DragDropContext onDragEnd={onDragEnd}>
                {mapGroups.map((group) => {
                    const isOpen = openMaps[group.id] !== false;
                    return (
                        <div key={`map-group-${group.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button 
                                onClick={() => toggleMapOpen(group.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--color-background-surface)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', overflow: 'hidden' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', textAlign: 'left' }}>{group.name}</span>
                                    {group.id === Number(mapId) && <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Base Map</span>}
                                </div>
                                <ChevronDown size={14} style={{ transition: 'transform 0.2s', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                            </button>
                            
                            {isOpen && (
                                <Droppable droppableId={String(group.id)}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                marginTop: '4px',
                                                minHeight: '40px',
                                                padding: '4px',
                                                borderRadius: '6px',
                                                border: snapshot.isDraggingOver ? '2px dashed var(--color-border)' : '1px dashed transparent',
                                                backgroundColor: snapshot.isDraggingOver ? 'var(--color-background-card)' : 'transparent'
                                            }}
                                        >
                                            {group.items.length === 0 && !snapshot.isDraggingOver && (
                                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '12px' }}>No data</div>
                                            )}
                                            {group.items.map((item, index) => renderItem(item, index))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            )}
                        </div>
                    );
                })}
            </DragDropContext>
        </div>
    );
}
