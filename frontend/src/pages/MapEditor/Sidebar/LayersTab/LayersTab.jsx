import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { thunkAddWorkspace, thunkRemoveWorkspace, thunkToggleVisibility } from "../../../../redux/overlays";
import { Eye, EyeOff, Layers, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import "./LayersTab.css";

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
        <div className="layers-tab">
            <div className="layers-tab-header">
                <Layers size={16} />
                <h2 className="layers-tab-title">Map Workspace</h2>
            </div>
            
            <div className="layers-tab-body">
                
                {/* CURRENT WORKSPACE SECTION */}
                <div className="layers-section">
                    <h3 className="layers-section-title">Current Workspace</h3>
                    <div className="layers-list">
                        {/* The base map */}
                        {currentMap && (
                            <div className="layers-row">
                                <div className="layers-row-main">
                                    <MapIcon size={14} className="layers-row-icon" />
                                    <span className="layers-row-name">
                                        {currentMap.name} <span className="layers-row-tag">(Current)</span>
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
                                    className={`layers-row${isVisible ? "" : " is-muted"}`}
                                >
                                    <div className="layers-row-main">
                                        <MapIcon size={14} className="layers-row-icon" />
                                        <span className={`layers-row-name${isVisible ? "" : " is-regular"}`}>{m.name}</span>
                                    </div>
                                    
                                    <div className="layers-row-actions">
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
                            <div className="layers-note">
                                No additional layers.
                            </div>
                        )}
                    </div>
                </div>

                {/* AVAILABLE LAYERS SECTION */}
                <div className="layers-section">
                    <h3 className="layers-section-title">Available Layers</h3>
                    
                    {availableMaps.length === 0 ? (
                        <div className="layers-empty">
                            No other maps.
                        </div>
                    ) : (
                        <div className="layers-list">
                            {availableMaps.map(m => (
                                <div
                                    key={`avail-${m.id}`}
                                    className="layers-row"
                                >
                                    <div className="layers-row-main">
                                        <MapIcon size={14} className="layers-row-icon is-dim" />
                                        <span className="layers-row-name">{m.name}</span>
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
