// Compilation test for rule-service types
import type { Rule, CreateRuleRequest } from './src/types/rule-service.js'
import { RuleType, RuleStatus } from './src/types/rule-service.js'

console.log('Rule service types compilation test')

// Test type usage
const testRule: Rule = {
  rule_id: 'test-id',
  rule_name: 'Test Rule',
  rule_type: RuleType.KYC_VERIFICATION,
  created_by: 'user-id'
}

const testRequest: CreateRuleRequest = {
  rule_name: 'New Rule',
  rule_type: RuleType.AML_SANCTIONS,
  status: RuleStatus.DRAFT
}

console.log('Types compilation successful!')

export {}
