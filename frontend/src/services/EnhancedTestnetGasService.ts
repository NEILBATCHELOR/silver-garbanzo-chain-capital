/**
 * Enhanced Testnet Gas Estimation Service
 * 
 * Uses eth_estimateGas with proper EIP-1559 fee calculation
 * NO FALLBACKS - fails if estimation fails
 * Uses premium RPCs (Alchemy/QuickNode) for accurate estimation
 */

export type GasEstimation = {
  gasLimit: bigint;               // Estimated gas limit from eth_estimateGas
  baseFeePerGas: bigint;          // Current base fee from latest block
  maxPriorityFeePerGas: bigint;   // Priority fee from fee history
  maxFeePerGas: bigint;           // baseFee + maxPriorityFeePerGas (with buffer)
  totalCostWei: bigint;           // gasLimit * maxFeePerGas
  totalCostEth: string;           // Total cost in ETH
  estimatedAt: Date;              // Timestamp of estimation
};

export type ContractDeploymentParams = {
  from: string;                   // Deployer address
  data: string;                   // Contract bytecode + constructor args
  value?: string;                 // ETH value to send (optional)
};

type ChainConfig = {
  rpcUrl: string;
  chainId: number;
  name: string;
};

const CHAINS: Record<string, ChainConfig> = {
  sepolia: {
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || "",
    chainId: 11155111,
    name: "Sepolia"
  },
  holesky: {
    rpcUrl: import.meta.env.VITE_HOLESKY_RPC_URL || "",
    chainId: 17000,
    name: "Holesky"
  }
};

/**
 * Convert wei to ETH
 */
function weiToEth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(6);
}

/**
 * Fetch base fee and priority fee from chain using eth_feeHistory
 * 
 * Returns:
 * - baseFeePerGas: From latest block
 * - maxPriorityFeePerGas: Median from recent blocks
 */
async function fetchEIP1559Fees(rpcUrl: string): Promise<{
  baseFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  if (!rpcUrl) {
    throw new Error('RPC URL not configured. Check your environment variables.');
  }

  // Get fee history for last 10 blocks
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_feeHistory',
      params: [
        '0xa',  // 10 blocks
        'latest',
        [25, 50, 75]  // Percentile rewards (low, medium, high)
      ],
      id: 1
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`eth_feeHistory RPC error: ${data.error.message}`);
  }

  if (!data.result) {
    throw new Error('eth_feeHistory returned no result');
  }

  const feeHistory = data.result;
  
  // Get base fee from latest block (last element in array)
  const latestBaseFeeHex = feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1];
  if (!latestBaseFeeHex) {
    throw new Error('No base fee found in fee history');
  }
  const baseFeePerGas = BigInt(latestBaseFeeHex);

  // Calculate median priority fee from percentiles
  // Use 50th percentile (medium) from recent blocks
  const priorityFees: bigint[] = [];
  for (const blockRewards of feeHistory.reward) {
    if (blockRewards && blockRewards[1]) {  // 50th percentile
      priorityFees.push(BigInt(blockRewards[1]));
    }
  }

  if (priorityFees.length === 0) {
    throw new Error('No priority fees found in fee history');
  }

  // Use median priority fee
  priorityFees.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const medianIndex = Math.floor(priorityFees.length / 2);
  const maxPriorityFeePerGas = priorityFees[medianIndex];

  return {
    baseFeePerGas,
    maxPriorityFeePerGas
  };
}

/**
 * Estimate gas for contract deployment using eth_estimateGas
 * 
 * CRITICAL: This simulates the transaction with the EXACT parameters that will be sent.
 * If estimation fails, the actual deployment will also fail, so we throw immediately.
 * 
 * NO FALLBACKS - fails if estimation fails
 */
async function estimateGasForDeployment(
  rpcUrl: string,
  params: ContractDeploymentParams
): Promise<bigint> {
  if (!rpcUrl) {
    throw new Error('RPC URL not configured. Check your environment variables.');
  }

  if (!params.from) {
    throw new Error('Deployer address (from) is required for gas estimation');
  }

  if (!params.data) {
    throw new Error('Contract bytecode (data) is required for gas estimation');
  }

  // Prepare transaction for estimation
  const txParams: any = {
    from: params.from,
    data: params.data
  };

  // Include value if sending ETH
  if (params.value) {
    txParams.value = params.value;
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_estimateGas',
      params: [txParams],
      id: 1
    })
  });

  const data = await response.json();
  
  if (data.error) {
    // eth_estimateGas failure means deployment will fail
    // Common reasons: insufficient funds, contract reverts, invalid bytecode
    throw new Error(
      `eth_estimateGas failed: ${data.error.message}. ` +
      `This transaction will fail if deployed. ` +
      `Check: 1) Wallet has sufficient balance, ` +
      `2) Contract constructor doesn't revert, ` +
      `3) Bytecode is valid`
    );
  }

  if (!data.result) {
    throw new Error('eth_estimateGas returned no result');
  }

  const gasEstimate = BigInt(data.result);
  
  // Add 10% buffer for safety (EIP-1559 can cause slight variations)
  const gasLimitWithBuffer = (gasEstimate * 110n) / 100n;
  
  return gasLimitWithBuffer;
}

