import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative assets work at the repository path and on any static preview host.
export default defineConfig({ base: "./", plugins: [react()] });
