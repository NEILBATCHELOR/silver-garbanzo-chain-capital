# Chain Capital Production - Project Requirements Checklist
## Created: August 26, 2025

This document serves as a comprehensive requirements checklist to ensure consistent adherence to project instructions throughout all development work.

## 🔧 Technical Framework Requirements

### Core Stack (MANDATORY)
- [ ] **Framework**: Vite + React + TypeScript only
- [ ] **Database**: Supabase PostgreSQL (remote - never local)
- [ ] **UI Components**: Radix + shadcn/ui ONLY (NO Material UI @mui)
- [ ] **Backend**: Fastify + Prisma + PostgreSQL 
- [ ] **File Extensions**: NO .js in import paths or file names
- [ ] **Import Strategy**: Use MCP filesystem read/write for all file operations

### Architecture Standards
- [ ] **File Size Limit**: Maximum 400 lines per file (refactor if exceeded)
- [ ] **Data Approach**: NO sample/mock/demo data unless instructed - use REAL data
- [ ] **Domain Structure**: Domain-specific organization (avoid centralized files)
- [ ] **Index Files**: Always add index.ts files to folders for organized exports
- [ ] **Error Handling**: Zero build-blocking errors before task completion

## 🗂️ Naming Conventions (CRITICAL)

### Database & SQL (snake_case)
- [ ] **Table Names**: `policy_templates`, `wallet_transactions`
- [ ] **Column Names**: `transaction_hash`, `from_address`, `created_at`
- [ ] **SQL Keywords**: All lowercase with underscores
- [ ] **Enum Types**: `document_type`, `workflow_status`

### TypeScript/JavaScript (camelCase & PascalCase)
- [ ] **Variables/Functions**: `getExplorerUrl()`, `buttonVariants`
- [ ] **Props**: `asChild`, `className` 
- [ ] **Interfaces**: `ButtonProps`, `TransactionTable` (PascalCase)
- [ ] **Types**: `DocumentType`, `InsertTables<T>` (PascalCase)
- [ ] **Classes**: `ExplorerService` (PascalCase)

### React Components
- [ ] **Component Names**: `Button`, `DataTable` (PascalCase)
- [ ] **Component Files**: `button.tsx`, `data-table.tsx` (kebab-case)
- [ ] **Event Handlers**: `onClick`, `onSubmit` (camelCase with 'on' prefix)

### File Naming
- [ ] **Component Files**: `navigation-menu.tsx` (kebab-case)
- [ ] **Service Files**: `ExplorerService.ts` (PascalCase)
- [ ] **Config Files**: `vite.config.ts`, `tsconfig.json` (camelCase)
- [ ] **Directories**: `blockchain-adapters` (kebab-case)

### Constants
- [ ] **Environment Variables**: `API_KEY`, `BLOCKCHAIN_RPC_URL` (UPPER_SNAKE_CASE)
- [ ] **JS Constants**: Context-dependent (UPPER_SNAKE_CASE or camelCase)

## 🔄 Development Process Requirements

### Sequential Workflow (MANDATORY)
- [ ] **MCP Usage**: Always use MCP tools for filesystem and database operations
- [ ] **Database Queries**: Query Supabase database if needed using provided connection string
- [ ] **Web Search**: Search internet as necessary for current information
- [ ] **File Exploration**: Check ALL files and folders within provided directories
- [ ] **Documentation**: Search and review documents when necessary
- [ ] **Memory Management**: Commit all progress to MCP memory system

### Code Quality Standards
- [ ] **Senior Development**: Approach all tasks with 10x engineer mindset
- [ ] **Three Reasoning Lines**: Start analysis with three reasoning lines
- [ ] **Answer Concisely**: Provide short, focused responses
- [ ] **Preserve Comments**: Never delete existing comments
- [ ] **Current State Summary**: Always provide factual status summaries

### Task Completion Standards
- [ ] **Full Implementation**: Do not stop until feature is completely implemented
- [ ] **Error Resolution**: Fix ALL errors before completing tasks
- [ ] **File Organization**: Use existing appropriate locations vs creating new ones
- [ ] **Progress Tracking**: Update memory with task completion status
- [ ] **Build Verification**: Ensure no build-blocking errors remain

## 📁 File Organization Requirements

### Directory Structure
- [ ] **Frontend**: `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend`
- [ ] **Backend**: `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend`
- [ ] **Documentation**: `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/docs`
- [ ] **Fixes**: `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/fix`
- [ ] **Scripts**: `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/scripts`
- [ ] **Tests**: `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/add-tests`

### Key Type Files (READ-ONLY)
- [ ] **Full Schema**: `/src/types/core/full_schema.sql`
- [ ] **Supabase Types**: `/src/types/core/supabase.ts`
- [ ] **Database Types**: `/src/types/core/database.ts`
- [ ] **Central Models**: `/src/types/core/centralModels.ts`

