import { trackEvent } from "../functions/analytics";

const SET_USER = 'session/setUser';
const REMOVE_USER = 'session/removeUser';

const setUser = (user) => ({
    type: SET_USER,
    payload: user
})

const removeUser = () => ({
    type: REMOVE_USER
})


export const thunkSessions = () => async (dispatch) => {
    const res = await fetch(`/api/auth/session`, {
        method: "GET",
        credentials: "include"
    });
    const data = await res.json();
    if(res.ok) {
        await dispatch(setUser(data))
    }
    return data
}

export const thunkSignup = (credentials) => async () => {
    const res = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if(res.ok) {
        trackEvent("signup", { method: "email" });
    }
    return data
}

export const thunkLogin = (credentials) => async (dispatch) => {
    const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: {"Content-type": "application/json"},
        body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if(res.ok) {
        await dispatch(setUser(data.data.db_user))
        trackEvent("login", { method: "email" });
    } else {
        trackEvent("login_failed", { error: data.message || "unknown" });
    }
    return data
}

export const thunkLogout = () => async (dispatch) => {
    const res = await fetch(`/api/auth/session`, {
        method: "DELETE"
    });
    const data = await res.json();
    if(res.ok) {
        localStorage.clear();
        await dispatch(removeUser())
        trackEvent("logout");
    }
    return data
}

const initialState = {user: null}

export default function sessionReducer(state=initialState, action) {
    switch(action.type) {
        case SET_USER:
            return {...state, user: action.payload};
        case REMOVE_USER:
            return {...state, user: null};
        default:
            return state;
    }
}