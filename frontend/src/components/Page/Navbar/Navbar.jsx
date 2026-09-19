import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { useSelector, useDispatch } from "react-redux";
import { thunkLogout } from "../../../redux/session";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";

export default function Navbar({ isLoaded }) {
    const user = useSelector((store) => store.session.user);
    const navigate = useNavigate();
    const location = useLocation();
    const startLocations = useRef(new Set(["/", "", "/login", "/signup"]));
    const dispatch = useDispatch();

    useEffect(() => {
        if (!isLoaded) return;

        if (user) {
            if (startLocations.current.has(location.pathname)) {
                navigate("/dashboard");
            }
        } else {
            if (!startLocations.current.has(location.pathname)) {
                navigate("/");
            }
        }
    }, [isLoaded, user, location, navigate]);

    const logout = async (e) => {
        e?.preventDefault?.();
        await dispatch(thunkLogout());
    };

    return (
        <header id="navbar" style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-surface)', zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text weight="bold" size="lg">Dashboard</Text>
            </div>

            {!user ? (
                <HStack align="center" gap={2}>
                    <Button label="Login" variant="ghost" size="sm" onClick={() => navigate('/login')} />
                    <Button label="Sign Up" variant="primary" size="sm" onClick={() => navigate('/signup')} />
                </HStack>
            ) : (
                <HStack align="center" gap={2}>
                    <Button label="Logout" variant="secondary" size="sm" onClick={logout} />
                </HStack>
            )}
        </header>
    );
}