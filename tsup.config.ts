import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Keep peers and heavy runtime deps external; bundle our own code and the
  // generated bindings.
  external: ["react", "react-dom", "@stellar/stellar-sdk", "buffer"],
});
