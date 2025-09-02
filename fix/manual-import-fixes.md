# Mixed Import Pattern Manual Fix Guide

## 🎯 Critical Fixes for Build Optimization

Based on the import analyzer results, here are the **exact changes** needed to eliminate mixed import patterns and achieve optimal chunk splitting.

## 📊 Priority Order (High Impact → Low Impact)

### **🔥 HIGH PRIORITY: Core Utilities (Keep STATIC)**

#### 1. `src/utils/compliance/investorTypes.ts`
**Status**: 13 static vs 2 dynamic → **Convert to ALL STATIC**

**Files to fix**:
```typescript
// ❌ src/components/investors/BulkInvestorUpload.tsx
// Replace dynamic import with static:
const { InvestorType } = await import('../../../utils/compliance/investorTypes');
// ↓ CHANGE TO ↓
import { InvestorType } from '../../../utils/compliance/investorTypes';

// ❌ src/utils/module-fixes.ts  
// Replace dynamic import with static:
const investorTypes = await import('./compliance/investorTypes');
// ↓ CHANGE TO ↓
import * as investorTypes from './compliance/investorTypes';
```

#### 2. `src/components/tokens/services/tokenService.ts`
**Status**: 16 static vs 3 dynamic → **Convert to ALL STATIC**

**Files to fix**:
```typescript
// ❌ src/services/token/index.ts
// Replace dynamic import with static:
const { TokenService } = await import('../../components/tokens/services/tokenService');
// ↓ CHANGE TO ↓
import { TokenService } from '../../components/tokens/services/tokenService';

// ❌ src/utils/lazy-imports.ts
// Replace dynamic import with static:
const tokenService = () => import('../components/tokens/services/tokenService');
// ↓ CHANGE TO ↓
import tokenService from '../components/tokens/services/tokenService';

// ❌ src/utils/module-fixes.ts
// Replace dynamic import with static:
const { tokenService } = await import('../components/tokens/services/tokenService');
// ↓ CHANGE TO ↓
import { tokenService } from '../components/tokens/services/tokenService';
```

#### 3. `src/components/tokens/debug/config/logLevels.ts`
**Status**: 9 static vs 1 dynamic → **Convert to ALL STATIC**

**Files to fix**:
```typescript
// ❌ src/components/tokens/debug/index.ts
// Replace dynamic import with static:
const { LogLevel } = await import('./config/logLevels');
// ↓ CHANGE TO ↓
import { LogLevel } from './config/logLevels';
```

### **🎨 MEDIUM PRIORITY: Onboarding Components (Make DYNAMIC)**

#### 4. `src/components/compliance/investor/components/RegistrationForm.tsx`
**Status**: 2 static vs 3 dynamic → **Convert to ALL DYNAMIC**

**Files to fix**:
```typescript
// ❌ src/components/compliance/investor/InvestorOnboarding.tsx
// Replace static import with dynamic:
import { RegistrationForm } from './components/RegistrationForm';
// ↓ CHANGE TO ↓
const RegistrationForm = React.lazy(() => import('./components/RegistrationForm'));

// ❌ src/components/onboarding/OnboardingFlow.tsx
// Replace static import with dynamic:
import { RegistrationForm } from '../compliance/investor/components/RegistrationForm';
// ↓ CHANGE TO ↓
const RegistrationForm = React.lazy(() => import('../compliance/investor/components/RegistrationForm'));
```

#### 5. `src/components/compliance/investor/components/InvestorProfile.tsx`
**Status**: 2 static vs 2 dynamic → **Convert to ALL DYNAMIC**

**Files to fix**:
```typescript
// ❌ src/components/compliance/investor/InvestorOnboarding.tsx
// Replace static import with dynamic:
import { InvestorProfile } from './components/InvestorProfile';
// ↓ CHANGE TO ↓
const InvestorProfile = React.lazy(() => import('./components/InvestorProfile'));

// ❌ src/components/investors/InvestorOnboardingFlow.tsx
// Replace static import with dynamic:
import { InvestorProfile } from '../compliance/investor/components/InvestorProfile';
// ↓ CHANGE TO ↓
const InvestorProfile = React.lazy(() => import('../compliance/investor/components/InvestorProfile'));
```

