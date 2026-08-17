import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/unit/**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["lib/**/*.ts", "components/**/*.tsx", "hooks/**/*.ts"],
            exclude: ["node_modules", "tests"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
})
