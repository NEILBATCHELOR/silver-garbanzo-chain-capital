/**
 * Organization Assignment Import/Export Service
 * Service for CSV import/export of organization assignments
 */

import { supabase } from '@/infrastructure/database/client';
import type { AdvancedFilterOptions } from './AdvancedOrganizationFilters';

export interface OrganizationAssignmentRecord {
  userId: string;
  userName: string;
  userEmail: string;
  roleId: string;
  roleName: string;
  organizationId: string | null;
  organizationName: string | null;
  assignmentMode: 'all' | 'multiple' | 'single' | 'none';
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: { row: number; error: string; data: any }[];
  summary: {
    usersProcessed: number;
    assignmentsCreated: number;
    assignmentsUpdated: number;
    assignmentsRemoved: number;
  };
}

export interface ExportOptions extends AdvancedFilterOptions {
  includeHeaders?: boolean;
  format?: 'csv' | 'excel' | 'json';
  filename?: string;
}

export class OrganizationAssignmentImportExportService {
  /**
   * Export organization assignments to CSV
   */
  static async exportToCSV(options: ExportOptions = {}): Promise<{
    csvContent: string;
    filename: string;
    recordCount: number;
  }> {
    try {
      // Build query based on filters
      let query = supabase
        .from('user_organization_roles')
        .select(`
          user_id,
          role_id,
          organization_id,
          created_at,
          updated_at,
          users!inner(name, email),
          roles!inner(name),
          organizations(name)
        `)
        .order('users.name', { ascending: true });

      // Apply filters
      if (options.userIds?.length) {
        query = query.in('user_id', options.userIds);
      }

      if (options.roleIds?.length) {
        query = query.in('role_id', options.roleIds);
      }

      if (options.organizationIds?.length) {
        query = query.in('organization_id', options.organizationIds);
      }

      if (options.createdDateRange?.from) {
        query = query.gte('created_at', options.createdDateRange.from.toISOString());
      }

      if (options.createdDateRange?.to) {
        query = query.lte('created_at', options.createdDateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to export assignments: ${error.message}`);
      }

      // Group assignments by user and role to determine assignment mode
      const userRoleMap = new Map<string, Map<string, string[]>>();
      
      (data || []).forEach(assignment => {
        const userKey = assignment.user_id;
        const roleKey = assignment.role_id;
        
        if (!userRoleMap.has(userKey)) {
          userRoleMap.set(userKey, new Map());
        }
        
        const userRoles = userRoleMap.get(userKey)!;
        if (!userRoles.has(roleKey)) {
          userRoles.set(roleKey, []);
        }
        
        if (assignment.organization_id) {
          userRoles.get(roleKey)!.push(assignment.organization_id);
        }
      });

      // Get total organization count for 'all' mode detection
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id');
      const totalOrgCount = (allOrgs || []).length;

      // Build records for export
      const records: OrganizationAssignmentRecord[] = [];
      const processedUserRoles = new Set<string>();

      (data || []).forEach(assignment => {
        const userRoleKey = `${assignment.user_id}-${assignment.role_id}`;
        
        if (!processedUserRoles.has(userRoleKey)) {
          processedUserRoles.add(userRoleKey);
          
          const userRoleAssignments = userRoleMap.get(assignment.user_id)?.get(assignment.role_id) || [];
          let assignmentMode: 'all' | 'multiple' | 'single' | 'none' = 'none';
          
          if (userRoleAssignments.length === totalOrgCount) {
            assignmentMode = 'all';
          } else if (userRoleAssignments.length > 1) {
            assignmentMode = 'multiple';
          } else if (userRoleAssignments.length === 1) {
            assignmentMode = 'single';
          }

          records.push({
            userId: assignment.user_id,
            userName: assignment.users?.name || 'Unknown User',
            userEmail: assignment.users?.email || 'Unknown Email',
            roleId: assignment.role_id,
            roleName: assignment.roles?.name || 'Unknown Role',
            organizationId: assignment.organization_id,
            organizationName: assignment.organizations?.name || null,
            assignmentMode,
            assignmentCount: userRoleAssignments.length,
            createdAt: assignment.created_at,
            updatedAt: assignment.updated_at
          });
        }
      });

      // Apply additional filters to records
      let filteredRecords = records;

      if (options.searchQuery) {
        const searchLower = options.searchQuery.toLowerCase();
        const searchFields = options.searchFields || ['userName', 'userEmail', 'organizationName', 'roleName'];
        
        filteredRecords = filteredRecords.filter(record => 
          searchFields.some(field => 
            String(record[field as keyof OrganizationAssignmentRecord] || '').toLowerCase().includes(searchLower)
          )
        );
      }

      if (options.assignmentMode) {
        filteredRecords = filteredRecords.filter(record => record.assignmentMode === options.assignmentMode);
      }

      if (options.assignmentCount?.min !== undefined) {
        filteredRecords = filteredRecords.filter(record => record.assignmentCount >= options.assignmentCount!.min!);
      }

      if (options.assignmentCount?.max !== undefined) {
        filteredRecords = filteredRecords.filter(record => record.assignmentCount <= options.assignmentCount!.max!);
      }

      // Apply sorting
      if (options.sortBy) {
        filteredRecords.sort((a, b) => {
          const aValue = a[options.sortBy as keyof OrganizationAssignmentRecord];
          const bValue = b[options.sortBy as keyof OrganizationAssignmentRecord];
          
          const comparison = String(aValue || '').localeCompare(String(bValue || ''));
          return options.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Generate CSV content
      const headers = [
        'User ID',
        'User Name', 
        'User Email',
        'Role ID',
        'Role Name',
        'Organization ID',
        'Organization Name',
        'Assignment Mode',
        'Assignment Count',
        'Created At',
        'Updated At'
      ];

      const rows = filteredRecords.map(record => [
        record.userId,
        record.userName,
        record.userEmail,
        record.roleId,
        record.roleName,
        record.organizationId || '',
        record.organizationName || '',
        record.assignmentMode,
        record.assignmentCount.toString(),
        record.createdAt,
        record.updatedAt
      ]);

      const csvContent = options.includeHeaders !== false 
        ? [headers, ...rows]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n')
        : rows
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = options.filename || `organization-assignments-${timestamp}.csv`;

      return {
        csvContent,
        filename,
        recordCount: filteredRecords.length
      };
    } catch (error) {
      console.error('Error in exportToCSV:', error);
      throw error;
    }
  }

  /**
   * Import organization assignments from CSV
   */
  static async importFromCSV(csvContent: string, options: {
    hasHeaders?: boolean;
    mode?: 'replace' | 'merge' | 'append';
    validateOnly?: boolean;
  } = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      summary: {
        usersProcessed: 0,
        assignmentsCreated: 0,
        assignmentsUpdated: 0,
        assignmentsRemoved: 0
      }
    };

    try {
      // Parse CSV content
      const lines = csvContent.trim().split('\n');
      const startRow = options.hasHeaders !== false ? 1 : 0;
      const dataRows = lines.slice(startRow);
      
      result.totalRows = dataRows.length;

      // Expected CSV format:
      // User ID, User Name, User Email, Role ID, Role Name, Organization IDs (comma-separated), Assignment Mode
      
      const processedUsers = new Set<string>();
      
      for (let i = 0; i < dataRows.length; i++) {
        const rowIndex = i + startRow + 1; // 1-based row number
        
        try {
          const row = this.parseCSVRow(dataRows[i]);
          
          if (row.length < 6) {
            throw new Error('Insufficient columns. Expected at least: User ID, User Name, User Email, Role ID, Role Name, Organization IDs');
          }

          const [userId, userName, userEmail, roleId, roleName, organizationIds, assignmentMode] = row;
          
          // Validate required fields
          if (!userId || !roleId) {
            throw new Error('User ID and Role ID are required');
          }

          // Parse organization IDs
          const orgIds = organizationIds 
            ? organizationIds.split(';').map(id => id.trim()).filter(id => id)
            : [];

          // Validate assignment mode
          const mode = (assignmentMode || 'multiple') as 'all' | 'multiple' | 'single';
          if (!['all', 'multiple', 'single'].includes(mode)) {
            throw new Error('Invalid assignment mode. Must be: all, multiple, or single');
          }

          if (!options.validateOnly) {
            // Remove existing assignments for this user-role combination
            if (options.mode === 'replace' || options.mode === 'merge') {
              const { error: deleteError } = await supabase
                .from('user_organization_roles')
                .delete()
                .eq('user_id', userId)
                .eq('role_id', roleId)
                .not('organization_id', 'is', null);

              if (deleteError) {
                throw new Error(`Failed to remove existing assignments: ${deleteError.message}`);
              }
              
              result.summary.assignmentsRemoved++;
            }

            // Create new assignments
            if (mode === 'all') {
              // Get all organization IDs
              const { data: allOrgs, error: orgError } = await supabase
                .from('organizations')
                .select('id');

              if (orgError) {
                throw new Error(`Failed to fetch organizations: ${orgError.message}`);
              }

              const allOrgIds = (allOrgs || []).map(org => org.id);
              
              const assignments = allOrgIds.map(orgId => ({
                user_id: userId,
                role_id: roleId,
                organization_id: orgId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }));

              const { error: insertError } = await supabase
                .from('user_organization_roles')
                .insert(assignments);

              if (insertError) {
                throw new Error(`Failed to create assignments: ${insertError.message}`);
              }

              result.summary.assignmentsCreated += assignments.length;
            } else if (orgIds.length > 0) {
              // Create assignments for specified organizations
              const assignments = orgIds.map(orgId => ({
                user_id: userId,
                role_id: roleId,
                organization_id: orgId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }));

              const { error: insertError } = await supabase
                .from('user_organization_roles')
                .insert(assignments);

              if (insertError) {
                throw new Error(`Failed to create assignments: ${insertError.message}`);
              }

              result.summary.assignmentsCreated += assignments.length;
            }
          }

          processedUsers.add(userId);
          result.successfulImports++;
        } catch (error) {
          result.errors.push({
            row: rowIndex,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: dataRows[i]
          });
          result.failedImports++;
          result.success = false;
        }
      }

      result.summary.usersProcessed = processedUsers.size;

      return result;
    } catch (error) {
      console.error('Error in importFromCSV:', error);
      result.success = false;
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Import failed',
        data: null
      });
      return result;
    }
  }

  /**
   * Generate CSV template for import
   */
  static generateImportTemplate(): string {
    const headers = [
      'User ID',
      'User Name',
      'User Email', 
      'Role ID',
      'Role Name',
      'Organization IDs (semicolon-separated)',
      'Assignment Mode (all/multiple/single)'
    ];

    const sampleRows = [
      [
        'user-123',
        'John Doe',
        'john.doe@example.com',
        'role-456',
        'Manager',
        'org-1;org-2;org-3',
        'multiple'
      ],
      [
        'user-789',
        'Jane Smith',
        'jane.smith@example.com',
        'role-456',
        'Manager',
        '',
        'all'
      ]
    ];

    return [headers, ...sampleRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  /**
   * Validate CSV format
   */
  static validateCSVFormat(csvContent: string): {
    isValid: boolean;
    errors: string[];
    rowCount: number;
    hasHeaders: boolean;
  } {
    const errors: string[] = [];
    const lines = csvContent.trim().split('\n');
    
    if (lines.length === 0) {
      errors.push('CSV content is empty');
      return { isValid: false, errors, rowCount: 0, hasHeaders: false };
    }

    // Check if first row looks like headers
    const firstRow = this.parseCSVRow(lines[0]);
    const hasHeaders = firstRow.some(cell => 
      ['user id', 'user name', 'role id', 'organization'].some(header => 
        cell.toLowerCase().includes(header)
      )
    );

    const dataStartRow = hasHeaders ? 1 : 0;
    const dataRows = lines.slice(dataStartRow);

    // Validate each data row
    dataRows.forEach((line, index) => {
      const row = this.parseCSVRow(line);
      const rowNumber = index + dataStartRow + 1;

      if (row.length < 6) {
        errors.push(`Row ${rowNumber}: Insufficient columns (expected at least 6, got ${row.length})`);
      }

      const [userId, userName, userEmail, roleId, roleName, organizationIds, assignmentMode] = row;

      if (!userId?.trim()) {
        errors.push(`Row ${rowNumber}: User ID is required`);
      }

      if (!roleId?.trim()) {
        errors.push(`Row ${rowNumber}: Role ID is required`);
      }

      if (assignmentMode && !['all', 'multiple', 'single'].includes(assignmentMode.trim().toLowerCase())) {
        errors.push(`Row ${rowNumber}: Invalid assignment mode '${assignmentMode}' (must be: all, multiple, or single)`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      rowCount: dataRows.length,
      hasHeaders
    };
  }

  /**
   * Parse CSV row handling quoted fields
   */
  private static parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < row.length) {
      const char = row[i];

      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }

    // Add final field
    result.push(current.trim());

    return result;
  }

  /**
   * Download CSV content as file
   */
  static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

export default OrganizationAssignmentImportExportService;
