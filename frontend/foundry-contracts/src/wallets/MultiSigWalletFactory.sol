// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MultiSigWallet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MultiSigWalletFactory
 * @notice Factory for deploying multi-signature wallets
 * @dev Deploys deterministic wallet addresses and tracks deployments
 * 
 * Features:
 * - Create multi-sig wallets with custom parameters
 * - Track all deployed wallets
 * - Track wallets by creator
 * - Query wallet information
 * 
 * @custom:security-contact security@chaincapital.com
 */
contract MultiSigWalletFactory is Ownable {
    // ============================================================================
    // EVENTS
    // ============================================================================

    event WalletCreated(
        address indexed wallet,
        string name,
        address[] owners,
        uint256 requiredSignatures,
        address indexed creator
    );

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    mapping(address => address[]) public walletsByCreator;
    address[] public allWallets;


    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor() Ownable(msg.sender) {}

    // ============================================================================
    // WALLET CREATION
    // ============================================================================

    /**
     * @notice Create a new multi-sig wallet
     * @param _name Human-readable name for the wallet
     * @param _owners Array of owner addresses
     * @param _requiredSignatures Number of signatures required (threshold)
     * @return wallet Address of created wallet
     */
    function createWallet(
        string memory _name,
        address[] memory _owners,
        uint256 _requiredSignatures
    ) public returns (address) {
        MultiSigWallet wallet = new MultiSigWallet(
            _name,
            _owners,
            _requiredSignatures
        );

        address walletAddress = address(wallet);

        walletsByCreator[msg.sender].push(walletAddress);
        allWallets.push(walletAddress);

        emit WalletCreated(
            walletAddress,
            _name,
            _owners,
            _requiredSignatures,
            msg.sender
        );

        return walletAddress;
    }


    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /**
     * @notice Get all wallets created by an address
     * @param _creator Address of wallet creator
     * @return Array of wallet addresses
     */
    function getWalletsByCreator(address _creator)
        public
        view
        returns (address[] memory)
    {
        return walletsByCreator[_creator];
    }

    /**
     * @notice Get all wallets created via this factory
     * @return Array of all wallet addresses
     */
    function getAllWallets() public view returns (address[] memory) {
        return allWallets;
    }

    /**
     * @notice Get total number of wallets created
     * @return Total wallet count
     */
    function getWalletCount() public view returns (uint256) {
        return allWallets.length;
    }

    /**
     * @notice Get wallet information
     * @param _wallet Wallet address
     * @return name Wallet name
     * @return owners Array of owner addresses
     * @return requiredSignatures Threshold
     */
    function getWalletInfo(address _wallet)
        public
        view
        returns (
            string memory name,
            address[] memory owners,
            uint256 requiredSignatures
        )
    {
        MultiSigWallet wallet = MultiSigWallet(payable(_wallet));
        return (
            wallet.name(),
            wallet.getOwners(),
            wallet.requiredSignatures()
        );
    }
}
