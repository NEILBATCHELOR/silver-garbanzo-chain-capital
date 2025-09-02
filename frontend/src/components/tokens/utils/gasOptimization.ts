/**
 * Gas Optimization Utilities
 * 
 * Provides gas estimation, optimization techniques, and deployment strategies
 * for complex smart contract deployments
 */

export interface GasEstimationResult {
  baseDeployment: number;
  additionalOperations: number;
  totalEstimated: number;
  recommendedStrategy: 'direct' | 'chunked' | 'proxy';
  optimizationOpportunities: string[];
}

export interface DeploymentComplexityAnalysis {
  complexity: 'simple' | 'medium' | 'high' | 'extreme';
  factors: {
    constructorParams: number;
    arrayElements: number;
    computationIntensity: number;
    storageOperations: number;
  };
  recommendations: string[];
}

export interface GasOptimizationConfig {
  maxGasPerTransaction: number;
  targetGasPrice: number;
  maxRetries: number;
  optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
}

/**
 * Gas optimization utility class
 */
export class GasOptimizationUtils {
  private readonly GAS_ESTIMATES = {
    // Base contract deployment costs
    ERC20_BASE: 1800000,
    ERC721_BASE: 2400000,
    ERC1155_BASE: 2800000,
    ERC1400_BASE: 3200000,
    ERC3525_BASE: 3800000,
    ERC4626_BASE: 2600000,
    
    // Operation costs
    STORAGE_SLOT: 20000,
    ARRAY_ELEMENT: 5000,
    COMPLEX_STRUCT: 10000,
    ROYALTY_SETTING: 30000,
    OWNERSHIP_TRANSFER: 25000,
    
    // Chunking overhead
    TRANSACTION_BASE: 21000,
    FUNCTION_CALL: 2300,
    CHUNK_OVERHEAD: 50000
  };

  private readonly COMPLEXITY_THRESHOLDS = {
    SIMPLE: { params: 5, arrays: 0, elements: 0 },
    MEDIUM: { params: 15, arrays: 2, elements: 20 },
    HIGH: { params: 30, arrays: 5, elements: 100 },
    EXTREME: { params: 50, arrays: 10, elements: 200 }
  };

  /**
   * Analyze deployment complexity for any token configuration
   */
  analyzeDeploymentComplexity(config: any): DeploymentComplexityAnalysis {
    const factors = this.calculateComplexityFactors(config);
    const complexity = this.determineComplexityLevel(factors);
    const recommendations = this.generateOptimizationRecommendations(factors, complexity);

    return {
      complexity,
      factors,
      recommendations
    };
  }

  /**
   * Estimate gas for complex deployment
   */
  estimateDeploymentGas(
    tokenType: string,
    config: any,
    includOptimizations: boolean = true
  ): GasEstimationResult {
    const baseGas = this.getBaseDeploymentGas(tokenType);
    const additionalGas = this.calculateAdditionalGas(config);
    const totalEstimated = baseGas + additionalGas;
    
    const complexity = this.analyzeDeploymentComplexity(config);
    const recommendedStrategy = this.recommendDeploymentStrategy(complexity, totalEstimated);
    const optimizationOpportunities = this.identifyOptimizationOpportunities(config, complexity);

    return {
      baseDeployment: baseGas,
      additionalOperations: additionalGas,
      totalEstimated,
      recommendedStrategy,
      optimizationOpportunities
    };
  }

