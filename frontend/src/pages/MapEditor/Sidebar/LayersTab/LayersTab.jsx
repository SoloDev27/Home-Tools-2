import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { thunkAddWorkspace, thunkRemoveWorkspace, thunkToggleVisibility } from "../../../../redux/overlays";
import { Eye, EyeOff, Layers, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";

export default function LayersTab() {
    const { mapId } = useParams();
    const dispatch = useDispatch();
    
    const mapStore = useSelector(state => state.maps);
    const overlaysStore = useSelector(state => state.overlays);
    
    const workspaceMapIds = overlaysStore.workspaceMapIds || [];
    const visibleMapIds = overlaysStore.visibleMapIds || [];
    
    const allMaps = mapStore.data || [];
    const currentMap = allMaps.find(m => String(m.id) === String(mapId));
    
    // Maps available to add to workspace (not the current map, and not already in workspace)
    const availableMaps = allMaps.filter(m => String(m.id) !== String(mapId) && !workspaceMapIds.includes(m.id));
    
    // Maps currently in the workspace (not the current map)
    const workspaceMaps = allMaps.filter(m => workspaceMapIds.includes(m.id));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-background-surface)', color: 'var(--color-text-primary)' }}>
            <div style={{ padding: '12px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} />
                <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Map Workspace</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* CURRENT WORKSPACE SECTION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Current Workspace</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* The base map */}
                        {currentMap && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-background-card)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <MapIcon size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
                                    <span style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {currentMap.name} <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>(Current)</span>
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* The workspace overlays */}
                        {workspaceMaps.map(m => {
                            const isVisible = visibleMapIds.includes(m.id);
                            return (
                                <div 
                                    key={`ws-${m.id}`} 
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: isVisible ? 'var(--color-background-card)' : 'transparent',
                                        opacity: isVisible ? 1 : 0.6
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                        <MapIcon size={14} style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isVisible ? 500 : 400 }}>{m.name}</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                        <Button 
                                            variant="ghost" 
                                            size="small"
                                            icon={isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                            onClick={() => dispatch(thunkToggleVisibility(m.id))}
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="small"
                                            icon={<Trash2 size={12} />}
                                            onClick={() => dispatch(thunkRemoveWorkspace(m.id))}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        
                        {workspaceMaps.length === 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic', paddingLeft: '2px' }}>
                                No additional layers.
                            </div>
                        )}
                    </div>
                </div>

                {/* AVAILABLE LAYERS SECTION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Available Layers</h3>
                    
                    {availableMaps.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '12px', border: '1px dashed var(--color-border)', borderRadius: '6px' }}>
                            No other maps.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {availableMaps.map(m => (
                                <div 
                                    key={`avail-${m.id}`} 
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-background-card)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                        <MapIcon size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                                        <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                                    </div>
                                    
                                    <Button 
                                        variant="secondary" 
                                        size="small"
                                        label="Add"
                                        icon={<Plus size={12} />}
                                        onClick={() => dispatch(thunkAddWorkspace(m.id))}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
