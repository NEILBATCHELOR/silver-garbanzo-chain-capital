import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { ethers } from 'ethers'
import {
  UserOperation,
  PaymasterData,
  PaymasterPolicy,
  PaymasterCondition,
  PaymasterOperationRecord
} from './types'

/**
 * PaymasterService - Gasless Transaction Sponsorship
 * 
 * Handles paymaster integration for sponsored UserOperations:
 * - Policy-based sponsorship decisions
 * - Gas cost estimation and limits
 * - Multiple paymaster integration
 * - Sponsorship analytics and billing
 */
export class PaymasterService extends BaseService {
  
  private paymasterContracts: Map<string, ethers.Contract>
  private provider: ethers.JsonRpcProvider

  constructor() {
    super('Paymaster')
    
    this.provider = new ethers.JsonRpcProvider(
      process.env.BLOCKCHAIN_RPC_URL || 'https://ethereum.publicnode.com'
    )
    
    this.paymasterContracts = new Map()
    
    // Initialize known paymasters
    this.initializePaymasters()
  }

  /**
   * Get paymaster data for UserOperation sponsorship
   */
  async getPaymasterData(
    userOp: UserOperation,
    policy: PaymasterPolicy
  ): Promise<ServiceResult<PaymasterData & { validUntil: number }>> {
    try {
      // Evaluate sponsorship policy
      const policyResult = await this.evaluatePolicy(userOp, policy)
      if (!policyResult.success || !policyResult.data!.approved) {
        return this.error('Sponsorship policy not met', 'SPONSORSHIP_DENIED')
      }

      // Select best paymaster for this operation
      const paymaster = await this.selectPaymaster(userOp, policy)
      if (!paymaster.success) {
        return this.error('Failed to select paymaster', 'PAYMASTER_SELECTION_FAILED')
      }

      // Get paymaster signature/data
      const paymasterData = await this.getPaymasterSignature(
        userOp, 
        paymaster.data!.address,
        policy
      )
      if (!paymasterData.success) {
        return this.error('Failed to get paymaster signature', 'PAYMASTER_SIGNATURE_FAILED')
      }

      // Estimate gas limits for paymaster operations
      const gasLimits = await this.estimatePaymasterGas(userOp, paymaster.data!.address)
      if (!gasLimits.success) {
        return this.error('Failed to estimate paymaster gas', 'PAYMASTER_GAS_ESTIMATION_FAILED')
      }

      const result = {
        paymaster: paymaster.data!.address,
        paymasterVerificationGasLimit: gasLimits.data!.verificationGasLimit,
        paymasterPostOpGasLimit: gasLimits.data!.postOpGasLimit,
        paymasterData: paymasterData.data!.data,
        validUntil: paymasterData.data!.validUntil
      }

      // Store sponsorship record
      await this.recordSponsorship(userOp, result, policy)

      this.logger.info({ 
        sender: userOp.sender,
        paymaster: result.paymaster,
        policy: policy.type 
      }, 'Paymaster data generated')

      return this.success(result)

    } catch (error) {
      this.logger.error({ error, userOp, policy }, 'Failed to get paymaster data')
      return this.error('Failed to get paymaster data', 'PAYMASTER_DATA_FAILED')
    }
  }

  /**
   * Evaluate if UserOperation meets sponsorship policy
   */
  async evaluatePolicy(
    userOp: UserOperation,
    policy: PaymasterPolicy
  ): Promise<ServiceResult<{ approved: boolean; reason?: string; estimatedCost?: string }>> {
    try {
      // Always approve user_pays policy
      if (policy.type === 'user_pays') {
        return this.success({ approved: true })
      }

      // Check policy conditions
      for (const condition of policy.conditions || []) {
        const conditionResult = await this.evaluateCondition(userOp, condition)
        if (!conditionResult.success || !conditionResult.data!.met) {
          return this.success({
            approved: false,
            reason: conditionResult.data!.reason || 'Policy condition not met'
          })
        }
      }

      // Estimate total gas cost for sponsorship
      const gasCost = await this.estimateOperationCost(userOp)
      if (!gasCost.success) {
        return this.success({
          approved: false,
          reason: 'Failed to estimate operation cost'
        })
      }

      // Check sponsorship limits
      if (policy.maxGasSponsored) {
        const maxGas = BigInt(policy.maxGasSponsored)
        const estimatedGas = BigInt(gasCost.data!)
        
        if (estimatedGas > maxGas) {
          return this.success({
            approved: false,
            reason: 'Operation exceeds maximum sponsored gas limit',
            estimatedCost: gasCost.data!
          })
        }
      }

      return this.success({
        approved: true,
        estimatedCost: gasCost.data!
      })

    } catch (error) {
      this.logger.error({ error, userOp, policy }, 'Failed to evaluate policy')
      return this.error('Failed to evaluate policy', 'POLICY_EVALUATION_FAILED')
    }
  }

