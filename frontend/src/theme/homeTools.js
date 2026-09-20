import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * Home Tools 2 — the locked design system.
 *
 * Extracted from two dark, data-dense desktop-app references (see /design.md at the
 * repo root). Everything visual lives here: seed colour, type, radius, motion, and the
 * explicit surface overrides. Pages must not hand-write colours, radii or durations.
 *
 * `contrast: 'high'` is deliberate — this is inspection-grade data, and the higher
 * text/surface gap is what keeps a dense table readable.
 */
export const homeToolsTheme = defineTheme({
    name: "home-tools",
    extends: neutralTheme,

    color: {
        accent: "#6366f1",
        neutralStyle: "cool",
        contrast: "high"
    },

    typography: {
        // 14 / 1.2 is the dense-app rhythm the references use, not a marketing scale.
        scale: { base: 14, ratio: 1.2 },
        body: {
            family: "Inter",
            fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        },
        heading: { weight: "semibold", weights: { 1: "bold", 2: "bold", 3: "semibold" } },
        code: {
            // System monospace: numbers and timers read as data, with no font to ship.
            family: "ui-monospace",
            fallbacks: '"SF Mono", Menlo, Consolas, monospace'
        }
    },

    // element ≈ 10px, container ≈ 15px, pills stay full — the references' rounding.
    radius: { base: 4, multiplier: 1.25 },

    motion: { fast: 150, medium: 260, slow: 600, ratio: 0.75 },

    tokens: {
        // Near-black, layered: each surface steps up a few percent in lightness so
        // panels separate without borders. Light mode keeps the generated neutral.
        "--color-background-body": ["#F4F5F7", "#0A0A0C"],
        "--color-background-surface": ["#FFFFFF", "#121216"],
        "--color-background-card": ["#FFFFFF", "#151519"],
        "--color-background-popover": ["#FFFFFF", "#1B1B21"],
        "--color-text-primary": ["#0B0B0F", "#EDEEF2"],
        "--color-text-secondary": ["#5A5D66", "#9A9AA6"],
        "--color-border": ["#E3E5EA", "#FFFFFF14"],
        "--color-border-emphasized": ["#CBD0D8", "#2C2C35"],
        "--shadow-low": "0 1px 2px light-dark(#0000000F, #00000059)",
        "--shadow-med": "0 8px 24px light-dark(#00000014, #00000073)"
    },

    components: {
        card: {
            base: { borderRadius: "var(--radius-container)" }
        },
        button: {
            base: { borderRadius: "var(--radius-element)" }
        }
    }
});
