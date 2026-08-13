import type { GenderIdentity, ThemeKey } from "../types";

export interface ThemeTokens {
  pageTop: string;
  pageBottom: string;
  surface: string;
  surfaceStrong: string;
  topbar: string;
  primary: string;
  primaryDeep: string;
  secondary: string;
  secondaryDeep: string;
  tertiary: string;
  tertiaryDeep: string;
  ink: string;
  muted: string;
  border: string;
  shadow: string;
  activeBackground: string;
  taskCard: string;
  statsCard: string;
  spotifyCard: string;
  blobA: string;
  blobB: string;
}

export interface ColorTheme {
  key: ThemeKey;
  label: string;
  swatches: readonly [string, string, string];
  tokens: ThemeTokens;
}

export const DEFAULT_THEME_KEY: ThemeKey = "blueberry-cloud";

export const COLOR_THEMES: readonly ColorTheme[] = [
  {
    key: "strawberry-milk",
    label: "Strawberry Milk",
    swatches: ["#ff9eb7", "#c4a8e8", "#9ddcf4"],
    tokens: {
      pageTop: "#ffe8f0", pageBottom: "#fff8fb", surface: "#fff8fb", surfaceStrong: "#ffffff", topbar: "rgba(255,255,255,.82)",
      primary: "#ff9eb7", primaryDeep: "#df7895", secondary: "#c4a8e8", secondaryDeep: "#9275ba", tertiary: "#9ddcf4", tertiaryDeep: "#5daacb",
      ink: "#4b3b56", muted: "#71617b", border: "#efdbea", shadow: "#e8d8f0", activeBackground: "#f3edff",
      taskCard: "#ffe3ec", statsCard: "#efe8ff", spotifyCard: "#e5f6ff", blobA: "#e4f5ff", blobB: "#eee6ff",
    },
  },
  {
    key: "blueberry-cloud",
    label: "Blueberry Cloud",
    swatches: ["#9ac4ff", "#afa8ef", "#9fe0d5"],
    tokens: {
      pageTop: "#e8f3ff", pageBottom: "#f8fbff", surface: "#f8fbff", surfaceStrong: "#ffffff", topbar: "rgba(250,253,255,.84)",
      primary: "#9ac4ff", primaryDeep: "#6d9de2", secondary: "#afa8ef", secondaryDeep: "#8078c8", tertiary: "#9fe0d5", tertiaryDeep: "#62b5a8",
      ink: "#303d54", muted: "#556278", border: "#d8e5f4", shadow: "#dbe4f4", activeBackground: "#e9efff",
      taskCard: "#e4f0ff", statsCard: "#ece9ff", spotifyCard: "#e5faf6", blobA: "#d9e7ff", blobB: "#dcf7f2",
    },
  },
  {
    key: "lavender-dream",
    label: "Lavender Dream",
    swatches: ["#cba9e6", "#f0afd0", "#a9d8f0"],
    tokens: {
      pageTop: "#f0e7ff", pageBottom: "#fcf9ff", surface: "#fcf9ff", surfaceStrong: "#ffffff", topbar: "rgba(253,250,255,.84)",
      primary: "#cba9e6", primaryDeep: "#9d78c0", secondary: "#f0afd0", secondaryDeep: "#ce7faa", tertiary: "#a9d8f0", tertiaryDeep: "#6eafcf",
      ink: "#4c405d", muted: "#6e637a", border: "#e5d9ef", shadow: "#ded1eb", activeBackground: "#f1eaff",
      taskCard: "#f9e4f0", statsCard: "#eee5fa", spotifyCard: "#e7f4fb", blobA: "#eadcff", blobB: "#f8dff0",
    },
  },
  {
    key: "matcha-cream",
    label: "Matcha Cream",
    swatches: ["#b7d9a5", "#f3b89f", "#d7c3ed"],
    tokens: {
      pageTop: "#edf5e6", pageBottom: "#fffaf0", surface: "#fffaf0", surfaceStrong: "#ffffff", topbar: "rgba(255,253,247,.86)",
      primary: "#b7d9a5", primaryDeep: "#7eac6b", secondary: "#f3b89f", secondaryDeep: "#cb8264", tertiary: "#d7c3ed", tertiaryDeep: "#9f83c1",
      ink: "#493f35", muted: "#6c6257", border: "#e7dfd1", shadow: "#ddd8ca", activeBackground: "#edf5e7",
      taskCard: "#f8dfd2", statsCard: "#e4f1dc", spotifyCard: "#eee6f5", blobA: "#dcebd2", blobB: "#f4dfd1",
    },
  },
  {
    key: "midnight-navy",
    label: "Midnight Navy",
    swatches: ["#345995", "#5f7db8", "#d49b5b"],
    tokens: {
      pageTop: "#15233a", pageBottom: "#223653", surface: "#edf2f8", surfaceStrong: "#f7f9fc", topbar: "rgba(247,249,252,.9)",
      primary: "#d49b5b", primaryDeep: "#9b672f", secondary: "#91a9d2", secondaryDeep: "#45659d", tertiary: "#8fc7c2", tertiaryDeep: "#3f817c",
      ink: "#17243a", muted: "#52627a", border: "#bdc9dc", shadow: "#101a2b", activeBackground: "#dce6f6",
      taskCard: "#dce6f6", statsCard: "#d4deef", spotifyCard: "#d9eeec", blobA: "#2d4569", blobB: "#263d5e",
    },
  },
  {
    key: "forest-trail",
    label: "Forest Trail",
    swatches: ["#557a61", "#9b7b52", "#7fa6a1"],
    tokens: {
      pageTop: "#20352b", pageBottom: "#344c3e", surface: "#f1efe5", surfaceStrong: "#fffdf5", topbar: "rgba(255,253,245,.9)",
      primary: "#c99a62", primaryDeep: "#8b6237", secondary: "#9cb99f", secondaryDeep: "#557a61", tertiary: "#91b8b2", tertiaryDeep: "#4c817a",
      ink: "#25372d", muted: "#586b60", border: "#cbd5c7", shadow: "#17271f", activeBackground: "#e0eadf",
      taskCard: "#e5eadc", statsCard: "#dce7d9", spotifyCard: "#dcebea", blobA: "#3b5948", blobB: "#456153",
    },
  },
  {
    key: "graphite-blue",
    label: "Graphite Blue",
    swatches: ["#495667", "#6686a8", "#b78061"],
    tokens: {
      pageTop: "#252b33", pageBottom: "#39434f", surface: "#eef1f4", surfaceStrong: "#ffffff", topbar: "rgba(255,255,255,.9)",
      primary: "#c58d6d", primaryDeep: "#8e5d43", secondary: "#9eafc1", secondaryDeep: "#596f88", tertiary: "#8fb0bf", tertiaryDeep: "#537b8e",
      ink: "#26313d", muted: "#586777", border: "#cbd2d9", shadow: "#1a2028", activeBackground: "#dfe7ef",
      taskCard: "#e1e7ed", statsCard: "#dce3eb", spotifyCard: "#dce9ed", blobA: "#3c4856", blobB: "#465463",
    },
  },
] as const;

const themeKeys = new Set<string>(COLOR_THEMES.map((theme) => theme.key));

export const isThemeKey = (value: unknown): value is ThemeKey => typeof value === "string" && themeKeys.has(value);

export const normalizeThemeKey = (value: unknown): ThemeKey => isThemeKey(value) ? value : DEFAULT_THEME_KEY;

export const getColorTheme = (key: unknown): ColorTheme => {
  const normalized = normalizeThemeKey(key);
  return COLOR_THEMES.find((theme) => theme.key === normalized) ?? COLOR_THEMES[0];
};

export const themeCssVariables = (key: unknown): Record<string, string> => {
  const { tokens } = getColorTheme(key);
  return Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--theme-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value]));
};

const GENDER_THEME_RECOMMENDATIONS: Record<GenderIdentity, ThemeKey> = {
  woman: "strawberry-milk",
  man: "midnight-navy",
  "non-binary": "lavender-dream",
  "prefer-not-to-say": "matcha-cream",
};

export const recommendedThemeForGender = (gender: GenderIdentity): ThemeKey => GENDER_THEME_RECOMMENDATIONS[gender];
