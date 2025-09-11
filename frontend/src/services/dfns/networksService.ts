/**
 * DFNS Networks Service
 * 
 * Service for DFNS Networks API endpoints
 * Based on: https://docs.dfns.co/d/api-docs/networks
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsNetwork,
  DfnsFeeEstimationRequest,
  DfnsFeeEstimationResponse,
  DfnsContractReadRequest,
  DfnsContractReadResponse,
  DfnsFeePriority,
  DfnsNetworkCapabilities,
  DfnsEip1559FeeEstimation,
  DfnsLegacyFeeEstimation
} from '../../types/dfns/networks';
import { DfnsError, DfnsValidationError } from '../../types/dfns/errors';

export class DfnsNetworksService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // ==============================================
  // FEE ESTIMATION
  // ==============================================

  /**
   * Get real-time fee estimates for a network
   * GET /networks/fees?network={network}
   * 
   * Note: Currently only works on EVM chains
   */
  async estimateFees(network: DfnsNetwork): Promise<DfnsFeeEstimationResponse> {
    try {
      // Validate network supports fee estimation
      if (!this.isEvmNetwork(network)) {
        throw new DfnsValidationError(
          `Fee estimation is currently only supported for EVM networks. Network '${network}' is not supported.`,
          { network, supportedType: 'EVM only' }
        );
      }

      console.log(`🔍 Getting fee estimates for ${network}...`);

      const response = await this.workingClient.makeRequest<DfnsFeeEstimationResponse>(
        'GET',
        `/networks/fees?network=${network}`
      );

      console.log(`✅ Fee estimates retrieved for ${network}:`, {
        kind: response.kind,
        hasBaseFee: 'baseFeePerGas' in response,
        strategies: ['slow', 'standard', 'fast']
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to get fee estimates for ${network}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to estimate fees for ${network}: ${error}`,
        'FEE_ESTIMATION_FAILED',
        { network }
      );
    }
  }

  /**
   * Get fee estimate for specific priority level
   */
  async getFeeForPriority(network: DfnsNetwork, priority: DfnsFeePriority): Promise<string> {
    const fees = await this.estimateFees(network);
    
    switch (fees.kind) {
      case 'Eip1559':
        return fees[priority].maxFeePerGas;
      case 'Legacy':
        return fees[priority].gasPrice;
      default:
        throw new DfnsError(`Unsupported fee kind: ${(fees as any).kind}`, 'UNSUPPORTED_FEE_KIND');
    }
  }

  /**
   * Check if network supports EIP-1559
   */
  async supportsEip1559(network: DfnsNetwork): Promise<boolean> {
    try {
      const fees = await this.estimateFees(network);
      return fees.kind === 'Eip1559';
    } catch {
      return false;
    }
  }

  /**
   * Format fees for display
   */
  formatFees(fees: DfnsFeeEstimationResponse): {
    network: string;
    kind: string;
    baseFee?: string;
    slow: string;
    standard: string;
    fast: string;
  } {
    const result: {
      network: string;
      kind: string;
      baseFee?: string;
      slow: string;
      standard: string;
      fast: string;
    } = {
      network: fees.network,
      kind: fees.kind,
      slow: '',
      standard: '',
      fast: ''
    };

    if (fees.kind === 'Eip1559') {
      result.baseFee = this.weiToGwei(fees.baseFeePerGas);
      result.slow = this.weiToGwei(fees.slow.maxFeePerGas);
      result.standard = this.weiToGwei(fees.standard.maxFeePerGas);
      result.fast = this.weiToGwei(fees.fast.maxFeePerGas);
    } else {
      result.slow = this.weiToGwei(fees.slow.gasPrice);
      result.standard = this.weiToGwei(fees.standard.gasPrice);
      result.fast = this.weiToGwei(fees.fast.gasPrice);
    }

    return result;
  }

  // ==============================================
  // CONTRACT READING
  // ==============================================

  /**
   * Call a read-only function on a smart contract
   * POST /networks/read-contract
   * 
   * Note: Currently only works on EVM compatible chains
   */
  async readContract(request: DfnsContractReadRequest): Promise<DfnsContractReadResponse> {
    try {
      // Validate network supports contract reading
      if (!this.isEvmNetwork(request.network)) {
        throw new DfnsValidationError(
          `Contract reading is currently only supported for EVM networks. Network '${request.network}' is not supported.`,
          { network: request.network, supportedType: 'EVM only' }
        );
      }

      // Validate contract address format
      if (!this.isValidEvmAddress(request.contract)) {
        throw new DfnsValidationError(
          `Invalid contract address format: ${request.contract}`,
          { contract: request.contract, expectedFormat: '0x followed by 40 hex characters' }
        );
      }

      // Validate function data format
      if (!this.isValidHexData(request.data)) {
        throw new DfnsValidationError(
          `Invalid function data format: ${request.data}`,
          { data: request.data, expectedFormat: '0x followed by hex characters' }
        );
      }

      console.log(`📖 Reading contract on ${request.network}:`, {
        contract: request.contract,
        dataLength: request.data.length
      });

      const response = await this.workingClient.makeRequest<DfnsContractReadResponse>(
        'POST',
        '/networks/read-contract',
        request
      );

      console.log(`✅ Contract read successful:`, {
        network: request.network,
        contract: request.contract,
        responseLength: response.data.length,
        gasUsed: response.gasUsed
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to read contract:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to read contract on ${request.network}: ${error}`,
        'CONTRACT_READ_FAILED',
        { network: request.network, contract: request.contract }
      );
    }
  }

  /**
   * Read contract with function encoding helper
   */
  async readContractFunction(
    network: DfnsNetwork,
    contractAddress: string,
    functionSignature: string,
    params: any[] = []
  ): Promise<DfnsContractReadResponse> {
    try {
      // Basic function encoding (you might want to use a library like ethers.js for more complex cases)
      const functionData = this.encodeFunctionCall(functionSignature, params);
      
      return await this.readContract({
        kind: 'Evm',
        network,
        contract: contractAddress,
        data: functionData
      });
    } catch (error) {
      throw new DfnsError(
        `Failed to read contract function ${functionSignature}: ${error}`,
        'CONTRACT_FUNCTION_READ_FAILED',
        { network, contract: contractAddress, function: functionSignature }
      );
    }
  }

  // ==============================================
  // NETWORK CAPABILITIES
  // ==============================================

  /**
   * Get network capabilities
   */
  getNetworkCapabilities(network: DfnsNetwork): DfnsNetworkCapabilities {
    const isEvm = this.isEvmNetwork(network);
    
    return {
      network,
      supportsFeeEstimation: isEvm, // Currently EVM only
      supportsContractReading: isEvm, // Currently EVM only
      supportsValidators: this.supportsValidators(network),
      isEvm,
      chainId: this.getChainId(network)
    };
  }

  /**
   * Check if network is EVM compatible
   */
  isEvmNetwork(network: DfnsNetwork): boolean {
    const evmNetworks: DfnsNetwork[] = [
      'Ethereum',
      'Polygon',
      'Arbitrum',
      'ArbitrumOne',
      'Base',
      'Optimism',
      'Avalanche',
      'Binance',
      // Testnets
      'EthereumSepolia',
      'EthereumHolesky',
      'ArbitrumSepolia',
      'BaseSepolia',
      'BscTestnet',
      'OptimismSepolia',
      'PolygonAmoy',
      'AvalancheFuji',
      'Berachain',
      'BerachainBepolia'
    ];
    
    return evmNetworks.includes(network);
  }

  /**
   * Check if network supports validators
   */
  supportsValidators(network: DfnsNetwork): boolean {
    // Canton validators are supported
    const validatorNetworks: DfnsNetwork[] = [
      'Cosmos',
      'Osmosis',
      'Juno',
      'Stargaze'
      // Add other networks that support validators
    ];
    
    return validatorNetworks.includes(network);
  }

  /**
   * Get chain ID for EVM networks
   */
  getChainId(network: DfnsNetwork): number | undefined {
    const chainIds: Record<string, number> = {
      'Ethereum': 1,
      'Polygon': 137,
      'Arbitrum': 42161,
      'ArbitrumOne': 42161,
      'Base': 8453,
      'Optimism': 10,
      'Avalanche': 43114,
      'Binance': 56,
      // Testnets
      'EthereumSepolia': 11155111,
      'EthereumHolesky': 17000,
      'ArbitrumSepolia': 421614,
      'BaseSepolia': 84532,
      'BscTestnet': 97,
      'OptimismSepolia': 11155420,
      'PolygonAmoy': 80002,
      'AvalancheFuji': 43113
    };
    
    return chainIds[network];
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  /**
   * Convert Wei to Gwei for display
   */
  private weiToGwei(wei: string): string {
    const weiNum = BigInt(wei);
    const gwei = Number(weiNum) / 1e9;
    return gwei.toFixed(2);
  }

  /**
   * Validate EVM address format
   */
  private isValidEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate hex data format
   */
  private isValidHexData(data: string): boolean {
    return /^0x[a-fA-F0-9]*$/.test(data);
  }

  /**
   * Basic function call encoding (simplified)
   * For production, consider using ethers.js or similar library
   */
  private encodeFunctionCall(functionSignature: string, params: any[]): string {
    // This is a simplified implementation
    // For production use, integrate with ethers.js or web3.js
    
    if (functionSignature === 'totalSupply()' && params.length === 0) {
      return '0x18160ddd'; // Standard ERC-20 totalSupply function selector
    }
    
    if (functionSignature === 'balanceOf(address)' && params.length === 1) {
      const address = params[0].replace('0x', '').toLowerCase().padStart(64, '0');
      return '0x70a08231' + address; // Standard ERC-20 balanceOf function selector
    }
    
    // For more complex functions, you would need a proper ABI encoder
    throw new DfnsError(
      `Function encoding not implemented for: ${functionSignature}`,
      'FUNCTION_ENCODING_NOT_IMPLEMENTED',
      { function: functionSignature, paramsCount: params.length }
    );
  }

  // ==============================================
  // METRICS AND STATUS
  // ==============================================

  /**
   * Test network connectivity
   */
  async testNetworkConnectivity(network: DfnsNetwork): Promise<{
    network: DfnsNetwork;
    feeEstimation: boolean;
    contractReading: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const capabilities = this.getNetworkCapabilities(network);
    
    let feeEstimation = false;
    let contractReading = false;
    
    try {
      // Test fee estimation if supported
      if (capabilities.supportsFeeEstimation) {
        await this.estimateFees(network);
        feeEstimation = true;
      }
      
      // Test contract reading if supported (using a simple totalSupply call)
      if (capabilities.supportsContractReading) {
        // Use a well-known contract address for testing (USDC on Ethereum)
        if (network === 'Ethereum') {
          await this.readContract({
            kind: 'Evm',
            network,
            contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            data: '0x18160ddd' // totalSupply()
          });
          contractReading = true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Network connectivity test partial failure for ${network}:`, error);
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      network,
      feeEstimation,
      contractReading,
      responseTime
    };
  }

  /**
   * Get supported networks list
   */
  getSupportedNetworks(): {
    feeEstimation: DfnsNetwork[];
    contractReading: DfnsNetwork[];
    validators: DfnsNetwork[];
  } {
    const allNetworks: DfnsNetwork[] = [
      'Ethereum', 'Polygon', 'Bitcoin', 'Arbitrum', 'ArbitrumOne', 'Base', 'Optimism',
      'Avalanche', 'Solana', 'Cosmos', 'Near', 'Binance', 'Stellar', 'Algorand',
      'EthereumSepolia', 'EthereumHolesky', 'ArbitrumSepolia', 'BaseSepolia',
      'BscTestnet', 'OptimismSepolia', 'PolygonAmoy', 'AvalancheFuji'
    ];
    
    return {
      feeEstimation: allNetworks.filter(n => this.isEvmNetwork(n)),
      contractReading: allNetworks.filter(n => this.isEvmNetwork(n)),
      validators: allNetworks.filter(n => this.supportsValidators(n))
    };
  }
}
