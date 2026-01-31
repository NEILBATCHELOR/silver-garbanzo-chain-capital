import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  optimizeDeps: {
    // Remove force: true to use cached optimization
    include: [
      "react",
      "react-dom", 
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime", 
      "scheduler",
      "react-is",
      "buffer",
      "bitcoinjs-lib",
      "ecpair",
      "tiny-secp256k1",
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
    wasm(),
    topLevelAwait(),
  ],
  
  resolve: {
    alias: {
      "@": "/src",
      "react": resolve(__dirname, "node_modules/react"),
      "react-dom": resolve(__dirname, "node_modules/react-dom"),
      "scheduler": resolve(__dirname, "node_modules/scheduler"),
      stream: "stream-browserify",
      path: "path-browserify",
      util: "util/",
      buffer: "buffer/",
      crypto: "crypto-browserify",
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  
  define: {
    "process.env": process.env,
    global: "globalThis",
    Buffer: "globalThis.Buffer",
    "globalThis.Buffer": "globalThis.Buffer",
    "process.inspector": "undefined",
    "process.binding": "undefined",
  },
  
  build: {
    target: "esnext",
    // DISABLE sourcemaps for faster builds
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    // Use esbuild instead of terser for much faster builds
    minify: 'esbuild',
    rollupOptions: {
      external: [
        'fs', 'os', 'net', 'tls', 'child_process', 'inspector', 'readline', 'repl'
      ],
      output: {
        format: 'es',
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
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
