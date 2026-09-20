import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    MapPin, Layers, Plus, FileText, CheckCircle2, ChevronRight, ChevronLeft,
    ArrowLeft, Compass, Maximize2, Sparkles, Building2, Trees,
    Wrench, ShieldCheck, HelpCircle, Eye, EyeOff, Tag, Search,
    Trash2, Edit3, Globe, Map as MapIcon, Check, AlertTriangle,
    ChevronDown, PenTool, Square, Home, Ruler, Zap, Grid3X3,
    Droplets, Lock, Unlock, Box, X, ExternalLink, Camera, Scissors
} from "lucide-react";

import { thunkGetAllMaps } from "../../redux/maps";
import { thunkGetAllAreas, thunkCreateArea, thunkEditArea, thunkDeleteArea } from "../../redux/areas";
import { thunkGetAllProperties, thunkCreateProperty, thunkEditProperty, thunkDeleteProperty } from "../../redux/properties";
import { thunkGetAllFeatures, thunkCreateFeature, thunkEditFeature, thunkDeleteFeature } from "../../redux/features";
import { thunkGetAllNotes } from "../../redux/notes";
import { handleSearchAddress } from "../../functions/nominatim";
import {
    splitPolygonByLine,
    subdividePolygonGrid,
    insetPolygonCore,
    calculatePolygonMetrics,
    extractPolygonRing,
    clipDividerLineToPolygon,
    applyDividersToPolygon,
    rebuildSectioningForGeometryChange,
    buildSectionsFromRings,
    DEFAULT_SECTION_TYPES,
    SECTION_PALETTE
} from "../../functions/sectionGeometry";

import UnifiedMap from "./UnifiedMap";
import Unified3DCanvas from "./Unified3DCanvas";
import StructureNotesModal from "./StructureNotesModal";
import UnifiedRightDrawer from "./UnifiedRightDrawer";
import AreaSectionModal from "./AreaSectionModal";
import SectionsPanel from "./SectionsPanel";
import "./UnifiedEditor.css";

