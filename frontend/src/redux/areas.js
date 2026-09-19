import { checkAndReturnRes } from "./apiUtils";

const CREATE_AREA = 'areas/createArea';
const LOAD_AREAS = 'areas/loadAreas';
const EDIT_AREA = 'areas/editArea';
const REMOVE_AREA = 'areas/removeArea';

const createArea = (area) => ({
    type: CREATE_AREA,
    payload: area
});

const loadAreas = (areas) => ({
    type: LOAD_AREAS,
    payload: areas
});

const editArea = (id, area) => ({
    type: EDIT_AREA,
    payload: { id, area }
});

const removeArea = (id) => ({
    type: REMOVE_AREA,
    payload: id
});

// Get All Areas for a Map
export const thunkGetAllAreas = (mapId) => async (dispatch) => {
    const res = await fetch(`/api/areas/all?map_id=${mapId}`, {
        method: "GET",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(loadAreas(check.data.data.areas || []));
    }
    return check.data;
};

// Create Area
export const thunkCreateArea = (areaObj) => async (dispatch) => {
    const res = await fetch('/api/areas', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(areaObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(createArea(check.data.data.area));
    }
    return check.data;
};

// Edit Area
export const thunkEditArea = (id, areaObj) => async (dispatch) => {
    const res = await fetch(`/api/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(areaObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(editArea(id, check.data.data.area));
    }
    return check.data;
};

// Delete Area
export const thunkDeleteArea = (id) => async (dispatch) => {
    const res = await fetch(`/api/areas/${id}`, {
        method: "DELETE",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(removeArea(id));
    }
    return check.data;
};

const initialState = { data: [] };

export default function areasReducer(state = initialState, action) {
    switch (action.type) {
        case CREATE_AREA:
            return { ...state, data: [...state.data, action.payload] };
        case LOAD_AREAS:
            return { ...state, data: action.payload };
        case EDIT_AREA:
            return {
                ...state,
                data: state.data.map(a => a.id === action.payload.id ? action.payload.area : a)
            };
        case REMOVE_AREA:
            return { ...state, data: state.data.filter(a => a.id !== action.payload) };
        default:
            return state;
    }
}
