import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";

import { reverseLookupAddress } from "../../../functions/nominatim";
import { useModal } from "../../../context/Modal";
import "./EditPointPopup.css"

export default function EditPointPopup({
    point, 
    isSaved,
    allPoints = [], // New prop for linking
    addFunc,
    deleteFunc,
    changeFunc
}) {
    const [name, setName] = useState(point?.name || "");
    const [location, setLocation] = useState(null);
    const [icon, setIcon] = useState(point?.icon || "");
    const [radius, setRadius] = useState(point?.radius || 0);
    const [type, setType] = useState(point?.type || "marker");
    const [length, setLength] = useState(point?.length || 0);
    const [err, setErr] = useState({});
    const [initialState, setInitialState] = useState({});
    const [loaded, setLoaded] = useState(false);
    const [unitList, setUnitList] = useState(point?.extra_info?.units?.join(", ") || ""); // For Apartments
    const [unitId, setUnitId] = useState(point?.unit_id || ""); // For Units — links unit points to parent properties
    const { closeModal } = useModal();

    useEffect(()=> {
        let newName = point?.name || "";
        if(newName.includes("(Unsaved)")) {
            newName = newName.split("(Unsaved)")[1].trim();
            setName(newName);
        }
        
        setInitialState({
            name: newName,
            type: point?.type,
            icon: point?.icon,
            radius: point?.radius,
            length: point?.length
        });

        if(point?.type) {
            setType(point.type);
            if(point.type === "icon") setIcon(point.icon);
            else if(point.type === "radius") setRadius(point.radius);
            else if(point.type === "line") setLength(point.length);
        };

        if(point?.location) {
            setLoaded(true)
        } else {
            reverseLookupAddress(point?.lng, point?.lat)
                .then(data => {
                    setLocation(data.text);
                    setLoaded(true);
                })
                .catch(e => {
                    setErr({e});
                    setLoaded(true);
                });
        }

        if(point?.extra_info?.units) {
            setUnitList(point.extra_info.units.join(", "));
        }
        if(point?.unit_id) {
            setUnitId(point.unit_id);
        }
    }, [point]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setErr({});

        const updatedPoint = {
            ...point,
            name,
            type,
            icon: (type === "icon" || type === "home" || type === "apartment" || type === "unit") ? icon : null,
            radius: type === "radius" ? Number(radius) : null,
            endLng: type === "line" ? point.endLng : null,
            endLat: type === "line" ? point.endLat : null,
            unit_id: type === "unit" ? (Number(unitId) || null) : null,
            extra_info: type === "apartment" ? { units: unitList.split(",").map(u => u.trim()).filter(u => u) } : point.extra_info
        };

        if (isSaved) {
            changeFunc(point.id, {
                name,
                type,
                icon: (type === "point" || type === "home" || type === "apartment" || type === "unit") ? icon : null,
                radius: type === "radius" ? Number(radius) : null,
                unit_id: type === "unit" ? (Number(unitId) || null) : null,
                extra_info: type === "apartment" ? { units: unitList.split(",").map(u => u.trim()).filter(u => u) } : point.extra_info
            });
        } else {
            addFunc(updatedPoint);
        }
        
        closeModal();
    };
    
    const handleDelete = (e) => {
        e.preventDefault();
        setErr({});
        deleteFunc(point.id);
        closeModal();
    };

    const handleTypeChange = (newType) => {
        setType(newType);
    };

    return point ? (
        <form 
            onSubmit={handleSubmit}
            className={!loaded ? "hidden" : "manage-points-form"}
        >
            <div className="form-group">
                <label htmlFor="point-name">Name:</label>
                <input 
                    type="text" 
                    name="point-name" 
                    id="point-name" 
                    value={name}
                    onChange={(e)=> setName(e.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="point-location">Location:</label>
                <input 
                    type="text" 
                    name="point-location" 
                    id="point-location" 
                    value={location || "Loading address..."} 
                    disabled 
                />
            </div>

            <div className="form-group">
                <label htmlFor="point-type">Type:</label>
                <select 
                    name="point-type" 
                    id="point-type" 
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                >
                    {/* Category: Properties */}
                    {["home", "apartment", "unit"].includes(point?.type) && (
                        <>
                            <option value="home">Home</option>
                            <option value="apartment">Apartment</option>
                            <option value="unit">Unit</option>
                        </>
                    )}
                    {/* Category: Points */}
                    {["point", "line", "radius"].includes(point?.type) && (
                        <>
                            <option value="point">Point</option>
                            <option value="radius">Radius</option>
                            <option value="line">Line</option>
                        </>
                    )}
                    {/* Fallback for legacy items */}
                    {!["home", "apartment", "unit", "point", "line", "radius"].includes(point?.type) && (
                        <>
                            <option value="point">Point</option>
                            <option value="home">Home</option>
                            <option value="apartment">Apartment</option>
                            <option value="unit">Unit</option>
                            <option value="radius">Radius</option>
                            <option value="line">Line</option>
                        </>
                    )}
                </select>
            </div>

            {type === "apartment" && (
                <div className="form-group">
                    <label htmlFor="apartment-units">Units / Room Numbers (comma-separated):</label>
                    <textarea 
                        id="apartment-units"
                        value={unitList}
                        onChange={(e) => setUnitList(e.target.value)}
                        placeholder="e.g. 101, 102, 201"
                    />
                </div>
            )}

            {type === "unit" && (
                <div className="form-group">
                    <label htmlFor="unit-parent">Connect to Head Unit:</label>
                    <select 
                        id="unit-parent"
                        value={unitId}
                        onChange={(e) => setUnitId(e.target.value)}
                    >
                        <option value="">-- No Connection --</option>
                        {allPoints.filter(p => (p.type === "unit" || p.type === "home") && p.id !== point.id).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {type === "point" && (
                <div className="form-group">
                <label htmlFor="point-icon">Icon:</label>
                <input 
                    type="text" 
                    name="point-icon" 
                    id="point-icon"
                    value={icon}
                    onChange={(e)=> setIcon(e.target.value)}
                    placeholder="e.emoji: 🏠 or path /icons/..."
                />
                </div>
            )}

            {type === "line" && (
                <div className="form-group">
                <label htmlFor="point-length">Length (meters):</label>
                <input 
                    type="number" 
                    name="point-length" 
                    id="point-length"
                    value={length}
                    onChange={(e)=> setLength(e.target.value)}
                    disabled
                />
                <p className="hint">Length is calculated by dragging the line endpoints on the map.</p>
                </div>
            )}

            {type === "radius" && (
                <div className="form-group">
                <label htmlFor="point-radius">Radius (meters):</label>
                <input 
                    type="number" 
                    name="point-radius" 
                    id="point-radius" 
                    value={radius}
                    onChange={(e)=> setRadius(e.target.value)}
                    step="0.01"
                />
                </div>
            )}

            {err.e && (<p className="error-msg">{String(err.e)}</p>)}

            <div className="modal-actions">
                <button type="submit" className="primary-btn">
                    {isSaved ? "Update" : "Save point"}
                </button>
                <button type="button" onClick={handleDelete} className="delete-btn">
                    Delete
                </button>
            </div>
        </form>
    ) : (
        <div className="error-container">
            <h3>404</h3>
            <p>Point not found.</p>
        </div>
    )
}