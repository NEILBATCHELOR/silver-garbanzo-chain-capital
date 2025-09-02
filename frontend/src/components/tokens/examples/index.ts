/**
 * Token Examples Index
 * 
 * This directory contains comprehensive real-world examples of tokenized assets
 * across different asset classes, following the token standards specified in
 * the Token Use.md document.
 * 
 * Structure:
 * - traditional-assets/
 *   - structured-products/
 *   - equity/
 *   - commodities/
 *   - funds-etfs-etps/
 *   - bonds/
 *   - quantitative-strategies/
 * 
 * - alternative-assets/
 *   - private-equity/
 *   - private-debt/
 *   - real-estate/
 *   - energy/
 *   - infrastructure/
 *   - collectibles-other/
 *   - asset-backed-receivables/
 *   - solar-wind-climate/
 *   - carbon-credits/
 * 
 * - digital-assets/
 *   - tokenised-fund/
 *   - stablecoins/
 * 
 * Each asset class contains:
 * - primary/ folder with the primary token standard approach
 * - alternative/ folder with the alternative token standard approach
 * - Both approaches include ERC-20 liquidity tokens for enhanced DeFi integration
 */

// Alternative Assets Examples (to be added)
// export * as PrivateEquity from './alternative-assets/private-equity';
// export * as PrivateDebt from './alternative-assets/private-debt';
// export * as RealEstate from './alternative-assets/real-estate';

// Digital Assets Examples
export * as Stablecoins from './stablecoins';
// export * as DigitalTokenisedFund from './digital-assets/tokenised-fund';

/**
 * Token Standard Mapping based on Token Use.md:
 * 
 * Traditional Assets:
 * - Structured Products: ERC-1400 → ERC-20 | ERC-1400 + ERC-3525 → ERC-20
 * - Equity: ERC-1400 → ERC-20 | ERC-1400 + ERC-3525 → ERC-20  
 * - Commodities: ERC-1155 → ERC-20 | ERC-20 directly
 * - Funds/ETFs/ETPs: ERC-1400 + ERC-4626 → ERC-20 | ERC-4626 → ERC-20
 * - Bonds: ERC-1400 → ERC-20 | ERC-1400 + ERC-3525 → ERC-20
 * - Quantitative Strategies: ERC-1400 + ERC-4626 → ERC-20 | ERC-4626 → ERC-20
 * 
 * Alternative Assets:
 * - Private Equity: ERC-1400 → ERC-20 | ERC-1400 + ERC-3525 → ERC-20
 * - Private Debt: ERC-1400 → ERC-20 | ERC-1400 + ERC-3525 → ERC-20
 * - Real Estate: ERC-1400 + ERC-3525 → ERC-20 | ERC-1400 → ERC-20
 * - Energy: ERC-1400 + ERC-1155 → ERC-20 | ERC-1400 → ERC-20
 * - Infrastructure: ERC-1400 + ERC-3525 → ERC-20 | ERC-1400 → ERC-20
 * - Collectibles & Other: ERC-721 / ERC-1155 → ERC-20 | ERC-721 → ERC-20
 * 
 * Digital Assets:
 * - Digital Tokenised Fund: ERC-1400 + ERC-4626 → ERC-20 | ERC-4626 → ERC-20
 * - Stablecoins:
 *   - Fiat-Backed: ERC-20 | ERC-1400 → ERC-20
 *   - Crypto-Backed: ERC-1400 → ERC-20 | ERC-4626 → ERC-20
 *   - Commodity-Backed: ERC-1400 → ERC-20 | ERC-3525 → ERC-20
 *   - Algorithmic: ERC-20 (rebasing) | ERC-4626 → ERC-20
 */
