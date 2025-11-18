// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ExtensionBase.sol";
import "./ExtensionRegistry.sol";
import "../extensions/erc4626/ERC4626YieldStrategyModule.sol";
import "../extensions/erc4626/ERC4626WithdrawalQueueModule.sol";
import "../extensions/erc4626/ERC4626FeeStrategyModule.sol";
import "../extensions/erc4626/async/ERC7540AsyncVaultModule.sol";
import "../extensions/erc4626/native/ERC7535NativeVaultModule.sol";
import "../extensions/erc4626/router/ERC4626Router.sol";
import "../extensions/multi-asset-vault/ERC7575MultiAssetVaultModule.sol";

/**
 * @title ERC4626ExtensionFactory
 * @notice Factory for deploying ERC4626-specific vault extension modules
 * @dev Handles 7 ERC4626 vault extension types with beacon-based upgradeability
 * 
 * Supported Extensions:
 * 1. YIELD_STRATEGY        - Yield generation strategies
 * 2. WITHDRAWAL_QUEUE      - Ordered withdrawal management
 * 3. FEE_STRATEGY          - Vault fee structures
 * 4. ASYNC_VAULT           - EIP-7540 async deposits/withdrawals
 * 5. NATIVE_VAULT          - EIP-7535 native token wrapping
 * 6. ROUTER                - Vault routing functionality
 * 7. MULTI_ASSET_VAULT     - EIP-7575 multi-asset support
 * 
 * Architecture:
 * - One beacon per extension type (7 beacons total)
 * - Beacons enable upgradeability of extension logic
 * - All deployments go through ExtensionRegistry
 * - Policy validation via PolicyEngine
 * - Upgrade governance via UpgradeGovernor
 */
