import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// SectionsPanel renders buttons that call these callbacks, but a callback only
// works if UnifiedEditor actually passes it. The original bug was exactly that:
// SectionsPanel called onDeleteSection?.() and the editor never supplied it, so
// the trash button silently did nothing. These assertions guard the wiring,
// which a jsdom render of the full editor cannot exercise because MapLibre needs
// a WebGL context.
const source = readFileSync(
    resolve(__dirname, "../pages/UnifiedEditor/UnifiedEditor.jsx"),
    "utf8"
);

const panelProps = (() => {
    const start = source.indexOf("<SectionsPanel");
    expect(start, "<SectionsPanel> should be rendered").toBeGreaterThan(-1);
    const end = source.indexOf("/>", start);
    return source.slice(start, end);
})();

describe("UnifiedEditor -> SectionsPanel wiring", () => {
    const expectedProps = [
        "onDeleteSection",
        "onMergeDivider",
        "onMergeAll",
        "onUpdateSection",
        "onSubdivide",
        "onInsetCore",
        "onStartDivider"
    ];

    expectedProps.forEach(prop => {
        it(`passes ${prop}`, () => {
            expect(panelProps).toContain(`${prop}=`);
        });
    });
});

describe("geometry edits rebuild sections", () => {
    it("routes area updates through handleAreaUpdate", () => {
        expect(source).toContain("onAreaUpdate={handleAreaUpdate}");
        expect(source).toContain("onUpdateArea={handleAreaUpdate}");
    });

    it("routes feature geometry updates through the rebuild path", () => {
        // handleFeatureUpdate must delegate geometry changes to the rebuilder,
        // otherwise a moved feature leaves its sections behind.
        expect(source).toMatch(/handleFeatureUpdate[\s\S]{0,300}handleFeatureGeometryUpdate/);
    });
});