## 🔍 Pre-Implementation Verification

### Database Exploration
- [ ] **Query Database**: Always query database first to understand existing schemas
- [ ] **Analyze Patterns**: Review existing files to understand conventions
- [ ] **Document Findings**: Record discoveries in memory system
- [ ] **Migration Planning**: Create SQL migrations for Supabase compliance only

### Schema Verification
- [ ] **Table Existence**: Verify all required tables exist in database
- [ ] **Column Mapping**: Ensure snake_case DB maps correctly to camelCase TS
- [ ] **Relationship Integrity**: Validate foreign key relationships
- [ ] **Enum Values**: Check enum compatibility between DB and TypeScript

## ✅ Implementation Checkpoints

### Before Starting Each Component
- [ ] **Review Checklist**: Check all requirements before coding
- [ ] **Database Query**: Verify current state of related data
- [ ] **Existing Code**: Analyze similar existing implementations
- [ ] **Memory Check**: Review previous related work in memory

### During Implementation
- [ ] **Naming Conventions**: Verify snake_case for DB, camelCase/PascalCase for TS, kebab-case for files
- [ ] **Code Organization**: Follow domain-specific patterns
- [ ] **Error Handling**: Add comprehensive error boundaries
- [ ] **Type Safety**: Ensure strict TypeScript compliance

### After Implementation
- [ ] **Memory Documentation**: Create observations for completed components
- [ ] **TypeScript Check**: Run compilation verification
- [ ] **Functionality Test**: Verify component works as expected
- [ ] **Integration Test**: Ensure proper integration with existing systems

## 🚀 Pre-Delivery Verification

### Final Quality Check
- [ ] **All Requirements Met**: Cross-reference against original requirements
- [ ] **TypeScript Compilation**: Zero build-blocking errors
- [ ] **Linter Compliance**: No linting errors
- [ ] **Component Integration**: All components properly integrated
- [ ] **Documentation Complete**: README and progress docs updated

### Business Requirements
- [ ] **Real Data Integration**: No mock data - live database integration
- [ ] **Permission Compliance**: Proper permission checking if applicable
- [ ] **User Experience**: Intuitive interface with proper feedback
- [ ] **Performance**: No unnecessary re-renders or performance issues

## 📚 Documentation Requirements

### Progress Tracking
- [ ] **Task Status**: Document completed, partially completed, remaining tasks
- [ ] **File Changes**: Always list modified file names and locations
- [ ] **Memory Updates**: Add observations to memory system
- [ ] **README Updates**: Update or create functional READMEs

### Implementation Documentation
- [ ] **Fix Documentation**: Create fix summaries in `/fix/` directory
- [ ] **General Documentation**: Add progress READMEs to `/docs/` directory
- [ ] **API Documentation**: Maintain OpenAPI/Swagger docs for backend
- [ ] **Migration Scripts**: Document all database changes

## 🎯 Business Logic Standards

### Service Architecture
- [ ] **3-Tier Structure**: Core Domain Services, External API Integration, Business Logic & Workflows
- [ ] **BaseService Pattern**: All services extend BaseService for consistency
- [ ] **Domain Separation**: Clear separation of duties between services
- [ ] **Error Handling**: Comprehensive error handling with user-friendly messages

### Database Standards
- [ ] **RLS Policies**: Proper Row Level Security implementation
- [ ] **Indexing**: Appropriate indexes for performance
- [ ] **Migration Scripts**: Supabase-compliant SQL only
- [ ] **Relationship Integrity**: Proper foreign key constraints

## 🔒 Security & Compliance

### Permission System
- [ ] **Route Protection**: All critical routes protected
- [ ] **Component Protection**: Sensitive components use PermissionGuard
- [ ] **Role-Based Access**: Proper role hierarchy implementation
- [ ] **Permission Caching**: Efficient permission checking with caching

### Data Protection
- [ ] **Input Validation**: Comprehensive validation for all user inputs
- [ ] **SQL Injection Prevention**: Parameterized queries only
- [ ] **XSS Prevention**: Proper output encoding
- [ ] **CSRF Protection**: Anti-CSRF measures in place

---

## ⚠️ Critical Reminders

1. **NEVER use .js in import paths or file names**
2. **ALWAYS use MCP for database queries - never local database**  
3. **FOLLOW naming conventions religiously - no exceptions**
4. **REFACTOR files over 400 lines - ask before doing so**
5. **FIX all errors before completing tasks**
6. **USE real data - no mock/demo data unless instructed**
7. **PRESERVE existing code organization and prevent duplication**
8. **COMMIT progress to memory system consistently**
9. **VERIFY TypeScript compilation before delivery**
10. **MAINTAIN comprehensive documentation**

This checklist must be consulted before, during, and after every development task to ensure consistent adherence to project standards and requirements.
