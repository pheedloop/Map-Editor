import { useState, useEffect } from "react";
import { getProduct, DEFAULT_PRODUCT } from "./routes/productRouter";
import { MapApp } from "./map/MapApp";
import { SeatplannerApp } from "./seatplanner/SeatplannerApp";

function App() {
  const [product, setProduct] = useState(getProduct);

  // Normalize the bare root to the default product so the URL always reflects
  // which product is active (preserving any hash/mode already present).
  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(
        null,
        "",
        `/${DEFAULT_PRODUCT}${window.location.hash}`,
      );
    }
  }, []);

  // Browser back/forward across products changes the path without a reload.
  useEffect(() => {
    const onPopState = () => setProduct(getProduct());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return product === "seatplanner" ? <SeatplannerApp /> : <MapApp />;
}

export default App;
