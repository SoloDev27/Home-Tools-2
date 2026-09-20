import { useNavigate } from "react-router-dom";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { VStack } from "@astryxdesign/core/VStack";
import { Text } from "@astryxdesign/core/Text";

/**
 * Rebuilt on Astryx. This page used Tailwind utility classes and shadcn tokens
 * (bg-background, text-primary, ...) — both removed with the shadcn layer — so it
 * was rendering as unstyled text.
 */
export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Center width="100%" style={{ flex: 1 }}>
            <VStack align="center" gap={3} padding={6} style={{ maxWidth: 420, textAlign: "center" }}>
                <Text type="display-1" weight="bold" color="accent">404</Text>
                <Text type="body" size="xl" weight="semibold">Page Not Found</Text>
                <Text type="supporting" justify="center">
                    The page you requested does not exist or has been moved.
                </Text>
                <Button label="Go Home" variant="primary" onClick={() => navigate("/")} />
            </VStack>
        </Center>
    );
}
