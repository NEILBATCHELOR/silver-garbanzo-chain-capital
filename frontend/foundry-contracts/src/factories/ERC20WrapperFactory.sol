// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./FactoryBase.sol";
import "./libraries/ValidationLibrary.sol";
import "../masters/ERC20WrapperMaster.sol";
import "../deployers/beacon/TokenBeacon.sol";

/**
 * @title ERC20WrapperFactory
 * @notice Factory for deploying ERC20 wrapper tokens
 * @dev Wraps existing ERC20 tokens to add additional functionality
 *
 * Use Cases:
 * - Adding pausable functionality to existing tokens
 * - Creating yield-bearing wrapped versions
 * - Cross-chain bridge wrappers
 * - DeFi protocol integration wrappers
 *
 * Gas Savings: 70-95% compared to full deployment
 */
contract ERC20WrapperFactory is FactoryBase {
    using Clones for address;

    // ============ Immutable Configuration ============

    /// @notice Master implementation for wrapper tokens
    address public immutable wrapperMaster;

    /// @notice Beacon for upgradeable wrapper tokens
    address public immutable wrapperBeacon;

    // ============ Events ============

    event WrapperDeployed(
        address indexed wrapper,
        address indexed underlyingToken,
        address indexed owner,
        string name,
        string symbol
    );

    event WrapperBeaconDeployed(
        address indexed wrapper,
        address indexed underlyingToken,
        address indexed beacon,
        string name,
        string symbol
    );

    // ============ Constructor ============

    /**
     * @notice Initialize the wrapper factory
     * @param _wrapperMaster Master implementation for wrappers
     * @param _wrapperBeacon Beacon for upgradeable wrappers
     * @param _policyEngine PolicyEngine address (address(0) = disabled)
     * @param _tokenRegistry TokenRegistry address (address(0) = disabled)
     * @param _factoryRegistry FactoryRegistry address (address(0) = disabled)
     */
    constructor(
        address _wrapperMaster,
        address _wrapperBeacon,
        address _policyEngine,
        address _tokenRegistry,
        address _factoryRegistry
    ) FactoryBase(_policyEngine, _tokenRegistry, _factoryRegistry) {
        if (_wrapperMaster == address(0)) revert InvalidMaster();

        wrapperMaster = _wrapperMaster;
        wrapperBeacon = _wrapperBeacon;
    }

    // ============ Wrapper Deployment ============

    /**
     * @notice Deploy an ERC20 wrapper token
     * @param underlyingToken Address of token to wrap
     * @param name Wrapper token name (e.g., "Wrapped USDC")
     * @param symbol Wrapper token symbol (e.g., "wUSDC")
     * @param owner Wrapper token owner
     * @return wrapper Deployed wrapper address
     */
    function deployWrapper(
        address underlyingToken,
        string memory name,
        string memory symbol,
        address owner
    ) external returns (address wrapper) {
        // Validate parameters
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        require(underlyingToken != address(0), "Invalid underlying token");
        require(underlyingToken.code.length > 0, "Underlying token must be contract");

        // Clone and initialize
        wrapper = wrapperMaster.clone();
        ERC20WrapperMaster(wrapper).initialize(underlyingToken, name, symbol, owner);

        // Register and validate
        _validateAndRegister(
            wrapper,
            wrapperMaster,
            owner,
            "ERC20Wrapper",
            name,
            symbol,
            "DEPLOY_ERC20_WRAPPER",
            0
        );

        emit WrapperDeployed(wrapper, underlyingToken, owner, name, symbol);
    }

    /**
     * @notice Deploy wrapper with deterministic address (CREATE2)
     * @param salt Salt for deterministic deployment
     * @param underlyingToken Address of token to wrap
     * @param name Wrapper token name
     * @param symbol Wrapper token symbol
     * @param owner Wrapper token owner
     * @return wrapper Deployed wrapper address
     */
    function deployWrapperDeterministic(
        bytes32 salt,
        address underlyingToken,
        string memory name,
        string memory symbol,
        address owner
    ) external returns (address wrapper) {
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        require(underlyingToken != address(0), "Invalid underlying token");
        require(underlyingToken.code.length > 0, "Underlying token must be contract");

        wrapper = wrapperMaster.cloneDeterministic(salt);
        ERC20WrapperMaster(wrapper).initialize(underlyingToken, name, symbol, owner);

        _validateAndRegister(
            wrapper,
            wrapperMaster,
            owner,
            "ERC20Wrapper",
            name,
            symbol,
            "DEPLOY_ERC20_WRAPPER",
            0
        );

        emit WrapperDeployed(wrapper, underlyingToken, owner, name, symbol);
    }

    // ============ Beacon-Based Deployment ============

    /**
     * @notice Deploy upgradeable wrapper via beacon proxy
     * @param underlyingToken Address of token to wrap
     * @param name Wrapper token name
     * @param symbol Wrapper token symbol
     * @param owner Wrapper token owner
     * @return wrapper Deployed wrapper address
     */
    function deployWrapperBeacon(
        address underlyingToken,
        string memory name,
        string memory symbol,
        address owner
    ) external returns (address wrapper) {
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        require(underlyingToken != address(0), "Invalid underlying token");
        require(wrapperBeacon != address(0), "Beacon not set");

        bytes memory initData = abi.encodeCall(
            ERC20WrapperMaster.initialize,
            (underlyingToken, name, symbol, owner)
        );

        BeaconProxy proxy = new BeaconProxy(wrapperBeacon, initData);
        wrapper = address(proxy);

        _validateAndRegister(
            wrapper,
            wrapperMaster,
            owner,
            "ERC20Wrapper",
            name,
            symbol,
            "DEPLOY_ERC20_WRAPPER_BEACON",
            0
        );

        emit WrapperBeaconDeployed(wrapper, underlyingToken, wrapperBeacon, name, symbol);
    }

    // ============ View Functions ============

    /**
     * @notice Predict wrapper address for CREATE2 deployment
     * @param salt Salt value
     * @return predicted Predicted address
     */
    function predictWrapperAddress(bytes32 salt) external view returns (address predicted) {
        return wrapperMaster.predictDeterministicAddress(salt);
    }
}
