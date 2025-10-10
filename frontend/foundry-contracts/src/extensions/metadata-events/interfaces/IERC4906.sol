// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IMetadataEvents
 * @notice Interface for the ERC-4906 Metadata Update Extension (renamed to avoid OpenZeppelin conflict)
 * @dev See https://eips.ethereum.org/EIPS/eip-4906
 * 
 * This interface adds standardized events for metadata updates to NFT contracts.
 * It allows marketplaces and indexers to efficiently track when token metadata
 * has changed and needs to be refreshed.
 */
interface IMetadataEvents is IERC165 {
    /**
     * @notice Emitted when the metadata of a single token is updated
     * @dev This event signals that the metadata URI for a token has changed
     * @param _tokenId The token ID whose metadata was updated
     */
    event MetadataUpdate(uint256 _tokenId);

    /**
     * @notice Emitted when the metadata of a range of tokens is updated
     * @dev This event signals that metadata URIs for a consecutive range have changed
     * @param _fromTokenId The starting token ID of the range (inclusive)
     * @param _toTokenId The ending token ID of the range (inclusive)
     */
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);
}
