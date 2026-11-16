import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // One .env for the whole repo, at the root. Only VITE_* keys reach the browser.
  envDir: "..",
  server: { port: 5173, strictPort: true },
});
