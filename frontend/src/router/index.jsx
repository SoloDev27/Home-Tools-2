import { createBrowserRouter } from "react-router-dom";

import Layout from "./Layout";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import Dashboard from "../pages/Dashboard";
import MapsPage from "../pages/MapsPage";
import MapEditor from "../pages/MapEditor/MapEditor";
import UnifiedEditor from "../pages/UnifiedEditor";
import RenderHomePage from "../pages/RenderHomePage";
import RenderPage from "../pages/RenderPage";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";

export const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            {
                path: '',
                element: <HomePage />
            },
            {
                path: '/login',
                element: <LoginPage />
            },
            {
                path: '/signup',
                element: <SignupPage />
            },
            {
                path: '/dashboard',
                element: <Dashboard />
            },
            {
                path: '/maps',
                element: <MapsPage />
            },
            {
                path: '/editor/:mapId',
                element: <MapEditor />
            },
            {
                path: '/unified-editor/:mapId',
                element: <UnifiedEditor />
            },
            {
                path: '/project/:mapId',
                element: <UnifiedEditor />
            },
            {
                path: '/render',
                element: <RenderHomePage />
            },
            {
                path: '/render/*',
                element: <RenderPage />
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]
    }
])