  /**
   * Validate paymaster signature for UserOperation
   */
  async validatePaymasterSignature(
    userOp: UserOperation,
    paymasterData: PaymasterData
  ): Promise<ServiceResult<{ valid: boolean; reason?: string }>> {
    try {
      const contract = this.paymasterContracts.get(paymasterData.paymaster)
      if (!contract) {
        return this.success({
          valid: false,
          reason: 'Unknown paymaster contract'  
        })
      }

      // Validate paymaster can sponsor this operation
      const canSponsor = await this.canSponsorOperation(userOp, paymasterData)
      if (!canSponsor.success || !canSponsor.data!.canSponsor) {
        return this.success({
          valid: false,
          reason: canSponsor.data!.reason || 'Paymaster cannot sponsor operation'
        })
      }

      return this.success({ valid: true })

    } catch (error) {
      this.logger.error({ error, userOp, paymasterData }, 'Failed to validate paymaster signature')
      return this.error('Failed to validate paymaster signature', 'PAYMASTER_VALIDATION_FAILED')
    }
  }

  /**
   * Get sponsorship analytics
   */
  async getSponsorshipAnalytics(
    timeframe: { from: Date; to: Date },
    filters?: {
      paymasterAddress?: string
      sponsorAddress?: string
      walletAddress?: string
    }
  ): Promise<ServiceResult<{
    totalOperations: number
    totalGasSponsored: string
    totalCostSponsored: string
    paymasterBreakdown: Record<string, {
      operations: number
      gasSponsored: string
      costSponsored: string
    }>
    topSponsors: Array<{
      address: string
      operations: number
      gasSponsored: string
    }>
  }>> {
    try {
      const whereClause: any = {
        created_at: {
          gte: timeframe.from,
          lte: timeframe.to
        }
      }

      if (filters?.paymasterAddress) {
        whereClause.paymaster_address = filters.paymasterAddress
      }
      if (filters?.sponsorAddress) {
        whereClause.sponsor_address = filters.sponsorAddress
      }

      const operations = await this.db.paymaster_operations.findMany({
        where: whereClause,
        include: {
          user_operations: true
        }
      })

      const totalOperations = operations.length
      const totalGasSponsored = operations
        .reduce((sum, op) => sum + BigInt(op.gas_sponsored), BigInt(0))
        .toString()

      // Calculate total cost (gas * price - simplified)
      const totalCostSponsored = operations
        .reduce((sum, op) => sum + BigInt(op.gas_sponsored) * BigInt(1000000000), BigInt(0)) // 1 gwei avg
        .toString()

      // Paymaster breakdown
      const paymasterBreakdown: Record<string, any> = {}
      operations.forEach(op => {
        const addr = op.paymaster_address
        if (!paymasterBreakdown[addr]) {
          paymasterBreakdown[addr] = {
            operations: 0,
            gasSponsored: BigInt(0),
            costSponsored: BigInt(0)
          }
        }
        paymasterBreakdown[addr].operations += 1
        paymasterBreakdown[addr].gasSponsored += BigInt(op.gas_sponsored)
        paymasterBreakdown[addr].costSponsored += BigInt(op.gas_sponsored) * BigInt(1000000000)
      })

      // Convert BigInt to string for JSON serialization
      Object.keys(paymasterBreakdown).forEach(addr => {
        paymasterBreakdown[addr].gasSponsored = paymasterBreakdown[addr].gasSponsored.toString()
        paymasterBreakdown[addr].costSponsored = paymasterBreakdown[addr].costSponsored.toString()
      })

      // Top sponsors
      const sponsorMap: Record<string, { operations: number; gasSponsored: bigint }> = {}
      operations.forEach(op => {
        if (op.sponsor_address) {
          const addr = op.sponsor_address
          if (!sponsorMap[addr]) {
            sponsorMap[addr] = { operations: 0, gasSponsored: BigInt(0) }
          }
          sponsorMap[addr].operations += 1
          sponsorMap[addr].gasSponsored += BigInt(op.gas_sponsored)
        }
      })

      const topSponsors = Object.entries(sponsorMap)
        .sort(([,a], [,b]) => Number(b.gasSponsored - a.gasSponsored))
        .slice(0, 10)
        .map(([address, data]) => ({
          address,
          operations: data.operations,
          gasSponsored: data.gasSponsored.toString()
        }))

      return this.success({
        totalOperations,
        totalGasSponsored,
        totalCostSponsored,
        paymasterBreakdown,
        topSponsors
      })

    } catch (error) {
      this.logger.error({ error, timeframe, filters }, 'Failed to get sponsorship analytics')
      return this.error('Failed to get sponsorship analytics', 'SPONSORSHIP_ANALYTICS_FAILED')
    }
  }

