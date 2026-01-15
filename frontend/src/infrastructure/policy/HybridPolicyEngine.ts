/**
 * HybridPolicyEngine.ts
 * Orchestrates policy enforcement across multiple layers:
 * - Off-chain (PolicyEngine)
 * - Smart contract (PolicyChainSyncService)
 * - Oracle (ComplianceOracleClient)
 */

import { PolicyEngine } from './PolicyEngine';
import { PolicyChainSyncService } from '@/services/policy/PolicyChainSyncService';
import { ComplianceOracleClient } from '@/services/oracle/ComplianceOracleClient';
import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';
import type { 
  CryptoOperation, 
  PolicyContext, 
  PolicyEvaluationResult,
  PolicyViolation
} from './types';

export type EnforcementMode = 
  | 'off-chain-only'
  | 'smart-contract-only'
  | 'oracle-only'
  | 'hybrid-all'
  | 'hybrid-critical';

export interface HybridConfig {
  mode: EnforcementMode;
  offChainEngine: PolicyEngine;
  chainSyncService?: PolicyChainSyncService;
  oracleClient?: ComplianceOracleClient;
  fallbackToOffChain: boolean;
  criticalAmountThreshold?: bigint; // Amount that triggers critical mode
  criticalOperations?: string[]; // Operations that always use hybrid
}

export interface LayerResult {
  layer: 'off-chain' | 'smart-contract' | 'oracle';
  allowed: boolean;
  violations: PolicyViolation[];
  warnings: string[]; // Changed from PolicyViolation[] to match PolicyEvaluationResult
  evaluationTime: number;
  error?: string;
}

export class HybridPolicyEngine {
  private config: HybridConfig;
  
  constructor(config: HybridConfig) {
    this.config = {
      ...config,
      criticalAmountThreshold: config.criticalAmountThreshold ?? BigInt(100000),
      criticalOperations: config.criticalOperations ?? ['mint', 'burn']
    };
  }

  /**
   * Main method to evaluate operation across all enforcement layers
   */
  async evaluateOperation(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    const evaluationId = generateUUID();
    const startTime = Date.now();
    
    try {
      const mode = this.determineEnforcementMode(operation);
      
      switch (mode) {
        case 'off-chain-only':
          return await this.evaluateOffChain(operation, context, evaluationId, startTime);
          
        case 'smart-contract-only':
          return await this.evaluateSmartContract(operation, context, evaluationId, startTime);
          
        case 'oracle-only':
          return await this.evaluateOracle(operation, context, evaluationId, startTime);
          
        case 'hybrid-all':
          return await this.evaluateHybridAll(operation, context, evaluationId, startTime);
          
        case 'hybrid-critical':
          if (this.isCriticalOperation(operation)) {
            return await this.evaluateHybridAll(operation, context, evaluationId, startTime);
          } else {
            return await this.evaluateOffChain(operation, context, evaluationId, startTime);
          }
      }
      
    } catch (error: any) {
      console.error('Hybrid evaluation failed:', error);
      
      // Fallback to off-chain if enabled
      if (this.config.fallbackToOffChain) {
        console.log('Falling back to off-chain enforcement');
        return await this.evaluateOffChain(operation, context, evaluationId, startTime);
      }
      
      throw error;
    }
  }

  /**
   * Evaluate using off-chain engine only
   */
  private async evaluateOffChain(
    operation: CryptoOperation,
    context: PolicyContext,
    evaluationId: string,
    startTime: number
  ): Promise<PolicyEvaluationResult> {
    const result = await this.config.offChainEngine.evaluateOperation(operation, context);
    
    // Log to hybrid decisions table
    await this.logHybridDecision(evaluationId, 'off-chain-only', [
      { layer: 'off-chain', ...result, evaluationTime: Date.now() - startTime }
    ], result);
    
    return {
      ...result,
      metadata: {
        ...result.metadata,
        evaluationId,
        enforcementMode: 'off-chain-only'
      }
    };
  }

