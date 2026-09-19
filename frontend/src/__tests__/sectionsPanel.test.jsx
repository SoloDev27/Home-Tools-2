import React, { act } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import SectionsPanel from "../pages/UnifiedEditor/SectionsPanel";

// A target (boundary) carrying two sections and one divider line, shaped like the
// objects the editor actually stores on an area's extra_info.
const makeTarget = () => ({
    type: "area",
    item: {
        id: 51,
        name: "Main Lot Boundary",
        area_sqft: 240000,
        coordinates: [[[-0.001, -0.001], [0.001, -0.001], [0.001, 0.001], [-0.001, 0.001]]],
        extra_info: {
            dividers: [
                { id: "div-1", name: "Divider 1", coordinates: [[0, -0.001], [0, 0.001]] }
            ],
            sections: [
                { id: "sec-1", name: "Yard", type: "yard", color: "#10b981", area_sqft: 120000, coordinates: [] },
                { id: "sec-2", name: "Patio", type: "patio", color: "#f59e0b", area_sqft: 120000, coordinates: [] }
            ]
        }
    }
});

let container;
let root;

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

const render = (props) => {
    act(() => {
        root.render(<SectionsPanel target={makeTarget()} {...props} />);
    });
};

const buttonByTitle = (title) =>
    [...container.querySelectorAll("button")].find(b => b.getAttribute("title") === title);

describe("SectionsPanel wiring", () => {
    it("invokes onDeleteSection with the section id when its trash button is clicked", () => {
        const onDeleteSection = vi.fn();
        render({ onDeleteSection, onSelectSection: () => {} });

        const del = buttonByTitle("Delete this section");
        expect(del, "delete button should render for a section").toBeTruthy();

        act(() => del.dispatchEvent(new MouseEvent("click", { bubbles: true })));
        expect(onDeleteSection).toHaveBeenCalledWith("sec-1");
    });

    it("invokes onMergeDivider with the divider id when its merge button is clicked", () => {
        const onMergeDivider = vi.fn();
        render({ onMergeDivider, onSelectDivider: () => {} });

        const merge = buttonByTitle(
            "Merge across this divider line only (rejoins the sections it separates)"
        );
        expect(merge, "per-divider merge button should render").toBeTruthy();

        act(() => merge.dispatchEvent(new MouseEvent("click", { bubbles: true })));
        expect(onMergeDivider).toHaveBeenCalledWith("div-1");
    });

    it("invokes onMergeAll from the Merge All button", () => {
        const onMergeAll = vi.fn();
        render({ onMergeAll });

        const mergeAll = buttonByTitle(
            "Merge all sections and divider lines back into a single boundary"
        );
        expect(mergeAll).toBeTruthy();
        act(() => mergeAll.dispatchEvent(new MouseEvent("click", { bubbles: true })));
        expect(onMergeAll).toHaveBeenCalled();
    });
});
