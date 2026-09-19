


import { Center } from "@astryxdesign/core/Center";
import { Text } from "@astryxdesign/core/Text";

export default function Footer() {
    return (
        <Center as="footer" paddingBlock={4} paddingInline={6} width="100%" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-surface)' }}>
            <Text type="supporting" color="secondary">
                © 2026 Home Tools. All rights reserved.
            </Text>
        </Center>
    );
}