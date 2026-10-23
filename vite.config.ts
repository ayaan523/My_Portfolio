import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [checker({ typescript: true })],
  worker: {},
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        project: fileURLToPath(new URL("./project.html", import.meta.url)),
      },
    },
  },
  server: {
    open: true,
    port: 1234,
    host: "localhost",
  },
});
