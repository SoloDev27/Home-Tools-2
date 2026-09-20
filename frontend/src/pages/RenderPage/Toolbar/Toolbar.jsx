import "./Toolbar.css";

export default function Toolbar({
    stage,
    selectedShape, updateShape, deleteShape, duplicateShape,
    showOffset, onToggleOffset, onOffset, offsetDistance = 1, onOffsetDistanceChange,
    vertexMode, selectedVertexIndex = -1, onToggleVertexMode, onAddVertex, onRemoveVertex, onChamfer, onFillet,
    multiSelectIds = [], onBooleanOp, onBringForward, onSendBackward,
    transformMode = "translate", onTransformModeChange,
    viewMode = "block", onViewModeChange,
    blockSize = 1, onBlockSizeChange,
}) {
    if (stage !== "render3d" && !selectedShape && multiSelectIds.length === 0) return null;

    if (stage === "render3d") {
        const hasObject = !!selectedShape;
        return (
            <div className="render-floating-toolbar render3d-floating-toolbar">
                <button className={`tb-btn${transformMode === "translate" ? " tb-btn-active" : ""}`} onClick={() => onTransformModeChange?.("translate")} disabled={!hasObject} title="Move (G)">G</button>
                <button className={`tb-btn${transformMode === "rotate" ? " tb-btn-active" : ""}`} onClick={() => onTransformModeChange?.("rotate")} disabled={!hasObject} title="Rotate (R)">R</button>
                <button className={`tb-btn${transformMode === "scale" ? " tb-btn-active" : ""}`} onClick={() => onTransformModeChange?.("scale")} disabled={!hasObject} title="Scale (S)">S</button>
                <span className="tb-sep" />
                <button className={`tb-btn render3d-text-btn${viewMode === "block" ? " tb-btn-active" : ""}`} onClick={() => onViewModeChange?.("block")} title="Block View">Block</button>
                <button className={`tb-btn render3d-text-btn${viewMode === "pure" ? " tb-btn-active" : ""}`} onClick={() => onViewModeChange?.("pure")} title="Pure View">Pure</button>
                <span className="tb-sep" />
                {[1, 5].map(size => (
                    <button
                        key={size}
                        className={`tb-btn render3d-text-btn${Number(blockSize) === size ? " tb-btn-active" : ""}`}
                        onClick={() => onBlockSizeChange?.(size)}
                        title={`${size} meter block grid`}
                    >
                        {size}m
                    </button>
                ))}
                {hasObject && (
                    <>
                        <span className="tb-sep" />
                        <button className="tb-btn" onClick={duplicateShape} title="Duplicate">⧉</button>
                        <button className="tb-btn tb-danger" onClick={deleteShape} title="Delete">🗑</button>
                    </>
                )}
            </div>
        );
    }

    const isPolygon = selectedShape && (selectedShape.type === "polygon" || Array.isArray(selectedShape.points));
    const isObject = selectedShape?.type === "object";
    const vertexCount = isPolygon && Array.isArray(selectedShape.points) ? selectedShape.points.length : 0;
    const hasMultiSelect = multiSelectIds.length >= 2;
    const hasSelectedShape = !!selectedShape;
    const hasSelectedVertex = selectedVertexIndex >= 0;
    const offsetValue = Math.min(100, Math.max(0, Math.abs(Number(offsetDistance) || 0)));

    return (
        <div className="render-floating-toolbar">
            {hasSelectedShape && !hasMultiSelect && (
                <>
                    <button className="tb-btn" onClick={() => updateShape({ ...selectedShape, rotation: (selectedShape.rotation || 0) - 15 })} title="Rotate Left">↺</button>
                    <button className="tb-btn" onClick={() => updateShape({ ...selectedShape, rotation: (selectedShape.rotation || 0) + 15 })} title="Rotate Right">↻</button>
                    <span className="tb-sep" />
                    <button className="tb-btn" onClick={onBringForward} title="Bring Forward">⬆</button>
                    <button className="tb-btn" onClick={onSendBackward} title="Send Backward">⬇</button>
                    <span className="tb-sep" />
                    <button className="tb-btn" onClick={duplicateShape} title="Duplicate">⧉</button>
                    <button className="tb-btn tb-danger" onClick={deleteShape} title="Delete">🗑</button>
                </>
            )}

            {hasMultiSelect && (
                <>
                    <span className="tb-sep" />
                    <span className="toolbar-multi-count">{multiSelectIds.length} selected</span>
                    <button className="tb-btn" onClick={() => onBooleanOp?.("union")} title="Union">⊕</button>
                    <button className="tb-btn" onClick={() => onBooleanOp?.("subtract")} title="Subtract">⊖</button>
                    <button className="tb-btn" onClick={() => onBooleanOp?.("intersect")} title="Intersect">⊗</button>
                </>
            )}

            {hasSelectedShape && !hasMultiSelect && !isObject && (
                <>
                    <span className="tb-sep" />
                    <button className={`tb-btn${showOffset ? " tb-btn-active" : ""}`} onClick={onToggleOffset} title="Offset">⊞</button>
                </>
            )}

            {isPolygon && !isObject && vertexMode && (
                <>
                    <span className="tb-sep" />
                    <span className="toolbar-vertex-count">Vertices: {vertexCount}</span>
                    <button className="tb-btn" onClick={onAddVertex} title="Add Vertex (click edge)">＋</button>
                    <button className="tb-btn" onClick={onRemoveVertex} disabled={!hasSelectedVertex || vertexCount <= 3} title="Remove Vertex">－</button>
                    <button className="tb-btn" onClick={onChamfer} disabled={!hasSelectedVertex} title="Chamfer">⌐</button>
                    <button className="tb-btn" onClick={onFillet} disabled={!hasSelectedVertex} title="Fillet">⌒</button>
                </>
            )}

            {showOffset && (
                <>
                    <span className="tb-sep" />
                    <div className="toolbar-offset-row">
                        <input
                            type="number"
                            className="toolbar-number-input"
                            value={offsetDistance}
                            onChange={e => onOffsetDistanceChange?.(e.target.value)}
                            step={0.1}
                            min={0}
                            max={100}
                            placeholder="1.0"
                            title="Offset distance in meters"
                        />
                        <button className="tb-btn" disabled={!offsetValue} onClick={() => onOffset?.(offsetValue)} title="Expand">⊞</button>
                        <button className="tb-btn" disabled={!offsetValue} onClick={() => onOffset?.(-offsetValue)} title="Contract">⊟</button>
                    </div>
                </>
            )}

            {isPolygon && !isObject && !hasMultiSelect && !showOffset && !vertexMode && (
                <>
                    <span className="tb-sep" />
                    <button className="tb-btn" onClick={onToggleVertexMode} title="Vertex Mode">✎</button>
                </>
            )}
        </div>
    );
}
