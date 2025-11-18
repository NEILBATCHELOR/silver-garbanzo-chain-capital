// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Factories Module Index
 * @notice Central reference point for all factory contracts and libraries
 * @dev This file documents the factory infrastructure for reference.
 *      Import specific contracts directly from their source files.
 * 
 * Available Infrastructure:
 * - FactoryBase: Abstract base for all factories
 * - FactoryRegistry: Central factory tracking and discovery
 * - ValidationLibrary: Shared validation logic
 * - DeploymentHelpers: Deployment utility functions (if created)
 * 
 * Available Factories (Phase 2-4 Complete):
 * - ERC20Factory: Factory for ERC20 tokens (standard & rebasing)
 * - ERC721Factory: Factory for ERC721 NFT collections
 * - ERC1155Factory: Factory for ERC1155 multi-token collections
 * - ERC4626Factory: Factory for ERC4626 vault contracts
 * - ERC3525Factory: Factory for ERC3525 semi-fungible tokens
 * - ERC1400Factory: Factory for ERC1400 security tokens
 * 
 * Architecture Benefits:
 * - Each factory < 24KB (deployable to any EVM chain)
 * - Modular design (upgrade one factory without affecting others)
 * - Focused contracts (200-300 lines each, auditable)
 * - Gas efficient (70-95% savings via minimal proxy pattern)
 * - Industry standard pattern (matches Uniswap, OpenZeppelin, AAVE)
 * 
 * Usage Examples:
 * import "../factories/FactoryBase.sol";
 * import "../factories/FactoryRegistry.sol";
 * import "../factories/ERC20Factory.sol";
 * import "../factories/ERC721Factory.sol";
 * import "../factories/ERC1155Factory.sol";
 * import "../factories/ERC4626Factory.sol";
 * import "../factories/ERC3525Factory.sol";
 * import "../factories/ERC1400Factory.sol";
 * import "../factories/libraries/ValidationLibrary.sol";
 * 
 * Deployment Priority:
 * 1. Infrastructure: FactoryBase, ValidationLibrary, FactoryRegistry
 * 2. Core Factories: ERC20Factory, ERC721Factory
 * 3. Advanced Factories: ERC1155Factory, ERC4626Factory
 * 4. Specialized Factories: ERC3525Factory, ERC1400Factory
 */
