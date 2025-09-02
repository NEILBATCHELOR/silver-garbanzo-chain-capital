# User and Role Management Service

## Overview

Comprehensive user management, role administration, and permission handling service for the Chain Capital backend.

## Files

- `UserRoleService.ts` - Main service class with CRUD operations
- `UserRoleValidationService.ts` - Business rules validation and data integrity
- `UserRoleAnalyticsService.ts` - Analytics, reporting, and export functionality
- `index.ts` - Service exports and type re-exports

## Features

### User Management
- Complete CRUD operations for users
- Role assignment and management
- Status management (active, inactive, pending, blocked, invited)
- Password reset and security features
- Bulk operations for efficient user management

### Role System
- System and custom role support
- Priority-based role hierarchy  
- Granular permission assignment
- Role protection for system roles
- Impact tracking for role changes

### Permission Management
- Resource-action permission format
- Permission matrix visualization
- Conflict detection and security validation
- Usage analytics and optimization

### Analytics & Reporting
- User statistics and demographics
- Role distribution analysis
- Permission usage tracking
- Timeline and trend analysis
- Multiple export formats (CSV, Excel, PDF, JSON)

## API Endpoints

Base URL: `/api/v1/`

### Core Operations
- `GET /users` - List users with filtering
- `POST /users` - Create user
- `GET/PUT/DELETE /users/:id` - User operations
- `GET /roles` - List roles
- `POST /roles` - Create role
- `GET/PUT/DELETE /roles/:id` - Role operations
- `GET /permissions` - List permissions
- `GET /permissions/matrix` - Permission matrix

### Advanced Features
- `POST /users/:id/reset-password` - Password reset
- `PUT /users/bulk-update` - Bulk operations
- `POST /roles/:id/permissions` - Assign permissions
- `GET /users/statistics` - User analytics
- `GET /roles/statistics` - Role analytics
- `POST /users/export` - Data export

## Usage

```typescript
import { UserRoleService } from '@/services/users'

const userService = new UserRoleService()

// Create user
const result = await userService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  roleId: 'role-uuid',
  autoGeneratePassword: true,
  sendInvite: true
})

// Get users with filtering
const users = await userService.getUsers({
  status: ['active'],
  includeRole: true,
  page: 1,
  limit: 20
})
```

## Testing

```bash
npm run test:users
```

## Documentation

See `/docs/backend-user-role-service-complete.md` for complete API documentation and implementation details.

---

**Status**: ✅ Complete and ready for production use
