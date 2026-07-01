import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Vitest は純関数・コンポーネントテストを担当（可視性ロジックなど）。
    include: ["app/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
  },
});
