# Platform Technical Reference
## Chain Capital Production - Developer Quick Reference

### Technology Stack Overview

#### 📋 Core Technologies
```bash
# Primary Languages
TypeScript: 5.2.2 (Primary)
JavaScript: ES2020/ESNext (Legacy support)
CSS: Tailwind CSS 3.4.1
SQL: PostgreSQL (via Supabase)

# Runtime Environments  
Node.js: 22.16+ (Backend)
Browser: Modern browsers with ES2020 support
```

#### ⚛️ Frontend Framework
```json
{
  "framework": "React 18.2.0",
  "bundler": "Vite 5.2.0",
  "styling": "Tailwind CSS + Radix UI",
  "routing": "React Router 6.23.1",
  "state": "React Query 5.75.2 + React Hook Form 7.55.0",
  "testing": "Vitest 3.1.1 + Testing Library"
}
```

#### 🖥️ Backend Architecture
```json
{
  "runtime": "Node.js + Express 5.1.0",
  "database": "Supabase (PostgreSQL)",
  "realtime": "WebSocket Server",
  "auth": "Supabase Auth + RLS",
  "api": "RESTful + GraphQL-like via Supabase"
}
```

### TypeScript Configuration

#### 🔧 Compiler Options
```json
{
  "target": "ES2020",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "strict": false,
  "isolatedModules": true,
  "noEmit": true,
  "allowImportingTsExtensions": true,
  "resolveJsonModule": true
}
```

#### 🗂️ Project Structure
```typescript
// Path aliases
"@/*": ["./src/*"]
"@/types/tokenTypes": ["./src/types/compatibility/tokenTypes"]

// Multi-project setup
tsconfig.json          // Main frontend config
tsconfig.node.json     // Build tools config  
tsconfig.server.json   // Backend config
```

### Build System (Vite)

#### ⚡ Core Configuration
```typescript
export default defineConfig({
  plugins: [
    react({ jsxImportSource: 'react' }),
    wasm(),
    topLevelAwait(),
    nodePolyfills({ 
      protocolImports: true,
      globals: { Buffer: true, process: true }
    })
  ],
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'solana-vendor': ['@solana/web3.js', '@solana/spl-token']
        }
      }
    }
  }
});
```

#### 🔧 Advanced Polyfills
```javascript
// Browser compatibility for Web3
resolve: {
  alias: {
    "@": "/src",
    "stream": "stream-browserify",
    "crypto": "crypto-browserify", 
    "buffer": "buffer/",
    "http": "rollup-plugin-node-polyfills/polyfills/http",
    "https": "rollup-plugin-node-polyfills/polyfills/http"
  }
}

// Global definitions
define: {
  "process.env": process.env,
  "global": "globalThis",
  "Buffer": "globalThis.Buffer"
}
```

### UI Framework Architecture

#### 🎨 Design System
```typescript
// Radix UI + Shadcn/UI
{
  "primitives": "@radix-ui/react-*",
  "components": "shadcn/ui components",
  "styling": "Tailwind CSS with CSS variables",
  "animations": "tailwindcss-animate",
  "icons": "lucide-react + @radix-ui/react-icons"
}

// Theme configuration
theme: {
  extend: {
    colors: {
      primary: 'hsl(var(--primary))',
      background: 'hsl(var(--background))',
      // HSL-based color system
    }
  }
}
```

#### 📱 Component Patterns
```typescript
// Compound components
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>

// Form patterns with React Hook Form
const form = useForm<FormData>({
  resolver: zodResolver(schema)
});
```

### Web3 & Blockchain Integration

#### 🔗 Multi-Chain Support
```json
{
  "ethereum": "ethers@6.13.7 + viem@2.29.0",
  "solana": "@solana/web3.js@1.98.2",
  "bitcoin": "bitcoinjs-lib@6.1.7",
  "stellar": "stellar-sdk@13.3.0",
  "xrpl": "xrpl@4.2.5",
  "near": "near-api-js@5.1.1"
}
```

#### 🏗️ Blockchain Adapters
```typescript
// Adapter pattern implementation
interface IBlockchainAdapter {
  getBalance(address: string): Promise<string>;
  sendTransaction(tx: Transaction): Promise<string>;
  estimateGas(tx: Transaction): Promise<string>;
  getExplorerUrl(hash: string): string;
}

export class EthereumAdapter implements IBlockchainAdapter {
  constructor(networkType: 'mainnet' | 'testnet') {}
  // Implementation
}
```

#### 🔐 Wallet Integration
```typescript
// Wallet Connect + Reown AppKit
{
  "@reown/appkit": "^1.7.3",
  "@reown/appkit-adapter-wagmi": "^1.7.3",
  "wagmi": "^2.15.2"
}

// Custodial wallets
{
  "guardian": "Ed25519 signatures",
  "dfns": "Enterprise custody",
  "multisig": "Safe protocol"
}
```

### Database & Types

#### 🗄️ Supabase Integration
```typescript
// Auto-generated types
export type Database = {
  public: {
    Tables: {
      tokens: {
        Row: TokensTable;
        Insert: TokensInsert; 
        Update: TokensUpdate;
      };
      // 50+ tables
    };
  };
};

// Type-safe client
const supabase = createClient<Database>(url, key);
```

