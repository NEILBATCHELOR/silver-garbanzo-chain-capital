import { 
  Invoice, 
  Provider, 
  Payer, 
  Pool,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreatePoolRequest,
  CreateProviderRequest,
  CreatePayerRequest,
  ValidationResult,
  ValidationError,
  PoolType
} from './types'

/**
 * Factoring validation service for business rules and data validation
 */
export class FactoringValidationService {
  
  // ==================== INVOICE VALIDATION ====================

  /**
   * Validate invoice creation data
   */
  validateCreateInvoice(data: CreateInvoiceRequest): ValidationResult {
    const errors: ValidationError[] = []

    // Required field validation
    if (!data.patient_name?.trim()) {
      errors.push({ field: 'patient_name', message: 'Patient name is required' })
    }

    if (!data.patient_dob) {
      errors.push({ field: 'patient_dob', message: 'Patient date of birth is required' })
    } else {
      // Validate patient DOB is not in the future
      const dob = new Date(data.patient_dob)
      const today = new Date()
      if (dob > today) {
        errors.push({ field: 'patient_dob', message: 'Patient date of birth cannot be in the future' })
      }
    }

    if (!data.service_dates?.trim()) {
      errors.push({ field: 'service_dates', message: 'Service dates are required' })
    }

    if (!data.procedure_codes?.trim()) {
      errors.push({ field: 'procedure_codes', message: 'Procedure codes are required' })
    } else {
      // Validate procedure codes format (should be comma-separated CPT codes)
      if (!this.isValidProcedureCodes(data.procedure_codes)) {
        errors.push({ 
          field: 'procedure_codes', 
          message: 'Procedure codes must be valid CPT codes (5 digits, comma-separated)' 
        })
      }
    }

    if (!data.diagnosis_codes?.trim()) {
      errors.push({ field: 'diagnosis_codes', message: 'Diagnosis codes are required' })
    } else {
      // Validate diagnosis codes format (should be ICD-10 codes)
      if (!this.isValidDiagnosisCodes(data.diagnosis_codes)) {
        errors.push({ 
          field: 'diagnosis_codes', 
          message: 'Diagnosis codes must be valid ICD-10 format' 
        })
      }
    }

    // Amount validation
    if (!data.billed_amount || data.billed_amount <= 0) {
      errors.push({ field: 'billed_amount', message: 'Billed amount must be greater than 0' })
    }

    if (!data.net_amount_due || data.net_amount_due <= 0) {
      errors.push({ field: 'net_amount_due', message: 'Net amount due must be greater than 0' })
    }

    if (data.billed_amount && data.net_amount_due && data.billed_amount < data.net_amount_due) {
      errors.push({ 
        field: 'net_amount_due', 
        message: 'Net amount due cannot exceed billed amount' 
      })
    }

    // Adjustments validation
    if (data.adjustments && data.adjustments < 0) {
      errors.push({ field: 'adjustments', message: 'Adjustments cannot be negative' })
    }

    // Policy number validation
    if (!data.policy_number?.trim()) {
      errors.push({ field: 'policy_number', message: 'Policy number is required' })
    }

    // Invoice number validation
    if (!data.invoice_number?.trim()) {
      errors.push({ field: 'invoice_number', message: 'Invoice number is required' })
    }

    // Date validation
    if (!data.invoice_date) {
      errors.push({ field: 'invoice_date', message: 'Invoice date is required' })
    }

    if (!data.due_date) {
      errors.push({ field: 'due_date', message: 'Due date is required' })
    }

    if (data.invoice_date && data.due_date) {
      const invoiceDate = new Date(data.invoice_date)
      const dueDate = new Date(data.due_date)
      
      if (dueDate <= invoiceDate) {
        errors.push({ 
          field: 'due_date', 
          message: 'Due date must be after invoice date' 
        })
      }

      // Check if due date is too far in the future (more than 365 days)
      const daysDifference = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDifference > 365) {
        errors.push({ 
          field: 'due_date', 
          message: 'Due date cannot be more than 365 days from invoice date' 
        })
      }
    }