  /**
   * Calculate optimal chunking strategy for complex deployments
   */
  calculateOptimalChunking(
    config: any,
    maxGasPerChunk: number = 2000000
  ): {
    strategy: 'none' | 'slots' | 'allocations' | 'both';
    chunks: Array<{
      type: string;
      items: number;
      estimatedGas: number;
    }>;
    totalChunks: number;
    estimatedSavings: number;
  } {
    const analysis = this.analyzeDeploymentComplexity(config);
    
    if (analysis.complexity === 'simple' || analysis.complexity === 'medium') {
      return {
        strategy: 'none',
        chunks: [],
        totalChunks: 0,
        estimatedSavings: 0
      };
    }

    const chunks: Array<{ type: string; items: number; estimatedGas: number }> = [];
    let totalChunks = 0;
    let strategy: 'none' | 'slots' | 'allocations' | 'both' = 'none';

    // Analyze slots
    const slots = config.slots || config.initialSlots || [];
    if (slots.length > 0) {
      const slotGasPerItem = this.GAS_ESTIMATES.COMPLEX_STRUCT;
      const slotsPerChunk = Math.floor((maxGasPerChunk - this.GAS_ESTIMATES.CHUNK_OVERHEAD) / slotGasPerItem);
      const slotChunks = Math.ceil(slots.length / slotsPerChunk);
      
      if (slotChunks > 1) {
        chunks.push({
          type: 'slots',
          items: slots.length,
          estimatedGas: slots.length * slotGasPerItem
        });
        totalChunks += slotChunks;
        strategy = strategy === 'none' ? 'slots' : 'both';
      }
    }

    // Analyze allocations
    const allocations = config.allocations || config.valueAllocations || [];
    if (allocations.length > 0) {
      const allocationGasPerItem = this.GAS_ESTIMATES.COMPLEX_STRUCT * 1.5;
      const allocationsPerChunk = Math.floor((maxGasPerChunk - this.GAS_ESTIMATES.CHUNK_OVERHEAD) / allocationGasPerItem);
      const allocationChunks = Math.ceil(allocations.length / allocationsPerChunk);
      
      if (allocationChunks > 1) {
        chunks.push({
          type: 'allocations',
          items: allocations.length,
          estimatedGas: allocations.length * allocationGasPerItem
        });
        totalChunks += allocationChunks;
        strategy = strategy === 'none' ? 'allocations' : 'both';
      }
    }

    // Calculate savings
    const originalGas = this.estimateDeploymentGas(config.tokenType || 'ERC3525', config, false).totalEstimated;
    const chunkedGas = chunks.reduce((sum, chunk) => sum + chunk.estimatedGas, 0) + 
                      (totalChunks * this.GAS_ESTIMATES.CHUNK_OVERHEAD);
    const estimatedSavings = Math.max(0, originalGas - chunkedGas);

    return {
      strategy,
      chunks,
      totalChunks,
      estimatedSavings
    };
  }