#### 🏗️ Domain Models
```typescript
// Base entity pattern
export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

// Token standards
export enum TokenStandard {
  ERC20 = 'ERC-20',
  ERC721 = 'ERC-721',
  ERC1155 = 'ERC-1155',
  ERC1400 = 'ERC-1400',
  ERC3525 = 'ERC-3525',
  ERC4626 = 'ERC-4626'
}

// Complex configurations
export interface TokenERC20Properties extends BaseModel {
  tokenId: string;
  initialSupply: string;
  cap?: string;
  decimals?: number;
  isMintable?: boolean;
  transferConfig?: Record<string, any>;
  // 50+ properties
}
```

### Code Quality Tools

#### 🔍 ESLint Configuration
```javascript
export default [
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "import": importPlugin
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "react/react-in-jsx-scope": "off",
      "import/order": ["error", { "newlines-between": "always" }]
    }
  }
];
```

#### 🧪 Testing Setup
```typescript
// Vitest configuration
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/src/archive/**', '**/node_modules/**']
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  }
});

// Testing stack
{
  "vitest": "^3.1.1",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.3",
  "jsdom": "^26.1.0"
}
```

### Development Commands

#### 🚀 Common Scripts
```bash
# Development
npm run dev              # Start dev server
npm run server:dev       # Start API server
npm run dev:all         # Start both frontend and backend

# Building
npm run build           # Build frontend
npm run server:build    # Build backend
npm run build:all       # Build everything

# Quality
npm run lint           # Run ESLint
npm run test           # Run tests
npm run types:supabase # Generate DB types

# Type checking
npm run build-no-errors # Build with type checking
```

#### 🌍 Environment Variables
```bash
# Core services
VITE_SUPABASE_URL=https://jrwfkxfzsnnjppogthaw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Blockchain
VITE_WALLET_CONNECT_PROJECT_ID=e19ed9752e18e9d65fb885a9cd419aad
VITE_ALCHEMY_API_KEY=Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP

# Third-party services
VITE_GUARDIAN_API_KEY=24a8533f-216d-4629-a5a6-7a2be066f0d3
VITE_MOONPAY_API_KEY=pk_test_...
VITE_DFNS_APP_ID=your_app_id_here
```

### Performance Optimization

#### ⚡ Bundle Optimization
```javascript
// Code splitting strategy
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
        'crypto-vendor': ['ethers', 'viem', '@noble/hashes'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select']
      }
    }
  }
}
```

#### 🎯 Runtime Performance
```typescript
// Lazy loading
const TokenDashboard = lazy(() => import('./components/tokens/TokenDashboard'));

// React Query caching
const { data, isLoading } = useQuery({
  queryKey: ['tokens', projectId],
  queryFn: () => fetchTokens(projectId),
  staleTime: 5 * 60 * 1000 // 5 minutes
});

// Suspense boundaries
<Suspense fallback={<LoadingSpinner />}>
  <TokenDashboard />
</Suspense>
```

### Architecture Patterns

#### 🏗️ Service Layer
```typescript
// Service pattern
export class TokenService {
  private supabase = createClient();
  
  async createToken(data: TokenCreateData): Promise<ServiceResult<Token>> {
    try {
      const { data: token, error } = await this.supabase
        .from('tokens')
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, data: token };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
```

#### 🔄 State Management
```typescript
// React Query for server state
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 3
    }
  }
});

// React Hook Form for form state
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    name: '',
    symbol: ''
  }
});

// React Context for global state
const AuthContext = createContext<AuthContextType | null>(null);
```

### Security Best Practices

#### 🔐 Environment Security
```typescript
// Type-safe environment access
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // All env vars typed
}

// Runtime validation
if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error('Missing VITE_SUPABASE_URL');
}
```

#### 🛡️ Database Security
```sql
-- Row Level Security (RLS)
CREATE POLICY "Users can only see their own tokens"
ON tokens FOR SELECT
USING (auth.uid() = user_id);
```

### Deployment Configuration

#### 📦 Package Management
```json
{
  "packageManager": "pnpm@10.12.1",
  "overrides": {
    "ethers": "6.13.7",
    "viem": "2.29.0",
    "@noble/hashes": "1.8.0"
  }
}
```

#### 🚀 Production Build
```bash
# Frontend build
tsc && vite build

# Server build  
tsc -p tsconfig.server.json

# Start production
node dist-server/server.js
```

### Debugging & Development

#### 🐛 Debug Configuration
```typescript
// Debug toggles
const DEBUG = {
  tokens: localStorage.getItem('debug:tokens') === 'true',
  web3: localStorage.getItem('debug:web3') === 'true',
  api: import.meta.env.DEV
};

// Debug keyboard shortcuts
useEffect(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      toggleDebugMode();
    }
  };
  
  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, []);
```

#### 📊 Development Tools
```typescript
// React DevTools
import { DevTools } from '@tanstack/react-query-devtools';

// Performance monitoring
if (import.meta.env.DEV) {
  import('./utils/performanceMonitor').then(({ startMonitoring }) => {
    startMonitoring();
  });
}
```

### Future Considerations

#### 🔮 Planned Upgrades
- **React 19**: Server Components and enhanced Suspense
- **Vite 6**: Improved build performance and debugging
- **TypeScript 5.5+**: Latest language features
- **Next.js Migration**: Consider full-stack React framework

#### 📈 Scaling Strategies
- **Micro-frontends**: Module federation for team scaling
- **Edge deployment**: Cloudflare Workers/Vercel Edge
- **Database sharding**: PostgreSQL scaling
- **CDN optimization**: Static asset delivery

---

*This technical reference is current as of June 18, 2025. For detailed implementation examples, see the full platform documentation.*
