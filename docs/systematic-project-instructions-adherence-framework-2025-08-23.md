# Systematic Project Instructions Adherence Framework

**Date**: August 23, 2025  
**Purpose**: Ensure 100% consistent adherence to Chain Capital project requirements  
**Status**: ✅ ACTIVE FRAMEWORK

## 🎯 Core Framework Overview

This framework ensures every task follows the established project conventions, architecture patterns, and development standards consistently across all work sessions.

## 📋 Phase 1: Pre-Implementation Analysis

### 1.1 Requirements Checklist Creation
**Before starting ANY task**:

```bash
# Create task-specific checklist
✅ Review full project instructions document
✅ Extract specific naming conventions (snake_case DB, camelCase TS, kebab-case files)
✅ Identify relevant domain constraints
✅ Note architecture patterns (domain-specific, not centralized)
✅ Document required tools (MCP, Supabase, specific frameworks)
```

### 1.2 Database Schema Exploration
**ALWAYS first step for ANY database work**:

```sql
-- Query current schema state
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'target_table';

-- Check existing relationships
SELECT * FROM pg_constraint WHERE contype = 'f';

-- Verify enum types exist
SELECT * FROM pg_type WHERE typname LIKE '%enum%';
```

### 1.3 Codebase Pattern Analysis
**Before writing new code**:
- Search existing similar components: `search_code(path, pattern)`
- Analyze established patterns in target domain
- Document findings in memory immediately
- Verify folder structure follows domain organization

## 🔧 Phase 2: Implementation Execution

### 2.1 Naming Convention Enforcement

#### Database Level (snake_case)
```sql
-- Tables
redemption_windows, investor_documents, compliance_checks

-- Columns  
submission_date_mode, processing_offset_days, created_at

-- Enums
submission_date_mode_enum, document_status_enum
```

#### TypeScript Level (camelCase/PascalCase)
```typescript
// Variables, functions, methods
const submissionDateMode = 'relative';
const calculateProcessingDate = () => {};

// Interfaces, Types, Classes  
interface RedemptionWindow {}
type SubmissionDateMode = 'fixed' | 'relative';
class RedemptionService {}

// React Components (PascalCase files with kebab-case)
// File: enhanced-redemption-manager.tsx
export const EnhancedRedemptionManager = () => {};
```

### 2.2 Architecture Pattern Adherence

#### Domain-Specific Organization
```
/frontend/src/components/
├── redemption/           # Domain: Redemption
│   ├── services/        # RedemptionService, WindowService  
│   ├── types/           # redemption.ts (domain types)
│   ├── dashboard/       # RedemptionDashboard components
│   └── windows/         # Window management components
├── compliance/          # Domain: Compliance
│   ├── services/        # ComplianceService, KycService
│   └── management/      # Management interfaces
```

#### Service Layer Pattern
```typescript
// Follow BaseService pattern
export class RedemptionService extends BaseService {
  constructor() {
    super();
    this.tableName = 'redemption_windows'; // snake_case
  }
  
  async createWindow(data: CreateWindowData): Promise<ServiceResult<RedemptionWindow>> {
    // Convert camelCase to snake_case for database
    const dbData = this.mapFieldsToDatabase(data);
    // Implementation
  }
}
```

### 2.3 Error Prevention Patterns

#### SQL Migration Safety
```sql
-- ❌ WRONG: Default with type conversion
ALTER TABLE redemption_windows 
ADD COLUMN submission_date_mode VARCHAR(20) DEFAULT 'fixed';
ALTER COLUMN submission_date_mode TYPE submission_date_mode_enum;

-- ✅ CORRECT: Update first, then convert
ALTER TABLE redemption_windows 
ADD COLUMN submission_date_mode VARCHAR(20);
UPDATE redemption_windows SET submission_date_mode = 'fixed';
ALTER COLUMN submission_date_mode TYPE submission_date_mode_enum 
USING submission_date_mode::submission_date_mode_enum;
ALTER COLUMN submission_date_mode SET DEFAULT 'fixed';
```

#### TypeScript Compilation Safety  
```typescript
// Always check compilation frequently
npm run type-check  # Every 200-300 lines of code

// Fix property name mismatches immediately
// ❌ Database field: investor_type, Interface: investorType
// ✅ Map correctly in service layer
const dbData = {
  investor_type: data.investorType  // camelCase → snake_case
};
```

