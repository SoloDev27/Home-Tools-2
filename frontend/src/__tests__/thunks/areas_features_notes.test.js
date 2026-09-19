import { configureStore } from "@reduxjs/toolkit";
import areasReducer, { thunkGetAllAreas, thunkCreateArea, thunkDeleteArea } from "../../redux/areas";
import featuresReducer, { thunkGetAllFeatures, thunkCreateFeature, thunkDeleteFeature } from "../../redux/features";
import notesReducer, { thunkGetAllNotes, thunkCreateNote, thunkDeleteNote } from "../../redux/notes";

const mockFetch = (response) =>
    vi.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve(response),
        })
    );

describe("Areas, Features, and Notes thunks", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("areas thunks load and add areas", async () => {
        global.fetch = mockFetch({ success: true, data: { areas: [{ id: 10, name: "Lot A" }] } });
        const store = configureStore({ reducer: { areas: areasReducer } });
        await store.dispatch(thunkGetAllAreas(1));
        expect(store.getState().areas.data).toHaveLength(1);
        expect(store.getState().areas.data[0].name).toBe("Lot A");

        global.fetch = mockFetch({ success: true, data: { area: { id: 11, name: "Lot B" } } });
        await store.dispatch(thunkCreateArea({ map_id: 1, name: "Lot B" }));
        expect(store.getState().areas.data).toHaveLength(2);
    });

    test("features thunks load and add features", async () => {
        global.fetch = mockFetch({ success: true, data: { features: [{ id: 20, name: "Water Line" }] } });
        const store = configureStore({ reducer: { features: featuresReducer } });
        await store.dispatch(thunkGetAllFeatures(1));
        expect(store.getState().features.data).toHaveLength(1);
        expect(store.getState().features.data[0].name).toBe("Water Line");

        global.fetch = mockFetch({ success: true, data: { feature: { id: 21, name: "Setback" } } });
        await store.dispatch(thunkCreateFeature({ map_id: 1, name: "Setback" }));
        expect(store.getState().features.data).toHaveLength(2);
    });

    test("notes thunks load and add notes", async () => {
        global.fetch = mockFetch({ success: true, data: { notes: [{ id: 30, title: "Inspection Note", cost_estimate: 500 }] } });
        const store = configureStore({ reducer: { notes: notesReducer } });
        await store.dispatch(thunkGetAllNotes(1));
        expect(store.getState().notes.data).toHaveLength(1);
        expect(store.getState().notes.data[0].title).toBe("Inspection Note");
        expect(store.getState().notes.data[0].cost_estimate).toBe(500);

        global.fetch = mockFetch({ success: true, data: { note: { id: 31, title: "New Note", cost_estimate: 200 } } });
        await store.dispatch(thunkCreateNote({ map_id: 1, title: "New Note" }));
        expect(store.getState().notes.data).toHaveLength(2);
    });
});
