// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TokenBeacon.sol";

/**
 * @title BeaconProxyFactory
 * @notice Factory for deploying beacon-based token proxies
 * @dev Combines ERC-1167 minimal proxy efficiency with beacon upgradeability
 * 
 * Architecture:
 * BeaconProxyFactory → BeaconProxy (55 bytes) → TokenBeacon → Master Implementation
 * 
 * Benefits:
 * - Minimal deployment cost (~100k gas per token)
 * - Centralized upgrades (1 tx for all tokens)
 * - Deterministic addresses via CREATE2
 * - Cross-chain deployment support
 */
contract BeaconProxyFactory is Ownable {
    // Events
    event BeaconProxyDeployed(
        address indexed proxy,
        address indexed beacon,
        address indexed deployer,
        bytes initData,
        uint256 timestamp
    );

    event BeaconProxyDeployedDeterministic(
        address indexed proxy,
        address indexed beacon,
        address indexed deployer,
        bytes32 salt,
        bytes initData,
        uint256 timestamp
    );

    // Mapping to track deployed proxies
    mapping(address => bool) public isBeaconProxy;
    address[] public allProxies;
    mapping(address => address[]) public proxiesByDeployer;
    mapping(address => address[]) public proxiesByBeacon;

    constructor(address owner_) Ownable(owner_) {
        require(owner_ != address(0), "BeaconProxyFactory: zero owner");
    }

    /**
     * @notice Deploy a new beacon proxy
     * @param beacon Address of the beacon contract
     * @param data Initialization data to call on the implementation
     * @return Address of the deployed proxy
     */
    function deployBeaconProxy(
        address beacon,
        bytes calldata data
    ) external returns (address) {
        require(beacon != address(0), "BeaconProxyFactory: zero beacon");

        // Deploy beacon proxy
        BeaconProxy proxy = new BeaconProxy(beacon, data);
        address proxyAddress = address(proxy);

        // Track deployment
        isBeaconProxy[proxyAddress] = true;
        allProxies.push(proxyAddress);
        proxiesByDeployer[msg.sender].push(proxyAddress);
        proxiesByBeacon[beacon].push(proxyAddress);

        emit BeaconProxyDeployed(
            proxyAddress,
            beacon,
            msg.sender,
            data,
            block.timestamp
        );

        return proxyAddress;
    }

    /**
     * @notice Deploy a beacon proxy with deterministic address using CREATE2
     * @param beacon Address of the beacon contract
     * @param salt Unique salt for CREATE2 deployment
     * @param data Initialization data to call on the implementation
     * @return Address of the deployed proxy
     */
    function deployBeaconProxyDeterministic(
        address beacon,
        bytes32 salt,
        bytes calldata data
    ) external returns (address) {
        require(beacon != address(0), "BeaconProxyFactory: zero beacon");

        // Predict address
        address predicted = predictBeaconProxyAddress(beacon, salt, data);
        
        // Check if already deployed
        require(
            !isBeaconProxy[predicted],
            "BeaconProxyFactory: already deployed"
        );

        // Deploy with CREATE2
        BeaconProxy proxy = new BeaconProxy{salt: salt}(beacon, data);
        address proxyAddress = address(proxy);

        // Verify prediction
        require(
            proxyAddress == predicted,
            "BeaconProxyFactory: address mismatch"
        );

        // Track deployment
        isBeaconProxy[proxyAddress] = true;
        allProxies.push(proxyAddress);
        proxiesByDeployer[msg.sender].push(proxyAddress);
        proxiesByBeacon[beacon].push(proxyAddress);

        emit BeaconProxyDeployedDeterministic(
            proxyAddress,
            beacon,
            msg.sender,
            salt,
            data,
            block.timestamp
        );

        return proxyAddress;
    }

    /**
     * @notice Predict the address of a beacon proxy deployed via CREATE2
     * @param beacon Address of the beacon contract
     * @param salt Unique salt for CREATE2 deployment
     * @param data Initialization data
     * @return predicted Address where the proxy will be deployed
     */
    function predictBeaconProxyAddress(
        address beacon,
        bytes32 salt,
        bytes calldata data
    ) public view returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(
            type(BeaconProxy).creationCode,
            abi.encode(beacon, data)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Get all proxies deployed by a specific address
     * @param deployer Address of the deployer
     * @return Array of proxy addresses
     */
    function getProxiesByDeployer(address deployer) 
        external 
        view 
        returns (address[] memory) 
    {
        return proxiesByDeployer[deployer];
    }

    /**
     * @notice Get all proxies using a specific beacon
     * @param beacon Address of the beacon
     * @return Array of proxy addresses
     */
    function getProxiesByBeacon(address beacon) 
        external 
        view 
        returns (address[] memory) 
    {
        return proxiesByBeacon[beacon];
    }

    /**
     * @notice Get all deployed proxies
     * @return Array of all proxy addresses
     */
    function getAllProxies() external view returns (address[] memory) {
        return allProxies;
    }

    /**
     * @notice Get total number of deployed proxies
     * @return Total count
     */
    function getProxyCount() external view returns (uint256) {
        return allProxies.length;
    }
}
