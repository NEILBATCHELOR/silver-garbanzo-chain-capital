# Structured Implementation Approach

## Overview
This document outlines the systematic approach for consistently adhering to Chain Capital project instructions and maintaining high-quality code delivery.

## 1. Initial Requirements Analysis

### Pre-Task Checklist
- [ ] Create comprehensive checklist of all project requirements
- [ ] Break down complex instructions into verifiable points  
- [ ] Document requirements in MCP memory system
- [ ] Recall previous observations and entities from memory
- [ ] Query remote Supabase database to understand current schema
- [ ] Analyze existing files and folder structure

### Critical Project Constraints
- **Technology Stack**: Vite + React + TypeScript + Supabase + Radix UI + shadcn/ui
- **Backend**: Fastify + Prisma with separation of duties
- **Import Paths**: NO .js extensions allowed
- **UI Framework**: ONLY Radix UI and shadcn/ui, NO Material UI
- **Database**: Remote Supabase (never local)
- **Types**: Domain-specific philosophy, avoid centralized types

## 2. Pre-Implementation Database/Codebase Exploration

### Database First Approach
```sql
-- Always start with schema exploration
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;
```

### File Structure Analysis
- Check existing folder organization
- Identify appropriate location for new files
- Review domain-specific type structure
- Understand current naming conventions

## 3. Implementation Checkpoints

### Naming Conventions Verification
- **Database/SQL**: `snake_case` (policy_templates, created_at)
- **TypeScript/JavaScript**: `camelCase` & `PascalCase` (getExplorerUrl, ButtonProps)
- **React Components**: `PascalCase` names, `kebab-case` files (Button → button.tsx)
- **File Naming**: `kebab-case` for components, directories

### Code Organization Standards
- Keep files under 400 lines (refactor if exceeding)
- Create index files for folder exports
- Use existing folder structure
- Maintain domain-specific types

### Error Handling Requirements
- Always fix TypeScript/linter errors before delivery
- Handle common pattern: `T | null` instead of `T | undefined`
- Test compilation frequently: `tsc --noEmit`

## 4. Pre-Delivery Verification

### Final Quality Checks
- [ ] Run final check against all project instructions
- [ ] Verify no TypeScript or linter errors exist
- [ ] Ensure all components are properly tested and integrated
- [ ] Confirm documentation is complete and follows standards
- [ ] Test build process for build-blocking errors

### Documentation Requirements
- Update READMEs in `/docs` folder
- Create progress summaries
- List all modified files and locations
- Document completed, partially completed, and remaining tasks

## 5. Continuous Learning Loop

### Memory Management
- Create observations after completing significant components
- Document lessons learned in memory entities
- Update systematic approach based on feedback
- Reference previous work to avoid repeating mistakes

### Progress Tracking
- Commit all progress to MCP memory system
- Create entities for major components
- Establish relations between related work
- Search previous observations before starting new tasks

## Common Patterns & Best Practices

### Backend Development
- Build incrementally with frequent compilation checks
- Query actual database schema before coding  
- Start with minimal viable service, then extend
- Test each service layer independently
- Enhance existing server files rather than creating new ones

### User Management
- Always add `profile_type` when adding/editing users
- Only use permissions from `permissions_rows.csv`
- Reference profiles table structure for user operations

### Frontend Development
- Use existing component patterns as templates
- Maintain consistent folder organization
- Implement proper error boundaries
- Follow Radix UI and shadcn/ui conventions

## Error Prevention

### Common Issues to Avoid
- ❌ Writing thousands of lines before compiling
- ❌ Assuming database schemas without verification
- ❌ Creating complex type hierarchies without validation
- ❌ Implementing multiple services simultaneously
- ❌ Creating centralized type files unnecessarily

### Success Patterns
- ✅ Build incrementally with frequent checks
- ✅ Query database first, then implement
- ✅ Use existing code as precise templates
- ✅ Test each layer independently
- ✅ Maintain domain-specific organization

## Implementation Workflow

### Phase-Based Approach
1. **Foundation Phase** (≤100 lines): Basic types, core structure
2. **Core Service Phase** (≤300 lines): Primary functionality
3. **Validation Phase** (≤200 lines): Error handling, validation
4. **Integration Phase** (≤400 lines): API routes, UI components

### Memory System Integration
- Document each phase completion
- Create observations for significant milestones
- Establish relationships between components
- Track technical debt and resolution

This structured approach ensures consistent adherence to project instructions while maintaining high code quality and preventing common implementation issues.
