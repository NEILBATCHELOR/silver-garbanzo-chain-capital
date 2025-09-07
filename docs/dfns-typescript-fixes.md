# DFNS TypeScript Errors Fix

## Overview
Fixed critical TypeScript compatibility issues in the DFNS authentication infrastructure that were preventing successful compilation.

## Issues Fixed

### 1. DfnsUserRecovery.tsx
- **Issue**: DfnsUserRecoveryManager constructor called without required config parameter
- **Fix**: Added proper DfnsClientConfig parameter using DEFAULT_CLIENT_CONFIG
- **Issue**: Incorrect method name `sendRecoveryCodeEmail` 
- **Fix**: Changed to correct method name `sendRecoveryCode`

### 2. auth-adapter.ts
- **Issue**: Return type mismatch in `getAuthHeaders` method (Promise<AuthHeaders | Record<string, string>> vs Promise<AuthHeaders>)
- **Fix**: 
  - Added explicit `: Promise<AuthHeaders>` return type
  - Added type casting to ensure proper AuthHeaders format
  - Used `this.getConfig().appId` instead of direct config access
- **Issue**: Incorrect method references in EnhancedDfnsAuth
- **Fix**: 
  - Changed `getAuthHeaders` to `createAuthenticatedHeaders`
  - Changed `authenticateDeleg