  /**
   * Evaluate using smart contract only
   */
  private async evaluateSmartContract(
    operation: CryptoOperation,
    context: PolicyContext,
    evaluationId: string,
    startTime: number
  ): Promise<PolicyEvaluationResult> {
    if (!this.config.chainSyncService) {
      throw new Error('Chain sync service not configured');
    }
    
    const layerStartTime = Date.now();
    
    try {
      // This would call PolicyEngine.sol validateOperation()
      // For now, return a placeholder structure
      const violations: PolicyViolation[] = [];
      const allowed = violations.length === 0;
      
      const layerResult: LayerResult = {
        layer: 'smart-contract',
        allowed,
        violations,
        warnings: [],
        evaluationTime: Date.now() - layerStartTime
      };
      
      const result: PolicyEvaluationResult = {
        allowed,
        policies: [],
        violations,
        warnings: [],
        metadata: {
          evaluationId,
          evaluationTime: Date.now() - startTime,
          enforcementMode: 'smart-contract-only'
        }
      };
      
      await this.logHybridDecision(evaluationId, 'smart-contract-only', [layerResult], result);
      
      return result;
    } catch (error: any) {
      throw new Error(`Smart contract validation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate using oracle only
   */
  private async evaluateOracle(
    operation: CryptoOperation,
    context: PolicyContext,
    evaluationId: string,
    startTime: number
  ): Promise<PolicyEvaluationResult> {
    if (!this.config.oracleClient) {
      throw new Error('Oracle client not configured');
    }
    
    const layerStartTime = Date.now();
    const violations: PolicyViolation[] = [];
    
    try {
      // Check compliance data
      const complianceResult = await this.config.oracleClient.getComplianceData(operation.from);
      
      if (!complianceResult.success) {
        violations.push({
          policyId: 'oracle-unavailable',
          violationType: 'oracle-error',
          severity: 'high',
          description: complianceResult.error || 'Failed to query oracle'
        });
      } else if (complianceResult.data) {
        // Check KYC
        if (!complianceResult.data.kycVerified) {
          violations.push({
            policyId: 'oracle-kyc',
            violationType: 'kyc-required',
            severity: 'high',
            description: 'KYC verification required'
          });
        }
        
        // Check AML
        if (!complianceResult.data.amlCleared) {
          violations.push({
            policyId: 'oracle-aml',
            violationType: 'aml-required',
            severity: 'critical',
            description: 'AML clearance required'
          });
        }
        
        // Check risk score
        if (complianceResult.data.riskScore > 70) {
          violations.push({
            policyId: 'oracle-risk',
            violationType: 'high-risk',
            severity: 'medium',
            description: `Risk score ${complianceResult.data.riskScore} exceeds threshold`
          });
        }
      }
      
      const layerResult: LayerResult = {
        layer: 'oracle',
        allowed: violations.length === 0,
        violations,
        warnings: [],
        evaluationTime: Date.now() - layerStartTime
      };
      
      const result: PolicyEvaluationResult = {
        allowed: violations.length === 0,
        policies: [],
        violations,
        warnings: [],
        metadata: {
          evaluationId,
          evaluationTime: Date.now() - startTime,
          enforcementMode: 'oracle-only'
        }
      };
      
      await this.logHybridDecision(evaluationId, 'oracle-only', [layerResult], result);
      
      return result;
    } catch (error: any) {
      throw new Error(`Oracle validation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate using all layers (hybrid-all mode)
   */
  private async evaluateHybridAll(
    operation: CryptoOperation,
    context: PolicyContext,
    evaluationId: string,
    startTime: number
  ): Promise<PolicyEvaluationResult> {
    const layerResults: LayerResult[] = [];
    
    // Evaluate all layers in parallel
    const [offChainResult, smartContractResult, oracleResult] = await Promise.allSettled([
      this.evaluateLayerOffChain(operation, context),
      this.evaluateLayerSmartContract(operation, context),
      this.evaluateLayerOracle(operation, context)
    ]);
    
    // Collect results
    if (offChainResult.status === 'fulfilled') {
      layerResults.push(offChainResult.value);
    }
    if (smartContractResult.status === 'fulfilled' && this.config.chainSyncService) {
      layerResults.push(smartContractResult.value);
    }
    if (oracleResult.status === 'fulfilled' && this.config.oracleClient) {
      layerResults.push(oracleResult.value);
    }
    
    // Aggregate results - ALL layers must approve
    const allowed = layerResults.every(r => r.allowed);
    const violations = layerResults.flatMap(r => r.violations);
    const warnings = layerResults.flatMap(r => r.warnings);
    
    const result: PolicyEvaluationResult = {
      allowed,
      policies: [],
      violations,
      warnings,
      metadata: {
        evaluationId,
        evaluationTime: Date.now() - startTime,
        enforcementMode: 'hybrid-all',
        layersEvaluated: layerResults.map(r => r.layer)
      }
    };
    
    await this.logHybridDecision(evaluationId, 'hybrid-all', layerResults, result);
    
    return result;
  }

  /**
   * Helper to evaluate off-chain layer
   */
  private async evaluateLayerOffChain(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<LayerResult> {
    const startTime = Date.now();
    const result = await this.config.offChainEngine.evaluateOperation(operation, context);
    
    return {
      layer: 'off-chain',
      allowed: result.allowed,
      violations: result.violations,
      warnings: result.warnings,
      evaluationTime: Date.now() - startTime
    };
  }

  /**
   * Helper to evaluate smart contract layer
   */
  private async evaluateLayerSmartContract(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<LayerResult> {
    const startTime = Date.now();
    
    // Placeholder - would call actual smart contract
    return {
      layer: 'smart-contract',
      allowed: true,
      violations: [],
      warnings: [],
      evaluationTime: Date.now() - startTime
    };
  }

  /**
   * Helper to evaluate oracle layer
   */
  private async evaluateLayerOracle(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<LayerResult> {
    const startTime = Date.now();
    const violations: PolicyViolation[] = [];
    
    if (!this.config.oracleClient) {
      return {
        layer: 'oracle',
        allowed: true,
        violations: [],
        warnings: [],
        evaluationTime: Date.now() - startTime
      };
    }
    
    const complianceResult = await this.config.oracleClient.getComplianceData(operation.from);
    
    if (!complianceResult.success || !complianceResult.data) {
      violations.push({
        policyId: 'oracle-unavailable',
        violationType: 'oracle-error',
        severity: 'high',
        description: 'Failed to query compliance data'
      });
    } else {
      if (!complianceResult.data.kycVerified) {
        violations.push({
          policyId: 'oracle-kyc',
          violationType: 'kyc-required',
          severity: 'high',
          description: 'KYC verification required'
        });
      }
      
      if (!complianceResult.data.amlCleared) {
        violations.push({
          policyId: 'oracle-aml',
          violationType: 'aml-required',
          severity: 'critical',
          description: 'AML clearance required'
        });
      }
    }
    
    return {
      layer: 'oracle',
      allowed: violations.length === 0,
      violations,
      warnings: [],
      evaluationTime: Date.now() - startTime
    };
  }

  /**
   * Determine which enforcement mode to use
   */
  private determineEnforcementMode(operation: CryptoOperation): EnforcementMode {
    // Check if mode is explicitly set
    if (this.config.mode !== 'hybrid-critical') {
      return this.config.mode;
    }
    
    // In hybrid-critical mode, decide based on operation
    if (this.isCriticalOperation(operation)) {
      return 'hybrid-all';
    } else {
      return 'off-chain-only';
    }
  }

  /**
   * Check if operation is critical
   */
  private isCriticalOperation(operation: CryptoOperation): boolean {
    // Check if operation type is critical
    if (this.config.criticalOperations?.includes(operation.type)) {
      return true;
    }
    
    // Check if amount exceeds threshold
    if (operation.amount && this.config.criticalAmountThreshold) {
      const amount = typeof operation.amount === 'string' 
        ? BigInt(operation.amount) 
        : operation.amount;
      return amount > this.config.criticalAmountThreshold;
    }
    
    return false;
  }

  /**
   * Log hybrid enforcement decision to database
   */
  private async logHybridDecision(
    evaluationId: string,
    mode: string,
    layerResults: LayerResult[],
    finalResult: PolicyEvaluationResult
  ): Promise<void> {
    try {
      await supabase.from('hybrid_enforcement_decisions').insert({
        id: evaluationId,
        enforcement_mode: mode,
        layers_evaluated: layerResults.map(r => r.layer),
        off_chain_result: layerResults.find(r => r.layer === 'off-chain') || null,
        smart_contract_result: layerResults.find(r => r.layer === 'smart-contract') || null,
        oracle_result: layerResults.find(r => r.layer === 'oracle') || null,
        final_decision: finalResult.allowed,
        decision_time_ms: finalResult.metadata.evaluationTime,
        violation_details: finalResult.violations,
        warnings: finalResult.warnings,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log hybrid decision:', error);
      // Don't throw - logging failure shouldn't block operation
    }
  }
}
