# Files That Can Be Removed vs Retained - Enhanced Compliance Upload

## 🗑️ **FILES THAT CAN BE REMOVED** (After Migration)

### **Bulk Upload Components (High Confidence - Direct Replacements)**

1. **`/components/compliance/operations/investor/InvestorBulkUpload.tsx`** ✅ REMOVE
   - **Current Usage**: ComplianceDashboard.tsx 
   - **Replacement**: EnhancedInvestorUploadPage.tsx
   - **Action Required**: Update ComplianceDashboard.tsx imports

2. **`/components/compliance/operations/issuer/IssuerBulkUpload.tsx`** ✅ REMOVE  
   - **Current Usage**: ComplianceDashboard.tsx
   - **Replacement**: EnhancedIssuerUploadPage.tsx
   - **Action Required**: Update ComplianceDashboard.tsx imports

3. **`/components/investors/BulkInvestorUpload.tsx`** ✅ REMOVE
   - **Current Usage**: InvestorsList.tsx, lazy-imports.ts
   - **Replacement**: EnhancedInvestorUploadPage.tsx
   - **Action Required**: Update InvestorsList.tsx and lazy-imports.ts

### **Documentation Files**
4. **`/components/investors/BulkInvestorUpload.README.md`** ✅ REMOVE
5. **`/components/compliance/operations/investor/READMEnew.md`** ✅ REMOVE (references old component)
6. **`/components/compliance/operations/issuer/READMEnew.md`** ✅ REMOVE (references old component)

---

## 🔄 **FILES THAT NEED UPDATING** (Import Changes Required)

### **Components Using Old Upload Components**

1. **`/components/compliance/operations/ComplianceDashboard.tsx`** 🔄 UPDATE
   ```typescript
   // REMOVE these imports:
   import { IssuerBulkUpload } from './issuer/IssuerBulkUpload';
   import { InvestorBulkUpload } from './investor/InvestorBulkUpload';
   
   // REPLACE with:
   import { EnhancedInvestorUploadPage, EnhancedIssuerUploadPage } from '@/components/compliance/pages';
   ```

2. **`/components/investors/InvestorsList.tsx`** 🔄 UPDATE
   ```typescript
   // REMOVE:
   import BulkInvestorUpload from './BulkInvestorUpload';
   
   // REPLACE with:
   import { EnhancedInvestorUploadPage } from '@/components/compliance/pages';
   ```

3. **`/utils/lazy-imports.ts`** 🔄 UPDATE
   ```typescript
   // REMOVE:
   BulkInvestorUpload: lazy(() => import('@/components/investors/BulkInvestorUpload')),
   
   // REPLACE with:
   EnhancedInvestorUpload: lazy(() => import('@/components/compliance/pages/EnhancedInvestorUploadPage')),
   ```

4. **`/components/compliance/operations/index.ts`** 🔄 UPDATE
   ```typescript
   // REMOVE:
   export { InvestorBulkUpload } from './investor/InvestorBulkUpload';
   export { IssuerBulkUpload } from './issuer/IssuerBulkUpload';
   
   // These are now available via:
   // import { EnhancedInvestorUploadPage, EnhancedIssuerUploadPage } from '@/components/compliance/pages';
   ```

---

## ✅ **FILES TO RETAIN** (Different Purpose/Still Needed)

### **Onboarding Flow Components** (Not Bulk Upload)
1. **`/components/compliance/issuer/components/FileUpload.tsx`** ✅ RETAIN
   - **Purpose**: Generic file upload for issuer onboarding flow (individual files)
   - **Different from**: Bulk data upload

2. **`/components/compliance/issuer/onboarding/DocumentUpload.tsx`** ✅ RETAIN
   - **Purpose**: Step-by-step document upload during onboarding
   - **Different from**: Bulk document upload

### **Generic Document Management**
3. **`/components/compliance/operations/documents/components/DocumentUploader.tsx`** ✅ RETAIN
   - **Purpose**: Single document upload for specific investor/document type
   - **Different from**: Bulk document upload

4. **`/components/documents/DocumentUploadManager.tsx`** ✅ RETAIN
   - **Purpose**: General document management system
   - **Different from**: Compliance-specific bulk upload

5. **`/components/documents/IssuerDocumentUpload.tsx`** ✅ RETAIN
   - **Purpose**: General issuer document management
   - **Different from**: Bulk upload system

### **Service Files**
6. **`/components/compliance/operations/documents/services/batchUploadService.ts`** ✅ RETAIN
   - **Purpose**: May be used by enhanced system or other components
   - **Action**: Review if enhanced system should use this

### **Cap Table & Token Uploads** (Unrelated)
7. **`/components/captable/SubscriptionUploadDialog.tsx`** ✅ RETAIN
8. **`/components/captable/TokenAllocationUploadDialog.tsx`** ✅ RETAIN
9. **All token config upload dialogs** ✅ RETAIN
10. **`/components/tokens/components/EnhancedTokenConfigUploadDialog.tsx`** ✅ RETAIN

---

## 🚀 **MIGRATION PLAN**

### **Step 1: Test Enhanced System** (Before Removing Anything)
```bash
# Test these URLs:
http://localhost:5173/compliance/upload/investor
http://localhost:5173/compliance/upload/issuer
```

### **Step 2: Update Component Imports** (Safe Updates)
1. Update `ComplianceDashboard.tsx` to use enhanced components
2. Update `InvestorsList.tsx` to use enhanced component
3. Update `lazy-imports.ts` 
4. Update `operations/index.ts`

### **Step 3: Remove Old Files** (After Testing)
1. Remove the 3 bulk upload component files
2. Remove associated README files
3. Clean up any unused imports

### **Step 4: Test After Migration**
1. Verify ComplianceDashboard still works
2. Verify InvestorsList still works
3. Verify enhanced upload pages work
4. Run TypeScript checks

---

## ⚠️ **CRITICAL DEPENDENCIES TO UPDATE**

**Files that MUST be updated before removing old components:**

1. **`ComplianceDashboard.tsx`** - Lines 25-26, 301, 345, 526, 540
2. **`InvestorsList.tsx`** - Line 85, 1688
3. **`operations/index.ts`** - Lines 13, 17
4. **`lazy-imports.ts`** - Lines 7-8

**Total Files to Remove:** 6 files  
**Total Files to Update:** 4 files  
**Total Files to Retain:** 10+ files

This gives you a clear roadmap for cleanup while ensuring nothing breaks!
