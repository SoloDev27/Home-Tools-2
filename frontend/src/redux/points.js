import { checkAndReturnRes } from "./apiUtils";

const CREATE_POINT = "points/createPoint";
const LOAD_POINTS = "points/loadPoints";
const EDIT_POINT = "points/editPoint";
const DELETE_POINT = "points/deletePoint";

const createPoint = (point) => ({
    type: CREATE_POINT,
    payload: point
})

const loadPoints = (points) => ({
    type: LOAD_POINTS,
    payload: points
})

const editPoint = (point) => ({
    type: EDIT_POINT,
    payload: point
})

const deletePoint = (id) => ({
    type: DELETE_POINT,
    payload: id
})

// Get All Points
export const thunkGetPoints = (mapId) => async(dispatch) => {
    const res = await fetch(`/api/points/all?map_id=${mapId}`, {
        method: "GET",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(loadPoints(check.data.data.points));
    };
    return check.data;
}

// Create Point
export const thunkCreatePoint = (pointObj) => async(dispatch) => {
    const res = await fetch("/api/points", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(pointObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(createPoint(check.data.data.point));
    };
    return check.data;
}


// Edit Point
export const thunkEditPoint = (id, pointObj) => async(dispatch) => {
    const res = await fetch(`/api/points/${id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(pointObj),
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(editPoint(check.data.data.point));
    };
    return check.data;
}


// Remove Point
export const thunkDeletePoint = (id) => async(dispatch) => {
    const res = await fetch(`/api/points/${id}`, {
        method: "DELETE",
        credentials: "include"
    });
    const check = await checkAndReturnRes(res);
    if(check.ok) {
        await dispatch(deletePoint(id));
    };
    return check.data;
}


const initialState = {data: []};

export default function pointsReducer(state = initialState, action) {
    switch(action.type){
        case CREATE_POINT:
            return {...state, data: [...state.data, action.payload]};
        case LOAD_POINTS:
            return {...state, data: action.payload};
        case EDIT_POINT:
            return {
                ...state,
                data: state.data.map(p => p.id === action.payload.id ? action.payload : p)
            };
        case DELETE_POINT:
            return {
                ...state,
                data: state.data.filter(p => p.id !== action.payload)
            };
        default:
            return state;
    }
}