import PropertyDetailsSidebar from "./PropertyDetailsSidebar/PropertyDetailsSidebar";


export default function DetailPanel({
    selectedPoint, canvasObjects,
    addCanvasObjects, deleteCanvasObjects,
    isPinned, onPinToggle, handleCloseSidebar, setSelectedPoint
}) {
    if (!selectedPoint) return null;

    return (
        <aside style={{
            position: 'absolute',
            top: 0,
            right: 0,
            height: '100%',
            width: '384px',
            backgroundColor: 'var(--color-background-surface)',
            borderLeft: '1px solid var(--color-border)',
            zIndex: 45,
            boxShadow: '-4px 0 16px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <PropertyDetailsSidebar
                point={selectedPoint}
                onClose={handleCloseSidebar}
                onUpdate={addCanvasObjects}
                onDelete={(id) => { deleteCanvasObjects(id); setSelectedPoint(null); }}
                allPoints={Object.values(canvasObjects)}
                isPinned={isPinned}
                onPinToggle={onPinToggle}
            />
        </aside>
    );
}
