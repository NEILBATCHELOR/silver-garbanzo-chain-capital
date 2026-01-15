/**
 * XRPL Connection Test Utility
 * Test basic connectivity to XRPL networks
 */

import { xrplClientManager } from './XRPLClientManager'
import type { XRPLNetwork } from '../config/XRPLConfig'

export interface ConnectionTestResult {
  network: XRPLNetwork
  success: boolean
  latency?: number
  ledgerIndex?: number
  error?: string
}

/**
 * Test connection to a specific XRPL network
 */
export async function testXRPLConnection(
  network: XRPLNetwork = 'TESTNET'
): Promise<ConnectionTestResult> {
  const startTime = Date.now()
  
  try {
    console.log(`[XRPL Test] Testing connection to ${network}...`)
    
    // Get client (will auto-connect)
    const client = await xrplClientManager.getClient(network)
    
    // Test basic request to get ledger info
    const ledgerResponse = await client.request({
      command: 'ledger',
      ledger_index: 'validated'
    })
    
    const latency = Date.now() - startTime
    const ledgerIndex = ledgerResponse.result.ledger_index
    
    console.log(`✅ [XRPL Test] Connection successful!`)
    console.log(`   Network: ${network}`)
    console.log(`   Latency: ${latency}ms`)
    console.log(`   Ledger Index: ${ledgerIndex}`)
    
    return {
      network,
      success: true,
      latency,
      ledgerIndex
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    console.error(`❌ [XRPL Test] Connection failed:`, errorMessage)
    
    return {
      network,
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Test connections to all XRPL networks
 */
export async function testAllXRPLConnections(): Promise<ConnectionTestResult[]> {
  const networks: XRPLNetwork[] = ['MAINNET', 'TESTNET', 'DEVNET']
  const results: ConnectionTestResult[] = []
  
  for (const network of networks) {
    const result = await testXRPLConnection(network)
    results.push(result)
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Disconnect all after testing
  await xrplClientManager.disconnectAll()
  
  return results
}

/**
 * Get account info from XRPL (test query)
 */
export async function testGetAccountInfo(
  address: string,
  network: XRPLNetwork = 'TESTNET'
): Promise<{
  success: boolean
  balance?: string
  sequence?: number
  error?: string
}> {
  try {
    const client = await xrplClientManager.getClient(network)
    
    const accountInfo = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    })
    
    return {
      success: true,
      balance: accountInfo.result.account_data.Balance,
      sequence: accountInfo.result.account_data.Sequence
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
