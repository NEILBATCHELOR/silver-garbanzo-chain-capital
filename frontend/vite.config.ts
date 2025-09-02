import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom", 
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime", 
      "scheduler",
      "react-is",
    ],
    esbuildOptions: {
      define: { 
        global: "globalThis",
        Buffer: "globalThis.Buffer",
      },
    },
  },
  
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
    // WASM support for crypto libraries
    wasm(),
    topLevelAwait(),
    // REMOVED nodePolyfills plugin completely to avoid unenv issues
  ],
  
  resolve: {
    alias: {
      "@": "/src",
      "react": resolve(__dirname, "node_modules/react"),
      "react-dom": resolve(__dirname, "node_modules/react-dom"),
      "scheduler": resolve(__dirname, "node_modules/scheduler"),
      // MANUAL polyfills only for what we actually need
      stream: "stream-browserify",
      path: "path-browserify",
      util: "util/",
      buffer: "buffer/",
      crypto: "crypto-browserify",
      // Disable problematic Node.js modules completely
      fs: false,
      os: false,
      net: false,
      tls: false,
      child_process: false,
      inspector: false,
      readline: false,
      repl: false,
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  
  define: {
    "process.env": process.env,
    global: "globalThis",
    Buffer: "globalThis.Buffer",
    // Ensure problematic Node.js APIs are undefined
    "process.inspector": "undefined",
    "process.binding": "undefined",
  },
  
  build: {
    target: "esnext",
    sourcemap: true,
    chunkSizeWarningLimit: 3000,
    minify: 'terser',
    rollupOptions: {
      output: {
        format: 'es',
        // SIMPLE chunking - avoid complex crypto separation
        manualChunks: (id) => {
          // Keep React separate
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // Everything else in main bundle - avoid complex splitting
          return undefined;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    },
  },
  
  server: {
    hmr: { overlay: true },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
