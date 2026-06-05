import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      tsconfigPath: "./tsconfig.lib.json",
      include: ["src/editor", "src/viewer", "src/types"],
      insertTypesEntry: false,
    }),
  ],
  resolve: {
    // Prefer the ESM ("module" field) over CJS ("main") for packages that expose both.
    // This ensures react-icons and similar dual-format packages are bundled as ESM,
    // avoiding the rolldown CJS require() shim that throws in ESM environments.
    mainFields: ["module", "browser", "main"],
  },
  build: {
    lib: {
      entry: {
        editor: resolve(__dirname, "src/editor/index.ts"),
        viewer: resolve(__dirname, "src/viewer/index.ts"),
        // Style-only entry — produces dist/style.css consumed by the host app
        style: resolve(__dirname, "src/lib-style.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        /^react-dom\//,   // react-dom/server, react-dom/client, etc.
        "react/jsx-runtime",
        "konva",
        "react-konva",
      ],
      output: {
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "style.css" : "assets/[name][extname]",
      },
    },
    cssCodeSplit: false,
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
  },
  // Point to the library CSS so Tailwind scans the right source files
  // and the output CSS is named style.css
  css: {
    postcss: {},
  },
});
