import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import rollupPolyfillNode from "rollup-plugin-polyfill-node";
import commonjs from "@rollup/plugin-commonjs";
import { resolve } from "path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const conditionalPlugins: [string, Record<string, any>][] = [];
if (process.env.TEMPO === "true") {
  conditionalPlugins.push(["tempo-devtools/swc", {}]);
}

export default defineConfig({
  optimizeDeps: {
    force: true,
    include: [
      // Core React ecosystem
      "react",
      "react-dom", 
      "react-dom/client",
      "scheduler",
      "react/jsx-runtime",
      "react-is",
      "use-sync-external-store",
      "use-sync-external-store/shim",
      "react/jsx-dev-runtime",
      "react-transition-group",
      "prop-types",
      
      // Essential UI and state management
      "@supabase/supabase-js",
      "@supabase/postgrest-js", 
      "@supabase/realtime-js",
      "@supabase/auth-js",
      "@supabase/storage-js",
      "@supabase/functions-js",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      
      // Essential polyfills
      "buffer",
      "events", 
      "process",
      "performance-now",
      
      // BigInt utilities for Solana
      "bigint-buffer",
      
      // Blockchain ecosystem - critical for bundling
      "@solana/web3.js",
      "@solana/buffer-layout",
      "borsh",
      "text-encoding-utf-8",
      
      // Network utilities
      "openapi-fetch",
      "destr",
      "ms",
      
      // Radix UI core dependencies
      "@radix-ui/primitive",
      "@radix-ui/react-context",
      "@radix-ui/react-compose-refs",
      "@radix-ui/react-use-callback-ref",
      
      // CRITICAL AppKit/WalletConnect Dependencies
      "@reown/appkit",
      "@reown/appkit-adapter-wagmi",
      "@reown/appkit-common",
      "@reown/appkit-controllers",
      "@reown/appkit-utils",
      "@reown/appkit-wallet",
      "@reown/appkit-ui",
      "@reown/appkit-scaffold-ui",
      "@walletconnect/core",
      "@walletconnect/universal-provider",
      "@walletconnect/ethereum-provider",
      "@walletconnect/types",
      "@walletconnect/utils",
      "@walletconnect/sign-client",
      "wagmi",
      "@wagmi/core",
      "@wagmi/connectors",
      "viem",
      
      // Fix module resolution issues
      "engine.io-client",
      "socket.io-parser",
      "stream-json/streamers/StreamValues",
      "@walletconnect/window-getters",
      
      // Additional Solana modules
      "@solana/errors",
      "@solana/codecs-core",
      "@solana/codecs-data-structures",
    ],
    esbuildOptions: {
      define: { 
        global: "globalThis",
        Buffer: "globalThis.Buffer",
        exports: "{}",
      },
    },
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      jsxDev: process.env.NODE_ENV === 'development',
      babel: {
        plugins: [],
        babelrc: false,
        configFile: false,
      },
    }),
    wasm(),
    topLevelAwait(),

    // Node.js polyfills for browser compatibility
    nodePolyfills({ 
      protocolImports: true,
      globals: {
        Buffer: true,
        process: true,
      },
      overrides: {
        'exports': 'globalThis.exports = globalThis.exports || {};',
      }
    }),
  ],

  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": "/src",
      
      // Force single React instance
      "react": resolve(__dirname, "node_modules/react"),
      "react-dom": resolve(__dirname, "node_modules/react-dom"),
      "scheduler": resolve(__dirname, "node_modules/scheduler"),
      
      // Node.js polyfills for browser
      stream: "stream-browserify",
      path: "path-browserify",
      util: "util/",
      buffer: "buffer/",
      crypto: "crypto-browserify",
      
      // Fix WalletConnect modules
      "@walletconnect/window-getters": resolve(__dirname, "node_modules/@walletconnect/window-getters/dist/esm/index.js"),
      
      // Fix Solana modules for preview mode
      "@solana/buffer-layout$": resolve(
        __dirname,
        "node_modules/@solana/buffer-layout/lib/index.js"
      ),
      
      "@solana/buffer-layout-utils$": resolve(
        __dirname,
        "public/polyfills/buffer-layout-utils.js"
      ),
      
      "bigint-buffer": resolve(
        __dirname,
        "node_modules/bigint-buffer/dist/node.js"
      ),
      
      // Fix bip174 deep import issues
      'bip174/src/lib/converter/varint': resolve(__dirname, 'node_modules/bip174/src/esm/lib/converter/tools.js'),
      'bip174/src/lib/utils': resolve(__dirname, 'node_modules/bip174/src/esm/lib/utils.js'),
      
      // Wallet SDK aliases
      "cbw-sdk": "@coinbase/wallet-sdk",
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },

  ssr: {
    external: [],
    noExternal: [
      "@reown/appkit/**",
      "@walletconnect/**",
      "wagmi",
      "@wagmi/**",
      "viem",
      // Fix Supabase module resolution issues
      "@supabase/supabase-js",
      "@supabase/auth-js",
      "@supabase/realtime-js",
      "@supabase/postgrest-js",
      "@supabase/storage-js",
      "@supabase/functions-js",
    ],
  },

  define: {
    "process.env": process.env,
    global: "globalThis",
    Buffer: "globalThis.Buffer",
    "process.browser": true,
    exports: "{}",
  },

  build: {
    target: "esnext",
    sourcemap: true,
    chunkSizeWarningLimit: 800, // Reduced from 1024 for better optimization
    minify: 'terser', // More aggressive minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log'], // Remove specific function calls
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      esmExternals: true,
      transformMixedEsModules: true,
      defaultIsModuleExports: false,
      requireReturnsDefault: 'auto',
      ignoreDynamicRequires: true,
      strictRequires: false,
    },
    rollupOptions: {
      plugins: [
        rollupPolyfillNode(),
        commonjs({
          include: [/node_modules/],
          transformMixedEsModules: true,
          defaultIsModuleExports: false,
          requireReturnsDefault: 'auto',
          strictRequires: false,
          esmExternals: true,
        })
      ],
      external: [],
      output: {
        manualChunks: (id) => {
          // Core React ecosystem - separate chunk
          if (id.includes('react') || 
              id.includes('scheduler') ||
              id.includes('react-dom') ||
              id.includes('use-sync-external-store') ||
              id.includes('react-is') ||
              id.includes('jsx-runtime') ||
              id.includes('jsx-dev-runtime') ||
              id.includes('react/jsx-runtime') ||
              id.includes('react/jsx-dev-runtime')) {
            return 'react-core';
          }
          
          // UI Libraries - Radix UI components
          if (id.includes('@radix-ui') || 
              id.includes('lucide-react') ||
              id.includes('class-variance-authority') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')) {
            return 'ui-vendor';
          }
          
          // Blockchain/Crypto Libraries - Keep with React core to prevent context issues
          if (id.includes('@solana') ||
              id.includes('wagmi') ||
              id.includes('@wagmi') ||
              id.includes('viem') ||
              id.includes('@reown') ||
              id.includes('@walletconnect') ||
              id.includes('@coinbase/wallet-sdk') ||
              id.includes('ethers') ||
              id.includes('ox') ||
              id.includes('bigint-buffer') ||
              id.includes('borsh') ||
              id.includes('bs58') ||
              id.includes('@noble')) {
            return 'react-core'; // Changed from 'crypto-vendor' to prevent React context isolation
          }
          
          // Supabase ecosystem - REMOVED due to module resolution issues
          // Keep Supabase in main vendor chunk to preserve module interdependencies
          // if (id.includes('@supabase')) {
          //   return 'supabase-vendor';
          // }
          
          // Charts and Data Visualization - Keep with React core to prevent context issues
          if (id.includes('recharts') ||
              id.includes('@nivo') ||
              id.includes('d3') ||
              id.includes('chart') ||
              id.includes('plotly') ||
              id.includes('victory')) {
            return 'react-core'; // Changed from 'charts-vendor' to prevent React context isolation
          }
          
          // Utility Libraries - REMOVED to prevent module resolution issues
          // Keeping utilities in main vendor chunk to preserve dependencies
          // if (id.includes('lodash') ||
          //     id.includes('date-fns') ||
          //     id.includes('axios') ||
          //     id.includes('ramda') ||
          //     id.includes('moment') ||
          //     id.includes('dayjs') ||
          //     id.includes('zod') ||
          //     id.includes('yup')) {
          //   return 'utils-vendor';
          // }
          
          // Feature-based chunks for your app code
          if (id.includes('/src/') && !id.includes('node_modules')) {
            // Investor-related features
            if (id.includes('/src/components/investors') ||
                id.includes('/src/services/investor') ||
                id.includes('/src/utils/compliance/investorTypes')) {
              return 'investor-features';
            }
            
            // Token-related features
            if (id.includes('/src/components/tokens') ||
                id.includes('/src/services/token')) {
              return 'token-features';
            }
            
            // Compliance features
            if (id.includes('/src/components/compliance') ||
                id.includes('/src/services/policy')) {
              return 'compliance-features';
            }
            
            // Cap table features
            if (id.includes('/src/components/captable') ||
                id.includes('/src/services/captable')) {
              return 'captable-features';
            }
            
            // Authentication and user management
            if (id.includes('/src/components/auth') ||
                id.includes('/src/services/auth') ||
                id.includes('/src/hooks/auth')) {
              return 'auth-features';
            }
            
            // Dashboard and analytics
            if (id.includes('/src/components/dashboard') ||
                id.includes('/src/services/analytics')) {
              return 'dashboard-features';
            }
            
            // Main app chunk for other app code
            return 'app-core';
          }
          
          // Any remaining node_modules go to general vendor
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
        
        // Optimize chunk loading
        experimentalMinChunkSize: 20000, // Minimum chunk size 20kb
        
        // Better naming for production
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.ts', '').replace('.tsx', '')
            : 'unknown';
          return `assets/[name]-[hash].js`;
        },
        
        // Optimize asset naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    },
  },

  server: {
    allowedHosts: process.env.TEMPO === "true" ? true : undefined,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});