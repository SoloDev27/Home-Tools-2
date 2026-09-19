import DataTab from "./DataTab/DataTab";
import DrawTab from "./Draw/Draw";
import SettingsPanel from "./Settings/SettingsPanel";
import LayersTab from "./LayersTab/LayersTab";
import { Layers, Eye } from "lucide-react";
export default function Sidebar({
    menu, selectMenu,
    canvasSelect, selectCanvasAddon, setCanvasSelect,
    mapProperties, mapPoints, handlePointSelect, deleteCanvasObjects,
    addCanvasObjects, mapStore, mapId,
    savedTypesStore, navigate, overlaysStore
}) {
    return (
        <aside style={{
            display: 'flex',
            height: '100%',
            backgroundColor: 'var(--color-background-surface)',
            borderRight: '1px solid var(--color-border)',
            zIndex: 40,
            position: 'relative',
            flexShrink: 0
        }}>
            <ul style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0',
                width: '46px',
                height: '100%',
                borderRight: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background-card)',
                gap: '8px',
                margin: 0,
                listStyle: 'none',
                boxSizing: 'border-box',
                flexShrink: 0
            }}>
                <li
                    id="menu-draw"
                    style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: menu === "draw" ? 'var(--color-border)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onClick={(e) => selectMenu(e, "draw")}
                    title="Draw Tools"
                >
                    <img src="/icons/brush.svg" alt="Draw" style={{ width: 24, height: 24, filter: 'invert(1)', opacity: menu === "draw" ? 1 : 0.7 }} />
                </li>
                <li
                    id="menu-map"
                    style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: menu === "map" ? 'var(--color-border)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onClick={(e) => selectMenu(e, "map")}
                    title="Map Data"
                >
                    <img src="/icons/map.svg" alt="Properties" style={{ width: 24, height: 24, filter: 'invert(1)', opacity: menu === "map" ? 1 : 0.7 }} />
                </li>
                <li
                    id="menu-layers"
                    style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: menu === "layers" ? 'var(--color-border)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: menu === "layers" ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        transition: 'background-color 0.2s'
                    }}
                    onClick={(e) => selectMenu(e, "layers")}
                    title="Map Layers"
                >
                    <Layers size={24} strokeWidth={1.5} />
                </li>
                <li
                    id="menu-render"
                    style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onClick={() => navigate("/render")}
                    title="3D Render"
                >
                    <Eye size={24} strokeWidth={1.5} style={{ opacity: 0.7 }} />
                </li>
                <li
                    id="menu-exports"
                    style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: menu === "exports" ? 'var(--color-border)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onClick={(e) => selectMenu(e, "exports")}
                    title="Export Data"
                >
                    <img src="/icons/export.svg" alt="Exports" style={{ width: 24, height: 24, filter: 'invert(1)', opacity: menu === "exports" ? 1 : 0.7 }} />
                </li>
                
                <div style={{ flexGrow: 1 }} />

                <li
                    id="menu-settings"
                    style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: menu === "settings" ? 'var(--color-border)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onClick={(e) => selectMenu(e, "settings")}
                    title="Settings"
                >
                    <img src="/icons/setting.svg" alt="Settings" style={{ width: 24, height: 24, filter: 'invert(1)', opacity: menu === "settings" ? 1 : 0.7 }} />
                </li>
            </ul>

            {/* The active panel for the selected menu */}
            {menu && (
                <div id="menu-tools" style={{
                    width: '260px',
                    backgroundColor: 'var(--color-background-surface)',
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    borderRight: '1px solid var(--color-border)',
                    boxShadow: '4px 0 16px rgba(0,0,0,0.2)',
                    position: 'relative',
                    boxSizing: 'border-box'
                }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 6px', gap: '6px' }}>
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
