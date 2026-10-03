import type { ThemeColor } from "@/db/schema";

// The value of the `data-theme` attribute for a theme color. Pink is the
// :root default in globals.css and needs no override, but is set as well.
export function themeAttribute(color: ThemeColor): string {
  return color.toLowerCase();
}

// Swatch colors for the Settings picker; they mirror the accents in globals.css.
export const THEME_SWATCHES: Record<ThemeColor, string> = {
  Pink: "#ec6aab",
  Purple: "#a78bfa",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Red: "#ef4444",
};
