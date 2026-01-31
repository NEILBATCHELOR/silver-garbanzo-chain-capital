/**
 * XLS-89 MPT Metadata Examples
 * 
 * Real-world examples of properly formatted MPT metadata
 * following the XLS-89 standard
 */

import { MPTMetadataExpanded, MPTMetadataCompressed } from '@/types/xrpl/mpt-metadata';

// ============================================================================
// EXAMPLE 1: Treasury-Backed Stablecoin
// ============================================================================

export const treasuryBillTokenExpanded: MPTMetadataExpanded = {
  ticker: 'TBILL',
  name: 'T-Bill Yield Token',
  desc: 'A yield-bearing stablecoin backed by short-term U.S. Treasuries and money market instruments.',
  icon: 'example.org/tbill-icon.png',
  asset_class: 'rwa',
  asset_subclass: 'treasury',
  issuer_name: 'Example Yield Co.',
  uris: [
    {
      uri: 'exampleyield.co/tbill',
      category: 'website',
      title: 'Product Page'
    },
    {
      uri: 'exampleyield.co/docs',
      category: 'docs',
      title: 'Yield Token Docs'
    }
  ],
  additional_info: {
    interest_rate: '5.00%',
    interest_type: 'variable',
    yield_source: 'U.S. Treasury Bills',
    maturity_date: '2045-06-30',
    cusip: '912796RX0'
  }
};

export const treasuryBillTokenCompressed: MPTMetadataCompressed = {
  t: 'TBILL',
  n: 'T-Bill Yield Token',
  d: 'A yield-bearing stablecoin backed by short-term U.S. Treasuries and money market instruments.',
  i: 'example.org/tbill-icon.png',
  ac: 'rwa',
  as: 'treasury',
  in: 'Example Yield Co.',
  us: [
    {
      u: 'exampleyield.co/tbill',
      c: 'website',
      t: 'Product Page'
    },
    {
      u: 'exampleyield.co/docs',
      c: 'docs',
      t: 'Yield Token Docs'
    }
  ],
  ai: {
    interest_rate: '5.00%',
    interest_type: 'variable',
    yield_source: 'U.S. Treasury Bills',
    maturity_date: '2045-06-30',
    cusip: '912796RX0'
  }
};

// ============================================================================
// EXAMPLE 2: USD Stablecoin
// ============================================================================

export const usdStablecoinExpanded: MPTMetadataExpanded = {
  ticker: 'RLUSD',
  name: 'Ripple USD',
  desc: 'Enterprise-grade USD stablecoin backed 1:1 by USD reserves.',
  icon: 'ripple.com/rlusd-icon.png',
  asset_class: 'rwa',
  asset_subclass: 'stablecoin',
  issuer_name: 'Ripple Labs Inc.',
  uris: [
    {
      uri: 'ripple.com/rlusd',
      category: 'website',
      title: 'RLUSD Official Page'
    },
    {
      uri: 'twitter.com/ripple',
      category: 'social',
      title: 'Twitter'
    }
  ],
  additional_info: {
    peg: 'USD',
    backing: '1:1 USD reserves',
    audit_frequency: 'monthly',
    regulatory_status: 'NYDFS approved'
  }
};

// ============================================================================
// EXAMPLE 3: DeFi Governance Token
// ============================================================================

export const defiGovernanceTokenExpanded: MPTMetadataExpanded = {
  ticker: 'GOVXRP',
  name: 'XRPL Governance Token',
  desc: 'Governance token for XRPL DeFi protocols.',
  icon: 'xrpldefi.org/gov-icon.png',
  asset_class: 'defi',
  issuer_name: 'XRPL DeFi DAO',
  uris: [
    {
      uri: 'xrpldefi.org',
      category: 'website',
      title: 'Official Website'
    },
    {
      uri: 'docs.xrpldefi.org',
      category: 'docs',
      title: 'Documentation'
    }
  ],
  additional_info: {
    total_supply: '1000000000',
    voting_power: 'proportional',
    min_stake: '100'
  }
};

// ============================================================================
// EXAMPLE 4: Gaming Token
// ============================================================================

export const gamingTokenExpanded: MPTMetadataExpanded = {
  ticker: 'PIXEL',
  name: 'PixelVerse Coin',
  desc: 'In-game currency for the PixelVerse metaverse.',
  icon: 'pixelverse.game/coin-icon.png',
  asset_class: 'gaming',
  issuer_name: 'PixelVerse Studios',
  uris: [
    {
      uri: 'pixelverse.game',
      category: 'website',
      title: 'Play PixelVerse'
    },
    {
      uri: 'discord.gg/pixelverse',
      category: 'social',
      title: 'Discord Community'
    }
  ],
  additional_info: {
    game_type: 'MMORPG',
    platform: 'cross-platform',
    earn_mechanism: 'play-to-earn'
  }
};

// ============================================================================
// EXAMPLE 5: Real Estate Token
// ============================================================================

export const realEstateTokenExpanded: MPTMetadataExpanded = {
  ticker: 'PROP1',
  name: 'Luxury Villa Share',
  desc: 'Fractional ownership of premium beachfront property.',
  icon: 'realestatexrpl.com/prop1-icon.png',
  asset_class: 'rwa',
  asset_subclass: 'real_estate',
  issuer_name: 'PropChain LLC',
  uris: [
    {
      uri: 'realestatexrpl.com/properties/villa-1',
      category: 'website',
      title: 'Property Details'
    },
    {
      uri: 'realestatexrpl.com/docs',
      category: 'docs',
      title: 'Legal Documentation'
    }
  ],
  additional_info: {
    property_address: '123 Beach Road, Miami, FL',
    property_value: '$5,000,000',
    total_shares: '10000',
    annual_yield: '6.5%',
    property_type: 'residential'
  }
};
