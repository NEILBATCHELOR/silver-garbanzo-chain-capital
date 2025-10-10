/**
 * Testnet Gas Service
 * 
 * Since Etherscan V2 API does not support gastracker module for testnets,
 * we use JSON-RPC calls to get gas prices directly from the chain.
 */

export type GasOracle = {
  lastBlock: string;
  safe: number;      // priority fee (Gwei)
  propose: number;   // priority fee (Gwei)
  fast: number;      // priority fee (Gwei)
  suggestBaseFee: number; // Gwei
  gasUsedRatio: string;
};

type ChainConfig = {
  rpcUrl: string;
  chainId: number;
  name: string;
};

const CHAINS: Record<string, ChainConfig> = {
  sepolia: {
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    chainId: 11155111,
    name: "Sepolia"
  },
  holesky: {
    rpcUrl: import.meta.env.VITE_HOLESKY_RPC_URL || "https://ethereum-holesky-rpc.publicnode.com",
    chainId: 17000,
    name: "Holesky"
  }
};

/**
 * Convert wei to Gwei
 */
function weiToGwei(wei: bigint): number {
  return Number(wei) / 1e9;
}

/**
 * Convert Gwei to wei
 */
export function toWeiFromGwei(gwei: number): bigint {
  return BigInt(Math.round(gwei * 1e9));
}

/**
 * Fetch current base fee from the chain using JSON-RPC
 */
async function fetchBaseFee(rpcUrl: string): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: ['latest', false],
      id: 1
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  
  const baseFeeWei = BigInt(data.result.baseFeePerGas);
  return weiToGwei(baseFeeWei);
}

/**
 * Estimate priority fees based on recent blocks
 * For testnets, we use conservative estimates since they're typically not congested
 */
function estimatePriorityFees(baseFee: number) {
  // Testnet priority fees are typically very low (often 0)
  // We add small amounts just to ensure transactions go through
  return {
    safe: 0.1,      // 0.1 Gwei
    propose: 0.5,   // 0.5 Gwei  
    fast: 1.0       // 1.0 Gwei
  };
}

/**
 * Fetch gas oracle data for a testnet using RPC
 */
async function fetchTestnetGasOracle(chain: ChainConfig): Promise<GasOracle> {
  const baseFee = await fetchBaseFee(chain.rpcUrl);
  const priorityFees = estimatePriorityFees(baseFee);

  return {
    lastBlock: "0", // Not provided by RPC
    safe: priorityFees.safe,
    propose: priorityFees.propose,
    fast: priorityFees.fast,
    suggestBaseFee: baseFee,
    gasUsedRatio: "0.5" // Estimated
  };
}

/**
 * Get gas oracle for Sepolia testnet
 */
export async function getSepoliaGas(): Promise<GasOracle> {
  return fetchTestnetGasOracle(CHAINS.sepolia);
}

/**
 * Get gas oracle for Holesky testnet
 */
export async function getHoleskyGas(): Promise<GasOracle> {
  return fetchTestnetGasOracle(CHAINS.holesky);
}

/**
 * Build EIP-1559 fee parameters from gas oracle
 */
export function buildEip1559Fees(
  oracle: GasOracle, 
  speed: "safe" | "propose" | "fast" = "propose"
) {
  const maxPriorityFeePerGasWei = toWeiFromGwei(oracle[speed]);
  const maxFeePerGasWei = toWeiFromGwei(oracle.suggestBaseFee + oracle[speed]);
  
  return { 
    maxFeePerGasWei, 
    maxPriorityFeePerGasWei 
  };
}

/**
 * Get gas for any supported testnet
 */
export async function getTestnetGas(network: "sepolia" | "holesky"): Promise<GasOracle> {
  const chain = CHAINS[network];
  if (!chain) throw new Error(`Unsupported network: ${network}`);
  
  return fetchTestnetGasOracle(chain);
}
