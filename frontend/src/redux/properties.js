import { checkAndReturnRes } from "./apiUtils";

const CREATE_PROPERTY = 'properties/createProperty';
const LOAD_PROPERTIES = 'properties/loadProperties';
const EDIT_PROPERTY = 'properties/editProperty';
const REMOVE_PROPERTY = 'properties/removeProperty';

const createProperty = (property) => ({
    type: CREATE_PROPERTY,
    payload: property
})

const loadProperties = (properties) => ({
    type: LOAD_PROPERTIES,
    payload: properties
})

const editProperty = (id, property) => ({
    type: EDIT_PROPERTY,
    payload: {id, property}
})

const removeProperty = (id) => ({
    type: REMOVE_PROPERTY,
    payload: id
})

// Get All Properties
// Get All Properties
export const thunkGetAllProperties = (mapId) => async(dispatch) => {
    const res = await fetch(`/api/property/all?map_id=${mapId}`, {
        method: "GET",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(loadProperties(check.data.data.properties))
    }

    return check.data;
}


// Create Property
export const thunkCreateProperty = (propObj) => async(dispatch) => {
    const res = await fetch('/api/property', {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(propObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(createProperty(check.data.data.property))
    }

    return check.data;
}


// Edit Property
export const thunkEditProperty = (id, propObj) => async(dispatch) => {
    const res = await fetch(`/api/property/${id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(propObj),
        credentials: "include"
    })
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(editProperty(id, check.data.data.property))
    }

    return check.data;
}


// Delete Property By ID
export const thunkDeleteProperty = (id) => async(dispatch) => {
    const res = await fetch(`/api/property/${id}`, {
        method: "DELETE",
        credentials: "include"
    })
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(removeProperty(id))
    }

    return check.data;
}


const initialState = {data: []};

export default function propertiesReducer(state=initialState, action) {
    switch(action.type) {
        case CREATE_PROPERTY:
            return {...state, data: [...state.data, action.payload]}
        case LOAD_PROPERTIES:
            return {...state, data: action.payload}
        case EDIT_PROPERTY:
            return {...state,
                data: state.data.map(p => p.id === action.payload.id ? action.payload.property : p)
            }
        case REMOVE_PROPERTY:
            return {...state, data: state.data.filter(p => p.id !== action.payload)}
        default:
            return state
    }
}