/**
 * Balance Formatting Utilities
 * 
 * Provides consistent formatting for cryptocurrency balances and USD values
 */

export class BalanceFormatter {
  /**
   * Format balance with appropriate precision
   * Shows exact values for smaller amounts, uses K/M notation for larger amounts
   */
  static formatBalance(balance: string | number, symbol: string, options?: {
    showFullPrecision?: boolean;
    maxDecimals?: number;
    useAbbreviation?: boolean;
  }): string {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    const opts = {
      showFullPrecision: false,
      maxDecimals: 4,
      useAbbreviation: true,
      ...options
    };
    
    // Handle zero
    if (num === 0 || isNaN(num)) {
      return `0 ${symbol}`;
    }
    
    // Very small amounts
    if (num < 0.000001) {
      return `<0.000001 ${symbol}`;
    }
    
    // Small amounts - show precision
    if (num < 0.01) {
      return `${num.toFixed(6)} ${symbol}`;
    }
    
    // Medium amounts - reduce precision
    if (num < 1) {
      return `${num.toFixed(opts.maxDecimals)} ${symbol}`;
    }
    
    // Larger amounts - show exact or abbreviated based on preference
    if (num < 1000 || opts.showFullPrecision) {
      // Show exact amount with commas for readability
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      }).format(num);
      return `${formatted} ${symbol}`;
    }
    
    // Use abbreviations for very large amounts if enabled
    if (opts.useAbbreviation) {
      if (num < 1000000) {
        // Show as K with 2 decimals for precision
        const kValue = num / 1000;
        return `${kValue.toFixed(2)}K ${symbol}`;
      }
      
      if (num < 1000000000) {
        // Show as M with 2 decimals
        const mValue = num / 1000000;
        return `${mValue.toFixed(2)}M ${symbol}`;
      }
      
      // Show as B for billions
      const bValue = num / 1000000000;
      return `${bValue.toFixed(2)}B ${symbol}`;
    }
    
    // Full precision with commas
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: opts.maxDecimals
    }).format(num);
    return `${formatted} ${symbol}`;
  }

  /**
   * Format USD value with proper currency formatting
   */
  static formatUsdValue(value: number, options?: {
    showCents?: boolean;
    useAbbreviation?: boolean;
    showPlusSign?: boolean;
  }): string {
    const opts = {
      showCents: true,
      useAbbreviation: true,
      showPlusSign: false,
      ...options
    };
    
    // Handle negative values
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    
    // Handle zero and very small values
    if (absValue < 0.01) {
      return opts.showCents ? '$0.00' : '$0';
    }
    
    // Small values - show with cents
    if (absValue < 1) {
      const formatted = absValue.toFixed(3);
      return `${isNegative ? '-' : opts.showPlusSign ? '+' : ''}$${formatted}`;
    }
    
    // Medium values - show exact amount
    if (absValue < 10000 || !opts.useAbbreviation) {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: opts.showCents ? 2 : 0,
        maximumFractionDigits: opts.showCents ? 2 : 0
      });
      const formatted = formatter.format(absValue);
      return `${isNegative ? '-' : opts.showPlusSign ? '+' : ''}${formatted}`;
    }
    
    // Large values with abbreviation
    let abbreviated: string;
    if (absValue < 1000000) {
      // Thousands
      const kValue = absValue / 1000;
      abbreviated = `$${kValue.toFixed(1)}K`;
    } else if (absValue < 1000000000) {
      // Millions
      const mValue = absValue / 1000000;
      abbreviated = `$${mValue.toFixed(2)}M`;
    } else {
      // Billions
      const bValue = absValue / 1000000000;
      abbreviated = `$${bValue.toFixed(2)}B`;
    }
    
    return `${isNegative ? '-' : opts.showPlusSign ? '+' : ''}${abbreviated}`;
  }

  /**
   * Format percentage change
   */
  static formatPercentageChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  /**
   * Format network name for display
   */
  static formatNetworkName(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': 'Ethereum',
      'eth': 'Ethereum',
      'sepolia': 'Sepolia',
      'holesky': 'Holesky',
      'polygon': 'Polygon',
      'matic': 'Polygon',
      'amoy': 'Amoy',
      'optimism': 'Optimism',
      'optimism-sepolia': 'OP Sepolia',
      'arbitrum': 'Arbitrum',
      'arbitrum-sepolia': 'Arb Sepolia',
      'base': 'Base',
      'base-sepolia': 'Base Sepolia',
      'bsc': 'BNB Chain',
      'bnb': 'BNB Chain',
      'avalanche': 'Avalanche',
      'avax': 'Avalanche',
      'avalanche testnet': 'Fuji',
      'avalanche-testnet': 'Fuji',
      'fuji': 'Fuji',
      'bitcoin': 'Bitcoin',
      'btc': 'Bitcoin',
      'bitcoin-testnet': 'BTC Testnet',
      'solana': 'Solana',
      'sol': 'Solana',
      'solana-devnet': 'Sol Devnet',
      'aptos': 'Aptos',
      'apt': 'Aptos',
      'aptos-testnet': 'Apt Testnet',
      'sui': 'Sui',
      'sui-testnet': 'Sui Testnet',
      'near': 'NEAR',
      'near-testnet': 'NEAR Testnet',
      'injective': 'Injective',
      'inj': 'Injective',
      'injective-testnet': 'INJ Testnet',
      'zksync': 'zkSync Era',
      'zksync-sepolia': 'zkSync Sepolia',
      'ripple': 'XRP Ledger',
      'xrp': 'XRP Ledger',
      'ripple-testnet': 'XRP Testnet',
      'stellar': 'Stellar',
      'xlm': 'Stellar'
    };
    
    return networkMap[network.toLowerCase()] || network;
  }

  /**
   * Get network icon/emoji
   */
  static getNetworkIcon(network: string): string {
    const iconMap: Record<string, string> = {
      'ethereum': '⟠',
      'eth': '⟠',
      'sepolia': '⟠ᵀ',
      'holesky': '⟠ᴴ',
      'polygon': '⬟',
      'matic': '⬟',
      'amoy': '⬟ᵀ',
      'optimism': '🔴',
      'optimism-sepolia': '🔴ᵀ',
      'arbitrum': '🔵',
      'arbitrum-sepolia': '🔵ᵀ',
      'base': '🔷',
      'base-sepolia': '🔷ᵀ',
      'bsc': '🟡',
      'bnb': '🟡',
      'avalanche': '🔺',
      'avax': '🔺',
      'avalanche testnet': '🔺ᵀ',
      'avalanche-testnet': '🔺ᵀ',
      'fuji': '🔺ᵀ',
      'bitcoin': '₿',
      'btc': '₿',
      'bitcoin-testnet': '₿ᵀ',
      'solana': '◎',
      'sol': '◎',
      'solana-devnet': '◎ᵀ',
      'aptos': '🅰️',
      'apt': '🅰️',
      'aptos-testnet': '🅰️ᵀ',
      'sui': '🌊',
      'sui-testnet': '🌊ᵀ',
      'near': '◇',
      'near-testnet': '◇ᵀ',
      'injective': '⚛️',
      'inj': '⚛️',
      'injective-testnet': '⚛️ᵀ',
      'zksync': '⚡',
      'zksync-sepolia': '⚡ᵀ',
      'ripple': '💧',
      'xrp': '💧',
      'ripple-testnet': '💧ᵀ',
      'stellar': '✨',
      'xlm': '✨'
    };
    
    return iconMap[network.toLowerCase()] || '🔗';
  }

  /**
   * Format time remaining until cache expiry
   */
  static formatTimeRemaining(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  /**
   * Format wallet address for display (shortened)
   */
  static formatAddress(address: string, chars: number = 6): string {
    if (!address || address.length <= chars * 2) {
      return address;
    }
    
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }

  /**
   * Format large numbers with commas
   */
  static formatWithCommas(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US').format(num);
  }
}

// Export singleton instance for convenience
export const balanceFormatter = new BalanceFormatter();
