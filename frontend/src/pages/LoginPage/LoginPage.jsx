import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { thunkLogin } from "../../redux/session";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Center } from "@astryxdesign/core/Center";
import { Section } from "@astryxdesign/core/Section";

export default function LoginFormPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState({});
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        setErr({});
        setLoading(true);
        try {
            const user = await dispatch(thunkLogin({ email, password }));
            if (user.success) {
                navigate("/dashboard");
            } else {
                setErr({ server: String(user.detail || "Invalid credentials") });
            }
        } catch (err) {
            if (err.status === 404) {
                setErr({ server: "No account found with this email" });
            } else if (err.status === 401) {
                setErr({ server: "Invalid password" });
            } else {
                setErr({ server: err.message || "Server error, please try again" });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid columns={{ minWidth: 360, max: 2 }} width="100%" height="100%" style={{ flex: 1, minHeight: '100%' }}>
            {/* Left: Illustration Column */}
            <Section variant="muted" dividers={['end']} height="100%" padding={0}>
                <Center width="100%" height="100%" padding={8}>
                    <VStack align="center" gap={4} maxWidth={360}>
                        <svg viewBox="0 0 200 200" style={{ width: 180, height: 180 }} fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="20" y="80" width="160" height="100" rx="4" />
                            <polygon points="100,20 180,80 20,80" />
                            <rect x="70" y="120" width="60" height="60" rx="2" />
                            <rect x="40" y="100" width="20" height="40" rx="2" />
                            <rect x="140" y="100" width="20" height="40" rx="2" />
                        </svg>
                        <Heading level={2} justify="center">Design in 3D</Heading>
                        <Text type="supporting" justify="center">
                            Draw floorplans, furnish rooms, and visualize in 3D — all in one tool.
                        </Text>
                    </VStack>
                </Center>
            </Section>

            {/* Right: Form Column */}
            <Section variant="transparent" height="100%" padding={0}>
                <Center width="100%" height="100%" padding={8}>
                    <Card maxWidth={400} width="100%" padding={6} elevation="low">
                        <VStack gap={4} width="100%">
                            <VStack gap={1} align="center">
                                <Heading level={2} justify="center">Welcome Back</Heading>
                                <Text type="supporting" justify="center">Sign in to Home Tools</Text>
                            </VStack>

                            {err.server && (
                                <Banner
                                    status="error"
                                    title={err.server}
                                />
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                                <TextInput
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={setEmail}
                                    placeholder="you@example.com"
                                    isRequired
                                    width="100%"
                                />

                                <TextInput
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={setPassword}
                                    placeholder="Enter your password"
                                    isRequired
                                    width="100%"
                                />

                                <Button
                                    label={loading ? "Signing in..." : "Log In"}
                                    type="submit"
                                    variant="primary"
                                    width="100%"
                                    isLoading={loading}
                                    isDisabled={loading}
                                />

                                <HStack justify="center" align="center" gap={1}>
                                    <Text type="supporting">Don&apos;t have an account?</Text>
                                    <Button
                                        label="Sign up"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate("/signup")}
                                    />
                                </HStack>
                            </form>
                        </VStack>
                    </Card>
                </Center>
            </Section>
        </Grid>
    );
}
