/**
 * Unified Gas Service
 * 
 * Uses Etherscan V2 API for mainnet and RealTimeFeeEstimator for testnets
 * since Etherscan gastracker module is not available for testnets.
 */

import { realTimeFeeEstimator, FeePriority } from './blockchain/RealTimeFeeEstimator';

/**
 * Gas oracle data structure
 * Compatible with Etherscan API response format
 */
export interface GasOracle {
  lastBlock?: string;
  safe: number;
  propose: number;
  fast: number;
  suggestBaseFee?: number;
  gasUsedRatio?: string;
}

type SupportedNetwork = "mainnet" | "sepolia" | "holesky";

const ETHERSCAN_BASE = "https://api.etherscan.io/v2/api";
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string;

/**
 * Fetch gas oracle from Etherscan V2 API (mainnet only)
 */
async function fetchEtherscanGasOracle(): Promise<GasOracle> {
  const url = new URL(ETHERSCAN_BASE);
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "gastracker");
  url.searchParams.set("action", "gasoracle");
  url.searchParams.set("apikey", ETHERSCAN_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Etherscan error: ${res.status}`);
  
  const data = await res.json();
  if (data.status !== "1") {
    throw new Error(`Etherscan returned: ${data.message || "Unknown error"}`);
  }

  const r = data.result;
  return {
    lastBlock: r.LastBlock,
    safe: Number(r.SafeGasPrice),
    propose: Number(r.ProposeGasPrice),
    fast: Number(r.FastGasPrice),
    suggestBaseFee: Number(r.suggestBaseFee),
    gasUsedRatio: r.gasUsedRatio,
  };
}

/**
 * Fetch gas oracle for testnet using RealTimeFeeEstimator
 * Converts FeeData to GasOracle format for compatibility
 */
async function fetchTestnetGasOracle(network: 'sepolia' | 'holesky'): Promise<GasOracle> {
  const [lowFee, mediumFee, highFee] = await Promise.all([
    realTimeFeeEstimator.getOptimalFeeData(network, FeePriority.LOW),
    realTimeFeeEstimator.getOptimalFeeData(network, FeePriority.MEDIUM),
    realTimeFeeEstimator.getOptimalFeeData(network, FeePriority.HIGH)
  ]);

  // Convert Wei to Gwei for all prices
  const toGwei = (wei: string) => Number(BigInt(wei) / BigInt(1e9));

  return {
    safe: toGwei(lowFee.gasPrice || '0'),
    propose: toGwei(mediumFee.gasPrice || '0'),
    fast: toGwei(highFee.gasPrice || '0'),
    suggestBaseFee: mediumFee.maxFeePerGas ? toGwei(mediumFee.maxFeePerGas) : undefined,
  };
}

/**
 * Get gas oracle for any supported network
 * 
 * @param network - "mainnet", "sepolia", or "holesky"
 * @returns GasOracle with current gas prices in Gwei
 */
export async function getGasOracle(network: SupportedNetwork): Promise<GasOracle> {
  switch (network) {
    case "mainnet":
      return fetchEtherscanGasOracle();
    case "sepolia":
    case "holesky":
      return fetchTestnetGasOracle(network);
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Convenience function for mainnet
 */
export async function getMainnetGas(): Promise<GasOracle> {
  return getGasOracle("mainnet");
}

/**
 * Convenience function for Sepolia testnet
 */
export async function getSepoliaGas(): Promise<GasOracle> {
  return getGasOracle("sepolia");
}

/**
 * Convenience function for Holesky testnet
 */
export async function getHoleskyGas(): Promise<GasOracle> {
  return getGasOracle("holesky");
}

/**
 * Utility: Convert Gwei to Wei
 */
export function toWeiFromGwei(gwei: number): bigint {
  return BigInt(Math.round(gwei * 1e9));
}

/**
 * Utility: Build EIP-1559 fee structure from gas oracle data
 */
export interface Eip1559Fees {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export function buildEip1559Fees(oracle: GasOracle, priorityLevel: 'low' | 'medium' | 'high' = 'medium'): Eip1559Fees {
  const baseFee = oracle.suggestBaseFee || oracle.propose;
  let gasPrice: number;
  
  switch (priorityLevel) {
    case 'low':
      gasPrice = oracle.safe;
      break;
    case 'high':
      gasPrice = oracle.fast;
      break;
    default:
      gasPrice = oracle.propose;
  }

  // Priority fee is 10% of gas price
  const priorityFee = gasPrice * 0.1;
  
  // Max fee is base + priority + 20% buffer
  const maxFee = (baseFee + priorityFee) * 1.2;

  return {
    maxFeePerGas: toWeiFromGwei(maxFee),
    maxPriorityFeePerGas: toWeiFromGwei(priorityFee)
  };
}
