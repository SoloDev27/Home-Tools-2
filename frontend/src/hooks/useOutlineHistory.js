import { useState, useEffect, useRef, useCallback } from "react";
import { debounce } from "../functions/map";

const TTL = 6 * 60 * 60 * 1000;

export default function useOutlineHistory(propertyId) {
    const storageKey = `render_${propertyId || "new"}_outlines`;

    const [outlines, setOutlinesState] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    const outlinesRef = useRef([]);
    const historyIndexRef = useRef(-1);
    const pendingHistoryRef = useRef(false);
    const savingRef = useRef(false);
    const isSavingRef = useRef(false);

    useEffect(() => { outlinesRef.current = outlines; }, [outlines]);

    const debouncedSaveToLocal = useRef(debounce(() => {
        if (savingRef.current || isSavingRef.current) return;
        localStorage.setItem(storageKey, JSON.stringify({
            data: outlinesRef.current,
            expires: Date.now() + TTL,
        }));
    }, 2000)).current;

    const debouncedPushHistory = useRef(debounce(() => {
        const snapshot = { outlines: [...outlinesRef.current] };
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
            setOutlinesState(parsed.data);
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
    }, [outlines, loaded, debouncedSaveToLocal, debouncedPushHistory]);

    const restoreSnapshot = useCallback((snapshot) => {
        setOutlinesState(snapshot.outlines);
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

    const setOutlines = useCallback(( updater ) => {
        pendingHistoryRef.current = true;
        if (typeof updater === "function") {
            setOutlinesState(prev => updater(prev));
        } else {
            setOutlinesState(updater);
        }
    }, []);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const clearOutlines = useCallback(() => {
        localStorage.removeItem(storageKey);
        savingRef.current = true;
        setHistory([]);
        setHistoryIndex(-1);
        historyIndexRef.current = -1;
        setOutlinesState([]);
        setTimeout(() => { savingRef.current = false; }, 100);
    }, [storageKey]);

    const saveOutlines = useCallback(async (propertyIdToSave) => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/renders/${propertyIdToSave}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    has_outline: outlinesRef.current.length > 0,
                    outlines_data: outlinesRef.current,
                }),
            });
            if (!res.ok) throw new Error("Failed to save outlines");
            clearOutlines();
        } finally {
            isSavingRef.current = false;
            setSaving(false);
        }
    }, [clearOutlines]);

    return {
        outlines, setOutlines,
        history, historyIndex,
        canUndo, canRedo,
        loaded, saving,
        undo, redo,
        clearOutlines,
        saveOutlines,
    };
}