    // Factoring discount rate validation
    if (data.factoring_discount_rate !== undefined) {
      if (data.factoring_discount_rate < 0 || data.factoring_discount_rate > 100) {
        errors.push({ 
          field: 'factoring_discount_rate', 
          message: 'Factoring discount rate must be between 0 and 100' 
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate invoice update data
   */
  validateUpdateInvoice(data: UpdateInvoiceRequest): ValidationResult {
    const errors: ValidationError[] = []

    // Only validate fields that are being updated
    if (data.patient_name !== undefined && !data.patient_name.trim()) {
      errors.push({ field: 'patient_name', message: 'Patient name cannot be empty' })
    }

    if (data.patient_dob !== undefined) {
      const dob = new Date(data.patient_dob)
      const today = new Date()
      if (dob > today) {
        errors.push({ field: 'patient_dob', message: 'Patient date of birth cannot be in the future' })
      }
    }

    if (data.procedure_codes !== undefined && data.procedure_codes !== null) {
      if (!data.procedure_codes.trim()) {
        errors.push({ field: 'procedure_codes', message: 'Procedure codes cannot be empty' })
      } else if (!this.isValidProcedureCodes(data.procedure_codes)) {
        errors.push({ 
          field: 'procedure_codes', 
          message: 'Procedure codes must be valid CPT codes (5 digits, comma-separated)' 
        })
      }
    }

    if (data.diagnosis_codes !== undefined && data.diagnosis_codes !== null) {
      if (!data.diagnosis_codes.trim()) {
        errors.push({ field: 'diagnosis_codes', message: 'Diagnosis codes cannot be empty' })
      } else if (!this.isValidDiagnosisCodes(data.diagnosis_codes)) {
        errors.push({ 
          field: 'diagnosis_codes', 
          message: 'Diagnosis codes must be valid ICD-10 format' 
        })
      }
    }

    // Amount validations
    if (data.billed_amount !== undefined && (data.billed_amount <= 0)) {
      errors.push({ field: 'billed_amount', message: 'Billed amount must be greater than 0' })
    }

    if (data.net_amount_due !== undefined && (data.net_amount_due <= 0)) {
      errors.push({ field: 'net_amount_due', message: 'Net amount due must be greater than 0' })
    }

    if (data.adjustments !== undefined && data.adjustments < 0) {
      errors.push({ field: 'adjustments', message: 'Adjustments cannot be negative' })
    }

    // Date validations
    if (data.invoice_date !== undefined && data.due_date !== undefined) {
      const invoiceDate = new Date(data.invoice_date)
      const dueDate = new Date(data.due_date)
      
      if (dueDate <= invoiceDate) {
        errors.push({ 
          field: 'due_date', 
          message: 'Due date must be after invoice date' 
        })
      }
    }

    if (data.factoring_discount_rate !== undefined) {
      if (data.factoring_discount_rate < 0 || data.factoring_discount_rate > 100) {
        errors.push({ 
          field: 'factoring_discount_rate', 
          message: 'Factoring discount rate must be between 0 and 100' 
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==================== POOL VALIDATION ====================

  /**
   * Validate pool creation data
   */
  validateCreatePool(data: CreatePoolRequest): ValidationResult {
    const errors: ValidationError[] = []

    if (!data.pool_name?.trim()) {
      errors.push({ field: 'pool_name', message: 'Pool name is required' })
    } else {
      // Pool name should be between 3 and 100 characters
      if (data.pool_name.length < 3 || data.pool_name.length > 100) {
        errors.push({ 
          field: 'pool_name', 
          message: 'Pool name must be between 3 and 100 characters' 
        })
      }

      // Pool name should not contain special characters except spaces, hyphens, and underscores
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(data.pool_name)) {
        errors.push({ 
          field: 'pool_name', 
          message: 'Pool name can only contain letters, numbers, spaces, hyphens, and underscores' 
        })
      }
    }

    if (!data.pool_type) {
      errors.push({ field: 'pool_type', message: 'Pool type is required' })
    } else {
      // Validate pool type is one of the allowed values
      if (!Object.values(PoolType).includes(data.pool_type)) {
        errors.push({ 
          field: 'pool_type', 
          message: `Pool type must be one of: ${Object.values(PoolType).join(', ')}` 
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==================== PROVIDER VALIDATION ====================

  /**
   * Validate provider creation data
   */
  validateCreateProvider(data: CreateProviderRequest): ValidationResult {
    const errors: ValidationError[] = []

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Provider name is required' })
    } else {
      if (data.name.length < 2 || data.name.length > 255) {
        errors.push({ 
          field: 'name', 
          message: 'Provider name must be between 2 and 255 characters' 
        })
      }
    }

    // Address is optional but if provided, validate it
    if (data.address !== undefined && data.address !== null) {
      if (data.address.trim() && data.address.length > 500) {
        errors.push({ 
          field: 'address', 
          message: 'Provider address cannot exceed 500 characters' 
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==================== PAYER VALIDATION ====================

  /**
   * Validate payer creation data
   */
  validateCreatePayer(data: CreatePayerRequest): ValidationResult {
    const errors: ValidationError[] = []

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Payer name is required' })
    } else {
      if (data.name.length < 2 || data.name.length > 255) {
        errors.push({ 
          field: 'name', 
          message: 'Payer name must be between 2 and 255 characters' 
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==================== BUSINESS RULES VALIDATION ====================

  /**
   * Validate if invoice can be added to a pool
   */
  validateInvoicePoolAssignment(invoice: Invoice, pool: Pool): ValidationResult {
    const errors: ValidationError[] = []

    // Check if invoice is already assigned to a pool
    if (invoice.pool_id && invoice.pool_id !== pool.pool_id) {
      errors.push({ 
        field: 'pool_id', 
        message: 'Invoice is already assigned to another pool' 
      })
    }

    // Check if invoice has minimum required data for pooling
    if (!invoice.net_amount_due || Number(invoice.net_amount_due) <= 0) {
      errors.push({ 
        field: 'net_amount_due', 
        message: 'Invoice must have a valid net amount due for pooling' 
      })
    }

    if (!invoice.due_date) {
      errors.push({ 
        field: 'due_date', 
        message: 'Invoice must have a due date for pooling' 
      })
    }

    // Business rule: Invoices older than 180 days cannot be pooled
    if (invoice.invoice_date) {
      const invoiceDate = new Date(invoice.invoice_date)
      const today = new Date()
      const daysDifference = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDifference > 180) {
        errors.push({ 
          field: 'invoice_date', 
          message: 'Invoices older than 180 days cannot be added to pools' 
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate procedure codes format (CPT codes)
   */
  private isValidProcedureCodes(codes: string): boolean {
    // CPT codes are typically 5 digits, can be comma-separated
    const cptPattern = /^(\d{5})(,\s*\d{5})*$/
    return cptPattern.test(codes.trim())
  }

  /**
   * Validate diagnosis codes format (ICD-10)
   */
  private isValidDiagnosisCodes(codes: string): boolean {
    // ICD-10 codes start with a letter, followed by 2 digits, then optional decimal point and additional digits
    // Can be comma-separated for multiple codes
    const icd10Pattern = /^([A-Z]\d{2}(\.\d{1,4})?)(,\s*[A-Z]\d{2}(\.\d{1,4})?)*$/
    return icd10Pattern.test(codes.trim().toUpperCase())
  }
}
