# Blockchain Network Options Update

## Overview

This update modifies the blockchain network dropdown options in digital asset product forms to a standardized list of supported networks.

## Changes Made

The blockchain network dropdown options were updated in:

1. **DigitalTokenizedFundProductForm.tsx**
2. **StablecoinProductForm.tsx**

## Updated Blockchain Networks List

The blockchain network options were standardized to the following list:

- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base
- Avalanche
- Near
- Ripple
- Stellar
- Sui
- Aptos

## Removed Networks

The following networks were removed from the dropdown options:

- Solana
- Binance Smart Chain
- Algorand
- Tezos
- Cosmos
- Polkadot

## Rationale

This update provides a more focused and consistent list of blockchain networks across all digital asset product forms, aligning with the company's strategic focus on specific blockchain ecosystems.

## Impact

- Users creating or editing digital asset products will now see a consistent set of blockchain network options.
- The standardized list makes it easier to support and maintain integrations with these specific blockchains.
- Historical data with removed blockchain networks will still be preserved and displayed correctly in product details.

## Files Modified

1. `/frontend/src/components/products/product-forms/DigitalTokenizedFundProductForm.tsx`
2. `/frontend/src/components/products/product-forms/StablecoinProductForm.tsx`
