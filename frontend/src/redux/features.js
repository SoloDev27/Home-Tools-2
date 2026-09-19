import { checkAndReturnRes } from "./apiUtils";

const CREATE_FEATURE = 'features/createFeature';
const LOAD_FEATURES = 'features/loadFeatures';
const EDIT_FEATURE = 'features/editFeature';
const REMOVE_FEATURE = 'features/removeFeature';

const createFeature = (feature) => ({
    type: CREATE_FEATURE,
    payload: feature
});

const loadFeatures = (features) => ({
    type: LOAD_FEATURES,
    payload: features
});

const editFeature = (id, feature) => ({
    type: EDIT_FEATURE,
    payload: { id, feature }
});

const removeFeature = (id) => ({
    type: REMOVE_FEATURE,
    payload: id
});

// Get All Features for Map (optionally filtered by Area or Property)
export const thunkGetAllFeatures = (mapId, areaId = null, propertyId = null) => async (dispatch) => {
    let url = `/api/features/all?map_id=${mapId}`;
    if (areaId) url += `&area_id=${areaId}`;
    if (propertyId) url += `&property_id=${propertyId}`;
    
    const res = await fetch(url, {
        method: "GET",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(loadFeatures(check.data.data.features || []));
    }
    return check.data;
};

// Create Feature
export const thunkCreateFeature = (featureObj) => async (dispatch) => {
    const res = await fetch('/api/features', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featureObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(createFeature(check.data.data.feature));
    }
    return check.data;
};

// Edit Feature
export const thunkEditFeature = (id, featureObj) => async (dispatch) => {
    const res = await fetch(`/api/features/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featureObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(editFeature(id, check.data.data.feature));
    }
    return check.data;
};

// Delete Feature
export const thunkDeleteFeature = (id) => async (dispatch) => {
    const res = await fetch(`/api/features/${id}`, {
        method: "DELETE",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if (check.ok) {
        await dispatch(removeFeature(id));
    }
    return check.data;
};

const initialState = { data: [] };

export default function featuresReducer(state = initialState, action) {
    switch (action.type) {
        case CREATE_FEATURE:
            return { ...state, data: [...state.data, action.payload] };
        case LOAD_FEATURES:
            return { ...state, data: action.payload };
        case EDIT_FEATURE:
            return {
                ...state,
                data: state.data.map(f => f.id === action.payload.id ? action.payload.feature : f)
            };
        case REMOVE_FEATURE:
            return { ...state, data: state.data.filter(f => f.id !== action.payload) };
        default:
            return state;
    }
}
