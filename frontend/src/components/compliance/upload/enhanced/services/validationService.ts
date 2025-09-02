/**
 * Enhanced Upload Validation Service
 * 
 * Comprehensive validation engine for compliance data uploads
 * supporting both investor and issuer data with configurable rules
 */

import {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationContext,
  ValidationSchema,
  InvestorValidationSchema,
  IssuerValidationSchema,
  CommonValidationRules,
  BatchValidationResult,
  BatchValidationOptions,
  DuplicateDetectionRule,
  DuplicateDetectionResult,
  ValidatorType,
  ValidationSeverity
} from '../types/validationTypes';
import Papa from 'papaparse';
import { InvestorTemplateRow, IssuerTemplateRow } from '../types/uploadTypes';

export class ValidationService {
  private static instance: ValidationService;
  private commonRules: CommonValidationRules;

  constructor() {
    this.initializeCommonRules();
  }

  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  /**
   * Initialize common validation rules used across entity types
   */
  private initializeCommonRules(): void {
    this.commonRules = {
      email: {
        field: 'email',
        type: 'email',
        required: true,
        message: 'Valid email address is required',
        severity: 'error',
        validator: (value: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value.trim());
        },
        transformer: (value: string) => value.toLowerCase().trim()
      },
      date: {
        field: 'date',
        type: 'date',
        message: 'Date must be in YYYY-MM-DD format',
        severity: 'error',
        validator: (value: string) => {
          if (!value) return true; // Optional dates are valid
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) return false;
          const date = new Date(value);
          return date instanceof Date && !isNaN(date.getTime());
        },
        transformer: (value: string) => value ? value.trim() : null
      },
      boolean: {
        field: 'boolean',
        type: 'custom',
        message: 'Value must be true or false',
        severity: 'error',
        validator: (value: string) => {
          if (!value) return true;
          return ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase());
        },
        transformer: (value: string) => {
          if (!value) return false;
          const normalized = value.toLowerCase().trim();
          return ['true', '1', 'yes'].includes(normalized);
        }
      },
      json: {
        field: 'json',
        type: 'json',
        message: 'Invalid JSON format',
        severity: 'warning', // Changed from 'error' to 'warning'
        validator: (value: string) => {
          if (!value) return true;
          // More lenient JSON validation
          if (typeof value === 'object') return true; // Already parsed
          if (typeof value === 'string' && value.trim() === '') return true;
          try {
            JSON.parse(value);
            return true;
          } catch {
            // Try to fix common JSON issues
            try {
              const fixed = this.fixJsonString(value);
              JSON.parse(fixed);
              return true;
            } catch {
              return false;
            }
          }
        },
        transformer: (value: string) => {
          if (!value) return null;
          if (typeof value === 'object') return value;
          try {
            return JSON.parse(value);
          } catch {
            try {
              const fixed = this.fixJsonString(value);
              return JSON.parse(fixed);
            } catch {
              return value; // Return original value if can't parse
            }
          }
        }
      },
      required: {
        field: 'required',
        type: 'required',
        required: true,
        message: 'This field is required',
        severity: 'error',
        validator: (value: any) => {
          return value !== null && value !== undefined && value !== '';
        }
      },
      numeric: {
        field: 'numeric',
        type: 'numeric',
        message: 'Value must be a number',
        severity: 'error',
        validator: (value: string) => {
          if (!value) return true;
          return !isNaN(Number(value));
        },
        transformer: (value: string) => value ? Number(value) : null
      },
      phone: {
        field: 'phone',
        type: 'custom',
        message: 'Invalid phone number format',
        severity: 'warning',
        validator: (value: string) => {
          if (!value) return true;
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          const cleaned = value.replace(/[\s\-\(\)]/g, '');
          return phoneRegex.test(cleaned);
        },
        transformer: (value: string) => {
          if (!value) return null;
          return value.replace(/[\s\-\(\)]/g, '');
        }
      },
      url: {
        field: 'url',
        type: 'custom',
        message: 'Invalid URL format',
        severity: 'warning',
        validator: (value: string) => {
          if (!value) return true;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        transformer: (value: string) => {
          if (!value) return null;
          return value.startsWith('http') ? value : `https://${value}`;
        }
      },
      uuid: {
        field: 'uuid',
        type: 'custom',
        message: 'Invalid UUID format',
        severity: 'error',
        validator: (value: string) => {
          if (!value) return true;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(value);
        }
      }
    };
  }

  /**
   * Helper method to fix common JSON string issues
   */
  private fixJsonString(jsonStr: string): string {
    if (!jsonStr || typeof jsonStr !== 'string') return jsonStr;
    
    // Remove extra quotes and escaping
    let fixed = jsonStr.trim();
    
    // Fix double quotes issues
    if (fixed.startsWith('"') && fixed.endsWith('"')) {
      fixed = fixed.slice(1, -1);
    }
    
    // Fix escaped quotes
    fixed = fixed.replace(/\\"/g, '"');
    
    // Fix escaped backslashes
    fixed = fixed.replace(/\\\\/g, '\\');
    
    return fixed;
  }

  /**
   * Create validation schema for investors
   */
  public createInvestorSchema(lenientMode: boolean = false): InvestorValidationSchema {
    return {
      entityType: 'investor',
      rules: [
        { ...this.commonRules.required, field: 'name' },
        { ...this.commonRules.email, field: 'email' },
        {
          field: 'type',
          type: 'enum',
          required: true,
          message: 'Type must be one of: individual, institutional, syndicate',
          severity: 'error',
          params: { values: ['individual', 'institutional', 'syndicate'] },
          validator: (value: string) => ['individual', 'institutional', 'syndicate'].includes(value?.toLowerCase()),
          transformer: (value: string) => value?.toLowerCase()
        },
        {
          field: 'kyc_status',
          type: 'enum',
          message: 'KYC status must be one of: approved, pending, failed, not_started, expired',
          severity: 'error',
          params: { values: ['approved', 'pending', 'failed', 'not_started', 'expired'] },
          validator: (value: string) => !value || ['approved', 'pending', 'failed', 'not_started', 'expired'].includes(value.toLowerCase()),
          transformer: (value: string) => value?.toLowerCase() || 'not_started'
        },
        { ...this.commonRules.date, field: 'kyc_verified_at' },
        { ...this.commonRules.date, field: 'kyc_expiry_date' },
        {
          field: 'accreditation_status',
          type: 'enum',
          message: 'Accreditation status must be one of: approved, pending, rejected, not_started, expired',
          severity: lenientMode ? 'warning' : 'error',
          params: { values: ['approved', 'pending', 'rejected', 'not_started', 'expired'] },
          validator: (value: string) => {
            if (!value) return true;
            if (lenientMode && typeof value === 'string') {
              // In lenient mode, accept any string that looks like a status
              return true;
            }
            return ['approved', 'pending', 'rejected', 'not_started', 'expired'].includes(value.toLowerCase());
          },
          transformer: (value: string) => {
            if (!value) return 'not_started';
            const normalized = value.toLowerCase().trim();
            if (['approved', 'pending', 'rejected', 'not_started', 'expired'].includes(normalized)) {
              return normalized;
            }
            return lenientMode ? normalized : 'not_started';
          }
        },
        { ...this.commonRules.date, field: 'accreditation_verified_at' },
        { ...this.commonRules.date, field: 'accreditation_expires_at' },
        {
          field: 'wallet_address',
          type: 'custom',
          message: 'Invalid Ethereum wallet address',
          severity: 'warning',
          validator: (value: string) => {
            if (!value) return true;
            return /^0x[a-fA-F0-9]{40}$/.test(value);
          },
          transformer: (value: string) => value?.toLowerCase()
        },
        {
          field: 'risk_score',
          type: 'numeric',
          message: 'Risk score must be between 0 and 100',
          severity: 'error',
          validator: (value: string) => {
            if (!value) return true;
            const num = Number(value);
            return !isNaN(num) && num >= 0 && num <= 100;
          },
          transformer: (value: string) => value ? Number(value) : null
        },
        { ...this.commonRules.json, field: 'risk_factors', severity: lenientMode ? 'warning' : 'error' },
        { ...this.commonRules.json, field: 'risk_assessment', severity: lenientMode ? 'warning' : 'error' },
        { ...this.commonRules.json, field: 'investment_preferences', severity: lenientMode ? 'warning' : 'error' },
        { ...this.commonRules.json, field: 'profile_data', severity: lenientMode ? 'warning' : 'error' },
        {
          field: 'investor_status',
          type: 'enum',
          message: 'Investor status must be one of: pending, active, rejected, suspended',
          severity: 'error',
          params: { values: ['pending', 'active', 'rejected', 'suspended'] },
          validator: (value: string) => !value || ['pending', 'active', 'rejected', 'suspended'].includes(value.toLowerCase()),
          transformer: (value: string) => value?.toLowerCase() || 'pending'
        },
        { ...this.commonRules.boolean, field: 'onboarding_completed' },
        { ...this.commonRules.date, field: 'last_compliance_check' },
        { ...this.commonRules.uuid, field: 'user_id' }
      ],
      globalValidators: [
        this.createDuplicateEmailValidator()
      ]
    };
  }

  /**
   * Create validation schema for issuers
   */
  public createIssuerSchema(lenientMode: boolean = false): IssuerValidationSchema {
    return {
      entityType: 'issuer',
      rules: [
        { ...this.commonRules.required, field: 'name' },
        { ...this.commonRules.email, field: 'contact_email' },
        { ...this.commonRules.date, field: 'registration_date' },
        { ...this.commonRules.phone, field: 'contact_phone' },
        { ...this.commonRules.url, field: 'website' },
        {
          field: 'status',
          type: 'enum',
          message: 'Status must be one of: pending, active, rejected, suspended',
          severity: 'error',
          params: { values: ['pending', 'active', 'rejected', 'suspended'] },
          validator: (value: string) => !value || ['pending', 'active', 'rejected', 'suspended'].includes(value.toLowerCase()),
          transformer: (value: string) => value?.toLowerCase() || 'pending'
        },
        {
          field: 'compliance_status',
          type: 'enum',
          message: 'Compliance status must be one of: compliant, non_compliant, pending_review',
          severity: 'error',
          params: { values: ['compliant', 'non_compliant', 'pending_review'] },
          validator: (value: string) => !value || ['compliant', 'non_compliant', 'pending_review'].includes(value.toLowerCase()),
          transformer: (value: string) => value?.toLowerCase() || 'pending_review'
        },
        {
          field: 'address',
          type: 'json',
          message: 'Address must be valid JSON with street, city, and country',
          severity: lenientMode ? 'warning' : 'error',
          validator: (value: string) => {
            if (!value) return true;
            if (lenientMode) return true; // Accept any value in lenient mode
            try {
              const addr = JSON.parse(value);
              return addr.street && addr.city && addr.country;
            } catch {
              return false;
            }
          }
        },
        {
          field: 'legal_representatives',
          type: 'json',
          message: 'Legal representatives must be valid JSON array',
          severity: lenientMode ? 'warning' : 'error',
          validator: (value: string) => {
            if (!value) return true;
            if (lenientMode) return true; // Accept any value in lenient mode
            try {
              const reps = JSON.parse(value);
              if (!Array.isArray(reps)) return false;
              return reps.every(rep => rep.name && rep.role && rep.email);
            } catch {
              return false;
            }
          }
        },
        { ...this.commonRules.boolean, field: 'onboarding_completed' }
      ],
      globalValidators: [
        this.createDuplicateNameValidator()
      ]
    };
  }

  /**
   * Get enhanced error message with solution
   */
  public getEnhancedErrorMessage(error: ValidationError, data: Record<string, any>): {
    error: string;
    solution: string;
    example?: string;
  } {
    const field = error.field;
    const value = error.value;
    const type = error.type;

    switch (type) {
      case 'email':
        return {
          error: `Invalid email format: "${value}"`,
          solution: "Please provide a valid email address with @ symbol and domain (e.g., user@company.com)",
          example: "john.smith@example.com"
        };

      case 'date':
        return {
          error: `Invalid date format: "${value}"`,
          solution: "Please use YYYY-MM-DD format (e.g., 2024-01-15)",
          example: "2024-01-15"
        };

      case 'json':
        return {
          error: `Invalid JSON format in ${field}: "${value}"`,
          solution: "Please provide valid JSON format. Check for missing quotes, brackets, or commas.",
          example: field === 'address' ? 
            '{"street":"123 Main St","city":"New York","country":"US"}' :
            field === 'investment_preferences' ?
            '{"riskTolerance":"medium","preferredAssets":["equity","bonds"]}' :
            '{"key":"value"}'
        };

      case 'enum':
        if (field === 'kyc_status') {
          return {
            error: `Invalid KYC status: "${value}"`,
            solution: "Please use one of: approved, pending, failed, not_started, expired",
            example: "approved"
          };
        }
        if (field === 'type') {
          return {
            error: `Invalid investor type: "${value}"`,
            solution: "Please use one of: individual, institutional, syndicate",
            example: "individual"
          };
        }
        if (field === 'accreditation_status') {
          return {
            error: `Invalid accreditation status: "${value}"`,
            solution: "Please use one of: approved, pending, rejected, not_started, expired",
            example: "approved"
          };
        }
        if (field === 'status') {
          return {
            error: `Invalid status: "${value}"`,
            solution: "Please use one of: pending, active, rejected, suspended",
            example: "active"
          };
        }
        return {
          error: `Invalid value for ${field}: "${value}"`,
          solution: "Please check the allowed values for this field",
          example: "Check template for valid options"
        };

      case 'required':
        const requiredMessages = {
          name: {
            error: "Name is required",
            solution: "Please provide the full name (individual) or organization name (institutional)",
            example: "John Smith"
          },
          email: {
            error: "Email address is required",
            solution: "Please provide a valid email address for contact purposes",
            example: "contact@company.com"
          }
        };
        return requiredMessages[field as keyof typeof requiredMessages] || {
          error: `${field} is required`,
          solution: `Please provide a value for ${field}`,
          example: "See template for examples"
        };

      case 'numeric':
        return {
          error: `Invalid number format: "${value}"`,
          solution: field === 'risk_score' ? 
            "Risk score must be a number between 0 and 100" :
            "Please provide a valid number",
          example: field === 'risk_score' ? "25" : "123"
        };

      case 'custom':
        if (field === 'wallet_address') {
          return {
            error: `Invalid Ethereum wallet address: "${value}"`,
            solution: "Please provide a valid Ethereum address starting with 0x followed by 40 hexadecimal characters",
            example: "0x1234567890abcdef1234567890abcdef12345678"
          };
        }
        if (field === 'phone') {
          return {
            error: `Invalid phone number: "${value}"`,
            solution: "Please provide a valid phone number with country code (optional spaces, dashes, parentheses allowed)",
            example: "+1-555-123-4567"
          };
        }
        if (field === 'url') {
          return {
            error: `Invalid URL: "${value}"`,
            solution: "Please provide a valid URL starting with http:// or https://",
            example: "https://www.company.com"
          };
        }
        return {
          error: error.message,
          solution: "Please check the value format and try again",
          example: "See template for correct format"
        };

      default:
        return {
          error: error.message,
          solution: "Please correct the error and try again",
          example: "Check the template for correct format"
        };
    }
  }

  /**
   * Export validation errors to CSV format
   */
  public exportValidationErrorsToCSV(
    errors: ValidationError[],
    warnings: ValidationError[],
    data: Record<string, any>[],
    entityType: 'investor' | 'issuer'
  ): string {
    const allIssues = [
      ...errors.map(e => ({ ...e, severity: 'error' as const })),
      ...warnings.map(w => ({ ...w, severity: 'warning' as const }))
    ];

    const csvRows = allIssues.map(issue => {
      const enhanced = this.getEnhancedErrorMessage(issue, data[issue.row - 2] || {});
      const rowData = data[issue.row - 2] || {};
      
      return {
        'Row Number': issue.row,
        'Severity': issue.severity,
        'Field': issue.field,
        'Current Value': issue.value || '(empty)',
        'Error Description': enhanced.error,
        'Solution': enhanced.solution,
        'Example': enhanced.example || '',
        'Full Row Data': JSON.stringify(rowData)
      };
    });

    // Create CSV header
    const headers = ['Row Number', 'Severity', 'Field', 'Current Value', 'Error Description', 'Solution', 'Example', 'Full Row Data'];
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        headers.map(header => 
          `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Export validation errors to Excel-compatible format
   */
  public exportValidationErrorsToExcel(
    errors: ValidationError[],
    warnings: ValidationError[],
    data: Record<string, any>[],
    entityType: 'investor' | 'issuer'
  ): any[] {
    const allIssues = [
      ...errors.map(e => ({ ...e, severity: 'error' as const })),
      ...warnings.map(w => ({ ...w, severity: 'warning' as const }))
    ];

    return allIssues.map(issue => {
      const enhanced = this.getEnhancedErrorMessage(issue, data[issue.row - 2] || {});
      const rowData = data[issue.row - 2] || {};
      
      return {
        'Row Number': issue.row,
        'Severity': issue.severity,
        'Field': issue.field,
        'Current Value': issue.value || '(empty)',
        'Error Description': enhanced.error,
        'Solution': enhanced.solution,
        'Example': enhanced.example || '',
        'Entity Type': entityType,
        'Timestamp': new Date().toISOString(),
        'Full Row Data': JSON.stringify(rowData, null, 2)
      };
    });
  }

  /**
   * Download validation errors as CSV file
   */
  public downloadValidationErrorsCSV(
    errors: ValidationError[],
    warnings: ValidationError[],
    data: Record<string, any>[],
    entityType: 'investor' | 'issuer'
  ): void {
    const csvContent = this.exportValidationErrorsToCSV(errors, warnings, data, entityType);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${entityType}_validation_errors_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Download validation errors as Excel file
   */
  public downloadValidationErrorsExcel(
    errors: ValidationError[],
    warnings: ValidationError[],
    data: Record<string, any>[],
    entityType: 'investor' | 'issuer'
  ): void {
    // Dynamic import for Excel functionality
    import('xlsx').then((XLSX) => {
      const excelData = this.exportValidationErrorsToExcel(errors, warnings, data, entityType);
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 10 }, // Row Number
        { wch: 10 }, // Severity
        { wch: 20 }, // Field
        { wch: 30 }, // Current Value
        { wch: 50 }, // Error Description
        { wch: 60 }, // Solution
        { wch: 30 }, // Example
        { wch: 15 }, // Entity Type
        { wch: 20 }, // Timestamp
        { wch: 40 }  // Full Row Data
      ];
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Errors');
      XLSX.writeFile(workbook, `${entityType}_validation_errors_${new Date().toISOString().split('T')[0]}.xlsx`);
    }).catch(error => {
      console.error('Failed to export Excel file:', error);
      // Fallback to CSV
      this.downloadValidationErrorsCSV(errors, warnings, data, entityType);
    });
  }

  /**
   * Validate a single row of data
   */
  public validateRow(
    data: Record<string, any>,
    schema: ValidationSchema,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const transformedData = { ...data };

    // Apply field-level validation rules
    for (const rule of schema.rules) {
      const value = data[rule.field];
      const fieldResult = this.validateField(value, rule, context);
      
      if (!fieldResult.isValid) {
        const error: ValidationError = {
          row: context.row,
          field: rule.field,
          value,
          message: rule.message || `Invalid value for ${rule.field}`,
          severity: rule.severity || 'error',
          type: rule.type
        };

        if (rule.severity === 'warning') {
          warnings.push(error);
        } else {
          errors.push(error);
        }
      }

      // Apply transformations
      if (rule.transformer && value !== null && value !== undefined) {
        transformedData[rule.field] = rule.transformer(value);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      transformedData
    };
  }

  /**
   * Validate field against a specific rule
   */
  private validateField(value: any, rule: ValidationRule, context: ValidationContext): { isValid: boolean } {
    // Check required fields
    if (rule.required && (value === null || value === undefined || value === '')) {
      return { isValid: false };
    }

    // Skip validation for empty optional fields
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return { isValid: true };
    }

    // Apply custom validator if provided
    if (rule.validator) {
      const result = rule.validator(value, context);
      return { isValid: result === true };
    }

    // Apply built-in validators
    switch (rule.type) {
      case 'email':
        return { isValid: Boolean(this.commonRules.email.validator!(value, context.allData[context.row - 2] || {})) };
      case 'date':
        return { isValid: Boolean(this.commonRules.date.validator!(value, context.allData[context.row - 2] || {})) };
      case 'json':
        return { isValid: Boolean(this.commonRules.json.validator!(value, context.allData[context.row - 2] || {})) };
      case 'numeric':
        return { isValid: Boolean(this.commonRules.numeric.validator!(value, context.allData[context.row - 2] || {})) };
      case 'enum':
        return { isValid: rule.params?.values.includes(value?.toLowerCase()) };
      default:
        return { isValid: true };
    }
  }

  /**
   * Bypass validation and return success result
   */
  public bypassValidation(
    data: Record<string, any>[],
    entityType: 'investor' | 'issuer'
  ): BatchValidationResult {
    const transformedData = data.map(row => ({ ...row }));
    
    return {
      totalRows: data.length,
      validRows: data.length,
      invalidRows: 0,
      warnings: 0,
      errors: [],
      processingTime: 0,
      validData: transformedData,
      invalidData: []
    };
  }

  /**
   * Quick validation with minimal checks (only required fields)
   */
  public async quickValidate(
    data: Record<string, any>[],
    entityType: 'investor' | 'issuer'
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const validData: Record<string, any>[] = [];
    const invalidData: Array<{ row: number; data: Record<string, any>; errors: ValidationError[] }> = [];

    // Only check required fields
    const requiredFields = entityType === 'investor' ? ['name', 'email'] : ['name'];

    data.forEach((row, index) => {
      const rowErrors: ValidationError[] = [];
      
      for (const field of requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
          rowErrors.push({
            row: index + 2,
            field,
            value: row[field],
            message: `${field} is required`,
            severity: 'error',
            type: 'required'
          });
        }
      }

      if (rowErrors.length === 0) {
        validData.push({ ...row });
      } else {
        errors.push(...rowErrors);
        invalidData.push({
          row: index + 2,
          data: row,
          errors: rowErrors
        });
      }
    });

    const processingTime = Date.now() - startTime;

    return {
      totalRows: data.length,
      validRows: validData.length,
      invalidRows: invalidData.length,
      warnings: 0,
      errors,
      processingTime,
      validData,
      invalidData
    };
  }

  /**
   * Batch validate multiple rows
   */
  public async validateBatch(
    data: Record<string, any>[],
    schema: ValidationSchema,
    options: BatchValidationOptions = {
      batchSize: 100,
      continueOnError: true,
      maxErrors: 100,
      stopOnFirstError: false,
      parallelValidation: false
    }
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const validData: Record<string, any>[] = [];
    const invalidData: Array<{ row: number; data: Record<string, any>; errors: ValidationError[] }> = [];

    // Process in batches
    const batches = this.chunkArray(data, options.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
        const globalRowIndex = batchIndex * options.batchSize + rowIndex;
        const row = batch[rowIndex];
        
        const context: ValidationContext = {
          entityType: schema.entityType,
          row: globalRowIndex + 2, // +2 for header row and 0-based index
          allData: data,
          existingEntities: []
        };

        const result = this.validateRow(row, schema, context);
        
        if (result.isValid) {
          validData.push(result.transformedData);
        } else {
          errors.push(...result.errors);
          invalidData.push({
            row: context.row,
            data: row,
            errors: result.errors
          });

          // Stop processing if we hit the error limit
          if (errors.length >= options.maxErrors || options.stopOnFirstError) {
            break;
          }
        }
      }

      // Stop processing if we hit limits
      if (errors.length >= options.maxErrors || options.stopOnFirstError) {
        break;
      }
    }

    // Apply global validators
    if (schema.globalValidators) {
      for (const globalValidator of schema.globalValidators) {
        const globalErrors = globalValidator(data, {
          entityType: schema.entityType,
          row: 0,
          allData: data
        });
        errors.push(...globalErrors);
      }
    }

    const processingTime = Date.now() - startTime;
    const warnings = errors.filter(e => e.severity === 'warning').length;

    return {
      totalRows: data.length,
      validRows: validData.length,
      invalidRows: invalidData.length,
      warnings,
      errors,
      processingTime,
      validData,
      invalidData
    };
  }

  /**
   * Check for duplicate emails in investor data
   */
  private createDuplicateEmailValidator() {
    return (data: Record<string, any>[], context: ValidationContext): ValidationError[] => {
      const errors: ValidationError[] = [];
      const emailsSeen = new Set<string>();

      data.forEach((row, index) => {
        const email = row.email?.toLowerCase()?.trim();
        if (email && emailsSeen.has(email)) {
          errors.push({
            row: index + 2,
            field: 'email',
            value: row.email,
            message: `Duplicate email address: ${row.email}`,
            severity: 'error',
            type: 'custom'
          });
        } else if (email) {
          emailsSeen.add(email);
        }
      });

      return errors;
    };
  }

  /**
   * Check for duplicate names in issuer data
   */
  private createDuplicateNameValidator() {
    return (data: Record<string, any>[], context: ValidationContext): ValidationError[] => {
      const errors: ValidationError[] = [];
      const namesSeen = new Set<string>();

      data.forEach((row, index) => {
        const name = row.name?.toLowerCase()?.trim();
        if (name && namesSeen.has(name)) {
          errors.push({
            row: index + 2,
            field: 'name',
            value: row.name,
            message: `Duplicate organization name: ${row.name}`,
            severity: 'warning',
            type: 'custom'
          });
        } else if (name) {
          namesSeen.add(name);
        }
      });

      return errors;
    };
  }

  /**
   * Detect duplicates against existing database records
   */
  public detectDuplicates(
    newData: Record<string, any>[],
    existingData: Record<string, any>[],
    rules: DuplicateDetectionRule[]
  ): DuplicateDetectionResult[] {
    const results: DuplicateDetectionResult[] = [];

    newData.forEach(newRow => {
      for (const rule of rules) {
        const duplicate = this.findDuplicate(newRow, existingData, rule);
        if (duplicate) {
          results.push(duplicate);
          break; // Stop at first match
        }
      }
    });

    return results;
  }

  /**
   * Find duplicate record based on detection rule
   */
  private findDuplicate(
    newRow: Record<string, any>,
    existingData: Record<string, any>[],
    rule: DuplicateDetectionRule
  ): DuplicateDetectionResult | null {
    for (const existingRow of existingData) {
      const matchedFields: string[] = [];
      let confidence = 0;

      for (const field of rule.fields) {
        const newValue = newRow[field];
        const existingValue = existingRow[field];

        if (this.valuesMatch(newValue, existingValue, rule)) {
          matchedFields.push(field);
          confidence += 1 / rule.fields.length;
        }
      }

      if (matchedFields.length === rule.fields.length) {
        return {
          isDuplicate: true,
          existingEntity: existingRow,
          matchedFields,
          confidence,
          action: 'review'
        };
      }
    }

    return null;
  }

  /**
   * Check if two values match based on detection rule
   */
  private valuesMatch(
    value1: any,
    value2: any,
    rule: DuplicateDetectionRule
  ): boolean {
    if (value1 === null || value1 === undefined || value2 === null || value2 === undefined) {
      return false;
    }

    let str1 = String(value1);
    let str2 = String(value2);

    if (!rule.caseSensitive) {
      str1 = str1.toLowerCase();
      str2 = str2.toLowerCase();
    }

    if (rule.exactMatch) {
      return str1 === str2;
    }

    // Simple similarity check (could be enhanced with more sophisticated algorithms)
    if (rule.similarity && rule.similarity < 1) {
      const similarity = this.calculateSimilarity(str1, str2);
      return similarity >= rule.similarity;
    }

    return str1 === str2;
  }

  /**
   * Calculate simple similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Utility method to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get common validation rules
   */
  public getCommonRules(): CommonValidationRules {
    return this.commonRules;
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();