contract ERC4626ExtensionFactory is ExtensionBase {
    
    // ============ Beacons ============
    
    address public yieldStrategyBeacon;
    address public withdrawalQueueBeacon;
    address public feeStrategyBeacon;
    address public asyncVaultBeacon;
    address public nativeVaultBeacon;
    address public routerBeacon;
    address public multiAssetVaultBeacon;
    
    // ============ Events ============
    
    event YieldStrategyExtensionDeployed(address indexed vault, address indexed extension, address indexed deployer);
    event WithdrawalQueueExtensionDeployed(address indexed vault, address indexed extension, address indexed deployer);
    event FeeStrategyExtensionDeployed(address indexed vault, address indexed extension, address indexed deployer);
    event AsyncVaultExtensionDeployed(address indexed vault, address indexed extension, address indexed deployer);
    event NativeVaultExtensionDeployed(address indexed vault, address indexed extension, address indexed deployer);
    event RouterExtensionDeployed(address indexed vault, address indexed extension, address indexed deployer);
    event MultiAssetVaultExtensionDeployed(address indexed vault, address indexed extension, address indexed deployer);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize ERC4626 extension factory
     * @param _extensionRegistry ExtensionRegistry address
     * @param _policyEngine PolicyEngine address (address(0) to disable)
     * @param _upgradeGovernor UpgradeGovernor address (address(0) to disable)
     */
    constructor(
        address _extensionRegistry,
        address _policyEngine,
        address _upgradeGovernor
    ) ExtensionBase(_extensionRegistry, _policyEngine, _upgradeGovernor) {}
    
    // ============ Beacon Initialization ============
    
    /**
     * @notice Initialize all beacons with master implementations
     * @param yieldStrategyImpl YieldStrategy module implementation
     * @param withdrawalQueueImpl WithdrawalQueue module implementation
     * @param feeStrategyImpl FeeStrategy module implementation
     * @param asyncVaultImpl AsyncVault module implementation
     * @param nativeVaultImpl NativeVault module implementation
     * @param routerImpl Router module implementation
     * @param multiAssetVaultImpl MultiAssetVault module implementation
     */
    function initializeBeacons(
        address yieldStrategyImpl,
        address withdrawalQueueImpl,
        address feeStrategyImpl,
        address asyncVaultImpl,
        address nativeVaultImpl,
        address routerImpl,
        address multiAssetVaultImpl
    ) external onlyOwner {
        require(yieldStrategyBeacon == address(0), "Already initialized");
        
        yieldStrategyBeacon = _createBeacon(yieldStrategyImpl, ExtensionRegistry.ExtensionType.YIELD_STRATEGY);
        withdrawalQueueBeacon = _createBeacon(withdrawalQueueImpl, ExtensionRegistry.ExtensionType.WITHDRAWAL_QUEUE);
        feeStrategyBeacon = _createBeacon(feeStrategyImpl, ExtensionRegistry.ExtensionType.FEE_STRATEGY);
        asyncVaultBeacon = _createBeacon(asyncVaultImpl, ExtensionRegistry.ExtensionType.ASYNC_VAULT);
        nativeVaultBeacon = _createBeacon(nativeVaultImpl, ExtensionRegistry.ExtensionType.NATIVE_VAULT);
        routerBeacon = _createBeacon(routerImpl, ExtensionRegistry.ExtensionType.VAULT_ROUTER);
        multiAssetVaultBeacon = _createBeacon(multiAssetVaultImpl, ExtensionRegistry.ExtensionType.MULTI_ASSET_VAULT);
    }
    
    // ============ Extension Deployment Functions ============
    
    /**
     * @notice Deploy YieldStrategy extension for vault yield generation
     * @param vault Vault address to attach extension to
     * @param strategyType Type of yield strategy
     * @param strategyParams Strategy-specific parameters
     * @return extension Deployed extension address
     */
    function deployYieldStrategy(
        address vault,
        uint8 strategyType,
        bytes memory strategyParams
    ) external returns (address extension) {
        if (vault == address(0)) revert InvalidToken();
        require(yieldStrategyBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC4626YieldStrategyModule.initialize.selector,
            msg.sender,  // admin
            vault,
            strategyType,
            strategyParams
        );
        
        // Deploy via beacon
        extension = _deployExtension(yieldStrategyBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            vault,
            ExtensionRegistry.ExtensionType.YIELD_STRATEGY,
            ExtensionRegistry.TokenStandard.ERC4626,
            "DEPLOY_EXTENSION"
        );
        
        emit YieldStrategyExtensionDeployed(vault, extension, msg.sender);
        emit ExtensionDeployed(extension, vault, ExtensionRegistry.ExtensionType.YIELD_STRATEGY, msg.sender, yieldStrategyBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy WithdrawalQueue extension for ordered withdrawal management
     * @param vault Vault address to attach extension to
     * @return extension Deployed extension address
     */
    function deployWithdrawalQueue(
        address vault
    ) external returns (address extension) {
        if (vault == address(0)) revert InvalidToken();
        require(withdrawalQueueBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC4626WithdrawalQueueModule.initialize.selector,
            msg.sender,  // admin
            vault
        );
        
        // Deploy via beacon
        extension = _deployExtension(withdrawalQueueBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            vault,
            ExtensionRegistry.ExtensionType.WITHDRAWAL_QUEUE,
            ExtensionRegistry.TokenStandard.ERC4626,
            "DEPLOY_EXTENSION"
        );
        
        emit WithdrawalQueueExtensionDeployed(vault, extension, msg.sender);
        emit ExtensionDeployed(extension, vault, ExtensionRegistry.ExtensionType.WITHDRAWAL_QUEUE, msg.sender, withdrawalQueueBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy FeeStrategy extension for vault fee management
     * @param vault Vault address to attach extension to
     * @param depositFee Deposit fee (in basis points)
     * @param withdrawalFee Withdrawal fee (in basis points)
     * @param performanceFee Performance fee (in basis points)
     * @param feeRecipient Address to receive fees
     * @return extension Deployed extension address
     */
    function deployFeeStrategy(
        address vault,
        uint256 depositFee,
        uint256 withdrawalFee,
        uint256 performanceFee,
        address feeRecipient
    ) external returns (address extension) {
        if (vault == address(0)) revert InvalidToken();
        require(feeStrategyBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC4626FeeStrategyModule.initialize.selector,
            msg.sender,  // admin
            vault,
            depositFee,
            withdrawalFee,
            performanceFee,
            feeRecipient
        );
        
        // Deploy via beacon
        extension = _deployExtension(feeStrategyBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            vault,
            ExtensionRegistry.ExtensionType.FEE_STRATEGY,
            ExtensionRegistry.TokenStandard.ERC4626,
            "DEPLOY_EXTENSION"
        );
        
        emit FeeStrategyExtensionDeployed(vault, extension, msg.sender);
        emit ExtensionDeployed(extension, vault, ExtensionRegistry.ExtensionType.FEE_STRATEGY, msg.sender, feeStrategyBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy AsyncVault extension for EIP-7540 async deposits/withdrawals
     * @param vault Vault address to attach extension to
     * @return extension Deployed extension address
     */
    function deployAsyncVault(
        address vault
    ) external returns (address extension) {
        if (vault == address(0)) revert InvalidToken();
        require(asyncVaultBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC7540AsyncVaultModule.initialize.selector,
            msg.sender,  // admin
            vault
        );
        
        // Deploy via beacon
        extension = _deployExtension(asyncVaultBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            vault,
            ExtensionRegistry.ExtensionType.ASYNC_VAULT,
            ExtensionRegistry.TokenStandard.ERC4626,
            "DEPLOY_EXTENSION"
        );
        
        emit AsyncVaultExtensionDeployed(vault, extension, msg.sender);
        emit ExtensionDeployed(extension, vault, ExtensionRegistry.ExtensionType.ASYNC_VAULT, msg.sender, asyncVaultBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy NativeVault extension for EIP-7535 native token wrapping
     * @param vault Vault address to attach extension to
     * @return extension Deployed extension address
     */
    function deployNativeVault(
        address vault
    ) external returns (address extension) {
        if (vault == address(0)) revert InvalidToken();
        require(nativeVaultBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC7535NativeVaultModule.initialize.selector,
            msg.sender,  // admin
            vault
        );
        
        // Deploy via beacon
        extension = _deployExtension(nativeVaultBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            vault,
            ExtensionRegistry.ExtensionType.NATIVE_VAULT,
            ExtensionRegistry.TokenStandard.ERC4626,
            "DEPLOY_EXTENSION"
        );
        
        emit NativeVaultExtensionDeployed(vault, extension, msg.sender);
        emit ExtensionDeployed(extension, vault, ExtensionRegistry.ExtensionType.NATIVE_VAULT, msg.sender, nativeVaultBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Router extension for vault routing functionality
     * @param vault Vault address to attach extension to
     * @return extension Deployed extension address
     */
    function deployRouter(
        address vault
    ) external returns (address extension) {
        if (vault == address(0)) revert InvalidToken();
        require(routerBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC4626Router.initialize.selector,
            msg.sender,  // admin
            vault
        );
        
        // Deploy via beacon
        extension = _deployExtension(routerBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            vault,
            ExtensionRegistry.ExtensionType.VAULT_ROUTER,
            ExtensionRegistry.TokenStandard.ERC4626,
            "DEPLOY_EXTENSION"
        );
        
        emit RouterExtensionDeployed(vault, extension, msg.sender);
        emit ExtensionDeployed(extension, vault, ExtensionRegistry.ExtensionType.VAULT_ROUTER, msg.sender, routerBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy MultiAssetVault extension for EIP-7575 multi-asset support
     * @param vault Vault address to attach extension to
     * @param supportedAssets Array of supported asset addresses
     * @return extension Deployed extension address
     */
    function deployMultiAssetVault(
        address vault,
        address[] memory supportedAssets
    ) external returns (address extension) {
        if (vault == address(0)) revert InvalidToken();
        require(multiAssetVaultBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC7575MultiAssetVaultModule.initialize.selector,
            msg.sender,  // admin
            vault,
            supportedAssets
        );
        
        // Deploy via beacon
        extension = _deployExtension(multiAssetVaultBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            vault,
            ExtensionRegistry.ExtensionType.MULTI_ASSET_VAULT,
            ExtensionRegistry.TokenStandard.ERC4626,
            "DEPLOY_EXTENSION"
        );
        
        emit MultiAssetVaultExtensionDeployed(vault, extension, msg.sender);
        emit ExtensionDeployed(extension, vault, ExtensionRegistry.ExtensionType.MULTI_ASSET_VAULT, msg.sender, multiAssetVaultBeacon);
        
        return extension;
    }
    
    // ============ Abstract Function Implementations ============
    
    /**
     * @notice Get the token standard this factory supports
     * @return ERC4626 vault standard
     */
    function getTokenStandard()
        external
        pure
        override
        returns (ExtensionRegistry.TokenStandard)
    {
        return ExtensionRegistry.TokenStandard.ERC4626;
    }
    
    /**
     * @notice Get all supported extension types
     * @return Array of 7 ERC4626 extension types
     */
    function getSupportedExtensions()
        external
        pure
        override
        returns (ExtensionRegistry.ExtensionType[] memory)
    {
        ExtensionRegistry.ExtensionType[] memory extensions = new ExtensionRegistry.ExtensionType[](7);
        extensions[0] = ExtensionRegistry.ExtensionType.YIELD_STRATEGY;
        extensions[1] = ExtensionRegistry.ExtensionType.WITHDRAWAL_QUEUE;
        extensions[2] = ExtensionRegistry.ExtensionType.FEE_STRATEGY;
        extensions[3] = ExtensionRegistry.ExtensionType.ASYNC_VAULT;
        extensions[4] = ExtensionRegistry.ExtensionType.NATIVE_VAULT;
        extensions[5] = ExtensionRegistry.ExtensionType.VAULT_ROUTER;
        extensions[6] = ExtensionRegistry.ExtensionType.MULTI_ASSET_VAULT;
        return extensions;
    }
    
    // ============ Beacon Upgrade Functions ============
    
    /**
     * @notice Upgrade a specific beacon implementation
     * @param extensionType Type of extension to upgrade
     * @param newImplementation New implementation address
     */
    function upgradeBeacon(
        ExtensionRegistry.ExtensionType extensionType,
        address newImplementation
    ) external onlyOwner {
        address beacon;
        
        if (extensionType == ExtensionRegistry.ExtensionType.YIELD_STRATEGY) {
            beacon = yieldStrategyBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.WITHDRAWAL_QUEUE) {
            beacon = withdrawalQueueBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.FEE_STRATEGY) {
            beacon = feeStrategyBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.ASYNC_VAULT) {
            beacon = asyncVaultBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.NATIVE_VAULT) {
            beacon = nativeVaultBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.VAULT_ROUTER) {
            beacon = routerBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.MULTI_ASSET_VAULT) {
            beacon = multiAssetVaultBeacon;
        } else {
            revert IncompatibleExtension();
        }
        
        _directBeaconUpgrade(beacon, newImplementation);
    }
}
