/**
 * Address Rule Processor
 * Processes rules related to address whitelisting, blacklisting, and signature requirements
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

export class AddressRuleProcessor extends RuleProcessor {
  async process(
    rule: PolicyRule | PolicyRuleExtended,
    context: RuleEvaluationContext
  ): Promise<RuleResult> {
    const { operation, policyContext } = context;
    const conditions: ConditionResult[] = [];
    // Type narrow to ensure we have RuleDetails - prefer details over conditions
    const extendedRule = rule as PolicyRuleExtended;
    const ruleDetails: RuleDetails | undefined = extendedRule.details || 
      (!Array.isArray(rule.conditions) ? rule.conditions as RuleDetails : undefined);

    this.log('Processing address rule', { rule: rule.name, operation: operation.type });

    // Check whitelisted addresses
    if (ruleDetails?.whitelistedAddresses && ruleDetails.whitelistedAddresses.length > 0) {
      const whitelist = ruleDetails.whitelistedAddresses.map(a => a.toLowerCase());
      
      // Check if 'to' address is whitelisted (for transfers, mints)
      if (operation.to) {
        const toAddress = operation.to.toLowerCase();
        const isWhitelisted = whitelist.includes(toAddress);
        
        conditions.push(this.createCondition(
          'to_address_whitelist',
          isWhitelisted,
          toAddress,
          'whitelisted',
          isWhitelisted 
            ? `Recipient ${this.truncateAddress(toAddress)} is whitelisted`
            : `Recipient ${this.truncateAddress(toAddress)} is not whitelisted`
        ));
      }
      
      // Check if 'from' address is whitelisted (for transfers, burns)
      if (operation.from) {
        const fromAddress = operation.from.toLowerCase();
        const isWhitelisted = whitelist.includes(fromAddress);
        
        conditions.push(this.createCondition(
          'from_address_whitelist',
          isWhitelisted,
          fromAddress,
          'whitelisted',
          isWhitelisted 
            ? `Sender ${this.truncateAddress(fromAddress)} is whitelisted`
            : `Sender ${this.truncateAddress(fromAddress)} is not whitelisted`
        ));
      }
    }

    // Check blacklisted addresses
    if (ruleDetails?.blacklistedAddresses && ruleDetails.blacklistedAddresses.length > 0) {
      const blacklist = ruleDetails.blacklistedAddresses.map(a => a.toLowerCase());
      
      // Check if 'to' address is blacklisted
      if (operation.to) {
        const toAddress = operation.to.toLowerCase();
        const isBlacklisted = blacklist.includes(toAddress);
        
        conditions.push(this.createCondition(
          'to_address_blacklist',
          !isBlacklisted,
          toAddress,
          'not blacklisted',
          isBlacklisted 
            ? `Recipient ${this.truncateAddress(toAddress)} is blacklisted`
            : `Recipient ${this.truncateAddress(toAddress)} is not blacklisted`
        ));
      }
      
      // Check if 'from' address is blacklisted
      if (operation.from) {
        const fromAddress = operation.from.toLowerCase();
        const isBlacklisted = blacklist.includes(fromAddress);
        
        conditions.push(this.createCondition(
          'from_address_blacklist',
          !isBlacklisted,
          fromAddress,
          'not blacklisted',
          isBlacklisted 
            ? `Sender ${this.truncateAddress(fromAddress)} is blacklisted`
            : `Sender ${this.truncateAddress(fromAddress)} is blacklisted`
        ));
      }
    }

    // Check required signers
    if (ruleDetails?.requiredSigners && ruleDetails.requiredSigners.length > 0) {
      const requiredSigners = ruleDetails.requiredSigners.map(a => a.toLowerCase());
      const currentSigner = policyContext.user.address.toLowerCase();
      const hasRequiredSigner = requiredSigners.includes(currentSigner);
      
      conditions.push(this.createCondition(
        'required_signer',
        hasRequiredSigner,
        currentSigner,
        requiredSigners.join(', '),
        hasRequiredSigner 
          ? `Signer ${this.truncateAddress(currentSigner)} is authorized`
          : `Signer ${this.truncateAddress(currentSigner)} is not authorized`
      ));
    }

    // Check minimum signature requirements
    if (ruleDetails?.minSignatures && operation.metadata?.signatures) {
      const signatures = operation.metadata.signatures as string[];
      const hasEnoughSignatures = signatures.length >= ruleDetails.minSignatures;
      
      conditions.push(this.createCondition(
        'min_signatures',
        hasEnoughSignatures,
        signatures.length.toString(),
        ruleDetails.minSignatures.toString(),
        `${signatures.length} of ${ruleDetails.minSignatures} required signatures`
      ));
    }

    // Check if address is a smart contract (if required)
    if (ruleDetails?.requireSmartContract && operation.to) {
      const isContract = await this.isSmartContract(operation.to);
      
      conditions.push(this.createCondition(
        'smart_contract_required',
        isContract,
        isContract ? 'contract' : 'EOA',
        'contract',
        isContract 
          ? `Address ${this.truncateAddress(operation.to)} is a smart contract`
          : `Address ${this.truncateAddress(operation.to)} is not a smart contract`
      ));
    }

    // Check if address is an EOA (if required)
    if (ruleDetails?.requireEOA && operation.to) {
      const isContract = await this.isSmartContract(operation.to);
      
      conditions.push(this.createCondition(
        'eoa_required',
        !isContract,
        isContract ? 'contract' : 'EOA',
        'EOA',
        !isContract 
          ? `Address ${this.truncateAddress(operation.to)} is an EOA`
          : `Address ${this.truncateAddress(operation.to)} is not an EOA`
      ));
    }

    return this.buildResult(rule, conditions);
  }

  private truncateAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private async isSmartContract(address: string): Promise<boolean> {
    // This would need to check the blockchain to see if address has code
    // For now, returning false as placeholder
    // In production, this would use web3 provider to check getCode(address)
    try {
      // Placeholder - in real implementation:
      // const code = await web3Provider.getCode(address);
      // return code !== '0x' && code !== '0x0';
      return false;
    } catch (error) {
      console.error('Error checking if address is contract:', error);
      return false;
    }
  }
}
