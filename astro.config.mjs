import { defineConfig } from "astro/config";

// Site draait op GitHub Pages onder een projectpad, vandaar de vaste base.
export default defineConfig({
  site: "https://raderwerk.github.io",
  base: "/spoorlinde-web",
});
