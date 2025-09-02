export * as Primary from './primary';
export * as Alternative from './alternative';

// Fiat-Backed Stablecoins
// 
// Stablecoins backed by traditional fiat currencies, primarily USD.
// These tokens maintain their value through full or fractional reserves
// of fiat currency held by the issuing entity.
//
// Categories:
// - Primary: ERC-20 based implementations for general use
// - Alternative: ERC-1400 based implementations for regulatory compliance
//
// Key Characteristics:
// - 1:1 peg to underlying fiat currency
// - Regular third-party audits of reserves
// - Instant redemption capabilities
// - Regulatory compliance frameworks
// - Low volatility (intended)
//
// Risk Factors:
// - Custodial risk (reserves held by issuer)
// - Regulatory risk (changes in legislation)
// - Counterparty risk (issuer insolvency)
// - Banking risk (reserve account restrictions)
//
// Market Examples:
// - USDT (Tether) - $157.6B market cap
// - USDC (USD Coin) - $58B+ market cap
// - BUSD (Binance USD) - Discontinued 2024
// - PYUSD (PayPal USD) - Growing adoption
