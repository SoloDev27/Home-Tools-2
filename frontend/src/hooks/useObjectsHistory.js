import { useState, useEffect, useRef, useCallback } from "react";
import { debounce } from "../functions/map";

const TTL = 6 * 60 * 60 * 1000;

export default function useObjectsHistory(propertyId) {
    const storageKey = `render_${propertyId || "new"}_objects`;

    const [objects, setObjectsState] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    const objectsRef = useRef([]);
    const historyIndexRef = useRef(-1);
    const pendingHistoryRef = useRef(false);
    const savingRef = useRef(false);
    const isSavingRef = useRef(false);

    useEffect(() => { objectsRef.current = objects; }, [objects]);

    const debouncedSaveToLocal = useRef(debounce(() => {
        if (savingRef.current || isSavingRef.current) return;
        localStorage.setItem(storageKey, JSON.stringify({
            data: objectsRef.current,
            expires: Date.now() + TTL,
        }));
    }, 2000)).current;

    const debouncedPushHistory = useRef(debounce(() => {
        const snapshot = { objects: [...objectsRef.current] };
        const newIndex = historyIndexRef.current + 1;
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
        setHistory(prev => {
            const trimmed = prev.slice(0, newIndex);
            return [...trimmed, snapshot];
        });
    }, 1000)).current;

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        const parsed = stored ? JSON.parse(stored) : null;
        if (parsed && Date.now() > parsed.expires) {
            localStorage.removeItem(storageKey);
        } else if (parsed?.data) {
            setObjectsState(parsed.data);
        }
        setLoaded(true);
    }, [storageKey]);

    useEffect(() => {
        if (!loaded || savingRef.current || isSavingRef.current) return;
        debouncedSaveToLocal();
        if (pendingHistoryRef.current) {
            pendingHistoryRef.current = false;
            debouncedPushHistory();
        }
    }, [objects, loaded, debouncedSaveToLocal, debouncedPushHistory]);

    const restoreSnapshot = useCallback((snapshot) => {
        setObjectsState(snapshot.objects);
        savingRef.current = true;
        setTimeout(() => { savingRef.current = false; }, 100);
    }, []);

    const undo = useCallback(() => {
        if (historyIndexRef.current <= 0) return;
        const newIndex = historyIndexRef.current - 1;
        const snapshot = history[newIndex];
        if (!snapshot) return;
        restoreSnapshot(snapshot);
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
    }, [history, restoreSnapshot]);

    const redo = useCallback(() => {
        if (historyIndexRef.current >= history.length - 1) return;
        const newIndex = historyIndexRef.current + 1;
        const snapshot = history[newIndex];
        if (!snapshot) return;
        restoreSnapshot(snapshot);
        historyIndexRef.current = newIndex;
        setHistoryIndex(newIndex);
    }, [history, restoreSnapshot]);

    const setObjects = useCallback((updater) => {
        pendingHistoryRef.current = true;
        if (typeof updater === "function") {
            setObjectsState(prev => updater(prev));
        } else {
            setObjectsState(updater);
        }
    }, []);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const clearObjects = useCallback(() => {
        localStorage.removeItem(storageKey);
        savingRef.current = true;
        setHistory([]);
        setHistoryIndex(-1);
        historyIndexRef.current = -1;
        setObjectsState([]);
        setTimeout(() => { savingRef.current = false; }, 100);
    }, [storageKey]);

    const saveObjects = useCallback(async (propertyIdToSave) => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/renders/${propertyIdToSave}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    objects_data: objectsRef.current,
                }),
            });
            if (!res.ok) throw new Error("Failed to save objects");
            clearObjects();
        } finally {
            isSavingRef.current = false;
            setSaving(false);
        }
    }, [clearObjects]);

    return {
        objects, setObjects,
        history, historyIndex,
        canUndo, canRedo,
        loaded, saving,
        undo, redo,
        clearObjects,
        saveObjects,
    };
}
