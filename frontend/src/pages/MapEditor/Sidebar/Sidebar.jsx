import DataTab from "./DataTab/DataTab";
import DrawTab from "./Draw/Draw";
import SettingsPanel from "./Settings/SettingsPanel";
import LayersTab from "./LayersTab/LayersTab";
import { Layers, Eye, Paintbrush, Map, Download, Settings } from "lucide-react";
import "./Sidebar.css";

const RAIL_ITEMS = [
    { id: "draw", label: "Draw Tools", icon: Paintbrush },
    { id: "map", label: "Map Data", icon: Map },
    { id: "layers", label: "Map Layers", icon: Layers },
    { id: "exports", label: "Export Data", icon: Download },
];

export default function Sidebar({
    menu, selectMenu,
    canvasSelect, selectCanvasAddon, setCanvasSelect,
    mapProperties, mapPoints, handlePointSelect, deleteCanvasObjects,
    addCanvasObjects, mapStore, mapId,
    savedTypesStore, navigate, overlaysStore
}) {
    return (
        <aside className="map-sidebar">
            <ul className="map-sidebar-rail">
                {RAIL_ITEMS.map(({ id, label, icon: Icon }) => (
                    <li
                        key={id}
                        id={`menu-${id}`}
                        className={`map-sidebar-item${menu === id ? " is-active" : ""}`}
                        onClick={(e) => selectMenu(e, id)}
                        title={label}
                    >
                        <Icon size={24} strokeWidth={1.5} />
                    </li>
                ))}

                <li
                    id="menu-render"
                    className="map-sidebar-item"
                    onClick={() => navigate("/render")}
                    title="3D Render"
                >
                    <Eye size={24} strokeWidth={1.5} />
                </li>

                <div className="map-sidebar-rail-spacer" />

                <li
                    id="menu-settings"
                    className={`map-sidebar-item${menu === "settings" ? " is-active" : ""}`}
                    onClick={(e) => selectMenu(e, "settings")}
                    title="Settings"
                >
                    <Settings size={24} strokeWidth={1.5} />
                </li>
            </ul>

            {/* The active panel for the selected menu */}
            {menu && (
                <div id="menu-tools" className="map-sidebar-panel">
                {menu === "map" && (
                    <DataTab
                        mapProperties={mapProperties}
                        mapPoints={mapPoints}
                        handlePointSelect={handlePointSelect}
                        deleteCanvasObjects={deleteCanvasObjects}
                        addCanvasObjects={addCanvasObjects}
                        mapStore={mapStore}
                        mapId={mapId}
                        overlaysStore={overlaysStore}
                    />
                )}

                {menu === "layers" && (
                    <LayersTab />
                )}

                {menu === "draw" && (
                    <DrawTab
                        canvasSelect={canvasSelect}
                        savedTypesStore={savedTypesStore}
                        selectCanvasAddon={selectCanvasAddon}
                        setCanvasSelect={setCanvasSelect}
                    />
                )}

                {menu === "exports" && (
                    <div className="map-sidebar-panel-empty">
                        <h4 style={{ margin: 0, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Export</h4>
                        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '12px' }}>Coming Soon...</p>
                    </div>
                )}

                {menu === "settings" && <SettingsPanel onClose={(e) => selectMenu(e, "settings")} />}
                </div>
            )}
        </aside>
    );
}
