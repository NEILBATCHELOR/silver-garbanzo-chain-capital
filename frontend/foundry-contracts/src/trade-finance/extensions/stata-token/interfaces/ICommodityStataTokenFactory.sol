// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICommodityStataTokenFactory
 * @notice Interface for the factory that deploys StataToken wrappers
 */
interface ICommodityStataTokenFactory {
    
    // ============ Events ============
    
    event StataTokenCreated(
        address indexed underlying,
        address indexed cToken,
        address indexed stataToken,
        bytes32 commodityType
    );
    
    event ImplementationUpdated(
        address indexed oldImplementation,
        address indexed newImplementation
    );
    
    // ============ Errors ============
    
    error StataTokenAlreadyExists(address cToken);
    error InvalidCToken(address cToken);
    error InvalidImplementation();
    error Unauthorized();
    
    // ============ View Functions ============
    
    /**
     * @notice Get the StataToken for a given cToken
     * @param cToken The commodity receipt token address
     * @return The StataToken address (address(0) if not deployed)
     */
    function getStataToken(address cToken) external view returns (address);
    
    /**
     * @notice Get all deployed StataTokens
     * @return Array of StataToken addresses
     */
    function getAllStataTokens() external view returns (address[] memory);
    
    /**
     * @notice Get the current implementation address
     * @return The implementation address
     */
    function implementation() external view returns (address);
    
    /**
     * @notice Check if a StataToken exists for a cToken
     * @param cToken The commodity receipt token address
     * @return True if exists
     */
    function stataTokenExists(address cToken) external view returns (bool);
    
    /**
     * @notice Get the CommodityLendingPool address
     * @return The pool address
     */
    function pool() external view returns (address);
    
    /**
     * @notice Get the RewardsController address
     * @return The rewards controller address
     */
    function rewardsController() external view returns (address);
    
    // ============ State-Changing Functions ============
    
    /**
     * @notice Create a new StataToken for a cToken
     * @param cToken The commodity receipt token address
     * @param name The StataToken name
     * @param symbol The StataToken symbol
     * @param commodityType The commodity type identifier
     * @return stataToken The deployed StataToken address
     */
    function createStataToken(
        address cToken,
        string calldata name,
        string calldata symbol,
        bytes32 commodityType
    ) external returns (address stataToken);
    
    /**
     * @notice Update the implementation contract
     * @param newImplementation The new implementation address
     */
    function updateImplementation(address newImplementation) external;
}
