// ---------------------------------------------------------------------------
// Product routing
// ---------------------------------------------------------------------------
//
// The demo hosts multiple products side by side. The product lives in the URL
// path (`/map`, `/seatplanner`); the mode within a product lives in the hash
// (`#editor`, `#viewer`, ...). App.tsx resolves the product and delegates to
// that product's self-contained route module, which owns its own hash routing.

export type Product = "map" | "seatplanner";

export const DEFAULT_PRODUCT: Product = "map";

/** Resolve the active product from the first path segment. */
export function getProduct(): Product {
  const seg = window.location.pathname.replace(/^\/+/, "").split("/")[0];
  if (seg === "seatplanner") return "seatplanner";
  return DEFAULT_PRODUCT;
}

/** Build a cross-product link that preserves the current mode. */
export function productHref(product: Product, mode: string): string {
  return `/${product}#${mode}`;
}
