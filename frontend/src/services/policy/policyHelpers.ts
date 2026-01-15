/**
 * Policy Helper Functions
 * Maps rule types to applicable operation types and extracts conditions
 */

/**
 * Map rule types to applicable operation types
 * Determines which operations each rule type should validate
 * 
 * @param ruleType - The type of rule (e.g., 'transfer_limit', 'kyc_verification')
 * @returns Array of operation types that this rule applies to
 */
export function getRuleOperationTypes(ruleType: string): string[] {
  const mapping: Record<string, string[]> = {
    // Transfer Controls
    'transfer_limit': ['transfer', 'mint', 'burn'],
    'velocity_limit': ['transfer', 'mint', 'burn'],
    'lock_up_period': ['transfer'],
    'whitelist_transfer': ['transfer'],
    
    // Investor Limits
    'investor_transaction_limit': ['transfer', 'mint'],
    'investor_position_limit': ['transfer', 'mint'],
    
    // Supply & Volume
    'volume_supply_limit': ['mint', 'burn'],
    
    // Compliance & Verification
    'kyc_verification': ['transfer', 'mint'],
    'aml_sanctions': ['transfer', 'mint'],
    'risk_profile': ['transfer', 'mint'],
    
    // Investor Qualification
    'accredited_investor': ['transfer', 'mint'],
    
    // Fund-Specific
    'tokenized_fund': ['transfer', 'mint', 'burn'],
    'redemption': ['burn'],
    'interval_fund_redemption': ['burn'],
    'standard_redemption': ['burn'],
    
    // Token Operations
    'pause': ['pause'],
    'block': ['block'],
    'lock': ['lock'],
    'unlock': ['unlock'],
  };
  
  return mapping[ruleType] || [];
}

/**
 * Extract conditions from a rule for operation mapping
 * Transforms rule-specific fields into a conditions object
 * 
 * @param rule - The policy rule object
 * @returns Conditions object for operation validation
 */
export function extractRuleConditions(rule: any): Record<string, any> {
  const conditions: Record<string, any> = {};
  
  // Add amount-based conditions
  if (rule.limitAmount !== undefined && rule.limitAmount !== null) {
    conditions.maxAmount = rule.limitAmount.toString();
  }
  
  if (rule.minAmount !== undefined && rule.minAmount !== null) {
    conditions.minAmount = rule.minAmount.toString();
  }
  
  // Add token standard conditions
  if (rule.tokenStandard) {
    conditions.tokenStandard = rule.tokenStandard;
  }
  
  // Add time-based conditions
  if (rule.startDate) {
    conditions.effectiveFrom = rule.startDate;
  }
  
  if (rule.endDate) {
    conditions.effectiveTo = rule.endDate;
  }
  
  // Add chain-specific conditions
  if (rule.chainId) {
    conditions.chainId = rule.chainId;
  }
  
  // Add percentage-based limits
  if (rule.percentageLimit !== undefined && rule.percentageLimit !== null) {
    conditions.percentageLimit = rule.percentageLimit;
  }
  
  // Add frequency-based conditions
  if (rule.frequency) {
    conditions.frequency = rule.frequency;
  }
  
  // Add period-based conditions
  if (rule.periodDays !== undefined && rule.periodDays !== null) {
    conditions.periodDays = rule.periodDays;
  }
  
  // Add verification requirements
  if (rule.requiresVerification !== undefined) {
    conditions.requiresVerification = rule.requiresVerification;
  }
  
  // Add approval requirements
  if (rule.requiresApproval !== undefined) {
    conditions.requiresApproval = rule.requiresApproval;
  }
  
  // Add threshold conditions
  if (rule.threshold !== undefined && rule.threshold !== null) {
    conditions.threshold = rule.threshold.toString();
  }
  
  return conditions;
}

/**
 * Check if a rule applies to a specific operation type
 * 
 * @param ruleType - The type of rule
 * @param operationType - The operation type to check
 * @returns True if the rule applies to the operation
 */
export function doesRuleApplyToOperation(
  ruleType: string,
  operationType: string
): boolean {
  const applicableOperations = getRuleOperationTypes(ruleType);
  return applicableOperations.includes(operationType);
}

/**
 * Get all unique operation types from a list of rules
 * 
 * @param rules - Array of policy rules
 * @returns Array of unique operation types
 */
export function getUniqueOperationTypes(rules: any[]): string[] {
  const operationTypes = new Set<string>();
  
  for (const rule of rules) {
    const operations = getRuleOperationTypes(rule.type);
    operations.forEach(op => operationTypes.add(op));
  }
  
  return Array.from(operationTypes);
}
