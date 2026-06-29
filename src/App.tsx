import { useState, useEffect } from "react";
import { getProduct, DEFAULT_PRODUCT, BASE_URL } from "./routes/productRouter";
import { MapApp } from "./map/MapApp";
import { SeatplannerApp } from "./seatplanner/SeatplannerApp";
import { BadgeEditorApp } from "./badgeeditor/BadgeEditorApp";

function App() {
  const [product, setProduct] = useState(getProduct);

  // Normalize the bare root to the default product so the URL always reflects
  // which product is active (preserving any hash/mode already present).
  useEffect(() => {
    // Normalize the bare base ("/" in dev, "/Map-Editor/" on Pages) to the
    // default product so the URL always reflects the active product.
    const { pathname, hash } = window.location;
    if (pathname === "/" || pathname === BASE_URL) {
      window.history.replaceState(
        null,
        "",
        `${BASE_URL}${DEFAULT_PRODUCT}${hash}`,
      );
    }
  }, []);

  // Browser back/forward across products changes the path without a reload.
  useEffect(() => {
    const onPopState = () => setProduct(getProduct());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (product === "seatplans") return <SeatplannerApp />;
  if (product === "badges") return <BadgeEditorApp />;
  return <MapApp />;
}

export default App;
