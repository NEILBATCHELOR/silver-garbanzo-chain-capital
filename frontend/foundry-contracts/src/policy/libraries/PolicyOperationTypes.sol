// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PolicyOperationTypes
 * @notice Standardized operation type constants for PolicyEngine
 * @dev Use these constants to ensure consistent operation type naming across all contracts
 * 
 * Benefits:
 * - Type safety (prevents typos like "MINTT" vs "MINT")
 * - Single source of truth for operation names
 * - Easy to discover available operation types
 * - Gas efficient (constants are inlined at compile time)
 */
library PolicyOperationTypes {
    
    // ============ Universal Operations (All Standards) ============
    
    /// @notice Deploy a new token contract
    string internal constant DEPLOY = "DEPLOY";
    
    /// @notice Pause all transfers (emergency stop)
    string internal constant PAUSE = "PAUSE";
    
    /// @notice Resume transfers after pause
    string internal constant UNPAUSE = "UNPAUSE";
    
    /// @notice Upgrade contract implementation (UUPS pattern)
    string internal constant UPGRADE = "UPGRADE";
    
    
    // ============ ERC-20 Operations ============
    
    /// @notice Mint new ERC-20 tokens
    string internal constant ERC20_MINT = "ERC20_MINT";
    
    /// @notice Burn ERC-20 tokens
    string internal constant ERC20_BURN = "ERC20_BURN";
    
    /// @notice Transfer ERC-20 tokens
    string internal constant ERC20_TRANSFER = "ERC20_TRANSFER";
    
    /// @notice Approve ERC-20 spending
    string internal constant ERC20_APPROVE = "ERC20_APPROVE";
    
    /// @notice Lock ERC-20 tokens (prevent transfers)
    string internal constant ERC20_LOCK = "ERC20_LOCK";
    
    /// @notice Unlock ERC-20 tokens
    string internal constant ERC20_UNLOCK = "ERC20_UNLOCK";
    
    /// @notice Block address from ERC-20 transfers
    string internal constant ERC20_BLOCK = "ERC20_BLOCK";
    
    /// @notice Unblock address from ERC-20 transfers
    string internal constant ERC20_UNBLOCK = "ERC20_UNBLOCK";
    
    
    // ============ ERC-721 Operations ============
    
    /// @notice Mint new NFT
    string internal constant ERC721_MINT = "ERC721_MINT";
    
    /// @notice Mint multiple NFTs in batch
    string internal constant ERC721_MINT_BATCH = "ERC721_MINT_BATCH";
    
    /// @notice Burn NFT
    string internal constant ERC721_BURN = "ERC721_BURN";
    
    /// @notice Transfer NFT
    string internal constant ERC721_TRANSFER = "ERC721_TRANSFER";
    
    /// @notice Approve NFT transfer
    string internal constant ERC721_APPROVE = "ERC721_APPROVE";
    
    /// @notice Set operator approval for all NFTs
    string internal constant ERC721_SET_APPROVAL_FOR_ALL = "ERC721_SET_APPROVAL_FOR_ALL";
    
    /// @notice Lock NFT (prevent transfers)
    string internal constant ERC721_LOCK = "ERC721_LOCK";
    
    /// @notice Unlock NFT
    string internal constant ERC721_UNLOCK = "ERC721_UNLOCK";
    
    /// @notice Block address from NFT transfers
    string internal constant ERC721_BLOCK = "ERC721_BLOCK";
    
    /// @notice Unblock address from NFT transfers
    string internal constant ERC721_UNBLOCK = "ERC721_UNBLOCK";
    
    
    // ============ ERC-1155 Operations ============
    
    /// @notice Mint single token type
    string internal constant ERC1155_MINT = "ERC1155_MINT";
    
    /// @notice Mint multiple token types in batch
    string internal constant ERC1155_MINT_BATCH = "ERC1155_MINT_BATCH";
    
    /// @notice Burn single token type
    string internal constant ERC1155_BURN = "ERC1155_BURN";
    
    /// @notice Burn multiple token types in batch
    string internal constant ERC1155_BURN_BATCH = "ERC1155_BURN_BATCH";
    
    /// @notice Transfer single token type
    string internal constant ERC1155_TRANSFER = "ERC1155_TRANSFER";
    
    /// @notice Transfer multiple token types in batch
    string internal constant ERC1155_BATCH_TRANSFER = "ERC1155_BATCH_TRANSFER";
    
    /// @notice Set operator approval for all token types
    string internal constant ERC1155_SET_APPROVAL_FOR_ALL = "ERC1155_SET_APPROVAL_FOR_ALL";
    
    
    // ============ ERC-3525 Operations (Semi-Fungible) ============
    
    /// @notice Mint new ERC-3525 token
    string internal constant ERC3525_MINT = "ERC3525_MINT";
    
    /// @notice Burn ERC-3525 token
    string internal constant ERC3525_BURN = "ERC3525_BURN";
    
    /// @notice Transfer ERC-3525 token ownership
    string internal constant ERC3525_TRANSFER = "ERC3525_TRANSFER";
    
    /// @notice Transfer value between tokens (same slot)
    string internal constant ERC3525_TRANSFER_VALUE = "ERC3525_TRANSFER_VALUE";
    
    /// @notice Approve token transfer
    string internal constant ERC3525_APPROVE = "ERC3525_APPROVE";
    
    /// @notice Approve value spending
    string internal constant ERC3525_APPROVE_VALUE = "ERC3525_APPROVE_VALUE";
    
    /// @notice Set operator approval
    string internal constant ERC3525_SET_APPROVAL_FOR_ALL = "ERC3525_SET_APPROVAL_FOR_ALL";
    
    
    // ============ ERC-4626 Operations (Tokenized Vault) ============
    
    /// @notice Deposit assets into vault (receive shares)
    string internal constant ERC4626_DEPOSIT = "ERC4626_DEPOSIT";
    
    /// @notice Mint vault shares (deposit assets)
    string internal constant ERC4626_MINT = "ERC4626_MINT";
    
    /// @notice Withdraw assets from vault (burn shares)
    string internal constant ERC4626_WITHDRAW = "ERC4626_WITHDRAW";
    
    /// @notice Redeem vault shares (receive assets)
    string internal constant ERC4626_REDEEM = "ERC4626_REDEEM";
    
    /// @notice Transfer vault shares
    string internal constant ERC4626_TRANSFER = "ERC4626_TRANSFER";
    
    /// @notice Approve vault share transfer
    string internal constant ERC4626_APPROVE = "ERC4626_APPROVE";
    
    
    // ============ ERC-1400 Operations (Security Token) ============
    
    /// @notice Issue security tokens to partition
    string internal constant ERC1400_ISSUE = "ERC1400_ISSUE";
    
    /// @notice Redeem security tokens from partition
    string internal constant ERC1400_REDEEM = "ERC1400_REDEEM";
    
    /// @notice Transfer tokens in partition
    string internal constant ERC1400_TRANSFER_BY_PARTITION = "ERC1400_TRANSFER_BY_PARTITION";
    
    /// @notice Controller forced transfer
    string internal constant ERC1400_CONTROLLER_TRANSFER = "ERC1400_CONTROLLER_TRANSFER";
    
    /// @notice Controller forced redemption
    string internal constant ERC1400_CONTROLLER_REDEEM = "ERC1400_CONTROLLER_REDEEM";
    
    
    // ============ Helper Functions ============
    
    /**
     * @notice Check if operation type is valid
     * @param operationType Operation type string
     * @return isValid True if operation type is recognized
     */
    function isValidOperationType(string memory operationType) 
        internal 
        pure 
        returns (bool) 
    {
        bytes32 opHash = keccak256(bytes(operationType));
        
        // Universal
        if (opHash == keccak256(bytes(DEPLOY))) return true;
        if (opHash == keccak256(bytes(PAUSE))) return true;
        if (opHash == keccak256(bytes(UNPAUSE))) return true;
        if (opHash == keccak256(bytes(UPGRADE))) return true;
        
        // ERC-20
        if (opHash == keccak256(bytes(ERC20_MINT))) return true;
        if (opHash == keccak256(bytes(ERC20_BURN))) return true;
        if (opHash == keccak256(bytes(ERC20_TRANSFER))) return true;
        if (opHash == keccak256(bytes(ERC20_APPROVE))) return true;
        if (opHash == keccak256(bytes(ERC20_LOCK))) return true;
        if (opHash == keccak256(bytes(ERC20_UNLOCK))) return true;
        if (opHash == keccak256(bytes(ERC20_BLOCK))) return true;
        if (opHash == keccak256(bytes(ERC20_UNBLOCK))) return true;
        
        // ERC-721
        if (opHash == keccak256(bytes(ERC721_MINT))) return true;
        if (opHash == keccak256(bytes(ERC721_MINT_BATCH))) return true;
        if (opHash == keccak256(bytes(ERC721_BURN))) return true;
        if (opHash == keccak256(bytes(ERC721_TRANSFER))) return true;
        if (opHash == keccak256(bytes(ERC721_APPROVE))) return true;
        if (opHash == keccak256(bytes(ERC721_SET_APPROVAL_FOR_ALL))) return true;
        if (opHash == keccak256(bytes(ERC721_LOCK))) return true;
        if (opHash == keccak256(bytes(ERC721_UNLOCK))) return true;
        if (opHash == keccak256(bytes(ERC721_BLOCK))) return true;
        if (opHash == keccak256(bytes(ERC721_UNBLOCK))) return true;
        
        // ERC-1155
        if (opHash == keccak256(bytes(ERC1155_MINT))) return true;
        if (opHash == keccak256(bytes(ERC1155_MINT_BATCH))) return true;
        if (opHash == keccak256(bytes(ERC1155_BURN))) return true;
        if (opHash == keccak256(bytes(ERC1155_BURN_BATCH))) return true;
        if (opHash == keccak256(bytes(ERC1155_TRANSFER))) return true;
        if (opHash == keccak256(bytes(ERC1155_BATCH_TRANSFER))) return true;
        if (opHash == keccak256(bytes(ERC1155_SET_APPROVAL_FOR_ALL))) return true;
        
        // ERC-3525
        if (opHash == keccak256(bytes(ERC3525_MINT))) return true;
        if (opHash == keccak256(bytes(ERC3525_BURN))) return true;
        if (opHash == keccak256(bytes(ERC3525_TRANSFER))) return true;
        if (opHash == keccak256(bytes(ERC3525_TRANSFER_VALUE))) return true;
        if (opHash == keccak256(bytes(ERC3525_APPROVE))) return true;
        if (opHash == keccak256(bytes(ERC3525_APPROVE_VALUE))) return true;
        if (opHash == keccak256(bytes(ERC3525_SET_APPROVAL_FOR_ALL))) return true;
        
        // ERC-4626
        if (opHash == keccak256(bytes(ERC4626_DEPOSIT))) return true;
        if (opHash == keccak256(bytes(ERC4626_MINT))) return true;
        if (opHash == keccak256(bytes(ERC4626_WITHDRAW))) return true;
        if (opHash == keccak256(bytes(ERC4626_REDEEM))) return true;
        if (opHash == keccak256(bytes(ERC4626_TRANSFER))) return true;
        if (opHash == keccak256(bytes(ERC4626_APPROVE))) return true;
        
        // ERC-1400
        if (opHash == keccak256(bytes(ERC1400_ISSUE))) return true;
        if (opHash == keccak256(bytes(ERC1400_REDEEM))) return true;
        if (opHash == keccak256(bytes(ERC1400_TRANSFER_BY_PARTITION))) return true;
        if (opHash == keccak256(bytes(ERC1400_CONTROLLER_TRANSFER))) return true;
        if (opHash == keccak256(bytes(ERC1400_CONTROLLER_REDEEM))) return true;
        
        return false;
    }
    
    /**
     * @notice Get operation category (standard name)
     * @param operationType Operation type string
     * @return category Standard name (ERC20, ERC721, etc.) or "UNIVERSAL"
     */
    function getOperationCategory(string memory operationType) 
        internal 
        pure 
        returns (string memory) 
    {
        bytes memory opBytes = bytes(operationType);
        
        // Check prefix
        if (opBytes.length >= 5) {
            if (opBytes[0] == 'E' && opBytes[1] == 'R' && opBytes[2] == 'C') {
                if (opBytes[3] == '2' && opBytes[4] == '0') return "ERC20";
                if (opBytes[3] == '7' && opBytes[4] == '2') return "ERC721";
            }
        }
        
        if (opBytes.length >= 7) {
            if (opBytes[0] == 'E' && opBytes[1] == 'R' && opBytes[2] == 'C') {
                if (opBytes[3] == '1' && opBytes[4] == '1' && opBytes[5] == '5' && opBytes[6] == '5') {
                    return "ERC1155";
                }
                if (opBytes[3] == '3' && opBytes[4] == '5' && opBytes[5] == '2' && opBytes[6] == '5') {
                    return "ERC3525";
                }
                if (opBytes[3] == '4' && opBytes[4] == '6' && opBytes[5] == '2' && opBytes[6] == '6') {
                    return "ERC4626";
                }
                if (opBytes[3] == '1' && opBytes[4] == '4' && opBytes[5] == '0' && opBytes[6] == '0') {
                    return "ERC1400";
                }
            }
        }
        
        return "UNIVERSAL";
    }
}
