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
import "./DataTab.css";

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
            return <img src={p.icon} alt="Icon" className="data-item-img" />;
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
                return <img src="/icons/building-point.svg" alt="Apartment" className="data-item-img is-mono" />;
            case "unit":
                return <img src="/icons/unit-point.svg" alt="Unit" className="data-item-img is-mono" />;
            default:
                if (p.icon && p.icon.length <= 4) {
                    return <span className="data-item-emoji">{p.icon}</span>;
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
                        className="data-item"
                        style={{
                            backgroundColor: snapshot.isDragging ? 'var(--color-border)' : undefined,
                            boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : undefined,
                            zIndex: snapshot.isDragging ? 50 : undefined,
                        }}
                        onClick={() => handlePointSelect(p)}
                    >
                        <div className="data-item-main">
                            <div 
                                {...provided.dragHandleProps}
                                className="data-item-handle"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GripVertical size={16} />
                            </div>

                            <div className="data-item-icon">
                                {renderItemIcon(p, isProperty)}
                            </div>
                            
                            <div className="data-item-label">
                                <span className="data-item-text">
                                    {(p.text || p.extra_info?.text || p.name || (p.type === "marker" || p.type === "icon" ? "Icon" : `${isProperty ? 'Property' : 'Point'} ${p.id}`)).replace("(Unsaved)", "").trim()}
                                </span>
                                {(p.name?.includes("(Unsaved)") || p.source === "canvas" || p.source === "mod") && (
                                    <div className="data-item-dot" title="Unsaved changes" />
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
        <div className="data-tab">
            <DragDropContext onDragEnd={onDragEnd}>
                {mapGroups.map((group) => {
                    const isOpen = openMaps[group.id] !== false;
                    return (
                        <div key={`map-group-${group.id}`} className="data-group">
                            <button 
                                onClick={() => toggleMapOpen(group.id)}
                                className="data-group-header"
                            >
                                <div className="data-group-titles">
                                    <span className="data-group-name">{group.name}</span>
                                    {group.id === Number(mapId) && <span className="data-group-badge">Base Map</span>}
                                </div>
                                <ChevronDown size={14} className={`data-group-chevron${isOpen ? " is-open" : ""}`} />
                            </button>
                            
                            {isOpen && (
                                <Droppable droppableId={String(group.id)}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="data-dropzone"
                                            style={{
                                                border: snapshot.isDraggingOver ? '2px dashed var(--color-border)' : undefined,
                                                backgroundColor: snapshot.isDraggingOver ? 'var(--color-background-card)' : undefined,
                                            }}
                                        >
                                            {group.items.length === 0 && !snapshot.isDraggingOver && (
                                                <div className="data-empty">No data</div>
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
