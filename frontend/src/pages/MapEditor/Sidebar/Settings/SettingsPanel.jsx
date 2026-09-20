import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { thunkUpdateSettings } from "../../../../redux/settings";
import "./SettingsPanel.css";

const THEME_OPTIONS = [
    { value: "light", label: "☀️ Light" },
    { value: "dark", label: "🌙 Dark" },
    { value: "system", label: "⚙️ System" },
    { value: "blueprint", label: "📐 Blueprint" },
];

const MAP_LAYER_OPTIONS = [
    { value: "osm-layer", emoji: "🗺️", label: "Street Map (2D)" },
    { value: "satellite-layer", emoji: "🛰️", label: "Satellite (3D Views)" },
];

export default function SettingsPanel({ onClose }) {
    const dispatch = useDispatch();
    const settings = useSelector(state => state.settings);

    const handleUpdate = (updates) => {
        dispatch(thunkUpdateSettings(updates));
    };

    return (
        <div className="settings-panel">
            <div className="settings-header">
                <Heading level={4}>Editor Settings</Heading>
                <Button label="Close" variant="ghost" size="small" onClick={onClose} icon={<span>✕</span>} />
            </div>

            <div className="settings-section">
                <Text type="label" color="secondary">Visual Theme</Text>
                <div className="settings-options">
                    {THEME_OPTIONS.map(({ value, label }) => (
                        <Button
                            key={value}
                            label={label}
                            variant={settings.theme === value ? "primary" : "secondary"}
                            size="small"
                            width="100%"
                            onClick={() => handleUpdate({ theme: value })}
                        />
                    ))}
                </div>
            </div>

            <div className="settings-section">
                <h4 className="settings-section-title">Map Style</h4>
                <div className="settings-options">
                    {MAP_LAYER_OPTIONS.map(({ value, emoji, label }) => (
                        <div
                            key={value}
                            className={`settings-map-option${settings.map_layer === value ? " is-active" : ""}`}
                            onClick={() => handleUpdate({ map_layer: value })}
                        >
                            <span className="settings-map-emoji">{emoji}</span>
                            <span className="settings-map-label">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="settings-scaling">
                <Text type="label" color="secondary">Marker Scaling</Text>
                <div className="settings-section">
                    <Text type="supporting">Icon Size ({settings.icon_size}px)</Text>
                    <input
                        type="range" min="16" max="64"
                        value={settings.icon_size}
                        onChange={(e) => handleUpdate({ icon_size: parseInt(e.target.value) })}
                        className="settings-range"
                    />
                </div>
                <div className="settings-section">
                    <Text type="supporting">Label Text Size ({settings.text_size}px)</Text>
                    <input
                        type="range" min="8" max="24"
                        value={settings.text_size}
                        onChange={(e) => handleUpdate({ text_size: parseInt(e.target.value) })}
                        className="settings-range"
                    />
                </div>
            </div>
        </div>
    );
}
