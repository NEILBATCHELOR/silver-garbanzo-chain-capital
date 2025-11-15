/**
 * Request Validator
 * Integrates with Policy Engine for comprehensive validation
 */

import type { RedemptionRequest, ValidationResult, RuleValidation, PolicyValidation } from './types';
import { BalanceValidator, WindowValidator, LimitValidator, HoldingPeriodValidator } from './validators';

export class RequestValidator {
  private balanceValidator: BalanceValidator;
  private windowValidator: WindowValidator;
  private limitValidator: LimitValidator;
  private holdingPeriodValidator: HoldingPeriodValidator;

  constructor() {
    this.balanceValidator = new BalanceValidator();
    this.windowValidator = new WindowValidator();
    this.limitValidator = new LimitValidator();
    this.holdingPeriodValidator = new HoldingPeriodValidator();
  }

  /**
   * Validate redemption request against all rules
   */
  async validate(request: RedemptionRequest): Promise<ValidationResult> {
    const validationResult: ValidationResult = {
      valid: true,
      rules: [],
      policies: [],
      warnings: [],
      errors: [],
      recommendations: []
    };

    try {
      // Run all validators in parallel
      const validators = [
        { name: 'Balance', validator: this.balanceValidator },
        { name: 'Window', validator: this.windowValidator },
        { name: 'Limit', validator: this.limitValidator },
        { name: 'HoldingPeriod', validator: this.holdingPeriodValidator }
      ];

      const results = await Promise.all(
        validators.map(async ({ name, validator }) => ({
          name,
          result: await validator.validate(request)
        }))
      );

      // Process results
      for (const { name, result } of results) {
        const ruleValidation: RuleValidation = {
          ruleId: `${name.toLowerCase()}_validation`,
          ruleName: name,
          passed: result.passed,
          message: result.message,
          errorCode: result.errorCode,
          field: result.field
        };

        validationResult.rules.push(ruleValidation);

        if (!result.passed) {
          validationResult.valid = false;
          validationResult.errors.push({
            code: result.errorCode || 'VALIDATION_FAILED',
            message: result.message,
            field: result.field,
            severity: 'critical'
          });
        }
      }

      // Add recommendations based on validation results
      if (validationResult.valid) {
        validationResult.recommendations.push(
          'All validation checks passed. Request is ready for approval.'
        );
      } else {
        validationResult.recommendations.push(
          'Please resolve the validation errors before proceeding.'
        );
      }

    } catch (error) {
      validationResult.valid = false;
      validationResult.errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical'
      });
    }

    return validationResult;
  }

  /**
   * Quick validation check (basic checks only)
   */
  async quickValidate(request: RedemptionRequest): Promise<boolean> {
    try {
      const balanceResult = await this.balanceValidator.validate(request);
      return balanceResult.passed;
    } catch {
      return false;
    }
  }
}
