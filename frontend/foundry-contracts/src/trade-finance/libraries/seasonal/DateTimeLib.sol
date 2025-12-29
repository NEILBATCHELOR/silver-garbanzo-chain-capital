// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DateTimeLib
 * @notice Library for date/time calculations in Solidity
 * @dev Provides accurate month/day extraction from Unix timestamps
 */
library DateTimeLib {
    
    uint256 private constant SECONDS_PER_DAY = 86400;
    uint256 private constant SECONDS_PER_HOUR = 3600;
    uint256 private constant DAYS_IN_YEAR = 365;
    uint256 private constant DAYS_IN_LEAP_YEAR = 366;
    
    // Unix epoch starts on January 1, 1970 (Thursday)
    uint256 private constant EPOCH_YEAR = 1970;
    
    /**
     * @notice Get days in a specific month
     * @param month Month (1-12)
     * @param leapYear Whether it's a leap year
     * @return Number of days in the month
     */
    function _getDaysInMonth(uint8 month, bool leapYear) private pure returns (uint8) {
        if (month == 2) {
            return leapYear ? 29 : 28;
        }
        if (month == 4 || month == 6 || month == 9 || month == 11) {
            return 30;
        }
        return 31;
    }
    
    /**
     * @notice Get cumulative days before a specific month
     * @param month Month (1-12)
     * @param leapYear Whether it's a leap year
     * @return Cumulative days before the month
     */
    function _getDaysBeforeMonth(uint8 month, bool leapYear) private pure returns (uint16) {
        uint16 days_;
        if (month == 1) return 0;
        if (month == 2) return 31;
        if (month == 3) return leapYear ? uint16(60) : uint16(59);
        if (month == 4) return leapYear ? uint16(91) : uint16(90);
        if (month == 5) return leapYear ? uint16(121) : uint16(120);
        if (month == 6) return leapYear ? uint16(152) : uint16(151);
        if (month == 7) return leapYear ? uint16(182) : uint16(181);
        if (month == 8) return leapYear ? uint16(213) : uint16(212);
        if (month == 9) return leapYear ? uint16(244) : uint16(243);
        if (month == 10) return leapYear ? uint16(274) : uint16(273);
        if (month == 11) return leapYear ? uint16(305) : uint16(304);
        if (month == 12) return leapYear ? uint16(335) : uint16(334);
        return days_;
    }
    
    /**
     * @notice Extract year, month, and day from a Unix timestamp
     * @param timestamp Unix timestamp in seconds
     * @return year The year (e.g., 2024)
     * @return month The month (1-12)
     * @return day The day of month (1-31)
     */
    function timestampToDate(uint256 timestamp)
        internal
        pure
        returns (uint256 year, uint8 month, uint8 day)
    {
        uint256 _days = timestamp / SECONDS_PER_DAY;
        
        // Calculate year
        year = EPOCH_YEAR;
        uint256 daysInYear;
        
        while (true) {
            daysInYear = _isLeapYear(year) ? DAYS_IN_LEAP_YEAR : DAYS_IN_YEAR;
            if (_days < daysInYear) {
                break;
            }
            _days -= daysInYear;
            year++;
        }
        
        // Calculate month and day
        bool leapYear = _isLeapYear(year);
        
        month = 1;
        while (month <= 12) {
            uint8 daysInMonth = _getDaysInMonth(month, leapYear);
            if (_days < daysInMonth) {
                break;
            }
            _days -= daysInMonth;
            month++;
        }
        
        day = uint8(_days + 1);
    }
    
    /**
     * @notice Get the current month from a timestamp
     * @param timestamp Unix timestamp
     * @return month Current month (1-12)
     */
    function getMonth(uint256 timestamp) internal pure returns (uint8) {
        (, uint8 month, ) = timestampToDate(timestamp);
        return month;
    }
    
    /**
     * @notice Get the day of year (1-365/366)
     * @param timestamp Unix timestamp
     * @return dayOfYear The day of the year
     */
    function getDayOfYear(uint256 timestamp) internal pure returns (uint16) {
        (uint256 year, uint8 month, uint8 day) = timestampToDate(timestamp);
        bool leapYear = _isLeapYear(year);
        
        uint16 dayOfYear = _getDaysBeforeMonth(month, leapYear) + day;
        return dayOfYear;
    }
    
    /**
     * @notice Get the quarter (1-4) from a timestamp
     * @param timestamp Unix timestamp
     * @return quarter The quarter (1-4)
     */
    function getQuarter(uint256 timestamp) internal pure returns (uint8) {
        uint8 month = getMonth(timestamp);
        return uint8((month - 1) / 3 + 1);
    }
    
    /**
     * @notice Check if a month is within a range (handles wrap-around)
     * @param month Current month (1-12)
     * @param startMonth Range start (1-12)
     * @param endMonth Range end (1-12)
     * @return True if month is within range
     */
    function isMonthInRange(
        uint8 month,
        uint8 startMonth,
        uint8 endMonth
    ) internal pure returns (bool) {
        require(month >= 1 && month <= 12, "Invalid month");
        require(startMonth >= 1 && startMonth <= 12, "Invalid start month");
        require(endMonth >= 1 && endMonth <= 12, "Invalid end month");
        
        if (startMonth <= endMonth) {
            return month >= startMonth && month <= endMonth;
        } else {
            // Range wraps around year end
            return month >= startMonth || month <= endMonth;
        }
    }
    
    /**
     * @notice Get the opposite month (6 months offset) for hemisphere adjustment
     * @param month Current month (1-12)
     * @return oppositeMonth The opposite month (1-12)
     */
    function getOppositeMonth(uint8 month) internal pure returns (uint8) {
        require(month >= 1 && month <= 12, "Invalid month");
        return uint8(((month - 1 + 6) % 12) + 1);
    }
    
    /**
     * @notice Check if a year is a leap year
     * @param year The year to check
     * @return True if leap year
     */
    function _isLeapYear(uint256 year) private pure returns (bool) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }
}
