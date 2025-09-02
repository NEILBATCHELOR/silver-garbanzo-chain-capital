# Project Instructions Adherence System

## Overview

This document establishes a systematic approach to ensure consistent adherence to project instructions throughout all development tasks in the Chain Capital Production-build-progress project.

## 1. Pre-Implementation Requirements Analysis

### 1.1 Instruction Checklist Creation
Before starting any task, create a comprehensive checklist covering:

- **Naming Conventions Verification**
  - Database: snake_case (e.g., `product_lifecycle_events`)
  - TypeScript: camelCase for variables/methods, PascalCase for types/interfaces
  - Files: kebab-case (e.g., `product-lifecycle-manager.tsx`)
  - React Components: PascalCase (e.g., `ProductLifecycleManager`)

- **Database Operations**
  - ALWAYS query Supabase database using MCP postgres tool
  - Verify existing schema before creating new tables
  - Create migration scripts compatible with Supabase syntax
  - Use read-only connection awareness for script generation

- **Code Organization Standards**
  - Domain-specific services (NO centralized database.ts)
  - Maximum 400 lines per file (refactor if exceeded)
  - Index files for organized exports
  - READMEs for new functionality

### 1.2 Technology Stack Verification
- **Frontend**: Vite + React + TypeScript + Supabase
- **UI**: Radix + shadcn/ui (NO Material UI)
- **Backend**: Fastify + Prisma + PostgreSQL
- **Styling**: Tailwind CSS

## 2. Database-First Exploration Process

### 2.1 Schema Analysis
```typescript
// ALWAYS start with schema verification
await postgres.query(`
  SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name LIKE '%product%' 
  ORDER BY table_name, ordinal_position;
`);
```

### 2.2 Existing Data Review
```typescript
// Check for existing data to avoid conflicts
await postgres.query(`
  SELECT COUNT(*) as count, status 
  FROM [table_name] 
  GROUP BY status;
`);
```

## 3. Implementation Checkpoints

### 3.1 Before Starting Each Component
- [ ] Database schema verified
- [ ] Existing patterns analyzed
- [ ] Type definitions checked
- [ ] Service layer architecture understood
- [ ] Naming conventions confirmed

### 3.2 During Implementation
- [ ] TypeScript compilation check every 100 lines
- [ ] Import paths use correct conventions (no .js extensions)
- [ ] Error handling implemented
- [ ] Memory entities created for significant components

### 3.3 Pre-Delivery Verification
- [ ] `npm run type-check` passes
- [ ] No linter warnings
- [ ] All components integrated
- [ ] Documentation updated
- [ ] README created/updated

## 4. Memory Management

### 4.1 Create Entities for Major Components
```typescript
server-memory:create_entities([{
  "name": "Component Implementation [Date]",
  "entityType": "implementation",
  "observations": [
    "Component purpose and functionality",
    "Integration points",
    "Key technical decisions",
    "Known limitations or TODOs"
  ]
}]);
```

### 4.2 Add Observations for Progress
```typescript
server-memory:add_observations([{
  "entityName": "Project Name",
  "contents": [
    "Milestone completed: [description]",
    "Issue resolved: [description]",
    "Next steps: [description]"
  ]
}]);
```

## 5. Quality Assurance Process

### 5.1 Code Quality Checks
- **Lines of Code**: Max 400 per file
- **TypeScript**: Strict mode compliance
- **Testing**: Build-blocking error resolution
- **Performance**: Optimization for production use

### 5.2 Documentation Requirements
- **Fix Documentation**: `/fix/[specific-issue-name]-[date].md`
- **Progress Documentation**: `/docs/[feature-name]-[status]-[date].md`
- **Implementation Guides**: Complete with usage examples

## 6. Error Resolution Protocol

### 6.1 Three-Line Reasoning Analysis
Start every error investigation with:
1. "The error might be caused by..."
2. "Another possibility is..."
3. "The most likely root cause appears to be..."

### 6.2 Build-Blocking Error Priority
- **Database connectivity issues**: Highest priority
- **TypeScript compilation errors**: High priority
- **Missing dependencies**: High priority
- **UI/UX issues**: Medium priority

## 7. File Organization Standards

### 7.1 Directory Structure
```
/components
  /[domain-name]
    /[sub-feature]
      ComponentName.tsx
    index.ts
/services
  /[domain-name]
    serviceName.ts
    index.ts
/types
  /[domain-name]
    types.ts
    index.ts
```

### 7.2 Import/Export Patterns
```typescript
// Use index files for clean imports
export { ComponentName } from './ComponentName';
export type { TypeName } from './types';

// Import without file extensions
import { ComponentName } from '@/components/domain';
```

## 8. Testing and Validation

### 8.1 Manual Testing Checklist
- [ ] Component renders without errors
- [ ] Form submission works correctly
- [ ] Data persistence verified
- [ ] Error handling tested
- [ ] Edge cases covered

### 8.2 Integration Testing
- [ ] API endpoints functional
- [ ] Database operations successful
- [ ] Component communication working
- [ ] State management correct

## 9. Implementation Completion Criteria

### 9.1 Definition of Done
- [ ] All requirements implemented
- [ ] Zero build-blocking errors
- [ ] Documentation complete
- [ ] Integration verified
- [ ] Memory entities updated

### 9.2 Delivery Summary Required
- [ ] Files modified/created listed
- [ ] Key changes summarized
- [ ] Known limitations documented
- [ ] Next steps identified

## 10. Continuous Improvement

### 10.1 Session Retrospective
After each major implementation:
- What went well?
- What could be improved?
- What should be added to this system?

### 10.2 System Updates
This adherence system should be updated based on:
- Recurring issues discovered
- New project requirements
- Technology stack changes
- Team feedback

---

**Remember**: This system is designed to prevent the accumulation of technical debt and ensure consistent quality across all implementations.