  /**
   * Private helper methods
   */

  private initializePaymasters(): void {
    // Initialize known paymaster contracts
    const paymasterABI = [
      'function validatePaymasterUserOp(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp, bytes32 userOpHash, uint256 maxCost) external returns (bytes context, uint256 validationData)',
      'function postOp(uint8 mode, bytes context, uint256 actualGasCost) external',
      'function deposit() external payable',
      'function withdrawTo(address withdrawAddress, uint256 amount) external',
      'function getDeposit() external view returns (uint256)'
    ]

    // Example paymasters (would be configured)
    const knownPaymasters = [
      '0x0000000000000000000000000000000000000001', // Example paymaster 1
      '0x0000000000000000000000000000000000000002', // Example paymaster 2
    ]

    knownPaymasters.forEach(address => {
      this.paymasterContracts.set(
        address,
        new ethers.Contract(address, paymasterABI, this.provider)
      )
    })
  }

  private async selectPaymaster(
    userOp: UserOperation,
    policy: PaymasterPolicy
  ): Promise<ServiceResult<{ address: string; type: string }>> {
    try {
      // Policy-based paymaster selection
      if (policy.sponsorAddress) {
        return this.success({
          address: policy.sponsorAddress,
          type: 'sponsor_specific'
        })
      }

      // Select best available paymaster
      // For now, return first available
      const paymasters = Array.from(this.paymasterContracts.keys())
      if (paymasters.length === 0) {
        return this.error('No paymasters available', 'NO_PAYMASTERS')
      }

      const address = paymasters[0]
      if (!address) {
        return this.error('No paymasters available', 'NO_PAYMASTERS')
      }

      return this.success({
        address,
        type: 'automatic'
      })

    } catch (error) {
      this.logger.error({ error, userOp, policy }, 'Failed to select paymaster')
      return this.error('Failed to select paymaster', 'PAYMASTER_SELECTION_FAILED')
    }
  }

  private async getPaymasterSignature(
    userOp: UserOperation,
    paymasterAddress: string,
    policy: PaymasterPolicy
  ): Promise<ServiceResult<{ data: string; validUntil: number }>> {
    try {
      // Generate paymaster data for the operation
      // This would typically involve signing by the paymaster
      
      const validUntil = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      
      // Encode paymaster data (simplified)
      const paymasterData = ethers.solidityPacked(
        ['address', 'uint48', 'uint48'],
        [paymasterAddress, validUntil, 0]
      )

      return this.success({
        data: paymasterData,
        validUntil
      })

    } catch (error) {
      this.logger.error({ error, userOp, paymasterAddress }, 'Failed to get paymaster signature')
      return this.error('Failed to get paymaster signature', 'PAYMASTER_SIGNATURE_FAILED')
    }
  }

  private async estimatePaymasterGas(
    userOp: UserOperation,
    paymasterAddress: string
  ): Promise<ServiceResult<{ verificationGasLimit: string; postOpGasLimit: string }>> {
    try {
      // Estimate gas for paymaster operations
      // This would typically simulate the paymaster validation and postOp
      
      return this.success({
        verificationGasLimit: '0x7530', // 30,000
        postOpGasLimit: '0x2710'        // 10,000
      })

    } catch (error) {
      this.logger.error({ error, userOp, paymasterAddress }, 'Failed to estimate paymaster gas')
      return this.error('Failed to estimate paymaster gas', 'PAYMASTER_GAS_ESTIMATION_FAILED')
    }
  }

