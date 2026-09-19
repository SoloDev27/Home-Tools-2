import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useModal } from "../../../context/Modal";
import { thunkCreateProperty, thunkEditProperty } from "../../../redux/properties";
import { handleSearchAddress } from "../../../functions/nominatim";
import "./PropertyForm.css";

export default function PropertyForm({id}) {
    const properties = useSelector(store => store.properties);
    const dispatch = useDispatch();
    const { closeModal } = useModal();
    const [name, setName] = useState('');
    const [address, setAddress] = useState(null);
    const [city, setCity] = useState(null);
    const [county, setCounty] = useState(null);
    const [state, setState] = useState(null);
    const [zip, setZip] = useState(null);
    const [country, setCountry] = useState(null);
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [groupActive, setGroupActive] = useState(null);
    const [group, setGroup] = useState(null);
    // const [pinned, setPinned] = useState(false);
    const [err, setErr] = useState({});
    const [searchAddress, setSearchAddress] = useState("")
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsActive, setSuggestionsActive] = useState(false);
    const [displayAddress, setDisplayAddress] = useState(null);
    const active = useRef(false);

    useEffect(()=> {
        if(!id) return;
        if(!properties.data) return;

        const property = properties.data.find(p => p.id === id);

        if(!property) {
            return;
        };

        setName(property.name || null);
        setAddress(property.address || null);
        setCity(property.city || null);
        setCounty(property.county || null);
        setState(property.state || null);
        setCountry(property.country || null);
        setZip(property.zip || null);
        setLat(property.lat);
        setLng(property.lng);
        
        const savedAddress = [
            property.address, property.city, property.state,
            property.county, property.country, property.zip,
        ].filter(Boolean).join(", ");

        setDisplayAddress(savedAddress);
        setSearchAddress(savedAddress);

        // if(property.pinned || property.group) {
        //     active.current = true;
        //     setPinned(property.pinned);
        //     if(property.group) {
        //         setGroupActive(true);
        //         setGroup(property.group);
        //     };
        // };

    }, [id]);

    useEffect(()=> {
        if(!searchAddress) {
            setSuggestionsActive(false);
            setSuggestions([]);
            return;
        } else {
            setSuggestionsActive(true);
        };

        if(searchAddress.length > 2) {
            const searchDelay = setTimeout(()=> {
                handleSearchAddress(searchAddress)
                    .then(data => setSuggestions(data))
                    .catch(err => setErr({search: err}));
            }, 500);

            return () => {
                clearTimeout(searchDelay);
            };
        };
    }, [searchAddress]);

    const handleSetAddress = (e, addrObj) => {
        e.preventDefault();
        setSuggestionsActive(false);

        setAddress(addrObj.address ? addrObj.address : null);
        setCity(addrObj.city ? addrObj.city : null);
        setCounty(addrObj.county ? addrObj.county : null);
        setState(addrObj.state ? addrObj.state : null);
        setCountry(addrObj.country ? addrObj.country : null);
        setZip(addrObj.zip ? addrObj.zip : null);
        setLat(addrObj.lat);
        setLng(addrObj.lng);
        setDisplayAddress(addrObj.text);

        if(addrObj.name !== null && addrObj.name.trim() !== "") {
            setName(addrObj.name);
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErr({});

        if(!lng || !lat) return;

        const prop = {
            name,
            lat: Number(lat),
            lng: Number(lng),
            address,
            city,
            county,
            state,
            country,
            zip
        };

        try {
            if(active.current) {
                // prop["pinned"] = pinned;
                // Group logic later
            }

            const res = id
                ? await dispatch(thunkEditProperty(id, prop))
                : await dispatch(thunkCreateProperty(prop));
            
            if(res.success) {
                closeModal();
            } else {
                setErr({server: res.detail})
            }
            
        } catch(err) {
            setErr({server: err})
        }
    };

    return (
        <>
        {id ? (<h2>Edit Property</h2>): (<h2>Create Property</h2>)}

        <form id="create-prop-form" onSubmit={handleSubmit}>

            <div className="form-group">
                <label htmlFor="create-prop-search">Search Address:</label>
                <input 
                    type="text" 
                    name="address" 
                    id="create-prop-search" 
                    value={searchAddress} 
                    onChange={(e)=> setSearchAddress(e.target.value)}
                />
            </div>

            {suggestionsActive && (
                <ul id="suggestion-bar">
                    {suggestions ? suggestions.map((loc, i) => (
                        <li 
                            key={i} 
                            className="address-choice"  
                            onClick={(e)=> handleSetAddress(e, loc)}>
                            {loc.text}
                        </li>
                    )) : (
                        <li>Search after 3 characters...</li>
                    )}
                </ul>
            )}

            <div className="form-group">
                <label htmlFor="create-prop-name">Name:</label>
                <input 
                    type="text" 
                    name="name" 
                    id="create-prop-name"
                    value={name} 
                    onChange={(e)=> setName(e.target.value)}
                    required
                />
            </div>

            {err.name && (<p>{err.name}</p>)}

            <div className="form-group">
                <label htmlFor="">Address:</label>
                <input 
                    type="text" 
                    name="address" 
                    id="create-prop-address" 
                    value={displayAddress} 
                    disabled
                />
            </div>
            
            {err.address && (<p>{err.address}</p>)}
            
            <details open={active.current}>
                <summary onClick={()=> active.current = !active.current}>Advanced</summary>
                <ul id="extra-create-selection">
                    <li>
                        <input 
                            type="checkbox" 
                            name="group" 
                            id="create-prop-group" 
                            onChange={(e)=> setGroupActive(e.target.checked)} 
                        />
                        Add Group
                        {groupActive && (
                            // Dropdown with all user groups
                            <></>
                        )}
                    </li>
                    {/* <li>
                        <input 
                            type="checkbox" 
                            name="pinned" 
                            id="create-prop-pinned" 
                            checked={pinned} 
                            onChange={(e)=> setPinned(e.target.checked)} 
                        />
                        Pinned
                    </li> */}
                </ul>
            </details>
            {err.client && (<p>{err.client}</p>)}
            <button 
                type="submit"
                disabled={!lat || !lng || !name?.length}
            >Submit</button>
        </form>
        </>
        
    )
}
