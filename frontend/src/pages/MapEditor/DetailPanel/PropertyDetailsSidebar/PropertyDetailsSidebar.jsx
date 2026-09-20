import { useState, useEffect, useMemo, useRef, createContext, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Box, ExternalLink } from "lucide-react";
import { Tree } from "react-arborist";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { reverseLookupAddress } from "../../../../functions/nominatim";
import NodeDetailsEditor from "./NodeDetailsEditor";
import NoteCanvas from "./NoteCanvas";
import { getMarkdownTemplate } from "./inspection_templates";
import "./PropertyDetailsSidebar.css";

const SidebarContext = createContext(null);

const NodeRenderer = ({ node, style, dragHandle, tree }) => {
    const handlers = useContext(SidebarContext);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(node.data.name);
    const [showRoomTypes, setShowRoomTypes] = useState(false);

    useEffect(() => {
        setTempName(node.data.name);
    }, [node.data.name]);

    if (!handlers) return null;
    const { 
        handleRenameNode, 
        handleCreateChild, 
        handleDeleteNode, 
        setSelectedNodeId, 
        hideAllNotes, 
        setHideAllNotes 
    } = handlers;

    const onEdit = () => {
        if (node.data.type === 'notes-folder' || node.data.type === 'exterior-folder') return;
        setIsEditing(true);
    };

    const isFolder = node.data.type === 'notes-folder' || node.data.type === 'exterior-folder';
    const noteCount = isFolder ? (node.data.children?.length || 0) : 0;
    const isDirty = node.data.isDirty;
    const hasChildren = node.data.children && node.data.children.length > 0;

    const roomTypes = [
        { id: 'bedroom', name: 'Bedroom', icon: '/icons/bed.svg', colorClass: 'icon-bedroom' },
        { id: 'bath', name: 'Bath', icon: '/icons/bathtub.svg', colorClass: 'icon-bath' },
        { id: 'kitchen', name: 'Kitchen', icon: '/icons/countertops.svg', colorClass: 'icon-kitchen' },
        { id: 'dining', name: 'Dining', icon: '/icons/dining.svg', colorClass: 'icon-dining' },
        { id: 'laundry', name: 'Laundry', icon: '/icons/laundry.svg', colorClass: 'icon-laundry' },
        { id: 'patio', name: 'Patio', icon: '/icons/deck_patio.svg', colorClass: 'icon-patio' },
        { id: 'office', name: 'Office', icon: '/icons/office-room.svg', colorClass: 'icon-office' },
        { id: 'detector', name: 'Detectors', icon: '/icons/detector.svg', colorClass: 'icon-detector' },
    ];

    const getIconInfo = () => {
        if (node.data.type === 'notes-folder') return { src: noteCount > 0 ? "/icons/folder.svg" : "/icons/folder_off.svg", cls: 'icon-notes' };
        if (node.data.type === 'exterior-folder') return { src: "/icons/exterior.svg", cls: 'icon-exterior' };
        
        if (node.data.type === 'property') {
            const propType = node.data.propType || 'home';
            switch (propType) {
                case 'apartment': return { src: "/icons/apartment.svg", cls: 'icon-property' };
                case 'unit': return { src: "/icons/unit.svg", cls: 'icon-property' };
                case 'point': return { src: "/icons/point.svg", cls: 'icon-property' };
                default: return { src: "/icons/house.svg", cls: 'icon-property' };
            }
        }
        
        if (node.data.type === 'floor') return { src: "/icons/floor.svg", cls: 'icon-floor' };
        if (node.data.type === 'note') return { src: "/icons/assignment.svg", cls: 'icon-notes' };
        
        if (node.data.type === 'room') {
            const type = roomTypes.find(t => t.id === node.data.subtype);
            return type ? { src: type.icon, cls: type.colorClass } : { src: "/icons/unit.svg", cls: "" };
        }
        return { src: "/icons/point.svg", cls: "" };
    };

    const iconInfo = getIconInfo();

    return (
        <div 
            style={style} 
            className={`node-container ${node.isSelected ? 'selected' : ''} ${isFolder ? 'folder-node' : ''}`}
            onClick={(e) => {
                node.select();
                setSelectedNodeId(node.id);
            }}
        >
            <div className="node-toggle-col">
                {hasChildren && (
                    <button type="button" className="node-toggle-btn" onClick={(e) => { e.stopPropagation(); node.toggle(); }}>
                        <img
                            src={node.isOpen ? "/icons/arrow_drop_down.svg" : "/icons/arrow_drop_up.svg"}
                            alt="toggle"
                            className="toggle-svg"
                        />
                    </button>
                )}
            </div>

            <div className="node-icon" ref={dragHandle} style={{ cursor: isFolder ? 'default' : 'grab', opacity: isFolder && noteCount === 0 ? 0.5 : 1 }}>
                <img src={iconInfo.src} className={`type-svg ${iconInfo.cls} ${(node.data.type === 'note' || node.data.subtype === 'detector') ? 'icon-small' : ''}`} alt="icon" />
            </div>
            
            {isEditing ? (
                <input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={() => { setIsEditing(false); handleRenameNode(node.id, tempName); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditing(false); handleRenameNode(node.id, tempName); } }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="sidebar-input"
                    style={{ height: '28px', fontSize: '13px', padding: '2px 6px' }}
                />
            ) : (
                <div className="node-text-wrapper">
                    <span className="node-text">{node.data.name}</span>
                    {node.data.type === 'notes-folder' && <Badge variant="neutral">{noteCount}</Badge>}
                    {isDirty && !isFolder && <span className="dirty-indicator">●</span>}
                </div>
            )}

            <div className="node-actions">
                {node.data.type === 'property' && (
                    <>
                        <button
                            type="button"
                            title={hideAllNotes ? "Show Notes" : "Hide Notes"}
                            onClick={(e) => { e.stopPropagation(); setHideAllNotes(!hideAllNotes); }}
                            className={`action-btn ${hideAllNotes ? 'active' : ''}`}
                        >
                            <img src={hideAllNotes ? "/icons/folder_off.svg" : "/icons/folder.svg"} className="action-svg icon-notes" alt="toggle" />
                        </button>
                        <button type="button" className="action-btn" title="Add Floor" onClick={(e) => { e.stopPropagation(); handleCreateChild('root', 'floor'); }}>
                            <img src="/icons/add-custom.svg" alt="add" className="action-svg" />
                        </button>
                    </>
                )}
                {node.data.type === 'floor' && (
                    <div className="add-room-container">
                        <button type="button" className="action-btn" title="Add Room..." onClick={(e) => { e.stopPropagation(); setShowRoomTypes(!showRoomTypes); }}>
                            <img src="/icons/add-custom.svg" alt="add" className="action-svg" />
                        </button>
                        {showRoomTypes && (
                            <div className="room-type-dropdown">
                                {roomTypes.map(type => (
                                    <div key={type.id} className="room-type-option" onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateChild(node.id, 'room', type.id);
                                        setShowRoomTypes(false);
                                    }}>
                                        <img src={type.icon} alt={type.name} className={type.colorClass} />
                                        <span>{type.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {(node.data.type === 'notes-folder' || node.data.type === 'exterior-folder') && (
                    <button type="button" className="action-btn" title="Add Note" onClick={(e) => { e.stopPropagation(); handleCreateChild(node.data.parentId, 'note'); }}>
                        <img src="/icons/assignment_add.svg" alt="add" className="action-svg" />
                    </button>
                )}
                {node.data.type !== 'property' && !isFolder && (
                    <>
                        <button type="button" className="action-btn" title="Rename" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                            <img src="/icons/brush.svg" alt="edit" className="action-svg" />
                        </button>
                        <button type="button" className="action-btn" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}>
                            <img src="/icons/delete.svg" className="action-svg icon-danger" alt="delete" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default function PropertyDetailsSidebar({ point, onClose, onUpdate, onDelete, isPinned, onPinToggle }) {
    const navigate = useNavigate();
    const treeRef = useRef(null);
    const containerRef = useRef(null);
    const [activeTab, setActiveTab] = useState("general");
    const [hierarchy, setHierarchy] = useState({ dimensions: { h: 0, w: 0, l: 0, sqft: 0 }, notes: [], exterior_notes: [], floors: [] });
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [name, setName] = useState("");
    const [type, setType] = useState(point?.type || "marker");
    const [location, setLocation] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [hasStagedChanges, setHasStagedChanges] = useState(false);
    const [hideAllNotes, setHideAllNotes] = useState(false);
    
    // Draggable Split state
    const [splitHeight, setSplitHeight] = useState(300);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e) => {
        setIsDragging(true);
        e.preventDefault();
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            // Calculate height relative to the form container top
            const relativeY = e.clientY - rect.top;
            
            // Constrain between 150px and form height - 150px to ensure both are visible
            const newHeight = Math.max(150, Math.min(relativeY, rect.height - 150));
            setSplitHeight(newHeight);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const prevPointIdRef = useRef(point?.id);
    useEffect(() => {
        if (!point) return;
        if (prevPointIdRef.current !== point.id) {
            setSelectedDetailNoteId(null);
            prevPointIdRef.current = point.id;
        }
    }, [point?.id]);

    useEffect(() => {
        if (!point) return;
        setConfirmingDelete(false);
        const isStaged = point.name?.includes("(Unsaved)") || point.source === 'canvas' || point.source === 'mod';
        setHasStagedChanges(isStaged);
        const cleanName = (point.name || "").replace("(Unsaved)", "").trim();
        setName(cleanName);
        setType(point.type || "marker");

        if (point.hierarchy) {
            setHierarchy(point.hierarchy);
        } else {
            const legacyFloorsCount = point.extra_info?.floors || 1;
            const legacyUnits = point.extra_info?.units || [];
            const safePointId = String(point.id || 'new');
            const initialFloors = Array.from({ length: legacyFloorsCount }, (_, i) => {
                const floorId = `floor-${safePointId}-${i}`;
                return {
                    id: floorId,
                    name: `Floor ${i + 1}`,
                    type: 'floor',
                    dimensions: { h: 0, w: 0, l: 0, sqft: 0 },
                    notes: [],
                    rooms: i === 0 ? legacyUnits.map((u, ui) => ({
                        id: `room-${safePointId}-${i}-${ui}`,
                        name: u,
                        type: 'room',
                        subtype: 'generic',
                        dimensions: { h: 0, w: 0, l: 0, sqft: 0 },
                        notes: [],
                        inspectionData: {}
                    })) : []
                };
            });
            setHierarchy({ dimensions: { h: 0, w: 0, l: 0, sqft: 0 }, notes: [], exterior_notes: [], floors: initialFloors });
        }

        if (point.location) {
            setLocation(point.location);
            setLoaded(true);
        } else {
            setLoaded(false);
            reverseLookupAddress(point.lng, point.lat)
                .then(data => { setLocation(data.text); setLoaded(true); })
                .catch(() => { setLocation("Address not found"); setLoaded(true); });
        }
    }, [point?.id, point?.lng, point?.lat]);

    const allNotes = useMemo(() => {
        const notes = [];
        const scan = (nodes) => {
            if (!nodes) return;
            nodes.forEach(n => {
                if (n.notes) notes.push(...n.notes);
                if (n.exterior_notes) notes.push(...n.exterior_notes);
                if (n.floors) scan(n.floors);
                if (n.rooms) scan(n.rooms);
            });
        };
        scan([hierarchy]);
        return notes;
    }, [hierarchy]);

    const treeData = useMemo(() => {
        if (!point) return [];
        
        const mapFolder = (notes, folderId, folderName, type) => ({
            id: `group-${folderId}-${type}`,
            name: folderName,
            type: type,
            docs: notes || []
        });

        const rootNodeId = 'root'; // Consistent with business logic expectations
        const root = {
            id: rootNodeId,
            name: name || 'Property',
            type: 'property',
            children: [
                mapFolder(hierarchy?.notes || [], 'root-notes', 'Home Notes', 'notes-folder'),
                mapFolder(hierarchy?.exterior_notes || [], 'root-exterior', 'Exterior', 'exterior-folder'),
                ...(hierarchy?.floors || []).map(f => ({
                    id: f.id,
                    name: f.name,
                    type: 'floor',
                    children: [
                        mapFolder(f.notes || [], f.id, `Notes (${f.name})`, 'notes-folder'),
                        ...(f.rooms || []).map(r => ({
                            id: r.id,
                            name: r.name,
                            type: 'room',
                            children: [mapFolder(r.notes || [], r.id, `Notes (${r.name})`, 'notes-folder')]
                        }))
                    ]
                }))
            ]
        };
        return [root];
    }, [hierarchy, name, point]);

    const groupedDocuments = useMemo(() => {
        const groups = [];
        const seenIds = new Set();
        
        const scan = (nodes) => {
            if (!nodes) return;
            nodes.forEach(n => {
                if (n.type === 'notes-folder' || n.type === 'exterior-folder') {
                    if (!seenIds.has(n.id)) {
                        groups.push({ id: n.id, name: n.name, docs: n.docs || [] });
                        seenIds.add(n.id);
                    }
                }
                if (n.children) scan(n.children);
            });
        };
        scan(treeData);
        return groups;
    }, [treeData]);

    const handleHierarchyChange = (newHierarchy) => {
        setHierarchy(newHierarchy);
        onUpdate({ ...point, hierarchy: newHierarchy, name: name.includes("(Unsaved)") ? name : `(Unsaved) ${name}` });
    };

    const [templateMenuGroupId, setTemplateMenuGroupId] = useState(null);

    const handleCreateChild = (targetParentId, nodeType, template = 'blank') => {
        const id = `node-${Math.random().toString(36).substr(2, 9)}`;
        let initialMarkdown = "";
        let defaultName = "Note";

        if (template === 'inspection') {
            defaultName = "InspectionLog";
            initialMarkdown = getMarkdownTemplate('inspection', 'exterior');
        } else if (template === 'builder') {
            defaultName = "BuildLog";
            initialMarkdown = getMarkdownTemplate('builder', 'foundation');
        } else if (template === 'renovation') {
            defaultName = "RenovationLog";
            initialMarkdown = getMarkdownTemplate('renovation', 'demolition');
        } else if (template === 'creative') {
            defaultName = "CreativeLog";
            initialMarkdown = "# Creative Log\n\n- [ ] Palette Design\n- [ ] Vision Mood\n- [ ] Material Checklist\n";
        }

        const newNode = { 
            id, 
            name: `${defaultName} ${allNotes.length + 1}`, 
            title: `${defaultName} ${allNotes.length + 1}`,
            type: 'note', 
            content: initialMarkdown,
            blocks: [],
            isDirty: true
        };

        const newHierarchy = { ...hierarchy };

        // Handle Root Folders
        if (targetParentId === 'root-notes') {
            newHierarchy.notes = [...(newHierarchy.notes || []), newNode];
        } else if (targetParentId === 'root-exterior') {
            newHierarchy.exterior_notes = [...(newHierarchy.exterior_notes || []), newNode];
        } else {
            // Handle Nested Folders (Floors/Rooms)
            const updateRecursive = (nodes) => {
                return nodes.map(n => {
                    let updated = { ...n };
                    if (n.id === targetParentId) {
                        updated.notes = [...(n.notes || []), newNode];
                        return updated;
                    }
                    if (updated.floors) updated.floors = updateRecursive(updated.floors);
                    if (updated.rooms) updated.rooms = updateRecursive(updated.rooms);
                    return updated;
                });
            };
            if (newHierarchy.floors) newHierarchy.floors = updateRecursive(newHierarchy.floors);
        }

        handleHierarchyChange(newHierarchy);
        setTemplateMenuGroupId(null);
        setSelectedDetailNoteId(id);
    };

    const handleRenameNode = (id, newName) => {
        const updateRecursive = (nodes) => {
            return nodes.map(n => {
                let updated = { ...n };
                if (n.id === id) {
                    updated.name = newName;
                    updated.title = newName;
                }
                if (updated.floors) updated.floors = updateRecursive(updated.floors);
                if (updated.rooms) updated.rooms = updateRecursive(updated.rooms);
                if (updated.notes) updated.notes = updateRecursive(updated.notes);
                if (updated.exterior_notes) updated.exterior_notes = updateRecursive(updated.exterior_notes);
                return updated;
            });
        };

        const newHierarchy = { ...hierarchy };
        if (newHierarchy.notes) newHierarchy.notes = updateRecursive(newHierarchy.notes);
        if (newHierarchy.exterior_notes) newHierarchy.exterior_notes = updateRecursive(newHierarchy.exterior_notes);
        if (newHierarchy.floors) newHierarchy.floors = updateRecursive(newHierarchy.floors);

        handleHierarchyChange(newHierarchy);
    };

    const handleDeleteNode = (id) => {
        const newHierarchy = { 
            ...hierarchy,
            floors: (hierarchy.floors || []).filter(f => f.id !== id).map(f => ({
                ...f,
                rooms: (f.rooms || []).filter(r => r.id !== id).map(r => ({ ...r, notes: (r.notes || []).filter(n => n.id !== id) })),
                notes: (f.notes || []).filter(n => n.id !== id)
            })),
            notes: (hierarchy.notes || []).filter(n => n.id !== id),
            exterior_notes: (hierarchy.exterior_notes || []).filter(n => n.id !== id)
        };
        handleHierarchyChange(newHierarchy);
    };

    const handleUpdateNodeDetails = (id, details) => {
        const newHierarchy = { 
            ...hierarchy,
            floors: (hierarchy.floors || []).map(f => {
                if (f.id === id) return { ...f, ...details };
                return {
                    ...f,
                    rooms: (f.rooms || []).map(r => {
                        if (r.id === id) return { ...r, ...details };
                        return { ...r, notes: (r.notes || []).map(n => n.id === id ? { ...n, ...details } : n) };
                    }),
                    notes: (f.notes || []).map(n => n.id === id ? { ...n, ...details } : n)
                };
            }),
            notes: (hierarchy.notes || []).map(n => n.id === id ? { ...n, ...details } : n),
            exterior_notes: (hierarchy.exterior_notes || []).map(n => n.id === id ? { ...n, ...details } : n)
        };
        handleHierarchyChange(newHierarchy);
    };

    const selectedNodeData = useMemo(() => {
        if (!selectedNodeId) return null;
        if (selectedNodeId === 'root') return { id: 'root', name: name || 'Property', type: 'property', propType: type, dimensions: hierarchy.dimensions };
        
        let found = null;
        const find = (nodes) => {
            if (!nodes) return;
            for (const n of nodes) {
                if (n.id === selectedNodeId) { found = n; return; }
                if (n.rooms) find(n.rooms);
                if (n.notes) find(n.notes);
            }
        };
        find(hierarchy.floors || []);
        find(hierarchy.notes || []);
        find(hierarchy.exterior_notes || []);
        return found;
    }, [selectedNodeId, hierarchy, name, type]);

    const contextValue = useMemo(() => ({
        handleRenameNode,
        handleCreateChild,
        handleDeleteNode,
        setSelectedNodeId,
        hideAllNotes,
        setHideAllNotes
    }), [handleRenameNode, handleCreateChild, handleDeleteNode, setSelectedNodeId, hideAllNotes, setHideAllNotes]);

    const [selectedDetailNoteId, setSelectedDetailNoteId] = useState(null);
    const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
    const selectedDetailNote = useMemo(() => allNotes.find(n => n.id === selectedDetailNoteId), [allNotes, selectedDetailNoteId]);

    const [templateMenuPos, setTemplateMenuPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (templateMenuGroupId && !e.target.closest('.persona-dropdown') && !e.target.closest('.portal-add-btn')) {
                setTemplateMenuGroupId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [templateMenuGroupId]);

    const handleOpenTemplateMenu = (e, groupId) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const menuHeight = 220; // Estimated height of the persona menu
        const spaceBelow = window.innerHeight - rect.bottom;
        
        let top = rect.bottom + 8;
        if (spaceBelow < menuHeight) {
            top = rect.top - menuHeight - 8;
        }

        setTemplateMenuPos({ top, left: rect.left - 180 });
        setTemplateMenuGroupId(templateMenuGroupId === groupId ? null : groupId);
    };

    const handleSelectTemplate = (groupId, template) => {
        // Strip the "group-" prefix and the type-suffix to get the clean business ID
        const cleanId = groupId.replace(/^group-/, "").replace(/-notes-folder$/, "").replace(/-exterior-folder$/, "");
        handleCreateChild(cleanId, 'note', template);
    };

    const [expandedFolders, setExpandedFolders] = useState(new Set());

    useEffect(() => {
        const initialExpanded = new Set();
        groupedDocuments.forEach(g => {
            if (g.docs.length > 0) initialExpanded.add(g.id);
        });
        setExpandedFolders(initialExpanded);
    }, [groupedDocuments.length, point?.id]); // Reset when groups count OR property changes

    const toggleFolder = (id) => {
        const newSet = new Set(expandedFolders);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedFolders(newSet);
    };

    const PersonaMenu = () => {
        if (!templateMenuGroupId) return null;
        return createPortal(
            <div className="persona-dropdown" style={{ top: templateMenuPos.top, left: templateMenuPos.left }}>
                <div className="persona-option" onMouseDown={(e) => { e.stopPropagation(); handleSelectTemplate(templateMenuGroupId, 'inspection'); }}>
                    <span className="persona-icon">🔍</span>
                    <div className="persona-text">
                        <div className="persona-title">Inspection</div>
                        <div className="persona-desc">Findings matrix & report</div>
                    </div>
                </div>
                <div className="persona-option" onMouseDown={(e) => { e.stopPropagation(); handleSelectTemplate(templateMenuGroupId, 'builder'); }}>
                    <span className="persona-icon">🏗️</span>
                    <div className="persona-text">
                        <div className="persona-title">Builder</div>
                        <div className="persona-desc">Costs & material tracks</div>
                    </div>
                </div>
                <div className="persona-option" onMouseDown={(e) => { e.stopPropagation(); handleSelectTemplate(templateMenuGroupId, 'creative'); }}>
                    <span className="persona-icon">🎨</span>
                    <div className="persona-text">
                        <div className="persona-title">Creative</div>
                        <div className="persona-desc">Design specs & vision</div>
                    </div>
                </div>
                <div className="persona-option" onMouseDown={(e) => { e.stopPropagation(); handleSelectTemplate(templateMenuGroupId, 'blank'); }}>
                    <span className="persona-icon">📝</span>
                    <div className="persona-text">
                        <div className="persona-title">Blank</div>
                        <div className="persona-desc">Simple text log</div>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <SidebarContext.Provider value={contextValue}>
            <div className="sidebar-container">
                {hasStagedChanges && (
                    <div className="staged-banner">
                        <div className="pulse-dot"></div>
                        <span>STAGED CHANGES</span>
                    </div>
                )}
                <header className="sidebar-header">
                    <div className="sidebar-header-titles">
                        <h3 className="sidebar-main-title">{type.charAt(0).toUpperCase() + type.slice(1)} Details</h3>
                        <p className="sidebar-subtitle">Editing {name}</p>
                    </div>
                    <div className="sidebar-header-actions">
                        <Button variant="ghost" isIconOnly label="Pin sidebar" onClick={onPinToggle}>
                            {isPinned ? '📍' : '📌'}
                        </Button>
                        <Button variant="ghost" isIconOnly label="Close sidebar" onClick={onClose}>
                             <img src="/icons/delete.svg" className="close-svg" alt="close" />
                        </Button>
                    </div>
                </header>

                <div style={{ padding: '8px 16px 0 16px' }}>
                    <SegmentedControl
                        value={activeTab}
                        onChange={(val) => setActiveTab(val)}
                        label="Sidebar tabs"
                        layout="fill"
                    >
                        <SegmentedControlItem value="general">General</SegmentedControlItem>
                        <SegmentedControlItem value="structure">Details</SegmentedControlItem>
                        <SegmentedControlItem value="editor">Editor</SegmentedControlItem>
                    </SegmentedControl>
                </div>

                <div className="sidebar-form" ref={containerRef}>
                    {activeTab === "general" && (
                        <div className="sidebar-pane" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="sidebar-group">
                                <label className="sidebar-label">Name</label>
                                <input className="sidebar-input" value={name} onChange={(e) => { 
                                    const val = e.target.value;
                                    setName(val);
                                    onUpdate({ ...point, name: `(Unsaved) ${val}` });
                                }} />
                            </div>
                            <div className="sidebar-group">
                                <label className="sidebar-label">Type</label>
                                <select className="sidebar-input sidebar-select" value={type} onChange={(e) => {
                                    const val = e.target.value;
                                    setType(val);
                                    onUpdate({ ...point, type: val, name: `(Unsaved) ${name}` });
                                }}>
                                    <option value="structure">Structure / Dwelling</option>
                                    <option value="valve">Utility / Shut-off Valve</option>
                                    <option value="flora">Tree / Landscape Specimen</option>
                                    <option value="inspection">Work Order / Inspection</option>
                                    <option value="fixture">Outdoor Fixture / HVAC</option>
                                    <option value="callout">Text Callout / Note</option>
                                    <option value="marker">General Marker</option>
                                    <option value="home">Home (Legacy)</option>
                                    <option value="apartment">Apartment (Legacy)</option>
                                    <option value="unit">Unit (Legacy)</option>
                                    <option value="point">Generic Point</option>
                                </select>
                            </div>
                            <div className="sidebar-group">
                                <label className="sidebar-label">Address</label>
                                <input className="sidebar-input" value={location || ""} onChange={(e) => {
                                    const val = e.target.value;
                                    setLocation(val);
                                    onUpdate({ ...point, location: val, name: `(Unsaved) ${name}` });
                                }} placeholder="Enter address..." />
                            </div>
                            <div className="sidebar-group">
                                <label className="sidebar-label">Coordinates</label>
                                <div className="sidebar-coords">
                                    <span>LAT {point.lat != null ? Number(point.lat).toFixed(6) : "—"}</span>
                                    <span>LNG {point.lng != null ? Number(point.lng).toFixed(6) : "—"}</span>
                                </div>
                            </div>

                            {(point.area || point.extra_info?.area) && (
                                <div className="sidebar-group">
                                    <label className="sidebar-label">Calculated Area</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: 'var(--color-background-card)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                            {Number(point.area ?? point.extra_info?.area ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} sq ft
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                            {(Number(point.area ?? point.extra_info?.area ?? 0) / 43560).toFixed(2)} acres
                                        </span>
                                    </div>
                                </div>
                            )}

                            {(point.distance || point.extra_info?.distance || point.perimeter || point.extra_info?.perimeter) && (
                                <div className="sidebar-group">
                                    <label className="sidebar-label">
                                        {point.perimeter || point.extra_info?.perimeter ? "Perimeter / Boundary" : "Linear Distance"}
                                    </label>
                                    <div style={{ padding: '8px 10px', background: 'var(--color-background-card)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                            {Number(point.distance ?? point.extra_info?.distance ?? point.perimeter ?? point.extra_info?.perimeter ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} ft
                                        </span>
                                    </div>
                                </div>
                            )}

                            {(point.type === "structure" || point.type === "home" || point.type === "apartment") && (
                                <div className="sidebar-group" style={{ marginTop: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/render")}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            padding: '10px 14px',
                                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                            color: 'var(--color-on-accent)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; }}
                                    >
                                        <Box size={16} />
                                        <span>Open Interior Floorplan Studio</span>
                                        <ExternalLink size={14} style={{ opacity: 0.8 }} />
                                    </button>
                                </div>
                            )}
                            <div className="sidebar-footer-push"></div>
                            <div className="sidebar-footer-anchor">
                                {!confirmingDelete ? (
                                    <Button variant="destructive" label="Delete Point" size="small" style={{ width: '100%' }} onClick={() => setConfirmingDelete(true)}>Delete Point</Button>
                                ) : (
                                    <div className="delete-confirm">
                                        <span>Confirm Deletion?</span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Button variant="destructive" label="Confirm" size="small" onClick={() => onDelete(point.id)}>Confirm</Button>
                                            <Button variant="ghost" label="Cancel" size="small" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "structure" && (
                        <div className="sidebar-pane flex-pane" style={{ padding: '16px' }}>
                            <div className="tree-scroll-container" style={{ height: `${splitHeight}px` }}>
                                <Tree
                                    ref={treeRef}
                                    data={treeData}
                                    width="100%"
                                    height={splitHeight}
                                    indent={20}
                                    rowHeight={36}
                                    overscanCount={1}
                                >
                                    {NodeRenderer}
                                </Tree>
                            </div>

                            <div className="split-divider" onMouseDown={handleMouseDown}>
                                <div className="divider-handle"></div>
                            </div>

                            <div className="editor-scroll-container">
                                {selectedNodeData && (
                                    <NodeDetailsEditor 
                                        nodeData={selectedNodeData} 
                                        onUpdate={(details) => handleUpdateNodeDetails(selectedNodeId, details)}
                                        onUpdateNode={handleUpdateNodeDetails}
                                        onCreateChild={handleCreateChild}
                                        hierarchy={hierarchy}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "editor" && (
                        <div className="sidebar-pane editor-pane" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {!selectedDetailNoteId ? (
                                <>
                                    <PersonaMenu />
                                    <div className="document-portal">
                                        <label className="sidebar-label">Document Portal</label>
                                        <div className="portal-navigator">
                                            {groupedDocuments.map(group => {
                                                const isOpen = expandedFolders.has(group.id);
                                                return (
                                                    <div key={group.id} className={`portal-group ${isOpen ? 'is-open' : 'is-closed'}`}>
                                                        <div className="portal-group-header" onClick={() => toggleFolder(group.id)}>
                                                            <div className="folder-name">
                                                                <img 
                                                                    src={isOpen ? "/icons/arrow_drop_down.svg" : "/icons/arrow_drop_up.svg"} 
                                                                    alt="toggle"
                                                                    className="portal-toggle-icon"
                                                                />
                                                                <span>{group.name}</span>
                                                            </div>
                                                            <Button variant="ghost" size="small" label="+" className="portal-add-btn" title="New Document" onMouseDown={(e) => handleOpenTemplateMenu(e, group.id)}>+</Button>
                                                        </div>
                                                        {isOpen && (
                                                            <div className="portal-docs">
                                                                 {group.docs.map(doc => (
                                                                    <div 
                                                                        key={doc.id} 
                                                                        className={`portal-doc-item ${selectedDetailNoteId === doc.id ? 'active' : ''}`}
                                                                        onClick={() => setSelectedDetailNoteId(doc.id)}
                                                                    >
                                                                        <img src="/icons/assignment.svg" alt="doc" className="doc-icon" />
                                                                        <span>{doc.title || doc.name}</span>
                                                                        {doc.isDirty && <span className="dirty-dot" title="Unsaved changes">●</span>}
                                                                    </div>
                                                                ))}
                                                                {group.docs.length === 0 && <span className="empty-msg">No documents available</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {groupedDocuments.length === 0 && (
                                                <div className="portal-empty-state">
                                                    <p>Initializing property hierarchy...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                selectedDetailNote && (() => {
                                    const isInspection = (selectedDetailNote.name || "").includes("Inspection");
                                    const isBuild = (selectedDetailNote.name || "").includes("Build");
                                    const isCreative = (selectedDetailNote.name || "").includes("Creative");
                                    const noteColor = isInspection ? "#60a5fa" : isBuild ? "#34d399" : isCreative ? "#a78bfa" : "var(--accent)";

                                    const handleAddBlockInternal = (type) => {
                                        const id = `b-${Math.random().toString(36).substr(2, 9)}`;
                                        let data = "";
                                        if (type === 'inspector_findings') data = [{ label: "General Condition", status: "ok" }];
                                        if (type === 'builder_cost') data = [{ item: "Initial Material", est: 0, act: 0 }];
                                        
                                        const updatedBlocks = [...(selectedDetailNote.blocks || []), { id, type, data }];
                                        handleUpdateNodeDetails(selectedDetailNoteId, { blocks: updatedBlocks });
                                        setUtilityMenuOpen(false);
                                    };

                                    return (
                                        <div className="details-note-view fullscreen-integrated">
                                            <div className="editor-topbar">
                                                <div className="topbar-left">
                                                    <div className="editor-title-container">
                                                        <input
                                                            className="editor-topbar-input sidebar-input"
                                                            value={selectedDetailNote.title || selectedDetailNote.name}
                                                            onChange={(e) => handleRenameNode(selectedDetailNoteId, e.target.value)}
                                                            placeholder="Document Title..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="topbar-right">
                                                    <div className="utility-menu-container">
                                                        <Button
                                                            variant="ghost"
                                                            isIconOnly
                                                            label="Block Tools"
                                                            className="utility-trigger"
                                                            onClick={() => setUtilityMenuOpen(!utilityMenuOpen)}
                                                            title="Block Tools"
                                                        >
                                                            ⋮
                                                        </Button>
                                                        {utilityMenuOpen && (
                                                            <div className="utility-dropdown">
                                                                <div className="utility-opt" onClick={() => handleAddBlockInternal('inspector_findings')}>
                                                                    <span>🔍</span> Findings Context
                                                                </div>
                                                                <div className="utility-opt" onClick={() => handleAddBlockInternal('builder_cost')}>
                                                                    <span>🏗️</span> Cost Track
                                                                </div>
                                                                <div className="utility-opt" onClick={() => handleAddBlockInternal('rich_text')}>
                                                                    <span>✍️</span> Text Block
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button variant="ghost" isIconOnly label="Close Editor" className="exit-editor-btn" onClick={() => setSelectedDetailNoteId(null)} title="Close Editor">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                                        </svg>
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            <div className="editor-scroll-body">
                                                <NoteCanvas 
                                                    noteData={selectedDetailNote} 
                                                    onUpdate={(details) => handleUpdateNodeDetails(selectedDetailNoteId, details)} 
                                                />
                                            </div>
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    )}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