  private async evaluateCondition(
    userOp: UserOperation,
    condition: PaymasterCondition
  ): Promise<ServiceResult<{ met: boolean; reason?: string }>> {
    try {
      switch (condition.type) {
        case 'max_value':
          // Check if operation value is within limit
          const maxValue = BigInt(condition.value as string)
          // This would parse callData to extract value
          return this.success({ met: true })

        case 'allowed_targets':
          // Check if target addresses are allowed
          const allowedTargets = condition.value as string[]
          // This would parse callData to extract target addresses
          return this.success({ met: true })

        case 'time_limit':
          // Check if operation is within time window
          const timeLimit = condition.value as number
          const currentTime = Math.floor(Date.now() / 1000)
          return this.success({ 
            met: currentTime < timeLimit,
            reason: 'Time limit exceeded'
          })

        default:
          return this.success({ 
            met: false, 
            reason: 'Unknown condition type' 
          })
      }

    } catch (error) {
      this.logger.error({ error, condition }, 'Failed to evaluate condition')
      return this.success({ 
        met: false, 
        reason: 'Condition evaluation failed' 
      })
    }
  }

  private async estimateOperationCost(userOp: UserOperation): Promise<ServiceResult<string>> {
    try {
      // Estimate total gas cost for the operation
      const callGas = BigInt(userOp.callGasLimit || '0x30D40')
      const verificationGas = BigInt(userOp.verificationGasLimit || '0x15F90')
      const preVerificationGas = BigInt(userOp.preVerificationGas || '0x5208')
      
      const totalGas = callGas + verificationGas + preVerificationGas
      const gasPrice = BigInt(userOp.maxFeePerGas || '0x4A817C800') // 20 gwei
      
      const totalCost = totalGas * gasPrice
      
      return this.success(totalCost.toString())

    } catch (error) {
      this.logger.error({ error, userOp }, 'Failed to estimate operation cost')
      return this.error('Failed to estimate operation cost', 'COST_ESTIMATION_FAILED')
    }
  }

  private async canSponsorOperation(
    userOp: UserOperation,
    paymasterData: PaymasterData
  ): Promise<ServiceResult<{ canSponsor: boolean; reason?: string }>> {
    try {
      const contract = this.paymasterContracts.get(paymasterData.paymaster)
      if (!contract) {
        return this.success({
          canSponsor: false,
          reason: 'Paymaster contract not found'
        })
      }

      // Check paymaster deposit
      const depositMethod = contract.getDeposit
      if (!depositMethod) {
        return this.success({
          canSponsor: false,
          reason: 'Paymaster contract missing getDeposit method'
        })
      }
      
      const deposit = await depositMethod()
      const estimatedCost = await this.estimateOperationCost(userOp)
      
      if (!estimatedCost.success) {
        return this.success({
          canSponsor: false,
          reason: 'Could not estimate operation cost'
        })
      }

      const hasEnoughDeposit = deposit >= BigInt(estimatedCost.data!)
      
      return this.success({
        canSponsor: hasEnoughDeposit,
        reason: hasEnoughDeposit ? undefined : 'Insufficient paymaster deposit'
      })

    } catch (error) {
      this.logger.error({ error, userOp, paymasterData }, 'Failed to check sponsorship capability')
      return this.success({
        canSponsor: false,
        reason: 'Failed to verify sponsorship capability'
      })
    }
  }

  private async recordSponsorship(
    userOp: UserOperation,
    paymasterData: PaymasterData & { validUntil: number },
    policy: PaymasterPolicy
  ): Promise<void> {
    try {
      // This would be called after UserOperation is stored
      // For now, just log the sponsorship
      this.logger.info({
        sender: userOp.sender,
        paymaster: paymasterData.paymaster,
        policy: policy.type,
        validUntil: paymasterData.validUntil
      }, 'Sponsorship recorded')

    } catch (error) {
      this.logger.error({ error, userOp, paymasterData, policy }, 'Failed to record sponsorship')
    }
  }
}
