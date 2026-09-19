import { useState, useEffect } from "react";
import { MonitorX } from "lucide-react";

export default function ScreenSizeOverlay({ minWidth = 768, minHeight = 500 }) {
    const [dimensions, setDimensions] = useState(() => ({
        width: typeof window !== "undefined" ? window.innerWidth : 1024,
        height: typeof window !== "undefined" ? window.innerHeight : 768
    }));

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isTooSmall = dimensions.width < minWidth || dimensions.height < minHeight;

    if (!isTooSmall) return null;

    return (
        <div
            id="screen-too-small-overlay"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px",
                textAlign: "center",
                boxSizing: "border-box"
            }}
        >
            <div
                style={{
                    maxWidth: "440px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px"
                }}
            >
                <div
                    style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "4px"
                    }}
                >
                    <MonitorX size={32} color="#475569" />
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Screen Size Is Too Small
                </h2>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#475569", margin: 0 }}>
                    This workspace requires a minimum screen size of{" "}
                    <strong>
                        {minWidth} × {minHeight}px
                    </strong>
                    . Please resize or expand your browser window to continue.
                </p>
                <div
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "#64748b"
                    }}
                >
                    Current window: {dimensions.width} × {dimensions.height}px
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                    A mobile version will be available soon.
                </p>
            </div>
        </div>
    );
}