/**
 * Get comprehensive gas estimation for contract deployment
 * 
 * Uses:
 * - eth_estimateGas for gas limit
 * - eth_feeHistory for baseFee and priority fee
 * - Calculates maxFeePerGas = baseFee + maxPriorityFeePerGas
 * 
 * NO FALLBACKS - throws error if any RPC call fails
 */
export async function estimateDeploymentGas(
  network: "sepolia" | "holesky",
  params: ContractDeploymentParams
): Promise<GasEstimation> {
  const chain = CHAINS[network];
  
  if (!chain) {
    throw new Error(`Unsupported network: ${network}`);
  }

  if (!chain.rpcUrl) {
    throw new Error(
      `RPC URL not configured for ${network}. ` +
      `Add ${network === 'sepolia' ? 'VITE_SEPOLIA_RPC_URL' : 'VITE_HOLESKY_RPC_URL'} to .env`
    );
  }

  try {
    // 1. Estimate gas limit using eth_estimateGas
    console.log(`[GasEstimation] Estimating gas for ${network} deployment...`);
    const gasLimit = await estimateGasForDeployment(chain.rpcUrl, params);
    console.log(`[GasEstimation] Gas limit estimated: ${gasLimit} units`);

    // 2. Fetch EIP-1559 fee data
    console.log(`[GasEstimation] Fetching EIP-1559 fees from ${network}...`);
    const { baseFeePerGas, maxPriorityFeePerGas } = await fetchEIP1559Fees(chain.rpcUrl);
    console.log(`[GasEstimation] Base fee: ${baseFeePerGas} wei, Priority fee: ${maxPriorityFeePerGas} wei`);

    // 3. Calculate maxFeePerGas (baseFee + priority + 10% buffer)
    // Buffer protects against base fee increases between estimation and submission
    const maxFeePerGas = (baseFeePerGas + maxPriorityFeePerGas) * 110n / 100n;

    // 4. Calculate total cost
    const totalCostWei = gasLimit * maxFeePerGas;
    const totalCostEth = weiToEth(totalCostWei);

    console.log(`[GasEstimation] Max fee per gas: ${maxFeePerGas} wei`);
    console.log(`[GasEstimation] Total estimated cost: ${totalCostEth} ETH`);

    return {
      gasLimit,
      baseFeePerGas,
      maxPriorityFeePerGas,
      maxFeePerGas,
      totalCostWei,
      totalCostEth,
      estimatedAt: new Date()
    };
  } catch (error: any) {
    // Re-throw with context - NO FALLBACK
    throw new Error(
      `Gas estimation failed for ${network} deployment: ${error.message}. ` +
      `Cannot proceed without accurate gas estimation.`
    );
  }
}

/**
 * Build EIP-1559 transaction parameters from gas estimation
 */
export function buildTransactionParams(estimation: GasEstimation, deploymentParams: ContractDeploymentParams) {
  return {
    from: deploymentParams.from,
    data: deploymentParams.data,
    value: deploymentParams.value || '0x0',
    gasLimit: '0x' + estimation.gasLimit.toString(16),
    maxFeePerGas: '0x' + estimation.maxFeePerGas.toString(16),
    maxPriorityFeePerGas: '0x' + estimation.maxPriorityFeePerGas.toString(16)
  };
}

/**
 * Get user-friendly gas estimation summary
 */
export function formatGasEstimation(estimation: GasEstimation) {
  return {
    gasLimit: estimation.gasLimit.toString(),
    gasLimitFormatted: estimation.gasLimit.toLocaleString() + ' units',
    baseFee: (Number(estimation.baseFeePerGas) / 1e9).toFixed(2) + ' gwei',
    priorityFee: (Number(estimation.maxPriorityFeePerGas) / 1e9).toFixed(2) + ' gwei',
    maxFee: (Number(estimation.maxFeePerGas) / 1e9).toFixed(2) + ' gwei',
    totalCost: estimation.totalCostEth + ' ETH',
    estimatedAt: estimation.estimatedAt.toISOString()
  };
}

/**
 * Legacy function for backward compatibility
 * Use estimateDeploymentGas instead
 */
export async function getTestnetGas(network: "sepolia" | "holesky") {
  throw new Error(
    'getTestnetGas is deprecated. Use estimateDeploymentGas with proper deployment parameters instead.'
  );
}