  /**
   * Generate deployment optimization report
   */
  generateOptimizationReport(config: any): {
    currentGas: number;
    optimizedGas: number;
    savings: number;
    savingsPercentage: number;
    optimizations: Array<{
      technique: string;
      description: string;
      gasSavings: number;
      implementationDifficulty: 'low' | 'medium' | 'high';
    }>;
    recommendations: string[];
  } {
    const currentGas = this.estimateDeploymentGas(config.tokenType || 'ERC3525', config, false).totalEstimated;
    const complexity = this.analyzeDeploymentComplexity(config);
    
    const optimizations = [
      {
        technique: 'Chunked Deployment',
        description: 'Split large constructor parameters into post-deployment operations',
        gasSavings: Math.min(currentGas * 0.3, 5000000),
        implementationDifficulty: 'medium' as const
      },
      {
        technique: 'Parameter Compression',
        description: 'Optimize constructor parameter encoding and storage',
        gasSavings: Math.min(currentGas * 0.1, 1000000),
        implementationDifficulty: 'low' as const
      },
      {
        technique: 'Proxy Pattern',
        description: 'Use minimal proxy for repeated similar deployments',
        gasSavings: Math.min(currentGas * 0.4, 8000000),
        implementationDifficulty: 'high' as const
      }
    ];

    const applicableOptimizations = optimizations.filter(opt => {
      if (opt.technique === 'Chunked Deployment') {
        return complexity.complexity === 'high' || complexity.complexity === 'extreme';
      }
      if (opt.technique === 'Proxy Pattern') {
        return config.isRepeatedConfiguration || false;
      }
      return true;
    });

    const totalSavings = applicableOptimizations.reduce((sum, opt) => sum + opt.gasSavings, 0);
    const optimizedGas = Math.max(currentGas - totalSavings, currentGas * 0.3); // Minimum 30% of original

    const recommendations = [
      ...(complexity.complexity === 'high' || complexity.complexity === 'extreme' 
        ? ['Use chunked deployment to reduce gas costs and improve reliability']
        : []
      ),
      ...(currentGas > 5000000 
        ? ['Consider breaking deployment into smaller transactions']
        : []
      ),
      ...(config.slots?.length > 20 
        ? ['Implement progressive slot addition for better user experience']
        : []
      ),
      'Monitor gas prices and deploy during low-cost periods',
      'Implement comprehensive error handling and retry mechanisms'
    ];

    return {
      currentGas,
      optimizedGas,
      savings: totalSavings,
      savingsPercentage: (totalSavings / currentGas) * 100,
      optimizations: applicableOptimizations,
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private calculateComplexityFactors(config: any): DeploymentComplexityAnalysis['factors'] {
    const paramCount = Object.keys(config).length;
    
    let arrayElements = 0;
    let computationIntensity = 0;
    let storageOperations = 0;

    // Count array elements
    ['slots', 'allocations', 'initialSlots', 'valueAllocations', 'paymentSchedules'].forEach(key => {
      if (Array.isArray(config[key])) {
        arrayElements += config[key].length;
      }
    });

    // Estimate computation intensity
    if (config.financialInstrumentType) computationIntensity += 2;
    if (config.governanceEnabled) computationIntensity += 1;
    if (config.stakingEnabled) computationIntensity += 1;
    if (config.royaltyEnabled) computationIntensity += 1;

    // Estimate storage operations
    storageOperations = paramCount + (arrayElements * 2); // Each array element requires multiple storage ops

    return {
      constructorParams: paramCount,
      arrayElements,
      computationIntensity,
      storageOperations
    };
  }

  private determineComplexityLevel(factors: DeploymentComplexityAnalysis['factors']): DeploymentComplexityAnalysis['complexity'] {
    if (factors.constructorParams >= this.COMPLEXITY_THRESHOLDS.EXTREME.params ||
        factors.arrayElements >= this.COMPLEXITY_THRESHOLDS.EXTREME.elements) {
      return 'extreme';
    }
    if (factors.constructorParams >= this.COMPLEXITY_THRESHOLDS.HIGH.params ||
        factors.arrayElements >= this.COMPLEXITY_THRESHOLDS.HIGH.elements) {
      return 'high';
    }
    if (factors.constructorParams >= this.COMPLEXITY_THRESHOLDS.MEDIUM.params ||
        factors.arrayElements >= this.COMPLEXITY_THRESHOLDS.MEDIUM.elements) {
      return 'medium';
    }
    return 'simple';
  }

  private generateOptimizationRecommendations(
    factors: DeploymentComplexityAnalysis['factors'],
    complexity: DeploymentComplexityAnalysis['complexity']
  ): string[] {
    const recommendations: string[] = [];

    if (complexity === 'extreme') {
      recommendations.push('Mandatory: Use chunked deployment pattern');
      recommendations.push('Consider implementing deployment checkpoints');
      recommendations.push('Use progressive configuration with user feedback');
    }

    if (complexity === 'high') {
      recommendations.push('Recommended: Use chunked deployment for reliability');
      recommendations.push('Implement comprehensive error handling');
    }

    if (factors.arrayElements > 50) {
      recommendations.push('Optimize array processing with batch operations');
    }

    if (factors.constructorParams > 30) {
      recommendations.push('Consider parameter compression techniques');
    }

    return recommendations;
  }

  private getBaseDeploymentGas(tokenType: string): number {
    switch (tokenType.toUpperCase()) {
      case 'ERC20': return this.GAS_ESTIMATES.ERC20_BASE;
      case 'ERC721': return this.GAS_ESTIMATES.ERC721_BASE;
      case 'ERC1155': return this.GAS_ESTIMATES.ERC1155_BASE;
      case 'ERC1400': return this.GAS_ESTIMATES.ERC1400_BASE;
      case 'ERC3525': return this.GAS_ESTIMATES.ERC3525_BASE;
      case 'ERC4626': return this.GAS_ESTIMATES.ERC4626_BASE;
      default: return this.GAS_ESTIMATES.ERC20_BASE;
    }
  }

  private calculateAdditionalGas(config: any): number {
    let additionalGas = 0;

    // Array elements
    ['slots', 'allocations', 'initialSlots', 'valueAllocations'].forEach(key => {
      if (Array.isArray(config[key])) {
        additionalGas += config[key].length * this.GAS_ESTIMATES.COMPLEX_STRUCT;
      }
    });

    // Special features
    if (config.royaltyEnabled) additionalGas += this.GAS_ESTIMATES.ROYALTY_SETTING;
    if (config.governanceEnabled) additionalGas += 100000;
    if (config.stakingEnabled) additionalGas += 150000;

    return additionalGas;
  }

  private recommendDeploymentStrategy(
    complexity: DeploymentComplexityAnalysis,
    estimatedGas: number
  ): 'direct' | 'chunked' | 'proxy' {
    if (complexity.complexity === 'extreme' || estimatedGas > 10000000) {
      return 'chunked';
    }
    if (complexity.complexity === 'high' || estimatedGas > 5000000) {
      return 'chunked';
    }
    return 'direct';
  }

  private identifyOptimizationOpportunities(config: any, complexity: DeploymentComplexityAnalysis): string[] {
    const opportunities: string[] = [];

    if (complexity.complexity === 'high' || complexity.complexity === 'extreme') {
      opportunities.push('Use chunked deployment to reduce gas costs by 30-40%');
    }

    if (complexity.factors.arrayElements > 50) {
      opportunities.push('Implement post-deployment array initialization');
    }

    if (config.slots?.length > 20) {
      opportunities.push('Consider lazy slot creation for better UX');
    }

    return opportunities;
  }
}

// Export singleton instance
export const gasOptimizationUtils = new GasOptimizationUtils();
