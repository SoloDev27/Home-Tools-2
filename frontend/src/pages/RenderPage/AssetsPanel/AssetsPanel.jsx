import { useState } from "react";
import "./AssetsPanel.css";
import ShapesTab from "./ShapesTab";
import CanvasTab from "./CanvasTab";
import SectionsTab from "./SectionsTab";
import ObjectsTab from "./ObjectsTab";
import TemplateTab from "./TemplateTab";
import ImportsTab from "./ImportsTab";
import DoorsWallsTab from "./DoorsWallsTab";
import BuildToolsTab from "./BuildToolsTab";
import ExportsTab from "./ExportsTab";

export default function AssetsPanel({
    stage,
    addShape,
    canvasSettings,
    setCanvasSettings,
    hasFloors,
    addRoomToFloor,
    activeFloorId,
    mapDistance,
    setMapDistance,
    setPendingPlacement,
    pendingPlacement,
    activeTool,
    onSelectTool,
    canCombine,
    canSelect,
    addLevel,
    onSelectCatalogItem,
    selectedCount = 0,
    onBooleanOp,
    outlines = [],
    onLoadTemplate,
    onLoadBuiltin,
    onImport,
    onSearchAddress,
    searchResults,
    onSelectResult,
    onPlaceAtCursor,
    isSearching,
    onBatchMerge,
    onBatchDelete,
    onBatchChangeType,
    onBatchFullWall,
    multiSelectIds,
    onApplyTemplate,
    onApplyObjectTemplate,
    selectedShape,
    onUpdateShape,
    onApplyArchitecturalStyle,
    importedObjects,
    onDeleteImport,
    onUploadImport,
    wallHeight,
    onWallHeightChange,
    onExportGLTF,
    onExportSelectedGLTF,
    selectedObjectId,
    viewMode,
    onViewModeChange,
    blockSize,
    onBlockSizeChange,
}) {
    const [tab, setTab] = useState("tools");

    if (stage === "objects") {
        const activeTab = ["catalog", "templates", "doorswalls", "imports", "settings"].includes(tab) ? tab : "catalog";
        return (
            <aside className="app-slider">
                <ul className="menu">
                    <li className={`user-select-none ${activeTab === "catalog" ? "menu-active" : ""}`}
                        onClick={() => setTab("catalog")} title="Furniture Catalog">
                        <span className="assets-menu-icon">🪑</span>
                    </li>
                    <li className={`user-select-none ${activeTab === "templates" ? "menu-active" : ""}`}
                        onClick={() => setTab("templates")} title="Templates">
                        <span className="assets-menu-icon">📋</span>
                    </li>
                    <li className={`user-select-none ${activeTab === "doorswalls" ? "menu-active" : ""}`}
                        onClick={() => setTab("doorswalls")} title="Doors & Walls">
                        <span className="assets-menu-icon">🚪</span>
                    </li>
                    <li className={`user-select-none ${activeTab === "imports" ? "menu-active" : ""}`}
                        onClick={() => setTab("imports")} title="Imports">
                        <span className="assets-menu-icon">📥</span>
                    </li>
                    <div className="menu-spacer"></div>
                    <li className={`user-select-none ${activeTab === "settings" ? "menu-active" : ""}`}
                        onClick={() => setTab("settings")} title="Settings">
                        <span className="assets-menu-icon">⚙️</span>
                    </li>
                </ul>
                <ul id="menu-tools">
                    {activeTab === "catalog" && <ObjectsTab onSelectCatalogItem={onSelectCatalogItem} activeItemId={pendingPlacement?.kind === "object" ? pendingPlacement.item?.id : null} />}
                    {activeTab === "templates" && <TemplateTab outlines={outlines} onLoadTemplate={onLoadTemplate} onLoadBuiltin={onLoadBuiltin} onImport={onImport} stage={stage} onApplyTemplate={onApplyTemplate} onApplyObjectTemplate={onApplyObjectTemplate} activeObjectTemplateId={pendingPlacement?.kind === "object-template" ? pendingPlacement.templateId : null} />}
                    {activeTab === "doorswalls" && <DoorsWallsTab selectedElement={selectedShape} onApplyElementStyle={onApplyArchitecturalStyle} wallHeight={wallHeight} onWallHeightChange={onWallHeightChange} />}
                    {activeTab === "imports" && <ImportsTab onSelectCatalogItem={onSelectCatalogItem} activeItemId={pendingPlacement?.kind === "object" ? pendingPlacement.item?.id : null} importedObjects={importedObjects} onDeleteImport={onDeleteImport} onUploadImport={onUploadImport} />}
                    {activeTab === "settings" && <CanvasTab canvasSettings={canvasSettings} setCanvasSettings={setCanvasSettings} mapDistance={mapDistance} setMapDistance={setMapDistance} />}
                </ul>
            </aside>
        );
    }

    if (stage === "render3d") {
        const activeTab = ["build", "objects", "imports", "exports"].includes(tab) ? tab : "build";
        return (
            <aside className="app-slider">
                <ul className="menu">
                    <li className={`user-select-none ${activeTab === "build" ? "menu-active" : ""}`}
                        onClick={() => setTab("build")} title="Build Tools">
                        <span className="assets-menu-icon">🔧</span>
                    </li>
                    <li className={`user-select-none ${activeTab === "objects" ? "menu-active" : ""}`}
                        onClick={() => setTab("objects")} title="3D Objects">
                        <span className="assets-menu-icon">🪑</span>
                    </li>
                    <li className={`user-select-none ${activeTab === "imports" ? "menu-active" : ""}`}
                        onClick={() => setTab("imports")} title="Imports">
                        <span className="assets-menu-icon">📥</span>
                    </li>
                    <li className={`user-select-none ${activeTab === "exports" ? "menu-active" : ""}`}
                        onClick={() => setTab("exports")} title="Exports">
                        <span className="assets-menu-icon">💾</span>
                    </li>
                </ul>
                <ul id="menu-tools">
                    {activeTab === "build" && (
                        <BuildToolsTab
                            onSelectCatalogItem={onSelectCatalogItem}
                            activeTool={activeTool}
                            onSelectTool={onSelectTool}
	                            wallHeight={wallHeight}
	                            onWallHeightChange={onWallHeightChange}
	                            viewMode={viewMode}
	                            onViewModeChange={onViewModeChange}
	                            blockSize={blockSize}
	                            onBlockSizeChange={onBlockSizeChange}
	                        />
	                    )}
                    {activeTab === "objects" && <ObjectsTab onSelectCatalogItem={onSelectCatalogItem} activeItemId={pendingPlacement?.kind === "object" ? pendingPlacement.item?.id : null} />}
                    {activeTab === "imports" && <ImportsTab onSelectCatalogItem={onSelectCatalogItem} activeItemId={pendingPlacement?.kind === "object" ? pendingPlacement.item?.id : null} importedObjects={importedObjects} onDeleteImport={onDeleteImport} onUploadImport={onUploadImport} />}
                    {activeTab === "exports" && (
                        <ExportsTab
                            onExportGLTF={onExportGLTF}
                            onExportSelectedGLTF={onExportSelectedGLTF}
                            selectedObjectId={selectedObjectId}
                        />
                    )}
                </ul>
            </aside>
        );
    }

    if (stage === "sections") {
        const activeTab = ["tools", "templates", "settings"].includes(tab) ? tab : "tools";
        return (
            <aside className="app-slider">
                <ul className="menu">
                    <li className={`user-select-none ${activeTab === "tools" ? "menu-active" : ""}`}
                        onClick={() => setTab("tools")} title="Room Tools">
                        <span className="assets-menu-icon">🔨</span>
                    </li>
                    <li className={`user-select-none ${activeTab === "templates" ? "menu-active" : ""}`}
                        onClick={() => setTab("templates")} title="Templates">
                        <span className="assets-menu-icon">📋</span>
                    </li>
                    <div className="menu-spacer"></div>
                    <li className={`user-select-none ${activeTab === "settings" ? "menu-active" : ""}`}
                        onClick={() => setTab("settings")} title="Settings">
                        <span className="assets-menu-icon">⚙️</span>
                    </li>
                </ul>
                <ul id="menu-tools">
                    {activeTab === "tools" && <SectionsTab activeTool={activeTool} onSelectTool={onSelectTool} canCombine={canCombine} canSelect={canSelect} onBatchMerge={onBatchMerge} onBatchDelete={onBatchDelete} onBatchChangeType={onBatchChangeType} onBatchFullWall={onBatchFullWall} multiSelectIds={multiSelectIds} selectedShape={selectedShape} onUpdateShape={onUpdateShape} canvasSettings={canvasSettings} setCanvasSettings={setCanvasSettings} />}
                    {activeTab === "templates" && <TemplateTab outlines={outlines} onLoadTemplate={onLoadTemplate} onLoadBuiltin={onLoadBuiltin} onImport={onImport} stage={stage} onApplyTemplate={onApplyTemplate} />}
                    {activeTab === "settings" && <CanvasTab canvasSettings={canvasSettings} setCanvasSettings={setCanvasSettings} mapDistance={mapDistance} setMapDistance={setMapDistance} />}
                </ul>
            </aside>
        );
    }

    const activeTab = ["shapes", "templates", "settings"].includes(tab) ? tab : "shapes";

    return (
        <aside className="app-slider">
            <ul className="menu">
                <li className={`user-select-none ${activeTab === "shapes" ? "menu-active" : ""}`}
                    onClick={() => setTab("shapes")} title="Outlines">
                    <span className="assets-menu-icon">▲</span>
                </li>
                <li className={`user-select-none ${activeTab === "templates" ? "menu-active" : ""}`}
                    onClick={() => setTab("templates")} title="Templates">
                    <span className="assets-menu-icon">📋</span>
                </li>
                <div className="menu-spacer"></div>
                <li className={`user-select-none ${activeTab === "settings" ? "menu-active" : ""}`}
                    onClick={() => setTab("settings")} title="Canvas Settings">
                    <span className="assets-menu-icon">⚙️</span>
                </li>
            </ul>
            <ul id="menu-tools">
                {activeTab === "shapes" && <ShapesTab setPendingPlacement={setPendingPlacement} activeTool={activeTool} selectedCount={selectedCount} onBooleanOp={onBooleanOp} />}
                {activeTab === "templates" && <TemplateTab outlines={outlines} onLoadTemplate={onLoadTemplate} onLoadBuiltin={onLoadBuiltin} onImport={onImport} stage={stage} onApplyTemplate={onApplyTemplate} />}
                {activeTab === "settings" && <CanvasTab canvasSettings={canvasSettings} setCanvasSettings={setCanvasSettings} mapDistance={mapDistance} setMapDistance={setMapDistance} />}
            </ul>
        </aside>
    );
}
