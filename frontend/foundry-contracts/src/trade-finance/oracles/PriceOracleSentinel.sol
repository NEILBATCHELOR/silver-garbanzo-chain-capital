// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

/**
 * @title PriceOracleSentinel
 * @author Chain Capital
 * @notice Protects against unfair liquidations during L2 sequencer downtime
 * @dev Implements grace period after sequencer recovery before liquidations resume
 * Based on Chain Capital V3 PriceOracleSentinel
 */
contract PriceOracleSentinel is Ownable {
    
    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Chainlink sequencer uptime feed
    AggregatorV3Interface public immutable SEQUENCER_ORACLE;

    /// @notice Grace period after sequencer comes back online (in seconds)
    /// @dev Prevents immediate liquidations when users couldn't act
    uint256 public gracePeriod;

    /// @notice Whether the sentinel is enabled
    bool public isActive;

    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Default grace period: 1 hour
    uint256 public constant DEFAULT_GRACE_PERIOD = 3600;

    /// @notice Sequencer is down when answer = 1
    int256 private constant SEQUENCER_DOWN = 1;

    // ============================================
    // EVENTS
    // ============================================

    event GracePeriodUpdated(uint256 newGracePeriod);
    event SentinelStatusUpdated(bool isActive);

    // ============================================
    // ERRORS
    // ============================================

    error SequencerDown();
    error GracePeriodNotFinished();
    error InvalidGracePeriod();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Constructor
     * @param sequencerOracle The Chainlink sequencer uptime feed address
     * @param initialGracePeriod The initial grace period in seconds
     */
    constructor(
        address sequencerOracle,
        uint256 initialGracePeriod
    ) Ownable(msg.sender) {
        require(sequencerOracle != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        require(initialGracePeriod > 0 && initialGracePeriod <= 24 hours, "Invalid grace period");

        SEQUENCER_ORACLE = AggregatorV3Interface(sequencerOracle);
        gracePeriod = initialGracePeriod;
        isActive = true;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set the grace period
     * @param newGracePeriod The new grace period in seconds
     */
    function setGracePeriod(uint256 newGracePeriod) external onlyOwner {
        require(newGracePeriod > 0 && newGracePeriod <= 24 hours, "Invalid grace period");
        gracePeriod = newGracePeriod;
        emit GracePeriodUpdated(newGracePeriod);
    }

    /**
     * @notice Enable or disable the sentinel
     * @param active True to enable, false to disable
     */
    function setSentinelStatus(bool active) external onlyOwner {
        isActive = active;
        emit SentinelStatusUpdated(active);
    }

    // ============================================
    // VIEW FUNCTIONS - PROTECTION CHECKS
    // ============================================

    /**
     * @notice Check if liquidations are allowed
     * @dev Returns false if:
     *   1. Sequencer is currently down
     *   2. Sequencer just came back online (within grace period)
     * @return True if liquidations are allowed
     */
    function isLiquidationAllowed() external view returns (bool) {
        // If sentinel is disabled, always allow
        if (!isActive) {
            return true;
        }

        try SEQUENCER_ORACLE.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256 startedAt,
            uint256,
            uint80
        ) {
            // Sequencer is down
            if (answer == SEQUENCER_DOWN) {
                return false;
            }

            // Sequencer just came back up (within grace period)
            if (block.timestamp - startedAt < gracePeriod) {
                return false;
            }

            // Sequencer is up and grace period has passed
            return true;

        } catch {
            // If oracle call fails, err on the side of caution
            return false;
        }
    }

    /**
     * @notice Check if borrowing is allowed
     * @dev Only allowed when sequencer is up (no grace period for borrowing)
     * @return True if borrowing is allowed
     */
    function isBorrowingAllowed() external view returns (bool) {
        // If sentinel is disabled, always allow
        if (!isActive) {
            return true;
        }

        try SEQUENCER_ORACLE.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256,
            uint80
        ) {
            // Only allow borrowing when sequencer is up
            return answer != SEQUENCER_DOWN;

        } catch {
            // If oracle call fails, don't allow new borrows
            return false;
        }
    }

    /**
     * @notice Get the current sequencer status
     * @return isUp True if sequencer is operational
     * @return timeSinceUp Seconds since sequencer came back online (0 if down)
     */
    function getSequencerStatus() external view returns (bool isUp, uint256 timeSinceUp) {
        try SEQUENCER_ORACLE.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256 startedAt,
            uint256,
            uint80
        ) {
            isUp = (answer != SEQUENCER_DOWN);
            timeSinceUp = isUp ? (block.timestamp - startedAt) : 0;
            
            return (isUp, timeSinceUp);

        } catch {
            return (false, 0);
        }
    }

    /**
     * @notice Check if we're still in grace period after sequencer recovery
     * @return inGracePeriod True if in grace period
     * @return remainingTime Seconds remaining in grace period
     */
    function getGracePeriodStatus() 
        external 
        view 
        returns (bool inGracePeriod, uint256 remainingTime) 
    {
        // If sentinel disabled, no grace period
        if (!isActive) {
            return (false, 0);
        }

        try SEQUENCER_ORACLE.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256 startedAt,
            uint256,
            uint80
        ) {
            // If sequencer is down, grace period doesn't apply
            if (answer == SEQUENCER_DOWN) {
                return (false, 0);
            }

            uint256 elapsed = block.timestamp - startedAt;
            
            if (elapsed < gracePeriod) {
                inGracePeriod = true;
                remainingTime = gracePeriod - elapsed;
            } else {
                inGracePeriod = false;
                remainingTime = 0;
            }

            return (inGracePeriod, remainingTime);

        } catch {
            return (false, 0);
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /**
     * @notice Check sequencer uptime without reverting
     * @return success True if oracle call succeeded
     * @return isUp True if sequencer is up
     */
    function checkSequencer() external view returns (bool success, bool isUp) {
        try SEQUENCER_ORACLE.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256,
            uint80
        ) {
            return (true, answer != SEQUENCER_DOWN);
        } catch {
            return (false, false);
        }
    }
}
