// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ITokenMaster
 * @notice Common interface for all token masters
 */
interface ITokenMaster {
    function setPolicyEngine(address engine) external;
}
