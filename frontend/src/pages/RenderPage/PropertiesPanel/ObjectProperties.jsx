import "./ObjectProperties.css";

export default function ObjectProperties({ selectedObject, onUpdateObject, rooms }) {
    if (!selectedObject) {
        return (
            <p className="object-props-empty">
                Select an object to edit properties
            </p>
        );
    }

    const update = (changes) => onUpdateObject?.({ ...selectedObject, ...changes });
    const round = (v) => Math.round(Number(v) || 0);
    const roundMeters = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const roundCoordinate = (v) => Math.round((Number(v) || 0) * 1000000) / 1000000;
    const isPinned = selectedObject.lat != null && selectedObject.lng != null;

    return (
        <>
            <h4 className="render-props-title">{selectedObject.name || "Object"}</h4>

            <div className="props-section props-section-flush">
                <label>Name</label>
                <input type="text" className="input" value={selectedObject.name || ""}
                    onChange={e => update({ name: e.target.value })} />
            </div>

            <div className="props-section">
                <label>{isPinned ? "Lat" : "X"}</label>
                <input type="number" value={isPinned ? roundCoordinate(selectedObject.lat) : round(selectedObject.x)}
                    step={isPinned ? 0.000001 : 1}
                    onChange={e => isPinned ? update({ lat: Number(e.target.value) }) : update({ x: Number(e.target.value) })} />
                <label>{isPinned ? "Lng" : "Y"}</label>
                <input type="number" value={isPinned ? roundCoordinate(selectedObject.lng) : round(selectedObject.y)}
                    step={isPinned ? 0.000001 : 1}
                    onChange={e => isPinned ? update({ lng: Number(e.target.value) }) : update({ y: Number(e.target.value) })} />
            </div>

            <div className="props-section">
                <label>{selectedObject.widthMeters !== undefined ? "Width (m)" : "Width (px)"}</label>
                <input type="number"
                    step={selectedObject.widthMeters !== undefined ? 0.01 : 1}
                    value={selectedObject.widthMeters !== undefined ? roundMeters(selectedObject.widthMeters) : round(selectedObject.width)}
                    onChange={e => selectedObject.widthMeters !== undefined
                        ? update({ widthMeters: Math.max(0.05, Number(e.target.value)), width: undefined })
                        : update({ width: Math.max(4, Number(e.target.value)) })} />
                <label>{selectedObject.heightMeters !== undefined ? "Depth (m)" : "Height (px)"}</label>
                <input type="number"
                    step={selectedObject.heightMeters !== undefined ? 0.01 : 1}
                    value={selectedObject.heightMeters !== undefined ? roundMeters(selectedObject.heightMeters) : round(selectedObject.height)}
                    onChange={e => selectedObject.heightMeters !== undefined
                        ? update({ heightMeters: Math.max(0.05, Number(e.target.value)), height: undefined })
                        : update({ height: Math.max(4, Number(e.target.value)) })} />
                <label>{selectedObject.heightMeters3d !== undefined ? "Height (m)" : "Height 3D (px)"}</label>
                <input type="number"
                    step={selectedObject.heightMeters3d !== undefined ? 0.01 : 1}
                    value={selectedObject.heightMeters3d !== undefined ? roundMeters(selectedObject.heightMeters3d) : round(selectedObject.height3d || 20)}
                    onChange={e => selectedObject.heightMeters3d !== undefined
                        ? update({ heightMeters3d: Math.max(0.05, Number(e.target.value)), height3d: undefined })
                        : update({ height3d: Math.max(4, Number(e.target.value)) })} />
            </div>

            <div className="props-section">
                <label>Rotation</label>
                <div className="props-rotation-row">
                    <button className="tb-btn props-rotate-btn"
                        onClick={() => update({ rotation: ((selectedObject.rotation || 0) - 90 + 360) % 360 })}>↺</button>
                    <input type="number" min={0} max={360} value={round(selectedObject.rotation || 0)}
                        onChange={e => update({ rotation: Number(e.target.value) % 360 })} className="props-rotation-input" />
                    <button className="tb-btn props-rotate-btn"
                        onClick={() => update({ rotation: ((selectedObject.rotation || 0) + 90) % 360 })}>↻</button>
                </div>
            </div>

            <div className="props-section props-section-flush">
                <label>Color</label>
                <input type="color" value={selectedObject.fill || "#888"}
                    onChange={e => update({ fill: e.target.value })} />
            </div>

            {rooms && rooms.length > 0 && (
                <div className="props-section">
                    <label>Room</label>
                    <select className="input" value={selectedObject.room_id || ""}
                        onChange={e => update({ room_id: e.target.value || null })}>
                        <option value="">Unassigned</option>
                        {rooms.map(r => (
                            <option key={r.id} value={r.id}>{r.name || r.roomType || r.id}</option>
                        ))}
                    </select>
                </div>
            )}

            {selectedObject.modelUrl && (
                <div className="props-section props-section-flush">
                    <label>Model</label>
                    <span className="props-model-url">
                        {selectedObject.modelUrl.startsWith("data:") ? "Custom GLB loaded" : selectedObject.modelUrl}
                    </span>
                </div>
            )}
        </>
    );
}
