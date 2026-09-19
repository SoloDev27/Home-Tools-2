import { checkAndReturnRes } from "./apiUtils";

const CREATE_NOTE = 'notes/createNote';
const LOAD_NOTES = 'notes/loadNotes';
const EDIT_NOTE = 'notes/editNote';
const REMOVE_NOTE = 'notes/removeNote';

const createNote = (note) => ({
    type: CREATE_NOTE,
    payload: note
});

const loadNotes = (notes) => ({
    type: LOAD_NOTES,
    payload: notes
});

const editNote = (id, note) => ({
    type: EDIT_NOTE,
    payload: { id, note }
});

const removeNote = (id) => ({
    type: REMOVE_NOTE,
    payload: id
});

// Get All Notes for a Map (with optional filters)
export const thunkGetAllNotes = (mapId, filters = {}) => async (dispatch) => {
    let url = `/api/notes/all?map_id=${mapId}`;
    if (filters.area_id) url += `&area_id=${filters.area_id}`;
    if (filters.property_id) url += `&property_id=${filters.property_id}`;
    if (filters.feature_id) url += `&feature_id=${filters.feature_id}`;
    if (filters.category) url += `&category=${filters.category}`;
    if (filters.status) url += `&status=${filters.status}`;

    const res = await fetch(url, {
        method: "GET",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(loadNotes(check.data.data.notes || []));
    }
    return check.data;
};

// Create Note
export const thunkCreateNote = (noteObj) => async (dispatch) => {
    const res = await fetch('/api/notes', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(createNote(check.data.data.note));
    }
    return check.data;
};

// Edit Note
export const thunkEditNote = (id, noteObj) => async (dispatch) => {
    const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(editNote(id, check.data.data.note));
    }
    return check.data;
};

// Delete Note
export const thunkDeleteNote = (id) => async (dispatch) => {
    const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(removeNote(id));
    }
    return check.data;
};

const initialState = { data: [] };

export default function notesReducer(state = initialState, action) {
    switch (action.type) {
        case CREATE_NOTE:
            return { ...state, data: [action.payload, ...state.data] };
        case LOAD_NOTES:
            return { ...state, data: action.payload };
        case EDIT_NOTE:
            return {
                ...state,
                data: state.data.map(n => n.id === action.payload.id ? action.payload.note : n)
            };
        case REMOVE_NOTE:
            return { ...state, data: state.data.filter(n => n.id !== action.payload) };
        default:
            return state;
    }
}
