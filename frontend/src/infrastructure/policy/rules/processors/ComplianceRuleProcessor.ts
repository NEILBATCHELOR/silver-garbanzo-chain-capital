/**
 * Compliance Rule Processor
 * Processes rules related to regulatory compliance, KYC/AML, and risk assessments
 */

import { RuleProcessor } from './RuleProcessor';
import type { PolicyRule } from '@/services/rule/enhancedRuleService';
import type { 
  RuleEvaluationContext, 
  RuleResult, 
  ConditionResult,
  PolicyRuleExtended,
  RuleDetails
} from '../types';

export class ComplianceRuleProcessor extends RuleProcessor {
  async process(
    rule: PolicyRule | PolicyRuleExtended,
    context: RuleEvaluationContext
  ): Promise<RuleResult> {
    const { operation, policyContext, globalState } = context;
    const conditions: ConditionResult[] = [];
    
    // Type narrow to ensure we have RuleDetails - prefer details over conditions
    const extendedRule = rule as PolicyRuleExtended;
    const ruleDetails: RuleDetails | undefined = extendedRule.details || 
      (!Array.isArray(rule.conditions) ? rule.conditions as RuleDetails : undefined);

    this.log('Processing compliance rule', { rule: rule.name, operation: operation.type });

    // Check KYC verification
    if (ruleDetails?.requireKYC || ruleDetails?.requiredCompliance?.includes('kyc')) {
      const kycVerified = globalState?.regulatoryCompliance?.kycVerified || false;
      
      conditions.push(this.createCondition(
        'kyc_verification',
        kycVerified,
        kycVerified ? 'verified' : 'not verified',
        'verified',
        kycVerified 
          ? 'KYC verification completed'
          : 'KYC verification required'
      ));
    }

    // Check AML screening
    if (ruleDetails?.requireAML || ruleDetails?.requiredCompliance?.includes('aml')) {
      const amlChecked = globalState?.regulatoryCompliance?.amlChecked || false;
      
      conditions.push(this.createCondition(
        'aml_screening',
        amlChecked,
        amlChecked ? 'passed' : 'not checked',
        'passed',
        amlChecked 
          ? 'AML screening passed'
          : 'AML screening required'
      ));
    }

    // Check sanctions screening
    if (ruleDetails?.requireSanctionsScreening || ruleDetails?.requiredCompliance?.includes('sanctions')) {
      const sanctionsScreened = globalState?.regulatoryCompliance?.sanctionsScreened || false;
      
      conditions.push(this.createCondition(
        'sanctions_screening',
        sanctionsScreened,
        sanctionsScreened ? 'cleared' : 'not screened',
        'cleared',
        sanctionsScreened 
          ? 'Sanctions screening cleared'
          : 'Sanctions screening required'
      ));
    }

    // Check risk threshold
    if (ruleDetails?.riskThreshold !== undefined) {
      const userRiskScore = globalState?.userRiskScore || 100;
      const meetsThreshold = userRiskScore <= ruleDetails.riskThreshold;
      
      conditions.push(this.createCondition(
        'risk_threshold',
        meetsThreshold,
        userRiskScore.toString(),
        ruleDetails.riskThreshold.toString(),
        meetsThreshold 
          ? `Risk score ${userRiskScore} within threshold`
          : `Risk score ${userRiskScore} exceeds threshold ${ruleDetails.riskThreshold}`
      ));
    }

    // Check required documents
    if (ruleDetails?.requiredDocuments && ruleDetails.requiredDocuments.length > 0) {
      const providedDocs = operation.metadata?.documents || [];
      const missingDocs = ruleDetails.requiredDocuments.filter(
        doc => !providedDocs.includes(doc)
      );
      const hasAllDocs = missingDocs.length === 0;
      
      conditions.push(this.createCondition(
        'required_documents',
        hasAllDocs,
        providedDocs.join(', ') || 'none',
        ruleDetails.requiredDocuments.join(', '),
        hasAllDocs 
          ? 'All required documents provided'
          : `Missing documents: ${missingDocs.join(', ')}`
      ));
    }

    // Check jurisdiction restrictions
    if (ruleDetails?.restrictedJurisdictions && operation.metadata?.jurisdiction) {
      const jurisdiction = operation.metadata.jurisdiction;
      const isRestricted = ruleDetails.restrictedJurisdictions.includes(jurisdiction);
      
      conditions.push(this.createCondition(
        'jurisdiction_check',
        !isRestricted,
        jurisdiction,
        'not restricted',
        isRestricted 
          ? `Jurisdiction ${jurisdiction} is restricted`
          : `Jurisdiction ${jurisdiction} is allowed`
      ));
    }

    // Check accredited investor status (if required)
    if (ruleDetails?.requireAccreditedInvestor) {
      const isAccredited = policyContext.user.metadata?.accreditedInvestor || false;
      
      conditions.push(this.createCondition(
        'accredited_investor',
        isAccredited,
        isAccredited ? 'yes' : 'no',
        'yes',
        isAccredited 
          ? 'Accredited investor status verified'
          : 'Accredited investor status required'
      ));
    }

    // Check compliance certification expiry
    if (globalState?.regulatoryCompliance?.lastCheckDate) {
      const lastCheck = globalState.regulatoryCompliance.lastCheckDate;
      const daysSinceCheck = Math.floor(
        (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60 * 24)
      );
      const maxDays = ruleDetails?.complianceExpiryDays || 365;
      const isValid = daysSinceCheck <= maxDays;
      
      conditions.push(this.createCondition(
        'compliance_validity',
        isValid,
        `${daysSinceCheck} days`,
        `<= ${maxDays} days`,
        isValid 
          ? `Compliance check valid (${daysSinceCheck} days old)`
          : `Compliance check expired (${daysSinceCheck} days old, max: ${maxDays})`
      ));
    }

    // Check transaction reporting requirements
    if (ruleDetails?.reportingThreshold && operation.amount) {
      const amount = BigInt(operation.amount);
      const threshold = BigInt(ruleDetails.reportingThreshold);
      const requiresReporting = amount >= threshold;
      
      if (requiresReporting) {
        const hasReportingFlag = operation.metadata?.reportingAcknowledged || false;
        
        conditions.push(this.createCondition(
          'reporting_requirement',
          hasReportingFlag,
          hasReportingFlag ? 'acknowledged' : 'not acknowledged',
          'acknowledged',
          `Transaction requires reporting (amount: ${amount}, threshold: ${threshold})`
        ));
      }
    }

    return this.buildResult(rule, conditions);
  }
}
