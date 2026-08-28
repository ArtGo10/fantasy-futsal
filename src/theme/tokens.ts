export const colors = {
  brand: {
    blue: "#2171B8",
    blueDark: "#004494",
    blueSoft: "#EAF2FF",
    polishRed: "#E30613",
    polishRedDark: "#980612",
    polishRedSoft: "#FDE8EA",
    yellow: "#FFD500",
    yellowSoft: "#FFF8CC",
    teal: "#0F766E",
    tealSoft: "#E8F6F4",
  },
  app: {
    primary: "#28105F",
    primaryDark: "#160932",
    primarySoft: "#EEE9FF",
  },
  fantasy: {
    dark: "#03050C",
    darkElevated: "#111321",
    darkPanel: "#222434",
    darkPanelSoft: "#2B2D3D",
    red: "#FF4944",
    redDark: "#D93431",
    redSoft: "#3A171B",
    line: "#353747",
    muted: "#9CA0AE",
  },
  background: "#F6F8FC",
  surface: "#FFFFFF",
  surfaceSubtle: "#F8FAFC",
  border: {
    default: "#D8DEE9",
    strong: "#CBD5E1",
    focus: "#8CB8F5",
  },
  text: {
    primary: "#111827",
    secondary: "#374151",
    muted: "#6B7280",
    inverse: "#FFFFFF",
  },
  state: {
    danger: "#C2413B",
    dangerBorder: "#F1B6B3",
    dangerSoft: "#FFF1F1",
    success: "#12805C",
    successSoft: "#EAF7F1",
    warning: "#8A4B0F",
    warningBorder: "#F3C677",
    warningSoft: "#FFF8EB",
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 40,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const typography = {
  size: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
  },
  lineHeight: {
    xs: 14,
    sm: 15,
    md: 19,
    base: 22,
    lg: 24,
    xxl: 30,
  },
  weight: {
    regular: "400",
    medium: "600",
    bold: "700",
    heavy: "800",
    black: "900",
  },
} as const;

export const shadows = {
  card: {
    boxShadow: "0px 6px 16px rgba(15, 23, 42, 0.06)",
    elevation: 2,
  },
} as const;
