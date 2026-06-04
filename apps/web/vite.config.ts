import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, transformWithEsbuild } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      onwarn(warning, warn) {
        const message = String(warning.message || "");
        if (
          message.includes("Generated an empty chunk") &&
          (message.includes("sitemap_._xml") || message.includes("robots_._txt"))
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  plugins: [
    {
      name: "load-js-files-as-jsx",
      async transform(code, id) {
        if (!id.match(/apps\/web\/app\/.*\.js($|\?)/)) {
          return null;
        }

        const result = await transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
          sourcemap: false,
        });
        return { code: result.code, map: null };
      },
    },
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
