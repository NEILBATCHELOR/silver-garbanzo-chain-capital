# Comprehensive Service Audit Integration Analysis

**Generated**: 2025-06-19T10:16:21.710Z
**Total Files Analyzed**: 300
**Total Database Operations**: 1082
**Files Needing Integration**: 116

## 🎯 Priority Implementation List

### 1. src/services/investor/investors.ts (HIGH PRIORITY)

- **Operations**: 47
- **Lines**: 776
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 30, .insert(: 4, .update(: 4, .delete(: 9

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 2. src/services/integrations/InvestorServices.ts (HIGH PRIORITY)

- **Operations**: 38
- **Lines**: 522
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 2, .from(: 20, .insert(: 8, .update(: 3, .delete(: 5

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 3. src/services/policy/enhancedPolicyTemplateService.ts (HIGH PRIORITY)

- **Operations**: 32
- **Lines**: 551
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 19, .insert(: 4, .update(: 5, .delete(: 4

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 4. src/services/rule/enhancedRuleService.ts (HIGH PRIORITY)

- **Operations**: 30
- **Lines**: 766
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 18, .insert(: 4, .update(: 1, .delete(: 3, .upsert(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 5. src/services/captable/capTableService.ts (HIGH PRIORITY)

- **Operations**: 29
- **Lines**: 674
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 19, .insert(: 3, .update(: 4, .delete(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 6. src/services/guardian/GuardianTestDatabaseService.ts (MEDIUM PRIORITY)

- **Operations**: 29
- **Lines**: 534
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 4, .from(: 18, .insert(: 4, .update(: 2, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 7. src/components/captable/TokenAllocationManager.tsx (MEDIUM PRIORITY)

- **Operations**: 29
- **Lines**: 2171
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 17, .insert(: 2, .update(: 7, .delete(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 8. src/services/wallet/MultiSigWalletService.ts (MEDIUM PRIORITY)

- **Operations**: 26
- **Lines**: 434
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 20, .insert(: 3, .update(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 9. src/infrastructure/api.ts (MEDIUM PRIORITY)

- **Operations**: 26
- **Lines**: 442
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 14, .insert(: 1, .update(: 11

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 10. src/services/project/projectService.ts (MEDIUM PRIORITY)

- **Operations**: 25
- **Lines**: 352
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 16, .insert(: 1, .update(: 3, .delete(: 4

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 11. src/services/document/documentService.ts (MEDIUM PRIORITY)

- **Operations**: 23
- **Lines**: 495
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 15, .insert(: 4, .update(: 3, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 12. src/services/redemption/redemptionService.ts (MEDIUM PRIORITY)

- **Operations**: 21
- **Lines**: 467
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 13, .insert(: 2, .update(: 4, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 13. src/services/auth/authService.ts (MEDIUM PRIORITY)

- **Operations**: 20
- **Lines**: 573
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 12, supabase.rpc(: 1, .insert(: 3, .update(: 1, .delete(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 14. src/services/policy/policyTemplateService.ts (MEDIUM PRIORITY)

- **Operations**: 20
- **Lines**: 368
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 12, .insert(: 3, .update(: 3, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 15. src/infrastructure/api/approvalApi.ts (MEDIUM PRIORITY)

- **Operations**: 20
- **Lines**: 471
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 14, .insert(: 2, .update(: 4

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 16. src/infrastructure/database/queries/complianceQueries.ts (LOW PRIORITY)

- **Operations**: 20
- **Lines**: 327
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 15, .insert(: 1, .update(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 17. src/services/dfns/dfnsService.ts (LOW PRIORITY)

- **Operations**: 19
- **Lines**: 898
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 12, .insert(: 4, .upsert(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 18. src/infrastructure/database/queries/tokenQueries.ts (LOW PRIORITY)

- **Operations**: 19
- **Lines**: 254
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 15, .insert(: 1, .update(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 19. src/services/policy/enhancedPolicyService.ts (LOW PRIORITY)

- **Operations**: 18
- **Lines**: 415
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 11, .insert(: 2, .delete(: 4, .upsert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 20. src/services/user/users.ts (LOW PRIORITY)

- **Operations**: 17
- **Lines**: 542
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 11, .insert(: 3, .update(: 2, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 21. src/infrastructure/database/queries/auditQueries.ts (LOW PRIORITY)

- **Operations**: 16
- **Lines**: 323
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 13, .insert(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 22. src/services/audit/TableAuditGenerator.ts (LOW PRIORITY)

- **Operations**: 15
- **Lines**: 383
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 9, supabase.rpc(: 1, .insert(: 2, .update(: 1, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 23. src/services/deployment/DeploymentService.ts (LOW PRIORITY)

- **Operations**: 15
- **Lines**: 842
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 8, .update(: 5, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 24. src/services/wallet/MonitoringService.ts (LOW PRIORITY)

- **Operations**: 15
- **Lines**: 681
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 11, .insert(: 2, .upsert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 25. src/services/document/documentStorage.ts (LOW PRIORITY)

- **Operations**: 14
- **Lines**: 479
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 10, .insert(: 1, .update(: 2, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 26. src/services/policy/approvalService.ts (LOW PRIORITY)

- **Operations**: 14
- **Lines**: 290
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 11, .update(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 27. src/infrastructure/database/queries/projectQueries.ts (LOW PRIORITY)

- **Operations**: 14
- **Lines**: 199
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 11, .insert(: 1, .update(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 28. src/infrastructure/database/queries/userQueries.ts (LOW PRIORITY)

- **Operations**: 14
- **Lines**: 146
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 9, .insert(: 1, .update(: 2, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 29. src/services/projectCredentials/projectCredentialsService.ts (LOW PRIORITY)

- **Operations**: 13
- **Lines**: 312
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 9, .insert(: 2, .update(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 30. src/services/rule/ruleTemplateService.ts (LOW PRIORITY)

- **Operations**: 13
- **Lines**: 372
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 8, .insert(: 2, .update(: 1, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 31. src/services/wallet/moonpay/core/NFTService.ts (LOW PRIORITY)

- **Operations**: 13
- **Lines**: 420
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 9, .insert(: 1, .update(: 2, .upsert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 32. src/infrastructure/api/endpoints/deploymentApiService.ts (LOW PRIORITY)

- **Operations**: 12
- **Lines**: 501
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 8, .insert(: 2, .update(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 33. src/services/integrations/restrictionService.ts (LOW PRIORITY)

- **Operations**: 11
- **Lines**: 290
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 8, .insert(: 1, .update(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 34. src/services/project/enhanced-project-service.ts (LOW PRIORITY)

- **Operations**: 11
- **Lines**: 684
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 7, .insert(: 1, .update(: 2, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 35. src/services/rule/ruleService.ts (LOW PRIORITY)

- **Operations**: 11
- **Lines**: 233
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 7, .insert(: 2, .update(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 36. src/infrastructure/subscriptions.ts (LOW PRIORITY)

- **Operations**: 11
- **Lines**: 453
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 6, .insert(: 2, .update(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 37. src/components/captable/SubscriptionManager.tsx (LOW PRIORITY)

- **Operations**: 11
- **Lines**: 1681
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 3, .from(: 4, .insert(: 3, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 38. src/services/policy/policyApproverService.ts (LOW PRIORITY)

- **Operations**: 10
- **Lines**: 266
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 7, .insert(: 1, .update(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 39. src/services/policy/policyService.ts (LOW PRIORITY)

- **Operations**: 10
- **Lines**: 368
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 7, .delete(: 2, .upsert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 40. src/services/user/roles.ts (LOW PRIORITY)

- **Operations**: 10
- **Lines**: 188
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 6, .insert(: 2, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 41. src/services/deployment/DeploymentRateLimiter.ts (LOW PRIORITY)

- **Operations**: 9
- **Lines**: 330
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 6, .insert(: 1, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 42. src/services/dfns/ramp-network-data-service.ts (LOW PRIORITY)

- **Operations**: 9
- **Lines**: 563
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 6, .insert(: 1, .update(: 1, .upsert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 43. src/services/project/primaryProjectService.ts (LOW PRIORITY)

- **Operations**: 9
- **Lines**: 163
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 6, .update(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 44. src/services/wallet/SecurityService.ts (LOW PRIORITY)

- **Operations**: 9
- **Lines**: 685
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 6, .insert(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 45. src/infrastructure/sessionManager.ts (LOW PRIORITY)

- **Operations**: 9
- **Lines**: 185
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 5, .insert(: 1, .update(: 2, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 46. src/services/deployment/notifications/DeploymentNotificationManager.ts (LOW PRIORITY)

- **Operations**: 8
- **Lines**: 443
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 2, .from(: 4, .insert(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 47. src/infrastructure/api/transactionHistoryApi.ts (LOW PRIORITY)

- **Operations**: 8
- **Lines**: 222
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 5, supabase.rpc(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 48. src/infrastructure/guardian/GuardianAuth.ts (LOW PRIORITY)

- **Operations**: 8
- **Lines**: 222
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 8

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 49. src/components/UserManagement/dashboard/PermissionsMatrixModal.tsx (LOW PRIORITY)

- **Operations**: 8
- **Lines**: 302
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 4, .insert(: 1, .delete(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 50. src/components/captable/DocumentManager.tsx (LOW PRIORITY)

- **Operations**: 8
- **Lines**: 649
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 6, .insert(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 51. src/services/dashboard/dashboardDataService.ts (LOW PRIORITY)

- **Operations**: 7
- **Lines**: 313
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 7

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 52. src/services/guardian/GuardianWalletDatabaseService.ts (LOW PRIORITY)

- **Operations**: 7
- **Lines**: 269
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 5, .insert(: 1, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 53. src/infrastructure/api/internal.ts (LOW PRIORITY)

- **Operations**: 7
- **Lines**: 162
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 4, .insert(: 1, .update(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 54. src/infrastructure/auditLogger.ts (LOW PRIORITY)

- **Operations**: 7
- **Lines**: 382
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 4, supabase.rpc(: 1, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 55. src/infrastructure/keyVault/keyVaultClient.ts (LOW PRIORITY)

- **Operations**: 7
- **Lines**: 253
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 5, .insert(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 56. src/infrastructure/web3/adapters/NEARAdapter.ts (LOW PRIORITY)

- **Operations**: 7
- **Lines**: 510
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 7

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 57. src/services/compliance/complianceService.ts (LOW PRIORITY)

- **Operations**: 6
- **Lines**: 243
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 4, .insert(: 1, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 58. src/services/policy/policyVersionService.ts (LOW PRIORITY)

- **Operations**: 6
- **Lines**: 150
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 5, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 59. src/services/realtime/websocketService.ts (LOW PRIORITY)

- **Operations**: 6
- **Lines**: 440
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .delete(: 6

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 60. src/services/wallet/TransactionMonitorService.ts (LOW PRIORITY)

- **Operations**: 6
- **Lines**: 209
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 5, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 61. src/infrastructure/database/client.ts (LOW PRIORITY)

- **Operations**: 6
- **Lines**: 294
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 6

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 62. src/components/captable/CapTableDashboard.tsx (LOW PRIORITY)

- **Operations**: 6
- **Lines**: 339
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 6

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 63. src/services/wallet/MoonpayService.ts (LOW PRIORITY)

- **Operations**: 5
- **Lines**: 1168
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 3, .insert(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 64. src/infrastructure/dfns/webhook-manager.ts (LOW PRIORITY)

- **Operations**: 5
- **Lines**: 787
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1, .update(: 2, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 65. src/components/captable/TokenMintingManager.tsx (LOW PRIORITY)

- **Operations**: 5
- **Lines**: 1864
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 4, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 66. src/services/auth/permissionService.ts (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 46
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 2, .upsert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 67. src/services/wallet/RipplePaymentsService.ts (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 545
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 3, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 68. src/services/wallet/SwapService.ts (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 1169
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 3, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 69. src/services/wallet/TransferService.ts (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 514
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 70. src/infrastructure/guardian/GuardianKeyManager.ts (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 227
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 4

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 71. src/infrastructure/web3/MultiSigWalletManager.ts (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 202
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 3, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 72. src/infrastructure/web3/adapters/AptosAdapter.ts (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 285
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 2, .update(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 73. src/components/captable/TokenDistributionManager.tsx (LOW PRIORITY)

- **Operations**: 4
- **Lines**: 2227
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 3, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 74. src/services/deployment/notifications/TransactionNotifier.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 317
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1, .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 75. src/services/wallet/WalletManager.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 903
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 76. src/services/wallet/moonpay/core/OffRampService.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 405
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 77. src/services/wallet/moonpay/core/OnRampService.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 388
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 78. src/infrastructure/activityLogger.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 70
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 79. src/infrastructure/audit.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 67
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 80. src/infrastructure/dfns/account-abstraction-manager.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 887
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 81. src/infrastructure/dfns/fiat-manager.ts (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 1026
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 3

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 82. src/components/UserManagement/dashboard/AddRoleModal.tsx (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 184
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 83. src/components/UserManagement/dashboard/EditRoleModal.tsx (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 221
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2, .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 84. src/components/captable/TagsDialog.tsx (LOW PRIORITY)

- **Operations**: 3
- **Lines**: 250
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: supabase.from(: 1, .from(: 1, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 85. src/services/integrations/onfidoService.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 145
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 1, .insert(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 86. src/services/wallet/generators/AptosWalletGenerator.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 52
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 87. src/services/wallet/generators/NEARWalletGenerator.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 52
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 88. src/services/wallet/generators/SolanaWalletGenerator.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 52
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 89. src/services/wallet/generators/StellarWalletGenerator.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 52
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 90. src/services/wallet/generators/SuiWalletGenerator.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 52
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 91. src/infrastructure/api/policyApi.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 201
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 92. src/infrastructure/auth/auth.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 113
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 93. src/infrastructure/dfns/client.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 804
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1, .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 94. src/infrastructure/dfns/delegated-signing-manager.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 884
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 95. src/infrastructure/dfns/exchange-manager.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 734
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .delete(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 96. src/infrastructure/dfns/policy-manager.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 884
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .update(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 97. src/infrastructure/web3/adapters/bitcoin/BitcoinAdapter.ts (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 491
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 98. src/components/UserManagement/policies/PolicyRules.tsx (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 495
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 99. src/components/auth/ProtectedRoute.tsx (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 195
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 100. src/components/captable/CapTableManagerNew.tsx (LOW PRIORITY)

- **Operations**: 2
- **Lines**: 468
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 2

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 101. src/services/audit/UniversalAuditService.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 317
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 102. src/services/blockchain/TransactionMonitor.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 166
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 103. src/infrastructure/dfns/adapters/KeysAdapter.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 732
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 104. src/infrastructure/dfns/adapters/PolicyAdapter.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 715
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .update(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 105. src/infrastructure/dfns/adapters/WalletAdapter.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 474
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 106. src/infrastructure/onchainid/IdentityService.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 439
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 107. src/infrastructure/web3/ProviderManager.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 403
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .delete(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 108. src/infrastructure/web3/adapters/RippleAdapter.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 317
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 109. src/infrastructure/web3/adapters/StellarAdapter.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 389
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 110. src/infrastructure/web3/adapters/SuiAdapter.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 209
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 111. src/components/UserManagement/security/MultiSigModal.tsx (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 290
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 112. src/components/auth/services/authService.ts (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 763
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 113. src/components/captable/ProjectSelector.tsx (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 240
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 114. src/components/captable/ScenarioPlanner.tsx (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 624
- **Has Supabase**: No
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 115. src/components/captable/SubscriptionDialog.tsx (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 351
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

### 116. src/components/captable/TokenAllocationForm.tsx (LOW PRIORITY)

- **Operations**: 1
- **Lines**: 598
- **Has Supabase**: Yes
- **Has Audit**: No
- **Operations Found**: .from(: 1

**Implementation Steps**:
1. Add Universal Database Service import
2. Replace Supabase calls with audit-enabled methods
3. Add userId parameter to function signatures
4. Test thoroughly

## 📊 Implementation Timeline

- **Week 1**: Top 5 priority files
- **Week 2**: Next 5 priority files
- **Week 3-4**: Remaining infrastructure and component services
- **Week 5**: Testing and validation

**Expected Timeline**: 5-6 weeks for complete integration