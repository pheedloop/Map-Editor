// ---------------------------------------------------------------------------
// Product routing
// ---------------------------------------------------------------------------
//
// The demo hosts multiple products side by side. The product lives in the URL
// path (`/map`, `/seatplanner`); the mode within a product lives in the hash
// (`#editor`, `#viewer`, ...). App.tsx resolves the product and delegates to
// that product's self-contained route module, which owns its own hash routing.

export type Product = "map" | "seatplanner" | "badge";

export const DEFAULT_PRODUCT: Product = "map";

/** Deploy base path — "/" in dev, "/Map-Editor/" on GitHub Pages. */
export const BASE_URL = import.meta.env.BASE_URL;

/** Resolve the active product from the first path segment AFTER the base path. */
export function getProduct(): Product {
  let path = window.location.pathname;
  if (BASE_URL !== "/" && path.startsWith(BASE_URL)) {
    path = path.slice(BASE_URL.length);
  }
  const seg = path.replace(/^\/+/, "").split("/")[0];
  if (seg === "seatplanner") return "seatplanner";
  if (seg === "badge") return "badge";
  return DEFAULT_PRODUCT;
}

/** Build a cross-product link (base-aware) that preserves the current mode. */
export function productHref(product: Product, mode: string): string {
  // BASE_URL always ends with a slash.
  return `${BASE_URL}${product}#${mode}`;
}
