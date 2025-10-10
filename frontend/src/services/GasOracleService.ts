/**
 * Unified Gas Service
 * 
 * Uses Etherscan V2 API for mainnet and JSON-RPC for testnets
 * since Etherscan gastracker module is not available for testnets.
 */

import { getSepoliaGas, getHoleskyGas, buildEip1559Fees, toWeiFromGwei } from './TestnetGasService';

export type { GasOracle } from './TestnetGasService';
export { buildEip1559Fees, toWeiFromGwei };

type SupportedNetwork = "mainnet" | "sepolia" | "holesky";

const ETHERSCAN_BASE = "https://api.etherscan.io/v2/api";
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string;

/**
 * Fetch gas oracle from Etherscan V2 API (mainnet only)
 */
async function fetchEtherscanGasOracle() {
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
 * Get gas oracle for any supported network
 * 
 * @param network - "mainnet", "sepolia", or "holesky"
 * @returns GasOracle with current gas prices in Gwei
 */
export async function getGasOracle(network: SupportedNetwork) {
  switch (network) {
    case "mainnet":
      return fetchEtherscanGasOracle();
    case "sepolia":
      return getSepoliaGas();
    case "holesky":
      return getHoleskyGas();
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Convenience function for mainnet
 */
export async function getMainnetGas() {
  return getGasOracle("mainnet");
}
