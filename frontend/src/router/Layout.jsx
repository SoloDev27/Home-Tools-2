import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { thunkSessions as sessions } from "../redux/session";
import { thunkGetSettings } from "../redux/settings";
import { Outlet, useLocation } from "react-router-dom";

import { ModalProvider, Modal } from "../context/Modal";
import Navbar from "../components/Page/Navbar";
import Footer from "../components/Page/Footer";
import ErrorBoundary from "../components/ErrorBoundary";
import ScreenSizeOverlay from "../components/ScreenSizeOverlay/ScreenSizeOverlay";

export default function Layout() {
    const dispatch = useDispatch();
    const settings = useSelector(state => state.settings);
    const [isLoaded, setIsLoaded] = useState(false);
    const location = useLocation();
    
    const isCanvasPage = location.pathname.startsWith("/editor") || 
                         location.pathname.startsWith("/render") || 
                         location.pathname.startsWith("/unified-editor") || 
                         location.pathname.startsWith("/project");

    useEffect(()=> {
        dispatch(sessions())
            .then(() => dispatch(thunkGetSettings()))
            .then(()=> setIsLoaded(true))
            .catch(() => setIsLoaded(true));
    }, [dispatch]);

    return (
        <ErrorBoundary>
            <ModalProvider>
                <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-background-body)', color: 'var(--color-text-primary)' }}>
                    {!isCanvasPage && <Navbar isLoaded={isLoaded} />}
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%' }}>
                        {isLoaded ? <Outlet /> : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>Loading...</div>}
                    </main>
                    {!isCanvasPage && <Footer />}
                    <Modal />
                    <ScreenSizeOverlay />
                </div>
            </ModalProvider>
        </ErrorBoundary>
    );
}