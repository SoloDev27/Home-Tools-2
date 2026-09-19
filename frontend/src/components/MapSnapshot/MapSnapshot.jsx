import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const USA_CENTER = [-98.5795, 39.8283];
const USA_ZOOM = 3.8;

export default function MapSnapshot({ 
    map, 
    height = 160, 
    width = "100%", 
    interactive = false,
    showBadge = true 
}) {
    const containerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    // Determine center & zoom
    let center = USA_CENTER;
    let zoom = USA_ZOOM;

    if (map?.image_lat != null && map?.image_lng != null) {
        // Custom location explicitly set for the image
        center = [map.image_lng, map.image_lat];
        zoom = map.image_zoom || 11;
    } else if (map?.computed_center && Array.isArray(map.computed_center) && map.computed_center.length === 2) {
        // Default setting: where the most points are (or USA if no points)
        center = map.computed_center;
        zoom = map.computed_zoom || (map?.points_count > 0 ? 11 : USA_ZOOM);
    }

    const centerKey = `${center[0]}_${center[1]}_${zoom}`;

    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup existing instance if any
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const mapInstance = new maplibregl.Map({
            container: containerRef.current,
            center,
            zoom,
            interactive: false,
            attributionControl: false,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: "raster",
                        tiles: [
                            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        ],
                        tileSize: 256
                    }
                },
                layers: [
                    {
                        id: "osm-layer",
                        type: "raster",
                        source: "osm",
                        minzoom: 0,
                        maxzoom: 19
                    }
                ]
            }
        });

        mapInstanceRef.current = mapInstance;

        mapInstance.on("load", () => {
            mapInstance.resize();

            // Add markers for points if available
            if (map?.points_preview && map.points_preview.length > 0) {
                map.points_preview.forEach((pt) => {
                    const el = document.createElement("div");
                    el.style.width = "8px";
                    el.style.height = "8px";
                    el.style.borderRadius = "50%";
                    el.style.backgroundColor = "#EF4444";
                    el.style.border = "2px solid #FFFFFF";
                    el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.5)";
                    
                    new maplibregl.Marker({ element: el })
                        .setLngLat([pt.lng, pt.lat])
                        .addTo(mapInstance);
                });
            } else if (map?.image_lat != null && map?.image_lng != null) {
                // If a custom location is set, add a marker for it
                const el = document.createElement("div");
                el.style.width = "10px";
                el.style.height = "10px";
                el.style.borderRadius = "50%";
                el.style.backgroundColor = "#3B82F6";
                el.style.border = "2px solid #FFFFFF";
                el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.5)";

                new maplibregl.Marker({ element: el })
                    .setLngLat([map.image_lng, map.image_lat])
                    .addTo(mapInstance);
            }
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [centerKey, map?.points_preview?.length]);

    const badgeLabel = map?.image_location 
        ? map.image_location 
        : (map?.points_count > 0 ? `${map.points_count} ${map.points_count === 1 ? 'point' : 'points'} (Auto)` : "USA (Default)");

    return (
        <div style={{
            position: "relative",
            width: width,
            height: height,
            backgroundColor: "var(--color-background-muted, #1a1a1a)",
            borderBottom: "1px solid var(--color-border)",
            overflow: "hidden"
        }}>
            <div 
                ref={containerRef} 
                style={{ 
                    width: "100%", 
                    height: "100%",
                    pointerEvents: interactive ? "auto" : "none"
                }} 
            />
            {showBadge && (
                <div style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    backdropFilter: "blur(4px)",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    zIndex: 10,
                    maxWidth: "85%",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
                }}>
                    <span>📍</span>
                    <span style={{ 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap" 
                    }}>
                        {badgeLabel}
                    </span>
                </div>
            )}
        </div>
    );
}
