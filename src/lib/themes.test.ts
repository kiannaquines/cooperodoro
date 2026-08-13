import { COLOR_THEMES, DEFAULT_THEME_KEY, THEME_STORAGE_KEY, getColorTheme, isThemeKey, loadCachedThemeKey, normalizeThemeKey, recommendedThemeForGender, saveCachedThemeKey, themeCssVariables } from "./themes";
import { describe, expect, it } from "vitest";

const luminance = (hex: string) => {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [];
  const adjusted = channels.map((channel) => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return adjusted[0] * .2126 + adjusted[1] * .7152 + adjusted[2] * .0722;
};

const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};

describe("color themes", () => {
  it("defines eight unique, complete palettes", () => {
    expect(COLOR_THEMES).toHaveLength(8);
    expect(new Set(COLOR_THEMES.map((theme) => theme.key))).toHaveLength(8);
    for (const theme of COLOR_THEMES) {
      expect(theme.swatches).toHaveLength(3);
      expect(Object.keys(theme.tokens)).toHaveLength(21);
      expect(Object.values(theme.tokens).every(Boolean)).toBe(true);
    }
  });

  it("normalizes unsupported values to Blueberry Cloud", () => {
    expect(isThemeKey("matcha-cream")).toBe(true);
    expect(isThemeKey("cherry-ember")).toBe(true);
    expect(isThemeKey("unknown-theme")).toBe(false);
    expect(normalizeThemeKey("unknown-theme")).toBe(DEFAULT_THEME_KEY);
    expect(getColorTheme(null).key).toBe(DEFAULT_THEME_KEY);
  });

  it("provides every semantic CSS variable", () => {
    const variables = themeCssVariables("blueberry-cloud");
    expect(variables["--theme-page-top"]).toBe("#e8f3ff");
    expect(variables["--theme-spotify-card"]).toBe("#e5faf6");
    expect(Object.keys(variables)).toHaveLength(21);
  });

  it("recommends a curated starting theme for every gender option", () => {
    expect(recommendedThemeForGender("woman")).toBe("strawberry-milk");
    expect(recommendedThemeForGender("man")).toBe("midnight-navy");
    expect(recommendedThemeForGender("non-binary")).toBe("lavender-dream");
    expect(recommendedThemeForGender("prefer-not-to-say")).toBe("matcha-cream");
  });

  it("keeps primary text combinations at accessible contrast", () => {
    for (const { label, tokens } of COLOR_THEMES) {
      for (const background of [tokens.surface, tokens.surfaceStrong, tokens.primary, tokens.secondary, tokens.tertiary]) {
        expect(contrast(tokens.ink, background), `${label}: ${background}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(tokens.muted, tokens.surface), `${label}: muted`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("loads and saves the shared cached theme key", () => {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });

    saveCachedThemeKey("matcha-cream");

    expect(storage.get(THEME_STORAGE_KEY)).toBe("matcha-cream");
    expect(loadCachedThemeKey()).toBe("matcha-cream");
  });
});
