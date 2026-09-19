import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { ModalButton } from "../../context/Modal";
import MapForm from "../Forms/MapForm";
import MapSnapshot from "../MapSnapshot";
import { Trash2, Edit } from "lucide-react";

export default function MapCard({ map, onDelete, onSelect }) {
    return (
        <div 
            onClick={onSelect}
            style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Card padding={0} elevation="low" width="100%" style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <MapSnapshot map={map} height={160} />
                <div style={{ padding: 16, minWidth: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <VStack gap={2} width="100%" style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }} title={map.name}>
                            <Heading 
                                level={3} 
                                weight="semibold"
                                maxLines={1}
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    width: '100%',
                                    display: 'block'
                                }}
                            >
                                {map.name}
                            </Heading>
                        </div>
                        <div style={{ minHeight: 60, height: 60, overflow: 'hidden', display: 'flex', alignItems: 'flex-start' }}>
                            <Text 
                                type="supporting" 
                                maxLines={3} 
                                style={{ 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    wordBreak: 'break-word',
                                    lineHeight: '1.4'
                                }}
                            >
                                {map.description || "No description provided."}
                            </Text>
                        </div>
                    </VStack>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background-surface)', marginTop: 'auto' }}>
                    <Text type="supporting" size="sm">
                        Created: {new Date(map.created_at).toLocaleDateString()}
                    </Text>
                    <HStack gap={1} align="center">
                        <div onClick={(e) => e.stopPropagation()}>
                            <ModalButton
                                modalComponent={<MapForm mapId={map.id} initialData={map} />}
                                itemText={
                                    <Button 
                                        label="Edit"
                                        isIconOnly
                                        variant="ghost" 
                                        size="sm"
                                        icon={<Edit size={16} />}
                                    />
                                }
                            />
                        </div>
                        <Button 
                            label="Delete"
                            isIconOnly
                            variant="destructive" 
                            size="sm"
                            icon={<Trash2 size={16} />}
                            onClick={(e) => onDelete(e, map.id)}
                        />
                    </HStack>
                </div>
            </Card>
        </div>
    );
}
