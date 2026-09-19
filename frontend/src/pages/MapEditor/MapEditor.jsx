import { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { thunkGetPoints } from "../../redux/points";
import { thunkGetAllProperties } from "../../redux/properties";
import { thunkGetAllMaps, thunkCreateMap, thunkUpdateMap, thunkDeleteMap } from "../../redux/maps";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Search as SearchIcon, Plus, Edit2 } from "lucide-react";
import { handleSearchAddress } from "../../functions/nominatim";
import MapComponent from "../../components/MapPageComponents/Map";
import FloatingToolbar from "./FloatingToolbar/FloatingToolbar";
import Sidebar from "./Sidebar";
import useCanvasStaging from "../../hooks/useMapStaging";
import { useModal } from "../../context/Modal";
import MapForm from "../../components/Forms/MapForm/MapForm";
import ScreenSizeOverlay from "../../components/ScreenSizeOverlay/ScreenSizeOverlay";

export default function MapEditor() {
    const { mapId } = useParams();
    const { state } = useLocation();
    const propertyStore = useSelector(store => store.properties);
    const pointStore = useSelector(state => state.points);
    const mapStore = useSelector(state => state.maps);
    const savedTypesStore = useSelector(state => state.savedTypes);
    const settings = useSelector(state => state.settings);
    const overlaysStore = useSelector(state => state.overlays);
    const dispatch = useDispatch();
    const { setModalContent } = useModal();

    const {
        canvasObjects,
        deletedProperties,
        deletedPoints,
        hasUnsavedChanges,
        history, historyIndex,
        loaded,
        saving,
        handleSaveAll,
        addCanvasObjects,
        deleteCanvasObjects,
        getMetadata,
        undo, redo,
    } = useCanvasStaging(propertyStore, pointStore, dispatch, false, mapId, overlaysStore);

    const [lngLat, setLngLat] = useState([-83.5, 32.9]);
    const [canvasSelect, setCanvasSelect] = useState({ icon: null, name: null, type: null });
    const [drawingState, setDrawingState] = useState({ inProgress: false, points: [], liveMetrics: "" });
    const mapComponentRef = useRef(null);

    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef(null);

    const contextMenuRef = useRef(null);

    const [menu, setMenu] = useState("map");
    const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, type: null, data: null });

    const navigate = useNavigate();

    useEffect(() => {
        if (!mapId) {
            navigate("/dashboard");
        } else {
            dispatch(thunkGetAllMaps());
        }
    }, [mapId, navigate, dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
            if (contextMenu.isOpen && contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
                setContextMenu(prev => ({ ...prev, isOpen: false }));
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setSearchResults([]);
        if (!search) return;

        if (search.length > 2) {
            const searchDelay = setTimeout(() => {
                handleSearchAddress(search)
                    .then(data => setSearchResults(data))
                    .catch(err => console.error("Address search failed:", err));
            }, 500);

            return () => {
                clearTimeout(searchDelay);
            };
        }
    }, [search]);

    const mapProperties = useMemo(() => {
        return Object.values(canvasObjects)
            .filter(p => ["home", "apartment", "unit", "structure"].includes(p.type))
            .map(p => ({ ...p, type: p.type || "structure" }));
    }, [canvasObjects]);

    const mapPoints = useMemo(() => {
        return Object.values(canvasObjects)
            .filter(p => !["home", "apartment", "unit", "structure"].includes(p.type));
    }, [canvasObjects]);

    const memoMarkers = useMemo(() => {
        const allMarkers = [];

        Object.values(canvasObjects).forEach(p => {
            const isBaseMap = Number(p.map_id) === Number(mapId);
            const isVisibleOverlay = (overlaysStore.visibleMapIds || []).includes(Number(p.map_id));
            if (!isBaseMap && !isVisibleOverlay) return;

            allMarkers.push({ 
                ...p, 
                lngLat: p.lngLat || [p.lng, p.lat],
                source: p.source || 'db',
                isOverlay: !isBaseMap,
                overlayMapId: !isBaseMap ? p.map_id : undefined
            });
        });

        return allMarkers;
    }, [canvasObjects, overlaysStore.visibleMapIds, mapId]);

    const handlePointSelect = (point) => {
        if (!point) return;
        if (point.lngLat) {
            setLngLat([...point.lngLat]);
        } else if (point.lng !== undefined && point.lat !== undefined) {
            setLngLat([point.lng, point.lat]);
        }
    };

    const selectMenu = (e, val) => {
        e.preventDefault();
        setMenu(prev => prev === val ? "" : val);
    };

    const selectCanvasAddon = (icon, name, type = "icon", extra = {}) => {
        if (canvasSelect.type === type && (!name || canvasSelect.name === name)) {
            setCanvasSelect({ icon: null, name: null, type: null });
            return;
        }
        setCanvasSelect({ icon, name, type, ...extra });
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            minWidth: '768px',
            minHeight: '500px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--color-background-body)',
            color: 'var(--color-text-primary)'
        }}>
            {!loaded ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>Loading Map...</span>
                </div>
            ) : (
                <div id="editor" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: '768px', minHeight: '500px', overflow: 'hidden' }}>
                    <header style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 12px',
                        height: '56px',
                        backgroundColor: 'var(--color-background-card)',
                        borderBottom: '1px solid var(--color-border)',
                        zIndex: 50,
                        flexShrink: 0,
                        boxSizing: 'border-box',
                        width: '100%',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <Button label="Home" variant="ghost" size="small" onClick={() => navigate("/")} />
                            <Button
                                label={saving ? "Saving..." : "Save All"}
                                variant="primary"
                                size="small"
                                onClick={handleSaveAll}
                                isDisabled={!hasUnsavedChanges || saving}
                                isLoading={saving}
                            />
                            <Button
                                label="✨ Unified Editor (v2)"
                                variant="secondary"
                                size="small"
                                onClick={() => navigate(`/unified-editor/${mapId}`)}
                            />
                        </div>

                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 4px', minWidth: '120px', maxWidth: '380px' }}>
                            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }} ref={searchRef}>
                                <TextInput
                                    label="Search"
                                    isLabelHidden
                                    value={search}
                                    onChange={(val) => {
                                        const str = typeof val === "string" ? val : val?.target?.value ?? "";
                                        setSearch(str);
                                        setShowSearchResults(true);
                                    }}
                                    placeholder="Find addresses or points..."
                                    width="100%"
                                    onFocus={() => setShowSearchResults(true)}
                                />
                                {showSearchResults && search.length > 0 && search.length <= 2 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 4px)',
                                        left: 0,
                                        width: '100%',
                                        backgroundColor: 'var(--color-background-card)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                        zIndex: 100,
                                        padding: '12px',
                                        fontSize: '13px'
                                    }}>
                                        <p style={{ margin: 0, opacity: 0.7 }}>Type 3+ characters to search...</p>
                                    </div>
                                )}
                                {showSearchResults && search.length > 2 && searchResults.length === 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 4px)',
                                        left: 0,
                                        width: '100%',
                                        backgroundColor: 'var(--color-background-card)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                        zIndex: 100,
                                        padding: '12px',
                                        fontSize: '13px'
                                    }}>
                                        <p style={{ margin: 0, opacity: 0.7 }}>No results found.</p>
                                    </div>
                                )}
                                {showSearchResults && searchResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 4px)',
                                        left: 0,
                                        width: '100%',
                                        backgroundColor: 'var(--color-background-card)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                        maxHeight: '260px',
                                        overflowY: 'auto',
                                        zIndex: 100,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '4px'
                                    }}>
                                        {searchResults.map((res, i) => (
                                             <div
                                                key={i}
                                                style={{
                                                    padding: '8px 12px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    borderBottom: '1px solid var(--color-border)'
                                                }}
                                                onClick={() => {
                                                    setLngLat([res.lng, res.lat]);
                                                    setSearch("");
                                                    setShowSearchResults(false);
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    setContextMenu({
                                                        isOpen: true,
                                                        x: e.clientX,
                                                        y: e.clientY,
                                                        type: 'search',
                                                        data: res
                                                    });
                                                }}
                                                title="Right-click for options"
                                            >
                                                {res.text || res.address || res.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <Button
                                label="Undo"
                                variant="ghost"
                                size="small"
                                onClick={undo}
                                isDisabled={historyIndex <= 0}
                            />
                            <Button
                                label="Redo"
                                variant="ghost"
                                size="small"
                                onClick={redo}
                                isDisabled={historyIndex >= history.length - 1}
                            />
                        </div>
                    </header>

                    <section style={{
                        display: 'flex',
                        flex: 1,
                        height: 'calc(100vh - 56px)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <Sidebar
                            menu={menu}
                            selectMenu={selectMenu}
                            canvasSelect={canvasSelect}
                            selectCanvasAddon={selectCanvasAddon}
                            setCanvasSelect={setCanvasSelect}
                            mapProperties={mapProperties}
                            mapPoints={mapPoints}
                            handlePointSelect={handlePointSelect}
                            deleteCanvasObjects={deleteCanvasObjects}
                            mapStore={mapStore}
                            mapId={mapId}
                            savedTypesStore={savedTypesStore}
                            navigate={navigate}
                            overlaysStore={overlaysStore}
                        />

                        <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
                            <FloatingToolbar
                                canvasSelect={canvasSelect}
                                setCanvasSelect={setCanvasSelect}
                                drawingState={drawingState}
                                finishDrawing={() => mapComponentRef.current?.finishDrawing?.()}
                                cancelDrawing={() => mapComponentRef.current?.cancelDrawing?.()}
                            />
                            <MapComponent
                                ref={mapComponentRef}
                                layer={settings.map_layer}
                                lngLat={lngLat}
                                markers={memoMarkers}
                                canvasTool={canvasSelect}
                                createdCanvasObject={addCanvasObjects}
                                deletedCanvasObject={deleteCanvasObjects}
                                getMetadata={getMetadata}
                                onSelect={handlePointSelect}
                                onDrawingStateChange={setDrawingState}
                            />
                        </div>

                        {contextMenu.isOpen && (
                            <div 
                                ref={contextMenuRef}
                                style={{
                                    position: 'fixed',
                                    top: contextMenu.y,
                                    left: contextMenu.x,
                                    zIndex: 1000,
                                    width: '192px',
                                    backgroundColor: 'var(--color-background-card)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                    padding: '4px',
                                    fontSize: '13px'
                                }}
                            >
                                {contextMenu.type === 'search' && (
                                    <>
                                        <div 
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                            onClick={() => {
                                                setLngLat([contextMenu.data.lng, contextMenu.data.lat]);
                                                setSearch(""); setShowSearchResults(false);
                                                setContextMenu({ ...contextMenu, isOpen: false });
                                            }}
                                        >
                                            Go to Location
                                        </div>
                                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
                                        <div 
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                            onClick={() => {
                                                const id = `temp-structure-${Date.now()}`;
                                                const name = contextMenu.data.name || contextMenu.data.address || contextMenu.data.city || "Main Residence";
                                                addCanvasObjects({ id, name, lng: Number(contextMenu.data.lng), lat: Number(contextMenu.data.lat), lngLat: [Number(contextMenu.data.lng), Number(contextMenu.data.lat)], type: 'structure', source: "canvas" });
                                                setLngLat([contextMenu.data.lng, contextMenu.data.lat]);
                                                setSearch(""); setShowSearchResults(false);
                                                setContextMenu({ ...contextMenu, isOpen: false });
                                            }}
                                        >
                                            Place Structure
                                        </div>
                                        <div 
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                            onClick={() => {
                                                const id = `temp-valve-${Date.now()}`;
                                                const name = "Water Shut-off";
                                                addCanvasObjects({ id, name, lng: Number(contextMenu.data.lng), lat: Number(contextMenu.data.lat), lngLat: [Number(contextMenu.data.lng), Number(contextMenu.data.lat)], type: 'valve', source: "canvas" });
                                                setLngLat([contextMenu.data.lng, contextMenu.data.lat]);
                                                setSearch(""); setShowSearchResults(false);
                                                setContextMenu({ ...contextMenu, isOpen: false });
                                            }}
                                        >
                                            Place Utility Valve
                                        </div>
                                        <div 
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                            onClick={() => {
                                                const id = `temp-inspection-${Date.now()}`;
                                                const name = "Maintenance Item";
                                                addCanvasObjects({ id, name, lng: Number(contextMenu.data.lng), lat: Number(contextMenu.data.lat), lngLat: [Number(contextMenu.data.lng), Number(contextMenu.data.lat)], type: 'inspection', source: "canvas" });
                                                setLngLat([contextMenu.data.lng, contextMenu.data.lat]);
                                                setSearch(""); setShowSearchResults(false);
                                                setContextMenu({ ...contextMenu, isOpen: false });
                                            }}
                                        >
                                            Place Work Order / Issue
                                        </div>
                                        <div 
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                            onClick={() => {
                                                const id = `temp-point-${Date.now()}`;
                                                const name = contextMenu.data.name || contextMenu.data.address || contextMenu.data.city || "Marker";
                                                addCanvasObjects({ id, name, lng: Number(contextMenu.data.lng), lat: Number(contextMenu.data.lat), lngLat: [Number(contextMenu.data.lng), Number(contextMenu.data.lat)], type: 'point', source: "canvas" });
                                                setLngLat([contextMenu.data.lng, contextMenu.data.lat]);
                                                setSearch(""); setShowSearchResults(false);
                                                setContextMenu({ ...contextMenu, isOpen: false });
                                            }}
                                        >
                                            Place General Marker
                                        </div>
                                    </>
                                )}
                                {contextMenu.type === 'map' && (
                                    <div 
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                        onClick={() => {
                                            setContextMenu({ ...contextMenu, isOpen: false });
                                            setModalContent(<MapForm mapId={contextMenu.data.id} initialData={contextMenu.data} />);
                                        }}
                                    >
                                        <Edit2 size={16} /> Edit Map Info
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            )}
            <ScreenSizeOverlay minWidth={768} minHeight={500} />
        </div>
    );
}
