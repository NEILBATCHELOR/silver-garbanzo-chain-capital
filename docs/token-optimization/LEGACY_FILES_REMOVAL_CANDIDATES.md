# Legacy Files Removal Candidates

## 🚨 READY FOR REMOVAL - Please Confirm

### 1. Legacy Token Edit Form (Confirmed Unused)
```
src/components/tokens/components/TokenEditForm.tsx
```
**Status**: ❌ NOT IMPORTED ANYWHERE  
**Description**: Legacy edit form component with debug integration  
**Size**: 311 lines  
**Safe to Remove**: ✅ YES  
**Reason**: Replaced by ComprehensiveTokenEditForm system

### 2. Legacy Token Dashboard (Backup File)
```
src/components/tokens/pages/LegacyTokenDashboardPage.tsx
```
**Status**: 📁 RENAMED BACKUP  
**Description**: Original non-optimized dashboard (1,318 lines)  
**Size**: 1,318 lines  
**Safe to Remove**: ⚠️ CONFIRM FIRST  
**Reason**: Replaced by optimized version, kept as backup

## ⚠️ STILL IN USE - DO NOT REMOVE YET

### Legacy Forms System
These files are still being used by other components and should NOT be removed until those components are migrated:

```
src/components/tokens/forms/
├── TokenForm.tsx               # Used by: CreateTokenPage.tsx
├── BaseTokenEditForm.tsx       # Used by: All ERC*EditForm components  
├── ERC20EditForm.tsx          # Used by: TokenEditDialog, TokenEditPage
├── ERC721EditForm.tsx         # Used by: TokenEditDialog, TokenEditPage
├── ERC1155EditForm.tsx        # Used by: TokenEditDialog, TokenEditPage
├── ERC1400EditForm.tsx        # Used by: TokenEditDialog, TokenEditPage
├── ERC3525EditForm.tsx        # Used by: TokenEditDialog, TokenEditPage
├── ERC4626EditForm.tsx        # Used by: TokenEditDialog, TokenEditPage
├── FieldRenderer.tsx          # Used by: BaseTokenEditForm
└── types.ts                   # Used by: Form components
```

**Dependencies Found**:
- `CreateTokenPage.tsx` imports `TokenForm.tsx`
- `TokenEditDialog.tsx` imports all `ERC*EditForm.tsx` files
- `TokenEditPage.tsx` imports all `ERC*EditForm.tsx` files
- All `ERC*EditForm.tsx` files import `BaseTokenEditForm.tsx`

## Removal Action Required

Please confirm if you want to proceed with removing these specific files:

### Option 1: Remove Confirmed Unused Files ✅
```bash
# Remove the confirmed unused legacy edit form
rm src/components/tokens/components/TokenEditForm.tsx
```

### Option 2: Remove Backup File (If Confident) ⚠️
```bash
# Remove the legacy dashboard backup (proceed with caution)
rm src/components/tokens/pages/LegacyTokenDashboardPage.tsx
```

### Option 3: Keep Everything for Now 🔒
Keep all files until further testing confirms the optimized system is fully stable.

## Migration Strategy for Forms

To eventually remove the legacy forms system:

1. **Update CreateTokenPage** to use ComprehensiveTokenEditForm
2. **Update TokenEditDialog** to use TokenEditModal (already optimized)
3. **Update TokenEditPage** to use comprehensive forms
4. **Remove legacy forms** once all dependencies are migrated

## File Size Impact

**Immediate Removal Potential**:
- `TokenEditForm.tsx`: 311 lines
- `LegacyTokenDashboardPage.tsx`: 1,318 lines
- **Total**: 1,629 lines of legacy code

**Future Removal Potential** (after migration):
- Legacy forms system: ~2,000+ lines of code
- **Total Future Cleanup**: ~3,600+ lines

## Recommendation

**SAFE APPROACH**:
1. ✅ Remove `TokenEditForm.tsx` (confirmed unused)
2. ⚠️ Keep `LegacyTokenDashboardPage.tsx` as backup for 1-2 weeks
3. 🔄 Plan migration of remaining form-dependent components
4. 🗑️ Remove forms system after successful migration

**AGGRESSIVE APPROACH**:
1. ✅ Remove both legacy files immediately
2. 🚨 Risk: No easy rollback if issues discovered
3. ✅ Benefit: Immediate cleanup, forced commitment to new system

---

**Please confirm which files you want to remove:**
- [ ] `TokenEditForm.tsx` (Confirmed safe)
- [ ] `LegacyTokenDashboardPage.tsx` (Backup file)
- [ ] Neither (keep as insurance)
