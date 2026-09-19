import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { thunkUpdateSettings } from "../../../../redux/settings";

export default function SettingsPanel({ onClose }) {
    const dispatch = useDispatch();
    const settings = useSelector(state => state.settings);

    const handleUpdate = (updates) => {
        dispatch(thunkUpdateSettings(updates));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 12px', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                <Heading level={4}>Editor Settings</Heading>
                <Button label="Close" variant="ghost" size="small" onClick={onClose} icon={<span>✕</span>} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text type="label" color="secondary">Visual Theme</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Button
                        label="☀️ Light"
                        variant={settings.theme === "light" ? "primary" : "secondary"}
                        size="small"
                        width="100%"
                        onClick={() => handleUpdate({ theme: "light" })}
                    />
                    <Button
                        label="🌙 Dark"
                        variant={settings.theme === "dark" ? "primary" : "secondary"}
                        size="small"
                        width="100%"
                        onClick={() => handleUpdate({ theme: "dark" })}
                    />
                    <Button
                        label="⚙️ System"
                        variant={settings.theme === "system" ? "primary" : "secondary"}
                        size="small"
                        width="100%"
                        onClick={() => handleUpdate({ theme: "system" })}
                    />
                    <Button
                        label="📐 Blueprint"
                        variant={settings.theme === "blueprint" ? "primary" : "secondary"}
                        size="small"
                        width="100%"
                        onClick={() => handleUpdate({ theme: "blueprint" })}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Map Style</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div 
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: settings.map_layer === "osm-layer" ? '1px solid var(--color-border)' : '1px solid transparent',
                            backgroundColor: settings.map_layer === "osm-layer" ? 'var(--color-border)' : 'var(--color-background-card)'
                        }}
                        onClick={() => handleUpdate({ map_layer: "osm-layer" })}
                    >
                        <span style={{ fontSize: '18px' }}>🗺️</span>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>Street Map (2D)</span>
                    </div>
                    <div 
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: settings.map_layer === "satellite-layer" ? '1px solid var(--color-border)' : '1px solid transparent',
                            backgroundColor: settings.map_layer === "satellite-layer" ? 'var(--color-border)' : 'var(--color-background-card)'
                        }}
                        onClick={() => handleUpdate({ map_layer: "satellite-layer" })}
                    >
                        <span style={{ fontSize: '18px' }}>🛰️</span>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>Satellite (3D Views)</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                <Text type="label" color="secondary">Marker Scaling</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Text type="supporting">Icon Size ({settings.icon_size}px)</Text>
                    <input
                        type="range" min="16" max="64"
                        value={settings.icon_size}
                        onChange={(e) => handleUpdate({ icon_size: parseInt(e.target.value) })}
                        style={{ width: '100%', cursor: 'pointer' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Text type="supporting">Label Text Size ({settings.text_size}px)</Text>
                    <input
                        type="range" min="8" max="24"
                        value={settings.text_size}
                        onChange={(e) => handleUpdate({ text_size: parseInt(e.target.value) })}
                        style={{ width: '100%', cursor: 'pointer' }}
                    />
                </div>
            </div>
        </div>
    );
}