export default function UnifiedEditor() {
    const { mapId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const mapStore = useSelector(state => state.maps);
    const areaStore = useSelector(state => state.areas);
    const propertyStore = useSelector(state => state.properties);
    const featureStore = useSelector(state => state.features);
    const noteStore = useSelector(state => state.notes);

    // Primary workspace mode: "2d" (2D Site & Boundaries) or "3d" (3D Creation Space)
    const [workspaceMode, setWorkspaceMode] = useState("2d");

    // Left icon menu tab: "boundaries" | "features" (null if collapsed)
    const [sidebarTab, setSidebarTab] = useState("boundaries");

    const [activeAreaId, setActiveAreaId] = useState(null);
    const [selectedItemId, setSelectedItemId] = useState(null); // { type: 'area'|'structure'|'feature', id: ... }
    const [expandedAreas, setExpandedAreas] = useState({});
    const [drawingTool, setDrawingTool] = useState(null);
    const [drawingState, setDrawingState] = useState({ inProgress: false, liveMetrics: "" });
    const [warningToast, setWarningToast] = useState(null);

    // Sectioning State (Render Page-style)
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedDividerId, setSelectedDividerId] = useState(null);
    const [autoColors, setAutoColors] = useState(true);
    const [showSectionLabels, setShowSectionLabels] = useState(true);

    // Map view mode: 2d vs realistic (named matching settings menu)
    const [mapViewMode, setMapViewMode] = useState("realistic");

    // Visibility & label state
    const [hiddenAreas, setHiddenAreas] = useState({});
    const [hiddenLabels, setHiddenLabels] = useState({});
    const [hiddenFeatures, setHiddenFeatures] = useState({});

    // Address Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);

    // Modals and Drawers
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [isStructureNotesOpen, setIsStructureNotesOpen] = useState(false);
    const [activeModalItem, setActiveModalItem] = useState(null); // { type: 'area' | 'structure' | 'feature', data: item }
    const [rightSidebarMode, setRightSidebarMode] = useState(null); // null | 'view' | 'notes'
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
    const [pendingAreaGeom, setPendingAreaGeom] = useState(null);
    const [editingArea, setEditingArea] = useState(null);

    const handleOpenItemModal = (type, item) => {
        setActiveModalItem({ type, data: item });
    };

    const handleCloseItemModal = () => {
        setActiveModalItem(null);
        setIsStructureNotesOpen(false);
    };

    const mapRef = useRef(null);

    // Initial load
    useEffect(() => {
        if (!mapId) {
            navigate("/dashboard");
            return;
        }
        dispatch(thunkGetAllMaps());
        dispatch(thunkGetAllAreas(mapId));
        dispatch(thunkGetAllProperties(mapId));
        dispatch(thunkGetAllFeatures(mapId));
        dispatch(thunkGetAllNotes(mapId));
    }, [mapId, dispatch, navigate]);

    // Outside click for address search
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchResults([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced Address Search
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(() => {
            setIsSearching(true);
            handleSearchAddress(searchQuery)
                .then(res => {
                    setSearchResults(res || []);
                })
                .catch(() => {
                    setSearchResults([]);
                })
                .finally(() => {
                    setIsSearching(false);
                });
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Active area resolution
    const areas = areaStore.data || [];
    const structures = propertyStore.data || [];
    const features = featureStore.data || [];
    const notes = noteStore.data || [];

    const hasInitializedActiveArea = useRef(false);

    useEffect(() => {
        // Automatically select first area on initial load if not yet initialized
        if (!hasInitializedActiveArea.current && areas.length > 0) {
            setActiveAreaId(areas[0].id);
            hasInitializedActiveArea.current = true;
        }
    }, [areas]);

    const activeArea = useMemo(() => {
        if (!activeAreaId) return null;
        return areas.find(a => Number(a.id) === Number(activeAreaId)) || null;
    }, [areas, activeAreaId]);

    // Area selection and camera focus
    const handleSelectArea = (area, shouldFly = true) => {
        if (!area) {
            handleDeselectArea();
            return;
        }
        if (activeAreaId !== area.id) {
            setSelectedSectionId(null);
            setSelectedDividerId(null);
        }
        setActiveAreaId(area.id);
        setSelectedItemId({ type: "area", id: area.id });
        if (shouldFly) {
            setWorkspaceMode("2d");
            mapRef.current?.flyToArea?.(area, {
                isDrawerOpen: Boolean(rightSidebarMode),
                isSidebarOpen: Boolean(sidebarTab)
            });
        }
    };

    // Deselect active area explicitly
    const handleDeselectArea = () => {
        setActiveAreaId(null);
        setSelectedItemId(null);
        setSelectedSectionId(null);
        setSelectedDividerId(null);
    };

    const currentMap = useMemo(() => {
        return mapStore.data?.find(m => Number(m.id) === Number(mapId)) || { name: `Project Map #${mapId}` };
    }, [mapStore.data, mapId]);

    // Toast warning helper
    const triggerWarning = (msg) => {
        setWarningToast(msg);
        setTimeout(() => setWarningToast(null), 3500);
    };

    // Address selection (pans 2D boundary map directly to site)
    const handleSelectAddress = (res) => {
        if (res.lng !== undefined && res.lat !== undefined) {
            setWorkspaceMode("2d");
            mapRef.current?.flyTo([res.lng, res.lat], 17);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    // Quick add 3D building mass inside active area
    const handleAddStructureMass = async () => {
        if (!activeArea) {
            triggerWarning("Please select or section an active Area first.");
            return;
        }
        const coords = activeArea.coordinates?.[0] || activeArea.coordinates;
        let lat = 32.9075, lng = -83.5055;
        if (coords && coords.length > 0) {
            const sumLng = coords.reduce((sum, p) => sum + p[0], 0);
            const sumLat = coords.reduce((sum, p) => sum + p[1], 0);
            lng = sumLng / coords.length;
            lat = sumLat / coords.length;
        }
        const payload = {
            map_id: Number(mapId),
            area_id: activeArea.id,
            name: `Building Mass #${structures.length + 1}`,
            type: "structure",
            lat,
            lng
        };
        await dispatch(thunkCreateProperty(payload));
    };

    // Toggle expand/collapse of an Area in the tree
    const toggleAreaExpand = (areaId) => {
        setExpandedAreas(prev => ({
            ...prev,
            [areaId]: prev[areaId] === undefined ? false : !prev[areaId]
        }));
    };

    // Toggles for Area visibility and centroid label
    const toggleAreaVisibility = (e, areaId) => {
        e.stopPropagation();
        setHiddenAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
    };

    const toggleAreaLabel = (e, areaId) => {
        e.stopPropagation();
        setHiddenLabels(prev => ({ ...prev, [areaId]: !prev[areaId] }));
    };

    const toggleFeatureVisibility = (e, featureId) => {
        e.stopPropagation();
        setHiddenFeatures(prev => ({ ...prev, [featureId]: !prev[featureId] }));
    };

    // Area Handlers
    const handleStartAreaSection = (mode) => {
        setDrawingTool({
            mode,
            areaType: "lot"
        });
    };

    const handleAreaComplete = (geomData) => {
        setPendingAreaGeom(geomData);
        setEditingArea(null);
        setIsAreaModalOpen(true);
        setDrawingTool(null);
    };

    const handleSaveAreaModal = async (areaDetails) => {
        if (editingArea) {
            await dispatch(thunkEditArea(editingArea.id, {
                name: areaDetails.name,
                type: areaDetails.type,
                color: areaDetails.color
            }));
            setEditingArea(null);
            return;
        }

        if (!pendingAreaGeom) return;
        const newAreaPayload = {
            map_id: Number(mapId),
            name: areaDetails.name,
            type: areaDetails.type,
            color: areaDetails.color,
            coordinates: pendingAreaGeom.coordinates,
            width: pendingAreaGeom.width,
            length: pendingAreaGeom.length,
            area_sqft: pendingAreaGeom.area_sqft,
            area_acres: pendingAreaGeom.area_acres
        };

        const res = await dispatch(thunkCreateArea(newAreaPayload));
        if (res?.data?.area) {
            setActiveAreaId(res.data.area.id);
        }
        setPendingAreaGeom(null);
    };

    const handleDeleteArea = async (e, areaId) => {
        e.stopPropagation();
        if (window.confirm("Delete this area and all its attached features and structures?")) {
            await dispatch(thunkDeleteArea(areaId));
            if (activeAreaId === areaId) {
                const remaining = areas.filter(a => a.id !== areaId);
                setActiveAreaId(remaining.length > 0 ? remaining[0].id : null);
            }
        }
    };

    // Feature Handlers
    const handleStartFeature = (toolConfig) => {
        if (!activeArea) {
            triggerWarning("Please section or select an active Area first before adding features.");
            return;
        }
        setDrawingTool(toolConfig);
    };

    const handleFeatureComplete = async (featData) => {
        const payload = {
            map_id: Number(mapId),
            area_id: activeArea ? activeArea.id : null,
            type: featData.type,
            name: featData.name,
            geometry: featData.geometry,
            properties_data: featData.properties_data || {}
        };
        const res = await dispatch(thunkCreateFeature(payload));
        setDrawingTool(null);
        if (res?.data?.feature) {
            handleSelectFeature(res.data.feature, false);
        } else if (!res?.success) {
            triggerWarning("Could not save feature. Please try again.");
        }
    };

    const handleFeatureUpdate = async (featureId, updateData) => {
        // Geometry edits must also re-anchor that feature's sections/dividers.
        if (updateData?.geometry) {
            return handleFeatureGeometryUpdate(featureId, updateData);
        }
        await dispatch(thunkEditFeature(featureId, updateData));
    };

    const handleDeleteFeature = async (e, featureId) => {
        e.stopPropagation();
        if (window.confirm("Delete this feature?")) {
            await dispatch(thunkDeleteFeature(featureId));
        }
    };

    // Structure Handlers
    const handleStartStructure = () => {
        if (!activeArea) {
            triggerWarning("Please section or select an active Area first before placing structures.");
            return;
        }
        setDrawingTool({
            mode: "structure_polygon",
            name: "Main Residence",
            color: "#4f46e5",
            icon: "🏠"
        });
    };

    const handleStructureComplete = async (structData) => {
        const payload = {
            map_id: Number(mapId),
            area_id: activeArea ? activeArea.id : null,
            name: structData.name || "Main Residence",
            type: "structure",
            lat: structData.lat,
            lng: structData.lng,
            hierarchy: structData.coordinates ? { coordinates: structData.coordinates } : undefined
        };
        const res = await dispatch(thunkCreateProperty(payload));
        setDrawingTool(null);
        if (res?.data?.property) {
            handleSelectStructure(res.data.property, false, false);
        } else if (!res?.success) {
            triggerWarning("Could not save structure. Please try again.");
        }
    };

    const handleStructureUpdate = async (structureId, updateData) => {
        await dispatch(thunkEditProperty(structureId, updateData));
    };

    const handleDeleteStructure = async (e, structureId) => {
        e.stopPropagation();
        if (window.confirm("Delete this structure?")) {
            await dispatch(thunkDeleteProperty(structureId));
        }
    };

    // Structure click (focus map and open modal if requested)
    const handleSelectStructure = (structure, openModal = false, shouldFly = true) => {
        setSelectedStructure(structure);
        setSelectedItemId({ type: "structure", id: structure.id });
        if (openModal) {
            handleOpenItemModal("structure", structure);
        }
        if (shouldFly && structure.lat && structure.lng) {
            setWorkspaceMode("2d");
            mapRef.current?.flyToStructure?.(structure, {
                isDrawerOpen: Boolean(rightSidebarMode),
                isSidebarOpen: Boolean(sidebarTab)
            });
        }
    };

    // Feature click (focus map)
    const handleSelectFeature = (feat, shouldFly = true) => {
        if (!feat) return;
        if (selectedItemId?.id !== feat.id || selectedItemId?.type !== "feature") {
            setSelectedSectionId(null);
            setSelectedDividerId(null);
        }
        setSelectedItemId({ type: "feature", id: feat.id });
        if (shouldFly) {
            setWorkspaceMode("2d");
            mapRef.current?.flyToFeature?.(feat, {
                isDrawerOpen: Boolean(rightSidebarMode),
                isSidebarOpen: Boolean(sidebarTab)
            });
        }
    };

    // Keep selectedStructure up to date with Redux structures
    const currentSelectedStructure = useMemo(() => {
        if (!selectedStructure) return null;
        return structures.find(s => Number(s.id) === Number(selectedStructure.id)) || selectedStructure;
    }, [structures, selectedStructure]);

    // Selected item for bottom inspector
    const inspectedItem = useMemo(() => {
        if (!selectedItemId) {
            return activeArea ? { type: "area", data: activeArea } : null;
        }
        if (selectedItemId.type === "structure") {
            const s = structures.find(st => Number(st.id) === Number(selectedItemId.id));
            return s ? { type: "structure", data: s } : null;
        }
        if (selectedItemId.type === "feature") {
            const f = features.find(ft => Number(ft.id) === Number(selectedItemId.id));
            return f ? { type: "feature", data: f } : null;
        }
        if (selectedItemId.type === "area") {
            const a = areas.find(ar => Number(ar.id) === Number(selectedItemId.id));
            return a ? { type: "area", data: a } : null;
        }
        return activeArea ? { type: "area", data: activeArea } : null;
    }, [selectedItemId, activeArea, structures, features, areas]);

    const [inspectorName, setInspectorName] = useState("");
    useEffect(() => {
        if (inspectedItem?.data?.name) {
            setInspectorName(inspectedItem.data.name);
        } else {
            setInspectorName("");
        }
    }, [inspectedItem?.data?.id, inspectedItem?.data?.name]);

    const handleSaveInspectorName = () => {
        if (!inspectedItem || !inspectorName.trim()) return;
        const trimmed = inspectorName.trim();
        if (trimmed === inspectedItem.data.name) return;

        if (inspectedItem.type === "structure") {
            handleStructureUpdate(inspectedItem.data.id, { name: trimmed });
        } else if (inspectedItem.type === "area") {
            dispatch(thunkEditArea(inspectedItem.data.id, { name: trimmed }));
        } else if (inspectedItem.type === "feature") {
            handleFeatureUpdate(inspectedItem.data.id, { name: trimmed });
        }
    };

    const handleUpdateItemIcon = (emoji) => {
        if (!inspectedItem) return;
        if (inspectedItem.type === "structure") {
            handleStructureUpdate(inspectedItem.data.id, { icon: emoji });
        } else if (inspectedItem.type === "feature") {
            handleFeatureUpdate(inspectedItem.data.id, { icon: emoji });
        }
    };

    // -------------------------------------------------------------
    // SECTIONS LOGIC (Render Page-style Sectioning)
    // "You must either have a Boundary or a Feature selected to section it"
    // -------------------------------------------------------------
    const activeSectionTarget = useMemo(() => {
        if (selectedItemId?.type === "area") {
            const a = areas.find(ar => Number(ar.id) === Number(selectedItemId.id));
            if (a) return { type: "area", item: a };
        }
        if (selectedItemId?.type === "feature") {
            const f = features.find(ft => Number(ft.id) === Number(selectedItemId.id));
            if (f) return { type: "feature", item: f };
        }
        if (activeArea) {
            return { type: "area", item: activeArea };
        }
        return null;
    }, [selectedItemId, activeArea, areas, features]);

    // Reads the divider/section arrays off a target regardless of area vs feature.
    const readSectionData = (target) => {
        const item = target?.item;
        if (!item) return { dividers: [], sections: [] };
        const bag = target.type === "area" ? item.extra_info : item.properties_data;
        return {
            dividers: bag?.dividers || [],
            sections: bag?.sections || []
        };
    };

    const readTargetRing = (target) => {
        const item = target?.item;
        if (!item) return null;
        const raw = target.type === "area" ? item.coordinates : item.geometry?.coordinates;
        return extractPolygonRing(raw);
    };

    // Persists dividers + sections back onto the owning area or feature.
    const persistSectionData = async (target, dividers, sections) => {
        const item = target?.item;
        if (!item) return;
        const bag = target.type === "area" ? (item.extra_info || {}) : (item.properties_data || {});
        const payload = { ...bag, dividers, sections };
        if (target.type === "area") {
            await dispatch(thunkEditArea(item.id, { extra_info: payload }));
        } else {
            await dispatch(thunkEditFeature(item.id, { properties_data: payload }));
        }
    };

    // Recomputes sections from the current dividers against the current boundary.
    // Returns the new section list so callers can persist it alongside dividers.
    const recomputeSections = (target, dividers) => {
        const baseRing = readTargetRing(target);
        if (!baseRing) return [];
        const { sections: existingSections } = readSectionData(target);
        if (!dividers || dividers.length === 0) return [];
        const rings = applyDividersToPolygon(baseRing, dividers);
        return buildSectionsFromRings(rings, existingSections, autoColors);
    };

    // When a boundary/feature is moved or reshaped, its sections and dividers are
    // stored as absolute coordinates clipped to the OLD outline, so they detach.
    // Re-anchor dividers to the new ring and rebuild sections from them, so the
    // sectioning survives the edit instead of breaking.
    //
    // Translating the whole shape moves dividers with it (keeping relative
    // placement); reshaping re-clips dividers to the new perimeter.
    const rebuildSectionsForGeometryChange = (target, oldRing, newRing) => {
        const { dividers, sections } = readSectionData(target);
        return rebuildSectioningForGeometryChange({
            dividers,
            sections,
            oldRing,
            newRing,
            autoColors
        });
    };

    // Wraps an area geometry update so sections/dividers are adjusted in the same
    // request rather than left stale.
    const handleAreaUpdate = async (id, data) => {
        const area = areas.find(a => Number(a.id) === Number(id));
        let payload = data;

        if (area && data?.coordinates) {
            const oldRing = extractPolygonRing(area.coordinates);
            const newRing = extractPolygonRing(data.coordinates);
            if (oldRing && newRing) {
                const rebuilt = rebuildSectionsForGeometryChange({ type: "area", item: area }, oldRing, newRing);
                if (rebuilt) {
                    payload = {
                        ...data,
                        extra_info: {
                            ...(area.extra_info || {}),
                            dividers: rebuilt.dividers,
                            sections: rebuilt.sections
                        }
                    };
                }
            }
        }

        await dispatch(thunkEditArea(id, payload));
    };

    // Feature equivalent of handleAreaUpdate.
    const handleFeatureGeometryUpdate = async (featureId, updateData) => {
        const feature = features.find(f => Number(f.id) === Number(featureId));
        let payload = updateData;

        const newCoords = updateData?.geometry?.coordinates;
        if (feature && newCoords) {
            const oldRing = extractPolygonRing(feature.geometry?.coordinates);
            const newRing = extractPolygonRing(newCoords);
            if (oldRing && newRing) {
                const rebuilt = rebuildSectionsForGeometryChange({ type: "feature", item: feature }, oldRing, newRing);
                if (rebuilt) {
                    payload = {
                        ...updateData,
                        properties_data: {
                            ...(feature.properties_data || {}),
                            dividers: rebuilt.dividers,
                            sections: rebuilt.sections
                        }
                    };
                }
            }
        }

        await dispatch(thunkEditFeature(featureId, payload));
    };

    const handleStartSectionDivider = () => {
        if (!activeSectionTarget) return;
        setWorkspaceMode("2d");
        setSelectedSectionId(null);
        setSelectedDividerId(null);
        setDrawingTool({ mode: "section_divider", target: activeSectionTarget });
    };

    const handleCompleteSectionDivider = async (linePts, target) => {
        setDrawingTool(null);
        const curTarget = target || activeSectionTarget;
        if (!curTarget?.item || !linePts || linePts.length < 2) {
            return;
        }

        const baseRing = readTargetRing(curTarget);
        if (!baseRing || baseRing.length < 3) {
            return;
        }

        // Clip divider line endpoints to the polygon boundary edges
        const clipped = clipDividerLineToPolygon(baseRing, linePts);

        const { dividers: existingDividers } = readSectionData(curTarget);

        const newDiv = {
            id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: `Divider ${existingDividers.length + 1}`,
            coordinates: clipped,
            color: "#8b5cf6"
        };

        const updatedDividers = [...existingDividers, newDiv];
        const newSections = recomputeSections(curTarget, updatedDividers);

        await persistSectionData(curTarget, updatedDividers, newSections);

        setSelectedDividerId(newDiv.id);
        setSelectedSectionId(null);
        setDrawingTool(null);
    };

    const handleMoveDivider = async (dividerId, newCoordinates, target) => {
        const curTarget = target || activeSectionTarget;
        if (!curTarget?.item || !dividerId || !newCoordinates) return;
        const baseRing = readTargetRing(curTarget);
        if (!baseRing) return;

        const { dividers: existingDividers } = readSectionData(curTarget);
        const clipped = clipDividerLineToPolygon(baseRing, newCoordinates);

        const updatedDividers = existingDividers.map(d =>
            d.id === dividerId ? { ...d, coordinates: clipped } : d
        );

        const newSections = recomputeSections(curTarget, updatedDividers);
        await persistSectionData(curTarget, updatedDividers, newSections);
    };

    // Merges the sections separated by ONE divider line: removes just that line
    // and rejoins the sections on either side. Only when it was the last divider
    // does the parcel collapse back to a single undivided boundary.
    //
    // Sections are derived from the divider set here (applyDividersToPolygon), so
    // merging a line and recomputing is the single-line equivalent of the Render
    // Page's "Merge" tool; Merge All remains the explicit clear-everything action.
    const handleMergeDivider = async (dividerId, target) => {
        const curTarget = target || activeSectionTarget;
        if (!curTarget?.item || !dividerId) return;
        const baseRing = readTargetRing(curTarget);
        if (!baseRing) return;

        const { dividers: existingDividers } = readSectionData(curTarget);
        const updatedDividers = existingDividers.filter(d => d.id !== dividerId);
        const newSections = recomputeSections(curTarget, updatedDividers);

        await persistSectionData(curTarget, updatedDividers, newSections);

        if (selectedDividerId === dividerId) setSelectedDividerId(null);
    };

    // Removes a divider line outright. In this derived-sections model the geometry
    // result matches a merge; the actions are kept separate so the UI can present
    // "merge this line" and "delete this line" as distinct intents.
    const handleDeleteDivider = async (dividerId, target) => {
        await handleMergeDivider(dividerId, target);
    };

    const handleSubdivideSections = async (mode, target) => {
        if (!target?.item) return;
        const baseRing = readTargetRing(target);
        if (!baseRing || baseRing.length < 3) return;

        // Bounding box for generating real divider lines
        const lngs = baseRing.map(p => p[0]);
        const lats = baseRing.map(p => p[1]);
        const minX = Math.min(...lngs), maxX = Math.max(...lngs);
        const minY = Math.min(...lats), maxY = Math.max(...lats);
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        const { dividers: existingDividers } = readSectionData(target);

        const newLines = [];
        if (mode === "grid_2h") {
            newLines.push(clipDividerLineToPolygon(baseRing, [[minX, midY], [maxX, midY]]));
        } else if (mode === "grid_2v") {
            newLines.push(clipDividerLineToPolygon(baseRing, [[midX, minY], [midX, maxY]]));
        } else if (mode === "grid_4") {
            newLines.push(
                clipDividerLineToPolygon(baseRing, [[minX, midY], [maxX, midY]]),
                clipDividerLineToPolygon(baseRing, [[midX, minY], [midX, maxY]])
            );
        } else if (mode === "grid_9") {
            const dy = (maxY - minY) / 3;
            const dx = (maxX - minX) / 3;
            newLines.push(
                clipDividerLineToPolygon(baseRing, [[minX, minY + dy], [maxX, minY + dy]]),
                clipDividerLineToPolygon(baseRing, [[minX, minY + 2 * dy], [maxX, minY + 2 * dy]]),
                clipDividerLineToPolygon(baseRing, [[minX + dx, minY], [minX + dx, maxY]]),
                clipDividerLineToPolygon(baseRing, [[minX + 2 * dx, minY], [minX + 2 * dx, maxY]])
            );
        }

        const newDividers = newLines.map((pts, i) => ({
            id: `div-${Date.now()}-${existingDividers.length + i}-${Math.random().toString(36).substr(2, 4)}`,
            name: `Divider ${existingDividers.length + i + 1}`,
            coordinates: pts,
            color: "#8b5cf6"
        }));

        const updatedDividers = [...existingDividers, ...newDividers];
        const newSections = recomputeSections(target, updatedDividers);

        await persistSectionData(target, updatedDividers, newSections);

        if (newDividers.length > 0) {
            setSelectedDividerId(newDividers[0].id);
        }
        setSelectedSectionId(null);
    };

    const handleInsetCoreSections = async (setbackMeters, target) => {
        if (!target?.item) return;
        const targetItem = target.item;
        const rawCoords = target.type === "area" ? targetItem.coordinates : targetItem.geometry?.coordinates;
        const ring = extractPolygonRing(rawCoords);
        if (!ring || ring.length < 3) return;

        const res = insetPolygonCore(ring, setbackMeters);
        if (res?.core) {
            const coreMetrics = calculatePolygonMetrics(res.core);
            const setbackMetrics = res.setback ? calculatePolygonMetrics(res.setback) : null;

            const newSections = [
                {
                    id: `sec-${Date.now()}-core`,
                    name: "Building Core / Interior",
                    type: "residential",
                    color: "#6366f1",
                    coordinates: [res.core],
                    area_sqft: coreMetrics.areaSqFt,
                    area_acres: coreMetrics.areaAcres
                }
            ];

            if (res.setback && setbackMetrics) {
                newSections.push({
                    id: `sec-${Date.now()}-setback`,
                    name: "Perimeter Setback Zone",
                    type: "yard",
                    color: "#10b981",
                    coordinates: [res.setback],
                    area_sqft: setbackMetrics.areaSqFt,
                    area_acres: setbackMetrics.areaAcres
                });
            }

            if (target.type === "area") {
                await dispatch(thunkEditArea(targetItem.id, {
                    extra_info: {
                        ...(targetItem.extra_info || {}),
                        sections: newSections
                    }
                }));
            } else if (target.type === "feature") {
                await dispatch(thunkEditFeature(targetItem.id, {
                    properties_data: {
                        ...(targetItem.properties_data || {}),
                        sections: newSections
                    }
                }));
            }
        }
    };

    const handleMergeAllSections = async (target) => {
        if (!target?.item) return;
        const targetItem = target.item;
        if (target.type === "area") {
            await dispatch(thunkEditArea(targetItem.id, {
                extra_info: {
                    ...(targetItem.extra_info || {}),
                    dividers: [],
                    sections: []
                }
            }));
        } else if (target.type === "feature") {
            await dispatch(thunkEditFeature(targetItem.id, {
                properties_data: {
                    ...(targetItem.properties_data || {}),
                    dividers: [],
                    sections: []
                }
            }));
        }
        setSelectedSectionId(null);
        setSelectedDividerId(null);
    };

    const handleUpdateSection = async (target, sectionId, updates) => {
        if (!target?.item || !sectionId) return;
        const targetItem = target.item;
        const curSections = target.type === "area"
            ? (targetItem.extra_info?.sections || [])
            : (targetItem.properties_data?.sections || []);

        const updatedSections = curSections.map(s => s.id === sectionId ? { ...s, ...updates } : s);

        if (target.type === "area") {
            await dispatch(thunkEditArea(targetItem.id, {
                extra_info: {
                    ...(targetItem.extra_info || {}),
                    sections: updatedSections
                }
            }));
        } else if (target.type === "feature") {
            await dispatch(thunkEditFeature(targetItem.id, {
                properties_data: {
                    ...(targetItem.properties_data || {}),
                    sections: updatedSections
                }
            }));
        }
    };

    const handleDeleteSection = async (target, sectionId) => {
        if (!target?.item || !sectionId) return;
        const targetItem = target.item;
        const curSections = target.type === "area"
            ? (targetItem.extra_info?.sections || [])
            : (targetItem.properties_data?.sections || []);

        const updatedSections = curSections.filter(s => s.id !== sectionId);

        if (target.type === "area") {
            await dispatch(thunkEditArea(targetItem.id, {
                extra_info: {
                    ...(targetItem.extra_info || {}),
                    sections: updatedSections
                }
            }));
        } else if (target.type === "feature") {
            await dispatch(thunkEditFeature(targetItem.id, {
                properties_data: {
                    ...(targetItem.properties_data || {}),
                    sections: updatedSections
                }
            }));
        }
        if (selectedSectionId === sectionId) setSelectedSectionId(null);
    };

    return (
        <div className="unified-editor-container">
            {/* Top Navigation Bar */}
            <header className="unified-header">
                <div className="unified-header-left">
                    <button
                        className="unified-back-btn"
                        onClick={() => navigate("/dashboard")}
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={16} />
                        Dashboard
                    </button>
                    <span className="unified-badge">PROJECT MAP #{mapId}</span>
                    <h1 className="unified-title">
                        {currentMap.name}
                    </h1>
                </div>

                {/* Center: Primary Workspace Switcher (2D Boundaries vs 3D Creation Space) */}
                <div className="unified-workspace-toggle">
                    <button
                        className={`unified-workspace-btn ${workspaceMode === "2d" ? "active" : ""}`}
                        onClick={() => {
                            setWorkspaceMode("2d");
                            setDrawingTool(null);
                        }}
                        title="2D Site Planning, Boundary Sectioning, and Outfitting"
                    >
                        <PenTool size={14} />
                        2D Site & Boundaries
                    </button>
                    <button
                        className={`unified-workspace-btn ${workspaceMode === "3d" ? "active" : ""}`}
                        onClick={() => {
                            setWorkspaceMode("3d");
                            setDrawingTool(null);
                        }}
                        title="3D Creation Space - Outlines only & Immediate extrudable structures with blank surroundings"
                    >
                        <Box size={14} />
                        3D Creation Space
                    </button>
                </div>

                <div className="unified-header-right">
                    {/* Switch to Classic Editor */}
                    <button
                        className="unified-header-btn"
                        onClick={() => navigate(`/editor/${mapId}`)}
                        title="Switch to Classic 2D Plotter"
                    >
                        <Compass size={14} />
                        Classic Editor
                    </button>

                    {/* View (Boundary & Layer Hierarchy) Toggle Button */}
                    <button
                        className={`unified-header-btn ${rightSidebarMode === "view" ? "active" : ""}`}
                        onClick={() => setRightSidebarMode(prev => prev === "view" ? null : "view")}
                        title="Toggle Boundary & Layer Hierarchy"
                    >
                        <Eye size={14} />
                        View ({areas.length})
                    </button>

                    {/* Map Notes & Log Toggle Button */}
                    <button
                        className={`unified-header-btn primary ${rightSidebarMode === "notes" ? "active" : ""}`}
                        onClick={() => setRightSidebarMode(prev => prev === "notes" ? null : "notes")}
                        title="Toggle Project Notes & Log"
                    >
                        <FileText size={14} />
                        Map Notes ({notes.length})
                    </button>
                </div>
            </header>

            {/* Main Content Layout */}
            <div className="unified-body">
                {/* UNIFIED SIDEBAR - 2D site workspace only; the 3D studio owns the full width */}
                {workspaceMode === "2d" && (
                <aside className="unified-sidebar">
                    {/* 1. LEFT ICON MENU STRIP */}
                    <ul className="unified-icon-strip">
                        <li
                            className={`unified-icon-tab ${sidebarTab === "boundaries" ? "active" : ""}`}
                            onClick={() => setSidebarTab(prev => prev === "boundaries" ? null : "boundaries")}
                            title="Boundaries"
                        >
                            <Layers size={20} />
                            <span className="unified-icon-tab-label">Boundaries</span>
                        </li>
                        <li
                            className={`unified-icon-tab ${sidebarTab === "features" ? "active" : ""}`}
                            onClick={() => setSidebarTab(prev => prev === "features" ? null : "features")}
                            title="Features"
                        >
                            <Building2 size={20} />
                            <span className="unified-icon-tab-label">Features</span>
                        </li>
                        <li
                            className={`unified-icon-tab ${sidebarTab === "sections" ? "active" : ""}`}
                            onClick={() => setSidebarTab(prev => prev === "sections" ? null : "sections")}
                            title="Sections"
                        >
                            <Scissors size={20} />
                            <span className="unified-icon-tab-label">Sections</span>
                        </li>

                        <div style={{ flexGrow: 1 }} />

                        <li
                            className="unified-icon-tab collapse-btn"
                            onClick={() => setSidebarTab(prev => prev ? null : "boundaries")}
                            title={sidebarTab ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {sidebarTab ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </li>
                    </ul>

                    {/* 2. ACTIVE SIDEBAR PANEL */}
                    {sidebarTab && (
                        <div className="unified-sidebar-panel">
                            {/* TAB 1: BOUNDARIES */}
                            {sidebarTab === "boundaries" && (
                                <>
                                    <div className="unified-panel-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Layers size={15} color="#3b82f6" />
                                            <h2 className="unified-panel-title">Boundaries</h2>
                                        </div>
                                        <span className="unified-step-badge ready">
                                            {areas.length} {areas.length === 1 ? 'Boundary' : 'Boundaries'}
                                        </span>
                                    </div>

                                    {/* SECTION 1: 1. DRAW BOUNDARIES (ONLY 2 TYPES OF BOUNDARIES FOR NOW) */}
                                    <div className="unified-sidebar-section">
                                        <div className="unified-step-header">
                                            <span className="unified-step-title">
                                                <PenTool size={12} color="#3b82f6" />
                                                1. Draw Boundaries
                                            </span>
                                        </div>

                                        <div className="unified-tool-grid">
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.mode === "area_polygon" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartAreaSection("area_polygon");
                                                }}
                                                title="Draw freehand boundary polygon"
                                            >
                                                <PenTool size={13} color="#3b82f6" />
                                                <span>Freehand Poly</span>
                                            </button>
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.mode === "area_rect" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartAreaSection("area_rect");
                                                }}
                                                title="Draw rectangular lot box"
                                            >
                                                <Square size={13} color="#60a5fa" />
                                                <span>Lot Box (Rect)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* SECTION 2: 2. BOUNDARIES (NAMES AND ACTIVE SELECTION) */}
                                    <div className="unified-sidebar-section">
                                        <div className="unified-step-header">
                                            <span className="unified-step-title">
                                                <Layers size={12} color="#3b82f6" />
                                                2. Boundaries
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {activeArea && (
                                                    <button
                                                        onClick={handleDeselectArea}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#94a3b8',
                                                            fontSize: '10px',
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline',
                                                            padding: 0
                                                        }}
                                                        title="Deselect active boundary"
                                                    >
                                                        Deselect
                                                    </button>
                                                )}
                                                <span className="unified-step-badge ready">
                                                    {areas.length} {areas.length === 1 ? 'Boundary' : 'Boundaries'}
                                                </span>
                                            </div>
                                        </div>

                                        {areas.length === 0 ? (
                                            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '6px 2px' }}>
                                                No boundaries yet. Draw one using the tools above.
                                            </div>
                                        ) : (
                                            <div className="unified-boundaries-list">
                                                {areas.map(area => {
                                                    const isActive = activeArea && Number(activeArea.id) === Number(area.id);
                                                    return (
                                                        <div
                                                            key={area.id}
                                                            className={`unified-boundary-select-item ${isActive ? "active" : ""}`}
                                                            onClick={() => isActive ? handleDeselectArea() : handleSelectArea(area, true)}
                                                            title={isActive ? "Active boundary (Click to deselect)" : "Click to select and make active"}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                                <span
                                                                    style={{
                                                                        width: '8px',
                                                                        height: '8px',
                                                                        borderRadius: '50%',
                                                                        backgroundColor: area.color || '#3b82f6',
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                                <span className="unified-boundary-name">{area.name}</span>
                                                            </div>
                                                            {isActive ? (
                                                                <span className="unified-boundary-active-badge">
                                                                    <Check size={11} /> Active
                                                                </span>
                                                            ) : (
                                                                <span className="unified-boundary-select-hint">Select</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* TAB 2: FEATURES */}
                            {sidebarTab === "features" && (
                                <>
                                    <div className="unified-panel-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Building2 size={15} color="#10b981" />
                                            <h2 className="unified-panel-title">Features</h2>
                                        </div>
                                        <span className={`unified-step-badge ${activeArea ? "ready" : "locked"}`}>
                                            {activeArea ? "Active Parcel" : "Locked"}
                                        </span>
                                    </div>

                                    {/* ACTIVE BOUNDARY STATUS / LOCK */}
                                    <div className="unified-sidebar-section">
                                        <div className="unified-step-header">
                                            <span className="unified-step-title">
                                                {activeArea ? <Unlock size={12} color="#10b981" /> : <Lock size={12} color="#f87171" />}
                                                Active Boundary
                                            </span>
                                            {activeArea && (
                                                <button
                                                    onClick={handleDeselectArea}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#94a3b8',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline',
                                                        padding: 0
                                                    }}
                                                    title="Deselect active boundary"
                                                >
                                                    Deselect
                                                </button>
                                            )}
                                        </div>

                                        {activeArea ? (
                                            <div
                                                className="unified-active-parcel-card"
                                                onClick={() => handleSelectArea(activeArea, true)}
                                                style={{ cursor: 'pointer' }}
                                                title="Click to zoom & frame boundary on map"
                                            >
                                                <div className="unified-active-parcel-info">
                                                    <span
                                                        style={{
                                                            width: '9px',
                                                            height: '9px',
                                                            borderRadius: '50%',
                                                            backgroundColor: activeArea.color || '#3b82f6',
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                            {activeArea.name}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                            {activeArea.area_sqft ? `${Math.round(activeArea.area_sqft).toLocaleString()} sq ft • Active Parcel` : "Active Parcel"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="unified-locked-banner">
                                                <Lock size={14} color="#f87171" style={{ flexShrink: 0 }} />
                                                <span>Select an active boundary in the Boundaries menu to place features.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* FEATURE OUTFITTING TOOLS */}
                                    <div className="unified-sidebar-section">
                                        <div className="unified-step-header">
                                            <span className="unified-step-title">
                                                <Sparkles size={12} color="#8b5cf6" />
                                                Add Features
                                            </span>
                                            <span className={`unified-step-badge ${activeArea ? "ready" : "locked"}`}>
                                                {activeArea ? "Ready" : "Disabled"}
                                            </span>
                                        </div>

                                        <div className="unified-tool-grid">
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.mode === "structure_polygon" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartStructure();
                                                }}
                                                disabled={!activeArea}
                                                title={activeArea ? "Draw structure perimeter line-by-line" : "Select an Area first"}
                                            >
                                                <Home size={13} color="#4f46e5" />
                                                <span>Structure</span>
                                            </button>
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.type === "footprint" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartFeature({ mode: "feature_polygon", type: "footprint", name: "Footprint Outline", color: "#3b82f6", icon: "📐" });
                                                }}
                                                disabled={!activeArea}
                                                title={activeArea ? "Draw foundation footprint line-by-line" : "Select an Area first"}
                                            >
                                                <Layers size={13} color="#3b82f6" />
                                                <span>Footprint</span>
                                            </button>
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.type === "setback" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartFeature({ mode: "feature_line", type: "setback", name: "Setback Guide", color: "#f59e0b", icon: "📏" });
                                                }}
                                                disabled={!activeArea}
                                                title={activeArea ? "Draw setback guide line" : "Select an Area first"}
                                            >
                                                <Ruler size={13} color="#f59e0b" />
                                                <span>Setback</span>
                                            </button>
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.type === "utility" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartFeature({ mode: "feature_line", type: "utility", name: "Utility Line", color: "#0284c7", icon: "⚡" });
                                                }}
                                                disabled={!activeArea}
                                                title={activeArea ? "Draw utility line" : "Select an Area first"}
                                            >
                                                <Zap size={13} color="#0284c7" />
                                                <span>Utility</span>
                                            </button>
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.type === "material" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartFeature({ mode: "feature_polygon", type: "material", name: "Material Space", color: "#8b5cf6", icon: "🧱" });
                                                }}
                                                disabled={!activeArea}
                                                title={activeArea ? "Draw material space line-by-line" : "Select an Area first"}
                                            >
                                                <Grid3X3 size={13} color="#8b5cf6" />
                                                <span>Material</span>
                                            </button>
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.type === "flora" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartFeature({ mode: "feature_polygon", type: "flora", name: "Landscape Trees", color: "#10b981", icon: "🌲" });
                                                }}
                                                disabled={!activeArea}
                                                title={activeArea ? "Draw landscape tree perimeter line-by-line" : "Select an Area first"}
                                            >
                                                <Trees size={13} color="#10b981" />
                                                <span>Tree</span>
                                            </button>
                                            <button
                                                className={`unified-cad-tool ${drawingTool?.type === "valve" ? "active" : ""}`}
                                                onClick={() => {
                                                    setWorkspaceMode("2d");
                                                    handleStartFeature({ mode: "feature_polygon", type: "valve", name: "Shut-off Valve", color: "#06b6d4", icon: "🚰" });
                                                }}
                                                disabled={!activeArea}
                                                title={activeArea ? "Draw shut-off valve perimeter line-by-line" : "Select an Area first"}
                                            >
                                                <Droplets size={13} color="#06b6d4" />
                                                <span>Valve</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* TAB 3: SECTIONS (Render Page-style Sectioning) */}
                            {sidebarTab === "sections" && (
                                <SectionsPanel
                                    target={activeSectionTarget}
                                    areas={areas}
                                    features={features}
                                    onSelectTarget={(type, item) => {
                                        if (type === "area") handleSelectArea(item, true);
                                        else handleSelectFeature(item, true);
                                    }}
                                    onDeselectTarget={() => {
                                        handleDeselectArea();
                                        setSelectedItemId(null);
                                    }}
                                    drawingTool={drawingTool}
                                    onStartDivider={handleStartSectionDivider}
                                    onSubdivide={(mode) => handleSubdivideSections(mode, activeSectionTarget)}
                                    onInsetCore={(dist) => handleInsetCoreSections(dist, activeSectionTarget)}
                                    onMergeAll={() => handleMergeAllSections(activeSectionTarget)}
                                    onUpdateSection={(secId, updates) => handleUpdateSection(activeSectionTarget, secId, updates)}
                                    onDeleteSection={(secId) => handleDeleteSection(activeSectionTarget, secId)}
                                    selectedSectionId={selectedSectionId}
                                    onSelectSection={(secId) => {
                                        setSelectedSectionId(secId);
                                        setSelectedDividerId(null);
                                    }}
                                    selectedDividerId={selectedDividerId}
                                    onSelectDivider={(divId) => {
                                        setSelectedDividerId(divId);
                                        setSelectedSectionId(null);
                                    }}
                                    onMergeDivider={(divId) => handleMergeDivider(divId, activeSectionTarget)}
                                    autoColors={autoColors}
                                    onToggleAutoColors={() => setAutoColors(prev => !prev)}
                                    showLabels={showSectionLabels}
                                    onToggleShowLabels={() => setShowSectionLabels(prev => !prev)}
                                />
                            )}

                            {/* BOTTOM INSPECTOR CARD (if an item is inspected) */}
                            {inspectedItem && (
                                <div className="unified-inspector">
                                    <div className="unified-inspector-header">
                                        <span>
                                            {inspectedItem.type === "area" ? "📐 Area Properties" : inspectedItem.type === "structure" ? "🏠 Structure Details" : "⚡ Feature Details"}
                                        </span>
                                        {inspectedItem.type === "structure" && (
                                            <button
                                                onClick={() => navigate(`/render/${inspectedItem.data.id}`)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: '#6366f1',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Layers size={11} /> 3D Studio
                                            </button>
                                        )}
                                    </div>

                                    {/* Editable Name Field */}
                                    <div className="unified-inspector-row">
                                        <span className="label">Name</span>
                                        <div className="unified-inspector-name-edit">
                                            <input
                                                type="text"
                                                className="unified-inspector-input"
                                                value={inspectorName}
                                                onChange={(e) => setInspectorName(e.target.value)}
                                                onBlur={handleSaveInspectorName}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveInspectorName();
                                                }}
                                                placeholder="Enter name..."
                                            />
                                            <button
                                                type="button"
                                                className="unified-inspector-save-btn"
                                                onClick={handleSaveInspectorName}
                                                title="Save name"
                                            >
                                                <Check size={11} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Icon / Symbol Selection for Structures and Features */}
                                    {(inspectedItem.type === "structure" || inspectedItem.type === "feature") && (
                                        <div className="unified-inspector-row unified-inspector-icon-row">
                                            <span className="label">Icon / Symbol</span>
                                            <div className="unified-inspector-icon-picker">
                                                <div className="unified-inspector-current-icon" title="Current icon">
                                                    {inspectedItem.data.icon || (inspectedItem.type === "structure" ? "🏠" : "⚡")}
                                                </div>
                                                <div className="unified-inspector-palette">
                                                    {(inspectedItem.type === "structure"
                                                        ? ["🏠", "🏢", "🚗", "🛖", "🏊", "🏡", "🏭", "⛺", "📦", "🚜"]
                                                        : ["⚡", "🧱", "🌲", "🌳", "🌿", "🚰", "💡", "🔥", "🪵", "📐"]
                                                    ).map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            className={`unified-icon-btn ${inspectedItem.data.icon === emoji ? "active" : ""}`}
                                                            onClick={() => handleUpdateItemIcon(emoji)}
                                                            title={`Set icon to ${emoji}`}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {inspectedItem.type === "area" && (
                                        <>
                                            <div className="unified-inspector-row">
                                                <span className="label">Dimensions</span>
                                                <span>{inspectedItem.data.width ? `${inspectedItem.data.width} ft × ${inspectedItem.data.length} ft` : "Freeform"}</span>
                                            </div>
                                            <div className="unified-inspector-row">
                                                <span className="label">Area</span>
                                                <span>{inspectedItem.data.area_sqft ? `${Math.round(inspectedItem.data.area_sqft).toLocaleString()} sq ft (${inspectedItem.data.area_acres} ac)` : "--"}</span>
                                            </div>
                                            <div className="unified-inspector-row">
                                                <span className="label">Zone Type</span>
                                                <span style={{ textTransform: 'capitalize' }}>{inspectedItem.data.type || "Lot"}</span>
                                            </div>
                                            <div className="unified-inspector-row">
                                                <span className="label">Boundary Details</span>
                                                <button
                                                    type="button"
                                                    className="unified-inspector-action-btn"
                                                    onClick={() => handleOpenItemModal("area", inspectedItem.data)}
                                                    title="Edit boundary color, styling, and notes"
                                                >
                                                    <FileText size={11} /> Edit & Notes
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {inspectedItem.type === "structure" && (
                                        <>
                                            <div className="unified-inspector-row">
                                                <span className="label">Coordinates</span>
                                                <span>{inspectedItem.data.lat?.toFixed(5)}, {inspectedItem.data.lng?.toFixed(5)}</span>
                                            </div>
                                            <div className="unified-inspector-row">
                                                <span className="label">Photos & Notes</span>
                                                <button
                                                    type="button"
                                                    className="unified-inspector-action-btn"
                                                    onClick={() => handleOpenItemModal("structure", inspectedItem.data)}
                                                    title="Manage notes, work orders, photos, and studio"
                                                >
                                                    <Camera size={11} /> Edit & Notes
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {inspectedItem.type === "feature" && (
                                        <>
                                            <div className="unified-inspector-row">
                                                <span className="label">Type</span>
                                                <span style={{ textTransform: 'capitalize' }}>{inspectedItem.data.type}</span>
                                            </div>
                                            <div className="unified-inspector-row">
                                                <span className="label">Feature Details</span>
                                                <button
                                                    type="button"
                                                    className="unified-inspector-action-btn"
                                                    onClick={() => handleOpenItemModal("feature", inspectedItem.data)}
                                                    title="Manage feature properties, icon, and notes"
                                                >
                                                    <FileText size={11} /> Edit & Notes
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </aside>
                )}

                {/* Main Canvas Area: 2D Site & Boundary Plan OR 3D Creation Space */}
                <main className="unified-map-container">
                    {/* Floating Bar for 2D Sites and Boundaries (Search + Imagery View Toggle) */}
                    {workspaceMode === "2d" && (
                        <div className="unified-floating-bar">
                            <div className="unified-floating-search" ref={searchRef}>
                                <Search size={14} color="#94a3b8" className="unified-floating-search-icon" />
                                <input
                                    type="text"
                                    className="unified-floating-search-input"
                                    placeholder="Search site address, parcel, or coordinates..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        className="unified-floating-search-clear"
                                        onClick={() => setSearchQuery("")}
                                        title="Clear search"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                                {searchResults.length > 0 && (
                                    <div className="unified-floating-search-dropdown">
                                        {searchResults.map((res, i) => (
                                            <div
                                                key={i}
                                                className="unified-floating-search-item"
                                                onClick={() => handleSelectAddress(res)}
                                            >
                                                📍 {res.text || res.name || res.address}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="unified-floating-divider" />

                            <div className="unified-floating-view-toggle">
                                <button
                                    className={`unified-floating-view-btn ${mapViewMode === "2d" ? "active" : ""}`}
                                    onClick={() => setMapViewMode("2d")}
                                    title="Street Map (2D) - Clean flat top-down vector view"
                                >
                                    <MapIcon size={12} />
                                    <span>Street (2D)</span>
                                </button>
                                <button
                                    className={`unified-floating-view-btn ${mapViewMode === "realistic" ? "active" : ""}`}
                                    onClick={() => setMapViewMode("realistic")}
                                    title="Satellite (3D) - Aerial imagery with perspective"
                                >
                                    <Globe size={12} />
                                    <span>Satellite (3D)</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {workspaceMode === "2d" ? (
                        <>
                            {/* Drawing / Edit Guidance Banner */}
                            {drawingTool && (
                                <div className="unified-drawing-banner">
                                    <span>
                                        ✏️ <strong>{drawingTool.name || drawingTool.mode}:</strong>{" "}
                                        {drawingState.inProgress ? (
                                            drawingState.liveMetrics || "Click points on map. Double-click or click start point to complete."
                                        ) : (
                                            "Click points inside active area to draw perimeter. Double-click or click start point to close."
                                        )}
                                    </span>
                                    {drawingState.inProgress && (
                                        <button
                                            className="finish"
                                            onClick={() => mapRef.current?.finishDrawing?.()}
                                        >
                                            Finish
                                        </button>
                                    )}
                                    <button
                                        className="cancel"
                                        onClick={() => {
                                            mapRef.current?.cancelDrawing?.();
                                            setDrawingTool(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Boundary Constraint Toast Warning */}
                            {warningToast && (
                                <div className="unified-warning-toast">
                                    <AlertTriangle size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                    {warningToast}
                                </div>
                            )}

                            <UnifiedMap
                                ref={mapRef}
                                areas={areas}
                                activeArea={activeArea}
                                features={features}
                                structures={structures}
                                selectedItemId={selectedItemId}
                                hiddenAreas={hiddenAreas}
                                hiddenLabels={hiddenLabels}
                                hiddenFeatures={hiddenFeatures}
                                mapViewMode={mapViewMode}
                                drawingTool={drawingTool}
                                onAreaComplete={handleAreaComplete}
                                onAreaUpdate={handleAreaUpdate}
                                onEditArea={(area) => {
                                    setEditingArea(area);
                                    setPendingAreaGeom(area);
                                    setIsAreaModalOpen(true);
                                }}
                                onFeatureComplete={handleFeatureComplete}
                                onFeatureUpdate={handleFeatureUpdate}
                                onStructureComplete={handleStructureComplete}
                                onStructureUpdate={handleStructureUpdate}
                                onSelectArea={(area) => handleSelectArea(area, false)}
                                onSelectStructure={(struct, openModal = false) => handleSelectStructure(struct, openModal, false)}
                                onSelectFeature={(feat) => handleSelectFeature(feat, false)}
                                onOpenItemModal={handleOpenItemModal}
                                onDrawingChange={setDrawingState}
                                onOutsideAreaWarning={triggerWarning}
                                onSectionDividerComplete={handleCompleteSectionDivider}
                                selectedSectionId={selectedSectionId}
                                onSelectSection={(secId) => {
                                    setSelectedSectionId(secId);
                                    setSelectedDividerId(null);
                                }}
                                selectedDividerId={selectedDividerId}
                                onSelectDivider={(divId) => {
                                    setSelectedDividerId(divId);
                                    setSelectedSectionId(null);
                                }}
                                onMoveDivider={(divId, newCoords) => handleMoveDivider(divId, newCoords, activeSectionTarget)}
                                onDeleteDivider={(divId) => handleDeleteDivider(divId, activeSectionTarget)}
                                showSectionLabels={showSectionLabels}
                            />
                        </>
                    ) : (
                        <Unified3DCanvas
                            activeArea={activeArea}
                            areas={areas}
                            structures={structures}
                            features={features}
                            selectedSectionId={selectedSectionId}
                            onSelectArea={(area) => handleSelectArea(area, false)}
                            onNavigateStudio={(structId) => navigate(`/render/${structId}`)}
                            onAddStructureMass={handleAddStructureMass}
                            onUpdateArea={handleAreaUpdate}
                        />
                    )}
                </main>
            </div>

            {/* Universal Item Edit Menu, Quick Notes & 3D Studio Modal */}
            <StructureNotesModal
                isOpen={Boolean(activeModalItem) || isStructureNotesOpen}
                onClose={handleCloseItemModal}
                item={activeModalItem ? activeModalItem.data : (currentSelectedStructure || selectedStructure)}
                itemType={activeModalItem ? activeModalItem.type : "structure"}
                structure={currentSelectedStructure || selectedStructure}
                areaName={
                    activeModalItem?.type === 'area'
                        ? activeModalItem.data.name
                        : activeModalItem?.type === 'structure'
                            ? (areas.find(a => Number(a.id) === Number(activeModalItem.data.area_id))?.name || activeArea?.name || "Unassigned")
                            : activeArea?.name || "Unassigned"
                }
                notes={notes}
                mapId={mapId}
                onUpdateStructure={handleStructureUpdate}
                onUpdateArea={handleAreaUpdate}
                onUpdateFeature={handleFeatureUpdate}
                onNavigateStudio={(structId) => navigate(`/render/${structId}`)}
            />

            {/* Reusable Right Drawer for Boundary Hierarchy ("view") and Project Notes ("notes") */}
            <UnifiedRightDrawer
                mode={rightSidebarMode}
                onClose={() => setRightSidebarMode(null)}
                onSwitchMode={setRightSidebarMode}
                areas={areas}
                activeArea={activeArea}
                structures={structures}
                features={features}
                notes={notes}
                mapId={mapId}
                expandedAreas={expandedAreas}
                toggleAreaExpand={toggleAreaExpand}
                hiddenAreas={hiddenAreas}
                toggleAreaVisibility={toggleAreaVisibility}
                hiddenLabels={hiddenLabels}
                toggleAreaLabel={toggleAreaLabel}
                hiddenFeatures={hiddenFeatures}
                toggleFeatureVisibility={toggleFeatureVisibility}
                selectedItemId={selectedItemId}
                selectedSectionId={selectedSectionId}
                onSelectArea={(area) => handleSelectArea(area, true)}
                onDeselectArea={handleDeselectArea}
                onSelectStructure={(struct, openModal = false) => handleSelectStructure(struct, openModal, true)}
                onSelectFeature={(feat) => handleSelectFeature(feat, true)}
                onSelectSection={(secId) => {
                    setSelectedSectionId(secId);
                    setSidebarTab("sections");
                }}
                onSelectItem={setSelectedItemId}
                onOpenItemModal={handleOpenItemModal}
                onEditArea={(area) => {
                    setEditingArea(area);
                    setPendingAreaGeom(area);
                    setIsAreaModalOpen(true);
                }}
                onDeleteArea={handleDeleteArea}
                onDeleteStructure={handleDeleteStructure}
                onDeleteFeature={handleDeleteFeature}
                onNavigateStudio={(structId) => navigate(`/render/${structId}`)}
            />

            {/* Area Customization Modal */}
            <AreaSectionModal
                isOpen={isAreaModalOpen}
                onClose={() => {
                    setIsAreaModalOpen(false);
                    setPendingAreaGeom(null);
                    setEditingArea(null);
                }}
                onSave={handleSaveAreaModal}
                initialData={editingArea || pendingAreaGeom}
            />
        </div>
    );
}
