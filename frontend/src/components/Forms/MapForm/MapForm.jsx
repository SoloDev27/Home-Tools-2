import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { useModal } from "../../../context/Modal";
import { thunkCreateMap, thunkUpdateMap } from "../../../redux/maps";
import { handleSearchAddress } from "../../../functions/nominatim";
import MapSnapshot from "../../MapSnapshot";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Search, RotateCcw, MapPin } from "lucide-react";

const USA_CENTER = [-98.5795, 39.8283];
const COMMON_SYMBOLS = "!@#$%?.-,':;_&()";
const ALLOWED_NAME_CHARS = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ${COMMON_SYMBOLS}`;
const ALLOWED_DESC_CHARS = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 \n${COMMON_SYMBOLS}`;

export default function MapForm({ mapId, initialData, onSuccess }) {
    const pointsCount = initialData?.points_count || 0;
    const hasPoints = pointsCount > 0;

    // Default points center or USA center
    const defaultCenter = useMemo(() => {
        if (initialData?.computed_center && Array.isArray(initialData.computed_center)) {
            return initialData.computed_center;
        }
        return USA_CENTER;
    }, [initialData?.computed_center]);

    const defaultZoom = initialData?.computed_zoom || (hasPoints ? 12 : 4);

    // Initial location:
    // If a custom location was explicitly set, use it.
    // If no custom location was set:
    //   - If has points: default shows the points default label
    //   - If no points: empty (default is USA)
    const initialLocationText = initialData?.image_location || "";
    
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [imageLocation, setImageLocation] = useState(initialLocationText);
    const [imageLat, setImageLat] = useState(initialData?.image_lat ?? null);
    const [imageLng, setImageLng] = useState(initialData?.image_lng ?? null);
    const [imageZoom, setImageZoom] = useState(initialData?.image_zoom ?? null);

    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [nameErr, setNameErr] = useState("");
    const [descErr, setDescErr] = useState("");

    const searchTimeoutRef = useRef(null);
    const dispatch = useDispatch();
    const { closeModal } = useModal();

    // Handle Map Name change with 25 char limit & allowed characters
    const handleNameChange = (val) => {
        const str = typeof val === "string" ? val : val?.target?.value ?? "";
        let filtered = "";
        for (let i = 0; i < str.length; i++) {
            if (ALLOWED_NAME_CHARS.includes(str[i])) {
                filtered += str[i];
                if (filtered.length >= 25) break;
            }
        }
        setName(filtered);
        if (nameErr) setNameErr("");
        if (err) setErr("");
    };

    // Handle Description change with 125 char limit & allowed characters
    const handleDescriptionChange = (val) => {
        const str = typeof val === "string" ? val : val?.target?.value ?? "";
        let filtered = "";
        for (let i = 0; i < str.length; i++) {
            if (ALLOWED_DESC_CHARS.includes(str[i])) {
                filtered += str[i];
                if (filtered.length >= 125) break;
            }
        }
        setDescription(filtered);
        if (descErr) setDescErr("");
        if (err) setErr("");
    };

    // Handle address / location search
    const handleLocationChange = (val) => {
        const str = typeof val === "string" ? val : val?.target?.value ?? "";
        setImageLocation(str);
        setErr("");

        if (!str || str.trim().length < 3) {
            setSuggestions([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await handleSearchAddress(str);
                setSuggestions(results || []);
            } catch (e) {
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 350);
    };

    // Select suggestion from dropdown
    const handleSelectSuggestion = (item) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        setImageLocation(item.text || item.name || "");
        setImageLat(lat);
        setImageLng(lng);
        setImageZoom(12);
        setSuggestions([]);
    };

    // Reset to default location
    const handleResetLocation = () => {
        if (hasPoints) {
            // Revert to where the most points are
            const ptsText = pointsCount === 1 ? "1 point" : `${pointsCount} points`;
            setImageLocation(`Auto: Where most points are (${ptsText})`);
            setImageLat(defaultCenter[1]);
            setImageLng(defaultCenter[0]);
            setImageZoom(defaultZoom);
        } else {
            // Can be empty when there are no points; default is USA
            setImageLocation("");
            setImageLat(null);
            setImageLng(null);
            setImageZoom(null);
        }
        setSuggestions([]);
    };

    // Construct preview object for MapSnapshot
    const previewMap = useMemo(() => {
        const ptsText = pointsCount === 1 ? "1 point" : `${pointsCount} points`;
        return {
            ...initialData,
            image_location: imageLocation.trim() || (hasPoints ? `Where most points are (${ptsText})` : "USA (Default)"),
            image_lat: imageLat,
            image_lng: imageLng,
            image_zoom: imageZoom,
            computed_center: defaultCenter,
            computed_zoom: defaultZoom,
            points_preview: initialData?.points_preview || [],
            points_count: pointsCount
        };
    }, [initialData, imageLocation, imageLat, imageLng, imageZoom, defaultCenter, defaultZoom, pointsCount, hasPoints]);

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        setErr("");
        setNameErr("");
        setDescErr("");

        // Validate Map Name
        const trimmedName = name.trim();
        if (!trimmedName) {
            setNameErr("Map Name is required and cannot be empty.");
            return;
        }
        if (name.length > 25) {
            setNameErr("Map Name must be 25 characters or less.");
            return;
        }
        for (let i = 0; i < name.length; i++) {
            if (!ALLOWED_NAME_CHARS.includes(name[i])) {
                setNameErr(`Allowed: letters, numbers, spaces, and ${COMMON_SYMBOLS}`);
                return;
            }
        }

        // Validate Description
        if (description && description.length > 125) {
            setDescErr("Description must be 125 characters or less.");
            return;
        }
        if (description) {
            for (let i = 0; i < description.length; i++) {
                if (!ALLOWED_DESC_CHARS.includes(description[i])) {
                    setDescErr(`Allowed: letters, numbers, spaces, and ${COMMON_SYMBOLS}`);
                    return;
                }
            }
        }

        // Check rule: Once a location is set, the field can only be empty when there's no point
        const trimmedLoc = imageLocation.trim();
        let finalLoc = trimmedLoc;
        let finalLat = imageLat;
        let finalLng = imageLng;
        let finalZoom = imageZoom;

        if (!trimmedLoc) {
            if (hasPoints && initialData?.image_location) {
                setErr("The image location field can only be empty when there are no points on the map.");
                return;
            } else {
                // Empty is allowed when no points; defaults over USA
                finalLoc = null;
                finalLat = null;
                finalLng = null;
                finalZoom = null;
            }
        }

        setLoading(true);

        const mapData = {
            name: trimmedName,
            description: description.trim() || null,
            image_location: finalLoc,
            image_lat: finalLat,
            image_lng: finalLng,
            image_zoom: finalZoom
        };

        let res;
        if (mapId) {
            res = await dispatch(thunkUpdateMap(mapId, mapData));
        } else {
            res = await dispatch(thunkCreateMap(mapData));
        }

        setLoading(false);
        if (res.success) {
            if (onSuccess) onSuccess(res.data);
            closeModal();
        } else {
            setErr(res.detail || "An error occurred");
        }
    };

    return (
        <Card maxWidth={520} width="100%" padding={6} elevation="med">
            <VStack gap={4} width="100%">
                {/* Map Snapshot Preview above Edit Map Header */}
                <div style={{ 
                    borderRadius: 8, 
                    overflow: 'hidden', 
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    width: '100%'
                }}>
                    <MapSnapshot map={previewMap} height={160} />
                </div>

                <Heading level={2}>{mapId ? "Edit Map" : "Create New Map"}</Heading>
                
                {err && <Banner status="error" title={err} />}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <TextInput 
                            label="Map Name"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="e.g. Dream House"
                            isRequired 
                            width="100%"
                            status={nameErr ? { type: 'error', message: nameErr } : undefined}
                        />
                        <span style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            fontSize: '11px',
                            color: name.length >= 25 ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-secondary, #94a3b8)',
                            pointerEvents: 'none'
                        }}>
                            {name.length}/25
                        </span>
                    </div>

                    {/* Address Input directly under the map */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <TextInput
                            label="Enter an address"
                            isOptional
                            value={imageLocation}
                            onChange={handleLocationChange}
                            placeholder="Enter an address"
                            width="100%"
                        />
                        {isSearching && (
                            <span style={{
                                position: 'absolute',
                                right: 12,
                                bottom: 12,
                                fontSize: '11px',
                                color: 'var(--color-text-secondary)',
                                pointerEvents: 'none',
                                zIndex: 3
                            }}>
                                Searching...
                            </span>
                        )}
                        {(imageLocation || imageLat != null) && (
                            <button
                                type="button"
                                onClick={handleResetLocation}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-primary, #3B82F6)',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 4px',
                                    zIndex: 2
                                }}
                            >
                                <RotateCcw size={12} /> Reset to Default
                            </button>
                        )}

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                backgroundColor: 'var(--color-background-surface, #262626)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 6,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                maxHeight: 180,
                                overflowY: 'auto',
                                marginTop: 4
                            }}>
                                {suggestions.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectSuggestion(item)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            borderBottom: idx < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                                            transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background-muted)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <MapPin size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.text || item.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="no-drag-textarea" style={{ position: 'relative', width: '100%' }}>
                        <TextArea 
                            label="Description"
                            value={description}
                            onChange={handleDescriptionChange}
                            placeholder="Details about this map..."
                            rows={3}
                            isOptional 
                            width="100%"
                            status={descErr ? { type: 'error', message: descErr } : undefined}
                            ref={(el) => { if (el) el.style.setProperty('resize', 'none', 'important'); }}
                        />
                        <span style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            fontSize: '11px',
                            color: description.length >= 125 ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-secondary, #94a3b8)',
                            pointerEvents: 'none'
                        }}>
                            {description.length}/125
                        </span>
                    </div>

                    <HStack justify="end" gap={2} style={{ marginTop: 8 }}>
                        <Button label="Cancel" variant="secondary" onClick={closeModal} />
                        <Button 
                            label={loading ? "Saving..." : "Save"} 
                            type="submit" 
                            variant="primary" 
                            isLoading={loading}
                            isDisabled={loading}
                        />
                    </HStack>
                </form>
            </VStack>
        </Card>
    );
}