#### 6. `src/components/compliance/investor/components/WalletSetup.tsx`
**Status**: 3 static vs 3 dynamic → **Convert to ALL DYNAMIC**

**Files to fix**:
```typescript
// ❌ src/components/compliance/investor/InvestorOnboarding.tsx
// Replace static import with dynamic:
import { WalletSetup } from './components/WalletSetup';
// ↓ CHANGE TO ↓
const WalletSetup = React.lazy(() => import('./components/WalletSetup'));

// ❌ src/components/investors/InvestorOnboardingFlow.tsx
// Replace static import with dynamic:
import { WalletSetup } from '../compliance/investor/components/WalletSetup';
// ↓ CHANGE TO ↓
const WalletSetup = React.lazy(() => import('../compliance/investor/components/WalletSetup'));

// ❌ src/components/onboarding/OnboardingFlow.tsx
// Replace static import with dynamic:
import { WalletSetup } from '../compliance/investor/components/WalletSetup';
// ↓ CHANGE TO ↓
const WalletSetup = React.lazy(() => import('../compliance/investor/components/WalletSetup'));
```

### **⚖️ COMPLIANCE CORE: KYCVerification (Keep STATIC)**

#### 7. `src/components/compliance/investor/components/KYCVerification.tsx`
**Status**: 5 static vs 4 dynamic → **Convert to ALL STATIC**

**Files to fix**:
```typescript
// ❌ src/components/compliance/investor/context/OnboardingContext.tsx
// Replace dynamic import with static:
const { KYCVerification } = await import('../components/KYCVerification');
// ↓ CHANGE TO ↓
import { KYCVerification } from '../components/KYCVerification';

// ❌ src/services/rule/ruleFactory.fixed.ts
// Replace dynamic import with static:
const kyc = await import('../../components/compliance/investor/components/KYCVerification');
// ↓ CHANGE TO ↓
import * as kyc from '../../components/compliance/investor/components/KYCVerification';

// ❌ src/services/rule/ruleFactory.ts
// Replace dynamic import with static:
const { KYCVerification } = await import('../../components/compliance/investor/components/KYCVerification');
// ↓ CHANGE TO ↓
import { KYCVerification } from '../../components/compliance/investor/components/KYCVerification';

// ❌ src/utils/lazy-imports.ts
// Replace dynamic import with static:
const kycVerification = () => import('../components/compliance/investor/components/KYCVerification');
// ↓ CHANGE TO ↓
import kycVerification from '../components/compliance/investor/components/KYCVerification';
```

## 🎛️ Required Suspense Wrappers

For any component converted to `React.lazy()`, ensure it's wrapped in `<Suspense>`:

```typescript
// Add these imports:
import React, { Suspense } from 'react';

// Wrap lazy components:
<Suspense fallback={<div>Loading...</div>}>
  <RegistrationForm />
</Suspense>

<Suspense fallback={<div>Loading...</div>}>
  <InvestorProfile />
</Suspense>

<Suspense fallback={<div>Loading...</div>}>
  <WalletSetup />
</Suspense>
```

## 🧪 Verification Steps

1. **Build Test**: `npm run build`
2. **Chunk Analysis**: `npm run build:analyze`
3. **Expected Results**:
   - ✅ No mixed import warnings
   - ✅ token-features: 2.1MB → ~400-600KB
   - ✅ vendor-misc: 2.1MB → distributed across functional chunks
   - ✅ app-core: 1.8MB → ~300-500KB

## 🚨 If Automated Scripts Don't Work

Use this guide to manually apply the changes above. The patterns are consistent and should be straightforward to find/replace in your IDE.

**Search patterns**:
- `await import(` (for dynamic imports to convert to static)
- `import(` (for dynamic imports to convert to static) 
- `import .* from.*investorTypes` (for static imports to convert to dynamic)
- `import .* from.*RegistrationForm` (etc.)
