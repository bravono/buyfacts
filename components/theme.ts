import { CSSProperties } from "react";

/**
 * Global Neutral Theme Tokens (Neutral Canvas)
 * Used for core site infrastructure, navigation, and overall layout.
 */
export const GLOBAL_THEME = {
  background: "#FFFFFF",
  altBackground: "#F8F8F8",
  textPrimary: "#1A1A1A",
  textSecondary: "#6E6E73",
  divider: "#E6E6E6",
  interactiveOrange: "#ff9900",
  interactiveBlue: "#00507b",
};

export interface ProductColorProfile {
  primary: string;
  accent: string;
}

/**
 * Product Color Registry
 * Specific color profiles to be reused dynamically.
 */
export const PRODUCT_COLOR_REGISTRY: Record<string, ProductColorProfile> = {
  "Research Libs": {
    primary: "#323c46",
    accent: "#fc4f00",
  },
  "Rule of Three": {
    primary: "#01459a",
    accent: "#0a2945",
  },
  TRIAD: {
    primary: "#797539",
    accent: "#2c2E3A",
  },
  Cubicon: {
    primary: "#d5dce6",
    accent: "#8099af",
  },
};

/**
 * React helper to inject CSS custom properties dynamically for a product theme.
 * This guarantees product pages conform to 'neutral platform, colorful products'
 * without mixing accent colors.
 * 
 * Usage:
 * <div style={getProductCSSVariables("TRIAD")}>
 *   <button className="product-btn">Action</button>
 * </div>
 */
export function getProductCSSVariables(productName: string): CSSProperties {
  const profile = PRODUCT_COLOR_REGISTRY[productName];
  if (!profile) return {};
  
  return {
    "--product-primary": profile.primary,
    "--product-accent": profile.accent,
  } as CSSProperties;
}
