import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/VStack";
import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { useNavigate } from "react-router-dom";

const features = [
    { icon: "📐", title: "Floorplan Editor", desc: "Draw outlines, divide rooms, place furniture" },
    { icon: "🌍", title: "Map Integration", desc: "Pin properties on interactive maps" },
    { icon: "🏗️", title: "3D Visualization", desc: "Preview and export as GLTF" },
];

export default function HomePage() {
    const navigate = useNavigate();

    return (
        <Center width="100%" height="100%" padding={6} style={{ flex: 1, minHeight: '100%' }}>
            <VStack align="center" gap={6} width="100%">
                <Card maxWidth={440} width="100%" padding={6} elevation="low">
                    <VStack align="center" gap={4} width="100%">
                        <span style={{ fontSize: '3rem', userSelect: 'none' }}>🏠</span>
                        <VStack align="center" gap={1}>
                            <Heading level={1} type="display-3" justify="center">Home Tools</Heading>
                            <Text type="large" color="secondary" justify="center">
                                Professional floorplan design and 3D visualization
                            </Text>
                        </VStack>
                        <VStack gap={3} width="100%">
                            <Button
                                label="Get Started"
                                variant="primary"
                                size="lg"
                                width="100%"
                                onClick={() => navigate("/login")}
                            />
                            <Button
                                label="Create Account"
                                variant="secondary"
                                size="lg"
                                width="100%"
                                onClick={() => navigate("/signup")}
                            />
                        </VStack>
                    </VStack>
                </Card>

                <Grid columns={{ minWidth: 200, max: 3 }} gap={4} maxWidth={680} width="100%">
                    {features.map((f, i) => (
                        <Card key={i} padding={4} elevation="none">
                            <VStack align="center" gap={2} width="100%">
                                <span style={{ fontSize: '2rem', userSelect: 'none' }}>{f.icon}</span>
                                <Heading level={3} weight="semibold" justify="center">{f.title}</Heading>
                                <Text type="supporting" justify="center">{f.desc}</Text>
                            </VStack>
                        </Card>
                    ))}
                </Grid>
            </VStack>
        </Center>
    );
}