## 📊 Phase 3: Implementation Checkpoints

### 3.1 Development Milestones
**Every 200-300 lines of code**:

```bash
# Checkpoint validation
✅ TypeScript compilation: `npm run type-check`
✅ Linting: Check for convention violations  
✅ Memory update: Document progress and patterns
✅ Architecture review: Confirm domain-specific organization
```

### 3.2 Component Integration Points
**Before integrating new components**:

```typescript
// ✅ Check required props match interface
interface ComponentProps {
  submissionDateMode: SubmissionDateMode;  // camelCase
  onUpdate: (data: UpdateData) => void;
}

// ✅ Verify service integration
const redemptionService = new RedemptionService();
const result = await redemptionService.createWindow(data);

// ✅ Add to appropriate index.ts  
export { EnhancedRedemptionManager } from './enhanced-redemption-manager';
```

## 🔍 Phase 4: Pre-Delivery Verification

### 4.1 Comprehensive Testing Checklist
```bash
# Final verification before task completion
✅ TypeScript compilation: Zero errors
✅ Database queries: Test all new/modified queries
✅ Component rendering: Test in browser with console clean
✅ Memory documentation: All findings recorded
✅ File organization: Domain-specific, no duplication
✅ Naming consistency: All conventions followed
```

### 4.2 Documentation Requirements
**Every task completion must include**:

1. **README Update**: Progress summary in `/docs/`
2. **Fix Documentation**: Issues resolved in `/fix/`  
3. **Memory Observations**: Key learnings and patterns
4. **Migration Scripts**: Database changes in `/scripts/`
5. **Test Files**: Backend tests in `/backend/add-tests/`

## 🔄 Phase 5: Continuous Improvement Loop

### 5.1 Session-End Review
**At completion of every task**:
- Review adherence to ALL project instructions  
- Identify any deviations and root causes
- Update systematic approach based on lessons learned
- Create memory entities for future reference

### 5.2 Pattern Recognition
**Build knowledge base of**:
- Common error patterns and solutions
- Successful implementation approaches  
- Architecture decisions and reasoning
- Performance optimization techniques

## 🚨 Critical Anti-Patterns to Avoid

### Database & Schema
```sql
-- ❌ Never create centralized types without domain context
-- ❌ Never ignore existing foreign key relationships
-- ❌ Never apply migrations without testing order of operations
-- ❌ Never use VARCHAR when ENUMs provide better validation
```

### Code Organization  
```typescript
// ❌ Never create centralModels.ts or database.ts modifications
// ❌ Never use @lib imports (project doesn't use them)
// ❌ Never create duplicate folders (investor vs investors)
// ❌ Never ignore domain-specific organization principles
```

### Development Process
```bash
# ❌ Never write 1000+ lines before compilation check
# ❌ Never assume database schema without verification  
# ❌ Never skip memory documentation during development
# ❌ Never create sample/mock data unless specifically requested
```

## ✅ Success Metrics

### Technical Metrics
- **Zero build-blocking errors** at task completion
- **100% naming convention adherence** across all files
- **Domain-specific organization** maintained throughout
- **Memory documentation** completed for every task

### Business Metrics
- **Production-ready code** from first implementation
- **Consistent user experience** across all components  
- **Maintainable architecture** following established patterns
- **Scalable solutions** that integrate seamlessly

## 🎯 Framework Activation Protocol

**For EVERY new task**:

1. **Read this document** before starting work
2. **Query database schema** for relevant tables/relationships
3. **Search existing patterns** in target domain
4. **Create task checklist** with specific requirements  
5. **Document findings** in memory immediately
6. **Execute with checkpoints** every 200-300 lines
7. **Verify comprehensively** before delivery
8. **Update framework** based on new learnings

## 📈 Expected Outcomes

By following this systematic approach, we ensure:

- **Consistent Code Quality**: Every implementation follows established patterns
- **Reduced Technical Debt**: Proper planning prevents architectural mistakes  
- **Faster Development**: Proven patterns accelerate implementation
- **Better Maintainability**: Domain organization and conventions enable easy updates
- **Production Readiness**: Comprehensive verification ensures deployment-ready code

**Framework Status**: ✅ **ACTIVE** - Apply to all subsequent tasks