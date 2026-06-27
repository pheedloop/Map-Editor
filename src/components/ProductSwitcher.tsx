import { productHref, type Product } from "../routes/productRouter";

const PRODUCTS: { id: Product; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "seatplanner", label: "Seatplanner" },
];

/**
 * Top-level product tabs (Map | Seatplanner) shared by each product's navbar.
 * Switching product navigates across paths (full reload) while preserving the
 * current mode.
 */
export function ProductSwitcher({
  current,
  mode,
}: {
  current: Product;
  mode: string;
}) {
  return (
    <>
      {PRODUCTS.map((p) => (
        <a
          key={p.id}
          href={productHref(p.id, mode)}
          className={`px-3 py-1 rounded transition-colors ${
            current === p.id
              ? "bg-white/15 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {p.label}
        </a>
      ))}
    </>
  );
}
