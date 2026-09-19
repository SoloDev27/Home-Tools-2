import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { thunkSignup } from "../../redux/session";
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

export default function SignupFormPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [err, setErr] = useState({});
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        setErr({});
        const SYMBOL = "!@#$%?.-";
        const ALLOWED = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789${SYMBOL}`;

        if (confirmPwd !== password) {
            return setErr({ server: "Passwords don't match" });
        }

        if (password.length < 8 || password.length > 25) {
            return setErr({ server: "Password must be 8-25 characters" });
        }

        let symbolCheck = false;
        let upperCaseCheck = false;
        let numberCheck = false;

        for (let i = 0; i < password.length; i++) {
            if (!ALLOWED.includes(password[i])) {
                return setErr({
                    server: "Password contains characters not allowed. Only A-Z, 0-9, and " + SYMBOL
                });
            }
            if (isFinite(Number(password[i]))) numberCheck = true;
            if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(password[i])) upperCaseCheck = true;
            if (SYMBOL.includes(password[i])) symbolCheck = true;
        }

        if (!symbolCheck || !upperCaseCheck || !numberCheck) {
            return setErr({
                server: `Password must contain at least 1 uppercase, 1 number, and 1 special character: ${SYMBOL}`
            });
        }

        setLoading(true);
        try {
            const signup = await dispatch(thunkSignup({ email, password }));
            if (signup.success) {
                navigate("/dashboard");
            } else {
                setErr({ server: signup.detail || "Sign up failed" });
            }
        } catch (e) {
            setErr({ server: String(e) });
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
                        <Heading level={2} justify="center">Build Your Space</Heading>
                        <Text type="supporting" justify="center">
                            Create floorplans, add furniture, and explore in 3D.
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
                                <Heading level={2} justify="center">Create Account</Heading>
                                <Text type="supporting" justify="center">Get started with Home Tools</Text>
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
                                    placeholder="Create a password"
                                    isRequired
                                    width="100%"
                                />

                                <TextInput
                                    label="Confirm Password"
                                    type="password"
                                    value={confirmPwd}
                                    onChange={setConfirmPwd}
                                    placeholder="Confirm your password"
                                    isRequired
                                    width="100%"
                                />

                                <Button
                                    label={loading ? "Creating account..." : "Create Account"}
                                    type="submit"
                                    variant="primary"
                                    width="100%"
                                    isLoading={loading}
                                    isDisabled={loading}
                                />

                                <HStack justify="center" align="center" gap={1}>
                                    <Text type="supporting">Already have an account?</Text>
                                    <Button
                                        label="Log in"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate("/login")}
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
