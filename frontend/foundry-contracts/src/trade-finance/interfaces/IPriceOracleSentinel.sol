// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPriceOracleSentinel
 * @notice Interface for L2 sequencer protection
 */
interface IPriceOracleSentinel {
    function isLiquidationAllowed() external view returns (bool);
    function isBorrowingAllowed() external view returns (bool);
    
    function getSequencerStatus() 
        external 
        view 
        returns (bool isUp, uint256 timeSinceUp);
    
    function getGracePeriodStatus() 
        external 
        view 
        returns (bool inGracePeriod, uint256 remainingTime);
}
