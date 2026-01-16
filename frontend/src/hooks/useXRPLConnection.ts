/**
 * XRPL Connection Hook
 * Provides XRPL client connection management
 */

import { useState, useEffect, useCallback } from 'react'
import { Client, Wallet } from 'xrpl'

interface XRPLConnectionOptions {
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  autoConnect?: boolean
}

interface XRPLConnectionState {
  client: Client | null
  wallet: Wallet | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
}

const NETWORK_URLS = {
  MAINNET: 'wss://xrplcluster.com',
  TESTNET: 'wss://s.altnet.rippletest.net:51233',
  DEVNET: 'wss://s.devnet.rippletest.net:51233'
}

export function useXRPLConnection(options: XRPLConnectionOptions = {}) {
  const { network = 'TESTNET', autoConnect = false } = options

  const [state, setState] = useState<XRPLConnectionState>({
    client: null,
    wallet: null,
    isConnected: false,
    isConnecting: false,
    error: null
  })

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const client = new Client(NETWORK_URLS[network])
      await client.connect()

      setState(prev => ({
        ...prev,
        client,
        isConnected: true,
        isConnecting: false
      }))

      return client
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect',
        isConnecting: false
      }))
      throw error
    }
  }, [network])

  const disconnect = useCallback(async () => {
    if (state.client) {
      await state.client.disconnect()
      setState({
        client: null,
        wallet: null,
        isConnected: false,
        isConnecting: false,
        error: null
      })
    }
  }, [state.client])

  const setWallet = useCallback((wallet: Wallet | null) => {
    setState(prev => ({ ...prev, wallet }))
  }, [])

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && !state.client && !state.isConnecting) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      if (state.client && state.isConnected) {
        state.client.disconnect().catch(console.error)
      }
    }
  }, [autoConnect])

  return {
    ...state,
    connect,
    disconnect,
    setWallet
  }
}
